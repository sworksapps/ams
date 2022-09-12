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
          'userStatus': 1,
          'deptId': 1,
          'locationId': 1,
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
        $match: { date }
      },
      // { $sort: sort_by },
    ];

    // if (dbQuery.length > 0)
    //   query[4].$match.$and = dbQuery;

    // if (dbQuery1.length > 0)
    //   query[4].$match.$or = dbQuery1;


    const resData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);
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
    });

    const total = await attModel.aggregate([...query, { $count: 'totalCount' }])
      .then(res => res.length > 0 ? res[0].totalCount : 0);

    return { resData, total };
  } catch (err) {
    console.log(err);
    return false;
  }
};

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
              element.shiftStart ? element.shiftStart : 'N/A',
            'shift_end_time': element.shiftEnd && element.shiftEnd > 0 ? format_time(element.shiftEnd) :
              element.shiftEnd ? element.shiftEnd : 'N/A'
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


const getTimeDiff = (start, end, type) => {
  if (start && end && start != '' && end != '')
    return moment.unix(end).startOf(type).diff(moment.unix(start).startOf(type), type);
  return 0;
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