/* eslint-disable max-len */
const moment = require('moment');
const axios = require('axios');
const presentList = ['PRESENT', 'HALFDAY', 'WOP', 'HOP'];
const absentList = ['ABSENT', 'WEEKLYOFF', 'LOP', 'SL', 'CL', 'HO', 'CO', 'SP', 'WFH'];
/* ---------------get daily report----------------------*/
exports.insertShiftData = async (tenantDbConnection, bodyData) => {
  try {
    const attModel = await tenantDbConnection.model('attendences_data');
    const holidayModel = await tenantDbConnection.model('holiday_lists');
    const overlapArr = [];

    for (const iterator of bodyData) {
      let isShiftOverlap = false;
      const yesterDay = moment(iterator.date).subtract(1, 'days').format('YYYY-MM-DD').toString();
      const tomarrow = moment(iterator.date).add(1, 'days').format('YYYY-MM-DD').toString();
      const resData = await attModel.find({ date: { $in: [yesterDay, tomarrow] }, userId: iterator.userId }).select({ shiftStart: 1, shiftEnd: 1, date: 1 });

      if (resData && resData.length > 0) {
        const newShift = { shiftStart: iterator.shiftStart, shiftEnd: iterator.shiftEnd };
        isShiftOverlap = isShiftOverlapping(resData, newShift);
      }

      if (!isShiftOverlap) {
        const updateObj = {};
        const insertObj = {};

        const holidayRes = await holidayModel.find({
          date: iterator.date,
          locationId: { $in: [iterator.locationId] }
        }).select({ _id: 1 });

        if (holidayRes.length > 0) {
          const holidayId = holidayRes[0]['_id'].toString();
          Object.assign(updateObj, { 'isHoliday': holidayId });
          Object.assign(insertObj, { 'userStatus': 'HOLIDAY' });
          Object.assign(insertObj, { 'shiftStart': '-4' });
          Object.assign(insertObj, { 'shiftEnd': '-4' });
        }
        else {
          Object.assign(insertObj, { 'shiftStart': iterator.shiftStart });
          Object.assign(insertObj, { 'shiftEnd': iterator.shiftEnd });
          Object.assign(insertObj, { 'userStatus': 'N/A' });
        }

        // update
        Object.assign(updateObj, { 'userId': iterator.userId });
        Object.assign(updateObj, { 'deptId': iterator.deptId });
        Object.assign(updateObj, { 'locationId': iterator.locationId });
        Object.assign(updateObj, { 'date': iterator.date });

        // insert
        if (iterator.shiftStart == -1 || iterator.shiftEnd == -1)
          Object.assign(insertObj, { 'userStatus': 'WEEKLYOFF' });

        if (iterator.shiftStart == -2 || iterator.shiftEnd == -2)
          Object.assign(insertObj, { 'userStatus': 'WFH' });

        if (iterator.shiftStart == -3 || iterator.shiftEnd == -3)
          Object.assign(insertObj, { 'userStatus': 'ONLEAVE' });

        if (iterator.shiftStart == -4 || iterator.shiftEnd == -4)
          Object.assign(insertObj, { 'userStatus': 'HOLIDAY' });

        const update = {
          $set: updateObj,
          $push: insertObj
        };
        await attModel.findOneAndUpdate({ 'userId': iterator.userId, 'date': iterator.date }, update, { upsert: true });
      }
      else
        overlapArr.push(iterator.date);
    }

    if (overlapArr.length > 0)
      return overlapArr.sort();

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
    const dbQuery1 = {};
    const dbQuery2 = [];
    const dbQuery3 = [];
    const attModel = await dbConnection.model('attendences_data');

    if (filter) {
      filter = JSON.parse(filter);


      if (filter.location && filter.baseLocation) {
        if (Array.isArray(filter.location))
          dbQuery2.push({ locationId: { $in: filter.location } });
        else
          dbQuery2.push({ locationId: filter.location.toString() });
      }

      if (filter.location) {
        if (Array.isArray(filter.location))
          dbQuery2.push({ checkedInLocationId: { $in: filter.location } });
        else
          dbQuery2.push({ checkedInLocationId: filter.location.toString() });
      }

      if (filter.status) {
        if (Array.isArray(filter.status) && filter.status.length > 0)
          dbQuery1.userStatus = { $in: filter.status };
        else if (!Array.isArray(filter.status))
          dbQuery1.userStatus = filter.status;
      }

      if (filter.kpiFilter) {
        if (filter.kpiFilter === 'PRESENT')
          dbQuery1.userStatus = { $in: presentList };
        if (filter.kpiFilter === 'ABSENT')
          dbQuery1.userStatus = { $in: absentList };
        if (filter.kpiFilter === 'ONLEAVE')
          dbQuery1.userStatus = { $in: ['SL', 'CL', 'LOP', 'ONLEAVE'] };
        if (filter.kpiFilter === 'WFH')
          dbQuery1.userStatus = filter.kpiFilter;
        if (filter.kpiFilter === 'SP')
          dbQuery1.userStatus = filter.kpiFilter;
        if (filter.kpiFilter === 'HALFDAY')
          dbQuery1.userStatus = filter.kpiFilter;
        if (filter.kpiFilter === 'CHECKEDIN') {
          dbQuery1.lastExit = '';
          dbQuery3.push({ firstEnrty: { $ne: '' } }, { attendenceStatus: { $ne: 'AUTOCHECKOUT' } });
        }
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
        $match: {}
      },
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
          'attendenceStatus': 1,
          'userStatus': { '$arrayElemAt': ['$userStatus', -1] },
          'primaryStatus': 1,
          'deptId': 1,
          'locationId': 1,
          'isHoliday': 1,
          'attendenceDetails.clockIn': 1,
          'attendenceDetails.clockOut': 1,
          'attendenceDetails.actionBy': 1,
          'attendenceDetails.deviceLocationIdClockIn': 1,
          'attendenceDetails.actionByName': 1,
          'attendenceDetails.actionById': 1,
          'attendenceDetails.actionRemark': 1,
          'attendenceDetails.actionByTimeStamp': 1,
          'checkedInLocationId': { '$arrayElemAt': ['$attendenceDetails.deviceLocationIdClockIn', 0] },
          'holidayName': { '$arrayElemAt': ['$holiday.holidayName', 0] },
          'date': 1,
          'firstEnrty': { '$arrayElemAt': ['$attendenceDetails.clockIn', 0] },
          'lastExit': { '$arrayElemAt': ['$attendenceDetails.clockOut', -1] },
          'recentEnrty': { '$arrayElemAt': ['$attendenceDetails.clockIn', -1] },
          'shiftStart': { '$arrayElemAt': ['$shiftStart', -1] },
          'shiftEnd': { '$arrayElemAt': ['$shiftEnd', -1] },
        }
      },
      {
        $match: dbQuery1 ? dbQuery1 : {}
      },
      {
        $match: {}
      },
      { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[0].$match.$and = dbQuery;

    if (dbQuery3.length > 0)
      query[4].$match.$and = dbQuery3;

    if (dbQuery2.length > 0)
      query[3].$match.$or = dbQuery2;

    let resData = await attModel.aggregate([...query]);

    // calculate kpi
    query[3] = { $match: {} };
    query[4] = { $match: {} };
    if (filter && filter.location)
      query[3].$match.$or = [{ checkedInLocationId: { $in: filter.location } }];

    const kpiData = await attModel.aggregate([...query]);
    const kpiRes = await calculateCountOfArr(kpiData);

    const userIds = resData.map(i => i.userId);
    const deptIds = resData.map(i => i.deptId);

    let userDetails = [], userDeptDetails = [];

    // get user name
    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/user/get-user-name`,
      { rec_id: userIds }
    );

    if (userData.data.status == 200)
      userDetails = userData.data.data;

    if (deptIds.length > 0) {
      const userDeptData = await axios.post(
        `${process.env.CLIENTSPOC}api/v1/department/get-department-names`,
        { deptIds: deptIds }
      );

      if (userDeptData.data.status == 200) {
        userDeptDetails = userDeptData.data.data;
      }
    }

    for (const [index, item] of resData.entries() || []) {
      let clockIn = 0;
      let clockOut = 0;
      let clockInLocId;
      let totalSpendTime = 0;
      let totalShiftTime = 0;
      let overTime = 0;
      // let totalSpendTimeByUser = 0;
      let totalSpendTimeByAdmin = 0;
      let flag = false;

      item.attendenceDetails.forEach(element => {
        if (element.actionBy && element.actionBy == 'ADMIN') {
          clockIn = element.clockIn;
          clockOut = element.clockOut;
          clockInLocId = element.deviceLocationIdClockIn;

          if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0) {
            flag = true;
            totalSpendTimeByAdmin = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
          }
        }
      });

      if (flag) {
        totalSpendTime = totalSpendTimeByAdmin;
      }
      else {
        clockIn = item['firstEnrty'];
        clockOut = item['lastExit'];
        clockInLocId = item['checkedInLocationId'];
        if (clockIn && clockIn != '' && clockOut && clockOut != '')
          totalSpendTime = getTimeDiff(clockIn, clockOut, 'minutes');
      }

      // auto status
      // const autoStatusRes = await autoCalculateStatus(item.shiftStart, item.shiftEnd, clockIn, clockOut);
      // shiftTime
      if (item.shiftStart && item.shiftStart > 0 && item.shiftEnd && item.shiftEnd > 0)
        totalShiftTime = getTimeDiff(item.shiftStart, item.shiftEnd, 'minutes');

      // MISSINGCHECKOUT  
      // const dateTime = new Date();
      // dateTime.setHours(18, 29, 0, 0); // set time as 23:59:00
      // const midTime = moment(dateTime).unix();
      // const currentTime = moment().unix();

      // if (item.shiftEnd && item.shiftEnd > 0 && currentTime > item.shiftEnd && currentTime > midTime && item.lastExit == '')
      //   await attModel.findOneAndUpdate({ _id: item._id }, { $push: { userStatus: 'MISSINGCHECKOUT' } });

      // overTime
      if (clockIn && clockOut && item.shiftStart && item.shiftEnd)
        overTime = getOverTime(item.shiftStart, item.shiftEnd, clockIn, clockOut);

      // find user name and empId
      const userObj = userDetails.filter(data => data.rec_id == resData[index]['userId']);

      // find user department name
      const userDeptDetailsObj = userDeptDetails.filter(data => data.id == item.deptId);

      resData[index]['empCode'] = userObj.length > 0 && userObj[0]['emp_code'] ? userObj[0]['emp_code'] : '-';
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name']?.trim() : '-';
      resData[index]['designation'] = userObj.length > 0 && userObj[0]['designation'] ? userObj[0]['designation'].trim() : '-';
      resData[index]['project'] = userObj.length > 0 && userObj[0]['project'] ? userObj[0]['project'].trim() : '-';
      resData[index]['payroll'] = userObj.length > 0 && userObj[0]['payroll'] ? userObj[0]['payroll'].trim() : '-';
      resData[index]['deptName'] = userDeptDetailsObj.length > 0 ? userDeptDetailsObj[0]['dept_name']?.trim() : '-';
      resData[index]['primaryStatusDB'] = resData[index]['primaryStatus'];
      resData[index]['overTime'] = (totalShiftTime > 0 && overTime != 'N/A' > 0) ? overTime : 'N/A';
      resData[index]['durationMin'] = totalSpendTime;
      resData[index]['checkedInLocationId'] = clockInLocId ? clockInLocId : 'N/A';
      resData[index]['clockIn'] = clockIn > 0 ? moment.unix(clockIn).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      resData[index]['clockOut'] = clockOut > 0 ? moment.unix(clockOut).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      resData[index]['clockInNum'] = clockIn;
      resData[index]['clockOutNum'] = clockOut;
      resData[index]['duration'] = totalSpendTime > 0 ? formatMinutesToHHMM(totalSpendTime) : 'N/A';
      resData[index]['recentEnrty'] = item['recentEnrty'] && item['recentEnrty'] > 0 ? moment.unix(item['recentEnrty']).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      resData[index]['shiftStartNum'] = item['shiftStart'];
      resData[index]['shiftEndNum'] = item['shiftEnd'];
      resData[index]['shiftStart'] = item['shiftStart'] && item['shiftStart'] > 0 ? moment.unix(item['shiftStart']).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      resData[index]['shiftEnd'] = item['shiftEnd'] && item['shiftEnd'] > 0 ? moment.unix(item['shiftEnd']).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      resData[index]['holidayName'] = resData[index]['holidayName'] ? resData[index]['holidayName'] : '';
    }

    //sorting 
    if (sortBy != '' && resData.length > 0)
      resData = sortByKey(resData, sortBy);

    // const kpiRes = await calculateCountOfArr(resData);
    const total = await attModel.aggregate([...query, { $count: 'totalCount' }])
      .then(res => res.length > 0 ? res[0].totalCount : 0);
    return { resData, total, kpiRes };
  } catch (err) {
    console.log(err);
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
            // eslint-disable-next-line max-len
            'shift_start_time': element.shiftStart && element.shiftStart.length > 0 ? element.shiftStart[element.shiftStart.length - 1] > 0 ? format_time(element.shiftStart[element.shiftStart.length - 1]) : element.shiftStart[element.shiftStart.length - 1] : '',
            // eslint-disable-next-line max-len
            'shift_end_time': element.shiftEnd && element.shiftEnd.length > 0 ? element.shiftEnd[element.shiftEnd.length - 1] > 0 ? format_time(element.shiftEnd[element.shiftEnd.length - 1]) : element.shiftEnd[element.shiftEnd.length - 1] : ''
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
    // const dbQuery2 = [];
    const dbQuery1 = {};
    const attModel = await dbConnection.model('attendences_data');

    // filter by dates and user id
    dbQuery.push({
      'date': {
        $gte: startDate,
        $lte: endDate,
      }
    });

    if (filter) {
      filter = JSON.parse(filter);

      // if (filter.location && filter.baseLocation) {
      //   if (Array.isArray(filter.location))
      //     dbQuery2.push({ locationId: { $in: filter.location } });
      //   else
      //     dbQuery2.push({ locationId: filter.location.toString() });
      // }

      // if (filter.location) {
      //   if (Array.isArray(filter.location))
      //     dbQuery2.push({ checkedInLocationId: { $in: filter.location } });
      //   else
      //     dbQuery2.push({ checkedInLocationId: filter.location.toString() });
      // }

      if (filter.status) {
        if (Array.isArray(filter.status) && filter.status.length > 0)
          dbQuery1.userStatus = { $in: filter.status };
        else if (!Array.isArray(filter.status))
          dbQuery1.userStatus = filter.status;
      }
    }

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
        $match: {}
      },
      {
        '$project': {
          '_id': 1,
          'userId': 1,
          'deptId': 1,
          'locationId': 1,
          'date': 1,
          'attendenceStatus': 1,
          'userStatus': { '$arrayElemAt': ['$userStatus', -1] },
          'primaryStatus': 1,
          'shiftStart': { '$arrayElemAt': ['$shiftStart', -1] },
          'shiftEnd': { '$arrayElemAt': ['$shiftEnd', -1] },
          'checkedInLocationId': { '$arrayElemAt': ['$attendenceDetails.deviceLocationIdClockIn', 0] },
          'firstEnrty': { '$arrayElemAt': ['$attendenceDetails.clockIn', 0] },
          'lastExit': { '$arrayElemAt': ['$attendenceDetails.clockOut', -1] },
          'attendenceDetails.clockIn': 1,
          'attendenceDetails.clockOut': 1,
          'attendenceDetails.actionBy': 1,
          'attendenceDetails.deviceLocationIdClockIn': 1
        }
      },
      {
        $match: dbQuery1 ? dbQuery1 : {}
      },
      { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[0].$match.$and = dbQuery;
    // if (dbQuery2.length > 0)
    //   query[2].$match.$or = dbQuery2;

    let resData = await attModel.aggregate([...query]);
    // let resData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);
    const userIds = resData.map(i => i.userId);
    const deptIds = resData.map(i => i.deptId);

    let userDetails = [], userDeptDetails = [];

    // get user name
    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/user/get-user-name`,
      { rec_id: userIds }
    );

    if (userData.data.status == 200) {
      userDetails = userData.data.data;
    }

    if (deptIds.length > 0) {
      const userDeptData = await axios.post(
        `${process.env.CLIENTSPOC}api/v1/department/get-department-names`,
        { deptIds: deptIds }
      );

      if (userDeptData.data.status == 200) {
        userDeptDetails = userDeptData.data.data;
      }
    }

    for (const [index, item] of resData.entries() || []) {
      let clockIn = 0;
      let overTime = 0;
      let clockOut = 0;
      let clockInLocId;
      let totalSpendTime = 0;
      let shiftDurationMin = 0;
      let flag = false;
      // let totalSpendTimeByUser = 0;
      let totalShiftTimeByAdmin = 0;

      item.attendenceDetails.forEach(element => {
        if (element.actionBy && element.actionBy == 'ADMIN') {
          clockIn = element.clockIn;
          clockOut = element.clockOut;
          clockInLocId = element.deviceLocationIdClockIn;

          if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0) {
            flag = true;
            totalShiftTimeByAdmin = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
          }
        }
      });

      if (flag)
        totalSpendTime = totalShiftTimeByAdmin;
      else {
        // totalSpendTime = totalSpendTimeByUser;
        clockIn = item['firstEnrty'];
        clockOut = item['lastExit'];
        clockInLocId = item['checkedInLocationId'];

        if (clockIn && clockIn != '' && clockOut && clockOut != '')
          totalSpendTime = getTimeDiff(clockIn, clockOut, 'minutes');
      }

      // shiftTime
      if (item.shiftStart && item.shiftStart > 0 && item.shiftEnd && item.shiftEnd > 0) {
        const shiftDiff = getTimeDiff(item.shiftStart, item.shiftEnd, 'minutes');
        shiftDurationMin = shiftDurationMin + shiftDiff;
      }

      // overTime
      if (item.shiftStart && item.shiftEnd && clockIn && clockOut)
        overTime = getOverTime(item.shiftStart, item.shiftEnd, clockIn, clockOut);

      // auto status
      // const autoStatusRes = await autoCalculateStatus(item.shiftStart, item.shiftEnd, clockIn, clockOut);

      // get username and empCode
      const userObj = userDetails.filter(data => data.rec_id == resData[index]['userId']);

      // get department name
      const userDeptDetailsObj = userDeptDetails.filter(data => data.id == item.deptId);

      resData[index]['empCode'] = userObj.length > 0 && userObj[0]['emp_code'] ? userObj[0]['emp_code'] : '-';
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name']?.trim() : '-';
      resData[index]['designation'] = userObj.length > 0 && userObj[0]['designation'] ? userObj[0]['designation'].trim() : '-';
      resData[index]['project'] = userObj.length > 0 && userObj[0]['project'] ? userObj[0]['project'].trim() : '-';
      resData[index]['payroll'] = userObj.length > 0 && userObj[0]['payroll'] ? userObj[0]['payroll'].trim() : '-';
      resData[index]['deptName'] = userDeptDetailsObj.length > 0 ? userDeptDetailsObj[0]['dept_name']?.trim() : '-';
      resData[index]['overTimeMin'] = shiftDurationMin > 0 && totalSpendTime > 0 && (totalSpendTime - shiftDurationMin) > 0 ? (totalSpendTime - shiftDurationMin) : 0;
      resData[index]['overTime'] = (shiftDurationMin > 0 && overTime != 'N/A' > 0) ? overTime : 'N/A';
      resData[index]['checkedInLocationId'] = clockInLocId ? clockInLocId : 'N/A';
      resData[index]['clockIn'] = clockIn > 0 ? moment.unix(clockIn).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      resData[index]['clockOut'] = clockOut > 0 ? moment.unix(clockOut).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      resData[index]['clockInNum'] = clockIn;
      resData[index]['clockOutNum'] = clockOut;
      resData[index]['shiftStartNum'] = item['shiftStart'];
      resData[index]['shiftEndNum'] = item['shiftEnd'];
      resData[index]['shiftStart'] = item['shiftStart'] && item['shiftStart'] > 0 ? moment.unix(item['shiftStart']).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      resData[index]['shiftEnd'] = item['shiftEnd'] && item['shiftEnd'] > 0 ? moment.unix(item['shiftEnd']).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
      resData[index]['durationMin'] = totalSpendTime;
      resData[index]['duration'] = totalSpendTime > 0 ? formatMinutesToHHMM(totalSpendTime) : 'N/A';
    }

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

