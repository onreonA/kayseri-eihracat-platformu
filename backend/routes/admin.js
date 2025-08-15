const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { validationUtils } = require('../utils/validation');
const { databaseService } = require('../config/database');

const router = express.Router();

// Rate limiting for admin authentication
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 admin login attempts per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many admin login attempts, please try again later.',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login
router.post('/login', adminRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email ve şifre gerekli.',
          statusCode: 400
        }
      });
    }

    // Admin credentials (in production, these should be in database)
    const adminCredentials = [
      {
        email: 'bilgi@omerfarukunsal.com',
        password: 'admin123',
        name: 'Omer Faruk Unsal',
        role: 'admin'
      },
      {
        email: 'admin@system.com',
        password: 'admin123',
        name: 'System Admin',
        role: 'admin'
      },
      {
        email: 'demo@example.com',
        password: 'demo123',
        name: 'Demo Admin',
        role: 'admin'
      }
    ];

    // Check admin credentials
    const admin = adminCredentials.find(cred => 
      cred.email.toLowerCase() === email.toLowerCase() && 
      cred.password === password
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Geçersiz admin bilgileri.',
          statusCode: 401
        }
      });
    }

    // Generate admin JWT token
    const token = jwt.sign(
      {
        id: 'admin',
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Admin girişi başarılı',
      data: {
        token,
        admin: {
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      }
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Admin girişi sırasında bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Verify admin token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Admin token gerekli.',
          statusCode: 401
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Admin yetkisi gerekli.',
          statusCode: 403
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Admin token geçerli',
      data: {
        admin: {
          email: decoded.email,
          name: decoded.name,
          role: decoded.role
        }
      }
    });

  } catch (error) {
    console.error('❌ Admin token verification error:', error);
    
    res.status(401).json({
      success: false,
      error: {
        message: 'Geçersiz admin token.',
        statusCode: 401
      }
    });
  }
});

// Admin logout
router.post('/logout', async (req, res) => {
  try {
    // In JWT system, logout is handled client-side
    res.status(200).json({
      success: true,
      message: 'Admin çıkışı başarılı.'
    });

  } catch (error) {
    console.error('❌ Admin logout error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Admin çıkışı sırasında bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // Get basic stats for admin dashboard
    const stats = {
      totalUsers: 0,
      totalContacts: 0,
      totalPricingPlans: 0,
      recentActivity: []
    };

    // Get user count
    try {
      const users = await databaseService.getAllUsers();
      stats.totalUsers = users.length;
    } catch (error) {
      console.log('Could not get user count:', error.message);
    }

    // Get contact count
    try {
      const contacts = await databaseService.getContactSubmissions();
      stats.totalContacts = contacts.length;
    } catch (error) {
      console.log('Could not get contact count:', error.message);
    }

    // Get pricing plans count
    try {
      const plans = await databaseService.getPricingPlans();
      stats.totalPricingPlans = plans.length;
    } catch (error) {
      console.log('Could not get pricing plans count:', error.message);
    }

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Admin stats error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Admin istatistikleri alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

module.exports = router;
