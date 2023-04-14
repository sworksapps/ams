/* eslint-disable max-len */
const Joi = require('joi');
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const AWS = require('aws-sdk');
const { Rekognition} = require('aws-sdk');
AWS.config.loadFromPath('./config.json');
const rekognition = new Rekognition({
  region: process.env.REGION,
});
// const {
//   RekognitionClient,
//   SearchFacesByImageCommand,
//   DetectFacesCommand
// } = require('@aws-sdk/client-rekognition');

// const client = new RekognitionClient({
//   accessKeyId: process.env.AWSKEYID,
//   secretAccessKey: process.env.AWSSECRETACCESSKEY,
//   region: process.env.REGION,
// });

const awsMethods = require('../common/methods/awsMethods');
const dataValidation = require('../common/methods/dataValidation');
const { getConnection, getAdminConnection, getConnectionByTenant } = require('../connectionManager');
const attendenceMobileService = require('../service/attendenceMobileService');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  let dist =
  Math.sin(radlat1) * Math.sin(radlat2) +
  Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;
  dist = dist * 1.609344; // km
  dist = dist * 1000; // m
  return dist.toFixed(2);
};

const range = 400;
/*
 *----------------Routes Section------------
 */
exports.checkIn = async (req, res) => {
  try {
    const schema = Joi.object({
      locationId: Joi.number().required().label('locationId'),
      latitude: Joi.number().required().label('latitude'),
      longitude: Joi.number().required().label('longitude'),
    });

    const result = schema.validate(req.body);
    if (result.error)
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: result.error.details[0].message,
      });

    if (!req.headers['authorization'])
      return res.status(403).json({ statusText: 'FAIL', statusValue: 403, message: `Please provide auth Token` });
    
    const decodedHeader = dataValidation.parseJwt(req.headers['authorization']);
    
    const dbConnection = getConnectionByTenant(decodedHeader.clientDbName);
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

    const decodedjwt = dataValidation.parseJwt(req.headers['authorization']);

    // const totaldistance = calculateDistance(decodedjwt.clientLat, decodedjwt.clientLong, req.body.latitude, req.body.longitude);
    
    // if(totaldistance > range)
    //   return res.status(200).json({
    //     statusText: 'FAIL',
    //     statusValue: 400,
    //     message: `User outside of geofencing area`,
    //   });

    if (!req.file)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'User Image not provided',
      });

    const fileArr = req.file.filename.split('.');
    const fileName = fileArr[0];
    const fileExt = fileArr[1];

    const dir = './uploads/temp_files';
    const newFileName = `${fileName}.${fileExt}`;
    const newPathName = `${dir}/${fileName}.${fileExt}`;

    const fileUpRes = await awsMethods.uploadFileToBucket(
      newPathName,
      newFileName,
      req.file.mimetype
    );

    if (fs.existsSync(`${dir}/${req.file.filename}`)) {
      fs.unlinkSync(`${dir}/${req.file.filename}`);
    }

    if (fileUpRes.success == false)
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: fileUpRes.message,
      });

    const configRes = await attendenceMobileService.configData(dbConnection);
    if (configRes.type == false) return res.status(200).json({ 
      statusText: 'FAIL',
      statusValue: 400,
      message: 'Configurations not found..' 
    });

    let validateFaceData = await validateFace(dbConnection, fileUpRes.imgName, decodedjwt, 'No');
    if(validateFaceData.status == false)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: validateFaceData.message,
        data: validateFaceData.data
      });

    let userDetails = validateFaceData.data;

    if(configRes.data.isUserTwin.length > 0) {
      if(configRes.data.isUserTwin.indexOf(parseInt(userDetails.user_id)) !== -1) {
        console.log('Twin fun called');
        validateFaceData = await validateFace(dbConnection, fileUpRes.imgName, decodedjwt, 'Yes');
        if(validateFaceData.status == false)
          return res.status(200).json({
            statusText: 'FAIL',
            statusValue: 400,
            message: validateFaceData.message,
            data: validateFaceData.data
          });
        userDetails = validateFaceData.data;
      } 
    }

    if(userDetails.is_active != 1 || userDetails.isSpocApproved != 1)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'It seams you are not authorised to checkin, Please contact to your company Admin.',
      });
  
    if(decodedjwt.clientId == '2137' && userDetails.emp_code == '')
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `Employee code is required. Please contact your Company's SPOC`,
      });


    if(userDetails.company_id != decodedjwt.clientId)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `User doesn't map to this company.`,
      });
      
    if(userDetails.isGlobalCheckInOut != 1)
      if(userDetails.location_id != req.body.locationId)
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `User doesn't map in this location.`,
        });

    const clockInTime = moment().unix();
    const clockInTimeString  = moment.unix(clockInTime).format('hh:mm a');

    const response = await attendenceMobileService.preCheckInService(dbConnection, userDetails, moment().format('YYYY-MM-DD'), req.body, decodedjwt);
      
    if(response && response.type == false){
      return res.status(203).json({ 
        statusText: 'Success', statusValue: 203, message: 'Shift not found', data: {
          userDetails, clockInTime, clockInTimeString
        }
      });
    }
     
    
    return res.status(200).json({ 
      statusText: 'Success', statusValue: 200, message: 'Proceed to Check-in.', data: {
        userDetails, clockInTime, clockInTimeString
      }
    });
  } catch (err) {
    console.log(err);
    if(err.Code == 'InvalidParameterException'){
      res.status(400).json({statusText: 'FAIL', statusValue: 400, message: 'No face detected. Please stand in the front of the camera.'});
    } else {
      res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'ServeR Eror 400'});
    }
  }
};

