require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

const { connectAllDb } = require('./connectionManager');

/*
 *-----------------------Includes Routes----------------
 */

const userRoutes = require('./routes/userRoutes');


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

app.use('/', userRoutes);

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
