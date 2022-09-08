const express = require('express');
const connectionResolver = require('../db/connectionResolver');
const attendenceMobileController = require('../controller/attendenceMobileController');

const { userImageUp } = require('../common/methods/multerMethods');

/*-----------------Routes Init----------------*/
const v1Routes = express.Router();
v1Routes.use('/admin', connectionResolver.setAdminDb);
v1Routes.use('/client', connectionResolver.resolveTenant);
/*-----------------Routes Section----------------*/
v1Routes.post('/client/v1/api/check-in', userImageUp, attendenceMobileController.checkIn);
v1Routes.post('/client/v1/api/check-out', userImageUp, attendenceMobileController.checkOut);

/*------------------------------*/
module.exports = v1Routes;