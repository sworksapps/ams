const mongoose = require('mongoose');
const moment = require('moment');

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
      }

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
        $match: {date}
      },
      // { $sort: sort_by },
    ];

    // if (dbQuery.length > 0)
    //   query[4].$match.$and = dbQuery;

    // if (dbQuery1.length > 0)
    //   query[4].$match.$or = dbQuery1;


    const resData = await attModel.aggregate([...query, { $skip: limit * page }, { $limit: limit }]);
    const userIds = resData.map(i => i.userId);
    console.log(userIds);

    resData.map((item, index) => {
      let totalSpendTime = 0;
      item.attendenceDetails.forEach(element => {

        const diff = getTimeDiff(element.clockIn, element.clockOut, 'minutes');
        totalSpendTime = totalSpendTime + diff;
      });
      const shiftDiff = getTimeDiff(item.shiftStart, item.shiftEnd, 'minutes');
      console.log(totalSpendTime, shiftDiff);
      resData[index]['overTime'] = totalSpendTime - shiftDiff;
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
        dataArray: []
      };
    });

    for (let index = 0; index < res.length; index++) {
      const element = res[index];
      for (let j = 0; j < refData.length; j++) {
        const ele = refData[j];
        if (element.userId == ele.user_id) {
          ele.dataArray.push({
            'shift_date': element.date,
            'shift_start_time': timeConvertHHMM(element.shiftStart),
            'shift_end_time': timeConvertHHMM(element.shiftEnd)
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

const getTimeDiff = (start, end, type) => {
  return moment.unix(end).startOf(type).diff(moment.unix(start).startOf(type), type);
};

const timeConvertHHMM = (unixTimestamp) => {
  return new Date(unixTimestamp * 1000).toLocaleTimeString('en-GB').slice(0, 5);
};