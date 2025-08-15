
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ModernLayout from '../../components/Layout/ModernLayout';
import { supabase } from '@/lib/supabase-services';

interface OnaylananBasvuru {
  id: number;
  uuid: string;
  basvuru_turu: string;
  ad_soyad: string;
  email: string;
  telefon: string;
  egitim_durumu: string;
  okul_bolum: string;
  mezuniyet_yili: string;
  ilgi_alanlari: string;
  aciklama: string | null;
  ozgecmis_url: string | null;
  onay_tarihi: string;
  created_at: string;
}

export default function OnaylananKariyerBasvurulariPage() {
  const [basvurular, setBasvurular] = useState<OnaylananBasvuru[]>([]);
  const [filteredBasvurular, setFilteredBasvurular] = useState<OnaylananBasvuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBasvuru, setSelectedBasvuru] = useState<OnaylananBasvuru | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [filters, setFilters] = useState({
    basvuru_turu: '',
    egitim_durumu: '',
    search: '',
  });
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const isMountedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;

    const checkAuth = async () => {
      try {
        if (typeof window === 'undefined') return;

        const unifiedData = localStorage.getItem('user_login_data');
        if (unifiedData) {
          const parsedData = JSON.parse(unifiedData);
          if (parsedData.email && parsedData.firmaAdi) {
            setIsLoggedIn(true);
            if (isMountedRef.current) {
              await loadOnaylananBasvurular();
            }
            return;
          }
        }

        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const firma = localStorage.getItem('firmaAdi');

        if (!isLoggedIn || isLoggedIn !== 'true' || !firma) {
          router.push('/login');
          return;
        }

        setIsLoggedIn(true);
        if (isMountedRef.current) {
          await loadOnaylananBasvurular();
        }
      } catch (error) {
        console.error('Auth kontrol hatası:', error);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMountedRef.current = false;
    };
  }, [router]);

  useEffect(() => {
    applyFilters();
  }, [basvurular, filters]);

  const loadOnaylananBasvurular = async () => {
    try {
      setLoading(true);
      console.log('👥 Onaylanan kariyer başvuruları yükleniyor...');

      if (!supabase) {
        console.warn('⚠️ Supabase bağlantısı yok');
        setBasvurular([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('kariyer_basvurulari')
        .select('*')
        .eq('durum', 'Onaylandı')
        .order('onay_tarihi', { ascending: false });

      if (error) {
        console.error('❌ Onaylanan başvurular yüklenirken hata:', error.message || error);
        setBasvurular([]);
      } else {
        console.log(`✅ ${data?.length || 0} onaylanan başvuru yüklendi`);
        setBasvurular(data || []);
      }
    } catch (error) {
      console.error('❌ Onaylanan başvurular yüklenirken sistem hatası:', error instanceof Error ? error.message : String(error));
      setBasvurular([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const applyFilters = () => {
    let filtered = [...basvurular];

    if (filters.basvuru_turu) {
      filtered = filtered.filter(b => b.basvuru_turu === filters.basvuru_turu);
    }
    if (filters.egitim_durumu) {
      filtered = filtered.filter(b => b.egitim_durumu === filters.egitim_durumu);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(b => 
        b.ad_soyad.toLowerCase().includes(searchLower) ||
        b.okul_bolum.toLowerCase().includes(searchLower) ||
        b.ilgi_alanlari.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBasvurular(filtered);
  };

  const handleBasvuruDetay = (basvuru: OnaylananBasvuru) => {
    setSelectedBasvuru(basvuru);
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEgitimIcon = (egitimDurumu: string) => {
    if (egitimDurumu.includes('Lise')) return 'ri-graduation-cap-line';
    if (egitimDurumu.includes('Lisans')) return 'ri-book-line';
    if (egitimDurumu.includes('Yüksek')) return 'ri-award-line';
    if (egitimDurumu.includes('Doktora')) return 'ri-medal-line';
    return 'ri-graduation-cap-line';
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Onaylanan başvurular yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <ModernLayout userEmail={'user@example.com'} userRole="Firma Temsilcisi" isAdmin={false} notifications={3}>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <i className="ri-user-star-line text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    👥 Onaylanan Kariyer Başvuruları
                  </h1>
                  <p className="text-gray-600">Sistemde onaylanmış staj ve iş başvurularını görüntüleyin</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Onaylanan</p>
                <p className="text-3xl font-bold text-gray-900">{basvurular.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <i className="ri-check-line text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Staj Başvurusu</p>
                <p className="text-3xl font-bold text-blue-600">
                  {basvurular.filter(b => b.basvuru_turu === 'Staj Başvurusu').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <i className="ri-graduation-cap-line text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">İş Başvurusu</p>
                <p className="text-3xl font-bold text-purple-600">
                  {basvurular.filter(b => b.basvuru_turu === 'İş Başvurusu').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <i className="ri-briefcase-line text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="ri-filter-line mr-2 text-blue-600"></i>
            Filtreleme
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başvuru Türü</label>
              <div className="relative">
                <select
                  value={filters.basvuru_turu}
                  onChange={(e) => setFilters(prev => ({ ...prev, basvuru_turu: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white pr-8"
                >
                  <option value="">Tüm Türler</option>
                  <option value="Staj Başvurusu">Staj Başvurusu</option>
                  <option value="İş Başvurusu">İş Başvurusu</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <i className="ri-arrow-down-s-line text-gray-400"></i>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Eğitim Durumu</label>
              <div className="relative">
                <select
                  value={filters.egitim_durumu}
                  onChange={(e) => setFilters(prev => ({ ...prev, egitim_durumu: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white pr-8"
                >
                  <option value="">Tüm Eğitim Durumları</option>
                  <option value="Lise Mezunu">Lise Mezunu</option>
                  <option value="Lisans Öğrencisi">Lisans Öğrencisi</option>
                  <option value="Lisans Mezunu">Lisans Mezunu</option>
                  <option value="Yüksek Lisans Mezunu">Yüksek Lisans Mezunu</option>
                  <option value="Doktora Mezunu">Doktora Mezunu</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <i className="ri-arrow-down-s-line text-gray-400"></i>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Ad, okul, ilgi alanları..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <i className="ri-search-line text-gray-400"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Grid */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Başvuru Listesi ({filteredBasvurular.length})
            </h3>
          </div>

          {filteredBasvurular.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-user-search-line text-gray-400 text-3xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Başvuru Bulunamadı</h3>
              <p className="text-gray-600">
                {filters.basvuru_turu || filters.egitim_durumu || filters.search
                  ? 'Filtrelere uygun başvuru bulunamadı.'
                  : 'Henüz onaylanmış başvuru bulunmuyor.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredBasvurular.map((basvuru) => (
                <div
                  key={basvuru.id}
                  className="bg-white/60 border border-white/40 rounded-xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                  onClick={() => handleBasvuruDetay(basvuru)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        basvuru.basvuru_turu === 'Staj Başvurusu'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        <i className={`${getEgitimIcon(basvuru.egitim_durumu)} text-xl`}></i>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {basvuru.ad_soyad}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          basvuru.basvuru_turu === 'Staj Başvurusu'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {basvuru.basvuru_turu}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <i className="ri-arrow-right-line text-gray-400 group-hover:text-blue-600 transition-colors"></i>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Eğitim</p>
                      <p className="text-sm text-gray-600">{basvuru.egitim_durumu}</p>
                      <p className="text-xs text-gray-500">{basvuru.okul_bolum}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700">Mezuniyet</p>
                      <p className="text-sm text-gray-600">{basvuru.mezuniyet_yili}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700">İlgi Alanları</p>
                      <p className="text-xs text-gray-600 line-clamp-2">{basvuru.ilgi_alanlari}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <i className="ri-calendar-line"></i>
                        <span>Onaylandı: {formatDate(basvuru.onay_tarihi)}</span>
                      </div>
                      {basvuru.ozgecmis_url && (
                        <div className="flex items-center space-x-1 text-xs text-green-600">
                          <i className="ri-file-pdf-line"></i>
                          <span>CV</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedBasvuru && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedBasvuru.basvuru_turu === 'Staj Başvurusu'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    <i className={`${getEgitimIcon(selectedBasvuru.egitim_durumu)} text-xl`}></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedBasvuru.ad_soyad}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedBasvuru.basvuru_turu === 'Staj Başvurusu'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedBasvuru.basvuru_turu}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* İletişim Bilgileri */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="ri-contacts-line mr-2 text-blue-600"></i>
                  İletişim Bilgileri
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">E-posta</p>
                    <p className="text-sm text-gray-900">{selectedBasvuru.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Telefon</p>
                    <p className="text-sm text-gray-900">{selectedBasvuru.telefon}</p>
                  </div>
                </div>
              </div>

              {/* Eğitim Bilgileri */}
              <div className="bg-blue-50 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="ri-graduation-cap-line mr-2 text-blue-600"></i>
                  Eğitim Bilgileri
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Eğitim Durumu</p>
                    <p className="text-sm text-gray-900">{selectedBasvuru.egitim_durumu}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Mezuniyet Yılı</p>
                    <p className="text-sm text-gray-900">{selectedBasvuru.mezuniyet_yili}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-700">Okul/Bölüm</p>
                    <p className="text-sm text-gray-900">{selectedBasvuru.okul_bolum}</p>
                  </div>
                </div>
              </div>

              {/* İlgi Alanları */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <i className="ri-lightbulb-line mr-2 text-purple-600"></i>
                  İlgi Alanları
                </h4>
                <p className="text-gray-700 bg-purple-50 p-4 rounded-xl">{selectedBasvuru.ilgi_alanlari}</p>
              </div>

              {/* Açıklama */}
              {selectedBasvuru.aciklama && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <i className="ri-message-3-line mr-2 text-green-600"></i>
                    Ek Açıklama
                  </h4>
                  <p className="text-gray-700 bg-green-50 p-4 rounded-xl">{selectedBasvuru.aciklama}</p>
                </div>
              )}

              {/* Özgeçmiş */}
              {selectedBasvuru.ozgecmis_url && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <i className="ri-file-pdf-line mr-2 text-red-600"></i>
                    Özgeçmiş
                  </h4>
                  <a
                    href={selectedBasvuru.ozgecmis_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors cursor-pointer"
                  >
                    <i className="ri-download-line mr-2"></i>
                    PDF Özgeçmişi İndir/Görüntüle
                  </a>
                </div>
              )}

              {/* Tarihler */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <i className="ri-calendar-line mr-2 text-gray-600"></i>
                  Tarih Bilgileri
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Başvuru Tarihi</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedBasvuru.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Onay Tarihi</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedBasvuru.onay_tarihi)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </ModernLayout>
  );
}
