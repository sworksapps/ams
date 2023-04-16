const mysql = require('mysql');

// Create a connection to the database
const mysqlDbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  multipleStatements: true,
};

const connection = mysql.createPool(mysqlDbConfig);
connection.on('connection', (dbConnection) => {
  console.log('Successfully connected to smatwork database');

  dbConnection.on('error', (err) => {
    console.error(new Date(), 'MySQL error', err.code);
  });
  dbConnection.on('close', (err) => {
    console.error(new Date(), 'MySQL close', err);
  });
});

module.exports = connection;
