// const mongoose = require('mongoose');
const moment = require('moment');
/*
 *------------User Service------------
 */
exports.checkInService = async (tenantDbConnection, userDetails, date) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const res = await attendenceModel.findOne({
      userId: userDetails.user_id,
      date: date,
    });
    if (!res) {
      const insertData = {
        deptId: userDetails.user_dept_id,
        locationId: userDetails.location_id,
        userId: userDetails.user_id,
        date: date,
        attendenceStatus: 'CLOCKIN',
        attendenceDetails: [{ clockIn: moment().unix(), clockOut: '' }],
      };
      await attendenceModel(insertData).save();
      return { type: true, msg: 'Check-in Successfully', data: userDetails };
    }
    if (res.attendenceStatus == 'CLOCKIN')
      return { type: false, msg: 'Already Check-in', data: '' };

    if (res.attendenceStatus == 'CLOCKOUT' || res.attendenceStatus == 'N/A') {
      const attendenceDetails = res.attendenceDetails;
      attendenceDetails.push({ clockIn: moment().unix(), clockOut: '' });
      await attendenceModel.findOneAndUpdate(
        { _id: res._id },
        { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKIN' }
      );
      return { type: true, msg: 'Check-in Successfully', data: userDetails };
    }
  } catch (err) {
    return false;
  }
};

exports.checkOutService = async (tenantDbConnection, userDetails, date) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const res = await attendenceModel.findOne({
      userId: userDetails.user_id,
      date: date,
    });
    if (!res)
      return { type: false, msg: 'Check-in first to Check-out', data: '' };
    if (res.attendenceStatus == 'CLOCKOUT' || res.attendenceStatus == 'N/A')
      return { type: false, msg: 'Check-in first to Check-out', data: '' };

    if (res.attendenceStatus == 'CLOCKIN') {
      let attendenceDetails = res.attendenceDetails;
      attendenceDetails = attendenceDetails.reverse();

      const objIndex = attendenceDetails.findIndex(
        (obj) => obj._id == attendenceDetails[0]['_id']
      );
      attendenceDetails[objIndex].clockOut = moment().unix();
      await attendenceModel.findOneAndUpdate(
        { _id: res._id },
        { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKOUT' }
      );
      return { type: true, msg: 'Check-out Successfully', data: userDetails };
    }
  } catch (err) {
    return false;
  }
};
