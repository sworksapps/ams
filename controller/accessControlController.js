/* eslint-disable max-len */
// const moment = require('moment');

// const awsMethods = require('../common/methods/awsMethods');
// const dataValidation = require('../common/methods/dataValidation');
const Joi = require('joi');
const { getAdminConnection, getConnectionByTenant } = require('../connectionManager');
// const accessControlService = require('../service/accessControlService');
const commonMethods = require('../common/methods/commonMethods');
const moment = require('moment');

/*
 *----------------Routes Section------------
 */
exports.checkInOut = async (req, res) => {
  try { 
    const schema = Joi.object({
      locationId: Joi.string().required().label('locationId'),
      deptId: Joi.string().required().label('deptId'),
      userId: Joi.string().required().label('userId'),
      companyId: Joi.string().required().label('companyId'),
      actionType: Joi.string().required().label('actionType'),
      InOutDate: Joi.string().required().label('InOutDate'),
      InOutTimeStamp: Joi.string().required().label('InOutTimeStamp'),
      deviceNumber: Joi.string().required().label('deviceNumber'),
      deviceName: Joi.string().required().label('deviceName')
    });

    const result = schema.validate(req.body);
    if (result.error)
      return res.status(200).json({
        satus: false,
        message: result.error.details[0].message,
      });
    
    const adminDbConnection = getAdminConnection(); 
    if (!adminDbConnection) 
      return res.status(200).json({ satus: false, message: 'The provided admin is not available' }); 
      
    const clientMasterDatas = await adminDbConnection.model('client_master_datas');
    const resClientMaster = await clientMasterDatas.findOne({
      clientId: req.body.companyId,
    });
    if (!resClientMaster)
      return res.status(200).json({ satus: false, message: 'You are not subscribed this service' });

    const dbConnection = getConnectionByTenant(resClientMaster.clientDbName);
    if (!dbConnection)
      return res.status(200).json({ satus: false, message: 'The provided Client is not available' });

    const attendenceModel = await dbConnection.model('attendences_data');
    const clockInTimeStamp = req.body.InOutTimeStamp;
    const CheckData = await attendenceModel.findOne({
      userId: req.body.userId,
      date: req.body.InOutDate,
    });
    if (!CheckData) {
      const autoCalculateValue = commonMethods.autoCalculateStatus('', '', clockInTimeStamp, '', '');
      const insertData = {
        deptId: req.body.deptId ? req.body.deptId : '0',
        locationId: req.body.locationId,
        userId: req.body.userId,
        date: req.body.InOutDate,
        attendenceStatus: 'CLOCKIN',
        userStatus: [autoCalculateValue.subStatus],
        primaryStatus: autoCalculateValue.superStatus,
        attendenceDetails: [{ actionByTimeStamp: moment(), clockIn: clockInTimeStamp, clockOut: '', deviceNameClockIn: req.body.deviceName, deviceNumberClockIn: req.body.deviceNumber, deviceLocationClockIn: req.body.locationId, deviceLocationIdClockIn: req.body.locationId, actionBy: 'USER' }],
      };
      await attendenceModel(insertData).save();
    } else if(req.body.actionType == 'In') {
      const attendenceDetails = CheckData.attendenceDetails;
      attendenceDetails.push({ actionByTimeStamp: moment(),clockIn: clockInTimeStamp, clockOut: '', deviceNameClockIn: req.body.deviceName, deviceNumberClockIn: req.body.deviceNumber, deviceLocationClockIn: req.body.locationId, deviceLocationIdClockIn: req.body.locationId, actionBy: 'USER' });
      
      const shiftStart = CheckData.shiftStart.length > 0 && CheckData.shiftStart[CheckData.shiftStart.length -1] ? CheckData.shiftStart[CheckData.shiftStart.length -1] : '';
      const shiftEnd = CheckData.shiftEnd.length > 0 && CheckData.shiftEnd[CheckData.shiftEnd.length -1] ? CheckData.shiftEnd[CheckData.shiftEnd.length -1] : '';
      
      const autoCalculateValue = commonMethods.autoCalculateStatus(shiftStart, shiftEnd, attendenceDetails[0]['clockIn'], '', '');
      const userStatus = CheckData.userStatus;
      userStatus.push(autoCalculateValue.subStatus);
      
      await attendenceModel.findOneAndUpdate(
        { _id: CheckData._id },
        { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKIN', userStatus: userStatus, primaryStatus: autoCalculateValue.superStatus, actionBy: 'USER' }
      );
    } else if(req.body.actionType == 'Out') {
      if (CheckData.attendenceStatus == 'CLOCKIN') {
        let attendenceDetails = CheckData.attendenceDetails;
        attendenceDetails = attendenceDetails.reverse();
  
        const objIndex = attendenceDetails.findIndex(
          (obj) => obj._id == attendenceDetails[0]['_id']
        );
        attendenceDetails[objIndex].actionByTimeStamp = moment();
        attendenceDetails[objIndex].clockOut = req.body.InOutTimeStamp;
        attendenceDetails[objIndex].deviceNameClockOut = req.body.deviceName;
        attendenceDetails[objIndex].deviceNumberClockOut = req.body.deviceNumber;
        attendenceDetails[objIndex].deviceLocationClockOut = req.body.locationId;
        attendenceDetails[objIndex].deviceLocationIdClockOut = req.body.locationId;
        attendenceDetails = attendenceDetails.reverse();
  
        const shiftStart = CheckData.shiftStart.length > 0 && CheckData.shiftStart[CheckData.shiftStart.length -1] ? CheckData.shiftStart[CheckData.shiftStart.length -1] : '';
        const shiftEnd = CheckData.shiftEnd.length > 0 && CheckData.shiftEnd[CheckData.shiftEnd.length -1] ? CheckData.shiftEnd[CheckData.shiftEnd.length -1] : '';
        const autoCalculateValue = commonMethods.autoCalculateStatus(shiftStart, shiftEnd, attendenceDetails[0].clockIn, req.body.InOutTimeStamp, '');
  
        const userStatus = CheckData.userStatus;
        userStatus.push(autoCalculateValue.subStatus);
  
        await attendenceModel.findOneAndUpdate(
          { _id: CheckData._id },
          { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKOUT', userStatus : userStatus, primaryStatus: autoCalculateValue.superStatus, actionBy: 'USER' }
        );
      } else if (CheckData.attendenceStatus == 'CLOCKOUT') {
        const attendenceDetails = CheckData.attendenceDetails;
        attendenceDetails.push({ actionByTimeStamp: moment(),clockIn: '', clockOut: req.body.InOutTimeStamp, deviceNameClockOut: req.body.deviceName, deviceNumberClockOut: req.body.deviceNumber, deviceLocationClockOut: req.body.locationId, deviceLocationIdClockOut: req.body.locationId, actionBy: 'USER'  });
  
        const shiftStart = CheckData.shiftStart.length > 0 && CheckData.shiftStart[CheckData.shiftStart.length -1] ? CheckData.shiftStart[CheckData.shiftStart.length -1] : '';
        const shiftEnd = CheckData.shiftEnd.length > 0 && CheckData.shiftEnd[CheckData.shiftEnd.length -1] ? CheckData.shiftEnd[CheckData.shiftEnd.length -1] : '';
        
        const autoCalculateValue = commonMethods.autoCalculateStatus(shiftStart, shiftEnd, attendenceDetails[0]['clockIn'], req.body.InOutTimeStamp, '');
        const userStatus = CheckData.userStatus;
        userStatus.push(autoCalculateValue.subStatus);
              
        await attendenceModel.findOneAndUpdate(
          { _id: CheckData._id },
          { attendenceDetails: attendenceDetails, attendenceStatus: 'CLOCKOUT', userStatus: userStatus, primaryStatus: autoCalculateValue.superStatus, actionBy: 'USER' }
        );
      }
    } 

    return res.status(200).json({ satus: true, message: 'Proceed to Check-in or Check-out' });
  } catch (err) {
    console.log('checkIn, err', err);
    return res.status(200).json({ satus: false, message: 'Something went wrong' });
  }
};
