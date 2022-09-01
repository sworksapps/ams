// /* eslint-disable max-len */
// const Joi = require('joi');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const config = require('config');
// const Excel = require('exceljs');
// const mongoose = require('mongoose');

// const { getConnection } = require('../connectionManager');
// const { sendEmail } = require('../utils/nodemailer');
// const userService = require('../service/userService');
// const dataValidation = require('../common/methods/dataValidation');
// const commonMethods = require('../common/methods/commonMethods');

// /*
// *----------------Routes Section------------
// */
// exports.userLogin = async (req, res) => {
//   try{
//     const schema = Joi.object({
//       email: Joi.string().email().max(100).required().label('Email'),
//       //user_password: Joi.string().max(100).required().label('Password')
//     });

//     const result = schema.validate(req.body);
//     if(result.error) 
//       return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: result.error.details[0].message });
    
//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     const resData = await userService.getLoginUser(dbConnection,req.body);

//     if(resData){
//       sendEmail(resData, 'passcode');
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'User Found',data:resData.userPassword });
//     }
//     else{
//       res.status(202).json({ statusText: 'Failed', statusValue: 202, message: 'User Not Found' });
//     }

//   } catch (err){
//     console.log(err);
//   }
// };

// exports.otpValidate = async (req, res) => {
//   try{

//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });
    
//     const schema = Joi.object({
//       email: Joi.string().email().max(100).required().label('Email'),
//       password: Joi.string().max(6).required().label('Password')
//     });
    
//     const result = schema.validate(req.body);
//     if(result.error){
//       const acData = 'Login-Failed';
//       const userId = new mongoose.mongo.ObjectID();
//       commonMethods.createUserActivity(dbConnection,userId,'Login',acData,req.body);
//       return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: result.error.details[0].message });
//     }
    
//     const resData = await userService.validateOtp(dbConnection,req.body);
    
//     if(resData){
//       const dbname = req.decoded.did;
//       const token = await jwt.sign({ userEmail:resData.userEmail,userFullName:resData.userFirstName+' '+resData.userLastName,uid:resData._id,userType:resData.userType,did:dbname }, config.get('jwtSecret.user'), { expiresIn: 2592000 });
      
//       resData.jwtToken = token;
//       const spocRolesModel = await dbConnection.model('spoc_roles_by_clients');
//       const roleData = await spocRolesModel.find({ _id: resData.userRoleId }).select({ _id: 0, roleServices: 1});
      
//       if(roleData.length > 0){
//         resData.roleservices = roleData[0]['roleServices'];
//       }else{
//         resData.roleservices = [];
//       }
//       let acData = 'Member-Login';
//       if(resData.userType==5)
//         acData = 'Admin-Login';
//       commonMethods.createUserActivity(dbConnection,resData._id,'Login',acData,req.body);
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Login Successfully',data:resData });
//     }
//     else{
//       const acData = 'Login-Failed';
//       const userId = new mongoose.mongo.ObjectID();
//       commonMethods.createUserActivity(dbConnection,userId,'Login',acData,req.body);
//       res.status(202).json({ statusText: 'Failed', statusValue: 202, message: 'Invalid Credentials' });
//     }
//   } catch (err){
//     console.log(err);
//   }
// };

// //------------------------------------------
// exports.getUserProfile = async (req, res) => {
//   try{
//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     const resData = await userService.getMemberProfile(dbConnection,req.body);
//     if(resData.userData){
//       resData.userData.deptDetails = resData.deptData;
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Found', data:resData.userData });
//     }
//     else{
//       res.status(202).json({ statusText: 'Failed', statusValue: 202, message: 'Data Not Found' });
//     }
//   } catch (err){
//     console.log(err);
//   }
// };

// //------------------------------------------
// exports.getProfileByJwt = async (req, res) => {
//   try{
//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     const uid = req.decoded.uid;
//     const resData = await userService.getMemberProfileJwt(dbConnection,uid);
//     if(resData){
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Found', data:resData });
//     }
//     else{
//       res.status(401).json({ statusText: 'Failed', statusValue: 401, message: 'User Not Found' });
//     }
//   } catch (err){
//     console.log(err);
//   }
// };