exports.checkOut = async (req, res) => {
  try {
    const schema = Joi.object({
      locationId: Joi.number().required().label('locationId'),
      latitude: Joi.number().required().label('latitude'),
      longitude: Joi.number().required().label('longitude'),
    });

    const result = schema.validate(req.body);
    if (result.error)
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: result.error.details[0].message,
      });

    if (!req.headers['authorization'])
      return res.status(403).json({ statusText: 'FAIL', statusValue: 403, message: `Please provide auth Token` });
    
    const decodedHeader = dataValidation.parseJwt(req.headers['authorization']);
    
    const dbConnection = getConnectionByTenant(decodedHeader.clientDbName);
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

    
    const decodedjwt = dataValidation.parseJwt(req.headers['authorization']);

    // const totaldistance = calculateDistance(decodedjwt.clientLat, decodedjwt.clientLong, req.body.latitude, req.body.longitude);

    // if(totaldistance > range)
    //   return res.status(200).json({
    //     statusText: 'FAIL',
    //     statusValue: 400,
    //     message: `User outside of geofencing.`,
    //   });

    if (!req.file)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'User Image not provided',
      });

    const fileArr = req.file.filename.split('.');
    const fileName = fileArr[0];
    const fileExt = fileArr[1];

    const dir = './uploads/temp_files';
    const newFileName = `${fileName}.${fileExt}`;
    const newPathName = `${dir}/${fileName}.${fileExt}`;

    const fileUpRes = await awsMethods.uploadFileToBucket(
      newPathName,
      newFileName,
      req.file.mimetype
    );

    if (fs.existsSync(`${dir}/${req.file.filename}`)) {
      fs.unlinkSync(`${dir}/${req.file.filename}`);
    }

    if (fileUpRes.success == false)
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: fileUpRes.message,
      });

    const configRes = await attendenceMobileService.configData(dbConnection);
    if (configRes.type == false) return res.status(200).json({ 
      statusText: 'FAIL',
      statusValue: 400,
      message: 'Configurations not found..' 
    });
  
    let validateFaceData = await validateFace(dbConnection, fileUpRes.imgName, decodedjwt, 'No');
    if(validateFaceData.status == false)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: validateFaceData.message,
        data: validateFaceData.data
      });
  
    let userDetails = validateFaceData.data;

    if(configRes.data.isUserTwin.length > 0) {
      if(configRes.data.isUserTwin.indexOf(parseInt(userDetails.user_id)) !== -1) {
        console.log('Twin fun called');
        validateFaceData = await validateFace(dbConnection, fileUpRes.imgName, decodedjwt, 'Yes');
        if(validateFaceData.status == false)
          return res.status(200).json({
            statusText: 'FAIL',
            statusValue: 400,
            message: validateFaceData.message,
            data: validateFaceData.data
          });
        userDetails = validateFaceData.data;
      } 
    }

    if(userDetails.is_active != 1 || userDetails.isSpocApproved != 1)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'It seams you are not authorised to checkout, Please contact to your company Admin.',
      });

    if(decodedjwt.clientId == '2137' && userDetails.emp_code == '')
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `Employee code is required. Please contact your Company's SPOC`,
      });

    if(userDetails.company_id != decodedjwt.clientId)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `User doesn't map to this company.`,
      });

    if(userDetails.isGlobalCheckInOut != 1)
      if(userDetails.location_id != req.body.locationId)
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `User doesn't map in this location.`,
        });
      
    const userTimeData = await attendenceMobileService.getCheckInTimeByUser(dbConnection, userDetails, moment().format('YYYY-MM-DD'));
    if(userTimeData.type == true){
      res.status(200).json({ 
        statusText: 'Success', statusValue: 200, message: userTimeData.msg, data: userTimeData.data
      });
    } else if(userTimeData.type == false){
      res.status(200).json({ statusText: 'FAIL', statusValue: 400, message: userTimeData.msg });
    }else{
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: `ServeR Eror 400` });
    }
    // return res.status(200).json({ 
    //   statusText: 'Success', statusValue: 200, message: 'Proceed to Check-out.', data: userTimeData
    // });
  }  catch (err) {
    if(err.Code == 'InvalidParameterException'){
      res.status(400).json({statusText: 'FAIL', statusValue: 400, message: 'No face detected. Please stand in the front of the camera.'});
    } else {
      res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'ServeR Eror 400'});
    }
  }
};

