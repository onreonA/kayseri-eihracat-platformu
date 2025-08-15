const express = require('express');
const { databaseService } = require('../config/database');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const users = await databaseService.getAllUsers(
      parseInt(limit),
      parseInt(offset)
    );

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: users.length
      }
    });

  } catch (error) {
    console.error('❌ Get users error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Kullanıcılar alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Get user by ID (admin only)
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, we'll get all users and find the specific one
    // In a real implementation, you'd have a specific method for this
    const users = await databaseService.getAllUsers();
    const user = users.find(u => u.id == id);

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
      data: user
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Kullanıcı alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Update user (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { firmaAdi, email, telefon, adres, sektor, durum } = req.body;

    const updateData = {};
    
    if (firmaAdi !== undefined) updateData.firma_adi = firmaAdi.trim();
    if (email !== undefined) updateData.yetkili_email = email.toLowerCase().trim();
    if (telefon !== undefined) updateData.yetkili_telefon = telefon;
    if (adres !== undefined) updateData.adres = adres.trim();
    if (sektor !== undefined) updateData.sektor = sektor.trim();
    if (durum !== undefined) updateData.durum = durum;

    const updatedUser = await databaseService.updateUser(id, updateData);

    if (!updatedUser) {
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
      message: 'Kullanıcı başarıyla güncellendi.',
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Update user error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Kullanıcı güncellenirken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Delete user (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // For now, we'll just update the user to inactive
    // In a real implementation, you'd have a delete method
    const updatedUser = await databaseService.updateUser(id, { durum: 'Pasif' });

    if (!updatedUser) {
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
      message: 'Kullanıcı başarıyla silindi.',
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Kullanıcı silinirken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await databaseService.getAllUsers();
    
    const stats = {
      total: users.length,
      active: users.filter(u => u.durum === 'Aktif').length,
      inactive: users.filter(u => u.durum === 'Pasif').length,
      bySector: users.reduce((acc, user) => {
        const sector = user.sektor || 'Belirtilmemiş';
        acc[sector] = (acc[sector] || 0) + 1;
        return acc;
      }, {}),
      recentUsers: users
        .filter(u => {
          const createdAt = new Date(u.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return createdAt >= thirtyDaysAgo;
        })
        .length
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ User stats error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Kullanıcı istatistikleri alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Search users (admin only)
router.get('/search/:query', protect, authorize('admin'), async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;
    
    const users = await databaseService.getAllUsers(parseInt(limit));
    
    // Simple search implementation
    const searchResults = users.filter(user => 
      user.firma_adi?.toLowerCase().includes(query.toLowerCase()) ||
      user.yetkili_email?.toLowerCase().includes(query.toLowerCase()) ||
      user.sektor?.toLowerCase().includes(query.toLowerCase())
    );

    res.status(200).json({
      success: true,
      data: searchResults,
      searchQuery: query,
      count: searchResults.length
    });

  } catch (error) {
    console.error('❌ Search users error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Kullanıcı arama sırasında bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Bulk update users (admin only)
router.put('/bulk/update', protect, authorize('admin'), async (req, res) => {
  try {
    const { userIds, updateData } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Geçerli kullanıcı ID\'leri gerekli.',
          statusCode: 400
        }
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Güncellenecek veriler gerekli.',
          statusCode: 400
        }
      });
    }

    const results = [];
    const errors = [];

    // Update each user
    for (const userId of userIds) {
      try {
        const updatedUser = await databaseService.updateUser(userId, updateData);
        if (updatedUser) {
          results.push(updatedUser);
        } else {
          errors.push({ userId, error: 'Kullanıcı bulunamadı' });
        }
      } catch (error) {
        errors.push({ userId, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Toplu güncelleme tamamlandı. ${results.length} kullanıcı güncellendi.`,
      data: {
        updated: results,
        errors: errors,
        summary: {
          total: userIds.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Bulk update users error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Toplu güncelleme sırasında bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

module.exports = router;