// exports.getAllMembers = async (req, res) => {
//   try{

//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     const resData = await userService.getClientsMembers(dbConnection,req.body);
//     if(resData){
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Found', data:resData });
//     }
//     else{
//       res.status(202).json({ statusText: 'Failed', statusValue: 202, message: 'Data Not Found' });
//     }
//   } catch (err){
//     console.log(err);
//   }
// };

// exports.getMembersKpi = async (req, res) => {
//   try{

//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     //const resData = await userService.getClientsMembersKpi(dbConnection,req.body);
//     const resData = await userService.getMembersKpi(dbConnection,req.body);
//     if(resData){
//       const vdata = {};
//       let active = 0;
//       let inactive = 0;
//       let spoc = 0;
//       let total = 0;
//       resData.forEach(function (item) {
//         total++;

//         if (item.userStatus == 1) active++;
//         if (item.userStatus == 2) inactive++;
//         if (item.userType == 1) spoc++;
//       });

//       vdata.active = active;
//       vdata.inactive = inactive;
//       vdata.spoc = spoc;
//       vdata.total = total;
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Found', data:vdata });
//     }
//     else{
//       res.status(202).json({ statusText: 'Failed', statusValue: 202, message: 'Data Not Found' });
//     }
//   } catch (err){
//     console.log(err);
//   }
// };

// exports.getAllCity = async (req, res) => {
//   try{

//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     const cityData = await userService.getClientsCity(dbConnection,req.body);
//     if(cityData){
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Found',data:cityData });
//     }else{
//       res.status(202).json({ statusText: 'Success', statusValue: 202, message: 'Data Not Found'});
//     }
//   } catch (err){
//     console.log(err);
//   }
// };

// exports.getAllRole = async (req, res) => {
//   try{

//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     const roleData = await userService.getClientsRole(dbConnection);
//     if(roleData){
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Found',data:roleData });
//     }else{
//       res.status(202).json({ statusText: 'Success', statusValue: 202, message: 'Data Not Found'});
//     }
//   } catch (err){
//     console.log(err);
//   }
// };

// exports.getAllDepartment = async (req, res) => {
//   try{

//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     const departData = await userService.getClientsDepartment(dbConnection);
//     if(departData){
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Found',data:departData });
//     }else{
//       res.status(202).json({ statusText: 'Success', statusValue: 202, message: 'Data Not Found'});
//     }
//   } catch (err){
//     console.log(err);
//   }
// };

// exports.getCityBuilding = async (req, res) => {
//   try{

//     const schema = Joi.object({
//       cityId: Joi.string().max(24).required().label('City ID')
//     });
    
//     const result = schema.validate(req.body);
//     if(result.error) 
//       return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: result.error.details[0].message });

//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     const buildData = await userService.getBuildingByCity(dbConnection,req.body);
//     if(buildData){
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Found',data:buildData });
//     }else{
//       res.status(202).json({ statusText: 'Success', statusValue: 202, message: 'Data Not Found'});
//     }
//   } catch (err){
//     console.log(err);
//   }
// };

// exports.getBuildingFloor = async (req, res) => {
//   try{

//     const schema = Joi.object({
//       buildingId: Joi.string().max(24).required().label('Building ID')
//     });
    
//     const result = schema.validate(req.body);
//     if(result.error) 
//       return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: result.error.details[0].message });

//     const dbConnection = getConnection();
//     if(!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

//     const floorData = await userService.getFloorByBuilding(dbConnection,req.body);
//     if(floorData){
//       res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Found',data:floorData });
//     }else{
//       res.status(202).json({ statusText: 'Success', statusValue: 202, message: 'Data Not Found'});
//     }
//   } catch (err){
//     console.log(err);
//   }
// };