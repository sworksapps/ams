const express = require('express');
const accessControlController = require('../controller/accessControlController');

/*-----------------Routes Init----------------*/
const v1Routes = express.Router();
/*-----------------Routes Section----------------*/
v1Routes.post('/access-control/v1/check-in-out', accessControlController.checkInOut);
/*------------------------------*/
module.exports = v1Routes;