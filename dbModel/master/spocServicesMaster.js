const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const spocServicesMaster = new Schema({
  serviceName: { type: String, required: true },
  serviceStatus: { type: String, enum: ['1', '2'], default: '1' },
  serviceSort: { type: Number, default: 1 },
  serviceOptions: [{ type: String, required: true }],
  clientsIds: [{ type: Schema.Types.ObjectId, required: true, ref: 'client_master_datas'}]
},{
  timestamps: true
});

spocServicesMaster.index({ serviceId: 1 });

module.exports = mongoose.model('spoc_master_services', spocServicesMaster);