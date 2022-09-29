const sql = require('mssql');

const sqlConfig = {
  user: 'admin',
  password: 'qLPrWak47yjdqN3c',
  database: 'prozo',
  server: '172.31.32.59',
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

const connection = new sql.ConnectionPool(sqlConfig);
connection.connect().then(function() {
  console.log('Sql Connection');
}).catch(function(err) {
  console.error('SQL Error connection pool', err);
});

module.exports = connection;