/* eslint-disable max-len */
const Joi = require('joi');
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const {
  RekognitionClient,
  SearchFacesByImageCommand,
} = require('@aws-sdk/client-rekognition');

const client = new RekognitionClient({
  accessKeyId: process.env.AWSKEYID,
  secretAccessKey: process.env.AWSSECRETACCESSKEY,
  region: process.env.REGION,
});

const awsMethods = require('../common/methods/awsMethods');
const dataValidation = require('../common/methods/dataValidation');
const { getConnection, getAdminConnection } = require('../connectionManager');
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

    const params = {
      CollectionId: process.env.COLLECTIONID,
      FaceMatchThreshold: 95,
      Image: {
        S3Object: {
          Bucket: process.env.BUCKETNAME,
          Name: fileUpRes.imgName,
        },
      },
      MaxFaces: 1,
    };
    const command = new SearchFacesByImageCommand(params);

    const faceData = await client.send(command);

    if (faceData.FaceMatches.length == 0)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `It seems you're not registered with our face recognition. Please contact your Company's SPOC`,
      });

    const userFaceId = faceData.FaceMatches[0].Face.FaceId;

    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/userRoles/getUserUsingFaceId`,
      { faceId: userFaceId }
    );

    if (userData.data.status != 'success')
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `SPOC Internal Server Error. Please contact your Company's SPOC`,
      });

    if (userData.data.data.result.length == 0)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `It seems you're not registered with us. Please contact your Company's SPOC`,
      });

    const userDetails = userData.data.data.result[0];

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
    
    return res.status(200).json({ 
      statusText: 'Success', statusValue: 200, message: 'Proceed to Check-in.', data: {
        userDetails, clockInTime, clockInTimeString
      }
    });
  } catch (err) {
    if(err.Code == 'InvalidParameterException'){
      res.status(400).json({statusText: 'FAIL', statusValue: 400, message: 'No face detected. Please stand in the front of the camera.'});
    } else {
      res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'Somthing went erong'});
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

    const params = {
      CollectionId: process.env.COLLECTIONID,
      FaceMatchThreshold: 95,
      Image: {
        S3Object: {
          Bucket: process.env.BUCKETNAME,
          Name: fileUpRes.imgName,
        },
      },
      MaxFaces: 1,
    };
    const command = new SearchFacesByImageCommand(params);

    const faceData = await client.send(command);

    if (faceData.FaceMatches.length == 0)
      return res.status(200).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: `It seems you're not registered with our face recognition. Please contact your Company's SPOC`
      });

    const userFaceId = faceData.FaceMatches[0].Face.FaceId;

    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/userRoles/getUserUsingFaceId`,
      { faceId: userFaceId }
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
        message: `It seems you're not registered with us. Please contact your Company's SPOC`
      });

    const userDetails = userData.data.data.result[0];

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

    const dbConnection = getConnection();
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });
      
    const userTimeData = await attendenceMobileService.getCheckInTimeByUser(dbConnection, userDetails, moment().format('YYYY-MM-DD'));
    if(userTimeData.type == true){
      res.status(200).json({ 
        statusText: 'Success', statusValue: 200, message: userTimeData.msg, data: userTimeData.data
      });
    } else if(userTimeData.type == false){
      res.status(200).json({ statusText: 'FAIL', statusValue: 400, message: userTimeData.msg });
    }else{
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: `Went Something Wrong.` });
    }
    // return res.status(200).json({ 
    //   statusText: 'Success', statusValue: 200, message: 'Proceed to Check-out.', data: userTimeData
    // });
  }  catch (err) {
    if(err.Code == 'InvalidParameterException'){
      res.status(400).json({statusText: 'FAIL', statusValue: 400, message: 'No face detected. Please stand in the front of the camera.'});
    } else {
      res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'Somthing Went Wrong'});
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

    const decodedjwt = dataValidation.parseJwt(req.headers['authorization']);

    // const totaldistance = calculateDistance(decodedjwt.clientLat, decodedjwt.clientLong, req.body.latitude, req.body.longitude);
      
    // if(totaldistance > range)
    //   return res.status(200).json({
    //     statusText: 'FAIL',
    //     statusValue: 400,
    //     message: `User outside of geofencing area`,
    //   });

    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/userRoles/getUserUsingFaceId`,
      { faceId: req.body.userFaceId }
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
        message: `It seems you're not registered with us. Please contact your Company's SPOC`
      });
  
    const userDetails = userData.data.data.result[0];
  
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

    const dbConnection = getConnection();
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });
    const response = await attendenceMobileService.checkInService(dbConnection, userDetails, moment().format('YYYY-MM-DD'), req.body, decodedjwt);
      
    if(response.type == true){
      res.status(200).json({ 
        statusText: 'Success', statusValue: 200, message: response.msg, data: response.data
      });
    } else if(response.type == false){
      res.status(200).json({ statusText: 'FAIL', statusValue: 400, message: response.msg });
    }else{
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: `Went Something Wrong.` });
    }
  }  catch (err) {
    console.log(err);
    res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'Somthing went erong'});
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
    
    const decodedjwt = dataValidation.parseJwt(req.headers['authorization']);

    // const totaldistance = calculateDistance(decodedjwt.clientLat, decodedjwt.clientLong, req.body.latitude, req.body.longitude);

    // if(totaldistance > range)
    //   return res.status(200).json({
    //     statusText: 'FAIL',
    //     statusValue: 400,
    //     message: `User outside of geofencing area`,
    //   });

    const userData = await axios.post(
      `${process.env.CLIENTSPOC}api/v1/userRoles/getUserUsingFaceId`,
      { faceId: req.body.userFaceId }
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
        message: `It seems you're not registered with us. Please contact your Company's SPOC`
      });
  
    const userDetails = userData.data.data.result[0];
  
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
  
    const dbConnection = getConnection();
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });
      
    const response = await attendenceMobileService.checkOutService(dbConnection, userDetails, moment().format('YYYY-MM-DD'), req.body,decodedjwt);
      
    if(response.type == true){
      res.status(200).json({ 
        statusText: 'Success', statusValue: 200, message: response.msg, data: response.data
      });
    } else if(response.type == false){
      res.status(202).json({ statusText: 'FAIL', statusValue: 400, message: response.msg });
    }else{
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: `Went Something Wrong.` });
    }
  }  catch (err) {
    res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'Somthing went erong'});
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
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: `Went Something Wrong.` });
    }

  } catch (err) {
    console.log(err);
    if(err.Code == 'InvalidParameterException'){
      res.status(400).json({statusText: 'FAIL', statusValue: 400, message: 'There are no faces in the image. Should be at least 1'});
    } else {
      res.status(500).json({statusText: 'ERROR', statusValue: 500, message: 'Somthing went erong'});
    }
  }
};