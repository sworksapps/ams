// const sql = require('mssql');

const sqlConfig = {
  user: process.env.sqlUser,
  password: process.env.sqlpassword,
  database: process.env.sqldb,
  server: process.env.sqlHost,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: false, // for azure
    trustServerCertificate: true // change to true for local dev / self-signed certs
  }
};

// const connection = new sql.ConnectionPool(sqlConfig);
// connection.connect().then(function() {
//   console.log('Sql Connection');
// }).catch(function(err) {
//   console.error('SQL Error connection pool', err);
// });

module.exports = sqlConfig;