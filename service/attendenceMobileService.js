/* eslint-disable max-len */
// const mongoose = require('mongoose');
const moment = require('moment');
const prozoClienId = process.env.prozoClienId;

const commonMethods = require('../common/methods/commonMethods');
/*
 *------------User Service------------
 */
exports.preCheckInService = async (tenantDbConnection, userDetails, dateValue, body, decodedjwt) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const date = dateValue;
    const clockInTimeStamp = moment().unix();
    // check today checkin start

    // if(decodedjwt.clientId == '1471') {
    //   const res = await attendenceModel.findOne({
    //     userId: userDetails.user_id,
    //     date: date,
    //   });
    //   if(!res) {
    //     return { type: false, msg: 'Shift not found', data: '' };
    //   }
    //   if(res) {
    //     let shiftStartValue = '';
    //     let shiftEndValue = '';
    //     if(res.shiftStart.length > 0)
    //       shiftStartValue = res.shiftStart[res.shiftStart.length - 1];
    //     if(res.shiftEnd.length > 0)
    //       shiftEndValue = res.shiftEnd[res.shiftEnd.length - 1];
    //     const checkHours= '7200';
    //     if(shiftStartValue == '')
    //       return { type: false, msg: 'Shift not found', data: '' };
    //     if(shiftEndValue == '')
    //       return { type: false, msg: 'Shift not found', data: '' };
        
    //     if((parseInt(shiftStartValue)+parseInt(checkHours)) < parseInt(clockInTimeStamp))
    //       return { type: false, msg: 'Checkin is not allowed before two hours of Shift start', data: '' };
    //     if((parseInt(shiftStartValue)-parseInt(checkHours)) > parseInt(clockInTimeStamp))
    //       return { type: false, msg: 'CheckIn is not allowed after two hours of Shift start', data: '' };
    //   }
    // }
    return null;
    // check today checkin end
  } catch (err) {
    console.log(err);
    return false;
  }
};
exports.checkInService = async (tenantDbConnection, userDetails, dateValue, body, decodedjwt) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    const date = dateValue;
    let clockInTimeStamp = body.clockInTime;
    const totalDuration = '00:00';
    // check today checkin start
    let res = await attendenceModel.findOne({
      userId: userDetails.user_id,
      date: date,
    });
    if(res) {
      let shiftStartValue = '';
      let shiftEndValue = '';
      // if(decodedjwt.clientId == '1471') {
      //   if(res.shiftStart.length > 0)
      //     shiftStartValue = res.shiftStart[res.shiftStart.length - 1];
      //   if(res.shiftEnd.length > 0)
      //     shiftEndValue = res.shiftEnd[res.shiftEnd.length - 1];
      //   const checkHours= '7200';
      //   if(shiftStartValue == '')
      //     return { type: false, msg: 'Shift not found', data: '' };
      //   if(shiftEndValue == '')
      //     return { type: false, msg: 'Shift not found', data: '' };
        
      //   if((parseInt(shiftStartValue)+parseInt(checkHours)) < parseInt(clockInTimeStamp))
      //     return { type: false, msg: 'Checkin is not allowed before two hours of Shift start', data: '' };
      //   if((parseInt(shiftStartValue)-parseInt(checkHours)) > parseInt(clockInTimeStamp))
      //     return { type: false, msg: 'CheckIn is not allowed after two hours of Shift start', data: '' };
      // }
      if(res.shiftStart.length > 0)
        shiftStartValue = res.shiftStart[res.shiftStart.length - 1];
      if(res.shiftEnd.length > 0)
        shiftEndValue = res.shiftEnd[res.shiftEnd.length - 1];
      if(shiftStartValue !== '' && shiftEndValue !=='') {
        if(moment.unix(shiftStartValue).format('YYYY-MM-DD') != moment.unix(shiftEndValue).format('YYYY-MM-DD')) {
          const prvDate = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
          const prvDateRes = await attendenceModel.findOne({
            userId: userDetails.user_id,
            date: prvDate,
          });
          if(prvDateRes) {
            let prvShiftEndValue = '';
            if(prvDateRes.shiftStart.length > 0)
              prvShiftEndValue = prvDateRes.shiftStart[prvDateRes.shiftStart.length - 1];

            if(prvShiftEndValue) {
              if(clockInTimeStamp < prvShiftEndValue)
                res = prvDateRes;
            }
          }
        }
      }
      console.log(res);
    }
    // check today checkin end
    // check last checkin
    const lastAttData = await attendenceModel.findOne({
      userId: userDetails.user_id,
      '$or': [
        { 'attendenceStatus': 'CLOCKIN' },
        { 'attendenceStatus': 'CLOCKOUT' },
        { 'attendenceStatus': 'AUTOCHECKOUT' }
      ],
      date: {$lte: date}
    }).sort({ date : -1 });
    if(lastAttData) {
      if(lastAttData.attendenceStatus == 'CLOCKIN')
        return { type: false, msg: 'You have Already Checked in', data: '' };
    }
    // check last checkin end
    if (!res) {
      const autoCalculateValue = commonMethods.autoCalculateStatus('', '', clockInTimeStamp, '', '');
      const insertData = {
        deptId: userDetails.user_dept_id,
        locationId: userDetails.location_id,
        userId: userDetails.user_id,
        date: date,
        attendenceStatus: 'CLOCKIN',
        userStatus: [autoCalculateValue.subStatus],
        primaryStatus: autoCalculateValue.superStatus,
        attendenceDetails: [{ actionByTimeStamp: moment(), clockIn: clockInTimeStamp, clockOut: '', deviceNameClockIn: body.deviceName, deviceNumberClockIn: body.deviceNumber, deviceLocationClockIn: body.deviceLocation, deviceLocationIdClockIn: body.locationId }],
      };
      await attendenceModel(insertData).save();
      clockInTimeStamp = moment.unix(clockInTimeStamp).format('hh:mm a');

      if(decodedjwt.clientId == prozoClienId)
        await insertAttData(tenantDbConnection,userDetails.user_id,userDetails.emp_code,'',moment.unix(body.clockInTime).format('YYYY-MM-DD HH:mm:ss'),body.deviceName,body.deviceNumber,0,0,body.deviceLocation);
      return { type: true, msg: 'You have successfully Checked In', data: {userDetails, clockInTimeStamp, totalDuration} };
    }
    if (res.attendenceStatus == 'CLOCKIN')
      return { type: false, msg: 'You have Already Checked in', data: '' };

    if (res.attendenceStatus == 'CLOCKOUT' || res.attendenceStatus == 'N/A') {
      const attendenceDetails = res.attendenceDetails;
      attendenceDetails.push({ actionByTimeStamp: moment(),clockIn: clockInTimeStamp, clockOut: '', deviceNameClockIn: body.deviceName, deviceNumberClockIn: body.deviceNumber, deviceLocationClockIn: body.deviceLocation, deviceLocationIdClockIn: body.locationId });
      
      
      const autoCalculateValue = commonMethods.autoCalculateStatus(res.shiftStart[res.shiftStart.length -1], res.shiftEnd[res.shiftEnd.length -1], attendenceDetails[0]['clockIn'], '', '');
      const userStatus = res.userStatus;
      userStatus.push(autoCalculateValue.subStatus);
        
      // if(res.shiftStart && res.shiftStart.length > 0)
      // {
      //   const diffTime = getTimeDiff(res.shiftStart[res.shiftStart.length -1], clockInTimeStamp, 'minutes');
      //   if(diffTime <= 15  && diffTime >= -15)
      //     userStatus.push('ONTIME');
          
      //   if(diffTime > 15)
      //     userStatus.push('LATECHECKIN');
      // }
      
      await attendenceModel.findOneAndUpdate(
        { _id: res._id },
        { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKIN', userStatus: userStatus, primaryStatus: autoCalculateValue.superStatus }
      );
      clockInTimeStamp = moment.unix(clockInTimeStamp).format('hh:mm a');
      if (res.attendenceStatus == 'CLOCKOUT')
        clockInTimeStamp = moment.unix(res.attendenceDetails[0].clockIn).format('hh:mm a');
        
      if(decodedjwt.clientId == prozoClienId)
        await insertAttData(tenantDbConnection,userDetails.user_id,userDetails.emp_code,'',moment.unix(body.clockInTime).format('YYYY-MM-DD HH:mm:ss'),body.deviceName,body.deviceNumber,0,0,body.deviceLocation);
      return { type: true, msg: 'You have successfully Checked In', data: {userDetails, clockInTimeStamp, totalDuration} };
    }
  } catch (err) {
    console.log(err);
    return false;
  }
};

