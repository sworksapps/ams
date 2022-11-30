const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const { attendenceSchema } = require('../dbModel/clients/attendenceModel');
const { holidayListSchema } = require('../dbModel/clients/holidayListModel');
const { faceMatchSchema } = require('../dbModel/clients/faceMatchModel');
const { logSchema } = require('../dbModel/clients/logModel');

// const clientOption = {
//   socketTimeoutMS: 30000,
//   keepAlive: true,
//   poolSize: 1,
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   useFindAndModify: false,
//   useCreateIndex: true
// };

const newClientOption = {
  ssl: true,
  sslValidate: true,
  sslCA: `./db/rds-combined-ca-bundle.pem`,
  socketTimeoutMS: 30000,
  keepAlive: true,
  maxPoolSize: 10,
  retryWrites: false
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
    const db = mongoose.createConnection(DB_URL, newClientOption);
    console.log('connection Db ' + i++);

    // db.on(
    //   'error',
    //   console.error.bind(
    //     console,
    //     'initTenantDbConnection MongoDB Connection Error>> : '
    //   )
    // );
    // db.once('open', () => {
    //   console.log('initTenantDbConnection client MongoDB Connection ok-->', i++);
    // });

    // require all schemas
    attendenceSchema(db);
    holidayListSchema(db);
    faceMatchSchema(db);
    logSchema(db);

    return db;
  } catch (error) {
    console.log('initTenantDbConnection error', error);
  }
};

module.exports = {
  initTenantDbConnection
};
