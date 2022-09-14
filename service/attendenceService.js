const mongoose = require('mongoose');
const moment = require('moment');
const axios = require('axios');

/* ---------------get daily report----------------------*/
exports.insertShiftData = async (tenantDbConnection, bodyData) => {
  try {
    const attModel = await tenantDbConnection.model('attendences_data');
    const holidayModel = await tenantDbConnection.model('holiday_list');

    for (const iterator of bodyData) {
      const holidayRes = await holidayModel.find({
        deptId: iterator.deptId, date: iterator.date,
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
    const dbQuery1 = [];
    const attModel = await dbConnection.model('attendences_data');

    if (filter) {
      filter = JSON.parse(filter);

      if (filter.status) {
        dbQuery.push({ userStatus: filter.status });
      }

      //   if (filter.propertyCity) {
      //     dbQuery.push({ propertyCity: mongoose.Types.ObjectId(filter.propertyCity) });
      //   }

      //   if (filter.propertyGrade) {
      //     dbQuery.push({ propertyGrade: mongoose.Types.ObjectId(filter.propertyGrade) });
      //   }

      //   if (filter.regionId) {
      //     dbQuery.push({ regionId: mongoose.Types.ObjectId(filter.regionId) });
      //   }

      //   if (filter.propertyStage) {
      //     dbQuery.push({ propertyStage: filter.propertyStage });
      //   }

      //   if (filter.regionId) {
      //     dbQuery.push({ regionId: mongoose.Types.ObjectId(filter.regionId) });
      //   }

      //   if (filter.spocEmail) {
      //     filter.spocEmail.forEach(element => {
      //       if (element)
      //         dbQuery1.push({ 'spocData.spocEmail': element.trim() });
      //     });
      //   }
    }


    if (search) {
      const dateArr = search.replace(/\\\//g, '/').split('/');

      if (dateArr.length === 3 && dateChk === true) {
        const dateData = new Date(`${dateArr[2]}-${dateArr[1]}-${dateArr[0]}`);
        dbQuery1.push({
          createdAt: {
            $gte: new Date(new Date(dateData).setHours(0, 0, 0)),
            $lt: new Date(new Date(dateData).setHours(23, 59, 59)),
          }
        },
          // {
          //   proposalDate: {
          //     $gte: new Date(new Date(dateData).setHours(0, 0, 0)),
          //     $lt: new Date(new Date(dateData).setHours(23, 59, 59)),
          //   }
          // }
        );
      }
      // else {
      //   dbQuery1.push(
      //     { propertyName: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { area: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { city: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { grade: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { propertyCreatedBy: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { propertyStage: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { spocName: { $regex: `.*${search}.*`, $options: 'i' } }
      //   );
      // }
    }

    let sortBy = '';
    if (sort_by === 'overTime')
      sortBy = 'overTime';
    if (sort_by === 'name')
      sortBy = 'name';
    if (sort_by === 'userId')
      sortBy = 'userId';

    if (sort_by === 'firstEntry')
      sort_by = { firstEnrty: 1 };
    else if (sort_by === 'lastExit')
      sort_by = { lastExit: 1 };
    else if (sort_by === 'recentEntry')
      sort_by = { recentEnrty: 1 };
    else if (sort_by === 'shift')
      sort_by = { shiftStart: 1 };
    else if (sort_by === 'status')
      sort_by = { userStatus: 1 };
    else
      sort_by = { firstEnrty: 1 };

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
          'lastExit': { '$arrayElemAt': ['$attendenceDetails.clockIn', -1] },
          'recentEnrty': { '$arrayElemAt': ['$attendenceDetails.clockIn', 0] },
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

    // if (dbQuery1.length > 0)
    //   query[4].$match.$or = dbQuery1;


    let resData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);
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

      item.attendenceDetails.forEach(element => {
        const diff = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
        totalSpendTime = totalSpendTime + diff;
      });

      const shiftDiff = getTimeDiff(item.shiftStart, item.shiftEnd, 'minutes');
      const userObj = userDetails.filter(data => data.rec_id == resData[index]['userId']);
      resData[index]['overTime'] = totalSpendTime - shiftDiff;
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name'].trim() : '-';
      resData[index]['firstEnrty'] = format_time(item['firstEnrty']);
      resData[index]['lastExit'] = format_time(item['lastExit']);
      resData[index]['recentEnrty'] = format_time(item['recentEnrty']);
      resData[index]['shiftStart'] = format_time(item['shiftStart']);
      resData[index]['shiftEnd'] = format_time(item['shiftEnd']);
      resData[index]['holidayName'] = resData[index]['holidayName'] ? resData[index]['holidayName'] : '';
    });

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
exports.getUsersShiftData = async (tenantDbConnection, userData, deptId, startDate, endDate) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const res = await attendenceModel
      .find({
        deptId: deptId,
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
    const dbQuery1 = [];
    const attModel = await dbConnection.model('attendences_data');

    if (filter) {
      filter = JSON.parse(filter);

      if (filter.date) {
        dbQuery.push({ propertyName: filter.date });
      }

      //   if (filter.propertyCity) {
      //     dbQuery.push({ propertyCity: mongoose.Types.ObjectId(filter.propertyCity) });
      //   }

      //   if (filter.propertyGrade) {
      //     dbQuery.push({ propertyGrade: mongoose.Types.ObjectId(filter.propertyGrade) });
      //   }

      //   if (filter.regionId) {
      //     dbQuery.push({ regionId: mongoose.Types.ObjectId(filter.regionId) });
      //   }

      //   if (filter.propertyStage) {
      //     dbQuery.push({ propertyStage: filter.propertyStage });
      //   }

      //   if (filter.regionId) {
      //     dbQuery.push({ regionId: mongoose.Types.ObjectId(filter.regionId) });
      //   }

      //   if (filter.spocEmail) {
      //     filter.spocEmail.forEach(element => {
      //       if (element)
      //         dbQuery1.push({ 'spocData.spocEmail': element.trim() });
      //     });
      //   }
    }

    dbQuery.push({
      'date': {
        $gte: startDate,
        $lt: endDate,
      }
    });
    dbQuery.push({ userId: userId });


    if (search) {
      const dateArr = search.replace(/\\\//g, '/').split('/');

      if (dateArr.length === 3 && dateChk === true) {
        const dateData = new Date(`${dateArr[2]}-${dateArr[1]}-${dateArr[0]}`);
        dbQuery1.push({
          createdAt: {
            $gte: new Date(new Date(dateData).setHours(0, 0, 0)),
            $lt: new Date(new Date(dateData).setHours(23, 59, 59)),
          }
        },
          // {
          //   proposalDate: {
          //     $gte: new Date(new Date(dateData).setHours(0, 0, 0)),
          //     $lt: new Date(new Date(dateData).setHours(23, 59, 59)),
          //   }
          // }
        );
      }
      // else {
      //   dbQuery1.push(
      //     { propertyName: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { area: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { city: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { grade: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { propertyCreatedBy: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { propertyStage: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { spocName: { $regex: `.*${search}.*`, $options: 'i' } }
      //   );
      // }
    }

    // if (sort_by === 'propertyName')
    //   sort_by = { propertyName: 1 };
    // else if (sort_by === 'area')
    //   sort_by = { areaNum: -1 };
    // else if (sort_by === 'proposalDate')
    //   sort_by = { proposalDate: -1 };
    // else if (sort_by === 'city')
    //   sort_by = { city: 1 };
    // else if (sort_by === 'grade')
    //   sort_by = { grade: 1 };
    // else if (sort_by === 'propertyStatus')
    //   sort_by = { propertyStatus: 1 };
    // else
    //   sort_by = { proposalDate: -1 };

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
      // { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[1].$match.$and = dbQuery;

    // if (dbQuery1.length > 0)
    //   query[4].$match.$or = dbQuery1;

    const resData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);
    resData.map((item, index) => {
      let clockIn = 0;
      let clockOut = 0;
      item.attendenceDetails.forEach(element => {
        if (element.clockIn && element.clockIn != '' && clockIn == 0)
          clockIn = element.clockIn;
        if (element.clockOut && element.clockOut != '')
          clockOut = element.clockOut;
      });
      resData[index]['clockIn'] = format_time(clockIn);
      resData[index]['clockOut'] = format_time(clockOut);
      resData[index]['shiftStart'] = format_time(item['shiftStart']);
      resData[index]['shiftEnd'] = format_time(item['shiftEnd']);
      resData[index]['working_hour'] = getTimeDiffInHours(resData[index]['clockIn'], resData[index]['clockOut']);
    });

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
    const res = await attendenceModel.findOneAndUpdate({ id: bodyData.id }, { $set: { userStatus: bodyData.status } });

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
    const dbQuery1 = [];
    const attModel = await dbConnection.model('attendences_data');

    if (filter) {
      filter = JSON.parse(filter);

      // if (filter.date) {
      //   dbQuery.push({ propertyName: filter.date });
      // }
      //   if (filter.regionId) {
      //     dbQuery.push({ regionId: mongoose.Types.ObjectId(filter.regionId) });
      //   }

      //   if (filter.spocEmail) {
      //     filter.spocEmail.forEach(element => {
      //       if (element)
      //         dbQuery1.push({ 'spocData.spocEmail': element.trim() });
      //     });
      //   }
    }
    // filter between dates
    dbQuery.push({
      'date': {
        $gte: startDate,
        $lte: endDate,
      }
    });


    if (search) {
      const dateArr = search.replace(/\\\//g, '/').split('/');

      if (dateArr.length === 3 && dateChk === true) {
        const dateData = new Date(`${dateArr[2]}-${dateArr[1]}-${dateArr[0]}`);
        dbQuery1.push({
          createdAt: {
            $gte: new Date(new Date(dateData).setHours(0, 0, 0)),
            $lte: new Date(new Date(dateData).setHours(23, 59, 59)),
          }
        },
          // {
          //   proposalDate: {
          //     $gte: new Date(new Date(dateData).setHours(0, 0, 0)),
          //     $lt: new Date(new Date(dateData).setHours(23, 59, 59)),
          //   }
          // }
        );
      }
      // else {
      //   dbQuery1.push(
      //     { propertyName: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { area: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { city: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { grade: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { propertyCreatedBy: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { propertyStage: { $regex: `.*${search}.*`, $options: 'i' } },
      //     { spocName: { $regex: `.*${search}.*`, $options: 'i' } }
      //   );
      // }
    }

    // if (sort_by === 'propertyName')
    //   sort_by = { propertyName: 1 };
    // else if (sort_by === 'area')
    //   sort_by = { areaNum: -1 };
    // else if (sort_by === 'proposalDate')
    //   sort_by = { proposalDate: -1 };
    // else if (sort_by === 'city')
    //   sort_by = { city: 1 };
    // else if (sort_by === 'grade')
    //   sort_by = { grade: 1 };
    // else if (sort_by === 'propertyStatus')
    //   sort_by = { propertyStatus: 1 };
    // else
    //   sort_by = { proposalDate: -1 };

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
      }
      // { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[0].$match.$and = dbQuery;

    // if (dbQuery1.length > 0)
    //   query[4].$match.$or = dbQuery1;

    const resData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);
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
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name'].trim() : '-';

      let lateEntryCount = 0;
      let earlyExitCount = 0;
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let holidayCount = 0;
      // eslint-disable-next-line prefer-const
      let avgLate = 0;
      let overTimeHr = 0;
      let workHour = 0;

      item.dataArr.forEach(element => {

        // lateEntryCount
        // eslint-disable-next-line max-len
        if (element.shiftStart && element.shiftStart > 0 && element.attendenceDetails.length > 0 && element.attendenceDetails[0].clockIn && element.attendenceDetails[0].clockIn > 0) {
          const diff = getTimeDiff(element.shiftStart, element.attendenceDetails[0].clockIn, 'minutes');
          if (diff > 15)
            lateEntryCount++;
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
        if (element.attendenceDetails.length > 0 && element.attendenceDetails[0].clockIn && element.attendenceDetails[0].clockIn > 0)
          presentCount++;

        // absentCount 
        if (element.attendenceDetails.length == 0)
          absentCount++;

        //leaveCount 
        if (element.shiftStart == -3 || element.shiftEnd == -3 || element.userStatus == 'ONLEAVE')
          leaveCount++;

        //avgLate

        //overTimeHr
        // eslint-disable-next-line max-len
        if (element.shiftStart && element.shiftStart > 0 && element.shiftEnd && element.shiftEnd > 0 && element.attendenceDetails.length > 0 && element.attendenceDetails[0].clockIn && element.attendenceDetails[0].clockIn > 0 &&
          // eslint-disable-next-line max-len
          element.attendenceDetails[element.attendenceDetails.length - 1].clockOut && element.attendenceDetails[element.attendenceDetails.length - 1].clockOut > 0) {
          const shiftDiff = getTimeDiff(element.shiftStart, element.shiftEnd, 'minutes');
          // eslint-disable-next-line max-len
          const attDiff = getTimeDiff(element.attendenceDetails[0].clockIn, element.attendenceDetails[element.attendenceDetails.length - 1].clockOut, 'minutes');
          const overTime = attDiff - shiftDiff; // In mintues
          overTimeHr = overTimeHr + (overTime / 60);
        }

        // holidayCount
        if (element['isHoliday'] || element.userStatus == 'HOLIDAY')
          holidayCount++;


        // avgWorkHour
        // eslint-disable-next-line max-len
        if (element.attendenceDetails.length > 0 && element.attendenceDetails[0].clockIn && element.attendenceDetails[0].clockIn > 0 &&
          // eslint-disable-next-line max-len
          element.attendenceDetails[element.attendenceDetails.length - 1].clockOut && element.attendenceDetails[element.attendenceDetails.length - 1].clockOut > 0) {
          // eslint-disable-next-line max-len
          const attDiff = getTimeDiff(element.attendenceDetails[0].clockIn, element.attendenceDetails[element.attendenceDetails.length - 1].clockOut, 'minutes');
          workHour = workHour + (attDiff / 60);
        }
      });

      resData[index]['lateEntryCount'] = lateEntryCount;
      resData[index]['earlyExitCount'] = earlyExitCount;
      resData[index]['presentCount'] = presentCount;
      resData[index]['absentCount'] = absentCount;
      resData[index]['leaveCount'] = leaveCount;
      resData[index]['holidayCount'] = holidayCount;
      resData[index]['avgLate'] = avgLate;
      resData[index]['overTimeHr'] = parseInt(overTimeHr) > 0 ? parseInt(overTimeHr) : 0;
      resData[index]['avgWorkHour'] = parseInt(workHour) / presentCount;
    });

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
  if (key == 'name')
    return arr.sort((a, b) => a.name.localeCompare(b.name));

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
