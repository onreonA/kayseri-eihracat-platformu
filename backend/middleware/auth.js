const jwt = require('jsonwebtoken');
const { databaseService } = require('../config/database');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await databaseService.findUserByEmail(decoded.email);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
            statusCode: 401
          }
        });
      }

      // Check if user is active
      if (user.durum !== 'Aktif') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User account is not active',
            statusCode: 401
          }
        });
      }

      // Add user to request object
      req.user = {
        id: user.id,
        email: user.yetkili_email,
        firmaAdi: user.firma_adi,
        role: 'user'
      };

      next();
    } catch (error) {
      console.error('❌ Token verification error:', error);
      
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized to access this route',
          statusCode: 401
        }
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Not authorized to access this route - No token provided',
        statusCode: 401
      }
    });
  }
};

// Admin authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized to access this route',
          statusCode: 401
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `User role ${req.user.role} is not authorized to access this route`,
          statusCode: 403
        }
      });
    }

    next();
  };
};

// Optional authentication - doesn't require token but adds user if present
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await databaseService.findUserByEmail(decoded.email);

      if (user && user.durum === 'Aktif') {
        req.user = {
          id: user.id,
          email: user.yetkili_email,
          firmaAdi: user.firma_adi,
          role: 'user'
        };
      }
    } catch (error) {
      // Token is invalid, but we don't throw error for optional auth
      console.log('Optional auth: Invalid token provided');
    }
  }

  next();
};

// Rate limiting for authentication endpoints
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  authRateLimit
};
