const Joi = require('joi');

// Email validation regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Turkish phone number regex pattern
const PHONE_REGEX = /^(\+90|0)?[5][0-9]{9}$/;

// Validation schemas
const validationSchemas = {
  // Contact form validation
  contactForm: Joi.object({
    firmaAdi: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Firma adı en az 2 karakter olmalıdır',
        'string.max': 'Firma adı en fazla 100 karakter olabilir',
        'any.required': 'Firma adı zorunludur'
      }),
    
    iletisimKisisi: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'İletişim kişisi en az 2 karakter olmalıdır',
        'string.max': 'İletişim kişisi en fazla 50 karakter olabilir',
        'any.required': 'İletişim kişisi zorunludur'
      }),
    
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .pattern(EMAIL_REGEX)
      .required()
      .messages({
        'string.email': 'Geçerli bir e-posta adresi giriniz',
        'string.pattern.base': 'E-posta formatı geçersiz',
        'any.required': 'E-posta adresi zorunludur'
      }),
    
    mesaj: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': 'Mesaj en az 10 karakter olmalıdır',
        'string.max': 'Mesaj en fazla 1000 karakter olabilir',
        'any.required': 'Mesaj zorunludur'
      })
  }),

  // User login validation
  userLogin: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .pattern(EMAIL_REGEX)
      .required()
      .messages({
        'string.email': 'Geçerli bir e-posta adresi giriniz',
        'string.pattern.base': 'E-posta formatı geçersiz',
        'any.required': 'E-posta adresi zorunludur'
      }),
    
    password: Joi.string()
      .min(6)
      .max(50)
      .required()
      .messages({
        'string.min': 'Şifre en az 6 karakter olmalıdır',
        'string.max': 'Şifre en fazla 50 karakter olabilir',
        'any.required': 'Şifre zorunludur'
      })
  })
};

// Validation functions
const validationUtils = {
  // Validate email format
  isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    return EMAIL_REGEX.test(email);
  },

  // Validate phone number format
  isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    
    return PHONE_REGEX.test(phone);
  },

  // Sanitize input
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // Validate and sanitize contact form data
  validateContactForm(data) {
    const sanitizedData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitizedData[key] = this.sanitizeInput(value);
      } else {
        sanitizedData[key] = value;
      }
    }
    
    const { error, value } = validationSchemas.contactForm.validate(sanitizedData);
    
    if (error) {
      throw new Error(error.details[0].message);
    }
    
    return value;
  },

  // Validate and sanitize user login data
  validateUserLogin(data) {
    const sanitizedData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitizedData[key] = this.sanitizeInput(value);
      } else {
        sanitizedData[key] = value;
      }
    }
    
    const { error, value } = validationSchemas.userLogin.validate(sanitizedData);
    
    if (error) {
      throw new Error(error.details[0].message);
    }
    
    return value;
  },

  // Check for common spam indicators
  checkForSpam(data) {
    const spamIndicators = [
      (data.mesaj.match(/https?:\/\/[^\s]+/g) || []).length > 3,
      (data.mesaj.match(/[A-Z]/g) || []).length / data.mesaj.length > 0.7,
      /(viagra|casino|loan|credit|debt|free money)/i.test(data.mesaj),
      data.mesaj.length < 10 || data.mesaj.length > 2000
    ];
    
    return spamIndicators.some(indicator => indicator);
  }
};

module.exports = {
  validationSchemas,
  validationUtils,
  EMAIL_REGEX,
  PHONE_REGEX
};