/* ---------------get details by _id----------------------*/
exports.fetchDetailsById = async (dbConnection, id) => {
  try {
    const attModel = await dbConnection.model('attendences_data');
    const resData = await attModel.find({ _id: id });
    return { resData };
  } catch (err) {
    console.log(err);
    return false;
  }
};

/* ---------------change user status----------------------*/
exports.changeUserStatus = async (tenantDbConnection, bodyData) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const pushedObject = {};
    const updateObject = {};
    const attObj = {};

    if (bodyData.shiftStart && !isNaN(bodyData.shiftStart))
      Object.assign(pushedObject, { shiftStart: bodyData.shiftStart });

    if (bodyData.shiftEnd && !isNaN(bodyData.shiftEnd))
      Object.assign(pushedObject, { shiftEnd: bodyData.shiftEnd });

    if (bodyData.status)
      Object.assign(pushedObject, { userStatus: bodyData.status });

    if (bodyData.clockIn && !isNaN(bodyData.clockIn))
      Object.assign(attObj, { clockIn: bodyData.clockIn });

    if (bodyData.clockOut && !isNaN(bodyData.clockOut))
      Object.assign(attObj, { clockOut: bodyData.clockOut });

    if (bodyData.clockIn && !isNaN(bodyData.clockIn) || bodyData.clockOut && !isNaN(bodyData.clockOut))
      Object.assign(attObj, { actionBy: 'ADMIN' });

    if (bodyData.clockOut && !isNaN(bodyData.clockOut))
      Object.assign(updateObject, { attendenceStatus: 'CLOCKOUT' });

    if (bodyData.primaryStatus)
      Object.assign(updateObject, { primaryStatus: bodyData.primaryStatus });

    if (bodyData.clockIn && !isNaN(bodyData.clockIn) && !bodyData.clockOut)
      Object.assign(updateObject, { attendenceStatus: 'CLOCKIN' });

    Object.assign(attObj, { actionById: bodyData.spocId });
    Object.assign(attObj, { actionByName: bodyData.spocName });
    Object.assign(attObj, { actionRemark: bodyData.remark });
    Object.assign(attObj, { actionByTimeStamp: new Date() });

    const DataObj = await attendenceModel.findOne({ _id: bodyData.id }).select({ locationId: 1, attendenceDetails: 1 });
    let checkedInLocId = '';

    if (DataObj && DataObj['attendenceDetails'].length > 0)
      checkedInLocId = DataObj['attendenceDetails'][0]['deviceLocationIdClockIn'];

    if (checkedInLocId == '')
      checkedInLocId = DataObj['locationId'];

    Object.assign(attObj, { deviceLocationIdClockIn: checkedInLocId });

    if (attObj && Object.keys(attObj).length != 0)
      Object.assign(pushedObject, { attendenceDetails: attObj });

    // if (pushedObject && Object.keys(pushedObject).length != 0)

    const update = {
      $set: updateObject,
      $push: pushedObject
    };

    await attendenceModel.findOneAndUpdate({ _id: bodyData.id }, update, { new: true });

    return true;
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

    if (filter) {
      filter = JSON.parse(filter);

      if (filter.status) {
        dbQuery.push({ userStatus: filter.status });
      }

      if (filter.location) {
        if (Array.isArray(filter.location))
          dbQuery.push({ locationId: { $in: filter.location } });
        else
          dbQuery.push({ locationId: filter.location });
      }
    }

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
              'attendenceStatus': 1,
              'userStatus': { '$arrayElemAt': ['$userStatus', -1] },
              'isHoliday': '$isHoliday',
              'shiftStart': { '$arrayElemAt': ['$shiftStart', -1] },
              'shiftEnd': { '$arrayElemAt': ['$shiftEnd', -1] },
              'attendenceDetails': '$attendenceDetails'
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
    const deptIds = resData.map(i => i.dataArr[0].deptId);

    let userDetails = [], userDeptDetails = [];

    // get user name
    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/user/get-user-name`,
      { rec_id: userIds }
    );

    if (userData.data.status == 200) {
      userDetails = userData.data.data;
    }

    if (deptIds.length > 0) {
      const userDeptData = await axios.post(
        `${process.env.CLIENTSPOC}api/v1/department/get-department-names`,
        { deptIds: deptIds }
      );

      if (userDeptData.data.status == 200) {
        userDeptDetails = userDeptData.data.data;
      }
    }

    for (const [index, item] of resData.entries() || []) {
      let presentCount = 0;
      let WOP_Count = 0;
      let HOP_Count = 0;
      let halfDayCount = 0;
      let absentCount = 0;
      let WO_Count = 0;
      let leaveCount = 0;
      let holidayCount = 0;
      let CO_Count = 0;
      let SP_Count = 0;
      let WFH_Count = 0;
      let totalOverTime = 0;
      let totalSpendTimeMin = 0;
      let totalShiftDurationMin = 0;

      for (const itemObj of item.dataArr) {
        let clockIn = 0;
        let clockOut = 0;
        let spendTime = 0;
        let overTime = 0;
        let shiftDurationMin = 0;
        let flag = false;
        // let totalSpendTimeByUser = 0;
        let totalShiftTimeByAdmin = 0;

        itemObj.attendenceDetails.forEach(element => {
          if (element.actionBy && element.actionBy == 'ADMIN') {
            clockIn = element.clockIn;
            clockOut = element.clockOut;

            if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0) {
              flag = true;
              totalShiftTimeByAdmin = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
            }
          }
        });

        if (flag)
          spendTime = totalShiftTimeByAdmin;
        else {
          // spendTime = totalSpendTimeByUser;
          clockIn = itemObj['firstEnrty'];
          clockOut = itemObj['lastExit'];
          if (clockIn && clockIn != '' && clockOut && clockOut != '')
            spendTime = getTimeDiff(clockIn, clockOut, 'minutes');
        }

        // shiftTime
        if (itemObj.shiftStart && itemObj.shiftStart > 0 && itemObj.shiftEnd && itemObj.shiftEnd > 0) {
          const shiftDiff = getTimeDiff(itemObj.shiftStart, itemObj.shiftEnd, 'minutes');
          shiftDurationMin = shiftDurationMin + shiftDiff;
        }

        // overTime
        if (clockIn && clockOut && itemObj.shiftStart && itemObj.shiftEnd) {
          overTime = getOverTime(itemObj.shiftStart, itemObj.shiftEnd, clockIn, clockOut);
          if (overTime && overTime != 'N/A' && totalOverTime == 0)
            totalOverTime = overTime;
          else if (overTime && overTime != 'N/A' && totalOverTime != 0)
            totalOverTime = addTimeCalculation(totalOverTime, overTime);
        }

        totalSpendTimeMin = totalSpendTimeMin + spendTime;
        totalShiftDurationMin = totalShiftDurationMin + shiftDurationMin;

        // presentCount
        if (itemObj.attendenceDetails.length > 0)
          presentCount++;

        //WOP Count 
        if (itemObj.userStatus == 'WOP')
          WOP_Count++;

        //HOP Count 
        if (itemObj.userStatus == 'HOP')
          HOP_Count++;

        //Half Day Count 
        if (itemObj.userStatus == 'HALFDAY')
          halfDayCount++;

        // absentCount 
        if (itemObj.attendenceDetails.length == 0)
          absentCount++;

        //Week Off Count 
        if (itemObj.userStatus == 'WEEKLYOFF')
          WO_Count++;

        //leaveCount 
        if (itemObj.userStatus == 'ONLEAVE' || itemObj.userStatus == 'CL' || itemObj.userStatus == 'SL' || itemObj.userStatus == 'LOP')
          leaveCount++;

        // holidayCount
        if (itemObj['isHoliday'] || itemObj.userStatus == 'HOLIDAY' || itemObj.userStatus == 'HO')
          holidayCount++;

        // Comp Off Count
        if (itemObj.userStatus == 'CO')
          CO_Count++;

        // Singal Punch Count
        if (itemObj.userStatus == 'SP')
          SP_Count++;

        //WFH Count 
        if (itemObj.userStatus == 'WFH')
          WFH_Count++;
      }

      // get user name and empCode
      const userObj = userDetails.filter(data => data.rec_id == item._id);

      // find user department name
      const userDeptDetailsObj = userDeptDetails.filter(data => data.id == item.dataArr[0].deptId);

      resData[index]['empCode'] = userObj.length > 0 && userObj[0]['emp_code'] ? userObj[0]['emp_code'] : '-';
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name']?.trim() : '-';
      resData[index]['designation'] = userObj.length > 0 && userObj[0]['designation'] ? userObj[0]['designation'].trim() : '-';
      resData[index]['project'] = userObj.length > 0 && userObj[0]['project'] ? userObj[0]['project'].trim() : '-';
      resData[index]['payroll'] = userObj.length > 0 && userObj[0]['payroll'] ? userObj[0]['payroll'].trim() : '-';
      resData[index]['deptName'] = userDeptDetailsObj.length > 0 ? userDeptDetailsObj[0]['dept_name']?.trim() : '-';
      resData[index]['presentCount'] = presentCount;
      resData[index]['WOP_Count'] = WOP_Count;
      resData[index]['HOP_Count'] = HOP_Count;
      resData[index]['halfDayCount'] = halfDayCount;
      resData[index]['absentCount'] = absentCount;
      resData[index]['WO_Count'] = WO_Count;
      resData[index]['leaveCount'] = leaveCount;
      resData[index]['holidayCount'] = holidayCount;
      resData[index]['CO_Count'] = CO_Count;
      resData[index]['SP_Count'] = SP_Count;
      resData[index]['WFH_Count'] = WFH_Count;
      resData[index]['overTime'] = (totalShiftDurationMin > 0 && totalOverTime != 'N/A' > 0) ? totalOverTime : 'N/A';
      resData[index]['duration'] = totalSpendTimeMin > 0 ? formatMinutesToHHMM(totalSpendTimeMin) : 'N/A';
      const avgDurationMin = (totalSpendTimeMin / presentCount) > 0 ? (totalSpendTimeMin / presentCount) : 0;
      resData[index]['avgDuration'] = avgDurationMin > 0 ? formatMinutesToHHMM(avgDurationMin) : 'N/A';
      resData[index]['avgDurationMin'] = avgDurationMin;
    }

    // sorting
    if (sort_by && sort_by != '') {
      if (sort_by == 'userId')
        resData = sortByKey(resData, '_id');
      else if (sort_by == 'present')
        resData = sortByKey(resData, 'presentCount');
      else if (sort_by == 'WOP')
        resData = sortByKey(resData, 'WOP_Count');
      else if (sort_by == 'HOP')
        resData = sortByKey(resData, 'HOP_Count');
      else if (sort_by == 'halfDay')
        resData = sortByKey(resData, 'halfDayCount');
      else if (sort_by == 'absent')
        resData = sortByKey(resData, 'absentCount');
      else if (sort_by == 'WO')
        resData = sortByKey(resData, 'WO_Count');
      else if (sort_by == 'leave')
        resData = sortByKey(resData, 'leaveCount');
      else if (sort_by == 'holiday')
        resData = sortByKey(resData, 'holidayCount');
      else if (sort_by == 'CO')
        resData = sortByKey(resData, 'CO_Count');
      else if (sort_by == 'SP')
        resData = sortByKey(resData, 'SP_Count');
      else if (sort_by == 'WFH')
        resData = sortByKey(resData, 'WFH_Count');
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

const calculateCountOfArr = async (resData) => {
  let checkedInCount = 0;
  let presentCount = 0;
  let absentCount = 0;
  let SP_Count = 0;
  let halfDayCount = 0;
  let leaveCount = 0;
  let wfhCount = 0;
  let totalOverTime = 0;

  resData.map(item => {
    //  CheckedInCount
    if (item.firstEnrty > 0 && item.lastExit == '')
      checkedInCount++;

    // presentCount
    if (presentList.includes(item.userStatus))
      presentCount++;

    // absentCount 
    if (absentList.includes(item.userStatus))
      absentCount++;

    //wfhCount
    if (item.userStatus == 'WFH')
      wfhCount++;

    //Singal Punch 
    if (item.userStatus == 'SP')
      SP_Count++;

    //HalfDay
    if (item.userStatus == 'HALFDAY')
      halfDayCount++;

    //leaveCount 
    if (item.userStatus == 'ONLEAVE' || item.userStatus == 'CL' || item.userStatus == 'SL' || item.userStatus == 'LOP')
      leaveCount++;

    // OverTime
    let clockIn = 0;
    let clockOut = 0;
    let overTime = 0;
    let flag = false;

    item.attendenceDetails.forEach(element => {
      if (element.actionBy && element.actionBy == 'ADMIN') {
        clockIn = element.clockIn;
        clockOut = element.clockOut;
        flag = true;
      }
    });

    if (!flag) {
      clockIn = item['firstEnrty'];
      clockOut = item['lastExit'];
    }

    // overTime
    if (clockIn && clockOut && item.shiftStart && item.shiftEnd) {
      overTime = getOverTime(item.shiftStart, item.shiftEnd, clockIn, clockOut);
      if (overTime && overTime != 'N/A' && totalOverTime == 0)
        totalOverTime = overTime;
      else if (overTime && overTime != 'N/A' && totalOverTime != 0)
        totalOverTime = addTimeCalculation(totalOverTime, overTime);
    }
  });

  const calObj = {
    'totalCheckedInCount': checkedInCount,
    'presentCount': presentCount,
    'absentCount': absentCount,
    'wfhCount': wfhCount,
    'SP_Count': SP_Count,
    'halfDayCount': halfDayCount,
    'leaveCount': leaveCount,
    'totalOverTime': totalOverTime != 'N/A' && totalOverTime != 0 ? totalOverTime : 'N/A'
  };
  return calObj;
};

const getTimeDiff = (start, end, type) => {
  if (start && end && start != '' && end != '')
    return moment.unix(end).startOf(type).diff(moment.unix(start).startOf(type), type);
  return 0;
};

// const sortByKey = (arr, key) => {
//   if (key == 'name' || key == 'userStatus') {
//     return arr.sort((a, b) => {
//       if(a[key] < b[key]) { return -1; }
//       if(a[key] > b[key]) { return 1; }
//       return 0;
//     });
//   }
//   return arr.sort((a, b) => a[key] - b[key]);
// };

const sortByKey = (arr, key) => {
  if (key == 'name' || key == 'userStatus') {
    arr.sort((a, b) => a[key].toLowerCase().localeCompare(b[key].toLowerCase()));
  }
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

// function getTimeDiffInHours(stTime, endTime) {
//   if (stTime && endTime && stTime != '' && endTime != '')
//     return moment.utc(moment(endTime, 'HH:mm:ss').diff(moment(stTime, 'HH:mm:ss'))).format('hh:mm');
//   return 0;
// }

const isShiftOverlapping = (intervals, newInterval) => {
  const a = newInterval.shiftStart;
  const b = newInterval.shiftEnd;

  for (const interval of intervals) {
    const c = interval.shiftStart[interval.shiftStart.length - 1];
    const d = interval.shiftEnd[interval.shiftEnd.length - 1];

    if (a < d && b > c)
      return true;
  }
  return false;
};

const overtimeData = [
  {
    rangeStartMin: 0,
    rangeEndMin: 30,
    rangeHr: '00:00'
  },
  {
    rangeStartMin: 31,
    rangeEndMin: 90,
    rangeHr: '01:00'
  },
  {
    rangeStartMin: 91,
    rangeEndMin: 150,
    rangeHr: '02:00'
  },
  {
    rangeStartMin: 151,
    rangeEndMin: 210,
    rangeHr: '03:00'
  },
  {
    rangeStartMin: 211,
    rangeEndMin: 270,
    rangeHr: '04:00'
  },
  {
    rangeStartMin: 271,
    rangeEndMin: 330,
    rangeHr: '05:00'
  },
  {
    rangeStartMin: 331,
    rangeEndMin: 390,
    rangeHr: '06:00'
  },
  {
    rangeStartMin: 391,
    rangeEndMin: 450,
    rangeHr: '07:00'
  },
  {
    rangeStartMin: 451,
    rangeEndMin: 510,
    rangeHr: '08:00'
  },
  {
    rangeStartMin: 511,
    rangeEndMin: 570,
    rangeHr: '09:00'
  },
  {
    rangeStartMin: 571,
    rangeEndMin: 630,
    rangeHr: '10:00'
  },
  {
    rangeStartMin: 631,
    rangeEndMin: 690,
    rangeHr: '11:00'
  },
  {
    rangeStartMin: 691,
    rangeEndMin: 720,
    rangeHr: '12:00'
  }
];

function getOverTime(shiftStart, shiftEnd, checkIn, checkout) {
  if (!Number(shiftStart) > 0 || !Number(shiftEnd) > 0 || !Number(checkIn) > 0 || !Number(checkout) > 0)
    return 'N/A';

  const totalShiftMin = getTimeDiff(shiftStart, shiftEnd, 'minutes');
  const totalWorkingMin = getTimeDiff(checkIn, checkout, 'minutes');
  if (totalShiftMin > totalWorkingMin) return 'N/A';

  const totalTimeDiff = totalWorkingMin - totalShiftMin;
  let chkOvertime = null;

  overtimeData.forEach((a) => {
    if (a.rangeStartMin <= totalTimeDiff) {
      chkOvertime = a;
    }
  });

  if (!chkOvertime) return 'N/A';
  return chkOvertime.rangeHr;
}

const addTimeCalculation = ((oldTime, newTime) => {
  const splitTime = newTime.split(':');
  const hours = parseInt(splitTime[0]);
  const minutes = parseInt(splitTime[1]);
  const calTime = moment(oldTime, 'HH:mm').add(hours, 'hours').add(minutes, 'minutes');
  return calTime.format('HH:mm');
});

// const autoCalculateStatus = async (shiftStart, shiftEnd, checkIn, checkOut) => {
//   let superStatus = 'N/A', subStatus = 'N/A', minHoursForFullPresent = 0, startRangeForHalfDay = 0, endRangeForHalfDay = 0;
//   if (!shiftStart && !shiftEnd && !checkIn && !checkOut)
//     return {
//       superStatus,
//       subStatus,
//     };
//   // } else if (shiftStart && shiftEnd && !checkIn && !checkOut) {
//   //   return {
//   //     superStatus,
//   //     subStatus,
//   //   };
//   // }
//   const shiftDiff = moment.unix(shiftEnd).startOf('hour').diff(moment.unix(shiftStart).startOf('hour'), 'hour');
//   const workingHoursDiff = moment.unix(checkOut).startOf('hour').diff(moment.unix(checkIn).startOf('hour'), 'hour');
//   if (shiftDiff == 12) {
//     minHoursForFullPresent = 10;
//     startRangeForHalfDay = 5;
//     endRangeForHalfDay = 10;
//   } else if (shiftDiff == 8) {
//     minHoursForFullPresent = 7;
//     startRangeForHalfDay = 4;
//     endRangeForHalfDay = 7;
//   } else if (shiftDiff == 9) {
//     minHoursForFullPresent = 7;
//     startRangeForHalfDay = 5;
//     endRangeForHalfDay = 8;
//   } else if (shiftDiff == 10) {
//     startRangeForHalfDay = 5;
//     endRangeForHalfDay = 8;
//   } else if (shiftDiff == 7) {
//     startRangeForHalfDay = 4;
//     endRangeForHalfDay = 6;
//   }
//   if (workingHoursDiff >= minHoursForFullPresent) {
//     superStatus = 'PRESENT';
//     subStatus = 'PRESENT';
//   } else if (workingHoursDiff >= startRangeForHalfDay && workingHoursDiff <= endRangeForHalfDay) {
//     superStatus = 'PRESENT';
//     subStatus = 'HALFDAY';
//   } else if (checkIn && !checkOut) {
//     if (shiftEnd > 0 && (parseInt(shiftEnd) + 86400) > moment().unix()) {
//       superStatus = 'PRESENT';
//       subStatus = 'PRESENT';
//     }
//     else {
//       superStatus = 'ABSENT';
//       subStatus = 'SP';
//     }
//   } else if (shiftStart > 0 && shiftEnd > 0 && checkIn > 0 && checkOut > 0) {
//     if (shiftEnd > 0 && (parseInt(shiftEnd) + 86400) < moment().unix()) {
//       superStatus = 'ABSENT';
//       subStatus = 'SP';
//     }
//     if (shiftEnd > 0 && (parseInt(shiftEnd) + 86400) > moment().unix()) {
//       superStatus = 'PRESENT';
//       subStatus = 'SP';
//     }
//   } else if (shiftStart == -1 && shiftEnd == -1 && checkIn && checkOut) {
//     superStatus = 'PRESENT';
//     subStatus = 'WOP';
//   } else if (shiftStart == -1 && shiftEnd == -1) {
//     superStatus = 'ABSENT';
//     subStatus = 'WEEKLYOFF';
//   } else if (shiftStart == -2 && shiftEnd == -2) {
//     superStatus = 'ABSENT';
//     subStatus = 'WFH';
//   } else if (shiftStart == -3 && shiftEnd == -3) {
//     superStatus = 'ABSENT';
//     subStatus = 'CL';
//   } else if (shiftStart == -4 && shiftEnd == -4 && checkIn && checkOut) {
//     superStatus = 'PRESENT';
//     subStatus = 'HOP';
//   } else if (shiftStart == -4 && shiftEnd == -4) {
//     superStatus = 'ABSENT';
//     subStatus = 'HO';
//   } else if (checkIn && checkOut && !shiftStart && !shiftEnd) {
//     superStatus = 'PRESENT';
//     subStatus = 'PRESENT';
//   } else {
//     superStatus = 'ABSENT';
//     subStatus = 'ABSENT';
//   }
//   return {
//     superStatus,
//     subStatus,
//   };
// };

const formatMinutesToHHMM = (minutes) => {
  const m = parseInt(minutes % 60);
  const h = parseInt((minutes - m) / 60);
  const HHMM = (h < 10 ? '0' : '') + h.toString() + ':' + (m < 10 ? '0' : '') + m.toString();
  return HHMM;
};