
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ForumService } from '@/lib/database';

interface ForumKonu {
  ID: number;
  KonuBasligi: string;
  KonuAcanFirmaID: number;
  FirmaAdı: string;
  OlusturmaTarihi: Date;
  SonMesajTarihi: Date;
  Kategori: string;
  Durum: 'Açık' | 'Kilitli';
  CevapSayisi: number;
}

interface ForumCevap {
  ID: number;
  KonuID: number;
  CevapYazanFirmaID?: number;
  CevapYazanPersonelID?: number;
  CevapMetni: string;
  CevapTarihi: Date;
  YorumID?: number;
  YazarAdı: string;
  YazarTipi: 'Firma' | 'Personel';
}

// Sidebar component
const AdminSidebar = ({ activeMenuItem, setActiveMenuItem }: { activeMenuItem: string; setActiveMenuItem: (item: string) => void }) => {
  const menuItems = [
    { name: 'Dashboard', icon: 'ri-dashboard-line', active: false, href: '/admin-dashboard' },
    { name: 'Firmalar', icon: 'ri-building-line', active: false, href: '/admin-firmalar' },
    { name: 'Proje Yönetimi', icon: 'ri-folder-line', active: false, href: '/admin-proje-yonetimi' },
    { name: 'Randevu Talepleri', icon: 'ri-calendar-check-line', active: false, href: '/admin-randevu-talepleri' },
    { name: 'Eğitim Yönetimi', icon: 'ri-graduation-cap-line', active: false, href: '/admin-egitim-yonetimi' },
    { name: 'Etkinlik Yönetimi', icon: 'ri-calendar-event-line', active: false, href: '/admin-etkinlik-yonetimi' },
    { name: 'Dönem Yönetimi', icon: 'ri-bar-chart-line', active: false, href: '/admin-donem-yonetimi' },
    { name: 'Forum Yönetimi', icon: 'ri-discuss-line', active: true },
    { name: 'Platform Geri Bildirimleri', icon: 'ri-feedback-line', active: false, href: '/admin-geri-bildirimler' },
    { name: 'Destek Dokümanları', icon: 'ri-file-text-line', active: false, href: '/admin-destek-dokumanlari' },
    { name: 'Kullanıcılar (Personel)', icon: 'ri-team-line', active: false, href: '/admin-kullanici-yonetimi' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen sticky top-0">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>
        <nav className="space-y-2">
          {menuItems.map((item) =>
            item.href ? (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  activeMenuItem === item.name ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            ) : (
              <button
                key={item.name}
                onClick={() => setActiveMenuItem(item.name)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  activeMenuItem === item.name ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            )
          )}
        </nav>
      </div>
    </div>
  );
};

export default function AdminForumYonetimiPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [activeMenuItem, setActiveMenuItem] = useState('Forum Yönetimi');
  const [activeTab, setActiveTab] = useState('konular');
  const [konular, setKonular] = useState<ForumKonu[]>([]);
  const [selectedKonu, setSelectedKonu] = useState<ForumKonu | null>(null);
  const [cevaplar, setCevaplar] = useState<ForumCevap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKategori, setSelectedKategori] = useState('Tümü');
  const [selectedDurum, setSelectedDurum] = useState('Tümü');
  const [searchTerm, setSearchTerm] = useState('');
  const [showKonuModal, setShowKonuModal] = useState(false);
  const [showCevapModal, setShowCevapModal] = useState(false);
  const [message, setMessage] = useState('');
  const [istatistikler, setIstatistikler] = useState<{ kategori: string; konuSayisi: number; cevapSayisi: number }[]>([]);
  const router = useRouter();

  const kategoriler = ['Tümü', 'Genel', 'B2B', 'B2C', 'Lojistik', 'Teşvikler', 'Teknik Destek'];
  const durumlar = ['Tümü', 'Açık', 'Kilitli'];

  useEffect(() => {
    checkAdminAuth();
  }, [router]);

  const checkAdminAuth = async () => {
    try {
      // Önce localStorage kontrolü yap
      const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
      const adminToken = localStorage.getItem('admin_token');
      
      console.log('🔍 Admin kontrolü (Forum Yönetimi):', { isAdminLoggedIn, adminToken });
      
      if (isAdminLoggedIn === 'true' && adminToken) {
        console.log('✅ Admin girişi doğrulandı (Forum Yönetimi), veriler yükleniyor...');
        setIsAdminLoggedIn(true);
        setAdminEmail(localStorage.getItem('adminEmail') || '');
        loadData();
        return;
      }

      // Fallback: Supabase kontrolü
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.log('❌ Supabase bağlantısı yok, login\'e yönlendiriliyor...');
        router.replace('/admin-login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ Supabase session yok, login\'e yönlendiriliyor...');
        router.replace('/admin-login');
        return;
      }

      loadData();
    } catch (error) {
      console.error('[AdminForumYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/admin-login');
    }
  };

  const loadData = async () => {
    try {
      const [konularData, istatistiklerData] = await Promise.all([
        ForumService.getAllKonular(),
        ForumService.getKategoriIstatistikleri(),
      ]);

      setKonular(konularData);
      setIstatistikler(istatistiklerData);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/');
  };

  const handleKonuDetay = async (konu: ForumKonu) => {
    try {
      const cevaplarData = await ForumService.getKonuCevapları(konu.ID);
      setSelectedKonu(konu);
      setCevaplar(cevaplarData);
      setShowKonuModal(true);
    } catch (error) {
      setMessage('Konu detayları yüklenirken bir hata oluştu.');
    }
  };

  const handleKonuDurumDegistir = async (konuId: number, yeniDurum: 'Açık' | 'Kilitli') => {
    try {
      await ForumService.updateKonuDurum(konuId, yeniDurum);
      setKonular((prev) =>
        prev.map((konu) => (konu.ID === konuId ? { ...konu, Durum: yeniDurum } : konu))
      );
      setMessage(`Konu durumu ${yeniDurum.toLowerCase()} olarak güncellendi.`);

      if (selectedKonu && selectedKonu.ID === konuId) {
        setSelectedKonu((prev) => (prev ? { ...prev, Durum: yeniDurum } : null));
      }
    } catch (error) {
      setMessage('Konu durumu güncellenirken bir hata oluştu.');
    }
  };

  const handleKonuSil = async (konuId: number) => {
    if (confirm('Bu konuyu ve tüm cevaplarını silmek istediğinizden emin misiniz?')) {
      try {
        await ForumService.deleteKonu(konuId);
        setKonular((prev) => prev.filter((konu) => konu.ID !== konuId));
        setMessage('Konu başarıyla silindi.');
        setShowKonuModal(false);
      } catch (error) {
        setMessage('Konu silinirken bir hata oluştu.');
      }
    }
  };

  const handleCevapSil = async (cevapId: number) => {
    if (confirm('Bu cevabı silmek istediğinizden emin misiniz?')) {
      try {
        await ForumService.deleteCevap(cevapId);
        setCevaplar((prev) => prev.filter((cevap) => cevap.ID !== cevapId));
        setMessage('Cevap başarıyla silindi.');
        // Konu listesindeki cevap sayısını güncelle
        if (selectedKonu) {
          setKonular((prev) =>
            prev.map((konu) =>
              konu.ID === selectedKonu.ID
                ? { ...konu, CevapSayisi: konu.CevapSayisi - 1 }
                : konu
            )
          );
        }
      } catch (error) {
        setMessage('Cevap silinirken bir hata oluştu.');
      }
    }
  };



  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'Genel':
        return 'bg-blue-100 text-blue-800';
      case 'B2B':
        return 'bg-green-100 text-green-800';
      case 'B2C':
        return 'bg-purple-100 text-purple-800';
      case 'Lojistik':
        return 'bg-orange-100 text-orange-800';
      case 'Teşvikler':
        return 'bg-yellow-100 text-yellow-800';
      case 'Teknik Destek':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTarih = (tarih: Date) => {
    return new Date(tarih).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 安全的计算平均回复数，防止NaN
  const safeCalculateAverage = (cevapSayisi: number, konuSayisi: number): string => {
    if (!konuSayisi || konuSayisi === 0 || !Number.isFinite(konuSayisi)) {
      return '0';
    }
    if (!cevapSayisi || !Number.isFinite(cevapSayisi)) {
      return '0';
    }
    const average = cevapSayisi / konuSayisi;
    if (!Number.isFinite(average)) {
      return '0';
    }
    return (Math.round(average * 10) / 10).toString();
  };

  // 安全的数值显示，防止NaN
  const safeNumber = (value: any): string => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return '0';
    }
    return String(Number(value));
  };

  const filteredKonular = konular.filter((konu) => {
    const kategoriMatch = selectedKategori === 'Tümü' || konu.Kategori === selectedKategori;
    const durumMatch = selectedDurum === 'Tümü' || konu.Durum === selectedDurum;
    const searchMatch =
      konu.KonuBasligi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      konu.FirmaAdı.toLowerCase().includes(searchTerm.toLowerCase());
    return kategoriMatch && durumMatch && searchMatch;
  });

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Yükleniyor...</p>
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
            <div className="flex items-center">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-pacifico">
                logo
              </Link>
              <span className="ml-4 text-gray-600">Forum Yönetimi</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Yönetici - {adminEmail}</span>
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
        <AdminSidebar activeMenuItem={activeMenuItem} setActiveMenuItem={setActiveMenuItem} />

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Forum Yönetimi</h1>
                  <p className="text-gray-600">Forum konularını ve cevaplarını yönetin</p>
                </div>
              </div>
            </div>

            {message && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  message.includes('başarıyla') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <p
                  className={`text-sm ${
                    message.includes('başarıyla') ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {message}
                </p>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Toplam Konu</p>
                    <p className="text-2xl font-bold text-blue-600">{safeNumber(konular.length)}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="ri-chat-3-line text-blue-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Toplam Cevap</p>
                    <p className="text-2xl font-bold text-green-600">
                      {safeNumber(
                        konular.reduce((total, konu) => total + (Number(konu.CevapSayisi) || 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="ri-chat-1-line text-green-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Kilitli Konu</p>
                    <p className="text-2xl font-bold text-red-600">
                      {safeNumber(konular.filter((k) => k.Durum === 'Kilitli').length)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <i className="ri-lock-line text-red-600 text-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('konular')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                      activeTab === 'konular'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Konular
                  </button>
                  <button
                    onClick={() => setActiveTab('istatistikler')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                      activeTab === 'istatistikler'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    İstatistikler
                  </button>
                </nav>
              </div>

              {activeTab === 'konular' && (
                <div className="p-6">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input
                          type="text"
                          placeholder="Konularda ara..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                    <select
                      value={selectedKategori}
                      onChange={(e) => setSelectedKategori(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                    >
                      {kategoriler.map((kategori) => (
                        <option key={kategori} value={kategori}>
                          {kategori}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedDurum}
                      onChange={(e) => setSelectedDurum(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                    >
                      {durumlar.map((durum) => (
                        <option key={durum} value={durum}>
                          {durum}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Forum Konuları */}
                  {loading ? (
                    <div className="flex justify-center items-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  ) : filteredKonular.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-chat-3-line text-gray-400 text-3xl"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz konu yok'}
                      </h3>
                      <p className="text-gray-600">
                        {searchTerm ? 'Farklı kelimeler ile arama yapın' : 'Firmalar henüz konu açmamış'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Konu</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Kategori</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Firma</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Cevap</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Durum</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Tarih</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredKonular.map((konu) => (
                            <tr key={konu.ID} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">{konu.KonuBasligi}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKategoriColor(konu.Kategori)}`}>
                                  {konu.Kategori}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600">{konu.FirmaAdı}</td>
                              <td className="py-3 px-4 text-gray-600">{safeNumber(konu.CevapSayisi)}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    konu.Durum === 'Açık' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {konu.Durum === 'Açık' ? <i className="ri-unlock-line mr-1"></i> : <i className="ri-lock-line mr-1"></i>}
                                  {konu.Durum}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600 text-sm">
                                {formatTarih(konu.OlusturmaTarihi)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleKonuDetay(konu)}
                                    className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors"
                                  >
                                    <i className="ri-eye-line text-blue-600"></i>
                                  </button>
                                  <button
                                    onClick={() => handleKonuDurumDegistir(konu.ID, konu.Durum === 'Açık' ? 'Kilitli' : 'Açık')}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                                      konu.Durum === 'Açık'
                                        ? 'bg-red-100 hover:bg-red-200'
                                        : 'bg-green-100 hover:bg-green-200'
                                    }`}
                                  >
                                    <i className={`${konu.Durum === 'Açık' ? 'ri-lock-line text-red-600' : 'ri-unlock-line text-green-600'}`}></i>
                                  </button>
                                  <button
                                    onClick={() => handleKonuSil(konu.ID)}
                                    className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-200 transition-colors"
                                  >
                                    <i className="ri-delete-bin-line text-red-600"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'istatistikler' && (
                <div className="p-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {istatistikler.map((stat) => (
                      <div key={stat.kategori} className="bg-gray-50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">{stat.kategori}</h3>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getKategoriColor(stat.kategori)}`}>
                            <i className="ri-chat-3-line text-lg"></i>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Konu Sayısı:</span>
                            <span className="font-semibold text-gray-900">{safeNumber(stat.konuSayisi)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cevap Sayısı:</span>
                            <span className="font-semibold text-gray-900">{safeNumber(stat.cevapSayisi)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ortalama Cevap:</span>
                            <span className="font-semibold text-gray-900">
                              {safeCalculateAverage(stat.cevapSayisi, stat.konuSayisi)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Konu Detay Modal */}
      {showKonuModal && selectedKonu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Konu Detayı</h3>
              <button
                onClick={() => setShowKonuModal(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-6">
              {/* Konu Bilgileri */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getKategoriColor(selectedKonu.Kategori)}`}>
                    {selectedKonu.Kategori}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedKonu.Durum === 'Açık' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedKonu.Durum}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedKonu.KonuBasligi}</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Açan: {selectedKonu.FirmaAdı}</span>
                  <span>Tarih: {formatTarih(selectedKonu.OlusturmaTarihi)}</span>
                  <span>Cevap: {safeNumber(selectedKonu.CevapSayisi)}</span>
                </div>
              </div>

              {/* Cevaplar */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Cevaplar ({safeNumber(cevaplar.length)})</h3>
                {cevaplar.map((cevap, index) => (
                  <div key={cevap.ID} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{cevap.YazarAdı}</span>
                          {cevap.YazarTipi === 'Personel' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              Uzman
                            </span>
                          )}
                          {index === 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Konu Sahibi
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mb-2 whitespace-pre-wrap">{cevap.CevapMetni}</p>
                        <p className="text-sm text-gray-500">{formatTarih(cevap.CevapTarihi)}</p>
                      </div>
                      <button
                        onClick={() => handleCevapSil(cevap.ID)}
                        className="ml-4 w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-200 transition-colors"
                      >
                        <i className="ri-delete-bin-line text-red-600"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4 p-6 border-t border-gray-200">
              <button
                onClick={() => handleKonuDurumDegistir(selectedKonu.ID, selectedKonu.Durum === 'Açık' ? 'Kilitli' : 'Açık')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedKonu.Durum === 'Açık'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {selectedKonu.Durum === 'Açık' ? 'Kilitle' : 'Aç'}
              </button>
              <button
                onClick={() => handleKonuSil(selectedKonu.ID)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Konuyu Sil
              </button>
              <button
                onClick={() => setShowKonuModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
