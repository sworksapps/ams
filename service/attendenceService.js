
// const mongoose = require('mongoose');
/*
*------------User Service------------
*/
exports.insertShiftData = async (tenantDbConnection, bodyData) => {
  try{
    const attendenceModel = await tenantDbConnection.model('attendences_data');
    for (const iterator of bodyData) {
      await new attendenceModel(iterator).save();
    }
    return true;
  } catch (err){
    return false;
  }
};