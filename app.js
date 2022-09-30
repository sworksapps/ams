require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const cron = require('node-cron');

const { connectAllDb, getConnectionByTenant } = require('./connectionManager');

/*
 *-----------------------Includes Routes----------------
 */

const attendenceRoutes = require('./routes/attendenceRoutes');
const attendenceMobileRoutes = require('./routes/attendenceMobileRoutes');


/*
 *--------------------Middleware Section-----------------
 */
const app = express();
app.use(cors());
app.enable('trust proxy');
app.use(helmet());
app.use(cors());
app.use(mongoSanitize());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
connectAllDb();

/*------------------------*/
app.get('/', async (req, res) => {
  try {
  // throw new Error('dvcgdscd');
    res.status(200).json({ statusText: 'OK', statusValue: 200, message: 'Message From index 😊'});
  } catch (err) {
    console.log(err);
  }
});

/*-----------------------------*/

app.use('/', attendenceRoutes);
app.use('/', attendenceMobileRoutes);

// Cron for prozo log
cron.schedule('0 0 */3 * * *', async () => {
  const connection = getConnectionByTenant(process.env.prozoDBName);
  if (!connection) return console.log('Cron Stop Due to connection loss.');

  const logsModel = await connection.model('logs');
  const logData = await logsModel.find();
  if(logData.length > 0) {
    const sqlConfig = require('./db/sqlDB');
    const sql = require('mssql');
    logData.forEach( async element => {try {
      const sqlconn = await sql.connect(sqlConfig);
      const util = require('util');
      const query = util.promisify(sqlconn.query).bind(sqlconn);
      const device_name = element.deviceName.slice(0,9);
      const device_number = element.deviceNumber.slice(0,9);
      // eslint-disable-next-line max-len
      const insertData = await query(`INSERT INTO attendance_data (user_id, emp_code, card_number, checkInOut, deviceName, deviceNumber, logStatus, logIndex,location) VALUES ('${element.user_id}', '${element.emp_code}', '${element.card_number}', '${element.checkInOut}', '${device_name}', '${device_number}', '${element.logStatus}', '${element.logIndex}', '${element.location}')`);
      if(insertData.rowsAffected.length > 0) {
        await logsModel.findByIdAndRemove(element._id);
      }
    } catch (err) {
      console.log(err);
    }
    });
  }
  console.log('running at every 3 hours');
});

/*-----------------------------*/
app.use((req, res, next) => {
  const error = new Error('Not found');
  error.status = 404;
  next(error);
});
app.use((error, req, res, next) => {
  res.status(error.status || 500).send({
    error: {
      status: error.status || 500,
      message: error.message || 'Internal Server Error',
    },
  });
});
process.on('unhandledRejection', error => {
  console.log('unhandledRejection', error.message);
});
process.on('uncaughtException', error => {
  console.log('uncaughtException', error.message);
});
/*----------------------------*/
const port = 9000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
