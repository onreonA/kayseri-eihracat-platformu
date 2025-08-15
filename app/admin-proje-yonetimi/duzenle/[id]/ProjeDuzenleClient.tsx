
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SupabaseProjeService, SupabaseFirmaService } from '../../../../lib/supabase-services';

interface Proje {
  id: number;
  projeAdi: string;
  aciklama: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  atananFirmalar: number[];
  durum: 'Başlangıç' | 'Devam Ediyor' | 'Tamamlandı' | 'Askıya Alındı';
  oncelik: string;
}

interface Firma {
  id: number;
  firma_adi: string;
  yetkili_email: string;
  durum: string;
}

interface ProjeDuzenleClientProps {
  projeId: string;
}

export default function ProjeDuzenleClient({ projeId }: ProjeDuzenleClientProps) {
  const [proje, setProje] = useState<Proje | null>(null);
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  const router = useRouter();

  const [formData, setFormData] = useState({
    projeAdi: '',
    aciklama: '',
    baslangicTarihi: '',
    bitisTarihi: '',
    atananFirmalar: [] as number[],
    durum: 'Başlangıç' as 'Başlangıç' | 'Devam Ediyor' | 'Tamamlandı' | 'Askıya Alındı',
    oncelik: 'Orta' as 'Yüksek' | 'Orta' | 'Düşük'
  });

  useEffect(() => {
    setMounted(true);

    const checkAuth = () => {
      try {
        if (typeof window === 'undefined') return false;

        const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
        const role = localStorage.getItem('adminRole');

        if (!isLoggedIn || isLoggedIn !== 'true' || role !== 'Yonetici') {
          router.push('/admin-login');
          return false;
        }
        return true;
      } catch (error) {
        console.error('❌ Admin yetki kontrolü hatası:', error);
        router.push('/admin-login');
        return false;
      }
    };

    if (!checkAuth()) return;

    if (!projeId) {
      console.error('❌ Proje ID bulunamadı');
      setMessage('Geçersiz proje kimliği');
      setLoading(false);
      return;
    }

    console.log('🎯 ULTIMATE SUPABASE FIX: Proje düzenleme başlatılıyor - ID:', projeId);
    loadSupabaseData();
  }, [mounted, projeId, router]);

  const loadSupabaseData = async () => {
    try {
      setLoading(true);
      console.log('📊 SUPABASE: Proje düzenleme verileri yükleniyor...');

      const numericId = parseInt(projeId);

      if (isNaN(numericId) || numericId <= 0) {
        setMessage('Geçersiz proje kimliği');
        setLoading(false);
        return;
      }

      // Supabase'den proje ve firma verilerini paralel yükle
      const [projeData, firmaListesi] = await Promise.all([
        SupabaseProjeService.getProjeById(numericId),
        SupabaseFirmaService.getAllFirmalar()
      ]);

      console.log('📋 SUPABASE: Proje yüklendi:', projeData);
      console.log('🏢 SUPABASE: Firma listesi yüklendi:', firmaListesi?.length || 0);

      // Supabase bağlantı durumunu kontrol et
      const isConnected = projeData && Array.isArray(firmaListesi) && firmaListesi.length > 0;
      setSupabaseConnected(isConnected);

      if (!projeData) {
        console.error('❌ SUPABASE: Proje bulunamadı:', numericId);
        setProje(null);
        setMessage(`Proje bulunamadı (ID: ${numericId})`);
        setLoading(false);
        return;
      }

      setProje(projeData);
      
      // Sadece aktif firmaları filtrele
      const aktivFirmalar = firmaListesi.filter((f: any) => f.durum === 'Aktif');
      setFirmalar(aktivFirmalar);

      // Form verilerini Supabase verileri ile doldur
      setFormData({
        projeAdi: projeData.projeAdi || '',
        aciklama: projeData.aciklama || '',
        baslangicTarihi: projeData.baslangicTarihi || '',
        bitisTarihi: projeData.bitisTarihi || '',
        atananFirmalar: Array.isArray(projeData.atananFirmalar) ? projeData.atananFirmalar : [],
        durum: projeData.durum || 'Başlangıç',
        oncelik: projeData.oncelik || 'Orta'
      });

      console.log('📝 SUPABASE: Form verileri güncellendi');

    } catch (error) {
      console.error('❌ SUPABASE: Veri yüklenirken hata:', error);
      setMessage('Veriler yüklenirken bir hata oluştu.');
      setSupabaseConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // Validasyonlar
    if (!formData.projeAdi.trim() || !formData.aciklama.trim()) {
      setMessage('Lütfen proje başlığı ve açıklama alanlarını doldurun.');
      return;
    }

    if (new Date(formData.bitisTarihi) <= new Date(formData.baslangicTarihi)) {
      setMessage('Bitiş tarihi başlangıç tarihinden sonra olmalıdır.');
      return;
    }

    if (formData.atananFirmalar.length === 0) {
      setMessage('En az bir firma seçmelisiniz.');
      return;
    }

    try {
      setSaving(true);
      console.log('💾 SUPABASE: Proje güncelleniyor...');

      const numericId = parseInt(projeId);

      // Supabase üzerinden proje güncellemesi
      const success = await SupabaseProjeService.updateProje(numericId, {
        projeAdi: formData.projeAdi.trim(),
        aciklama: formData.aciklama.trim(),
        baslangicTarihi: formData.baslangicTarihi,
        bitisTarihi: formData.bitisTarihi,
        atananFirmalar: formData.atananFirmalar,
        durum: formData.durum,
        oncelik: formData.oncelik
      });

      if (success) {
        console.log('✅ SUPABASE: Proje başarıyla güncellendi');
        setMessage('Proje başarıyla güncellendi! Proje detay sayfasına yönlendiriliyorsunuz...');

        setTimeout(() => {
          router.push(`/admin-proje-yonetimi/detay/${projeId}`);
        }, 2000);
      } else {
        setMessage('Proje güncellenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('❌ SUPABASE: Proje güncellenirken hata:', error);
      setMessage(error.message || 'Proje güncellenirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleFirmaSecimi = (firmaId: number) => {
    setFormData((prev) => ({
      ...prev,
      atananFirmalar: prev.atananFirmalar.includes(firmaId)
        ? prev.atananFirmalar.filter((id) => id !== firmaId)
        : [...prev.atananFirmalar, firmaId],
    }));
  };

  const handleTumFirmalariSec = () => {
    const aktifFirmaIds = firmalar.map((firma) => firma.id);

    if (formData.atananFirmalar.length === aktifFirmaIds.length) {
      setFormData((prev) => ({ ...prev, atananFirmalar: [] }));
    } else {
      setFormData((prev) => ({ ...prev, atananFirmalar: aktifFirmaIds }));
    }
  };

  const handleLogout = () => {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');
      router.push('/');
    } catch (error) {
      console.error('❌ Logout hatası:', error);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Proje düzenleme verileri yükleniyor...</p>
          <p className="text-gray-400 text-sm mt-2">Supabase veritabanından gerçek veriler çekiliyor...</p>
        </div>
      </div>
    );
  }

  if (!proje) {
    return (
      <div className="min-h-screen bg-gray-100">
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
                  <i className="ri-arrow-right-s-line"></i>
                  <span>Hata</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  {typeof window !== 'undefined' ? localStorage.getItem('adminRole') : ''} - {typeof window !== 'undefined' ? localStorage.getItem('adminEmail') : ''}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-xl mx-auto p-8">
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <i className="ri-file-search-line text-gray-400 text-5xl"></i>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">Proje Bulunamadı</h1>
            <p className="text-gray-600 text-lg mb-4">
              <strong>ID: #{projeId}</strong> olan proje düzenlenemiyor.
            </p>
            <p className="text-gray-500 mb-4">
              Proje silinmiş olabilir veya Supabase veritabanında bulunmayabilir.
            </p>

            {message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600 text-sm">{message}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/admin-proje-yonetimi"
                className="flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-center font-medium"
              >
                <i className="ri-arrow-left-line mr-2"></i>
                <span>Proje Listesine Dön</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
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
                <i className="ri-arrow-right-s-line"></i>
                <span>Proje Düzenle</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Supabase Bağlantı Durumu */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {supabaseConnected ? 'Supabase' : 'Bağlantı Yok'}
                </span>
              </div>

              <span className="text-gray-600">
                {typeof window !== 'undefined' ? localStorage.getItem('adminRole') : ''} - {typeof window !== 'undefined' ? localStorage.getItem('adminEmail') : ''}
              </span>
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

      <div className="flex">
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Sayfa Başlığı */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Link href="/admin-proje-yonetimi" className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">
                    <i className="ri-arrow-left-line text-xl"></i>
                  </Link>
                  <h1 className="text-3xl font-bold text-gray-900">Proje Düzenle</h1>
                </div>
                <p className="text-gray-600">{proje.projeAdi} - Bilgileri Güncelle</p>
                <p className="text-sm text-gray-500">Proje ID: #{proje.id} | {supabaseConnected ? '✅ Supabase Verileri' : '❌ Bağlantı Yok'}</p>
              </div>
            </div>

            {/* Mesaj */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${message.includes('başarıyla') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm ${message.includes('başarıyla') ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </p>
              </div>
            )}

            {/* Düzenleme Formu */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Proje Başlığı */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proje Başlığı *
                    </label>
                    <input
                      type="text"
                      value={formData.projeAdi}
                      onChange={(e) => setFormData((prev) => ({ ...prev, projeAdi: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Projenin başlığını girin"
                      required
                    />
                  </div>

                  {/* Proje Açıklaması */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proje Açıklaması *
                    </label>
                    <textarea
                      value={formData.aciklama}
                      onChange={(e) => setFormData((prev) => ({ ...prev, aciklama: e.target.value }))}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Proje hakkında detaylı açıklama yazın"
                      maxLength={500}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.aciklama.length}/500 karakter</p>
                  </div>

                  {/* Başlangıç Tarihi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlangıç Tarihi *
                    </label>
                    <input
                      type="date"
                      value={formData.baslangicTarihi}
                      onChange={(e) => setFormData((prev) => ({ ...prev, baslangicTarihi: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Bitiş Tarihi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bitiş Tarihi *
                    </label>
                    <input
                      type="date"
                      value={formData.bitisTarihi}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bitisTarihi: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Proje Durumu */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proje Durumu *
                    </label>
                    <select
                      value={formData.durum}
                      onChange={(e) => setFormData((prev) => ({ ...prev, durum: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="Başlangıç">Başlangıç</option>
                      <option value="Devam Ediyor">Devam Ediyor</option>
                      <option value="Tamamlandı">Tamamlandı</option>
                      <option value="Askıya Alındı">Askıya Alındı</option>
                    </select>
                  </div>

                  {/* Öncelik */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Öncelik *
                    </label>
                    <select
                      value={formData.oncelik}
                      onChange={(e) => setFormData((prev) => ({ ...prev, oncelik: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="Yüksek">Yüksek</option>
                      <option value="Orta">Orta</option>
                      <option value="Düşük">Düşük</option>
                    </select>
                  </div>
                </div>

                {/* Supabase Firma Seçimi */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Atanacak Firmalar * ({formData.atananFirmalar.length} seçildi)
                    </label>
                    {firmalar.length > 0 && (
                      <button
                        type="button"
                        onClick={handleTumFirmalariSec}
                        className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
                      >
                        {formData.atananFirmalar.length === firmalar.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                      </button>
                    )}
                  </div>

                  {firmalar.length === 0 ? (
                    <div className="border border-gray-200 rounded-lg p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-building-line text-gray-400 text-2xl"></i>
                      </div>
                      <p className="text-gray-500 mb-2">Supabase'de aktif firma bulunamadı</p>
                      <p className="text-sm text-gray-400">Önce firmalar eklenmelidir</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {firmalar.map((firma) => (
                        <label
                          key={firma.id}
                          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={formData.atananFirmalar.includes(firma.id)}
                            onChange={() => handleFirmaSecimi(firma.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">{firma.firma_adi}</span>
                            <p className="text-xs text-gray-500">{firma.yetkili_email}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            firma.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {firma.durum}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {formData.atananFirmalar.length === 0 && (
                    <p className="text-sm text-red-600 mt-3">
                      En az bir firma seçmelisiniz!
                    </p>
                  )}
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Link
                    href="/admin-proje-yonetimi"
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center space-x-2"
                  >
                    <i className="ri-arrow-left-line"></i>
                    <span>İptal</span>
                  </Link>
                  <button
                    type="submit"
                    disabled={saving || formData.atananFirmalar.length === 0}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Güncelleniyor...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line"></i>
                        <span>Projeyi Güncelle</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
