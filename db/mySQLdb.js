const mysql = require('mysql');
const dbConfig = require('../config/db.config');

const mysqlDbConfig = {
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  multipleStatements: true,
};

const connection = mysql.createPool(mysqlDbConfig);
connection.on('connection', (dbConnection) => {
  console.log('Successfully connected to mysql database');

  dbConnection.on('error', (err) => {
    console.error(new Date(), 'MySQL error', err.code);
  });
  dbConnection.on('close', (err) => {
    console.error(new Date(), 'MySQL close', err);
  });
});

// let connection;
// function handleDisconnect() {
//   connection = mysql.createConnection(mysqlDbConfig); // Recreate the connection, since
//   // the old one cannot be reused.
//   connection.connect(function(err) {              // The server is either down
//     if(err) {                                     // or restarting (takes a while sometimes).
//       console.log('error when connecting to db:', err);
//       setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
//     }
//     console.log('Successfully connected to the mysql database.');
//   });
  
//   connection.on('error', function(err) {
//     console.log('db error', err);
//     if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
//       handleDisconnect();                        
//     } else {
//       throw err;                                  
//     }
//   });
// }
// handleDisconnect();

module.exports = connection;
