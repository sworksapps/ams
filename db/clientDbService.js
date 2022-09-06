const getAllTenants = async (adminDbConnection) => {
  try {
    const ClientTable = await adminDbConnection.model('client_master_datas');
    const tenants = await ClientTable.find({ clientStatus: 1 });
    return tenants;
  } catch (error) {
    console.log('getAllTenants error', error);
    throw error;
  }
};

module.exports = { getAllTenants };