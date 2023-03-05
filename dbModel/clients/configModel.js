const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const configSchema = async (dbconn) => {
  const configModel = new Schema({
    isSms: { type: Boolean, default: false, required: true },
    isUserId: { type: Boolean, default: false, required: true },
    isUserTwin: [{ type: String, default: '' }]
  }, {
    timestamps: true
  });
  dbconn.model('configurations', configModel);
};

module.exports = {
  configSchema
};