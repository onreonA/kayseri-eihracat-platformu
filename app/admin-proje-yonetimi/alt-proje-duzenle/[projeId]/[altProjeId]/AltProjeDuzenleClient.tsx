'use client';

import { useState, useEffect } from 'react';
import { SupabaseProjeService, SupabaseFirmaService, supabase } from '../../../../../lib/supabase-services';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AltProjeDuzenleClientProps {
  projeId: string;
  altProjeId: string;
}

export default function AltProjeDuzenleClient({ projeId, altProjeId }: AltProjeDuzenleClientProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [proje, setProje] = useState<any>(null);
  const [altProje, setAltProje] = useState<any>(null);
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
    durum: 'Aktif',
    atananFirmalar: [] as number[]
  });

  const [formErrors, setFormErrors] = useState<any>({});

  const durumOptions = [
    { value: 'Aktif', label: 'Aktif', color: 'bg-green-100 text-green-800' },
    { value: 'Pasif', label: 'Pasif', color: 'bg-red-100 text-red-800' },
    { value: 'Tamamlandı', label: 'Tamamlandı', color: 'bg-blue-100 text-blue-800' }
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkAdminAuth();
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted && isAdminLoggedIn && projeId && altProjeId) {
      loadInitialData();
    }
  }, [mounted, isAdminLoggedIn, projeId, altProjeId]);

  const checkAdminAuth = () => {
    try {
      console.log('🔐 ULTIMATE FIX: Admin yetki kontrolü başlatılıyor...');

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

  const loadInitialData = async () => {
    try {
      console.log('🎯 ULTIMATE FIX: Alt proje düzenleme verileri yükleniyor...', {
        projeId,
        altProjeId
      });
      setLoading(true);
      setError(null);

      const numericProjeId = parseInt(projeId);
      const numericAltProjeId = parseInt(altProjeId);

      if (isNaN(numericProjeId) || numericProjeId <= 0 || isNaN(numericAltProjeId) || numericAltProjeId <= 0) {
        console.error('❌ Geçersiz ID\'ler:', { projeId, altProjeId });
        setError(`Geçersiz ID'ler: Proje ${projeId}, Alt Proje ${altProjeId}`);
        setLoading(false);
        return;
      }

      console.log('🔢 Numeric ID\'ler:', { numericProjeId, numericAltProjeId });

      // 🎯 ULTIMATE FIX: Ana proje detayını Supabase'den yükle
      console.log('📋 ULTIMATE FIX: Ana proje Supabase\'den yükleniyor...');
      const projeDetay = await SupabaseProjeService.getProjeById(numericProjeId);

      if (!projeDetay) {
        console.error('❌ Ana proje bulunamadı, ID:', numericProjeId);
        setError(`ID ${numericProjeId} ile ana proje bulunamadı.`);
        setLoading(false);
        return;
      }

      console.log('✅ SUPABASE: Ana proje detayları yüklendi:', projeDetay.projeAdi);
      setProje(projeDetay);

      // 🎯 ULTIMATE FIX: Alt proje detaylarını Supabase'den yükle
      console.log('📂 ULTIMATE FIX: Alt proje detayları yükleniyor...');
      
      try {
        const { data: altProjeData, error: altProjeError } = await supabase
          .from('alt_projeler')
          .select(`
            id,
            ana_proje_id,
            alt_proje_adi,
            aciklama,
            durum,
            oncelik,
            baslangic_tarihi,
            bitis_tarihi,
            created_at,
            updated_at
          `)
          .eq('id', numericAltProjeId)
          .eq('ana_proje_id', numericProjeId)
          .single();

        if (altProjeError) {
          console.error('❌ Alt proje yükleme hatası:', altProjeError);
          if (altProjeError.code === 'PGRST116') {
            setError(`ID ${numericAltProjeId} ile alt proje bulunamadı.`);
          } else {
            setError(`Alt proje yüklenirken hata oluştu: ${altProjeError.message}`);
          }
          setLoading(false);
          return;
        }

        if (!altProjeData) {
          console.error('❌ Alt proje verisi null');
          setError('Alt proje bilgileri alınamadı.');
          setLoading(false);
          return;
        }

        console.log('✅ SUPABASE: Alt proje detayları yüklendi:', altProjeData.alt_proje_adi);

        setAltProje(altProjeData);

        // Form verilerini doldur
        setFormData({
          altProjeBasligi: altProjeData.alt_proje_adi || '',
          aciklama: altProjeData.aciklama || '',
          baslangicTarihi: altProjeData.baslangic_tarihi ? new Date(altProjeData.baslangic_tarihi).toISOString().split('T')[0] : '',
          bitisTarihi: altProjeData.bitis_tarihi ? new Date(altProjeData.bitis_tarihi).toISOString().split('T')[0] : '',
          durum: altProjeData.durum || 'Aktif',
          atananFirmalar: [] // Alt proje için firma ataması varsa buraya eklenebilir
        });

      } catch (altProjeLoadError) {
        console.error('❌ Alt proje yükleme sistem hatası:', altProjeLoadError);
        setError('Alt proje bilgileri yüklenirken sistem hatası oluştu.');
        setLoading(false);
        return;
      }

      // 🔧 ULTIMATE FIX: Supabase'den gerçek firma listesini yükle
      console.log('🏢 ULTIMATE FIX: Supabase\'den aktif firmalar yükleniyor...');

      try {
        const supabaseFirmalar = await SupabaseFirmaService.getAllFirmalar();

        if (supabaseFirmalar && supabaseFirmalar.length > 0) {
          console.log(`✅ SUPABASE: ${supabaseFirmalar.length} firma başarıyla yüklendi`);

          const formattedFirmalar = supabaseFirmalar
            .filter(firma => firma.durum === 'Aktif')
            .map(firma => ({
              id: firma.id,
              adi: firma.firma_adi,
              email: firma.yetkili_email,
              telefon: firma.telefon || 'Belirtilmemiş',
              adres: firma.adres || 'Belirtilmemiş',
              durum: firma.durum
            }));

          console.log(`🔄 FORMATTED: ${formattedFirmalar.length} aktif firma formatlandı`);
          setFirmalar(formattedFirmalar);
          setSupabaseConnected(true);

        } else {
          console.warn('⚠️ Supabase\'de firma bulunamadı, mock data kullanılacak');
          setFirmalar(getMockFirmalar());
          setSupabaseConnected(false);
        }
      } catch (firmaError) {
        console.error('❌ Firma yükleme hatası:', firmaError);
        console.log('🔄 Fallback: Mock firma verileri kullanılıyor');
        setFirmalar(getMockFirmalar());
        setSupabaseConnected(false);
      }

    } catch (error: any) {
      console.error('❌ Veri yükleme hatası:', error);
      setError(`Veriler yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  const getMockFirmalar = () => {
    return [
      {
        id: 1,
        adi: 'Teknoloji A.Ş.',
        email: 'admin@teknoloji.com',
        telefon: '+90 212 555 0001',
        adres: 'İstanbul',
        durum: 'Aktif'
      },
      {
        id: 2,
        adi: 'Demo Kullanıcı B',
        email: 'demo@example.com',
        telefon: '+90 212 555 0002',
        adres: 'Ankara',
        durum: 'Aktif'
      },
      {
        id: 3,
        adi: 'Test Firma C',
        email: 'test@example.com',
        telefon: '+90 212 555 0003',
        adres: 'İzmir',
        durum: 'Aktif'
      },
      {
        id: 6,
        adi: 'Ömer Faruk Ünsal',
        email: 'bilgi@omerfarukunsal.com',
        telefon: '+90 212 555 0006',
        adres: 'İstanbul',
        durum: 'Aktif'
      }
    ];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

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

    if (!formData.durum) {
      errors.durum = 'Durum seçimi gereklidir';
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
      console.log('🎯 ULTIMATE FIX: Alt proje Supabase\'e güncelleniyor...', formData);

      const numericAltProjeId = parseInt(altProjeId);

      // 🎯 ULTIMATE FIX: Supabase ile alt proje güncelle
      const { error: updateError } = await supabase
        .from('alt_projeler')
        .update({
          alt_proje_adi: formData.altProjeBasligi.trim(),
          aciklama: formData.aciklama.trim(),
          durum: formData.durum,
          baslangic_tarihi: formData.baslangicTarihi,
          bitis_tarihi: formData.bitisTarihi,
          updated_at: new Date().toISOString()
        })
        .eq('id', numericAltProjeId);

      if (updateError) {
        console.error('❌ ULTIMATE FIX: Alt proje güncelleme hatası:', updateError);
        throw new Error(`Alt proje güncellenirken hata oluştu: ${updateError.message}`);
      }

      console.log('✅ SUPABASE: Alt proje başarıyla güncellendi');

      // Başarı mesajı göster
      alert('Alt proje başarıyla güncellendi!');

      // Proje detay sayfasına yönlendir
      router.push(`/admin-proje-yonetimi/detay/${projeId}`);

    } catch (error: any) {
      console.error('❌ ULTIMATE FIX: Alt proje güncelleme hatası:', error);

      let errorMessage = 'Alt proje güncellenirken hata oluştu.';

      if (error.message) {
        errorMessage += ` Detay: ${error.message}`;
      }

      if (error.message && error.message.includes('duplicate')) {
        errorMessage = 'Bu isimde bir alt proje zaten mevcut. Lütfen farklı bir isim seçin.';
      } else if (error.message && error.message.includes('foreign key')) {
        errorMessage = 'Ana proje bulunamadı. Sayfa yenilenerek tekrar deneyin.';
      } else if (error.message && error.message.includes('permission')) {
        errorMessage = 'Bu işlem için yetkiniz bulunmuyor. Lütfen yönetici ile iletişime geçin.';
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/admin-login');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sistem hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Admin yetki kontrolü yapılıyor...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Alt proje verileri Supabase'den yükleniyor...</p>
          <p className="text-sm text-gray-500 mt-2">Proje ID: {projeId}, Alt Proje ID: {altProjeId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <i className="ri-error-warning-line text-2xl text-red-600"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Hata Oluştu</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                loadInitialData();
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <i className="ri-refresh-line mr-2"></i>
              Tekrar Dene
            </button>
            <Link
              href={`/admin-proje-yonetimi/detay/${projeId}`}
              className="w-full inline-block text-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Proje Detayına Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!proje || !altProje) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <i className="ri-file-search-line text-2xl text-yellow-600"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Veri Bulunamadı</h2>
          <p className="text-gray-600 mb-6">Proje veya alt proje verileri bulunamadı.</p>
          <Link
            href="/admin-proje-yonetimi"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Proje Listesine Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-[\'Pacifico\']">
                logo
              </Link>
              <div className="flex items-center space-x-2 text-gray-600">
                <Link href="/admin-proje-yonetimi" className="hover:text-blue-600 cursor-pointer">
                  Proje Yönetimi
                </Link>
                <span className="text-gray-400">/</span>
                <Link href={`/admin-proje-yonetimi/detay/${projeId}`} className="hover:text-blue-600 cursor-pointer">
                  {proje.projeAdi}
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Alt Proje Düzenle</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {supabaseConnected && (
                <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>
                  Supabase
                </span>
              )}
              {!supabaseConnected && (
                <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-full">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full inline-block mr-2"></span>
                  Mock Data
                </span>
              )}
              <span className="text-gray-600">{adminEmail}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
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
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <i className="ri-edit-box-line text-2xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Alt Proje Düzenle</h1>
                <p className="text-orange-100 mt-1">
                  <strong>{proje.projeAdi}</strong> projesi - <strong>{altProje.alt_proje_adi}</strong> alt projesini düzenleyin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Alt Proje Başlığı */}
              <div>
                <label htmlFor="altProjeBasligi" className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="ri-folder-line mr-2"></i>
                  Alt Proje Başlığı *
                </label>
                <input
                  type="text"
                  id="altProjeBasligi"
                  name="altProjeBasligi"
                  value={formData.altProjeBasligi}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                    formErrors.altProjeBasligi ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Örnek: Platform Entegrasyonu, UI/UX Tasarım"
                  disabled={saving}
                />
                {formErrors.altProjeBasligi && (
                  <p className="mt-1 text-sm text-red-600">
                    <i className="ri-error-warning-line mr-1"></i>
                    {formErrors.altProjeBasligi}
                  </p>
                )}
              </div>

              {/* Açıklama */}
              <div>
                <label htmlFor="aciklama" className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="ri-file-text-line mr-2"></i>
                  Alt Proje Açıklaması *
                </label>
                <textarea
                  id="aciklama"
                  name="aciklama"
                  rows={4}
                  value={formData.aciklama}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                    formErrors.aciklama ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Alt projenin detaylı açıklamasını yazın..."
                  disabled={saving}
                />
                {formErrors.aciklama && (
                  <p className="mt-1 text-sm text-red-600">
                    <i className="ri-error-warning-line mr-1"></i>
                    {formErrors.aciklama}
                  </p>
                )}
              </div>

              {/* Durum Seçimi */}
              <div>
                <label htmlFor="durum" className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="ri-settings-line mr-2"></i>
                  Alt Proje Durumu *
                </label>
                <select
                  id="durum"
                  name="durum"
                  value={formData.durum}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors pr-8 ${
                    formErrors.durum ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={saving}
                >
                  {durumOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.durum && (
                  <p className="mt-1 text-sm text-red-600">
                    <i className="ri-error-warning-line mr-1"></i>
                    {formErrors.durum}
                  </p>
                )}
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Mevcut durum:</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    durumOptions.find(opt => opt.value === formData.durum)?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.durum}
                  </span>
                </div>
              </div>

              {/* Tarih Aralığı */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="baslangicTarihi" className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="ri-calendar-line mr-2 text-green-600"></i>
                    Başlangıç Tarihi *
                  </label>
                  <input
                    type="date"
                    id="baslangicTarihi"
                    name="baslangicTarihi"
                    value={formData.baslangicTarihi}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                      formErrors.baslangicTarihi ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {formErrors.baslangicTarihi && (
                    <p className="mt-1 text-sm text-red-600">
                      <i className="ri-error-warning-line mr-1"></i>
                      {formErrors.baslangicTarihi}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="bitisTarihi" className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="ri-calendar-check-line mr-2 text-red-600"></i>
                    Bitiş Tarihi *
                  </label>
                  <input
                    type="date"
                    id="bitisTarihi"
                    name="bitisTarihi"
                    value={formData.bitisTarihi}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                      formErrors.bitisTarihi ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {formErrors.bitisTarihi && (
                    <p className="mt-1 text-sm text-red-600">
                      <i className="ri-error-warning-line mr-1"></i>
                      {formErrors.bitisTarihi}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                      saving
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-orange-700 focus:ring-2 focus:ring-orange-500'
                    }`}
                  >
                    {saving ? (
                      <>
                        <i className="ri-loader-4-line mr-2 animate-spin"></i>
                        Supabase'e Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line mr-2"></i>
                        Alt Proje Güncelle
                      </>
                    )}
                  </button>

                  <Link
                    href={`/admin-proje-yonetimi/detay/${projeId}`}
                    className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-center cursor-pointer"
                  >
                    <i className="ri-arrow-left-line mr-2"></i>
                    İptal Et
                  </Link>
                </div>
              </div>
            </form>
          </div>

          {/* Form Alt Bilgi */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                {supabaseConnected && (
                  <span className="text-green-600">
                    ✅ Supabase Verileri
                  </span>
                )}
                {!supabaseConnected && (
                  <span className="text-yellow-600">
                    ⚠️ Demo Verileri
                  </span>
                )}
                <span className="text-gray-500">
                  Oluşturma: {new Date(altProje.created_at).toLocaleDateString('tr-TR')}
                </span>
                {altProje.updated_at && altProje.updated_at !== altProje.created_at && (
                  <span className="text-gray-500">
                    Güncelleme: {new Date(altProje.updated_at).toLocaleDateString('tr-TR')}
                  </span>
                )}
              </div>
              <div className="text-gray-500">
                Proje: {projeId}, Alt Proje: {altProjeId}
              </div>
            </div>
          </div>
        </div>

        {/* Bilgi Kutusu */}
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="ri-information-line text-orange-600 text-sm"></i>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-orange-800 mb-1">Alt Proje Düzenleme</h4>
              <p className="text-orange-700 text-sm">
                Alt proje bilgileri güncellendiğinde, bu alt projeye bağlı tüm görevler etkilenebilir. 
                Tarih değişiklikleri görev planlamasını etkileyebileceği için dikkatli olun.
                Durum değişiklikleri alt projeye bağlı görevlerin durumunu da etkileyebilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}