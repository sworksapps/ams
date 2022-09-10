// const mongoose = require('mongoose');
const moment = require('moment');
/*
 *------------User Service------------
 */
exports.checkInService = async (tenantDbConnection, userDetails, date, clockInTime) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    let clockInTimeStamp = clockInTime;
    // let clockInTimeStamp = moment().unix();
    const totalDuration = '00:00';
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
        attendenceDetails: [{ clockIn: clockInTimeStamp, clockOut: '' }],
      };
      await attendenceModel(insertData).save();
      clockInTimeStamp = moment.unix(clockInTimeStamp).format('hh:mm a');
      return { type: true, msg: 'Check-in Successfully', data: {userDetails, clockInTimeStamp, totalDuration} };
    }
    if (res.attendenceStatus == 'CLOCKIN')
      return { type: false, msg: 'Already Check-in', data: '' };

    if (res.attendenceStatus == 'CLOCKOUT' || res.attendenceStatus == 'N/A') {
      const attendenceDetails = res.attendenceDetails;
      attendenceDetails.push({ clockIn: clockInTimeStamp, clockOut: '' });
      await attendenceModel.findOneAndUpdate(
        { _id: res._id },
        { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKIN' }
      );
      clockInTimeStamp = moment.unix(clockInTimeStamp).format('hh:mm a');
      if (res.attendenceStatus == 'CLOCKOUT')
        clockInTimeStamp = moment.unix(res.attendenceDetails[0].clockIn).format('hh:mm a');
      return { type: true, msg: 'Check-in Successfully', data: {userDetails, clockInTimeStamp, totalDuration} };
    }
  } catch (err) {
    return false;
  }
};

exports.checkOutService = async (tenantDbConnection, userDetails, date) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    let clockInTimeStamp = moment().unix();
    let clockOutTimeStamp = moment().unix();
    let totalDuration = '00:00';
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
      attendenceDetails[objIndex].clockOut = clockOutTimeStamp;
      attendenceDetails = attendenceDetails.reverse();
      const diff = moment.unix(clockOutTimeStamp).startOf('minutes').diff(moment.unix(res.attendenceDetails[0].clockIn).startOf('minutes'), 'minutes');
      totalDuration = Math.floor(diff / 60) + 'hrs ' + diff % 60+ 'min' ;
      clockInTimeStamp = moment.unix(res.attendenceDetails[0].clockIn).format('hh:mm a');
      clockOutTimeStamp = moment.unix(clockOutTimeStamp).format('hh:mm a');
      await attendenceModel.findOneAndUpdate(
        { _id: res._id },
        { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKOUT' }
      );
      return { 
        type: true, msg: 'Check-out Successfully', data: {userDetails, clockInTimeStamp, clockOutTimeStamp, totalDuration} 
      };
    }
  } catch (err) {
    return false;
  }
};
