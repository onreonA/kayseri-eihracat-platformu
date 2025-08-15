# E-İhracat Platform Backend API

Bu, E-İhracat Platformu için Node.js Express backend API'sidir. Supabase veritabanı entegrasyonu, JWT tabanlı kimlik doğrulama, email servisleri ve kapsamlı form validasyonu içerir.

## 🚀 Özellikler

- **🔐 JWT Tabanlı Kimlik Doğrulama**: Güvenli token tabanlı kimlik doğrulama sistemi
- **📧 Email Servisleri**: Nodemailer ile otomatik email bildirimleri
- **🛡️ Güvenlik**: Helmet, CORS, rate limiting ve input sanitization
- **📊 Supabase Entegrasyonu**: PostgreSQL veritabanı ile tam entegrasyon
- **✅ Form Validasyonu**: Joi ile kapsamlı input validasyonu
- **📝 API Dokümantasyonu**: RESTful API endpoints
- **🔍 Hata Yönetimi**: Merkezi hata yakalama ve loglama
- **⚡ Performans**: Compression ve caching optimizasyonları

## 📋 Gereksinimler

- Node.js 18.0.0 veya üzeri
- npm 8.0.0 veya üzeri
- Supabase hesabı ve projesi
- SMTP email servisi (Gmail, SendGrid, vb.)

## 🛠️ Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
cd backend
npm install
```

### 2. Environment Variables

`.env` dosyasını oluşturun:

```bash
cp env.example .env
```

Gerekli değişkenleri doldurun:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
EMAIL_FROM=noreply@e-ihracat-platform.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### 3. Supabase Veritabanı Tabloları

Aşağıdaki tabloları Supabase'de oluşturun:

#### `contact_submissions` tablosu:
```sql
CREATE TABLE contact_submissions (
  id SERIAL PRIMARY KEY,
  firma_adi VARCHAR(100) NOT NULL,
  iletisim_kisisi VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mesaj TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `pricing_plans` tablosu:
```sql
CREATE TABLE pricing_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  features JSONB NOT NULL,
  duration_months INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `email_logs` tablosu:
```sql
CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template VARCHAR(50),
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Uygulamayı Başlatın

```bash
# Development modunda
npm run dev

# Production modunda
npm start
```

## 📚 API Endpoints

### 🔐 Kimlik Doğrulama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Kullanıcı girişi |
| POST | `/api/auth/register` | Kullanıcı kaydı |
| GET | `/api/auth/me` | Kullanıcı profili |
| PUT | `/api/auth/me` | Profil güncelleme |
| POST | `/api/auth/logout` | Çıkış yapma |
| GET | `/api/auth/verify` | Token doğrulama |

### 📧 İletişim Formu

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/contact/submit` | İletişim formu gönderimi |
| GET | `/api/contact/stats` | İletişim istatistikleri |
| GET | `/api/contact/submissions` | Form gönderimleri |
| POST | `/api/contact/test-email` | Email servisi testi |

### 💰 Fiyatlandırma

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/pricing/plans` | Tüm fiyatlandırma planları |
| GET | `/api/pricing/plans/:id` | Plan detayı |
| POST | `/api/pricing/plans` | Yeni plan oluşturma |
| PUT | `/api/pricing/plans/:id` | Plan güncelleme |
| DELETE | `/api/pricing/plans/:id` | Plan silme |
| GET | `/api/pricing/subscriptions` | Kullanıcı abonelikleri |
| POST | `/api/pricing/subscribe` | Plan aboneliği |
| GET | `/api/pricing/stats` | Fiyatlandırma istatistikleri |

### 👥 Kullanıcı Yönetimi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/users` | Tüm kullanıcılar |
| GET | `/api/users/:id` | Kullanıcı detayı |
| PUT | `/api/users/:id` | Kullanıcı güncelleme |
| DELETE | `/api/users/:id` | Kullanıcı silme |
| GET | `/api/users/stats/overview` | Kullanıcı istatistikleri |
| GET | `/api/users/search/:query` | Kullanıcı arama |
| PUT | `/api/users/bulk/update` | Toplu kullanıcı güncelleme |

### 🏥 Sistem

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/health` | Sistem sağlık kontrolü |
| GET | `/api` | API dokümantasyonu |

## 🔧 Kullanım Örnekleri

### İletişim Formu Gönderimi

```javascript
const response = await fetch('/api/contact/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    firmaAdi: 'Test Firma',
    iletisimKisisi: 'Test Kişi',
    email: 'test@example.com',
    mesaj: 'Test mesajı'
  })
});

const data = await response.json();
```

### Kullanıcı Girişi

```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: '123456'
  })
});

const data = await response.json();
if (data.success) {
  localStorage.setItem('auth_token', data.data.token);
}
```

### Korumalı Endpoint Kullanımı

```javascript
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
});
```

## 🛡️ Güvenlik

- **JWT Token**: Tüm korumalı endpointler için JWT token gerekli
- **Rate Limiting**: API istekleri için rate limiting
- **Input Validation**: Tüm giriş verileri validate edilir
- **CORS**: Cross-origin istekler için güvenlik
- **Helmet**: HTTP güvenlik başlıkları
- **Input Sanitization**: XSS saldırılarına karşı koruma

## 📧 Email Servisleri

### Desteklenen Email Türleri

1. **İletişim Formu Bildirimi**: Yeni form gönderimlerinde admin'e bildirim
2. **Hoş Geldin Emaili**: Yeni kullanıcı kaydında karşılama emaili
3. **Şifre Sıfırlama**: Şifre sıfırlama linki gönderimi

### Email Konfigürasyonu

Gmail kullanımı için:
- App Password oluşturun
- 2FA aktif olmalı
- `EMAIL_PASS` olarak App Password kullanın

## 🐛 Hata Ayıklama

### Loglar

Tüm hatalar console'a loglanır:
```bash
npm run dev
```

### Test Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Email test
curl -X POST http://localhost:5000/api/contact/test-email
```

## 📦 Production Deployment

### Environment Variables

Production için gerekli değişkenler:
```env
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=very_secure_secret_key
```

### PM2 ile Deployment

```bash
npm install -g pm2
pm2 start server.js --name "e-ihracat-api"
pm2 save
pm2 startup
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 Destek

Herhangi bir sorunuz için:
- Email: destek@e-ihracat-platform.com
- GitHub Issues: [Proje Issues](https://github.com/your-repo/issues)

---

**T.C. Ticaret Bakanlığı Destekli E-İhracat Tanıtım Destek Platformu**
