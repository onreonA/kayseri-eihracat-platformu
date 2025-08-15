'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { DestekDokümanlarıService } from '@/lib/database';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface DestekDokümanları {
  ID: number;
  BelgeAdı: string;
  BelgeURL: string;
  Açıklama: string;
  Kategori: 'B2B Rehber' | 'B2C Kılavuz' | 'Teşvik Form' | 'Genel Bilgi';
  YuklemeTarihi: Date;
  Durum?: string;
}

const getKategoriIcon = (kategori: string) => {
  switch (kategori) {
    case 'B2B Rehber':
      return 'ri-building-line';
    case 'B2C Kılavuz':
      return 'ri-shopping-cart-line';
    case 'Teşvik Form':
      return 'ri-file-text-line';
    case 'Genel Bilgi':
      return 'ri-information-line';
    default:
      return 'ri-file-line';
  }
};

const getKategoriColor = (kategori: string) => {
  switch (kategori) {
    case 'B2B Rehber':
      return 'bg-blue-100 text-blue-800';
    case 'B2C Kılavuz':
      return 'bg-green-100 text-green-800';
    case 'Teşvik Form':
      return 'bg-purple-100 text-purple-800';
    case 'Genel Bilgi':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Admin Sidebar Component
const AdminSidebar = ({ sidebarCollapsed, setSidebarCollapsed }: { sidebarCollapsed: boolean; setSidebarCollapsed: (collapsed: boolean) => void }) => {
  const menuItems = [
    {
      icon: 'ri-dashboard-line',
      label: 'Dashboard',
      href: '/admin-dashboard',
    },
    {
      icon: 'ri-building-line',
      label: 'Firma Yönetimi',
      href: '/admin-firmalar',
    },
    {
      icon: 'ri-project-line',
      label: 'Proje Yönetimi',
      href: '/admin-proje-yonetimi',
    },
    {
      icon: 'ri-calendar-check-line',
      label: 'Randevu Talepleri',
      href: '/admin-randevu-talepleri',
    },
    {
      icon: 'ri-graduation-cap-line',
      label: 'Eğitim Yönetimi',
      href: '/admin-egitim-yonetimi',
    },
    {
      icon: 'ri-calendar-event-line',
      label: 'Etkinlik Yönetimi',
      href: '/admin-etkinlik-yonetimi',
    },
    {
      icon: 'ri-bar-chart-line',
      label: 'Dönem Yönetimi',
      href: '/admin-donem-yonetimi',
    },
    {
      icon: 'ri-discuss-line',
      label: 'Forum Yönetimi',
      href: '/admin-forum-yonetimi',
    },
    {
      icon: 'ri-file-text-line',
      label: 'Destek Dokümanları',
      href: '/admin-destek-dokumanlari',
      active: true,
    },
    {
      icon: 'ri-team-line',
      label: 'Kullanıcılar (Personel)',
      href: '/admin-kullanici-yonetimi',
    },
    {
      icon: 'ri-check-double-line',
      label: 'Görev Onayları',
      href: '/admin-gorev-onaylari',
    },
  ];

  return (
    <div className={`bg-white shadow-lg h-screen fixed left-0 top-0 z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-['Pacifico']">
              logo
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg bg-gray-100/50 hover:bg-gray-200/50 transition-colors cursor-pointer"
          >
            <i className={`ri-${sidebarCollapsed ? 'menu-unfold' : 'menu-fold'}-line text-gray-600`}></i>
          </button>
        </div>
      </div>

      <div className="p-4">
        {!sidebarCollapsed && <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>}
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors cursor-pointer ${
                item.active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className={`${item.icon} text-lg`}></i>
              </div>
              {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

// Stats Cards Component
const StatsCards = ({ dokümanlar }: { dokümanlar: DestekDokümanları[] }) => {
  const stats = {
    toplam: dokümanlar.length,
    b2bRehber: dokümanlar.filter((d) => d.Kategori === 'B2B Rehber').length,
    b2cKilavuz: dokümanlar.filter((d) => d.Kategori === 'B2C Kılavuz').length,
    tesvikForm: dokümanlar.filter((d) => d.Kategori === 'Teşvik Form').length,
    genelBilgi: dokümanlar.filter((d) => d.Kategori === 'Genel Bilgi').length,
  };

  const statCards = [
    { label: 'Toplam Doküman', value: stats.toplam, icon: 'ri-file-text-line', color: 'bg-blue-500' },
    { label: 'B2B Rehber', value: stats.b2bRehber, icon: 'ri-building-line', color: 'bg-green-500' },
    { label: 'B2C Kılavuz', value: stats.b2cKilavuz, icon: 'ri-shopping-cart-line', color: 'bg-purple-500' },
    { label: 'Teşvik Form', value: stats.tesvikForm, icon: 'ri-file-copy-line', color: 'bg-orange-500' },
    { label: 'Genel Bilgi', value: stats.genelBilgi, icon: 'ri-information-line', color: 'bg-red-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
              <i className={`${stat.icon} text-white text-xl`}></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function AdminDestekDokumanlariPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dokümanlar, setDokümanlar] = useState<DestekDokümanları[]>([]);
  const [filteredDokümanlar, setFilteredDokümanlar] = useState<DestekDokümanları[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    BelgeAdı: '',
    BelgeURL: '',
    Açıklama: '',
    Kategori: 'Genel Bilgi' as const,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Tümü');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();
  const { addToast, ToastContainer } = useToast();

  const kategoriler = ['Tümü', 'B2B Rehber', 'B2C Kılavuz', 'Teşvik Form', 'Genel Bilgi'];

  useEffect(() => {
    checkAdminAuth();
    loadDokümanlar();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    filterAndSearchDokümanlar();
  }, [dokümanlar, selectedKategori, searchTerm, sortBy, sortOrder]);

  const checkAdminAuth = async () => {
    try {
      const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
      const adminToken = localStorage.getItem('admin_token');
      
      console.log('🔍 Admin kontrolü (Destek Dokümanları):', { isAdminLoggedIn, adminToken });
      
      if (isAdminLoggedIn === 'true' && adminToken) {
        console.log('✅ Admin girişi doğrulandı (Destek Dokümanları), veriler yükleniyor...');
        setIsAdminLoggedIn(true);
        setAdminEmail(localStorage.getItem('adminEmail') || '');
        return;
      }

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

    } catch (error) {
      console.error('[AdminDestekDokumanlari]', error?.message, error);
      router.replace('/admin-login');
    }
  };

  const loadDokümanlar = async () => {
    try {
      setLoading(true);
      console.log('Destek dokümanları yükleniyor...');

      const data = await DestekDokümanlarıService.getAllDokümanlar();
      console.log('Yüklenen doküman sayısı:', data.length);

      setDokümanlar(data);
      addToast({ message: `${data.length} doküman başarıyla yüklendi`, type: 'success' });
    } catch (error) {
      console.error('Dokümanlar yüklenirken hata:', error);
      addToast({ message: 'Dokümanlar yüklenirken hata oluştu', type: 'error' });
      setDokümanlar([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSearchDokümanlar = () => {
    let filtered = [...dokümanlar];

    if (selectedKategori !== 'Tümü') {
      filtered = filtered.filter((dok) => dok.Kategori === selectedKategori);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (dok) =>
          dok.BelgeAdı.toLowerCase().includes(search) ||
          dok.Açıklama.toLowerCase().includes(search) ||
          dok.Kategori.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.BelgeAdı.toLowerCase();
          bValue = b.BelgeAdı.toLowerCase();
          break;
        case 'category':
          aValue = a.Kategori.toLowerCase();
          bValue = b.Kategori.toLowerCase();
          break;
        case 'date':
        default:
          aValue = new Date(a.YuklemeTarihi).getTime();
          bValue = new Date(b.YuklemeTarihi).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredDokümanlar(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await DestekDokümanlarıService.updateDoküman(editingId, formData);
        addToast({ message: 'Doküman başarıyla güncellendi', type: 'success' });
      } else {
        await DestekDokümanlarıService.createDoküman(formData);
        addToast({ message: 'Doküman başarıyla eklendi', type: 'success' });
      }
      resetForm();
      loadDokümanlar();
    } catch (error) {
      console.error('Doküman işlemi hatası:', error);
      addToast({ message: 'Doküman işlemi sırasında hata oluştu', type: 'error' });
    }
  };

  const handleEdit = (doküman: DestekDokümanları) => {
    setEditingId(doküman.ID);
    setFormData({
      BelgeAdı: doküman.BelgeAdı,
      BelgeURL: doküman.BelgeURL,
      Açıklama: doküman.Açıklama,
      Kategori: doküman.Kategori,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu dokümanı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await DestekDokümanlarıService.deleteDoküman(id);
      addToast({ message: 'Doküman başarıyla silindi', type: 'success' });
      loadDokümanlar();
    } catch (error) {
      console.error('Doküman silme hatası:', error);
      addToast({ message: 'Doküman silinirken hata oluştu', type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      BelgeAdı: '',
      BelgeURL: '',
      Açıklama: '',
      Kategori: 'Genel Bilgi',
    });
    setEditingId(null);
    setShowAddModal(false);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('adminEmail');
      router.push('/admin-login');
    } catch (e) {
      console.error('[AdminDestekDokumanlari]', e?.message, e);
    }
  };

  if (!isAdminLoggedIn || loading) {
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
      <ToastContainer />
      <AdminSidebar sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />

      {/* Main Content with proper margin */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">Admin Panel</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
                >
                  <i className="ri-add-line"></i>
                  <span>Yeni Doküman Ekle</span>
                </button>
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

        {/* Page Content */}
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Destek Dokümanları</h1>
              <p className="text-gray-600 mt-2">Firmalara sunulan destek dokümanlarını yönetin</p>
            </div>

            {/* Stats Cards */}
            <StatsCards dokümanlar={dokümanlar} />

            {/* Search and Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="ri-search-line text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      placeholder="Doküman ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  {kategoriler.map((kategori) => (
                    <button
                      key={kategori}
                      onClick={() => setSelectedKategori(kategori)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap cursor-pointer ${
                        selectedKategori === kategori
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {kategori}
                    </button>
                  ))}
                </div>

                {/* Sort Options */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 whitespace-nowrap">Sırala:</span>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [newSortBy, newSortOrder] = e.target.value.split('-') as [
                        'date' | 'name' | 'category',
                        'asc' | 'desc'
                      ];
                      setSortBy(newSortBy);
                      setSortOrder(newSortOrder);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="date-desc">Tarih (Yeni)</option>
                    <option value="date-asc">Tarih (Eski)</option>
                    <option value="name-asc">İsim (A-Z)</option>
                    <option value="name-desc">İsim (Z-A)</option>
                    <option value="category-asc">Kategori (A-Z)</option>
                    <option value="category-desc">Kategori (Z-A)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Documents Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doküman
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDokümanlar.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <i className="ri-file-text-line text-4xl text-gray-300 mb-4"></i>
                            <p className="text-lg font-medium text-gray-900 mb-2">Doküman bulunamadı</p>
                            <p className="text-gray-500">
                              {searchTerm || selectedKategori !== 'Tümü'
                                ? 'Arama kriterlerinize uygun doküman bulunamadı.'
                                : 'Henüz hiç doküman eklenmemiş.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredDokümanlar.map((doküman) => (
                        <tr key={doküman.ID} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                                <i className={`${getKategoriIcon(doküman.Kategori)} text-gray-600`}></i>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{doküman.BelgeAdı}</div>
                                <div className="text-sm text-gray-500 max-w-xs truncate">{doküman.Açıklama}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getKategoriColor(doküman.Kategori)}`}>
                              {doküman.Kategori}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(doküman.YuklemeTarihi).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Aktif
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(doküman)}
                                className="text-blue-600 hover:text-blue-900 cursor-pointer"
                                title="Düzenle"
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                              <button
                                onClick={() => handleDelete(doküman.ID)}
                                className="text-red-600 hover:text-red-900 cursor-pointer"
                                title="Sil"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={resetForm}
          title={editingId ? 'Doküman Düzenle' : 'Yeni Doküman Ekle'}
          size="lg"
        >
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doküman Adı *
                </label>
                <input
                  type="text"
                  value={formData.BelgeAdı}
                  onChange={(e) => setFormData((prev) => ({ ...prev, BelgeAdı: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Örn: E-İhracat Başlangıç Rehberi"
                  required
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.BelgeAdı.length}/200 karakter</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  value={formData.Kategori}
                  onChange={(e) => setFormData((prev) => ({ ...prev, Kategori: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                  required
                >
                  <option value="Genel Bilgi">Genel Bilgi</option>
                  <option value="B2B Rehber">B2B Rehber</option>
                  <option value="B2C Kılavuz">B2C Kılavuz</option>
                  <option value="Teşvik Form">Teşvik Form</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dosya URL *
                </label>
                <input
                  type="text"
                  value={formData.BelgeURL}
                  onChange={(e) => setFormData((prev) => ({ ...prev, BelgeURL: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Örn: /documents/e-ihracat-rehberi.pdf"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Dosyanın tam URL yolunu giriniz</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama *
                </label>
                <textarea
                  value={formData.Açıklama}
                  onChange={(e) => setFormData((prev) => ({ ...prev, Açıklama: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  placeholder="Dokümanın içeriği ve amacı hakkında detaylı bilgi veriniz"
                  required
                  minLength={10}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.Açıklama.length}/500 karakter (minimum 10 karakter)
                </p>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
                >
                  <i className={`ri-${editingId ? 'check' : 'add'}-line`}></i>
                  <span>{editingId ? 'Güncelle' : 'Ekle'}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