/*
*---------------------------------------------
*/
exports.checkInSubmit = async (req, res) => {
  try {
    const schema = Joi.object({
      locationId: Joi.number().required().label('locationId'),
      latitude: Joi.number().required().label('latitude'),
      longitude: Joi.number().required().label('longitude'),
      userFaceId: Joi.string().required().label('Face Id'),
      clockInTime: Joi.number().required().label('Clock In Time'),
      deviceName: Joi.string().required().label('Device Name'),
      deviceNumber: Joi.string().required().label('Device Number'),
      deviceLocation: Joi.string().required().label('Device Location'),
    });

    const result = schema.validate(req.body);
    if (result.error)
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: result.error.details[0].message,
      });

    if (!req.headers['authorization'])
      return res.status(403).json({ statusText: 'FAIL', statusValue: 403, message: `Please provide auth Token` });
      
    const decodedHeader = dataValidation.parseJwt(req.headers['authorization']);
      
    const dbConnection = getConnectionByTenant(decodedHeader.clientDbName);
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

    const configRes = await attendenceMobileService.configData(dbConnection);
    if (configRes.type == false) return res.status(200).json({ 
      statusText: 'FAIL',
      statusValue: 400,
      message: 'Configurations not found..' 
    });

    const decodedjwt = dataValidation.parseJwt(req.headers['authorization']);

    if(decodedjwt.clientId == '2137') {
      const amsDeviceDetails = await axios.post(
        `${process.env.CLIENTSPOC}api/v1/basic-data/get-ams-device-detail`,
        { userid: req.body.deviceNumber }
      );
      if (amsDeviceDetails.data.status != 'success')
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `Device is not registered with us. Please contact your Company's SPOC`
        });
      if (!amsDeviceDetails.data.data)
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `Device is not registered with us. Please contact your Company's SPOC`
        });

      if (amsDeviceDetails.data.data.is_whitelist == 0)
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `This device is not whitelisted. Please contact your Company's SPOC`
        });
    }

    // const totaldistance = calculateDistance(decodedjwt.clientLat, decodedjwt.clientLong, req.body.latitude, req.body.longitude);
      
    // if(totaldistance > range)
    //   return res.status(200).json({
    //     statusText: 'FAIL',
    //     statusValue: 400,
    //     message: `User outside of geofencing area`,
    //   });

    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/userRoles/getUserUsingFaceId`,
      { faceId: req.body.userFaceId, company_id: decodedjwt.clientId }
    );
  
    if (userData.data.status != 'success')
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `SPOC Internal Server Error. Please contact your Company's SPOC`
      });
  
    if (userData.data.data.result.length == 0)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `Face not matched, Please check with your admin or try again.`
      });
  
    const userDetails = userData.data.data.result[0];

    if(userDetails.is_active != 1 || userDetails.isSpocApproved != 1)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'It seams you are not authorised to checkin, Please contact to your company Admin.',
      });
  
    if(userDetails.company_id != decodedjwt.clientId)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `User doesn't map to this company.`,
      });
  
    if(userDetails.isGlobalCheckInOut != 1)
      if(userDetails.location_id != req.body.locationId)
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `User doesn't map in this location`,
        });

    // if(!userDetails.user_dept_id)
    //   return res.status(200).json({
    //     statusText: 'FAIL',
    //     statusValue: 400,
    //     message: `User doesn't have department`,
    //   });
    const response = await attendenceMobileService.checkInService(dbConnection, userDetails, moment().format('YYYY-MM-DD'), req.body, decodedjwt);
      
    if(response.type == true){
      res.status(200).json({ 
        statusText: 'Success', statusValue: 200, message: response.msg, data: response.data
      });
      if(configRes.data.isSms == true)
        if(userDetails.phone)
          await sendSMS(userDetails, '63970ce9daefe964214fced2', req.body.deviceLocation, '');

    } else if(response.type == false){
      res.status(200).json({ statusText: 'FAIL', statusValue: 400, message: response.msg });
    }else{
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: `ServeR Eror 400` });
    }
  }  catch (err) {
    console.log(err);
    res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'ServeR Eror 400'});
  }
};

