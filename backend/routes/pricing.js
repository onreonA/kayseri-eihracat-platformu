const express = require('express');
const { databaseService } = require('../config/database');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all pricing plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await databaseService.getPricingPlans();

    res.status(200).json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('❌ Get pricing plans error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Fiyatlandırma planları alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Get pricing plan by ID
router.get('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, we'll get all plans and find the specific one
    // In a real implementation, you'd have a specific method for this
    const plans = await databaseService.getPricingPlans();
    const plan = plans.find(p => p.id == id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Fiyatlandırma planı bulunamadı',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('❌ Get pricing plan error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Fiyatlandırma planı alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Create new pricing plan (admin only)
router.post('/plans', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, description, price, features, durationMonths, isActive } = req.body;

    // Basic validation
    if (!name || !description || price === undefined || !features || !durationMonths) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Tüm gerekli alanları doldurunuz.',
          statusCode: 400
        }
      });
    }

    const planData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      features: Array.isArray(features) ? features : [features],
      durationMonths: parseInt(durationMonths),
      isActive: isActive !== undefined ? isActive : true
    };

    const newPlan = await databaseService.createPricingPlan(planData);

    res.status(201).json({
      success: true,
      message: 'Fiyatlandırma planı başarıyla oluşturuldu.',
      data: newPlan
    });

  } catch (error) {
    console.error('❌ Create pricing plan error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Fiyatlandırma planı oluşturulurken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Update pricing plan (admin only)
router.put('/plans/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, features, durationMonths, isActive } = req.body;

    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (features !== undefined) updateData.features = Array.isArray(features) ? features : [features];
    if (durationMonths !== undefined) updateData.duration_months = parseInt(durationMonths);
    if (isActive !== undefined) updateData.is_active = isActive;

    const updatedPlan = await databaseService.updatePricingPlan(id, updateData);

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Fiyatlandırma planı bulunamadı',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Fiyatlandırma planı başarıyla güncellendi.',
      data: updatedPlan
    });

  } catch (error) {
    console.error('❌ Update pricing plan error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Fiyatlandırma planı güncellenirken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Delete pricing plan (admin only)
router.delete('/plans/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // For now, we'll just update the plan to inactive
    // In a real implementation, you'd have a delete method
    const updatedPlan = await databaseService.updatePricingPlan(id, { is_active: false });

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Fiyatlandırma planı bulunamadı',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Fiyatlandırma planı başarıyla silindi.',
      data: updatedPlan
    });

  } catch (error) {
    console.error('❌ Delete pricing plan error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Fiyatlandırma planı silinirken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Get user subscriptions
router.get('/subscriptions', protect, async (req, res) => {
  try {
    // For now, return empty array as subscription system is not implemented
    // In a real implementation, you'd query user subscriptions from database
    
    res.status(200).json({
      success: true,
      data: [],
      message: 'Abonelik sistemi henüz aktif değil.'
    });

  } catch (error) {
    console.error('❌ Get subscriptions error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Abonelikler alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Subscribe to a plan
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Plan ID gerekli.',
          statusCode: 400
        }
      });
    }

    // For now, return success message as subscription system is not implemented
    // In a real implementation, you'd create a subscription record
    
    res.status(200).json({
      success: true,
      message: 'Abonelik sistemi henüz aktif değil. Lütfen yönetici ile iletişime geçin.',
      data: {
        planId,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ Subscribe error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Abonelik oluşturulurken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

// Get pricing statistics (admin only)
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const plans = await databaseService.getPricingPlans();
    
    const stats = {
      totalPlans: plans.length,
      activePlans: plans.filter(p => p.is_active).length,
      averagePrice: plans.length > 0 ? plans.reduce((sum, p) => sum + p.price, 0) / plans.length : 0,
      priceRange: plans.length > 0 ? {
        min: Math.min(...plans.map(p => p.price)),
        max: Math.max(...plans.map(p => p.price))
      } : { min: 0, max: 0 }
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Pricing stats error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Fiyatlandırma istatistikleri alınırken bir hata oluştu.',
        statusCode: 500
      }
    });
  }
});

module.exports = router;
