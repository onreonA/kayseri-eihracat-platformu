#!/usr/bin/env node

require('dotenv').config();
const { databaseService } = require('./config/database');
const emailService = require('./utils/emailService');

console.log('🚀 E-İhracat Platform Backend Setup');
console.log('=====================================\n');

async function runSetup() {
  try {
    // 1. Check environment variables
    console.log('1. Environment Variables Check...');
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'JWT_SECRET',
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASS'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('❌ Missing environment variables:');
      missingVars.forEach(varName => console.log(`   - ${varName}`));
      console.log('\nPlease check your .env file and ensure all required variables are set.\n');
      return;
    }
    
    console.log('✅ All required environment variables are set.\n');

    // 2. Test database connection
    console.log('2. Database Connection Test...');
    try {
      const dbStatus = await databaseService.checkConnection();
      console.log('✅ Database connection successful');
      console.log(`   Status: ${dbStatus.status}`);
      console.log(`   Message: ${dbStatus.message}\n`);
    } catch (error) {
      console.log('❌ Database connection failed:');
      console.log(`   Error: ${error.message}\n`);
      console.log('Please check your Supabase configuration.\n');
      return;
    }

    // 3. Test email service
    console.log('3. Email Service Test...');
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await emailService.testEmailService();
        console.log('✅ Email service test successful\n');
      } else {
        console.log('⚠️  Email service not configured (EMAIL_USER or EMAIL_PASS missing)\n');
      }
    } catch (error) {
      console.log('❌ Email service test failed:');
      console.log(`   Error: ${error.message}\n`);
      console.log('Please check your email configuration.\n');
    }

    // 4. Create required directories
    console.log('4. Directory Setup...');
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory');
    } else {
      console.log('✅ Uploads directory already exists');
    }
    console.log('');

    // 5. Display configuration summary
    console.log('5. Configuration Summary...');
    console.log(`   Server Port: ${process.env.PORT || 5000}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
    console.log(`   JWT Expires: ${process.env.JWT_EXPIRES_IN || '7d'}`);
    console.log(`   Rate Limit: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} requests per ${Math.floor((process.env.RATE_LIMIT_WINDOW_MS || 900000) / 1000 / 60)} minutes`);
    console.log('');

    // 6. API endpoints info
    console.log('6. API Endpoints...');
    console.log('   Health Check: http://localhost:5000/api/health');
    console.log('   API Docs: http://localhost:5000/api');
    console.log('   Contact Form: POST http://localhost:5000/api/contact/submit');
    console.log('   User Login: POST http://localhost:5000/api/auth/login');
    console.log('   Pricing Plans: GET http://localhost:5000/api/pricing/plans');
    console.log('');

    // 7. Next steps
    console.log('7. Next Steps...');
    console.log('   ✅ Backend setup completed successfully!');
    console.log('   📝 Make sure to create the required database tables in Supabase');
    console.log('   🚀 Start the server with: npm run dev');
    console.log('   🔗 Frontend should be configured to use: http://localhost:5000/api');
    console.log('');

    console.log('🎉 Setup completed successfully!');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  runSetup();
}

module.exports = { runSetup };