/*
*---------------------------------------------
*/
exports.checkOutSubmit = async (req, res) => {
  try {
    const schema = Joi.object({
      locationId: Joi.number().required().label('locationId'),
      latitude: Joi.number().required().label('latitude'),
      longitude: Joi.number().required().label('longitude'),
      userFaceId: Joi.string().required().label('Face Id'),
      clockOutTime: Joi.number().required().label('Clock Out Time'),
      deviceName: Joi.string().required().label('Device Name'),
      deviceNumber: Joi.string().required().label('Device Number'),
      deviceLocation: Joi.string().required().label('Device Location'),
    });

    const result = schema.validate(req.body);
    if (result.error)
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: result.error.details[0].message,
      });

    if (!req.headers['authorization'])
      return res.status(403).json({ statusText: 'FAIL', statusValue: 403, message: `Please provide auth Token` });
      
    const decodedHeader = dataValidation.parseJwt(req.headers['authorization']);
      
    const dbConnection = getConnectionByTenant(decodedHeader.clientDbName);
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

    const configRes = await attendenceMobileService.configData(dbConnection);
    if (configRes.type == false) return res.status(200).json({ 
      statusText: 'FAIL',
      statusValue: 400,
      message: 'Configurations not found..' 
    });
    
    const decodedjwt = dataValidation.parseJwt(req.headers['authorization']);

    if(decodedjwt.clientId == '2137') {
      const amsDeviceDetails = await axios.post(
        `${process.env.CLIENTSPOC}api/v1/basic-data/get-ams-device-detail`,
        { userid: req.body.deviceNumber }
      );
      if (amsDeviceDetails.data.status != 'success')
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `Device is not registered with us. Please contact your Company's SPOC`
        });
      if (!amsDeviceDetails.data.data)
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `Device is not registered with us. Please contact your Company's SPOC`
        });

      if (amsDeviceDetails.data.data.is_whitelist == 0)
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `This device is not whitelisted. Please contact your Company's SPOC`
        });
    }

    // const totaldistance = calculateDistance(decodedjwt.clientLat, decodedjwt.clientLong, req.body.latitude, req.body.longitude);

    // if(totaldistance > range)
    //   return res.status(200).json({
    //     statusText: 'FAIL',
    //     statusValue: 400,
    //     message: `User outside of geofencing area`,
    //   });

    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/userRoles/getUserUsingFaceId`,
      { faceId: req.body.userFaceId, company_id: decodedjwt.clientId }
    );
  
    if (userData.data.status != 'success')
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `SPOC Internal Server Error. Please contact your Company's SPOC`
      });
  
    if (userData.data.data.result.length == 0)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `Face not matched, Please check with your admin or try again.`
      });
  
    const userDetails = userData.data.data.result[0];

    if(userDetails.is_active != 1 || userDetails.isSpocApproved != 1)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'It seams you are not authorised to checkout, Please contact to your company Admin.',
      });
  
    if(userDetails.company_id != decodedjwt.clientId)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `User doesn't map to this company.`,
      });
  
    if(userDetails.isGlobalCheckInOut != 1)
      if(userDetails.location_id != req.body.locationId)
        return res.status(200).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: `User doesn't map in this location.`,
        });
      
    const response = await attendenceMobileService.checkOutService(dbConnection, userDetails, moment().format('YYYY-MM-DD'), req.body,decodedjwt);
      
    if(response.type == true){
      res.status(200).json({ 
        statusText: 'Success', statusValue: 200, message: response.msg, data: response.data
      });
      if(configRes.data.isSms == true)
        if(userDetails.phone)
          await sendSMS(userDetails, '63970e99fdd6e9478704c314', req.body.deviceLocation, response.data.totalDuration);

    } else if(response.type == false){
      res.status(202).json({ statusText: 'FAIL', statusValue: 400, message: response.msg });
    }else{
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: `ServeR Eror 400` });
    }
  }  catch (err) {
    res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'ServeR Eror 400'});
  }
};
/*
 *----------------Routes Section------------
 */
