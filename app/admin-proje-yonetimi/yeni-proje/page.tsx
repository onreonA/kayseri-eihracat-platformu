
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SupabaseProjeService, SupabaseFirmaService } from '../../../lib/supabase-services';

export default function YeniProjePage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [formData, setFormData] = useState({
    projeAdi: '',
    aciklama: '',
    baslangicTarihi: '',
    bitisTarihi: '',
    durum: 'Aktif'
  });
  const [firmalar, setFirmalar] = useState<any[]>([]);
  const [selectedFirmalar, setSelectedFirmalar] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkAdminAuth();
      loadSupabaseFirmalar();
    }
  }, [mounted]);

  const checkAdminAuth = () => {
    if (typeof window === 'undefined') return;

    const loggedIn = localStorage.getItem('isAdminLoggedIn');
    const email = localStorage.getItem('adminEmail');
    const role = localStorage.getItem('adminRole');

    if (!loggedIn || loggedIn !== 'true' || role !== 'Yonetici') {
      router.push('/admin-login');
      return;
    }

    setIsAdminLoggedIn(true);  
    setAdminEmail(email || '');
  };

  const loadSupabaseFirmalar = async () => {
    try {
      console.log('🎯 ULTIMATE SUPABASE FIX: Firmalar Supabase\'den yükleniyor...');
      setLoading(true);

      // Supabase'den aktif firmaları yükle
      const supabaseFirmalar = await SupabaseFirmaService.getAllFirmalar();
      
      if (supabaseFirmalar && supabaseFirmalar.length > 0) {
        const aktivFirmalar = supabaseFirmalar.filter((firma: any) => firma.durum === 'Aktif');
        console.log(`✅ SUPABASE: ${aktivFirmalar.length} aktif firma yüklendi`);
        setFirmalar(aktivFirmalar);
        setSupabaseConnected(true);
      } else {
        console.warn('⚠️ SUPABASE: Aktif firma bulunamadı');
        setFirmalar([]);
        setSupabaseConnected(false);
      }

    } catch (error) {
      console.error('❌ SUPABASE: Firma yükleme hatası:', error);
      setFirmalar([]);
      setSupabaseConnected(false);
      setErrorMessage('Firmalar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFirmaToggle = (firmaId: number) => {
    setSelectedFirmalar(prev => {
      if (prev.includes(firmaId)) {
        return prev.filter(id => id !== firmaId);
      } else {
        return [...prev, firmaId];
      }
    });
  };

  const validateForm = () => {
    if (!formData.projeAdi.trim()) {
      setErrorMessage('Proje adı gerekli!');
      return false;
    }

    if (!formData.baslangicTarihi || !formData.bitisTarihi) {
      setErrorMessage('Başlangıç ve bitiş tarihleri gerekli!');
      return false;
    }

    if (new Date(formData.baslangicTarihi) >= new Date(formData.bitisTarihi)) {
      setErrorMessage('Bitiş tarihi başlangıç tarihinden sonra olmalı!');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) return;

    try {
      setSubmitting(true);
      console.log('🎯 ULTIMATE SUPABASE FIX: Yeni proje oluşturuluyor...');

      const yeniProje = await SupabaseProjeService.createProje({
        projeAdi: formData.projeAdi,
        aciklama: formData.aciklama,
        atananFirmalar: selectedFirmalar,
        durum: formData.durum,
        oncelik: 'Orta',
        baslangicTarihi: formData.baslangicTarihi,
        bitisTarihi: formData.bitisTarihi
      });

      if (yeniProje) {
        console.log('✅ SUPABASE: Proje başarıyla kaydedildi:', yeniProje.id);
        setSuccessMessage(`"${formData.projeAdi}" başarıyla oluşturuldu!`);

        setFormData({
          projeAdi: '',
          aciklama: '',
          baslangicTarihi: '',
          bitisTarihi: '',
          durum: 'Aktif'
        });
        setSelectedFirmalar([]);

        setTimeout(() => {
          router.push('/admin-proje-yonetimi');
        }, 2000);

      } else {
        throw new Error('Proje oluşturulamadı');
      }

    } catch (error: any) {
      console.error('❌ SUPABASE: Proje oluşturma hatası:', error);
      setErrorMessage(error.message || 'Proje oluşturulurken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/admin-login');
  };

  if (!mounted || (loading && !errorMessage)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Supabase veriler hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Hata:</strong> Admin girişi gerekli
          </div>
          <Link href="/admin-login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                <span className="text-gray-900 font-medium">Yeni Ana Proje</span>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <i className="ri-check-line text-green-600 mr-2"></i>
              <strong>Başarılı!</strong> {successMessage}
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <i className="ri-error-warning-line text-red-600 mr-2"></i>
              <strong>Hata:</strong> {errorMessage}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 rounded-t-xl">
            <h1 className="text-2xl font-bold text-white">🚀 Yeni Ana Proje Oluştur</h1>
            <p className="text-blue-100 mt-1">3 Katmanlı proje yapısında ana proje tanımlayın</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="projeAdi" className="block text-sm font-medium text-gray-700 mb-2">
                  Ana Proje Adı *
                </label>
                <input
                  type="text"
                  id="projeAdi"
                  name="projeAdi"
                  value={formData.projeAdi}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Örn: E-İhracat Platform Entegrasyonu"
                  required
                />
              </div>

              <div>
                <label htmlFor="durum" className="block text-sm font-medium text-gray-700 mb-2">
                  Proje Durumu
                </label>
                <select
                  id="durum"
                  name="durum"
                  value={formData.durum}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                >
                  <option value="Aktif">🟢 Aktif</option>
                  <option value="Durduruldu">🔴 Durduruldu</option>
                  <option value="Tamamlandı">✅ Tamamlandı</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="aciklama" className="block text-sm font-medium text-gray-700 mb-2">
                Proje Açıklaması
              </label>
              <textarea
                id="aciklama"
                name="aciklama"
                value={formData.aciklama}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                placeholder="Projenin detaylı açıklamasını yazın..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="baslangicTarihi" className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi *
                </label>
                <input
                  type="date"
                  id="baslangicTarihi"
                  name="baslangicTarihi"
                  value={formData.baslangicTarihi}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="bitisTarihi" className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  id="bitisTarihi"
                  name="bitisTarihi"
                  value={formData.bitisTarihi}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>

            {/* Supabase Firma Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Projeye Katılacak Firmalar ({selectedFirmalar.length} seçili)
              </label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
                {supabaseConnected && firmalar.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {firmalar.map((firma) => (
                      <label
                        key={firma.id}
                        className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFirmalar.includes(firma.id)}
                          onChange={() => handleFirmaToggle(firma.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {firma.firma_adi}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {firma.yetkili_email} - {firma.sektor || 'Genel'}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          firma.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {firma.durum}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="ri-building-line text-gray-400"></i>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {supabaseConnected ? 'Henüz aktif firma bulunmuyor' : 'Supabase bağlantısı kurulamadı'}
                    </p>
                    {!supabaseConnected && (
                      <button
                        type="button"
                        onClick={loadSupabaseFirmalar}
                        className="text-blue-600 hover:text-blue-800 text-sm mt-2 cursor-pointer"
                      >
                        <i className="ri-refresh-line mr-1"></i>
                        Tekrar Dene
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Link
                href="/admin-proje-yonetimi"
                className="text-gray-600 hover:text-gray-800 px-4 py-2 cursor-pointer"
              >
                ← İptal Et
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className={
                  submitting
                    ? 'px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap cursor-not-allowed bg-gray-400 text-white'
                    : 'px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer bg-blue-600 text-white hover:bg-blue-700'
                }
              >
                {submitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Supabase'e Kaydediliyor...</span>
                  </div>
                ) : (
                  '🚀 Ana Projeyi Oluştur'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <i className="ri-lightbulb-line text-blue-600 text-sm"></i>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800 mb-1">💡 3 Katmanlı Yapı Hakkında</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• <strong>Ana Proje:</strong> Genel hedef ve çatı (örn: E-İhracat Entegrasyonu)</p>
                <p>• <strong>Alt Proje:</strong> Milestone/modüller (örn: Platform Kurulumu, Eğitim, Test)</p>
                <p>• <strong>Görev:</strong> Alt proje içindeki detay adımlar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
