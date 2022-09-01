const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const spocRolesModel = new Schema({
  roleName: { type: String, required: true },
  roleServices: [{ 
    serviceName: { type: String, required: true },
    roleForRead: { type: String, enum: ['1', '2'], required: true },
    roleForWrite: { type: String, enum: ['1', '2'], required: true },
    serviceStatus: { type: String, enum: ['1', '2'], default: '1' },
  }],
  roleStatus: { type: String, enum: ['1', '2'], default: '1' },
  roleAddedBy: { type: Schema.Types.ObjectId, ref: 'all_users_by_clients', required: true },
  roleAddedByName: { type: String, required: true },
},{
  timestamps: true
});

spocRolesModel.index({ roleId: 1 });

module.exports = mongoose.model('spoc_roles_by_clients', spocRolesModel);