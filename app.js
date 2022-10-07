require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const cron = require('node-cron');
const moment = require('moment');
const axios = require('axios');

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

app.get('/dvcgdscd', async (req, res) => {
  try {
    const connection = getConnectionByTenant(process.env.prozoDBName);
    if (!connection) return console.log('Cron Stop Due to connection loss.');

    const attendencesDataModel = await connection.model('attendences_data');
    const attendencesData = await attendencesDataModel.find();
    if(attendencesData.length > 0) {
      attendencesData.forEach( async element => {
        const attendenceDetails = element.attendenceDetails;
        if(attendenceDetails.length > 0) {
          const userId = element.userId;
          attendenceDetails.forEach( async ele => {
            if(ele.clockIn) {
              await insertAttData(
                connection,userId,'','',
                moment.unix(ele.clockIn).format('YYYY-MM-DD HH:mm:ss'),ele.deviceNameClockIn,
                ele.deviceNumberClockIn,0,0,ele.deviceLocationClockIn
              );
            }
            if(ele.clockOut) {
              await insertAttData(
                connection,userId,'','',
                moment.unix(ele.clockOut).format('YYYY-MM-DD HH:mm:ss'),ele.deviceNameClockOut,
                ele.deviceNumberClockOut,0,0,ele.deviceLocationClockOut
              );
            }
          });
        }
      });
    }
    res.status(200).json({ statusText: 'OK', statusValue: 200, message: 'Data Processing', data: attendencesData.length});
  } catch (err) {
    console.log(err);
  }
});

app.get('/dvcgdscd/empcode', async (req, res) => {
  try {
    const sqlConfig = require('./db/sqlDB');
    const sql = require('mssql');
    const sqlconn = await sql.connect(sqlConfig);
    const util = require('util');
    const query = util.promisify(sqlconn.query).bind(sqlconn);
    const allData = await query(`SELECT * FROM attendance_data`);
    const recordset = allData.recordset;
    if(recordset.length > 0) {
      recordset.forEach( async element => {
        if(!element.emp_code) {
          const userData = await axios.post(
            `${process.env.CLIENTSPOC}api/v1/user/get-user-name`,
            { rec_id: [element.user_id], companyId: process.env.prozoClienId }
          );
          if(userData.data.status == 200) {
            const attendanceId = element.attendance_id;
            const empCode = userData.data.data[0]['emp_code'];
            if(empCode) {
              await query(`UPDATE attendance_data SET emp_code='${empCode}' WHERE attendance_id='${attendanceId}'`);
            }
          }
        }
      });
    }


    res.status(200).json({ statusText: 'OK', statusValue: 200, message: 'Data Processing', data: allData.recordset.length});
  } catch (err) {
    console.log(err);
  }
});

const insertAttData = async (
  tenantDbConnection,user_id,emp_code,card_number,checkInOut,deviceName,deviceNumber,logStatus,logIndex,location
) => {
  const sqlConfig = require('./db/sqlDB');
  const sql = require('mssql');
  try {
    const sqlconn = await sql.connect(sqlConfig);
    const util = require('util');
    const query = util.promisify(sqlconn.query).bind(sqlconn);
    let device_name = 0;
    if(deviceName) {
      device_name = deviceName;
      if(/^\d+$/.test(deviceName) === false)
        device_name = 0;
    }
    let device_number = 0;
    if(deviceNumber) {
      device_number = deviceNumber;
      if(/^\d+$/.test(deviceNumber) === false)
        device_number = 0;
    }
    const selectData = await query(`SELECT * FROM attendance_data WHERE user_id='${user_id}' AND checkInOut='${checkInOut}'`);
    if(selectData && selectData.rowsAffected[0] == 0) {
      await query(
        `INSERT INTO attendance_data 
        (user_id, emp_code, card_number, checkInOut, deviceName, deviceNumber, logStatus, logIndex,location) 
        VALUES 
        ('${user_id}', '${emp_code}', '${card_number}', '${checkInOut}', '${device_name}', '${device_number}', 
        '${logStatus}', '${logIndex}', '${location}')`);
    
      console.log(checkInOut);
    }
  } catch (err) {
    console.log(err);
    const logsModel = await tenantDbConnection.model('logs');
    const insertData = {
      user_id: user_id,
      emp_code: emp_code,
      card_number: card_number,
      checkInOut: checkInOut,
      deviceName: deviceName,
      deviceNumber :deviceNumber,
      logStatus: logStatus,
      logIndex: logIndex,
      location: location,
    };
    await logsModel(insertData).save();
  }
};

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
    logData.forEach( async element => {
      try {
        const sqlconn = await sql.connect(sqlConfig);
        const util = require('util');
        const query = util.promisify(sqlconn.query).bind(sqlconn);
        let device_name = 0;
        if(element.deviceName) {
          device_name = element.deviceName;
          if(/^\d+$/.test(element.deviceName) === false)
            device_name = 0;
        }
        let device_number = 0;
        if(element.deviceNumber) {
          device_number = element.deviceNumber;
          if(/^\d+$/.test(element.deviceNumber) === false)
            device_number = 0;
        }
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
