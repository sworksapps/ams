const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const clientOption = {
  socketTimeoutMS: 30000,
  keepAlive: true,
  poolSize: 1,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
};

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', () => {
  console.log('Mongoose default connection open');
});

// If the connection throws an error
mongoose.connection.on('error', err => {
  console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log(
      'Mongoose default connection disconnected through app termination'
    );
    process.exit(0);
  });
});
let i = 1;

const initTenantDbConnection = (DB_URL) => {
  try {
    const db = mongoose.createConnection(DB_URL, clientOption);

    db.on(
      'error',
      console.error.bind(
        console,
        'initTenantDbConnection MongoDB Connection Error>> : '
      )
    );
    db.once('open', () => {
      console.log('initTenantDbConnection client MongoDB Connection ok-->', i++);
    });

    // require all schemas
    // require('../dbModel/clients/basic/buildingModel');
    // require('../dbModel/clients/basic/cityModel');
    // require('../dbModel/clients/basic/countryModel');
    // require('../dbModel/clients/basic/floorModel');
    // require('../dbModel/clients/basic/stateModel');
    // require('../dbModel/clients/department/departmentModel');
    // require('../dbModel/clients/member/allUserModel');
    // require('../dbModel/clients/role/spocRolesModel');
    // require('../dbModel/clients/seats/shiftModel');
    // require('../dbModel/clients/member/userActivityModel');
    // require('../dbModel/clients/seats/floorPlanModel');
    // require('../dbModel/clients/seats/seatBookingModel');
    // require('../dbModel/clients/seats/rosterMasterModel');
    // require('../dbModel/clients/invoice/invoiceItemModel');
    // require('../dbModel/clients/invoice/invoiceModel');
    // require('../dbModel/clients/documents/kycDocsModel');
    // require('../dbModel/clients/documents/legalDocsModel');
    // require('../dbModel/clients/basic/clientProfileModel');

    return db;
  } catch (error) {
    console.log('initTenantDbConnection error', error);
  }
};

module.exports = {
  initTenantDbConnection
};
