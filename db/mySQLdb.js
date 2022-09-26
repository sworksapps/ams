const mysql = require('mysql');

// Create a connection to the database
const mysqlDbConfig = {
  host: 'prozo-keka.cba5wuehk2rr.ap-southeast-1.rds.amazonaws.com',
  user: 'admin',
  password: 'nGpRzKRJ5cC4JufJ',
  database: 'prozo',
  multipleStatements: true,
};

// // open the MySQL connection
// connection.connect((error) => {
//   if (error) throw error;
//   console.log('Successfully connected to the database.');
// });

// Create the MySQL connection Pool and handle connection.
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

module.exports = connection;
