const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
//const fs = require('fs');

/*------------------*/
const userImage = multer.diskStorage({
  destination: (req, file, callback) => {
    const path = './uploads/temp_files/';
    callback(null, path);
  },
  filename: (req, file, callback) => {
    //const dir = './uploads/temp_files';
    // if (!fs.existsSync(dir)){
    //   fs.mkdirSync(dir, { recursive: true });
    // }
    if (!file.originalname.toLowerCase().match(/\.(png|jpeg|jpg)$/)) {
      const err = new Error();
      err.code = 'filetype';
      return callback(err);
    } else {
      callback(null, crypto.randomBytes(8).toString('hex') + Date.now() + path.extname(file.originalname).toLowerCase());
    }
  }
});
const userImageUp = multer({ storage: userImage, limits: { fileSize: 10000000 } }).single('image_file');

const userFile = multer.diskStorage({
  destination: (req, file, callback) => {
    const path = './uploads/temp_files/';
    callback(null, path);
  },
  filename: (req, file, callback) => {
    if (!file.originalname.toLowerCase().match(/\.(xls|xlsx)$/)) {
      const err = new Error();
      err.code = 'filetype';
      return callback(err);
    } else {
      callback(null, crypto.randomBytes(8).toString('hex') + Date.now() + path.extname(file.originalname).toLowerCase());
    }
  }
});
const userFileUp = multer({ storage: userFile, limits: { fileSize: 10000000 } }).single('doc_file');

/*------------------*/
const userPdf = multer.diskStorage({
  destination: (req, file, callback) => {
    const path = './uploads/temp_files/';
    callback(null, path);
  },
  filename: (req, file, callback) => {
    if (!file.originalname.toLowerCase().match(/\.(pdf|PDF)$/)) {
      const err = new Error();
      err.code = 'filetype';
      return callback(err);
    } else {
      callback(null, crypto.randomBytes(8).toString('hex') + Date.now() + path.extname(file.originalname).toLowerCase());
    }
  }
});
const userPdfUp = multer({ storage: userPdf, limits: { fileSize: 10000000 } }).single('pdf_file');
  

/*------------------*/
const excelFilex = multer.diskStorage({
  destination: (req, file, callback) => {
    const path = './uploads/temp_files/';
    callback(null, path);
  },
  filename: (req, file, callback) => {
    if (!file.originalname.toLowerCase().match(/\.(xlsx|xlsm|xls|csv)$/)) {
      const err = new Error();
      err.code = 'filetype';
      return callback(err);
    } else {
      callback(null, crypto.randomBytes(8).toString('hex') + Date.now() + path.extname(file.originalname).toLowerCase());
    }
  }
});
const excelFilexUp = multer({ storage: excelFilex, limits: { fileSize: 10000000 } }).single('excel_file');
const multerPromise = (req, res) => {
  return new Promise((resolve, reject) => {
    excelFilexUp(req, res, (err) => {
      if(!err) resolve();
      reject(err);
    });
  });
};
const uploadExcelFile = async (req, res, next) => {
  try {
    await multerPromise(req, res);
    next();
  } catch(e) {
    next(e);
  }
};


const multerErrorHandler = (err, req, res, next) => {
  if (err) {
    if(err.code === 'LIMIT_FILE_SIZE'){
      return res.status(400).json({ statusText: 'FAIL',  message: 'File is too large', description: err });
    } else if(err.code === 'filetype'){
      return res.status(400).json({ statusText: 'FAIL',  message: 'Invalid file Type', description: err });
    } else {
      return res.status(400).json({ statusText: 'FAIL',  message: 'Unable to upload file', description: err });
    }
  } else {
    next();
  }
};
/*
*-----------------------------------------------------------------
*/
module.exports = {
  userImageUp,
  userFileUp,
  userPdfUp,
  uploadExcelFile,
  multerErrorHandler
};