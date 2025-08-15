const nodemailer = require('nodemailer');
const { databaseService } = require('../config/database');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize email transporter
  initializeTransporter() {
    try {
      // Check if email configuration is available
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email configuration not found, email service disabled');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service configuration error:', error);
        } else {
          console.log('✅ Email service is ready to send messages');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
    }
  }

  // Send contact form notification
  async sendContactNotification(contactData) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const emailContent = this.generateContactEmailContent(contactData);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@e-ihracat-platform.com',
        to: process.env.EMAIL_USER, // Send to admin email
        subject: `Yeni İletişim Formu Başvurusu - ${contactData.firmaAdi}`,
        html: emailContent,
        text: this.stripHtml(emailContent)
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log email
      await databaseService.logEmail({
        recipient: mailOptions.to,
        subject: mailOptions.subject,
        template: 'contact_notification',
        status: 'sent',
        errorMessage: null
      });

      console.log('✅ Contact notification email sent successfully');
      return result;

    } catch (error) {
      console.error('❌ Failed to send contact notification:', error);

      // Log failed email
      await databaseService.logEmail({
        recipient: process.env.EMAIL_USER,
        subject: `Yeni İletişim Formu Başvurusu - ${contactData.firmaAdi}`,
        template: 'contact_notification',
        status: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  // Send welcome email to new users
  async sendWelcomeEmail(userData) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const emailContent = this.generateWelcomeEmailContent(userData);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@e-ihracat-platform.com',
        to: userData.email,
        subject: 'E-İhracat Platformuna Hoş Geldiniz!',
        html: emailContent,
        text: this.stripHtml(emailContent)
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log email
      await databaseService.logEmail({
        recipient: userData.email,
        subject: mailOptions.subject,
        template: 'welcome_email',
        status: 'sent',
        errorMessage: null
      });

      console.log('✅ Welcome email sent successfully');
      return result;

    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);

      // Log failed email
      await databaseService.logEmail({
        recipient: userData.email,
        subject: 'E-İhracat Platformuna Hoş Geldiniz!',
        template: 'welcome_email',
        status: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(userData, resetToken) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      const emailContent = this.generatePasswordResetEmailContent(userData, resetUrl);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@e-ihracat-platform.com',
        to: userData.email,
        subject: 'Şifre Sıfırlama Talebi - E-İhracat Platformu',
        html: emailContent,
        text: this.stripHtml(emailContent)
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log email
      await databaseService.logEmail({
        recipient: userData.email,
        subject: mailOptions.subject,
        template: 'password_reset',
        status: 'sent',
        errorMessage: null
      });

      console.log('✅ Password reset email sent successfully');
      return result;

    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);

      // Log failed email
      await databaseService.logEmail({
        recipient: userData.email,
        subject: 'Şifre Sıfırlama Talebi - E-İhracat Platformu',
        template: 'password_reset',
        status: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  // Generate contact form email content
  generateContactEmailContent(contactData) {
    return `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Yeni İletişim Formu Başvurusu</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #555; }
          .value { background: white; padding: 10px; border-radius: 4px; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Yeni İletişim Formu Başvurusu</h1>
            <p>E-İhracat Platformu</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">🏢 Firma Adı:</div>
              <div class="value">${contactData.firmaAdi}</div>
            </div>
            <div class="field">
              <div class="label">👤 İletişim Kişisi:</div>
              <div class="value">${contactData.iletisimKisisi}</div>
            </div>
            <div class="field">
              <div class="label">📧 E-posta Adresi:</div>
              <div class="value">${contactData.email}</div>
            </div>
            <div class="field">
              <div class="label">💬 Mesaj:</div>
              <div class="value">${contactData.mesaj}</div>
            </div>
            <div class="field">
              <div class="label">📅 Gönderim Tarihi:</div>
              <div class="value">${new Date().toLocaleString('tr-TR')}</div>
            </div>
            <div class="field">
              <div class="label">🌐 IP Adresi:</div>
              <div class="value">${contactData.ipAddress}</div>
            </div>
          </div>
          <div class="footer">
            <p>Bu e-posta E-İhracat Platformu iletişim formu üzerinden otomatik olarak gönderilmiştir.</p>
            <p>T.C. Ticaret Bakanlığı Destekli E-İhracat Tanıtım Destek Platformu</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate welcome email content
  generateWelcomeEmailContent(userData) {
    return `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>E-İhracat Platformuna Hoş Geldiniz!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .welcome-text { font-size: 18px; margin-bottom: 20px; }
          .features { margin: 20px 0; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #667eea; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Hoş Geldiniz!</h1>
            <p>E-İhracat Platformuna Başarıyla Kayıt Oldunuz</p>
          </div>
          <div class="content">
            <div class="welcome-text">
              Merhaba ${userData.firmaAdi} ekibi,<br><br>
              E-İhracat Tanıtım Destek Platformuna hoş geldiniz! T.C. Ticaret Bakanlığı destekli platformumuzda global pazarlara açılma yolculuğunuzda size yardımcı olmaktan mutluluk duyuyoruz.
            </div>
            
            <div class="features">
              <h3>🚀 Platform Özelliklerimiz:</h3>
              <div class="feature">
                <strong>📚 Kapsamlı Eğitimler:</strong> E-ihracat süreçlerini öğrenin
              </div>
              <div class="feature">
                <strong>🌍 Pazaryeri Entegrasyonu:</strong> Amazon, eBay, Alibaba'da satış yapın
              </div>
              <div class="feature">
                <strong>📊 Detaylı Raporlama:</strong> Performansınızı takip edin
              </div>
              <div class="feature">
                <strong>🤝 Uzman Desteği:</strong> 7/24 danışmanlık hizmeti
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="cta-button">
                Dashboard'a Git
              </a>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #e8f4fd; border-radius: 4px;">
              <h4>📞 İletişim Bilgileri:</h4>
              <p><strong>E-posta:</strong> destek@e-ihracat-platform.com</p>
              <p><strong>Telefon:</strong> +90 312 xxx xx xx</p>
              <p><strong>Çalışma Saatleri:</strong> Pazartesi - Cuma, 09:00 - 18:00</p>
            </div>
          </div>
          <div class="footer">
            <p>T.C. Ticaret Bakanlığı Destekli E-İhracat Tanıtım Destek Platformu</p>
            <p>NSL Savunma Bilişim San. ve Tic. A.Ş.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate password reset email content
  generatePasswordResetEmailContent(userData, resetUrl) {
    return `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Şifre Sıfırlama</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .reset-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Şifre Sıfırlama</h1>
            <p>E-İhracat Platformu</p>
          </div>
          <div class="content">
            <p>Merhaba ${userData.firmaAdi} ekibi,</p>
            
            <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="reset-button">
                Şifremi Sıfırla
              </a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Güvenlik Uyarısı:</strong>
              <ul>
                <li>Bu link 1 saat süreyle geçerlidir</li>
                <li>Şifre sıfırlama talebinde bulunmadıysanız bu e-postayı görmezden gelin</li>
                <li>Link çalışmıyorsa, tarayıcınızın adres çubuğuna kopyalayıp yapıştırın</li>
              </ul>
            </div>
            
            <p>Herhangi bir sorunuz varsa, lütfen destek ekibimizle iletişime geçin.</p>
          </div>
          <div class="footer">
            <p>T.C. Ticaret Bakanlığı Destekli E-İhracat Tanıtım Destek Platformu</p>
            <p>Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Strip HTML tags for plain text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Test email service
  async testEmailService() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const testEmail = {
        from: process.env.EMAIL_FROM || 'noreply@e-ihracat-platform.com',
        to: process.env.EMAIL_USER,
        subject: 'E-İhracat Platform - Email Service Test',
        text: 'Bu bir test e-postasıdır. Email servisi başarıyla çalışıyor.',
        html: '<h1>Email Service Test</h1><p>Bu bir test e-postasıdır. Email servisi başarıyla çalışıyor.</p>'
      };

      const result = await this.transporter.sendMail(testEmail);
      console.log('✅ Email service test successful');
      return result;

    } catch (error) {
      console.error('❌ Email service test failed:', error);
      throw error;
    }
  }
}

// Create and export email service instance
const emailService = new EmailService();

module.exports = emailService;
