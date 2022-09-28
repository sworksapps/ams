const moment = require('moment');
const axios = require('axios');

/* ---------------get daily report----------------------*/
exports.insertShiftData = async (tenantDbConnection, bodyData) => {
  try {
    const attModel = await tenantDbConnection.model('attendences_data');
    const holidayModel = await tenantDbConnection.model('holiday_lists');

    for (const iterator of bodyData) {
      const holidayRes = await holidayModel.find({
        date: iterator.date,
        locationId: { $in: [iterator.locationId] }
      }).select({ _id: 1 });

      if (holidayRes.length > 0) {
        const holidayId = holidayRes[0]['_id'].toString();
        iterator.isHoliday = holidayId;
        iterator.userStatus = 'HOLIDAY';
        iterator.shiftStart = '-4';
        iterator.shiftEnd = '-4';
      }

      if (iterator.shiftStart == -1)
        iterator.userStatus = 'WEEKOFF';

      if (iterator.shiftStart == -2)
        iterator.userStatus = 'WFH';

      if (iterator.shiftStart == -3)
        iterator.userStatus = 'ONLEAVE';

      await attModel.findOneAndUpdate(
        { userId: iterator.userId, date: iterator.date }, { $set: iterator }, { upsert: true });
    }
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

/* ---------------get daily report----------------------*/
exports.fetchDailyReportData = async (dbConnection, limit, page, sort_by, search, filter, dateChk, date) => {
  try {
    const dbQuery = [{ 'date': date }];
    const attModel = await dbConnection.model('attendences_data');

    if (filter) {
      filter = JSON.parse(filter);

      if (filter.status) {
        dbQuery.push({ userStatus: filter.status });
      }
      if (filter.location) {
        dbQuery.push({ locationId: filter.location });
      }
    }

    let sortBy = '';
    if (sort_by === 'overTime')
      sortBy = 'overTimeMin';
    else if (sort_by === 'name')
      sortBy = 'name';
    else if (sort_by === 'status')
      sortBy = 'userStatus';
    else if (sort_by === 'duration')
      sortBy = 'durationMin';

    if (sort_by === 'firstEntry')
      sort_by = { firstEnrty: 1 };
    else if (sort_by === 'lastExit')
      sort_by = { lastExit: 1 };
    else if (sort_by === 'shift')
      sort_by = { shiftStart: 1 };
    else
      sort_by = { userId: 1 };

    if (!sortBy && Object.keys(sort_by)[0] == 'userId')
      sortBy = 'name';

    const query = [
      {
        $lookup: {
          from: 'holiday_lists',
          localField: 'isHoliday',
          foreignField: '_id',
          as: 'holiday',
        },
      },
      {
        '$project': {
          '_id': 1,
          'userId': 1,
          'userStatus': 1,
          'deptId': 1,
          'locationId': 1,
          'isHoliday': 1,
          'holidayName': { '$arrayElemAt': ['$holiday.holidayName', 0] },
          'date': 1,
          'firstEnrty': { '$arrayElemAt': ['$attendenceDetails.clockIn', 0] },
          'lastExit': { '$arrayElemAt': ['$attendenceDetails.clockOut', -1] },
          'recentEnrty': { '$arrayElemAt': ['$attendenceDetails.clockIn', -1] },
          'shiftStart': 1,
          'shiftEnd': 1,
          'attendenceDetails': 1
        },
      },
      {
        $match: {}
      },
      { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[2].$match.$and = dbQuery;

    let resData = await attModel.aggregate([...query]);
    // let resData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);
    const userIds = resData.map(i => i.userId);
    let userDetails = [];

    // get user name
    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/user/get-user-name`,
      { rec_id: userIds }
    );

    if (userData.data.status == 200)
      userDetails = userData.data.data;

    resData.map((item, index) => {
      let totalSpendTime = 0;
      let totalShiftTime = 0;

      item.attendenceDetails.forEach(element => {
        if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0) {
          const diff = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
          totalSpendTime = totalSpendTime + diff;
        }
      });

      if (item.shiftStart && item.shiftStart > 0 && item.shiftEnd && item.shiftEnd > 0)
        totalShiftTime = getTimeDiff(item.shiftStart, item.shiftEnd, 'minutes');

      // MISSINGCHECKOUT  
      const dateTime = new Date();
      dateTime.setHours(18,29,0,0); // set time as 23:59:00
      const midTime = moment(dateTime).unix();
      const currentTime = moment().unix();
      if (item.shiftEnd && item.shiftEnd > 0 && currentTime > item.shiftEnd && currentTime > midTime && item.lastExit == '') {
        const param = { id: item._id.toString(), status: 'MISSINGCHECKOUT' };
        this.changeUserStatus(dbConnection, param);
      }

      const userObj = userDetails.filter(data => data.rec_id == resData[index]['userId']);
      const overTime = totalSpendTime - totalShiftTime;
      // eslint-disable-next-line max-len
      resData[index]['overTime'] = item.shiftEnd && item.shiftStart && totalSpendTime > 0 && overTime > 0 ? new Date(overTime * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      resData[index]['overTimeMin'] = overTime;
      resData[index]['empCode'] = userObj.length > 0 && userObj[0]['emp_code'] ? userObj[0]['emp_code'] : '-';
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name']?.trim() : '-';
      resData[index]['durationMin'] = totalSpendTime;
      resData[index]['duration'] = totalSpendTime > 0 ? new Date(totalSpendTime * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      resData[index]['firstEnrty'] = item['firstEnrty'] && item['firstEnrty'] > 0 ? format_time(item['firstEnrty']) : 'N/A';
      resData[index]['lastExit'] = item['lastExit'] && item['lastExit'] > 0 ? format_time(item['lastExit']) : 'N/A';
      resData[index]['recentEnrty'] = item['recentEnrty'] && item['recentEnrty'] > 0 ? format_time(item['recentEnrty']) : 'N/A';
      resData[index]['shiftStart'] = item['shiftStart'] && item['shiftStart'] > 0 ? format_time(item['shiftStart']) : 'N/A';
      resData[index]['shiftEnd'] = item['shiftEnd'] && item['shiftEnd'] > 0 ? format_time(item['shiftEnd']) : 'N/A';
      resData[index]['holidayName'] = resData[index]['holidayName'] ? resData[index]['holidayName'] : '';
    });

    //sorting 
    if (sortBy != '')
      resData = sortByKey(resData, sortBy);

    const total = await attModel.aggregate([...query, { $count: 'totalCount' }])
      .then(res => res.length > 0 ? res[0].totalCount : 0);
    return { resData, total };
  } catch (err) {
    return false;
  }
};

/* ---------------get User shift data----------------------*/
exports.getUsersShiftData = async (tenantDbConnection, userData, startDate, endDate) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const res = await attendenceModel
      .find({
        userId: { $in: userData.users },
        date: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .select({ userId: 1, shiftStart: 1, shiftEnd: 1, date: 1, locationId: 1, deptId: 1 });
    const key = 'userId';

    let refData = [...new Map(res.map(item =>
      [item[key], item])).values()];

    refData = refData.map((v) => {
      return {
        user_id: v.userId,
        dept_id: v.deptId,
        dateArray: []
      };
    });

    for (let index = 0; index < res.length; index++) {
      const element = res[index];
      for (let j = 0; j < refData.length; j++) {
        const ele = refData[j];
        if (element.userId == ele.user_id) {
          ele.dateArray.push({
            'shift_date': element.date,
            'shift_start_time': element.shiftStart && element.shiftStart > 0 ? format_time(element.shiftStart) :
              element.shiftStart ? element.shiftStart : '',
            'shift_end_time': element.shiftEnd && element.shiftEnd > 0 ? format_time(element.shiftEnd) :
              element.shiftEnd ? element.shiftEnd : ''
          });
        }
      }
    }

    return { type: true, msg: 'Users shift data.', refData };
  } catch (err) {
    console.log(err);
    return false;
  }
};

/* ---------------get User specific report----------------------*/
// eslint-disable-next-line max-len
exports.fetchUserSpecReportData = async (dbConnection, limit, page, sort_by, search, filter, dateChk, userId, startDate, endDate) => {
  try {
    const dbQuery = [];
    const attModel = await dbConnection.model('attendences_data');

    // filter by dates and user id
    dbQuery.push({
      'date': {
        $gte: startDate,
        $lte: endDate,
      }
    });
    dbQuery.push({ userId: userId });
    let sortBy = '';

    if (sort_by === 'clockIn')
      sortBy = 'clockIn';
    else if (sort_by === 'clockOut')
      sortBy = 'clockOut';
    else if (sort_by === 'avgWork')
      sortBy = 'durationMin';
    else if (sort_by === 'status')
      sortBy = 'userStatus';
    else if (sort_by === 'overTime')
      sortBy = 'overTimeMin';

    if (sort_by === 'date')
      sort_by = { date: 1 };
    else if (sort_by === 'shift')
      sort_by = { shiftStart: 1 };
    else
      sort_by = { date: 1 };

    const query = [
      {
        '$project': {
          '_id': 1,
          'userId': 1,
          'deptId': 1,
          'locationId': 1,
          'date': 1,
          'userStatus': 1,
          'shiftStart': 1,
          'shiftEnd': 1,
          'attendenceDetails': 1
        },
      },
      {
        $match: {}
      },
      { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[1].$match.$and = dbQuery;

    let resData = await attModel.aggregate([...query]);
    // let resData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);

    const userIds = resData.map(i => i.userId);
    let userDetails = [];

    // get user name
    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/user/get-user-name`,
      { rec_id: userIds }
    );

    if (userData.data.status == 200)
      userDetails = userData.data.data;

    resData.map((item, index) => {
      let clockIn = 0;
      let clockOut = 0;
      let totalSpendTime = 0;
      let shiftDurationMin = 0;
      const userObj = userDetails.filter(data => data.rec_id == resData[index]['userId']);

      item.attendenceDetails.forEach(element => {
        if (element.clockIn && element.clockIn > 0 && element.clockIn != '' && clockIn == 0)
          clockIn = element.clockIn;

        if (element.clockOut && element.clockOut > 0 && element.clockOut != '')
          clockOut = element.clockOut;

        if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0) {
          const diff = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
          totalSpendTime = totalSpendTime + diff;
        }
      });

      //overTime
      if (item.shiftStart && item.shiftStart > 0 && item.shiftEnd && item.shiftEnd > 0) {
        const shiftDiff = getTimeDiff(item.shiftStart, item.shiftEnd, 'minutes');
        shiftDurationMin = shiftDurationMin + shiftDiff;
      }

      resData[index]['empCode'] = userObj.length > 0 && userObj[0]['emp_code'] ? userObj[0]['emp_code'] : '-';
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name']?.trim() : '-';
      resData[index]['overTimeMin'] = (totalSpendTime - shiftDurationMin) > 0 ? (totalSpendTime - shiftDurationMin) : 0;
      // eslint-disable-next-line max-len
      resData[index]['overTime'] = shiftDurationMin > 0 && (totalSpendTime - shiftDurationMin) > 0 ? new Date((totalSpendTime - shiftDurationMin) * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      resData[index]['clockIn'] = clockIn > 0 ? format_time(clockIn) : 'N/A';
      resData[index]['clockOut'] = clockOut > 0 ? format_time(clockOut) : 'N/A';
      resData[index]['shiftStart'] = item['shiftStart'] && item['shiftStart'] > 0 ? format_time(item['shiftStart']) : 'N/A';
      resData[index]['shiftEnd'] = item['shiftEnd'] && item['shiftEnd'] > 0 ? format_time(item['shiftEnd']) : 'N/A';
      resData[index]['durationMin'] = totalSpendTime;
      // eslint-disable-next-line max-len
      resData[index]['duration'] = totalSpendTime > 0 ? new Date(totalSpendTime * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
    });

    //sorting
    if (sortBy != '')
      resData = sortByKey(resData, sortBy);

    const total = await attModel.aggregate([...query, { $count: 'totalCount' }])
      .then(res => res.length > 0 ? res[0].totalCount : 0);
    return { resData, total };
  } catch (err) {
    console.log(err);
    return false;
  }
};

/* ---------------change user status----------------------*/
exports.changeUserStatus = async (tenantDbConnection, bodyData) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const res = await attendenceModel.findOneAndUpdate({ _id: bodyData.id }, { $set: { userStatus: bodyData.status } });
    if (res)
      return true;
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
};


/* ---------------get daily report----------------------*/
exports.fetchReportDataByDate = async (dbConnection, limit, page, sort_by, search, filter, dateChk, startDate, endDate) => {
  try {
    const dbQuery = [];
    const attModel = await dbConnection.model('attendences_data');

    // filter between dates
    dbQuery.push({
      'date': {
        $gte: startDate,
        $lte: endDate,
      }
    });

    const query = [
      {
        $match: {}
      },
      {
        $group: {
          _id: '$userId',
          'dataArr': {
            '$push': {
              '_id': '$_id',
              'deptId': '$deptId',
              'locationId': '$locationId',
              'date': '$date',
              'userId': '$userId',
              'userStatus': '$userStatus',
              'isHoliday': '$isHoliday',
              'shiftStart': '$shiftStart',
              'shiftEnd': '$shiftEnd',
              'attendenceDetails': '$attendenceDetails',
            }
          }
        }
      },
      // { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[0].$match.$and = dbQuery;

    let resData = await attModel.aggregate([...query]);
    // let resData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);

    const userIds = resData.map(i => i._id);
    let userDetails = [];

    // get user name
    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/user/get-user-name`,
      { rec_id: userIds }
    );

    if (userData.data.status == 200)
      userDetails = userData.data.data;

    resData.map((item, index) => {

      const userObj = userDetails.filter(data => data.rec_id == item._id);
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name']?.trim() : '-';
      resData[index]['empCode'] = userObj.length > 0 && userObj[0]['emp_code'] ? userObj[0]['emp_code'] : '-';

      let lateEntryCount = 0;
      let earlyExitCount = 0;
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let holidayCount = 0;
      let workDurationMin = 0;
      let shiftDurationMin = 0;
      let lateInMin = 0;

      item.dataArr.forEach(element => {

        // lateEntryCount
        // eslint-disable-next-line max-len
        if (element.shiftStart && element.shiftStart > 0 && element.attendenceDetails.length > 0 && element.attendenceDetails[0].clockIn && element.attendenceDetails[0].clockIn > 0) {
          const diff = getTimeDiff(element.shiftStart, element.attendenceDetails[0].clockIn, 'minutes');
          if (diff > 15) {
            lateInMin = lateInMin + diff;
            lateEntryCount++;
          }
        }

        // EarlyExitCount
        // eslint-disable-next-line max-len
        if (element.shiftEnd && element.shiftEnd > 0 && element.attendenceDetails.length > 0 && element.attendenceDetails[element.attendenceDetails.length - 1].clockOut && element.attendenceDetails[element.attendenceDetails.length - 1].clockOut > 0) {
          // eslint-disable-next-line max-len
          const diff = getTimeDiff(element.shiftEnd, element.attendenceDetails[element.attendenceDetails.length - 1].clockOut, 'minutes');
          if (diff < 0)
            earlyExitCount++;
        }

        // presentCount
        // eslint-disable-next-line max-len
        if (element.attendenceDetails.length > 0)
        // presentCount = element.attendenceDetails.length;
          presentCount = presentCount++;

        // absentCount 
        if (element.attendenceDetails.length == 0)
          absentCount++;

        //leaveCount 
        if (element.shiftStart == -3 || element.shiftEnd == -3 || element.userStatus == 'ONLEAVE')
          leaveCount++;

        //avgLate

        //overTime
        if (element.shiftStart && element.shiftStart > 0 && element.shiftEnd && element.shiftEnd > 0) {
          const shiftDiff = getTimeDiff(element.shiftStart, element.shiftEnd, 'minutes');
          shiftDurationMin = shiftDurationMin + shiftDiff;
        }

        // holidayCount
        if (element['isHoliday'] || element.userStatus == 'HOLIDAY')
          holidayCount++;

        // avgWorkHour
        // if (element.attendenceDetails.length > 0) {
        //   // eslint-disable-next-line max-len
        //   const attDiff = getTimeDiff(element.attendenceDetails[0].clockIn,
        //  element.attendenceDetails[element.attendenceDetails.length - 1].clockOut, 'minutes');
        //   workDurationMin = workDurationMin + attDiff;
        // }

        // avgWorkHour
        element.attendenceDetails.forEach(elm => {
          if (elm.clockIn && elm.clockIn > 0 && elm.clockOut && elm.clockOut > 0) {
            const attDiff = getTimeDiff(elm.clockIn, elm.clockOut, 'minutes');
            workDurationMin = workDurationMin + attDiff;
          }
        });
      });

      resData[index]['lateEntryCount'] = lateEntryCount;
      resData[index]['earlyExitCount'] = earlyExitCount;
      resData[index]['presentCount'] = presentCount;
      resData[index]['absentCount'] = absentCount;
      resData[index]['leaveCount'] = leaveCount;
      resData[index]['holidayCount'] = holidayCount;
      resData[index]['overTimeMin'] = (workDurationMin - shiftDurationMin) > 0 ? (workDurationMin - shiftDurationMin) : 0;
      resData[index]['avgLateMin'] = (lateInMin / presentCount) > 0 ? (lateInMin / presentCount) : 0;
      // eslint-disable-next-line max-len
      resData[index]['avgLate'] = (lateInMin / presentCount) > 0 ? new Date((lateInMin / presentCount) * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      // eslint-disable-next-line max-len
      resData[index]['overTime'] = shiftDurationMin > 0 && (workDurationMin - shiftDurationMin) > 0 ? new Date((workDurationMin - shiftDurationMin) * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      // eslint-disable-next-line max-len
      resData[index]['duration'] = workDurationMin > 0 ? new Date(workDurationMin * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      const avgDurationMin = (workDurationMin / presentCount) > 0 ? (workDurationMin / presentCount) : 0;
      // eslint-disable-next-line max-len
      resData[index]['avgDuration'] = avgDurationMin > 0 ? new Date(avgDurationMin * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      resData[index]['avgDurationMin'] = avgDurationMin;
    });

    // sorting
    if (sort_by && sort_by != '') {
      if (sort_by == 'userId')
        resData = sortByKey(resData, '_id');
      else if (sort_by == 'name')
        resData = sortByKey(resData, sort_by);
      else if (sort_by == 'lateEntry')
        resData = sortByKey(resData, 'lateEntryCount');
      else if (sort_by == 'earlyExit')
        resData = sortByKey(resData, 'earlyExitCount');
      else if (sort_by == 'present')
        resData = sortByKey(resData, 'presentCount');
      else if (sort_by == 'absent')
        resData = sortByKey(resData, 'absentCount');
      else if (sort_by == 'leave')
        resData = sortByKey(resData, 'leaveCount');
      else if (sort_by == 'holiday')
        resData = sortByKey(resData, 'holidayCount');
      else if (sort_by == 'avgLate')
        resData = sortByKey(resData, 'avgLateMin');
      else if (sort_by == 'overtime')
        resData = sortByKey(resData, 'overTimeMin');
      else if (sort_by == 'avgWork')
        resData = sortByKey(resData, 'avgDurationMin');
      else
        resData = sortByKey(resData, 'name');
    }
    else
      resData = sortByKey(resData, 'name');

    const total = await attModel.aggregate([...query, { $count: 'totalCount' }])
      .then(res => res.length > 0 ? res[0].totalCount : 0);
    return { resData, total };
  } catch (err) {
    console.log(err);
    return false;
  }
};

const getTimeDiff = (start, end, type) => {
  if (start && end && start != '' && end != '')
    return moment.unix(end).startOf(type).diff(moment.unix(start).startOf(type), type);
  return 0;
};

const sortByKey = (arr, key) => {
  if (key == 'name' || key == 'userStatus')
    return arr.sort((a, b) => a[key].localeCompare(b[key]));
  return arr.sort((a, b) => a[key] - b[key]);
};

function format_time(s) {
  if (s && s != '') {
    const dtFormat = new Intl.DateTimeFormat('en-GB', {
      timeStyle: 'medium',
      timeZone: 'IST'
    });
    return dtFormat.format(new Date(s * 1e3));
  }
  else
    return 'N/A';
}

function getTimeDiffInHours(stTime, endTime) {
  if (stTime && endTime && stTime != '' && endTime != '')
    return moment.utc(moment(endTime, 'HH:mm:ss').diff(moment(stTime, 'HH:mm:ss'))).format('hh:mm');
  return 0;
}



