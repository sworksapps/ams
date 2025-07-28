const Joi = require('joi');

// Asset validation schema
const assetSchema = Joi.object({
  equipment_name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Equipment name is required',
      'string.max': 'Equipment name must be less than 100 characters'
    }),
  
  category: Joi.string()
    .required()
    .messages({
      'string.empty': 'Category is required'
    }),
  
  subcategory: Joi.string()
    .allow('')
    .optional(),
  
  location: Joi.string()
    .required()
    .messages({
      'string.empty': 'Location is required'
    }),
  
  asset_type: Joi.string()
    .valid('Building asset', 'Client asset')
    .required()
    .messages({
      'any.only': 'Asset type must be either "Building asset" or "Client asset"'
    }),
  
  client: Joi.string()
    .when('asset_type', {
      is: 'Client asset',
      then: Joi.required().messages({
        'any.required': 'Client is required when asset type is "Client asset"'
      }),
      otherwise: Joi.optional().allow('')
    }),
  
  floor: Joi.string()
    .allow('')
    .optional(),
  
  model: Joi.string()
    .max(100)
    .allow('')
    .optional(),
  
  capacity: Joi.string()
    .allow('')
    .optional(),
  
  unit: Joi.string()
    .allow('')
    .optional(),
  
  manufacturer: Joi.string()
    .max(100)
    .allow('')
    .optional(),
  
  serial_number: Joi.string()
    .max(100)
    .allow('')
    .optional(),
  
  purchase_price: Joi.number()
    .positive()
    .max(999999999)
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'Purchase price must be a positive number',
      'number.max': 'Purchase price is too large'
    }),
  
  poc_name: Joi.string()
    .max(100)
    .allow('')
    .optional(),
  
  poc_contact: Joi.string()
    .pattern(/^[0-9+\-\s()]*$/)
    .max(20)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Contact number contains invalid characters'
    }),
  
  owned_by: Joi.string()
    .valid('SW', 'Landlord')
    .required()
    .messages({
      'any.only': 'Owned by must be either "SW" or "Landlord"'
    }),
  
  make: Joi.string()
    .max(100)
    .allow('')
    .optional(),
  
  photos: Joi.array()
    .items(Joi.string())
    .optional()
});

// Maintenance schedule validation schema
const maintenanceScheduleSchema = Joi.object({
  asset_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Asset ID must be a number',
      'number.positive': 'Asset ID must be positive',
      'any.required': 'Asset ID is required'
    }),
  
  maintenance_name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Maintenance name is required',
      'string.max': 'Maintenance name must be less than 100 characters'
    }),
  
  start_date: Joi.date()
    .required()
    .messages({
      'date.base': 'Start date must be a valid date',
      'any.required': 'Start date is required'
    }),
  
  frequency: Joi.string()
    .valid('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-yearly', 'Yearly')
    .required()
    .messages({
      'any.only': 'Frequency must be one of: Daily, Weekly, Monthly, Quarterly, Half-yearly, Yearly',
      'any.required': 'Frequency is required'
    }),
  
  maintenance_owner: Joi.string()
    .valid('SW', 'Vendor')
    .required()
    .messages({
      'any.only': 'Maintenance owner must be either "SW" or "Vendor"',
      'any.required': 'Maintenance owner is required'
    })
});

// Coverage validation schema
const coverageSchema = Joi.object({
  asset_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Asset ID must be a number',
      'number.positive': 'Asset ID must be positive',
      'any.required': 'Asset ID is required'
    }),
  
  vendor_name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Vendor name is required',
      'string.max': 'Vendor name must be less than 100 characters'
    }),
  
  coverage_type: Joi.string()
    .valid('AMC', 'Warranty')
    .required()
    .messages({
      'any.only': 'Coverage type must be either "AMC" or "Warranty"',
      'any.required': 'Coverage type is required'
    }),
  
  po_number: Joi.string()
    .max(50)
    .allow('')
    .optional(),
  
  po_amount: Joi.number()
    .positive()
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'PO amount must be positive'
    }),
  
  start_date: Joi.date()
    .required()
    .messages({
      'date.base': 'Start date must be a valid date',
      'any.required': 'Start date is required'
    }),
  
  end_date: Joi.date()
    .greater(Joi.ref('start_date'))
    .required()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required'
    }),
  
  vendor_contact: Joi.string()
    .pattern(/^[0-9+\-\s()]*$/)
    .max(20)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Vendor contact contains invalid characters'
    }),
  
  vendor_email: Joi.string()
    .email()
    .allow('')
    .optional()
    .messages({
      'string.email': 'Vendor email must be a valid email address'
    })
});

// PPM task update validation schema
const ppmTaskUpdateSchema = Joi.object({
  status: Joi.string()
    .valid('open', 'in-progress', 'completed', 'closed')
    .optional(),
  
  notes: Joi.string()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Notes must be less than 1000 characters'
    }),
  
  completion_date: Joi.date()
    .optional()
    .messages({
      'date.base': 'Completion date must be a valid date'
    })
});

// File upload validation
const fileUploadSchema = Joi.object({
  fieldname: Joi.string().required(),
  originalname: Joi.string().required(),
  encoding: Joi.string().required(),
  mimetype: Joi.string()
    .valid(
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    .required()
    .messages({
      'any.only': 'File type not allowed. Only images (JPEG, PNG, GIF) and documents (PDF, DOC, DOCX) are permitted'
    }),
  size: Joi.number()
    .max(10 * 1024 * 1024) // 10MB
    .required()
    .messages({
      'number.max': 'File size must be less than 10MB'
    })
});

// Query parameter validation schemas
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  search: Joi.string()
    .allow('')
    .optional(),
  
  location: Joi.string()
    .allow('')
    .optional(),
  
  category: Joi.string()
    .allow('')
    .optional(),
  
  status: Joi.string()
    .allow('')
    .optional()
});

module.exports = {
  assetSchema,
  maintenanceScheduleSchema,
  coverageSchema,
  ppmTaskUpdateSchema,
  fileUploadSchema,
  paginationSchema
};
