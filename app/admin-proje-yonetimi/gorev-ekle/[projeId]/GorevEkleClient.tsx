
'use client';

import { useState, useEffect } from 'react';
import { SupabaseProjeService, SupabaseFirmaService } from '../../../../lib/supabase-services';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GorevEkleClientProps {
  projeId: string;
}

interface Firma {
  id: number;
  firma_adi: string;
  yetkili_email: string;
  telefon?: string;
  durum: string;
}

interface AltProje {
  id: number;
  altProjeAdi: string;
  aciklama: string;
}

export default function GorevEkleClient({ projeId }: GorevEkleClientProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [proje, setProje] = useState<any>(null);
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [altProjeler, setAltProjeler] = useState<AltProje[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // Form verileri
  const [formData, setFormData] = useState({
    gorevBasligi: '',
    aciklama: '',
    yuzdeDegeri: 10,
    siraNo: 1,
    bitisTarihi: '',
    altProjeId: '',
    atananFirmalar: [] as number[]
  });

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
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

      console.log('📋 Admin giriş durumu:', { loggedIn, email, role });

      if (!loggedIn || loggedIn !== 'true' || role !== 'Yonetici') {
        console.log('❌ Admin yetkisi yok, login sayfasına yönlendiriliyor');
        router.push('/admin-login');
        return;
      }

      console.log('✅ Admin yetkisi doğrulandı');
      setIsAdminLoggedIn(true);
      setAdminEmail(email || '');
    } catch (error) {
      console.error('🚨 Admin yetki kontrolü hatası:', error);
      setError('Yetki kontrolünde hata oluştu');
      setLoading(false);
    }
  };

  const loadSupabaseData = async () => {
    try {
      console.log('🎯 ULTIMATE SUPABASE FIX: Görev ekleme verileri yükleniyor...');
      setLoading(true);
      setError(null);

      const numericProjeId = parseInt(projeId);
      if (isNaN(numericProjeId) || numericProjeId <= 0) {
        console.error('❌ Geçersiz proje ID:', projeId);
        setError(`Geçersiz proje ID: ${projeId}`);
        setLoading(false);
        return;
      }

      console.log('📊 SUPABASE: Veri yükleme başlatılıyor - Proje ID:', numericProjeId);

      // Proje bilgilerini Supabase'den yükle
      const projeDetay = await SupabaseProjeService.getProjeById(numericProjeId);
      if (!projeDetay) {
        console.error('❌ SUPABASE: Proje bulunamadı, ID:', numericProjeId);
        setError(`ID ${numericProjeId} ile proje bulunamadı`);
        setLoading(false);
        return;
      }

      console.log('✅ SUPABASE: Proje detayları yüklendi:', projeDetay.projeAdi);
      setProje(projeDetay);

      // Firmaları Supabase'den yükle
      const firmaListesi = await SupabaseFirmaService.getAllFirmalar();
      const aktivFirmalar = firmaListesi.filter((f: any) => f.durum === 'Aktif');
      console.log('✅ SUPABASE: Aktif firmalar yüklendi:', aktivFirmalar.length);
      setFirmalar(aktivFirmalar);

      // Alt projeleri Supabase'den yükle
      const altProjeListesi = await SupabaseProjeService.getAltProjelerByProjeId(numericProjeId);
      console.log('✅ SUPABASE: Alt projeler yüklendi:', altProjeListesi.length);
      setAltProjeler(altProjeListesi);

      // Mevcut görevleri yükle (sıra numarası için)
      const mevcutGorevler = await SupabaseProjeService.getGorevlerByProjeId(numericProjeId);
      console.log('✅ SUPABASE: Mevcut görevler yüklendi:', mevcutGorevler.length);

      // Form için varsayılan sıra numarası
      const sonSiraNo = Math.max(0, ...mevcutGorevler.map((g: any) => g.siraNo || 0));
      setFormData(prev => ({
        ...prev,
        siraNo: sonSiraNo + 1
      }));

      setSupabaseConnected(true);
      console.log('🎉 SUPABASE: Tüm veriler başarıyla yüklendi');

    } catch (error) {
      console.error('🚨 SUPABASE: Veri yükleme hatası:', error);
      setError(`Veriler yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      setSupabaseConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'yuzdeDegeri' || name === 'siraNo') {
      const numValue = parseInt(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFirmaSecimChange = (firmaId: number) => {
    setFormData(prev => ({
      ...prev,
      atananFirmalar: prev.atananFirmalar.includes(firmaId)
        ? prev.atananFirmalar.filter(id => id !== firmaId)
        : [...prev.atananFirmalar, firmaId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Form validasyonu
      if (!formData.gorevBasligi.trim()) {
        setError('Görev başlığı gereklidir');
        return;
      }

      if (!formData.aciklama.trim()) {
        setError('Görev açıklaması gereklidir');
        return;
      }

      if (formData.yuzdeDegeri < 1 || formData.yuzdeDegeri > 100) {
        setError('% Katkı değeri 1-100 arasında olmalıdır');
        return;
      }

      if (!formData.bitisTarihi) {
        setError('Bitiş tarihi gereklidir');
        return;
      }

      if (formData.atananFirmalar.length === 0) {
        setError('En az bir firma seçmelisiniz');
        return;
      }

      const numericProjeId = parseInt(projeId);

      console.log('📝 SUPABASE: Yeni görev oluşturuluyor...', {
        projeId: numericProjeId,
        gorevAdi: formData.gorevBasligi,
        altProjeId: formData.altProjeId ? parseInt(formData.altProjeId) : null,
        atananFirmalar: formData.atananFirmalar
      });

      // Yeni görev oluştur
      const yeniGorev = await SupabaseProjeService.createGorev(numericProjeId, {
        gorevAdi: formData.gorevBasligi.trim(),
        aciklama: formData.aciklama.trim(),
        altProjeId: formData.altProjeId ? parseInt(formData.altProjeId) : null,
        atananFirmalar: formData.atananFirmalar,
        durum: 'Aktif',
        oncelik: 'Orta',
        baslangicTarihi: new Date().toISOString().split('T')[0],
        bitisTarihi: formData.bitisTarihi,
        yuzdeKatki: formData.yuzdeDegeri,
        siraNo: formData.siraNo
      });

      if (yeniGorev) {
        console.log('✅ SUPABASE: Görev başarıyla oluşturuldu');
        setSuccess('Görev başarıyla oluşturuldu!');

        // 2 saniye sonra proje detay sayfasına yönlendir
        setTimeout(() => {
          router.push(`/admin-proje-yonetimi/detay/${projeId}`);
        }, 2000);
      } else {
        throw new Error('Görev oluşturulamadı');
      }

    } catch (error) {
      console.error('🚨 SUPABASE: Görev oluşturma hatası:', error);
      setError(`Görev oluşturulurken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Supabase'den form verileri yükleniyor...</p>
          <p className="text-sm text-gray-500 mt-2">Proje ID: {projeId}</p>
        </div>
      </div>
    );
  }

  if (error && !proje) {
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
                loadSupabaseData();
              }}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
            >
              <i className="ri-refresh-line mr-2"></i>
              Tekrar Dene
            </button>
            <Link
              href="/admin-proje-yonetimi"
              className="w-full inline-block text-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Proje Listesine Dön
            </Link>
          </div>
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
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-['Pacifico']">
                logo
              </Link>
              <div className="flex items-center space-x-2 text-gray-600">
                <Link href="/admin-proje-yonetimi" className="hover:text-blue-600 cursor-pointer">
                  Proje Yönetimi
                </Link>
                <span className="text-gray-400">/</span>
                <Link href={`/admin-proje-yonetimi/detay/${projeId}`} className="hover:text-blue-600 cursor-pointer">
                  {proje?.projeAdi || 'Proje Detayı'}
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Yeni Görev</span>
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
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <h1 className="text-2xl font-semibold text-white">Yeni Görev Oluştur</h1>
            {proje && (
              <p className="text-purple-100 mt-1">Proje: {proje.projeAdi}</p>
            )}
          </div>

          <div className="p-6">
            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <i className="ri-check-circle-line text-green-600 mr-2"></i>
                  <p className="text-green-600 font-medium">{success}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <i className="ri-error-warning-line text-red-600 mr-2"></i>
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Görev Başlığı */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görev Başlığı *
                </label>
                <input
                  type="text"
                  name="gorevBasligi"
                  value={formData.gorevBasligi}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Görev başlığını giriniz"
                  required
                />
              </div>

              {/* Alt Proje Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Proje (İsteğe bağlı)
                </label>
                <select
                  name="altProjeId"
                  value={formData.altProjeId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8"
                >
                  <option value="">Alt proje seçmeden devam et</option>
                  {altProjeler.map((altProje) => (
                    <option key={altProje.id} value={altProje.id.toString()}>
                      {altProje.altProjeAdi}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Bu görev hangi alt projeye ait olacak?</p>
              </div>

              {/* Görev Açıklaması */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görev Açıklaması *
                </label>
                <textarea
                  name="aciklama"
                  value={formData.aciklama}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Görev açıklamasını giriniz"
                  required
                />
              </div>

              {/* % Katkı ve Sıra No */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    % Katkı *
                  </label>
                  <input
                    type="number"
                    name="yuzdeDegeri"
                    value={formData.yuzdeDegeri}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">1-100 arası değer giriniz</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sıra No *
                  </label>
                  <input
                    type="number"
                    name="siraNo"
                    value={formData.siraNo}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Bitiş Tarihi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  name="bitisTarihi"
                  value={formData.bitisTarihi}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Firma Atama - Supabase Verileri */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Atanacak Firmalar * ({formData.atananFirmalar.length} seçildi)
                </label>

                {firmalar.length === 0 ? (
                  <div className="border border-gray-200 rounded-lg p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-building-line text-gray-400 text-2xl"></i>
                    </div>
                    <p className="text-gray-500 mb-2">Supabase'de aktif firma bulunamadı</p>
                    <p className="text-sm text-gray-400">Önce firmalar eklenmelidir</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {firmalar.map((firma) => (
                      <label
                        key={firma.id}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.atananFirmalar.includes(firma.id)}
                          onChange={() => handleFirmaSecimChange(firma.id)}
                          className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-gray-900 font-medium">{firma.firma_adi}</span>
                          <div className="text-xs text-gray-500">{firma.yetkili_email}</div>
                          {firma.telefon && (
                            <div className="text-xs text-gray-500">{firma.telefon}</div>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${firma.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                        >
                          {firma.durum}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {formData.atananFirmalar.length > 0 && (
                  <p className="text-sm text-purple-600 mt-2">
                    {formData.atananFirmalar.length} firma seçildi
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Link
                  href={`/admin-proje-yonetimi/detay/${projeId}`}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  İptal
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center"
                >
                  {saving ? (
                    <>
                      <i className="ri-loader-line animate-spin mr-2"></i>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line mr-2"></i>
                      Görevi Oluştur
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
