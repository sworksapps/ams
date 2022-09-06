const express = require('express');
const connectionResolver = require('../db/connectionResolver');
const attendenceController = require('../controller/attendenceController');

/*-----------------Routes Init----------------*/
const v1Routes = express.Router();
v1Routes.use('/admin', connectionResolver.setAdminDb);
v1Routes.use('/client', connectionResolver.resolveTenant);
/*-----------------Routes Section----------------*/
v1Routes.post('/client/v1/attendence/add-shift', attendenceController.addShift);

/*------------------------------*/
module.exports = v1Routes;