
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase-services';
import { DataCleanupService } from '../../../../lib/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AltProjeEkleClientProps {
  projeId: string;
}

export default function AltProjeEkleClient({ projeId }: AltProjeEkleClientProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [proje, setProje] = useState<any>(null);
  const [firmalar, setFirmalar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const router = useRouter();

  // Form durumları
  const [formData, setFormData] = useState({
    altProjeBasligi: '',
    aciklama: '',
    baslangicTarihi: '',
    bitisTarihi: '',
    atananFirmalar: [] as number[]
  });

  const [formErrors, setFormErrors] = useState<any>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Test verilerini temizle
      DataCleanupService.clearAllTestData();
      checkAdminAuth();
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted && isAdminLoggedIn && projeId) {
      loadSupabaseData();
    }
  }, [mounted, isAdminLoggedIn, projeId]);

  const checkAdminAuth = () => {
    try {
      console.log('🔐 Admin yetki kontrolü başlatılıyor...');

      if (typeof window === 'undefined') {
        console.log('⚠️ Window objesi mevcut değil');
        return;
      }

      const loggedIn = localStorage.getItem('isAdminLoggedIn');
      const email = localStorage.getItem('adminEmail');
      const role = localStorage.getItem('adminRole');

      console.log('📊 Admin giriş durumu:', { loggedIn, email, role });

      if (!loggedIn || loggedIn !== 'true' || role !== 'Yonetici') {
        console.log('❌ Admin yetkisi yok, login sayfasına yönlendiriliyor');
        router.push('/admin-login');
        return;
      }

      console.log('✅ Admin yetkisi doğrulandı');
      setIsAdminLoggedIn(true);
      setAdminEmail(email || '');
    } catch (error) {
      console.error('❌ Admin yetki kontrolü hatası:', error);
      setError('Yetki kontrolünde hata oluştu');
      setLoading(false);
    }
  };

  const loadSupabaseData = async () => {
    try {
      console.log('🎯 SUPABASE ENTEGRASYON: Alt proje ekleme verileri yükleniyor, Proje ID:', projeId);
      setLoading(true);
      setError(null);

      const numericProjeId = parseInt(projeId);
      if (isNaN(numericProjeId) || numericProjeId <= 0) {
        console.error('❌ Geçersiz proje ID:', projeId);
        setError(`Geçersiz proje ID: ${projeId}`);
        setLoading(false);
        return;
      }

      console.log('🔢 Numeric proje ID:', numericProjeId);

      // Ana proje detayını Supabase'den yükle
      console.log('📋 SUPABASE: Ana proje yükleniyor...');
      
      if (!supabase) {
        console.error('❌ Supabase client bulunamadı');
        setError('Supabase bağlantısı bulunamadı');
        setLoading(false);
        return;
      }

      const { data: projeData, error: projeError } = await supabase
        .from('projeler')
        .select(`
          id,
          proje_adi,
          aciklama,
          durum,
          oncelik,
          baslangic_tarihi,
          bitis_tarihi,
          hedef_firmalar,
          created_at
        `)
        .eq('id', numericProjeId)
        .single();

      if (projeError) {
        console.error('❌ SUPABASE: Proje sorgu hatası:', projeError);
        setError(`Proje bulunamadı: ${projeError.message}`);
        setLoading(false);
        return;
      }

      if (!projeData) {
        console.error('❌ SUPABASE: Proje bulunamadı, ID:', numericProjeId);
        setError(`ID ${numericProjeId} ile proje bulunamadı. Bu proje silinmiş olabilir veya erişim yetkiniz bulunmayabilir.`);
        setLoading(false);
        return;
      }

      console.log('✅ SUPABASE: Ana proje detayları yüklendi:', projeData.proje_adi);
      
      // Proje verisini format et
      const formattedProje = {
        id: projeData.id,
        projeAdi: projeData.proje_adi,
        aciklama: projeData.aciklama || '',
        durum: projeData.durum || 'Aktif',
        oncelik: projeData.oncelik || 'Orta',
        baslangicTarihi: projeData.baslangic_tarihi,
        bitisTarihi: projeData.bitis_tarihi,
        atananFirmalar: Array.isArray(projeData.hedef_firmalar) ? projeData.hedef_firmalar : [],
        created_at: projeData.created_at
      };

      setProje(formattedProje);

      // Supabase'den direkt firma listesini yükle
      console.log('🏢 SUPABASE: Firmalar tablosundan aktif firmalar yükleniyor...');

      const { data: supabaseFirmalar, error: firmaError } = await supabase
        .from('firmalar')
        .select(`
          id,
          firma_adi,
          yetkili_email,
          telefon,
          adres,
          sektor,
          durum,
          created_at
        `)
        .eq('durum', 'Aktif')
        .order('firma_adi', { ascending: true });

      if (firmaError) {
        console.error('❌ SUPABASE: Firmalar sorgusu hatası:', firmaError);
        setSupabaseConnected(false);
        setFirmalar([]);
      } else {
        if (!supabaseFirmalar || supabaseFirmalar.length === 0) {
          console.warn('⚠️ SUPABASE: Aktif firma bulunamadı');
          setSupabaseConnected(true);
          setFirmalar([]);
        } else {
          console.log(`✅ SUPABASE: ${supabaseFirmalar.length} aktif firma yüklendi`);

          // Frontend formatına dönüştür
          const formattedFirmalar = supabaseFirmalar.map((firma: any) => ({
            id: firma.id,
            adi: firma.firma_adi || 'İsim Belirtilmemiş',
            email: firma.yetkili_email || 'Email Belirtilmemiş',
            telefon: firma.telefon || 'Telefon Belirtilmemiş',
            adres: firma.adres || 'Adres Belirtilmemiş',
            sektor: firma.sektor || 'Sektor Belirtilmemiş',
            durum: firma.durum,
            kayitTarihi: firma.created_at ? new Date(firma.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'
          }));

          console.log('🔄 FORMATTED: Firmalar başarıyla formatlandı:', formattedFirmalar.length);
          setFirmalar(formattedFirmalar);
          setSupabaseConnected(true);
        }
      }

      // Form için varsayılan değerleri ayarla
      const today = new Date().toISOString().split('T')[0];
      const endDate = formattedProje.bitisTarihi ? new Date(formattedProje.bitisTarihi).toISOString().split('T')[0] : '';

      setFormData(prev => ({
        ...prev,
        baslangicTarihi: today,
        bitisTarihi: endDate,
        atananFirmalar: formattedProje.atananFirmalar || []
      }));

    } catch (error) {
      console.error('❌ SUPABASE: Veri yükleme sistem hatası:', error);
      setError(`Veriler yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Hata varsa temizle
    if (formErrors[name]) {
      setFormErrors((prev: any) => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleFirmaChange = (firmaId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      atananFirmalar: checked
        ? [...prev.atananFirmalar, firmaId]
        : prev.atananFirmalar.filter(id => id !== firmaId)
    }));

    if (formErrors.atananFirmalar) {
      setFormErrors((prev: any) => ({
        ...prev,
        atananFirmalar: null
      }));
    }
  };

  const validateForm = () => {
    const errors: any = {};

    if (!formData.altProjeBasligi.trim()) {
      errors.altProjeBasligi = 'Alt proje başlığı gereklidir';
    } else if (formData.altProjeBasligi.trim().length < 3) {
      errors.altProjeBasligi = 'Alt proje başlığı en az 3 karakter olmalıdır';
    }

    if (!formData.aciklama.trim()) {
      errors.aciklama = 'Açıklama gereklidir';
    } else if (formData.aciklama.trim().length < 10) {
      errors.aciklama = 'Açıklama en az 10 karakter olmalıdır';
    }

    if (!formData.baslangicTarihi) {
      errors.baslangicTarihi = 'Başlangıç tarihi gereklidir';
    }

    if (!formData.bitisTarihi) {
      errors.bitisTarihi = 'Bitiş tarihi gereklidir';
    }

    if (formData.baslangicTarihi && formData.bitisTarihi) {
      const baslangic = new Date(formData.baslangicTarihi);
      const bitis = new Date(formData.bitisTarihi);

      if (bitis <= baslangic) {
        errors.bitisTarihi = 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır';
      }
    }

    if (formData.atananFirmalar.length === 0) {
      errors.atananFirmalar = 'En az bir firma atanmalıdır';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log('❌ Form validasyon hatası');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      console.log('🎯 SUPABASE: Alt proje Supabase\'e kaydediliyor...', formData);

      if (!supabase) {
        throw new Error('Supabase bağlantısı bulunamadı');
      }

      // Direkt Supabase client ile alt_projeler tablosuna kaydet
      const altProjeData = {
        ana_proje_id: parseInt(projeId),
        alt_proje_adi: formData.altProjeBasligi.trim(),
        aciklama: formData.aciklama.trim(),
        durum: 'Aktif',
        oncelik: 'Orta',
        baslangic_tarihi: formData.baslangicTarihi,
        bitis_tarihi: formData.bitisTarihi,
        atanan_firmalar: formData.atananFirmalar,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🔧 SUPABASE: Alt proje data hazırlandı:', altProjeData);

      const { data: result, error: insertError } = await supabase
        .from('alt_projeler')
        .insert([altProjeData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ SUPABASE: Alt proje ekleme hatası:', insertError);
        
        // Kullanıcı dostu hata mesajları
        let userFriendlyMessage = 'Alt proje oluşturulurken hata oluştu.';
        
        if (insertError.code === '23505') {
          userFriendlyMessage = 'Bu isimde bir alt proje zaten mevcut. Lütfen farklı bir isim seçin.';
        } else if (insertError.code === '23503') {
          userFriendlyMessage = 'Ana proje bulunamadı. Sayfa yenilenerek tekrar deneyin.';
        } else if (insertError.code === '42501') {
          userFriendlyMessage = 'Bu işlem için yetkiniz bulunmuyor. Lütfen yönetici ile iletişime geçin.';
        } else if (insertError.message) {
          userFriendlyMessage += ` Detay: ${insertError.message}`;
        }
        
        throw new Error(userFriendlyMessage);
      }

      if (result && result.id) {
        console.log('✅ SUPABASE: Alt proje başarıyla oluşturuldu:', result);

        // Başarı mesajı göster
        alert('Alt proje başarıyla oluşturuldu ve Supabase\'e kaydedildi!');

        // Proje detay sayfasına yönlendir
        router.push(`/admin-proje-yonetimi/detay/${projeId}`);
      } else {
        console.error('❌ Alt proje oluşturma başarısız - result:', result);
        setError('Alt proje oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error: any) {
      console.error('❌ SUPABASE: Alt proje kaydetme sistem hatası:', error);

      let errorMessage = 'Alt proje kaydedilirken hata oluştu.';

      if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    // Çıkış yaparken tüm test verilerini temizle
    DataCleanupService.clearAllTestData();
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/admin-login');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Sistem hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Admin yetki kontrolü yapılıyor...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Supabase veritabanından veriler yükleniyor...</p>
          <p className="text-sm text-slate-400 mt-2">Proje ID: {projeId}</p>
          <div className="mt-4 space-y-1">
            <div className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2 animate-pulse"></div>
            <span className="text-sm text-slate-400">Projeler tablosu sorgulanıyor</span>
          </div>
          <div className="mt-1 space-y-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full inline-block mr-2 animate-pulse"></div>
            <span className="text-sm text-slate-400">Firmalar tablosu sorgulanıyor</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <i className="ri-error-warning-line text-2xl text-red-400"></i>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Hata Oluştu</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                loadSupabaseData();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <i className="ri-refresh-line mr-2"></i>
              Tekrar Dene
            </button>
            <Link
              href={`/admin-proje-yonetimi/detay/${projeId}`}
              className="w-full inline-block text-center bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Proje Detayına Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!proje) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <i className="ri-file-search-line text-2xl text-yellow-400"></i>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Proje Bulunamadı</h2>
          <p className="text-slate-300 mb-6">ID {projeId} ile proje bulunamadı veya erişim yetkisi yok.</p>
          <Link
            href="/admin-proje-yonetimi"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Proje Listesine Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-white cursor-pointer font-[\'Pacifico\']">
                logo
              </Link>
              <div className="flex items-center space-x-2 text-slate-300">
                <Link href="/admin-proje-yonetimi" className="hover:text-white cursor-pointer">
                  Proje Yönetimi
                </Link>
                <span className="text-slate-500">/</span>
                <Link href={`/admin-proje-yonetimi/detay/${projeId}`} className="hover:text-white cursor-pointer">
                  {proje.projeAdi}
                </Link>
                <span className="text-slate-500">/</span>
                <span className="text-white font-medium">Alt Proje Ekle</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {supabaseConnected && (
                <span className="px-3 py-1 text-sm bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                  <span className="w-2 h-2 bg-green-400 rounded-full inline-block mr-2"></span>
                  Supabase Bağlı
                </span>
              )}
              {!supabaseConnected && (
                <span className="px-3 py-1 text-sm bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
                  <span className="w-2 h-2 bg-red-400 rounded-full inline-block mr-2"></span>
                  Supabase Bağlantı Yok
                </span>
              )}
              <span className="text-slate-300">{adminEmail}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600/80 backdrop-blur-sm hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600/80 to-blue-600/80 backdrop-blur-sm rounded-2xl p-6 text-white border border-white/10">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <i className="ri-add-circle-line text-2xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Yeni Alt Proje Oluştur</h1>
                <p className="text-purple-100 mt-1">
                  <strong>{proje.projeAdi}</strong> projesi için alt proje (milestone/modül) ekleyin
                </p>
                <div className="flex items-center mt-2 space-x-4">
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    🗂️ Supabase ID: {proje.id}
                  </span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    📊 {firmalar.length} Aktif Firma
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Alt Proje Başlığı */}
              <div>
                <label htmlFor="altProjeBasligi" className="block text-sm font-medium text-slate-200 mb-2">
                  <i className="ri-folder-line mr-2 text-purple-400"></i>
                  Alt Proje Başlığı *
                </label>
                <input
                  type="text"
                  id="altProjeBasligi"
                  name="altProjeBasligi"
                  value={formData.altProjeBasligi}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-white placeholder-slate-400 ${
                    formErrors.altProjeBasligi ? 'border-red-500 bg-red-500/10' : 'border-white/20'
                  }`}
                  placeholder="Örnek: Platform Entegrasyonu, UI/UX Tasarım"
                  disabled={saving}
                />
                {formErrors.altProjeBasligi && (
                  <p className="mt-1 text-sm text-red-400">
                    <i className="ri-error-warning-line mr-1"></i>
                    {formErrors.altProjeBasligi}
                  </p>
                )}
              </div>

              {/* Açıklama */}
              <div>
                <label htmlFor="aciklama" className="block text-sm font-medium text-slate-200 mb-2">
                  <i className="ri-file-text-line mr-2 text-blue-400"></i>
                  Alt Proje Açıklaması *
                </label>
                <textarea
                  id="aciklama"
                  name="aciklama"
                  rows={4}
                  value={formData.aciklama}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-white placeholder-slate-400 ${
                    formErrors.aciklama ? 'border-red-500 bg-red-500/10' : 'border-white/20'
                  }`}
                  placeholder="Alt projenin detaylı açıklamasını yazın..."
                  disabled={saving}
                />
                {formErrors.aciklama && (
                  <p className="mt-1 text-sm text-red-400">
                    <i className="ri-error-warning-line mr-1"></i>
                    {formErrors.aciklama}
                  </p>
                )}
              </div>

              {/* Supabase Firmalar Bölümü */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-3">
                  <i className="ri-building-line mr-2 text-green-400"></i>
                  Atanacak Firmalar * 
                  <span className="text-xs text-slate-400 ml-2">
                    (Supabase Firmalar Tablosu)
                  </span>
                </label>
                <div className={`bg-white/5 backdrop-blur-sm border rounded-xl p-4 max-h-64 overflow-y-auto ${
                  formErrors.atananFirmalar ? 'border-red-500 bg-red-500/10' : 'border-white/20'
                }`}>
                  {firmalar.length > 0 ? (
                    <div className="space-y-3">
                      {firmalar.map((firma) => (
                        <div key={firma.id} className="flex items-start space-x-3 p-4 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-colors border border-white/10">
                          <input
                            type="checkbox"
                            id={`firma-${firma.id}`}
                            checked={formData.atananFirmalar.includes(firma.id)}
                            onChange={(e) => handleFirmaChange(firma.id, e.target.checked)}
                            className="mt-1 h-4 w-4 text-purple-600 border-white/30 rounded focus:ring-purple-500 bg-white/10"
                            disabled={saving}
                          />
                          <label htmlFor={`firma-${firma.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-white flex items-center">
                              <i className="ri-database-2-line text-green-400 mr-2"></i>
                              {firma.adi}
                              <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                                ID:{firma.id}
                              </span>
                            </div>
                            <div className="text-sm text-slate-300 mt-1">
                              <i className="ri-mail-line mr-1 text-blue-400"></i>
                              {firma.email}
                              {firma.telefon && firma.telefon !== 'Telefon Belirtilmemiş' && (
                                <>
                                  <span className="mx-2">•</span>
                                  <i className="ri-phone-line mr-1 text-green-400"></i>
                                  {firma.telefon}
                                </>
                              )}
                            </div>
                            {firma.adres && firma.adres !== 'Adres Belirtilmemiş' && (
                              <div className="text-sm text-slate-400 mt-1">
                                <i className="ri-map-pin-line mr-1 text-orange-400"></i>
                                {firma.adres}
                              </div>
                            )}
                            <div className="text-xs text-slate-400 mt-1">
                              <i className="ri-calendar-line mr-1"></i>
                              Kayıt: {firma.kayitTarihi}
                              <span className="mx-2">•</span>
                              <i className="ri-building-2-line mr-1"></i>
                              {firma.sektor}
                            </div>
                          </label>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                            ✅ {firma.durum}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <i className="ri-database-2-line text-3xl mb-2 text-red-400"></i>
                      <p className="font-medium text-white">Supabase'de aktif firma bulunamadı</p>
                      <p className="text-sm">Firmalar tablosunu kontrol edin</p>
                      <button
                        type="button"
                        onClick={() => loadSupabaseData()}
                        className="mt-2 text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors cursor-pointer"
                      >
                        🔄 Yenile
                      </button>
                    </div>
                  )}
                </div>
                {formErrors.atananFirmalar && (
                  <p className="mt-2 text-sm text-red-400">
                    <i className="ri-error-warning-line mr-1"></i>
                    {formErrors.atananFirmalar}
                  </p>
                )}
                <div className="mt-2 text-sm text-slate-400">
                  <i className="ri-information-line mr-1 text-blue-400"></i>
                  {formData.atananFirmalar.length} firma seçildi
                  {firmalar.length > 0 && ` (Toplam ${firmalar.length} aktif firma)`}
                  <span className="ml-2 text-green-400">• Supabase Canlı Veri</span>
                </div>
              </div>

              {/* Tarih Aralığı */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="baslangicTarihi" className="block text-sm font-medium text-slate-200 mb-2">
                    <i className="ri-calendar-line mr-2 text-green-400"></i>
                    Başlangıç Tarihi *
                  </label>
                  <input
                    type="date"
                    id="baslangicTarihi"
                    name="baslangicTarihi"
                    value={formData.baslangicTarihi}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-white ${
                      formErrors.baslangicTarihi ? 'border-red-500 bg-red-500/10' : 'border-white/20'
                    }`}
                    disabled={saving}
                  />
                  {formErrors.baslangicTarihi && (
                    <p className="mt-1 text-sm text-red-400">
                      <i className="ri-error-warning-line mr-1"></i>
                      {formErrors.baslangicTarihi}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="bitisTarihi" className="block text-sm font-medium text-slate-200 mb-2">
                    <i className="ri-calendar-check-line mr-2 text-red-400"></i>
                    Bitiş Tarihi *
                  </label>
                  <input
                    type="date"
                    id="bitisTarihi"
                    name="bitisTarihi"
                    value={formData.bitisTarihi}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 bg-white/10 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-white ${
                      formErrors.bitisTarihi ? 'border-red-500 bg-red-500/10' : 'border-white/20'
                    }`}
                    disabled={saving}
                  />
                  {formErrors.bitisTarihi && (
                    <p className="mt-1 text-sm text-red-400">
                      <i className="ri-error-warning-line mr-1"></i>
                      {formErrors.bitisTarihi}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-white/10 pt-6">
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer ${
                      saving
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:from-purple-700 hover:to-blue-700 focus:ring-2 focus:ring-purple-500'
                    }`}
                  >
                    {saving ? (
                      <>
                        <i className="ri-loader-4-line mr-2 animate-spin"></i>
                        Supabase'e Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <i className="ri-database-2-line mr-2"></i>
                        Alt Projeyi Supabase'e Kaydet
                      </>
                    )}
                  </button>

                  <Link
                    href={`/admin-proje-yonetimi/detay/${projeId}`}
                    className="flex-1 bg-slate-600/80 backdrop-blur-sm hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-colors text-center cursor-pointer"
                  >
                    <i className="ri-arrow-left-line mr-2"></i>
                    İptal Et
                  </Link>
                </div>
              </div>
            </form>
          </div>

          {/* Form Alt Bilgi */}
          <div className="border-t border-white/10 px-6 py-4 bg-black/20 backdrop-blur-sm rounded-b-2xl">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                {supabaseConnected && (
                  <span className="text-green-400 flex items-center">
                    <i className="ri-database-2-line mr-1"></i>
                    ✅ Supabase Firmalar Tablosu Bağlı
                  </span>
                )}
                {!supabaseConnected && (
                  <span className="text-red-400 flex items-center">
                    <i className="ri-database-2-line mr-1"></i>
                    ❌ Supabase Bağlantı Hatası
                  </span>
                )}
              </div>
              <div className="text-slate-400">
                Proje ID: {projeId} • Alt Projeler Tablosu: alt_projeler
              </div>
            </div>
          </div>
        </div>

        {/* Bilgi Kutusu */}
        <div className="mt-6 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="ri-information-line text-blue-400 text-sm"></i>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-300 mb-1">Alt Proje ve Supabase Entegrasyonu</h4>
              <p className="text-blue-200 text-sm">
                Alt projeler (milestone/modül), ana projenin daha küçük ve yönetilebilir parçalarıdır. Her alt proje kendi görevlerine sahip
                olacak ve ilerleme durumu takip edilebilecektir. Bu sayfa tamamen Supabase <strong>alt_projeler</strong> ve <strong>firmalar</strong> 
                tablolarından veri çeker. Test verileri temizlenmiştir.
              </p>
              <div className="mt-2 text-xs text-slate-400">
                💾 Veriler: alt_projeler tablosu • 🏢 Firmalar: firmalar tablosu (durum=Aktif)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
