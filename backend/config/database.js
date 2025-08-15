const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client for public operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create Supabase client for admin operations (if service key is provided)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Database tables
const TABLES = {
  FIRMALAR: 'firmalar',
  CONTACT_SUBMISSIONS: 'contact_submissions',
  USERS: 'users',
  PRICING_PLANS: 'pricing_plans',
  USER_SUBSCRIPTIONS: 'user_subscriptions',
  EMAIL_LOGS: 'email_logs'
};

// Database operations class
class DatabaseService {
  constructor() {
    this.supabase = supabase;
    this.supabaseAdmin = supabaseAdmin;
  }

  // Generic error handler
  handleError(error, operation = 'Database operation') {
    console.error(`❌ ${operation} error:`, error);
    throw new Error(`${operation} failed: ${error.message}`);
  }

  // Check database connection
  async checkConnection() {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.FIRMALAR)
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      return {
        status: 'connected',
        message: 'Database connection successful'
      };
    } catch (error) {
      this.handleError(error, 'Connection check');
    }
  }

  // Contact form submissions
  async createContactSubmission(submissionData) {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.CONTACT_SUBMISSIONS)
        .insert([{
          firma_adi: submissionData.firmaAdi,
          iletisim_kisisi: submissionData.iletisimKisisi,
          email: submissionData.email,
          mesaj: submissionData.mesaj,
          ip_address: submissionData.ipAddress,
          user_agent: submissionData.userAgent,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      return data[0];
    } catch (error) {
      this.handleError(error, 'Contact submission creation');
    }
  }

  async getContactSubmissions(limit = 50, offset = 0) {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.CONTACT_SUBMISSIONS)
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'Contact submissions retrieval');
    }
  }

  // User authentication and management
  async findUserByEmail(email) {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.FIRMALAR)
        .select('*')
        .eq('yetkili_email', email.toLowerCase())
        .eq('durum', 'Aktif')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'User lookup');
    }
  }

  async createUser(userData) {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.FIRMALAR)
        .insert([{
          firma_adi: userData.firmaAdi,
          yetkili_email: userData.email.toLowerCase(),
          yetkili_telefon: userData.telefon,
          adres: userData.adres,
          sektor: userData.sektor,
          durum: 'Aktif',
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      return data[0];
    } catch (error) {
      this.handleError(error, 'User creation');
    }
  }

  async updateUser(userId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.FIRMALAR)
        .update(updateData)
        .eq('id', userId)
        .select();

      if (error) throw error;

      return data[0];
    } catch (error) {
      this.handleError(error, 'User update');
    }
  }

  async getAllUsers(limit = 50, offset = 0) {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.FIRMALAR)
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'Users retrieval');
    }
  }

  // Pricing plans management
  async getPricingPlans() {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.PRICING_PLANS)
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      this.handleError(error, 'Pricing plans retrieval');
    }
  }

  async createPricingPlan(planData) {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.PRICING_PLANS)
        .insert([{
          name: planData.name,
          description: planData.description,
          price: planData.price,
          features: planData.features,
          duration_months: planData.durationMonths,
          is_active: planData.isActive || true,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      return data[0];
    } catch (error) {
      this.handleError(error, 'Pricing plan creation');
    }
  }

  async updatePricingPlan(planId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.PRICING_PLANS)
        .update(updateData)
        .eq('id', planId)
        .select();

      if (error) throw error;

      return data[0];
    } catch (error) {
      this.handleError(error, 'Pricing plan update');
    }
  }

  // Email logging
  async logEmail(emailData) {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.EMAIL_LOGS)
        .insert([{
          recipient: emailData.recipient,
          subject: emailData.subject,
          template: emailData.template,
          status: emailData.status,
          error_message: emailData.errorMessage,
          sent_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      return data[0];
    } catch (error) {
      this.handleError(error, 'Email logging');
    }
  }

  // Statistics and analytics
  async getContactStats() {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.CONTACT_SUBMISSIONS)
        .select('created_at');

      if (error) throw error;

      const total = data.length;
      const thisMonth = data.filter(submission => {
        const submissionDate = new Date(submission.created_at);
        const now = new Date();
        return submissionDate.getMonth() === now.getMonth() && 
               submissionDate.getFullYear() === now.getFullYear();
      }).length;

      return {
        total,
        thisMonth,
        lastMonth: total - thisMonth // Simplified calculation
      };
    } catch (error) {
      this.handleError(error, 'Contact statistics');
    }
  }
}

// Create and export database service instance
const databaseService = new DatabaseService();

module.exports = {
  databaseService,
  TABLES,
  supabase,
  supabaseAdmin
};