exports.checkOutService = async (tenantDbConnection, userDetails, date, body, decodedjwt) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    let clockInTimeStamp = moment().unix();
    let clockOutTimeStamp = body.clockOutTime;
    let res = null;
    let totalDuration = '00:00';
    // check last checkin
    const lastAttData = await attendenceModel.findOne({
      userId: userDetails.user_id,
      '$or': [
        { 'attendenceStatus': 'CLOCKIN' },
        { 'attendenceStatus': 'CLOCKOUT' },
        { 'attendenceStatus': 'AUTOCHECKOUT' }
      ],
      date: {$lte: date}
    }).sort({ date : -1 });
    if(lastAttData) {
      if(lastAttData.attendenceStatus == 'CLOCKIN') {
        res = lastAttData;
      }
    }
    // check last checkin end
    if(!res) {
      res = await attendenceModel.findOne({
        userId: userDetails.user_id,
        date: date,
      });
    }
    if (!res)
      return { type: false, msg: 'Its Seems you are not check in today so please checkin first', data: '' };
    if (res.attendenceStatus == 'CLOCKOUT' || res.attendenceStatus == 'N/A' || res.attendenceStatus == 'AUTOCHECKOUT')
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
      attendenceDetails[objIndex].deviceLocationIdClockOut = body.locationId;
      attendenceDetails = attendenceDetails.reverse();
      const diff = moment.unix(clockOutTimeStamp).startOf('minutes').diff(moment.unix(res.attendenceDetails[0].clockIn).startOf('minutes'), 'minutes');
      totalDuration = Math.floor(diff / 60) + 'hrs ' + diff % 60+ 'min' ;
      clockInTimeStamp = moment.unix(res.attendenceDetails[0].clockIn).format('hh:mm a');
      clockOutTimeStamp = moment.unix(clockOutTimeStamp).format('hh:mm a');

      const autoCalculateValue = commonMethods.autoCalculateStatus(res.shiftStart[res.shiftStart.length -1], res.shiftEnd[res.shiftEnd.length -1], attendenceDetails[0].clockIn, clockOutTimeStamp, '');

      const userStatus = res.userStatus;
      userStatus.push(autoCalculateValue.subStatus);

      await attendenceModel.findOneAndUpdate(
        { _id: res._id },
        { actionByTimeStamp: moment(), attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKOUT', userStatus : userStatus, primaryStatus: autoCalculateValue.superStatus }
      );

      if(decodedjwt.clientId == prozoClienId)
        await insertAttData(tenantDbConnection,userDetails.user_id,userDetails.emp_code,'',moment.unix(body.clockOutTime).format('YYYY-MM-DD HH:mm:ss'),body.deviceName,body.deviceNumber,1,0,body.deviceLocation);
      return { 
        type: true, msg: 'You have successfully Checked Out', data: {userDetails, clockInTimeStamp, clockOutTimeStamp, totalDuration} 
      };
    }
  } catch (err) {
    console.log(err);
    return false;
  }
};