exports.createJwtToken = async (req, res) => {
  try {
    const schema = Joi.object({
      bussinessId: Joi.string().allow('').required().label('bussinessId'),
      clientId: Joi.string().required().label('clientId'),
      deviceId: Joi.string().allow('').optional().label('deviceId'),
      deviceName: Joi.string().allow('').optional().label('deviceName'),
    });
    const result = schema.validate(req.body);
    if (result.error)
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: result.error.details[0].message,
      });

    const adminDbConnection = getAdminConnection();
    if (!adminDbConnection) return res.status(400).json({ message: 'The provided admin is not available' });

    const response = await attendenceMobileService.createJwtToken(adminDbConnection, req.body);
      
    if(response.type == true){
      let locationIdValue = '';
      let latValue = '';
      let longValue = '';
      let address = '';
      let device_id = '';
      let device_name = '';
      if(req.body.bussinessId != '') {
        const bussinessData = await axios.get(`${process.env.CLIENTSPOC}api/v1/basic-data/get-business-detail?business_id=${req.body.bussinessId}&device_id=${req.body.deviceId}&device_name=${req.body.deviceName}&company_id=${req.body.clientId}`);
        
        if (bussinessData.data.status != 'success')
          return res.status(200).json({
            statusText: 'FAIL',
            statusValue: 400,
            message: `Latitude and Longitude not found`,
          });
      
        if (!dataValidation.isLatitude(bussinessData.data.data.lat) || bussinessData.data.data.lat == null)
          return res.status(200).json({
            statusText: 'FAIL',
            statusValue: 400,
            message: `Invalid Latitude`,
          });

        if (!dataValidation.isLongitude(bussinessData.data.data.lng) || bussinessData.data.data.lng == null)
          return res.status(200).json({
            statusText: 'FAIL',
            statusValue: 400,
            message: `Invalid Longitude`,
          });

        if (bussinessData.data.data.location_id == 0)
          return res.status(200).json({
            statusText: 'FAIL',
            statusValue: 400,
            message: `Invalid location Id`,
          });

        locationIdValue = bussinessData.data.data.location_id;
        latValue = bussinessData.data.data.lat;
        longValue = bussinessData.data.data.lng;
        address = bussinessData.data.data.address;
        device_id = bussinessData.data.deviceData.rec_id;
        device_name = bussinessData.data.deviceData.rec_id;
      }
      const attToken = jwt.sign({
        '_id': response.data._id,
        'clientName': response.data.clientName,
        'clientId': response.data.clientId,
        'clientLat': latValue,
        'clientLong': longValue,
        'clientDbName': response.data.clientDbName
      }, process.env.JWTToken, { expiresIn: 800000 });
      return res.status(200).json({ 
        statusText: 'Success', statusValue: 200, message: 'Attendance token', data: {attToken, locationId: locationIdValue, address, device_id, device_name }
      });
    } else if(response.type == false){
      return res.status(202).json({ statusText: 'FAIL', statusValue: 400, message: response.msg });
    }else{
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: `ServeR Eror 400` });
    }

  } catch (err) {
    console.log(err);
    if(err.Code == 'InvalidParameterException'){
      res.status(400).json({statusText: 'FAIL', statusValue: 400, message: 'There are no faces in the image. Should be at least 1'});
    } else {
      res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'ServeR Eror 400'});
    }
  }
};

