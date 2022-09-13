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

    const { pgno, row, sort_by, filter, date } = req.query;

    let search = '';
    let dateChk = false;

    if (req.query.search) {
      search = req.query.search.trim();
      dateChk = moment(search, 'DD/MM/YYYY', true).isValid();
    }

    if (date) {
      search = date.trim();
      const isValid = moment(search, 'YYYY-MM-DD', true).isValid();
      if (!isValid)
        return res.status(400).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: 'Please give Date in YYYY-MM-DD format',
        });
    }

    if (!dataValidation.isNumber(pgno) || !dataValidation.isNumber(row))
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'Provide valid Page and Limit',
      });

    const limit = Math.abs(row) || 10;
    const page = (Math.abs(pgno) || 1) - 1;

    const dataRes = await attendenceService.fetchDailyReportData(dbConnection, limit, page, sort_by, search, filter, dateChk, date);
    if (dataRes)
      return res.status(200).json({ statusText: 'OK', statusValue: 200, data: dataRes.resData, total: dataRes.total });
    else
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: 'No Data Found' });
  } catch (err) {
    res.status(500).json({ statusText: 'ERROR', statusValue: 500, message: 'Unable to Process your Request' });
  }
};

/*----------------Get user specific Report------------*/
exports.userReport = async (req, res) => {
  try {
    const dbConnection = getConnection();
    if (!dbConnection) {
      return res.status(400)
        .json({ statusText: 'FAIL', statusValue: 400, message: 'The provided Client is not available' });
    }

    const { pgno, row, sort_by, filter, userId, startDate, endDate } = req.query;

    let search = '';
    let dateChk = false;

    if (req.query.search) {
      search = req.query.search.trim();
      dateChk = moment(search, 'DD/MM/YYYY', true).isValid();
    }

    if (!userId && !dataValidation.isNumber(userId))
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'Please provide valid User Id',
      });

    if (startDate && endDate) {
      const st = startDate.trim();
      const end = endDate.trim();
      let isValid = moment(st, 'YYYY-MM-DD', true).isValid();
      isValid = moment(end, 'YYYY-MM-DD', true).isValid();
      if (!isValid)
        return res.status(400).json({
          statusText: 'FAIL',
          statusValue: 400,
          message: 'Please give valid start date and end date in YYYY-MM-DD format',
        });
    }
    else
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'Please give start date and end date in YYYY-MM-DD format',
      });

    if (!dataValidation.isNumber(pgno) || !dataValidation.isNumber(row))
      return res.status(400).json({
        statusText: 'FAIL',
        statusValue: 400,
        message: 'Provide valid Page and Limit',
      });

    const limit = Math.abs(row) || 10;
    const page = (Math.abs(pgno) || 1) - 1;

    const dataRes = await attendenceService.fetchUserSpecReportData(dbConnection, limit, page, sort_by, search, filter, dateChk, userId, startDate, endDate);
    if (dataRes)
      return res.status(200).json({ statusText: 'OK', statusValue: 200, data: dataRes.resData, total: dataRes.total });
    else
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: 'No Data Found' });
  } catch (err) {
    res.status(500).json({ statusText: 'ERROR', statusValue: 500, message: 'Unable to Process your Request' });
  }
};

/*----------------Get user shift data------------*/
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

    if (response.type == true) {
      res.status(200).json({
        statusText: 'Success', statusValue: 200, message: response.msg, refData: response.refData
      });
    } else if (response.type == false) {
      res.status(202).json({ statusText: 'Failed', statusValue: 202, message: response.msg });
    } else {
      return res.status(400).json({ statusText: 'Failed', statusValue: 400, message: `Went Something Wrong.` });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ statusText: 'ERROR', statusValue: 500, message: 'Unable to Process your Request' });
  }
};

/*----------------Get Report by date------------*/
exports.getReportByDate = async (req, res) => {
  try {
    const dbConnection = getConnection();
    if (!dbConnection) {
      return res.status(400)
        .json({ statusText: 'FAIL', statusValue: 400, message: 'The provided Client is not available' });
    }

    const { startDate, endDate } = req.query;

    const startDateChk = moment(startDate, 'YYYY-MM-DD', true).isValid();
    const endDateChk = moment(endDate, 'YYYY-MM-DD', true).isValid();

    if (startDateChk == false && endDateChk == false)
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: 'Please give Date in YYYY-MM-DD format' });

    const dataRes = await attendenceService.fetchReportDataByDate(dbConnection, startDateChk, endDateChk);
    console.log(dataRes);
    // if (date) {
    //   search = date.trim();
    //   const isValid = moment(search, 'YYYY-MM-DD', true).isValid();
    //   if(!isValid)
    //     return res.status(400).json({
    //       statusText: 'FAIL',
    //       statusValue: 400,
    //       message: 'Please give Date in YYYY-MM-DD format',
    //     });
    // }

    // if (!dataValidation.isNumber(pgno) || !dataValidation.isNumber(row))
    //   return res.status(400).json({
    //     statusText: 'FAIL',
    //     statusValue: 400,
    //     message: 'Provide valid Page and Limit',
    //   });

    // const limit = Math.abs(row) || 10;
    // const page = (Math.abs(pgno) || 1) - 1;

    // const dataRes = await attendenceService.fetchDailyReportData(dbConnection, limit, page, sort_by, search, filter, dateChk, date);
    // if (dataRes)
    //   return res.status(200).json({ statusText: 'OK', statusValue: 200, data: dataRes.resData, total: dataRes.total });
    // else
    //   return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: 'No Data Found' });
    return res.send('hello');
  } catch (err) {
    res.status(500).json({ statusText: 'ERROR', statusValue: 500, message: 'Unable to Process your Request' });
  }
};

/*----------------Change user status------------*/
exports.changeUserStatus = async (req, res) => {
  try {
    const schema = Joi.object({
      id: Joi.string().required().length(24).label('Id'),
      status: Joi.string().required().valid('PRESENT', 'ABSENT', 'HALFDAY', 'ONLEAVE').label('Status')
    });

    const result = schema.validate(req.body);
    if (result.error)
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: 'Provide valid Status or Id' });

    const dbConnection = getConnection();
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

    const response = await attendenceService.changeUserStatus(dbConnection, req.body);

    if (response)
      res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Status Updated Successfully' });
    else
      return res.status(400).json({ statusText: 'Failed', statusValue: 400, message: `Unable to change Status` });
  } catch (err) {
    console.log(err);
    res.status(500).json({ statusText: 'ERROR', statusValue: 500, message: 'Unable to Process your Request' });
  }
};