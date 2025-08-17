# 🚀 VERCEL DEPLOYMENT CHECKLIST - www.ihracatakademi.com

**Phase 2.8 Deployment Guide**

## ✅ **ADIM 1: GitHub Hazırlık** 
- [x] Tüm dosyalar commit edildi
- [x] GitHub'a push edildi  
- [x] Repository: `https://github.com/onreonA/kayseri-eihracat-platformu.git`
- [x] Latest commit: Phase 2.8 Documentation & Deployment Ready

## 🔗 **ADIM 2: Vercel-GitHub Bağlantısı**

### Vercel'de yapılacaklar:
1. **Vercel.com'a gidin** → https://vercel.com
2. **GitHub ile giriş yapın**
3. **"New Project" butonu**
4. **GitHub repository seçin:** `onreonA/kayseri-eihracat-platformu`
5. **Import Project**

### Otomatik tespit edilecek ayarlar:
```json
{
  "framework": "Next.js",
  "buildCommand": "npm run build", 
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

## 🌐 **ADIM 3: Domain Ayarları**

### Vercel Domain Setup:
1. **Project Settings** → **Domains**
2. **Add Domain**: `www.ihracatakademi.com`
3. **DNS Records** (Domain sağlayıcısında yapılacak):

```dns
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A  
Name: @ (root)
Value: 76.76.19.164 (Vercel IP)
```

## ⚙️ **ADIM 4: Environment Variables**

Vercel'de ayarlanacak environment variables:
```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
CUSTOM_KEY=ihracat-akademisi
APP_VERSION=2.8.0
```

## 🔍 **ADIM 5: Build & Deploy Test**

### Deploy öncesi kontrol:
- [x] `next.config.js` production ready
- [x] `vercel.json` configured  
- [x] Security headers configured
- [x] CORS settings correct
- [x] Image domains configured

### Deploy komutu:
```bash
# Vercel otomatik deploy yapacak, manuel olarak da yapılabilir:
npx vercel --prod
```

## ✅ **ADIM 6: Post-Deploy Verification**

Test edilecekler:
- [ ] Site loading: `https://www.ihracatakademi.com`
- [ ] Login functionality
- [ ] Multi-user system
- [ ] Permission guards
- [ ] Dashboard access
- [ ] Performance optimization
- [ ] Mobile responsiveness

## 🎯 **Phase 2.8 Features to Test:**

### Multi-User System:
- [ ] Master Admin login
- [ ] Admin dashboard
- [ ] Consultant management
- [ ] Company owner access
- [ ] Personnel management
- [ ] Permission-based UI

### Performance Features:
- [ ] Memory optimization active
- [ ] Cache system working
- [ ] Query optimization
- [ ] Fast page loads (<2s)

## 🛠️ **Troubleshooting**

### Common Issues:
1. **Build fails**: Check TypeScript errors
2. **Environment variables**: Verify all keys set
3. **Domain not working**: DNS propagation (24-48 hours)
4. **404 errors**: Check routing configuration

### Debug Commands:
```bash
# Local testing
npm run build
npm run start

# Vercel logs
npx vercel logs [deployment-url]
```

## 📞 **Support Contacts**
- Vercel Status: https://status.vercel.com
- Documentation: https://vercel.com/docs
- Next.js Deploy Guide: https://nextjs.org/docs/deployment

---

**🎉 SUCCESS CRITERIA:**
- ✅ Site accessible at www.ihracatakademi.com
- ✅ All Phase 2.8 features working
- ✅ Performance metrics met
- ✅ Security headers active
- ✅ Auto-deploy on GitHub push