const validateFace = async (dbConnection, faceImg, decodedjwt, checkStatus) => {
  try {
    const params = {
      Image: {
        S3Object: {
          Bucket: process.env.BUCKETNAME,
          Name: faceImg,
        },
      },
      Attributes: ['ALL'],
    };
    // const command = new DetectFacesCommand(params);
    // const faceData = await client.send(command);
    const faceData = await getDetectFace(params);
    if (faceData.FaceDetails.length == 0)
      return {status: false, message: 'Face not found.'};
    const userFaceId = faceData.FaceDetails[0];

    const response = await attendenceMobileService.validateFaceData(dbConnection);
    if(response.type == false)
      return {status: false, message: 'Face config not found..'};

    const validateFaceValue = response.data;

    if(userFaceId.BoundingBox.Height <  validateFaceValue.Height)
      return {status: false, message: 'Please stand closer to the camera.'};

    if(userFaceId.BoundingBox.Width <  validateFaceValue.Width)
      return {status: false, message: 'Please stand closer to the camera.'};

    if(userFaceId.Quality.Brightness <  validateFaceValue.Brightness)
      return {status: false, message: 'Please make sure that your face is well light and the camera is stable.'};

    if(userFaceId.Quality.Sharpness <  validateFaceValue.Sharpness)
      return {status: false, message: 'Please make sure that your face is well light and the camera is stable.'};

    if(userFaceId.Pose.Pitch <  validateFaceValue.PitchMin)
      return {status: false, message: 'Please look straight into the camera. Looks like you are looking down.'};
      
    if(userFaceId.Pose.Pitch >  validateFaceValue.PitchMax)
      return {status: false, message: 'Please look straight into the camera. Looks like you are looking up.'};

    if(userFaceId.Pose.Yaw <  validateFaceValue.YawMin)
      return {status: false, message: 'Please look straight into the camera. Looks like you are looking towards right.'};
      
    if(userFaceId.Pose.Yaw >  validateFaceValue.YawMax)
      return {status: false, message: 'Please look straight into the camera. Looks like you are looking towards left.'};

    if(userFaceId.EyesOpen.Value !=  validateFaceValue.EyesOpen)
      return {status: false, message: 'Face not captured properly. It seems your eyes were closed.'};

    // if(userFaceId.Eyeglasses.Value !=  validateFaceValue.Eyeglasses)
    //   return {status: false, message: 'It seems like you are wearing glasses. Please remove them and capture again.'};

    // if(userFaceId.Sunglasses.Value !=  validateFaceValue.Sunglasses)
    //   return {status: false, message: 'It seems like you are wearing glasses. Please remove them and capture again.'};

    if(userFaceId.MouthOpen.Value !=  validateFaceValue.MouthOpen)
      return {status: false, message: 'Face not captured properly, It seems like your mouth was open.'};

    let thresholdValue = validateFaceValue.FaceMatchThreshold;
    if(checkStatus == 'Yes')
      thresholdValue = validateFaceValue.MaxFaceMatchThreshold;
    const paramsOne = {
      CollectionId: process.env.COLLECTIONID,
      FaceMatchThreshold: thresholdValue,
      Image: {
        S3Object: {
          Bucket: process.env.BUCKETNAME,
          Name: faceImg,
        },
      },
      MaxFaces: validateFaceValue.MaxFaces,
    };
    // const commandOne = new SearchFacesByImageCommand(paramsOne);
  
    // const faceDataOne = await client.send(commandOne);
    const faceDataOne = await getSearchFacesByImage(paramsOne);

    if (faceDataOne.FaceMatches.length == 0)
      return {status: false, message: `Face not matched, Please check with your admin or try again.`};
    
    const faceArray = [];
    for (let i = 0; i < faceDataOne.FaceMatches.length; i++) {
      const element = faceDataOne.FaceMatches[i];
      faceArray.push(element.Face.FaceId);
    } 
    const faceString = faceArray.toString();
    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/userRoles/getUserUsingFaceId`,
      { faceId: faceString, company_id: decodedjwt.clientId }
    ); 
    if (userData.data.status != 'success')
      return {status: false, message: `SPOC Internal Server Error. Please contact your Company's SPOC`};

    if (userData.data.data.result.length == 0)
      return {status: false, message: `Face not matched, Please check with your admin or try again.`};


    return {status: true, message: 'Face Data.', data: userData.data.data.result[0] };
  } catch (err) {
    console.log(err);
    if(err.Code == 'InvalidParameterException'){
      return {status: false, message: 'Face not found..'};
    } else {
      return {status: false, message: 'ServeR Eror 400'} ;
    }
  }
};

