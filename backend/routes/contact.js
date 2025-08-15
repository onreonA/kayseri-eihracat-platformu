const express = require('express');
const rateLimit = require('express-rate-limit');
const { validationUtils } = require('../utils/validation');
const { databaseService } = require('../config/database');
const emailService = require('../utils/emailService');

const router = express.Router();

// Rate limiting for contact form submissions
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 contact form submissions per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many contact form submissions, please try again later',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Submit contact form
router.post('/submit', contactRateLimit, async (req, res) => {
  try {
    const { firmaAdi, iletisimKisisi, email, mesaj } = req.body;

    // Validate and sanitize input data
    const validatedData = validationUtils.validateContactForm({
      firmaAdi,
      iletisimKisisi,
      email,
      mesaj
    });

    // Check for spam indicators
    if (validationUtils.checkForSpam(validatedData)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Spam detected in your submission. Please review your message and try again.',
          statusCode: 400
        }
      });
    }

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    // Prepare submission data
    const submissionData = {
      ...validatedData,
      ipAddress,
      userAgent
    };

    // Save to database
    const savedSubmission = await databaseService.createContactSubmission(submissionData);

    // Send email notification (async - don't wait for it)
    emailService.sendContactNotification(submissionData)
      .then(() => {
        console.log('✅ Contact notification email sent successfully');
      })
      .catch((error) => {
        console.error('❌ Failed to send contact notification email:', error);
        // Don't fail the request if email fails
      });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'İletişim formunuz başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
      data: {
        id: savedSubmission.id,
        submittedAt: savedSubmission.created_at
      }
    });

  } catch (error) {
    console.error('❌ Contact form submission error:', error);
    
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'İletişim formu gönderilirken bir hata oluştu.',
        statusCode: 400
      }
    });
  }
});

// Get contact form statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const stats = await databaseService.getContactStats();

    res.status(200).json({
      success: true,
      data: {
        total: stats.total,
        thisMonth: stats.thisMonth,
        lastMonth: stats.lastMonth
      }
    });

  } catch (error) {
    console.error('❌ Contact stats error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'İstatistikler alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Get contact submissions (admin only)
router.get('/submissions', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const submissions = await databaseService.getContactSubmissions(
      parseInt(limit),
      parseInt(offset)
    );

    res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: submissions.length
      }
    });

  } catch (error) {
    console.error('❌ Contact submissions retrieval error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'İletişim formları alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Test email service
router.post('/test-email', async (req, res) => {
  try {
    const testData = {
      firmaAdi: 'Test Firma',
      iletisimKisisi: 'Test Kişi',
      email: 'test@example.com',
      mesaj: 'Bu bir test mesajıdır.',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Test Agent'
    };

    const result = await emailService.sendContactNotification(testData);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Test email error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Test email gönderilirken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

module.exports = router;
