
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-services';

interface FormData {
  adSoyad: string;
  email: string;
  telefon: string;
  egitimDurumu: string;
  okulBolum: string;
  mezuniyetYili: string;
  ilgiAlanlari: string;
  aciklama: string;
  kvkkOnay: boolean;
}

export default function KariyerMerkeziPage() {
  const [activeTab, setActiveTab] = useState<'staj' | 'is'>('staj');
  const [formData, setFormData] = useState<FormData>({
    adSoyad: '',
    email: '',
    telefon: '',
    egitimDurumu: '',
    okulBolum: '',
    mezuniyetYili: '',
    ilgiAlanlari: '',
    aciklama: '',
    kvkkOnay: false,
  });
  const [ozgecmisFile, setOzgecmisFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);

  const egitimDurumuSecenekleri = [
    'Lise Mezunu',
    'Ön Lisans Öğrencisi',
    'Ön Lisans Mezunu',
    'Lisans Öğrencisi',
    'Lisans Mezunu',
    'Yüksek Lisans Öğrencisi',
    'Yüksek Lisans Mezunu',
    'Doktora Öğrencisi',
    'Doktora Mezunu',
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.adSoyad.trim()) newErrors.adSoyad = 'Ad soyad gerekli';
    if (!formData.email.trim()) newErrors.email = 'E-posta gerekli';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Geçerli e-posta girin';
    if (!formData.telefon.trim()) newErrors.telefon = 'Telefon gerekli';
    if (!formData.egitimDurumu) newErrors.egitimDurumu = 'Eğitim durumu seçin';
    if (!formData.okulBolum.trim()) newErrors.okulBolum = 'Okul/Bölüm gerekli';
    if (!formData.mezuniyetYili.trim()) newErrors.mezuniyetYili = 'Mezuniyet yılı gerekli';
    if (!formData.ilgiAlanlari.trim()) newErrors.ilgiAlanlari = 'İlgi alanları gerekli';
    if (!formData.kvkkOnay) newErrors.kvkkOnay = 'KVKK onayı zorunlu';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checkbox.checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Sadece PDF dosyası yükleyebilirsiniz');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'tan küçük olmalıdır');
        return;
      }
      setOzgecmisFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      let ozgecmisUrl = null;

      if (ozgecmisFile && supabase) {
        const fileExt = ozgecmisFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ozgecmis-dosyalari')
          .upload(fileName, ozgecmisFile);

        if (uploadError) {
          console.error('Dosya yükleme hatası:', uploadError);
          throw new Error('Dosya yüklenemedi');
        }

        const { data: urlData } = supabase.storage
          .from('ozgecmis-dosyalari')
          .getPublicUrl(fileName);

        ozgecmisUrl = urlData.publicUrl;
      }

      const basvuruData = {
        basvuru_turu: activeTab === 'staj' ? 'Staj Başvurusu' : 'İş Başvurusu',
        ad_soyad: formData.adSoyad,
        email: formData.email,
        telefon: formData.telefon,
        egitim_durumu: formData.egitimDurumu,
        okul_bolum: formData.okulBolum,
        mezuniyet_yili: formData.mezuniyetYili,
        ilgi_alanlari: formData.ilgiAlanlari,
        aciklama: formData.aciklama || null,
        ozgecmis_url: ozgecmisUrl,
        kvkk_onay: formData.kvkkOnay,
      };

      if (supabase) {
        const { error: insertError } = await supabase
          .from('kariyer_basvurulari')
          .insert([basvuruData]);

        if (insertError) {
          console.error('Başvuru kaydetme hatası:', insertError);
          throw new Error('Başvuru kaydedilemedi');
        }
      }

      setSubmitStatus('success');

      // Formu sıfırla
      setFormData({
        adSoyad: '',
        email: '',
        telefon: '',
        egitimDurumu: '',
        okulBolum: '',
        mezuniyetYili: '',
        ilgiAlanlari: '',
        aciklama: '',
        kvkkOnay: false,
      });
      setOzgecmisFile(null);

      // Dosya input'unu sıfırla
      const fileInput = document.getElementById('ozgecmis') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Başvuru gönderme hatası:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Modern Header - Ana Sayfa ile Aynı */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Sol Taraf - Hamburger Menu */}
            <div className="flex items-center">
              <button
                onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}
                className="w-10 h-10 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer"
              >
                <i className="ri-menu-line text-2xl"></i>
              </button>
            </div>

            {/* Orta - Logo */}
            <div className="flex-1 flex justify-center">
              <Link href="/" className="flex items-center cursor-pointer">
                <img
                  src="https://static.readdy.ai/image/24aa2a118c1d89bdb327761b85495631/a135913a0f4bf368c862bb32d08543dd.png"
                  alt="İhracat Akademi Logo"
                  className="h-12 w-auto hover:scale-105 transition-transform duration-300"
                />
              </Link>
            </div>

            {/* Sağ Taraf - Kariyer Merkezi ve Giriş */}
            <div className="flex items-center space-x-4">
              <Link
                href="/kariyer-merkezi"
                className="hidden md:inline-flex text-blue-600 font-medium cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                Kariyer Merkezi
              </Link>

              {/* Giriş Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLoginDropdown(!showLoginDropdown)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 whitespace-nowrap cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span>Giriş</span>
                  <i className={`ri-arrow-down-s-line transition-transform duration-200 ${showLoginDropdown ? 'rotate-180' : ''}`}></i>
                </button>

                {/* Dropdown Menu */}
                {showLoginDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200/50 z-50">
                    <div className="py-2">
                      <Link
                        href="/login"
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-blue-50 transition-colors cursor-pointer text-gray-700 hover:text-blue-600"
                      >
                        <i className="ri-building-line"></i>
                        <span>Firma Girişi</span>
                      </Link>
                      <Link
                        href="/admin-login"
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-blue-50 transition-colors cursor-pointer text-gray-700 hover:text-blue-600"
                      >
                        <i className="ri-admin-line"></i>
                        <span>Admin Girişi</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hamburger Side Menu */}
        <div className={`fixed inset-0 z-50 ${isSideMenuOpen ? 'block' : 'hidden'}`}>
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSideMenuOpen(false)}
          ></div>

          {/* Side Menu */}
          <div className={`absolute left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-out ${isSideMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <img
                  src="https://static.readdy.ai/image/24aa2a118c1d89bdb327761b85495631/a135913a0f4bf368c862bb32d08543dd.png"
                  alt="İhracat Akademi Logo"
                  className="h-10 w-auto"
                />
                <button
                  onClick={() => setIsSideMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            <nav className="p-6 space-y-2 bg-white h-full overflow-y-auto">
              <Link
                href="/"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
              >
                <i className="ri-home-line"></i>
                <span>Ana Sayfa</span>
              </Link>

              <Link
                href="/#neden-katilmalisiniz"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
              >
                <i className="ri-question-line"></i>
                <span>Neden Katılmalısınız</span>
              </Link>

              <Link
                href="/#sagladigimiz-faydalar"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
              >
                <i className="ri-gift-line"></i>
                <span>Sağladığımız Faydalar</span>
              </Link>

              <Link
                href="/#basarilarimiz"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
              >
                <i className="ri-trophy-line"></i>
                <span>Başarılarımız</span>
              </Link>

              <Link
                href="/#proje-akisim"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
              >
                <i className="ri-flow-chart"></i>
                <span>Proje Akışım</span>
              </Link>

              {/* Platformum Submenu */}
              <div className="space-y-1 bg-white">
                <div className="flex items-center space-x-3 px-4 py-3 text-gray-700 font-medium bg-white">
                  <i className="ri-dashboard-line"></i>
                  <span>Platformum</span>
                </div>
                <div className="pl-10 space-y-1 bg-white">
                  <Link
                    href="/egitimlerim"
                    onClick={() => setIsSideMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-sm bg-white"
                  >
                    <i className="ri-graduation-cap-line"></i>
                    <span>Eğitimlerim</span>
                  </Link>
                  <Link
                    href="/forum"
                    onClick={() => setIsSideMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-sm bg-white"
                  >
                    <i className="ri-discuss-line"></i>
                    <span>Forum</span>
                  </Link>
                  <Link
                    href="/donem-raporlari"
                    onClick={() => setIsSideMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-sm bg-white"
                  >
                    <i className="ri-file-chart-line"></i>
                    <span>Raporlama</span>
                  </Link>
                  <Link
                    href="/destek-merkezi"
                    onClick={() => setIsSideMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-sm bg-white"
                  >
                    <i className="ri-customer-service-line"></i>
                    <span>Destek Merkezi</span>
                  </Link>
                </div>
              </div>

              <Link
                href="/#iletisim"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
              >
                <i className="ri-phone-line"></i>
                <span>İletişim</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Login Dropdown Overlay */}
        {showLoginDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowLoginDropdown(false)}
          ></div>
        )}
      </header>

      {/* Hero Section */}
      <div
        className="relative py-20 lg:py-32 overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: "url('https://readdy.ai/api/search-image?query=Modern%20corporate%20office%20environment%20with%20diverse%20professionals%20working%20together%20in%20a%20bright%2C%20innovative%20workspace%20featuring%20clean%20design%2C%20natural%20lighting%2C%20and%20collaborative%20atmosphere%20with%20technology%20integration%20and%20career%20growth%20symbolism&width=1920&height=600&seq=kariyer-hero&orientation=landscape')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/70 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
              Kariyer <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Merkezimiz</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              E-ihracat ekosisteminde yeteneklerinizi geliştirin ve kariyerinizi şekillendirin. Staj ve iş fırsatlarımızla geleceğinizi inşa edin.
            </p>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-3 text-blue-100">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="ri-briefcase-line text-sm"></i>
                </div>
                <span>İş Fırsatları</span>
              </div>
              <div className="flex items-center space-x-3 text-blue-100">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="ri-graduation-cap-line text-sm"></i>
                </div>
                <span>Staj Programları</span>
              </div>
              <div className="flex items-center space-x-3 text-blue-100">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="ri-rocket-line text-sm"></i>
                </div>
                <span>Kariyer Gelişimi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Tab Buttons */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-2 shadow-lg border border-white/20 inline-flex">
            <button
              onClick={() => setActiveTab('staj')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeTab === 'staj'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="ri-graduation-cap-line mr-2"></i>
              Staj Başvurusu
            </button>
            <button
              onClick={() => setActiveTab('is')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap cursor-pointer ${
                activeTab === 'is'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="ri-briefcase-line mr-2"></i>
              İş Başvurusu
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {activeTab === 'staj' ? '🎓 Staj Başvuru Formu' : '💼 İş Başvuru Formu'}
            </h2>
            <p className="text-gray-600">
              {activeTab === 'staj'
                ? 'Staj programımıza katılmak için aşağıdaki bilgileri doldurun.'
                : 'İş fırsatlarımız için başvurunuzu tamamlayın.'}
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="ri-check-line text-green-600"></i>
                </div>
                <div>
                  <h4 className="font-medium text-green-900">Başvurunuz Alındı!</h4>
                  <p className="text-green-700 text-sm">Başvurunuz başarıyla kaydedildi. En kısa sürede size dönüş yapacağız.</p>
                </div>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="ri-error-warning-line text-red-600"></i>
                </div>
                <div>
                  <h4 className="font-medium text-red-900">Başvuru Gönderilemedi</h4>
                  <p className="text-red-700 text-sm">Lütfen bilgileri kontrol edip tekrar deneyin.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kişisel Bilgiler */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="ri-user-line mr-2 text-blue-600"></i>
                Kişisel Bilgiler
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adSoyad" className="block text-sm font-medium text-gray-700 mb-2">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    id="adSoyad"
                    name="adSoyad"
                    value={formData.adSoyad}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                      errors.adSoyad ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    placeholder="Adınız ve soyadınız"
                  />
                  {errors.adSoyad && <p className="mt-1 text-sm text-red-600">{errors.adSoyad}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-posta *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    placeholder="ornek@email.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="telefon" className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    id="telefon"
                    name="telefon"
                    value={formData.telefon}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                      errors.telefon ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    placeholder="+90 5XX XXX XX XX"
                  />
                  {errors.telefon && <p className="mt-1 text-sm text-red-600">{errors.telefon}</p>}
                </div>

                <div>
                  <label htmlFor="egitimDurumu" className="block text-sm font-medium text-gray-700 mb-2">
                    Eğitim Durumu *
                  </label>
                  <div className="relative">
                    <select
                      id="egitimDurumu"
                      name="egitimDurumu"
                      value={formData.egitimDurumu}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm appearance-none bg-white pr-8 ${
                        errors.egitimDurumu ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Eğitim durumunu seçin</option>
                      {egitimDurumuSecenekleri.map((secenek) => (
                        <option key={secenek} value={secenek}>
                          {secenek}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-gray-400"></i>
                    </div>
                  </div>
                  {errors.egitimDurumu && <p className="mt-1 text-sm text-red-600">{errors.egitimDurumu}</p>}
                </div>
              </div>
            </div>

            {/* Eğitim Bilgileri */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="ri-school-line mr-2 text-green-600"></i>
                Eğitim Bilgileri
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="okulBolum" className="block text-sm font-medium text-gray-700 mb-2">
                    Okul/Bölüm *
                  </label>
                  <input
                    type="text"
                    id="okulBolum"
                    name="okulBolum"
                    value={formData.okulBolum}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                      errors.okulBolum ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    placeholder="Üniversite adı - Bölüm"
                  />
                  {errors.okulBolum && <p className="mt-1 text-sm text-red-600">{errors.okulBolum}</p>}
                </div>

                <div>
                  <label htmlFor="mezuniyetYili" className="block text-sm font-medium text-gray-700 mb-2">
                    Mezuniyet Yılı *
                  </label>
                  <input
                    type="text"
                    id="mezuniyetYili"
                    name="mezuniyetYili"
                    value={formData.mezuniyetYili}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                      errors.mezuniyetYili ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    placeholder="2024 veya 'Devam ediyor'"
                  />
                  {errors.mezuniyetYili && <p className="mt-1 text-sm text-red-600">{errors.mezuniyetYili}</p>}
                </div>
              </div>
            </div>

            {/* İlgi Alanları ve Açıklama */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="ri-lightbulb-line mr-2 text-purple-600"></i>
                İlgi Alanları ve Açıklama
              </h3>

              <div>
                <label htmlFor="ilgiAlanlari" className="block text-sm font-medium text-gray-700 mb-2">
                  İlgi Alanları *
                </label>
                <textarea
                  id="ilgiAlanlari"
                  name="ilgiAlanlari"
                  rows={3}
                  value={formData.ilgiAlanlari}
                  onChange={handleInputChange}
                  maxLength={500}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm ${
                    errors.ilgiAlanlari ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                  placeholder="E-ticaret, dijital pazarlama, veri analizi, proje yönetimi vb."
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.ilgiAlanlari && <p className="text-sm text-red-600">{errors.ilgiAlanlari}</p>}
                  <p className="text-sm text-gray-500 ml-auto">{formData.ilgiAlanlari.length}/500</p>
                </div>
              </div>

              <div>
                <label htmlFor="aciklama" className="block text-sm font-medium text-gray-700 mb-2">
                  Ek Açıklama (İsteğe bağlı)
                </label>
                <textarea
                  id="aciklama"
                  name="aciklama"
                  rows={4}
                  value={formData.aciklama}
                  onChange={handleInputChange}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm bg-white"
                  placeholder="Kendinizi tanıtın, hedeflerinizden bahsedin..."
                />
                <p className="text-sm text-gray-500 mt-1 text-right">{formData.aciklama.length}/500</p>
              </div>
            </div>

            {/* Dosya Yükleme */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="ri-file-upload-line mr-2 text-orange-600"></i>
                Özgeçmiş
              </h3>

              <div>
                <label htmlFor="ozgecmis" className="block text-sm font-medium text-gray-700 mb-2">
                  Özgeçmiş (PDF) - İsteğe bağlı
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="ozgecmis"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="ozgecmis"
                    className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors cursor-pointer bg-white flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="ri-upload-cloud-line text-blue-600 text-xl"></i>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">PDF dosyası yükleyin</p>
                      <p className="text-xs text-gray-500">Maksimum 5MB</p>
                    </div>
                  </label>
                  {ozgecmisFile && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <i className="ri-file-pdf-line text-red-600"></i>
                        <span className="text-sm text-green-800 font-medium">{ozgecmisFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setOzgecmisFile(null)}
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KVKK Onayı */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="ri-shield-check-line mr-2 text-red-600"></i>
                Kişisel Verilerin Korunması
              </h3>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-sm text-gray-700 mb-4">
                  <p className="font-medium mb-2">KVKK Aydınlatma Metni:</p>
                  <p>
                    6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, başvuru formunda paylaştığınız kişisel verileriniz
                    (ad, soyad, e-posta, telefon, eğitim bilgileri) yalnızca kariyer başvurunuzun değerlendirilmesi amacıyla
                    işlenecektir. Verileriniz üçüncü şahıslarla paylaşılmayacak ve güvenli şekilde saklanacaktır.
                  </p>
                </div>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="kvkkOnay"
                    checked={formData.kvkkOnay}
                    onChange={handleInputChange}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${errors.kvkkOnay ? 'text-red-600' : 'text-gray-700'}`}>
                    KVKK kapsamında kişisel verilerimin işlenmesini kabul ediyorum. *
                  </span>
                </label>
                {errors.kvkkOnay && <p className="mt-2 text-sm text-red-600">{errors.kvkkOnay}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  activeTab === 'staj'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                } text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Gönderiliyor...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <i className="ri-send-plane-line"></i>
                    <span>
                      {activeTab === 'staj' ? 'Staj Başvurusunu Gönder' : 'İş Başvurusunu Gönder'}
                    </span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