const sendSMS = async (userDetails, temp_id, deviceLocation, totalDuration) => {
  try {
    if(!userDetails.phone || userDetails.phone == null || userDetails.phone == undefined || userDetails.phone == '')
      return false;
    let reqData = {
      'flow_id': temp_id,
      'mobiles': userDetails.phone,
      'empN': userDetails.fname,
      'attD': moment().format('YYYY-MM-DD'),
      'time': moment().format('hh:mm a'),
      'loc': deviceLocation.substr(0, 20)
    };
    if(totalDuration) {
      reqData = {
        'flow_id': temp_id,
        'mobiles': userDetails.phone,
        'empN': userDetails.fname,
        'attD': moment().format('YYYY-MM-DD'),
        'time': moment().format('hh:mm a'),
        'loc': deviceLocation.substr(0, 20),
        'dura': totalDuration
      };
    }
    const res = await axios.post(
      'https://api.msg91.com/api/v5/flow/',
      reqData,
      {
        headers: { 
          'authKey': '377287AwtcY6HngH2T62887a11P1', 
          'Content-Type': 'application/json', 
          'Cookie': 'PHPSESSID=ncrkakovnnqjcs9sp6bqmd2vr4'
        }
      }
    );
    console.log(res);
    console.log(deviceLocation);
    return true;
  } catch (error) {
    return false;
  }
};

const getDetectFace = (params) => {

  return new Promise((resolve, reject) => {
  
    rekognition.detectFaces(params, function(err, data) {
      if (err) reject (err);
      else     resolve(data);
    });
  
  });

};

const getSearchFacesByImage = (params) => {

  return new Promise((resolve, reject) => {
  
    rekognition.searchFacesByImage(params, function(err, data) {
      if (err) reject (err);
      else     resolve(data);
    });
  
  });

};