const { getConnectionByTenant, getAdminConnection } = require('../connectionManager');
const moment = require('moment');

/*----------------Add Shift Details------------*/
exports.autoCheckoutAtMidnight = async (req, res) => {
  try {
    console.log('Auto Checkout At Midnight Cron task Executed');
    const adminConn = getAdminConnection();
    if (!adminConn){
      return {status: false, msg: 'The provided admin is not Available'};
    }
    let successFlag = false;
    const ClientTable = await adminConn.model('client_master_datas');
    const tenants = await ClientTable.find({ clientStatus: 1 }).select({ clientDbName: 1 });

    //const todayDate = moment().format('YYYY-MM-DD');
    const previousDate = moment().subtract(2, 'days').format('YYYY-MM-DD');

    for (const tenant of tenants) {
      const tenantDb = getConnectionByTenant(tenant.clientDbName);
      if (tenantDb) {
        successFlag = true;
        const attModel = await tenantDb.model('attendences_data');

        const update = {
          $set: { attendenceStatus: 'AUTOCHECKOUT', primaryStatus: 'PRESENT' },
          $push: { userStatus: 'SP' }
        };
        await attModel.updateMany( { date: previousDate, attendenceStatus: 'CLOCKIN' }, update );
      }
    }
    return { status: successFlag, msg: 'Cron task done' };
  } catch (err) {
    console.log(err);
    res.status(500).json({ statusText: 'ERROR', statusValue: 500, message: 'Unable to Process your Request' });
  }
};