const fs = require('fs');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const crypto = require('crypto');
const path = require('path');
const { Buffer } = require('buffer');

AWS.config.update({
  accessKeyId: process.env.AWSKEYID,
  secretAccessKey: process.env.AWSSECRETACCESSKEY,
});
const s3bucket = new AWS.S3();

/*
*-----------------------S3 File Upload----------------------------
* image/gif: GIF image
* image/jpeg: JPEG JFIF image
* image/png: Portable Network Graphics
* image/svg+xml: SVG vector image
* image/tiff: Tag Image File Format
* image/vnd.microsoft.icon: ICO image
const dir = './uploads/temp_files';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}
*/

const uploadFileToBucket = async (filePath, fileName, mimeType) => {
  return new Promise((resolve) => {
    const params = {
      Bucket: process.env.BUCKETNAME,
      Key: `${fileName}`,
      ACL: 'public-read',
      ContentType: mimeType,
      Body: fs.readFileSync(filePath)
    };
    s3bucket.upload(params, (err,res) => {
      if (err) {
        return resolve({ success: false, message: err.message });
      } else {
        return resolve({ success: true, imgName: `${res.key}`, message: 'File Uploaded Successfully' });
      }
    });
  });
};


/*------------------*/
const deleteFileFromBucket = (filePath) => {
  return new Promise((resolve) => {
    const params = {
      Bucket: process.env.BUCKETNAME,
      Key: filePath
    };
    s3bucket.deleteObject(params, function(err) {
      if (err) {
        return resolve({ success: false, message: err.message });
      } else {
        return resolve({ success: true, message: 'File Removed Successfully' });
      }
    });
  });
};

/*------------------*/
const streamExcelToBucket = async (filePath, fileName, bucketFolder) => {
  return new Promise((resolve) => {
    const params = {
      Bucket: process.env.BUCKETNAME,
      Key: `${bucketFolder}/${fileName}`,
      ACL: 'public-read',
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      Body: filePath
    };
    s3bucket.upload(params, (err) => {
      if (err) {
        return resolve({ success: false, message: err.message });
      } else {
        return resolve({ success: true, fileUrl: `${bucketFolder}/${fileName}`, message: 'File Uploaded Successfully' });
      }
    });
  });
};


/*------------------*/
const getFileFromBucket = (filePath) => {
  return new Promise((resolve) => {
    const params = {
      Bucket: process.env.BUCKETNAME,
      Key: filePath
    };
    s3bucket.getObject(params, function(err, data) {
      if (err) {
        return resolve({ success: false, message: err.message });
      } else {
        let rawData = data.Body.toString('utf-8').replace(/\r\n/g,'\n').split('\n');
        rawData = rawData.filter(item => item);
        return resolve({ success: true, message: 'File found', 
          data: rawData });
      }
    });
  });
};


/*
*----------Multer S3----------
*/
function checkFileType(file, cb){
  const whitelist = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ];
  if (whitelist.includes(file.mimetype)) {
    cb(null,true);
  } else {
    cb('Error: Invalid file format provided');
  }
}
const uploadFileForSeat = multer({
  storage: multerS3({
    s3: s3bucket,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    bucket: `${process.env.BUCKETNAME}/seat_files`,
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      cb(null, crypto.randomBytes(8).toString('hex') + Date.now().toString() + path.extname(file.originalname));
    }
  }),
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
  }
}).single('seat_file');

const multerPromiseSeatFile = (req, res) => {
  return new Promise((resolve, reject) => {
    uploadFileForSeat(req, res, (err) => {
      if(!err) resolve();
      reject(err);
    });
  });
};
const uploadSeatFileMiddleware = async (req, res, next) => {
  try {
    await multerPromiseSeatFile(req, res);
    next();
  } catch(e) {
    next(e);
  }
};

/*----------------------*/
function getFileBufferFromS3(file, callback){
  const buffers = [];
  const stream = s3bucket.getObject({ Bucket: process.env.BUCKETNAME, Key: file}).createReadStream();
  stream.on('data', data => buffers.push(data));
  stream.on('end', () => callback(null, Buffer.concat(buffers)));
  stream.on('error', error => callback(error));
}
const getBufferFromS3 = (file) => {
  return new Promise((resolve, reject) => {
    getFileBufferFromS3(file, (error, s3buffer) => {
      if (error) return reject(error);
      return resolve(s3buffer);
    });
  });
};


/*
*-----------------------------------------------------------------
*/
module.exports = {
  uploadFileToBucket,
  deleteFileFromBucket,
  streamExcelToBucket,
  getFileFromBucket,
  uploadSeatFileMiddleware,
  getBufferFromS3
};
  