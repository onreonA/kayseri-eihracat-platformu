# Kayseri E-İhracat Platformu

Modern bir B2B e-ihracat platformu. Next.js, Supabase ve Node.js ile geliştirilmiştir.

## 🚀 Özellikler

- **Admin Paneli**: Firma, proje, görev ve randevu yönetimi
- **Kullanıcı Paneli**: Proje takibi, forum, eğitimler
- **Gerçek Zamanlı**: Supabase ile dinamik veri yönetimi
- **Modern UI**: Responsive tasarım ve kullanıcı dostu arayüz

## 🛠️ Teknolojiler

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Veritabanı**: Supabase PostgreSQL
- **Deployment**: Vercel

## 📦 Kurulum

### Gereksinimler
- Node.js 18+ 
- npm veya yarn

### Yerel Geliştirme

1. Repository'yi klonlayın:
```bash
git clone <repository-url>
cd kayseri-eihracat-platformu
```

2. Bağımlılıkları yükleyin:
```bash
npm install
cd backend && npm install
```

3. Environment variables'ları ayarlayın:
```bash
# Root dizinde .env dosyası oluşturun:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:5001/api

# Backend dizininde .env dosyası oluşturun:
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
PORT=5001
```

4. Uygulamayı başlatın:
```bash
# Frontend (root dizinde)
npm run dev

# Backend (ayrı terminal)
cd backend && npm start
```

## 🌐 Production Deploy

Bu proje Vercel'de deploy edilebilir. Environment variables'ları Vercel dashboard'dan ayarlayın.

## 📝 Admin Girişi

**Email**: bilgi@omerfarukunsal.com  
**Şifre**: admin123

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje özel bir projedir.

---

**Geliştirici**: Ömer Faruk Ünsal  
**İletişim**: bilgi@omerfarukunsal.com🚀 Deployment test - Sun Aug 17 13:19:54 +03 2025
# Last updated: Sun Aug 17 21:31:18 +03 2025
