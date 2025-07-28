const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { validateFile } = require('../middleware/validation');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// S3 upload configuration
const s3Upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME || 'asset-management-files',
    acl: 'private', // Files are private by default
    key: function (req, file, cb) {
      // Generate unique filename with timestamp and UUID
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${file.fieldname}/${uniqueSuffix}-${sanitizedName}`;
      cb(null, fileName);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedBy: req.user?.sub || 'system',
        uploadDate: new Date().toISOString()
      });
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: validateFile
});

// Local storage fallback (for development)
const localStorage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${file.fieldname}-${uniqueSuffix}-${sanitizedName}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: validateFile
});

// Choose storage based on environment
const upload = process.env.USE_S3 === 'true' ? s3Upload : localStorage;

// User image upload (for profile pictures, etc.) - temp storage then S3
const userImage = multer.diskStorage({
  destination: (req, file, callback) => {
    const filePath = './uploads/temp_files/';
    // Ensure directory exists
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }
    callback(null, filePath);
  },
  filename: (req, file, callback) => {
    if (!file.originalname.toLowerCase().match(/\.(png|jpeg|jpg)$/)) {
      const err = new Error('Invalid file type. Only PNG, JPEG, and JPG are allowed.');
      err.code = 'filetype';
      return callback(err);
    }
    callback(null, crypto.randomBytes(8).toString('hex') + Date.now() + path.extname(file.originalname).toLowerCase());
  },
});
const userImageUp = multer({ 
  storage: userImage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('image_file');

// General file upload - temp storage then S3
const fileUpload = multer.diskStorage({
  destination: (req, file, callback) => {
    const filePath = './uploads/temp_files/';
    // Ensure directory exists
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }
    callback(null, filePath);
  },
  filename: (req, file, callback) => {
    callback(null, crypto.randomBytes(8).toString('hex') + Date.now() + path.extname(file.originalname).toLowerCase());
  },
});
const fileUp = multer({ 
  storage: fileUpload, 
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
}).array('file');

// Status file upload for action and resolution files
const statusFileUp = multer({ 
  storage: fileUpload, 
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
}).fields([
  { name: 'actionFile', maxCount: 10 }, 
  { name: 'resolutionFile', maxCount: 10 }
]);

// Generate signed URL for private S3 files
const getSignedUrl = (key, expires = 3600) => {
  if (process.env.USE_S3 !== 'true') {
    // For local files, return local URL
    return `/uploads/${key}`;
  }

  return s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_BUCKET_NAME || 'asset-management-files',
    Key: key,
    Expires: expires // URL expires in 1 hour by default
  });
};

// Upload file to S3 bucket from temp storage
const uploadFileToBucket = async (filePath, fileName, mimeType) => {
  return new Promise((resolve) => {
    const params = {
      Bucket: process.env.AWS_BUCKET || process.env.S3_BUCKET_NAME || 'asset-management-files',
      Key: `attachment/${fileName}`,
      ACL: 'public-read',
      ContentType: mimeType,
      Body: fs.readFileSync(filePath),
    };
    
    s3.upload(params, (err, res) => {
      if (err) {
        console.error('S3 upload error:', err);
        return resolve({ success: false, message: err.message });
      }
      
      // Clean up temp file after successful upload
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Warning: Could not delete temp file:', cleanupError.message);
      }
      
      return resolve({ 
        success: true, 
        url: res.Location, 
        key: res.Key,
        message: 'File Uploaded Successfully' 
      });
    });
  });
};

// Delete file from S3
const deleteFile = async (key) => {
  if (process.env.USE_S3 !== 'true') {
    // For local files, you would use fs.unlink
    const fs = require('fs').promises;
    const filePath = path.join(__dirname, '../../uploads', key);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting local file:', error);
      return false;
    }
  }

  try {
    await s3.deleteObject({
      Bucket: process.env.AWS_BUCKET || process.env.S3_BUCKET_NAME || 'asset-management-files',
      Key: key
    }).promise();
    return true;
  } catch (error) {
    console.error('Error deleting S3 file:', error);
    return false;
  }
};

// Upload multiple files helper
const uploadMultiple = (fieldName, maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

// Upload single file helper
const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

module.exports = {
  upload,
  uploadMultiple,
  uploadSingle,
  getSignedUrl,
  deleteFile,
  uploadFileToBucket,
  userImageUp,
  fileUp,
  statusFileUp,
  s3
};
