const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { validationUtils } = require('../utils/validation');
const { databaseService } = require('../config/database');
const emailService = require('../utils/emailService');
const { protect, authRateLimit } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit(authRateLimit);

// User login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input data
    const validatedData = validationUtils.validateUserLogin({
      email,
      password
    });

    // Find user in database
    const user = await databaseService.findUserByEmail(validatedData.email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Bu email adresi ile kayıtlı aktif firma bulunamadı.',
          statusCode: 401
        }
      });
    }

    // Check if user is active
    if (user.durum !== 'Aktif') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin.',
          statusCode: 401
        }
      });
    }

    // Validate password (using the same logic as frontend)
    const validPasswords = ['123456', '111111', '112233'];
    const isPasswordValid = validPasswords.includes(validatedData.password.trim());

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Yanlış şifre. (Geçerli şifreler: 123456, 111111, 112233)',
          statusCode: 401
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.yetkili_email,
        firmaAdi: user.firma_adi
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        token,
        user: {
          id: user.id,
          email: user.yetkili_email,
          firmaAdi: user.firma_adi,
          telefon: user.yetkili_telefon,
          adres: user.adres,
          sektor: user.sektor,
          durum: user.durum
        }
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Giriş yapılırken bir hata oluştu.',
        statusCode: 400
      }
    });
  }
});

// User registration
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { firmaAdi, email, telefon, adres, sektor } = req.body;

    // Validate input data
    const validatedData = validationUtils.validateContactForm({
      firmaAdi,
      iletisimKisisi: firmaAdi, // Use firmaAdi as contact person for now
      email,
      mesaj: 'Yeni firma kaydı'
    });

    // Check if user already exists
    const existingUser = await databaseService.findUserByEmail(validatedData.email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Bu email adresi zaten kayıtlı.',
          statusCode: 400
        }
      });
    }

    // Create new user
    const userData = {
      firmaAdi: validatedData.firmaAdi,
      email: validatedData.email,
      telefon: telefon || '',
      adres: adres || '',
      sektor: sektor || 'Genel'
    };

    const newUser = await databaseService.createUser(userData);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.yetkili_email,
        firmaAdi: newUser.firma_adi
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    // Send welcome email (async - don't wait for it)
    emailService.sendWelcomeEmail(userData)
      .then(() => {
        console.log('✅ Welcome email sent successfully');
      })
      .catch((error) => {
        console.error('❌ Failed to send welcome email:', error);
        // Don't fail the request if email fails
      });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Firma kaydınız başarıyla oluşturuldu.',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.yetkili_email,
          firmaAdi: newUser.firma_adi,
          telefon: newUser.yetkili_telefon,
          adres: newUser.adres,
          sektor: newUser.sektor,
          durum: newUser.durum
        }
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Kayıt olurken bir hata oluştu.',
        statusCode: 400
      }
    });
  }
});

// Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await databaseService.findUserByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Kullanıcı bulunamadı',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.yetkili_email,
        firmaAdi: user.firma_adi,
        telefon: user.yetkili_telefon,
        adres: user.adres,
        sektor: user.sektor,
        durum: user.durum,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Profil bilgileri alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Update user profile
router.put('/me', protect, async (req, res) => {
  try {
    const { firmaAdi, telefon, adres, sektor } = req.body;

    // Validate input data
    const updateData = {};
    
    if (firmaAdi) {
      updateData.firma_adi = validationUtils.sanitizeInput(firmaAdi);
    }
    
    if (telefon) {
      if (!validationUtils.isValidPhone(telefon)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Geçerli bir telefon numarası giriniz (5XX XXX XX XX)',
            statusCode: 400
          }
        });
      }
      updateData.yetkili_telefon = telefon;
    }
    
    if (adres) {
      updateData.adres = validationUtils.sanitizeInput(adres);
    }
    
    if (sektor) {
      updateData.sektor = validationUtils.sanitizeInput(sektor);
    }

    // Update user
    const updatedUser = await databaseService.updateUser(req.user.id, updateData);

    res.status(200).json({
      success: true,
      message: 'Profil bilgileriniz başarıyla güncellendi.',
      data: {
        id: updatedUser.id,
        email: updatedUser.yetkili_email,
        firmaAdi: updatedUser.firma_adi,
        telefon: updatedUser.yetkili_telefon,
        adres: updatedUser.adres,
        sektor: updatedUser.sektor,
        durum: updatedUser.durum
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Profil güncellenirken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', protect, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the logout event for security purposes
    
    res.status(200).json({
      success: true,
      message: 'Başarıyla çıkış yapıldı.'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Çıkış yapılırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Verify token
router.get('/verify', protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Token geçerli',
      data: {
        user: req.user
      }
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    
    res.status(401).json({
      success: false,
      error: {
        message: 'Token geçersiz',
        statusCode: 401
      }
    });
  }
});

module.exports = router;
