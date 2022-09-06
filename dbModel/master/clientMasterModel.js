const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clientMasterSchema = new Schema({
  clientName: { type: String, required: true },
  clientId : { type: String, unique: true, required: true },
  clientToken : { type: String, required: true },
  clientLat : { type: String, required: true },
  clientLong : { type: String, required: true },
  clientDbName: { type: String, trim: true, unique: true, required: true, },
  clientStatus: { type: String, enum: ['1', '2'], default: '1' },
},{
  timestamps: true
});

clientMasterSchema.index({ clientId: 1 });

module.exports = mongoose.model('client_master_datas', clientMasterSchema);