exports.getCheckInTimeByUser = async (tenantDbConnection, userDetails, date) => {
  try {
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    //let clockInTimeStamp = moment().unix();
    const clockOutTimeStamp = moment().unix();
    let totalDuration = '00:00';
    let res = null;
    // check last checkin
    const lastAttData = await attendenceModel.findOne({
      userId: userDetails.user_id,
      '$or': [
        { 'attendenceStatus': 'CLOCKIN' },
        { 'attendenceStatus': 'CLOCKOUT' }
      ],
      date: {$lte: date}
    }).sort({ date : -1 });
    if(lastAttData) {
      if(lastAttData.attendenceStatus == 'CLOCKIN') {
        res = lastAttData;
      }
    }
    // check last checkin end
    if(!res) {
      res = await attendenceModel.findOne({
        userId: userDetails.user_id,
        date: date,
      });
    }
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
    return false;
  }
};

const getTimeDiff = (start, end, type) => {
  if (start && end && start != '' && end != '')
    return moment.unix(end).startOf(type).diff(moment.unix(start).startOf(type), type);
  return 0;
};

const insertAttData = async (tenantDbConnection,user_id,emp_code,card_number,checkInOut,deviceName,deviceNumber,logStatus,logIndex,location) => {
  const sqlConfig = require('../db/sqlDB');
  const sql = require('mssql');
  try {
    const sqlconn = await sql.connect(sqlConfig);
    const util = require('util');
    const query = util.promisify(sqlconn.query).bind(sqlconn);
    const device_name = deviceName.slice(0,9);
    const device_number = deviceNumber.slice(0,9);
    await query(`INSERT INTO attendance_data (user_id, emp_code, card_number, checkInOut, deviceName, deviceNumber, logStatus, logIndex,location) VALUES ('${user_id}', '${emp_code}', '${card_number}', '${checkInOut}', '${device_name}', '${device_number}', '${logStatus}', '${logIndex}', '${location}')`);
    console.log(checkInOut);
  } catch (err) {
    console.log(err);
    const logsModel = await tenantDbConnection.model('logs');
    const insertData = {
      user_id: user_id,
      emp_code: emp_code,
      card_number: card_number,
      checkInOut: checkInOut,
      deviceName: deviceName,
      deviceNumber :deviceNumber,
      logStatus: logStatus,
      logIndex: logIndex,
      location: location,
    };
    await logsModel(insertData).save();
  }
};

exports.validateFaceData = async (tenantDbConnection) => {
  try {
    const facematchdatas = await tenantDbConnection.model('facematchdatas');
    const res = await facematchdatas.findOne();
    if (!res)
      return { type: false, data: res };

    return { type: true, data: res };
  } catch (err) {
    return { type: false, data: {} };
  }
};