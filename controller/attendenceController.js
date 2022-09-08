/* eslint-disable max-len */
const Joi = require('joi');
const { getConnection } = require('../connectionManager');
const attendenceService = require('../service/attendenceService');
const dataValidation = require('../common/methods/dataValidation');
const moment = require('moment');

/*
*----------------Routes Section------------
*/

/*----------------Add Shift Details------------*/
exports.addShift = async (req, res) => {
  try {
    const schema = Joi.array().items({
      deptId: Joi.string().required().label('Department Id'),
      userId: Joi.string().required().label('User Id'),
      locationId: Joi.string().required().label('Location Id'),
      shiftStart: Joi.string().required().allow('').label('Shift Start'),
      shiftEnd: Joi.string().required().allow('').label('Shift End'),
      date: Joi.string().required().label('Date')
    });
    
    const result = schema.validate(req.body);
    if (result.error)
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: result.error.details[0].message });

    const dbConnection = getConnection();
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

    const resData = await attendenceService.insertShiftData(dbConnection, req.body);

    if (resData)
      res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Saved Successfully' });
    else
      res.status(202).json({ statusText: 'Failed', statusValue: 202, message: 'Unable to Save Data' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ statusText: 'ERROR', statusValue: 500, message: 'Unable to Process your Request' });
  }
};

/*----------------Get daily Report------------*/
exports.dailyReport = async (req, res) => {
  try {
    const dbConnection = getConnection();
    if (!dbConnection) {
      return res.status(400)
        .json({ statusText: 'FAIL', statusValue: 400, message: 'The provided Client is not available' });
    }

    const { pgno, row, sort_by, filter } = req.query;

    let search = '';
    let dateChk = false;

    if (req.query.search) {
      search = req.query.search.trim();
      dateChk = moment(search, 'DD/MM/YYYY', true).isValid();
    }

    if (!dataValidation.isNumber(pgno) || !dataValidation.isNumber(row))
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'Provide valid Page and Limit',
      });

    const limit = Math.abs(row) || 10;
    const page = (Math.abs(pgno) || 1) - 1;

    const dataRes = await attendenceService.fetchDailyReportData(dbConnection, limit, page, sort_by, search, filter, dateChk);
    if (dataRes)
      return res.status(200).json({ statusText: 'OK', statusValue: 200, data: dataRes.propertyData, total: dataRes.total });
    else
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: 'No Data Found' });
  } catch (err) {
    res.status(500).json({ statusText: 'ERROR', statusValue: 500, message: 'Unable to Process your Request' });
  }
};

exports.getUsersShiftData = async (req, res) => {
  try {
    const schema = Joi.object({
      users: Joi.array().required().label('users'),
    });
    const result = schema.validate(req.body);
    if (result.error)
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: result.error.details[0].message });

    const dbConnection = getConnection();
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

    const response = await attendenceService.getUsersShiftData(dbConnection, req.body, req.params.deptId, req.params.startDate, req.params.endDate);
    
    if(response.type == true){
      res.status(200).json({ 
        statusText: 'Success', statusValue: 200, message: response.msg, refData: response.refData
      });
    } else if(response.type == false){
      res.status(202).json({ statusText: 'Failed', statusValue: 202, message: response.msg });
    }else{
      return res.status(400).json({ statusText: 'Failed', statusValue: 400, message: `Went Something Wrong.` });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ statusText: 'ERROR', statusValue: 500, message: 'Unable to Process your Request' });
  }
};
