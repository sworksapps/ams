const moment = require('moment');
const axios = require('axios');
// eslint-disable-next-line max-len
const presentList = ['PRESENT', 'LATECHECKIN', 'ONTIME', 'WFH', 'EARLYEXIT', 'LATEEXIT', 'OVERTIME', 'HALFDAY', 'MISSINGCHECKOUT'];
const absentList = ['ABSENT'];
/* ---------------get daily report----------------------*/
exports.insertShiftData = async (tenantDbConnection, bodyData) => {
  try {
    const attModel = await tenantDbConnection.model('attendences_data');
    const holidayModel = await tenantDbConnection.model('holiday_lists');

    for (const iterator of bodyData) {
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
        Object.assign(insertObj, { 'userStatus': 'WEEKOFF' });

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
          dbQuery1.userStatus = filter.kpiFilter;
        if (filter.kpiFilter === 'WFH')
          dbQuery1.userStatus = filter.kpiFilter;
        if (filter.kpiFilter === 'WEEKOFF')
          dbQuery1.userStatus = filter.kpiFilter;
        if (filter.kpiFilter === 'ONTIME')
          dbQuery1.userStatus = filter.kpiFilter;
        if (filter.kpiFilter === 'LATECHECKIN')
          dbQuery1.userStatus = filter.kpiFilter;
        if (filter.kpiFilter === 'CHECKEDIN')
          dbQuery1.lastExit = '';
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
          'userStatus': { '$arrayElemAt': ['$userStatus', -1] },
          'deptId': 1,
          'locationId': 1,
          'isHoliday': 1,
          'attendenceDetails.clockIn': 1,
          'attendenceDetails.clockOut': 1,
          'attendenceDetails.actionBy': 1,
          'attendenceDetails.deviceLocationClockIn': 1,
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
      { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[0].$match.$and = dbQuery;
    if (dbQuery2.length > 0)
      query[3].$match.$or = dbQuery2;

    let resData = await attModel.aggregate([...query]);

    // calculate kpi
    const kpiRes = await calculateCountOfArr(resData);
    const userIds = resData.map(i => i.userId);
    let userDetails = [];

    // get user name
    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/user/get-user-name`,
      { rec_id: userIds }
    );

    if (userData.data.status == 200)
      userDetails = userData.data.data;

    resData.map(async (item, index) => {
      let clockIn = 0;
      let clockOut = 0;
      let clockInLocId;
      let totalSpendTime = 0;
      let totalShiftTime = 0;
      let overTime = 0;
      let totalSpendTimeByUser = 0;
      let totalShiftTimeByAdmin = 0;
      let flag = false;

      item.attendenceDetails.forEach(element => {
        // eslint-disable-next-line max-len
        if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0 && element.actionBy && element.actionBy == 'ADMIN') {
          flag = true;
          clockIn = element.clockIn;
          clockOut = element.clockOut;
          clockInLocId = item['checkedInLocationId'];
          totalShiftTimeByAdmin = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
        }
        else if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0 && !flag) {
          const diff = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
          totalSpendTimeByUser = totalSpendTimeByUser + diff;
        }
      });

      if (flag)
        totalSpendTime = totalShiftTimeByAdmin;
      else {
        totalSpendTime = totalSpendTimeByUser;
        clockIn = item['firstEnrty'];
        clockOut = item['lastExit'];
        clockInLocId = item['checkedInLocationId'];
      }

      // shiftTime
      if (item.shiftStart && item.shiftStart > 0 && item.shiftEnd && item.shiftEnd > 0)
        totalShiftTime = getTimeDiff(item.shiftStart, item.shiftEnd, 'minutes');

      // MISSINGCHECKOUT  
      const dateTime = new Date();
      dateTime.setHours(18, 29, 0, 0); // set time as 23:59:00
      const midTime = moment(dateTime).unix();
      const currentTime = moment().unix();

      if (item.shiftEnd && item.shiftEnd > 0 && currentTime > item.shiftEnd && currentTime > midTime && item.lastExit == '')
        await attModel.findOneAndUpdate({ _id: item._id }, { $push: { userStatus: 'MISSINGCHECKOUT' } });

      const userObj = userDetails.filter(data => data.rec_id == resData[index]['userId']);

      if (totalSpendTime > 0 && totalShiftTime > 0)
        overTime = totalSpendTime - totalShiftTime;
      // eslint-disable-next-line max-len
      resData[index]['overTime'] = overTime > 0 ? new Date(overTime * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      resData[index]['overTimeMin'] = overTime;
      resData[index]['empCode'] = userObj.length > 0 && userObj[0]['emp_code'] ? userObj[0]['emp_code'] : '-';
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name']?.trim() : '-';
      resData[index]['durationMin'] = totalSpendTime;
      resData[index]['checkedInLocationId'] = clockInLocId ? clockInLocId : 'N/A';
      resData[index]['clockIn'] = clockIn > 0 ? format_time(clockIn) : 'N/A';
      resData[index]['clockOut'] = clockOut > 0 ? format_time(clockOut) : 'N/A';
      resData[index]['clockInNum'] = clockIn;
      resData[index]['clockOutNum'] = clockOut;
      resData[index]['duration'] = totalSpendTime > 0 ? new Date(totalSpendTime * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      resData[index]['recentEnrty'] = item['recentEnrty'] && item['recentEnrty'] > 0 ? format_time(item['recentEnrty']) : 'N/A';
      resData[index]['shiftStartNum'] = item['shiftStart'];
      resData[index]['shiftEndNum'] = item['shiftEnd'];
      resData[index]['shiftStart'] = item['shiftStart'] && item['shiftStart'] > 0 ? format_time(item['shiftStart']) : 'N/A';
      resData[index]['shiftEnd'] = item['shiftEnd'] && item['shiftEnd'] > 0 ? format_time(item['shiftEnd']) : 'N/A';
      resData[index]['holidayName'] = resData[index]['holidayName'] ? resData[index]['holidayName'] : '';
    });

    //sorting 
    if (sortBy != '')
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

      if (filter.location) {
        if (Array.isArray(filter.location))
          dbQuery1.checkedInLocationId = { $in: filter.location };
        else
          dbQuery1.checkedInLocationId = filter.location.toString();
      }

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
          'userStatus': { '$arrayElemAt': ['$userStatus', -1] },
          'shiftStart': { '$arrayElemAt': ['$shiftStart', -1] },
          'shiftEnd': { '$arrayElemAt': ['$shiftEnd', -1] },
          'checkedInLocationId': { '$arrayElemAt': ['$attendenceDetails.deviceLocationIdClockIn', 0] },
          'firstEnrty': { '$arrayElemAt': ['$attendenceDetails.clockIn', 0] },
          'lastExit': { '$arrayElemAt': ['$attendenceDetails.clockOut', -1] },
          'attendenceDetails.clockIn': 1,
          'attendenceDetails.clockOut': 1,
          'attendenceDetails.actionBy': 1,
          'attendenceDetails.deviceLocationClockIn': 1
        }
      },
      {
        $match: dbQuery1 ? dbQuery1 : {}
      },
      { $sort: sort_by },
    ];

    if (dbQuery.length > 0)
      query[0].$match.$and = dbQuery;

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
      let clockInLocId;
      let totalSpendTime = 0;
      let shiftDurationMin = 0;
      let flag = false;
      const userObj = userDetails.filter(data => data.rec_id == resData[index]['userId']);
      let totalSpendTimeByUser = 0;
      let totalShiftTimeByAdmin = 0;

      item.attendenceDetails.forEach(element => {
        // eslint-disable-next-line max-len
        if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0 && element.actionBy && element.actionBy == 'ADMIN') {
          flag = true;
          clockIn = element.clockIn;
          clockOut = element.clockOut;
          clockInLocId = item['checkedInLocationId'];
          totalShiftTimeByAdmin = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
        }
        else if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0 && !flag) {
          const diff = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
          totalSpendTimeByUser = totalSpendTimeByUser + diff;
        }
      });

      if (flag)
        totalSpendTime = totalShiftTimeByAdmin;
      else {
        totalSpendTime = totalSpendTimeByUser;
        clockIn = item['firstEnrty'];
        clockOut = item['lastExit'];
        clockInLocId = item['checkedInLocationId'];
      }

      // shiftTime
      if (item.shiftStart && item.shiftStart > 0 && item.shiftEnd && item.shiftEnd > 0) {
        const shiftDiff = getTimeDiff(item.shiftStart, item.shiftEnd, 'minutes');
        shiftDurationMin = shiftDurationMin + shiftDiff;
      }

      resData[index]['empCode'] = userObj.length > 0 && userObj[0]['emp_code'] ? userObj[0]['emp_code'] : '-';
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name']?.trim() : '-';
      // eslint-disable-next-line max-len
      resData[index]['overTimeMin'] = shiftDurationMin > 0 && totalSpendTime > 0 && (totalSpendTime - shiftDurationMin) > 0 ? (totalSpendTime - shiftDurationMin) : 0;
      // eslint-disable-next-line max-len
      resData[index]['overTime'] = shiftDurationMin > 0 && totalSpendTime > 0 && (totalSpendTime - shiftDurationMin) > 0 ? new Date((totalSpendTime - shiftDurationMin) * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      resData[index]['checkedInLocationId'] = clockInLocId ? clockInLocId : 'N/A';
      resData[index]['clockIn'] = clockIn > 0 ? format_time(clockIn) : 'N/A';
      resData[index]['clockOut'] = clockOut > 0 ? format_time(clockOut) : 'N/A';
      resData[index]['clockInNum'] = clockIn;
      resData[index]['clockOutNum'] = clockOut;
      resData[index]['shiftStartNum'] = item['shiftStart'];
      resData[index]['shiftEndNum'] = item['shiftEnd'];
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
    const updatedObject = {};
    const attObj = {};

    if (bodyData.shiftStart)
      Object.assign(updatedObject, { shiftStart: bodyData.shiftStart });

    if (bodyData.shiftEnd)
      Object.assign(updatedObject, { shiftEnd: bodyData.shiftEnd });

    if (bodyData.status)
      Object.assign(updatedObject, { userStatus: bodyData.status });

    if (bodyData.clockIn)
      Object.assign(attObj, { clockIn: bodyData.clockIn });

    if (bodyData.clockOut)
      Object.assign(attObj, { clockOut: bodyData.clockOut });

    if (bodyData.clockIn || bodyData.clockOut)
      Object.assign(attObj, { actionBy: 'ADMIN' });

    Object.assign(attObj, { actionById: bodyData.spocId });
    Object.assign(attObj, { actionByName: bodyData.spocName });
    Object.assign(attObj, { actionRemark: bodyData.remark });
    Object.assign(attObj, { actionByTimeStamp: new Date() });

    if (attObj && Object.keys(attObj).length != 0)
      Object.assign(updatedObject, { attendenceDetails: attObj });

    if (updatedObject && Object.keys(updatedObject).length != 0)
      await attendenceModel.findOneAndUpdate({ _id: bodyData.id }, { $push: updatedObject }, { new: true });

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
    let userDetails = [];

    // get user name
    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/user/get-user-name`,
      { rec_id: userIds }
    );

    if (userData.data.status == 200)
      userDetails = userData.data.data;

    resData.map((item, index) => {
      let lateEntryCount = 0;
      let earlyExitCount = 0;
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let holidayCount = 0;
      let totalSpendTimeMin = 0;
      let totalShiftDurationMin = 0;
      let lateInMin = 0;

      const userObj = userDetails.filter(data => data.rec_id == item._id);
      resData[index]['name'] = userObj.length > 0 ? userObj[0]['name']?.trim() : '-';
      resData[index]['empCode'] = userObj.length > 0 && userObj[0]['emp_code'] ? userObj[0]['emp_code'] : '-';

      item.dataArr.forEach(itemObj => {
        let clockIn = 0;
        let clockOut = 0;
        let spendTime = 0;
        let shiftDurationMin = 0;
        let flag = false;
        let totalSpendTimeByUser = 0;
        let totalShiftTimeByAdmin = 0;

        itemObj.attendenceDetails.forEach(element => {
          // eslint-disable-next-line max-len
          if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0 && element.actionBy && element.actionBy == 'ADMIN') {
            flag = true;
            clockIn = element.clockIn;
            clockOut = element.clockOut;
            totalShiftTimeByAdmin = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
          }
          else if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0 && !flag) {
            const diff = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
            totalSpendTimeByUser = totalSpendTimeByUser + diff;
          }
        });

        if (flag)
          spendTime = totalShiftTimeByAdmin;
        else {
          spendTime = totalSpendTimeByUser;
          clockIn = itemObj['firstEnrty'];
          clockOut = itemObj['lastExit'];
        }

        // shiftTime
        if (itemObj.shiftStart && itemObj.shiftStart > 0 && itemObj.shiftEnd && itemObj.shiftEnd > 0) {
          const shiftDiff = getTimeDiff(itemObj.shiftStart, itemObj.shiftEnd, 'minutes');
          shiftDurationMin = shiftDurationMin + shiftDiff;
        }

        totalSpendTimeMin = totalSpendTimeMin + spendTime;
        totalShiftDurationMin = totalShiftDurationMin + shiftDurationMin;

        // lateEntryCount
        if (shiftDurationMin > 0 && clockIn > 0) {
          const diff = getTimeDiff(itemObj.shiftStart, clockIn, 'minutes');
          if (diff > 15) {
            lateInMin = lateInMin + diff;
            lateEntryCount++;
          }
        }

        // EarlyExitCount
        if (shiftDurationMin > 0 && clockOut > 0) {
          const diff = getTimeDiff(itemObj.shiftEnd, clockOut, 'minutes');
          if (diff < 0)
            earlyExitCount++;
        }

        // presentCount
        if (itemObj.attendenceDetails.length > 0)
          presentCount++;

        // absentCount 
        if (itemObj.attendenceDetails.length == 0)
          absentCount++;

        //leaveCount 
        if (itemObj.shiftStart == -3 || itemObj.shiftEnd == -3 || itemObj.userStatus == 'ONLEAVE')
          leaveCount++;

        // holidayCount
        if (itemObj['isHoliday'] || itemObj.userStatus == 'HOLIDAY')
          holidayCount++;
      });

      resData[index]['lateEntryCount'] = lateEntryCount;
      resData[index]['earlyExitCount'] = earlyExitCount;
      resData[index]['presentCount'] = presentCount;
      resData[index]['absentCount'] = absentCount;
      resData[index]['leaveCount'] = leaveCount;
      resData[index]['holidayCount'] = holidayCount;
      // eslint-disable-next-line max-len
      resData[index]['overTimeMin'] = totalShiftDurationMin > 0 && totalSpendTimeMin > 0 && (totalSpendTimeMin - totalShiftDurationMin) > 0 ? (totalSpendTimeMin - totalShiftDurationMin) : 0;
      // eslint-disable-next-line max-len
      resData[index]['overTime'] = totalShiftDurationMin > 0 && totalSpendTimeMin > 0 && (totalShiftDurationMin - totalSpendTimeMin) > 0 ? new Date((totalShiftDurationMin - totalSpendTimeMin) * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      resData[index]['avgLateMin'] = (lateInMin / presentCount) > 0 ? (lateInMin / presentCount) : 0;
      // eslint-disable-next-line max-len
      resData[index]['avgLate'] = (lateInMin / presentCount) > 0 ? new Date((lateInMin / presentCount) * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      // eslint-disable-next-line max-len
      resData[index]['duration'] = totalSpendTimeMin > 0 ? new Date(totalSpendTimeMin * 60 * 1000).toISOString().substr(11, 5) : 'N/A';
      const avgDurationMin = (totalSpendTimeMin / presentCount) > 0 ? (totalSpendTimeMin / presentCount) : 0;
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

const calculateCountOfArr = async (resData) => {
  let checkedInCount = 0;
  let lateEntryCount = 0;
  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let wfhCount = 0;
  let weekOffCount = 0;
  // let onTimeCount = 0;
  // let lateInMin = 0;
  // let overTimeMin = 0;

  resData.map(item => {
    // let workDurationMin = 0;
    // let shiftDurationMin = 0;
    // let clockIn = 0;
    // let clockOut = 0;

    //  CheckedInCount
    if (item.firstEnrty > 0 && item.lastExit == '')
      checkedInCount++;

    // presentCount
    if (presentList.includes(item.userStatus))
      presentCount++;

    // absentCount 
    if (absentList.includes(item.userStatus))
      absentCount++;

    //leaveCount 
    if (item.userStatus == 'ONLEAVE')
      leaveCount++;

    //wfhCount
    if (item.userStatus == 'WFH')
      wfhCount++;

    //weekOffCount
    if (item.userStatus == 'WEEKOFF')
      weekOffCount++;

    if (item.userStatus == 'LATECHECKIN')
      lateEntryCount++;

    //shiftTimeDiff
    // if (item.shiftStart && item.shiftStart > 0 && item.shiftEnd && item.shiftEnd > 0) {
    //   shiftDurationMin = getTimeDiff(item.shiftStart, item.shiftEnd, 'minutes');
    // }

    // overTime
    // let totalSpendTimeByUser = 0;
    // let totalShiftTimeByAdmin = 0;
    // let flag = false;

    // item.attendenceDetails.forEach(element => {
    //   eslint-disable-next-line max-len
    //   if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0 && element.actionBy && element.actionBy == 'ADMIN') {
    //     flag = true;
    //     clockIn = element.clockIn;
    //     // clockOut = element.clockOut;
    //     totalShiftTimeByAdmin = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
    //   }
    //   else if (element.clockIn && element.clockIn > 0 && element.clockOut && element.clockOut > 0 && !flag) {
    //     const diff = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
    //     totalSpendTimeByUser = totalSpendTimeByUser + diff;
    //   }
    // });

    // if (flag)
    //   workDurationMin = totalShiftTimeByAdmin;
    // else {
    //   workDurationMin = totalSpendTimeByUser;
    //   // clockIn = item['firstEnrty'];
    //   // clockOut = item['lastExit'];
    // }

    // //overTime
    // if (workDurationMin > 0 && shiftDurationMin > 0) {
    //   const calOverTime = workDurationMin - shiftDurationMin;
    //   if (calOverTime > 0)
    //     overTimeMin = overTimeMin + calOverTime;
    // }

    // lateEntryCount
    // if (shiftDurationMin > 0 && clockIn > 0) {
    //   const diff = getTimeDiff(item.shiftStart, clockIn, 'minutes');
    //   if (diff > 15) {
    //     lateInMin = lateInMin + diff;
    //     lateEntryCount++;
    //   }
    // }

    //onTimeCount 
    // if (item.shiftStart && clockIn > 0) {
    //   const diffTime = getTimeDiff(item.shiftStart, clockIn, 'minutes');
    //   if (diffTime <= 15 && diffTime >= -15)
    //     onTimeCount++;
    // }
    // else 
    // if (item.userStatus == 'ONTIME')
    //   onTimeCount++;
  });

  const calObj = {
    'totalCheckedInCount': checkedInCount,
    'presentCount': presentCount,
    'absentCount': absentCount,
    'leaveCount': leaveCount,
    'wfhCount': wfhCount,
    'weekOffCount': weekOffCount,
    'lateEntryCount': lateEntryCount,
    // 'onTimeCount': onTimeCount,
    // 'totalOverTime': overTimeMin > 0 ? new Date((overTimeMin) * 60 * 1000).toISOString().substr(11, 5) : 'N/A'
  };
  return calObj;
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

// function getTimeDiffInHours(stTime, endTime) {
//   if (stTime && endTime && stTime != '' && endTime != '')
//     return moment.utc(moment(endTime, 'HH:mm:ss').diff(moment(stTime, 'HH:mm:ss'))).format('hh:mm');
//   return 0;
// }



