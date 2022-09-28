const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const logSchema = async (dbconn) => {
  const logModel = new Schema({
    user_id: { type: String, required: true },
    card_number: { type: String, default: '' },
    emp_code: { type: String, default: '' },
    checkInOut: { type: String, default: '' },
    deviceNumber: { type: String, default: '' },
    deviceName: { type: String, default: '' },
    location: { type: String, default: '' },
    logStatus: { type: Number, default: 0 },
    logIndex: { type: Number, default: 0 },
  }, {
    timestamps: true
  });
  logModel.index({ deptId: 1 });
  dbconn.model('logs', logModel);
};

module.exports = {
  logSchema
};