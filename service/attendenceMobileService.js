/* eslint-disable max-len */
// const mongoose = require('mongoose');
const moment = require('moment');
/*
 *------------User Service------------
 */
exports.checkInService = async (tenantDbConnection, userDetails, date, body) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    let clockInTimeStamp = body.clockInTime;
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
        userStatus: 'PRESENT',
        attendenceDetails: [{ clockIn: clockInTimeStamp, clockOut: '', deviceNameClockIn: body.deviceName, deviceNumberClockIn: body.deviceNumber, deviceLocationClockIn: body.deviceLocation }],
      };
      await attendenceModel(insertData).save();
      clockInTimeStamp = moment.unix(clockInTimeStamp).format('hh:mm a');
      return { type: true, msg: 'You have successfully Checked In', data: {userDetails, clockInTimeStamp, totalDuration} };
    }
    if (res.attendenceStatus == 'CLOCKIN')
      return { type: false, msg: 'You have Already Checked in', data: '' };

    if (res.attendenceStatus == 'CLOCKOUT' || res.attendenceStatus == 'N/A') {
      const attendenceDetails = res.attendenceDetails;
      attendenceDetails.push({ clockIn: clockInTimeStamp, clockOut: '', deviceNameClockIn: body.deviceName, deviceNumberClockIn: body.deviceNumber, deviceLocationClockIn: body.deviceLocation });
      let userStatus = res.userStatus;
      
      if(res.shiftStart)
      {
        const diffTime = getTimeDiff(res.shiftStart, clockInTimeStamp, 'minutes');
        if(diffTime <= 15  && diffTime >= -15)
          userStatus = 'ONTIME';
        
        if(diffTime > 15)
          userStatus = 'LATECHECKIN';
      }

      await attendenceModel.findOneAndUpdate(
        { _id: res._id },
        { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKIN', userStatus: userStatus }
      );
      clockInTimeStamp = moment.unix(clockInTimeStamp).format('hh:mm a');
      if (res.attendenceStatus == 'CLOCKOUT')
        clockInTimeStamp = moment.unix(res.attendenceDetails[0].clockIn).format('hh:mm a');
      return { type: true, msg: 'You have successfully Checked In', data: {userDetails, clockInTimeStamp, totalDuration} };
    }
  } catch (err) {
    console.log(err);
    return false;
  }
};

exports.checkOutService = async (tenantDbConnection, userDetails, date, body) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    let clockInTimeStamp = moment().unix();
    let clockOutTimeStamp = body.clockOutTime;
    // let clockOutTimeStamp = moment().unix();
    let totalDuration = '00:00';
    const res = await attendenceModel.findOne({
      userId: userDetails.user_id,
      date: date,
    });
    if (!res)
      return { type: false, msg: 'Its Seems you are not check in today so please checkin first', data: '' };
    if (res.attendenceStatus == 'CLOCKOUT' || res.attendenceStatus == 'N/A')
      return { type: false, msg: 'Its Seems you are not check in today so please checkin first', data: '' };

    if (res.attendenceStatus == 'CLOCKIN') {
      let attendenceDetails = res.attendenceDetails;
      attendenceDetails = attendenceDetails.reverse();

      const objIndex = attendenceDetails.findIndex(
        (obj) => obj._id == attendenceDetails[0]['_id']
      );
      attendenceDetails[objIndex].clockOut = clockOutTimeStamp;
      attendenceDetails[objIndex].deviceNameClockOut = body.deviceName;
      attendenceDetails[objIndex].deviceNumberClockOut = body.deviceNumber;
      attendenceDetails[objIndex].deviceLocationClockOut = body.deviceLocation;
      attendenceDetails = attendenceDetails.reverse();
      const diff = moment.unix(clockOutTimeStamp).startOf('minutes').diff(moment.unix(res.attendenceDetails[0].clockIn).startOf('minutes'), 'minutes');
      totalDuration = Math.floor(diff / 60) + 'hrs ' + diff % 60+ 'min' ;
      clockInTimeStamp = moment.unix(res.attendenceDetails[0].clockIn).format('hh:mm a');
      clockOutTimeStamp = moment.unix(clockOutTimeStamp).format('hh:mm a');

      let userStatus = res.userStatus;
      
      if(res.shiftEnd)
      {
        const diffTime = getTimeDiff(res.shiftEnd, clockOutTimeStamp, 'minutes');
        if(diffTime > -15)
          userStatus = 'EARLYEXIT';
        
        if(diffTime > 15)
          userStatus = 'LATEEXIT';
      }

      await attendenceModel.findOneAndUpdate(
        { _id: res._id },
        { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKOUT', userStatus : userStatus }
      );
      return { 
        type: true, msg: 'You have successfully Checked Out', data: {userDetails, clockInTimeStamp, clockOutTimeStamp, totalDuration} 
      };
    }
  } catch (err) {
    return false;
  }
};


exports.getCheckInTimeByUser = async (tenantDbConnection, userDetails, date) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    //let clockInTimeStamp = moment().unix();
    const clockOutTimeStamp = moment().unix();
    let totalDuration = '00:00';
    const res = await attendenceModel.findOne({
      userId: userDetails.user_id,
      date: date,
    });
    if (!res)
      return { type: false, msg: 'Its Seems you are not check in today so please checkin first', data: '' };
    if (res.attendenceStatus == 'CLOCKOUT' || res.attendenceStatus == 'N/A')
      return { type: false, msg: 'Its Seems you are not check in today so please checkin first', data: '' };

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
      const clockInTimeString = moment.unix(res.attendenceDetails[0].clockIn).format('hh:mm a');
      const clockOutTimeString = moment.unix(clockOutTimeStamp).format('hh:mm a');
      const clockOutTime = moment().unix();
      return { 
        type: true, msg: 'Proceed to Check-out', data: {userDetails, clockInTimeString, clockOutTime, clockOutTimeString, totalDuration} 
      };
    }
  } catch (err) {
    return false;
  }
};

exports.createJwtToken = async (adminDbConnection, body) => {
  try {
    const clientMasterDatas = await adminDbConnection.model('client_master_datas');
    const res = await clientMasterDatas.findOne({
      clientId: body.clientId,
    });
    if (!res)
      return { type: false, msg: 'You are not subscribed this service', data: '' };

    return { type: true, data: res };
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