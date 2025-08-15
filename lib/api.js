// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// API Service Class
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  // POST request
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // PUT request
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  // Authentication endpoints
  auth = {
    // User login
    login: async (email, password) => {
      const response = await apiService.post('/auth/login', { email, password });
      
      // Store token if login successful
      if (response.success && response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
      }
      
      return response;
    },

    // User registration
    register: async (userData) => {
      const response = await apiService.post('/auth/register', userData);
      
      // Store token if registration successful
      if (response.success && response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
      }
      
      return response;
    },

    // Get current user profile
    getProfile: async () => {
      return apiService.get('/auth/me');
    },

    // Update user profile
    updateProfile: async (profileData) => {
      return apiService.put('/auth/me', profileData);
    },

    // Logout
    logout: async () => {
      try {
        await apiService.post('/auth/logout');
      } catch (error) {
        console.error('Logout API error:', error);
      } finally {
        // Clear local storage regardless of API response
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_login_data');
      }
    },

    // Verify token
    verifyToken: async () => {
      return apiService.get('/auth/verify');
    }
  };

  // Admin endpoints
  admin = {
    // Admin login
    login: async (email, password) => {
      const response = await apiService.post('/admin/login', { email, password });
      
      // Store admin token if login successful
      if (response.success && response.data.token) {
        localStorage.setItem('admin_token', response.data.token);
        localStorage.setItem('admin_data', JSON.stringify(response.data.admin));
      }
      
      return response;
    },

    // Verify admin token
    verifyToken: async () => {
      return apiService.get('/admin/verify');
    },

    // Admin logout
    logout: async () => {
      try {
        await apiService.post('/admin/logout');
      } catch (error) {
        console.error('Admin logout API error:', error);
      } finally {
        // Clear admin storage regardless of API response
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_data');
        localStorage.removeItem('isAdminLoggedIn');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminId');
        localStorage.removeItem('adminName');
      }
    },

    // Get admin stats
    getStats: async () => {
      return apiService.get('/admin/stats');
    }
  };

  // Contact form endpoints
  contact = {
    // Submit contact form
    submit: async (formData) => {
      return apiService.post('/contact/submit', formData);
    },

    // Get contact statistics (admin only)
    getStats: async () => {
      return apiService.get('/contact/stats');
    },

    // Get contact submissions (admin only)
    getSubmissions: async (limit = 50, offset = 0) => {
      return apiService.get(`/contact/submissions?limit=${limit}&offset=${offset}`);
    },

    // Test email service
    testEmail: async () => {
      return apiService.post('/contact/test-email');
    }
  };

  // Pricing endpoints
  pricing = {
    // Get all pricing plans
    getPlans: async () => {
      return apiService.get('/pricing/plans');
    },

    // Get pricing plan by ID
    getPlan: async (id) => {
      return apiService.get(`/pricing/plans/${id}`);
    },

    // Create pricing plan (admin only)
    createPlan: async (planData) => {
      return apiService.post('/pricing/plans', planData);
    },

    // Update pricing plan (admin only)
    updatePlan: async (id, planData) => {
      return apiService.put(`/pricing/plans/${id}`, planData);
    },

    // Delete pricing plan (admin only)
    deletePlan: async (id) => {
      return apiService.delete(`/pricing/plans/${id}`);
    },

    // Get user subscriptions
    getSubscriptions: async () => {
      return apiService.get('/pricing/subscriptions');
    },

    // Subscribe to a plan
    subscribe: async (planId) => {
      return apiService.post('/pricing/subscribe', { planId });
    },

    // Get pricing statistics (admin only)
    getStats: async () => {
      return apiService.get('/pricing/stats');
    }
  };

  // User management endpoints (admin only)
  users = {
    // Get all users
    getAll: async (limit = 50, offset = 0) => {
      return apiService.get(`/users?limit=${limit}&offset=${offset}`);
    },

    // Get user by ID
    getById: async (id) => {
      return apiService.get(`/users/${id}`);
    },

    // Update user
    update: async (id, userData) => {
      return apiService.put(`/users/${id}`, userData);
    },

    // Delete user
    delete: async (id) => {
      return apiService.delete(`/users/${id}`);
    },

    // Get user statistics
    getStats: async () => {
      return apiService.get('/users/stats/overview');
    },

    // Search users
    search: async (query, limit = 20) => {
      return apiService.get(`/users/search/${encodeURIComponent(query)}?limit=${limit}`);
    },

    // Bulk update users
    bulkUpdate: async (userIds, updateData) => {
      return apiService.put('/users/bulk/update', { userIds, updateData });
    }
  };

  // Health check
  health = {
    check: async () => {
      return apiService.get('/health');
    }
  };
}

// Create and export API service instance
const apiService = new ApiService();

export default apiService;
