const express = require('express');

const connectionResolver = require('../db/connectionResolver');
const userController = require('../controller/userController');

const verifyTempJwt = require('../common/auth/verifyTempJwt');
/*
*-----------------Routes Init----------------
*/
const v1Routes = express.Router();
v1Routes.use('/admin', connectionResolver.setAdminDb);
v1Routes.use('/client', connectionResolver.resolveTenant);
/*
*-----------------Routes Section----------------
// */
// //Url Structure: http://localhost:9000/client/v1/user/login

// v1Routes.post('/client/v1/user/add-new', userController.addNewUser);
// // v1Routes.post('/client/v1/user/login', userController.userLogin);
// // v1Routes.get('/client/v1/user/get-profile', verifyUserJwt, userController.getUserProfile);
// /*
// *------------------------------
// */
module.exports = v1Routes;