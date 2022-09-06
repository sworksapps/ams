/* eslint-disable max-len */
const Joi = require('joi');
const { getConnection } = require('../connectionManager');
const attendenceService = require('../service/attendenceService');
/*
*----------------Routes Section------------
*/
exports.addShift = async (req, res) => {
  try {
    const schema = Joi.array().items({
      deptId: Joi.string().required().label('Department Id'),
      userId: Joi.string().required().label('User Id'),
      locationId: Joi.string().required().label('Location Id'),
      attendenceDetails: Joi.array().items({
        shiftStart: Joi.string().required().label('Shift Start'),
        shiftEnd: Joi.string().required().label('Shift End'),
        date: Joi.string().required().label('Date')
      })
    });

    const result = schema.validate(req.body);
    if (result.error)
      return res.status(400).json({ statusText: 'FAIL', statusValue: 400, message: result.error.details[0].message });

    const dbConnection = getConnection();
    console.log(dbConnection);
    if (!dbConnection) return res.status(400).json({ message: 'The provided Client is not available' });

    const resData = await attendenceService.insertShiftData(dbConnection, req.body);

    if (resData)
      res.status(200).json({ statusText: 'Success', statusValue: 200, message: 'Data Saved Successfully' });
    else
      res.status(202).json({ statusText: 'Failed', statusValue: 202, message: 'Unable to Save Data' });
  } catch (err) {
    console.log(err);
    res.status(500);
  }
};