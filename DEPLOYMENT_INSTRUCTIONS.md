# 🚀 İhracat Akademisi - Manuel Vercel Deployment

## **HIZLI DEPLOYMENT REHBERİ**

### **ADIM 1: Vercel Dashboard'a Git**
1. https://vercel.com adresine git
2. GitHub hesabınla giriş yap
3. "Add New Project" butonuna tıkla

### **ADIM 2: GitHub Repo'yu Import Et**
1. "Import Git Repository" seç
2. GitHub'dan `kayseri-eihracat-platformu` repo'sunu seç
3. Import et

### **ADIM 3: Deployment Settings**
```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### **ADIM 4: Environment Variables (Önemli!)**
Vercel dashboard'da şu environment variable'ları ekle:

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# App Config
NEXT_PUBLIC_APP_NAME=İhracat Akademisi
NEXT_PUBLIC_APP_URL=https://www.ihracatakademi.com
NODE_ENV=production

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_2024
NEXTAUTH_SECRET=your_nextauth_secret_2024
NEXTAUTH_URL=https://www.ihracatakademi.com
```

### **ADIM 5: Custom Domain Setup**
1. Vercel Project Settings > Domains
2. "www.ihracatakademi.com" ekle
3. DNS records'ı yapılandır:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### **ADIM 6: Deploy!**
- "Deploy" butonuna tıkla
- 2-3 dakika bekle
- ✅ Live URL: https://your-project.vercel.app

## **🎉 DEPLOYMENT TAMAMLANDI!**

### **Son Kontroller:**
- [ ] Site açılıyor mu?
- [ ] Admin login çalışıyor mu?
- [ ] Database bağlantısı OK mi?
- [ ] SSL certificate active mi?

### **Post-Deployment:**
1. Supabase production database'ini setup et
2. Admin user oluştur
3. DNS propagation'ını bekle (24 saat)
4. Performance monitoring setup et

**🔥 READY TO GO: www.ihracatakademi.com**
