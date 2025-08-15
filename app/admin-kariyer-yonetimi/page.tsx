
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-services';

interface KariyerBasvuru {
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
  durum: 'Beklemede' | 'Onaylandı' | 'Reddedildi';
  admin_notu: string | null;
  onaylayan_admin: string | null;
  onay_tarihi: string | null;
  created_at: string;
}

export default function AdminKariyerYonetimiPage() {
  const [basvurular, setBasvurular] = useState<KariyerBasvuru[]>([]);
  const [filteredBasvurular, setFilteredBasvurular] = useState<KariyerBasvuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBasvuru, setSelectedBasvuru] = useState<KariyerBasvuru | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotu, setAdminNotu] = useState('');
  const [filters, setFilters] = useState({
    durum: '',
    basvuru_turu: '',
    egitim_durumu: '',
    search: '',
  });
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const isMountedRef = useRef(false);

  const menuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/admin-dashboard' },
    { icon: 'ri-building-line', label: 'Firma Yönetimi', href: '/admin-firmalar' },
    { icon: 'ri-project-line', label: 'Proje Yönetimi', href: '/admin-proje-yonetimi' },
    { icon: 'ri-briefcase-line', label: 'Kariyer Yönetimi', href: '/admin-kariyer-yonetimi', active: true },
    { icon: 'ri-calendar-check-line', label: 'Randevu Talepleri', href: '/admin-randevu-talepleri' },
    { icon: 'ri-graduation-cap-line', label: 'Eğitim Yönetimi', href: '/admin-egitim-yonetimi' },
    { icon: 'ri-calendar-event-line', label: 'Etkinlik Yönetimi', href: '/admin-etkinlik-yonetimi' },
    { icon: 'ri-discuss-line', label: 'Forum Yönetimi', href: '/admin-forum-yonetimi' },
    { icon: 'ri-news-line', label: 'Haber Yönetimi', href: '/admin-haberler' },
    { icon: 'ri-bar-chart-line', label: 'Dönem Yönetimi', href: '/admin-donem-yonetimi' },
    { icon: 'ri-file-text-line', label: 'Destek Dokümanları', href: '/admin-destek-dokumanlari' },
    { icon: 'ri-team-line', label: 'Kullanıcılar (Personel)', href: '/admin-kullanici-yonetimi' },
    { icon: 'ri-check-double-line', label: 'Görev Onayları', href: '/admin-gorev-onaylari' },
  ];

  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;

    const checkAuth = async () => {
      try {
        const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
        const role = localStorage.getItem('adminRole');

        if (!isLoggedIn || isLoggedIn !== 'true' || role !== 'Yonetici') {
          router.push('/admin-login');
          return;
        }

        if (isMountedRef.current) {
          await loadBasvurular();
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

  const loadBasvurular = async () => {
    try {
      setLoading(true);
      console.log(' Kariyer başvuruları yükleniyor...');

      if (!supabase) {
        console.warn(' Supabase bağlantısı yok');
        setBasvurular([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('kariyer_basvurulari')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(' Başvurular yüklenirken hata:', error);
        setBasvurular([]);
      } else {
        console.log(` ${data?.length || 0} başvuru yüklendi`);
        setBasvurular(data || []);
      }
    } catch (error) {
      console.error('Başvurular yüklenirken hata:', error);
      setBasvurular([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const applyFilters = () => {
    let filtered = [...basvurular];

    if (filters.durum) {
      filtered = filtered.filter(b => b.durum === filters.durum);
    }
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
        b.email.toLowerCase().includes(searchLower) ||
        b.telefon.includes(searchLower)
      );
    }

    setFilteredBasvurular(filtered);
  };

  const handleBasvuruDetay = (basvuru: KariyerBasvuru) => {
    setSelectedBasvuru(basvuru);
    setAdminNotu(basvuru.admin_notu || '');
    setShowModal(true);
  };

  const handleDurumGuncelle = async (yeniDurum: 'Onaylandı' | 'Reddedildi') => {
    if (!selectedBasvuru || !supabase) return;

    try {
      const adminEmail = localStorage.getItem('adminEmail') || 'Admin';
      
      const updateData = {
        durum: yeniDurum,
        admin_notu: adminNotu.trim() || null,
        onaylayan_admin: adminEmail,
        onay_tarihi: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('kariyer_basvurulari')
        .update(updateData)
        .eq('id', selectedBasvuru.id);

      if (error) {
        console.error('Durum güncellenirken hata:', error);
        alert('Durum güncellenirken hata oluştu');
        return;
      }

      // Listeyi güncelle
      setBasvurular(prev => 
        prev.map(b => 
          b.id === selectedBasvuru.id 
            ? { ...b, ...updateData }
            : b
        )
      );

      setShowModal(false);
      setSelectedBasvuru(null);
      setAdminNotu('');

      alert(`Başvuru ${yeniDurum.toLowerCase()} olarak güncellendi`);

    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      alert('İşlem sırasında hata oluştu');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (durum: string) => {
    switch (durum) {
      case 'Beklemede':
        return 'bg-yellow-100 text-yellow-800';
      case 'Onaylandı':
        return 'bg-green-100 text-green-800';
      case 'Reddedildi':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/');
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Kariyer başvuruları yükleniyor...</p>
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
                <Link href="/admin-dashboard" className="hover:text-blue-600 cursor-pointer">
                  Admin Panel
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Kariyer Yönetimi</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-gray-600 hover:text-blue-600 cursor-pointer">
                Dashboard\'a Dön
              </Link>
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
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg h-screen sticky top-0 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                    item.active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${item.icon} text-lg`}></i>
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900"> Kariyer Merkezi Yönetimi</h1>
                  <p className="text-gray-600 mt-2">
                    Staj ve iş başvurularını yönetin ve değerlendirin
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Link
                    href="/kariyer-merkezi"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-external-link-line mr-2"></i>
                    Kariyer Sayfasını Gör
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Toplam Başvuru</p>
                    <p className="text-3xl font-bold text-gray-900">{basvurular.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="ri-file-list-line text-blue-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Beklemede</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {basvurular.filter(b => b.durum === 'Beklemede').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i className="ri-time-line text-yellow-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Onaylandı</p>
                    <p className="text-3xl font-bold text-green-600">
                      {basvurular.filter(b => b.durum === 'Onaylandı').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="ri-check-line text-green-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Reddedildi</p>
                    <p className="text-3xl font-bold text-red-600">
                      {basvurular.filter(b => b.durum === 'Reddedildi').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <i className="ri-close-line text-red-600 text-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtreleme</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select
                    value={filters.durum}
                    onChange={(e) => setFilters(prev => ({ ...prev, durum: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Tüm Durumlar</option>
                    <option value="Beklemede">Beklemede</option>
                    <option value="Onaylandı">Onaylandı</option>
                    <option value="Reddedildi">Reddedildi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başvuru Türü</label>
                  <select
                    value={filters.basvuru_turu}
                    onChange={(e) => setFilters(prev => ({ ...prev, basvuru_turu: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Tüm Türler</option>
                    <option value="Staj Başvurusu">Staj Başvurusu</option>
                    <option value="İş Başvurusu">İş Başvurusu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eğitim Durumu</label>
                  <select
                    value={filters.egitim_durumu}
                    onChange={(e) => setFilters(prev => ({ ...prev, egitim_durumu: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Tüm Eğitim Durumları</option>
                    <option value="Lise Mezunu">Lise Mezunu</option>
                    <option value="Lisans Öğrencisi">Lisans Öğrencisi</option>
                    <option value="Lisans Mezunu">Lisans Mezunu</option>
                    <option value="Yüksek Lisans Mezunu">Yüksek Lisans Mezunu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Ad, email, telefon..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Applications Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Başvurular ({filteredBasvurular.length})
                </h3>
              </div>

              {filteredBasvurular.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-file-list-line text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-gray-500">Henüz başvuru yok veya filtrelere uygun başvuru bulunamadı</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Başvuru Sahibi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Başvuru Türü
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Eğitim
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tarih
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBasvurular.map((basvuru) => (
                        <tr key={basvuru.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {basvuru.ad_soyad}
                              </div>
                              <div className="text-sm text-gray-500">
                                {basvuru.email}
                              </div>
                              <div className="text-sm text-gray-500">
                                {basvuru.telefon}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              basvuru.basvuru_turu === 'Staj Başvurusu'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              <i className={`${basvuru.basvuru_turu === 'Staj Başvurusu' ? 'ri-graduation-cap-line' : 'ri-briefcase-line'} mr-1`}></i>
                              {basvuru.basvuru_turu}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{basvuru.egitim_durumu}</div>
                            <div className="text-xs text-gray-500">{basvuru.okul_bolum}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(basvuru.durum)}`}>
                              {basvuru.durum}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(basvuru.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleBasvuruDetay(basvuru)}
                              className="text-blue-600 hover:text-blue-900 cursor-pointer"
                            >
                              <i className="ri-eye-line mr-1"></i>
                              Detay
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedBasvuru && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Başvuru Detayı - {selectedBasvuru.ad_soyad}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Başvuru Bilgileri */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Kişisel Bilgiler</h4>
                  <div className="space-y-2">
                    <p><strong>Ad Soyad:</strong> {selectedBasvuru.ad_soyad}</p>
                    <p><strong>E-posta:</strong> {selectedBasvuru.email}</p>
                    <p><strong>Telefon:</strong> {selectedBasvuru.telefon}</p>
                    <p><strong>Başvuru Türü:</strong> {selectedBasvuru.basvuru_turu}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Eğitim Bilgileri</h4>
                  <div className="space-y-2">
                    <p><strong>Eğitim Durumu:</strong> {selectedBasvuru.egitim_durumu}</p>
                    <p><strong>Okul/Bölüm:</strong> {selectedBasvuru.okul_bolum}</p>
                    <p><strong>Mezuniyet Yılı:</strong> {selectedBasvuru.mezuniyet_yili}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">İlgi Alanları</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedBasvuru.ilgi_alanlari}</p>
              </div>

              {selectedBasvuru.aciklama && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Açıklama</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedBasvuru.aciklama}</p>
                </div>
              )}

              {selectedBasvuru.ozgecmis_url && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Özgeçmiş</h4>
                  <a
                    href={selectedBasvuru.ozgecmis_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
                  >
                    <i className="ri-file-pdf-line mr-2"></i>
                    PDF Özgeçmişi Görüntüle
                  </a>
                </div>
              )}

              {/* Admin Notu */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Admin Notu</h4>
                <textarea
                  value={adminNotu}
                  onChange={(e) => setAdminNotu(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Değerlendirme notunuzu yazın..."
                />
              </div>

              {/* Status Info */}
              {selectedBasvuru.durum !== 'Beklemede' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Durum:</strong> {selectedBasvuru.durum}</p>
                  {selectedBasvuru.onaylayan_admin && (
                    <p><strong>İşlem Yapan:</strong> {selectedBasvuru.onaylayan_admin}</p>
                  )}
                  {selectedBasvuru.onay_tarihi && (
                    <p><strong>İşlem Tarihi:</strong> {formatDate(selectedBasvuru.onay_tarihi)}</p>
                  )}
                  {selectedBasvuru.admin_notu && (
                    <p><strong>Önceki Not:</strong> {selectedBasvuru.admin_notu}</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Kapat
              </button>
              {selectedBasvuru.durum === 'Beklemede' && (
                <>
                  <button
                    onClick={() => handleDurumGuncelle('Reddedildi')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    <i className="ri-close-line mr-1"></i>
                    Reddet
                  </button>
                  <button
                    onClick={() => handleDurumGuncelle('Onaylandı')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    <i className="ri-check-line mr-1"></i>
                    Onayla
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
