
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminRandevuService, AdminFirmaService } from '@/lib/database';

// Admin Sidebar - Dashboard ile aynı tasarım
const AdminSidebar = ({ sidebarOpen, setSidebarOpen, adminEmail, handleLogout }: { 
  sidebarOpen: boolean; 
  setSidebarOpen: (open: boolean) => void;
  adminEmail: string;
  handleLogout: () => void;
}) => {
  const menuItems = [
    {
      icon: 'ri-dashboard-line',
      label: 'Dashboard',
      href: '/admin-dashboard',
      active: false,
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
      active: true,
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
    <div className={`bg-white shadow-lg h-screen fixed left-0 top-0 z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {sidebarOpen && (
            <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-['Pacifico']">
              logo
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-gray-100/50 hover:bg-gray-200/50 transition-colors cursor-pointer"
          >
            <i className={`ri-${sidebarOpen ? 'menu-unfold' : 'menu-fold'}-line text-gray-600`}></i>
          </button>
        </div>
      </div>

      <div className="p-4">
        {sidebarOpen && <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>}
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center ${!sidebarOpen ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors cursor-pointer ${
                item.active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className={`${item.icon} text-lg`}></i>
              </div>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default function AdminRandevuTalepleriPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [randevuTalepleri, setRandevuTalepleri] = useState<any[]>([]);
  const [firmalar, setFirmalar] = useState<any[]>([]);
  const [personeller, setPersoneller] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [istatistikler, setIstatistikler] = useState<any>({});
  const [selectedDurum, setSelectedDurum] = useState<string>('Tümü');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRandevu, setSelectedRandevu] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    durum: '',
    atananPersonelId: '',
    gerceklesenTarihSaat: '',
    adminNotu: ''
  });
  const [addFormData, setAddFormData] = useState({
    firmaId: '',
    konu: '',
    mesaj: '',
    tercihEdilenTarihSaat1: '',
    tercihEdilenTarihSaat2: '',
    tercihEdilenTarihSaat3: '',
    durum: 'Beklemede'
  });
  const [message, setMessage] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const router = useRouter();

  const durumlar = ['Tümü', 'Beklemede', 'Onaylandı', 'Reddedildi', 'Tamamlandı'];

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        // Önce localStorage kontrolü yap
        const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
        const adminToken = localStorage.getItem('admin_token');
        
        console.log('🔍 Admin kontrolü (Randevu Talepleri):', { isAdminLoggedIn, adminToken });
        
        if (isAdminLoggedIn === 'true' && adminToken) {
          console.log('✅ Admin girişi doğrulandı (Randevu Talepleri), veriler yükleniyor...');
          setIsAdminLoggedIn(true);
          setAdminEmail(localStorage.getItem('adminEmail') || '');
          loadAllData();
          return;
        }

        console.log('❌ Admin girişi bulunamadı, login\'e yönlendiriliyor...');
        router.push('/admin-login');
      } catch (error) {
        console.error('[RandevuTalepleri]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
        router.push('/admin-login');
      }
    };

    checkAdminAuth();
  }, [router]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const [randevuData, firmaData, personelData, istatistikData] = await Promise.all([
        AdminRandevuService.getAllRandevuTalepleri(),
        AdminFirmaService.getAllFirmalar(),
        AdminRandevuService.getPersonelListesi(),
        AdminRandevuService.getRandevuIstatistikleri()
      ]);

      setRandevuTalepleri(randevuData);
      setFirmalar(firmaData);
      setPersoneller(personelData);
      setIstatistikler(istatistikData);

      console.log('✅ Tüm data yüklendi:', {
        randevuSayisi: randevuData.length,
        firmaSayisi: firmaData.length,
        personelSayisi: personelData.length,
        istatistikler: istatistikData
      });

    } catch (error) {
      console.error('❌ Data yükleme hatası:', error);
      showMessage('Veriler yüklenirken hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    router.push('/admin-login');
  };

  const handleShowDetail = (randevu: any) => {
    setSelectedRandevu(randevu);
    setShowDetailModal(true);
  };

  const handleStartEdit = (randevu: any) => {
    setEditingId(randevu.id || randevu.ID);
    setEditData({
      durum: randevu.durum || randevu.Durum,
      atananPersonelId: randevu.atananPersonelId?.toString() || randevu.AtananPersonelID?.toString() || '',
      gerceklesenTarihSaat: randevu.gerceklesenTarihSaat 
        ? new Date(randevu.gerceklesenTarihSaat).toISOString().slice(0, 16)
        : randevu.GerceklesenTarihSaat
        ? new Date(randevu.GerceklesenTarihSaat).toISOString().slice(0, 16)
        : '',
      adminNotu: randevu.adminNotu || randevu.AdminNotu || ''
    });
  };

  const handleSaveEdit = async (randevuId: number) => {
    try {
      const updateData: any = {
        durum: editData.durum,
        atananPersonelId: editData.atananPersonelId ? parseInt(editData.atananPersonelId) : undefined,
        gerceklesenTarihSaat: editData.gerceklesenTarihSaat ? editData.gerceklesenTarihSaat : undefined,
        adminNotu: editData.adminNotu || undefined
      };

      const success = await AdminRandevuService.updateRandevuTalebi(randevuId, updateData);
      
      if (success) {
        setEditingId(null);
        showMessage('Randevu talebi başarıyla güncellendi!', 'success');
        loadAllData();
      } else {
        showMessage('Randevu talebi güncellenirken hata oluştu.', 'error');
      }
    } catch (error) {
      console.error('Randevu güncelleme hatası:', error);
      showMessage('Randevu talebi güncellenirken hata oluştu.', 'error');
    }
  };

  const handleAddRandevu = async () => {
    try {
      if (!addFormData.firmaId || !addFormData.konu || !addFormData.tercihEdilenTarihSaat1) {
        showMessage('Firma, konu ve tercih edilen tarih zorunludur!', 'error');
        return;
      }

      const randevuData = {
        firmaId: parseInt(addFormData.firmaId),
        konu: addFormData.konu,
        mesaj: addFormData.mesaj,
        tercihEdilenTarihSaat1: addFormData.tercihEdilenTarihSaat1,
        tercihEdilenTarihSaat2: addFormData.tercihEdilenTarihSaat2 || undefined,
        tercihEdilenTarihSaat3: addFormData.tercihEdilenTarihSaat3 || undefined,
        durum: addFormData.durum
      };

      await AdminRandevuService.addRandevuTalebi(randevuData);
      
      setShowAddModal(false);
      setAddFormData({
        firmaId: '',
        konu: '',
        mesaj: '',
        tercihEdilenTarihSaat1: '',
        tercihEdilenTarihSaat2: '',
        tercihEdilenTarihSaat3: '',
        durum: 'Beklemede'
      });
      
      showMessage('Randevu talebi başarıyla oluşturuldu!', 'success');
      loadAllData();

    } catch (error) {
      console.error('Randevu ekleme hatası:', error);
      showMessage(error instanceof Error ? error.message : 'Randevu oluşturulurken hata oluştu.', 'error');
    }
  };

  const handleDeleteRandevu = async (randevuId: number) => {
    try {
      const success = await AdminRandevuService.deleteRandevuTalebi(randevuId);
      
      if (success) {
        setDeleteConfirmId(null);
        showMessage('Randevu talebi başarıyla silindi!', 'success');
        loadAllData();
      } else {
        showMessage('Randevu talebi silinirken hata oluştu.', 'error');
      }
    } catch (error) {
      console.error('Randevu silme hatası:', error);
      showMessage('Randevu talebi silinirken hata oluştu.', 'error');
    }
  };

  const getDurumBadge = (durum: string) => {
    switch (durum) {
      case 'Beklemede':
        return 'bg-yellow-100 text-yellow-800';
      case 'Onaylandı':
        return 'bg-green-100 text-green-800';
      case 'Reddedildi':
        return 'bg-red-100 text-red-800';
      case 'Tamamlandı':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDurumIcon = (durum: string) => {
    switch (durum) {
      case 'Beklemede':
        return 'ri-time-line';
      case 'Onaylandı':
        return 'ri-check-line';
      case 'Reddedildi':
        return 'ri-close-line';
      case 'Tamamlandı':
        return 'ri-check-double-line';
      default:
        return 'ri-question-line';
    }
  };

  const filteredRandevuTalepleri = selectedDurum === 'Tümü'
    ? randevuTalepleri
    : randevuTalepleri.filter(randevu => (randevu.durum || randevu.Durum) === selectedDurum);

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Sidebar */}
      <AdminSidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        adminEmail={adminEmail}
        handleLogout={handleLogout}
      />

      {/* Main Content with proper margin */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">Randevu Talepleri</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
                >
                  <i className="ri-calendar-check-line"></i>
                  <span>Yeni Randevu Talebi</span>
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

        {/* Main Content */}
        <main className="p-6">
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${ 
              message.includes('başarıyla') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${message.includes('başarıyla') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            </div>
          )}

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-time-line text-yellow-600 text-xl"></i>
                </div>
                <span className="text-sm font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                  Bekliyor
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {istatistikler.beklemede || randevuTalepleri.filter(r => (r.durum || r.Durum) === 'Beklemede').length}
              </h3>
              <p className="text-gray-600 text-sm">Beklemede</p>
              <div className="mt-2 text-xs text-gray-500">
                Bu hafta: {istatistikler.haftaninToplami || 0}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-check-line text-green-600 text-xl"></i>
                </div>
                <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Onaylı
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {istatistikler.onaylandi || randevuTalepleri.filter(r => (r.durum || r.Durum) === 'Onaylandı').length}
              </h3>
              <p className="text-gray-600 text-sm">Onaylandı</p>
              <div className="mt-2 text-xs text-gray-500">
                Bu ay: {istatistikler.buAyToplam || 0}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-check-double-line text-blue-600 text-xl"></i>
                </div>
                <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Bitti
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {istatistikler.tamamlandi || randevuTalepleri.filter(r => (r.durum || r.Durum) === 'Tamamlandı').length}
              </h3>
              <p className="text-gray-600 text-sm">Tamamlandı</p>
              <div className="mt-2 text-xs text-gray-500">
                Bugün: {istatistikler.bugunkuTalepler || 0}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-close-line text-red-600 text-xl"></i>
                </div>
                <span className="text-sm font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  Red
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {istatistikler.reddedildi || randevuTalepleri.filter(r => (r.durum || r.Durum) === 'Reddedildi').length}
              </h3>
              <p className="text-gray-600 text-sm">Reddedildi</p>
              <div className="mt-2 text-xs text-gray-500">
                Geçen ay: {istatistikler.gecenAyToplam || 0}
              </div>
            </div>
          </div>

          {/* Filter & Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtrele & İşlemler</h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={loadAllData}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 whitespace-nowrap"
                  disabled={loading}
                >
                  <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
                  <span>Yenile</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {durumlar.map((durum) => (
                <button
                  key={durum}
                  onClick={() => setSelectedDurum(durum)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${ 
                    selectedDurum === durum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {durum}
                  {durum !== 'Tümü' && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {durum === 'Beklemede' ? istatistikler.beklemede : 
                       durum === 'Onaylandı' ? istatistikler.onaylandi :
                       durum === 'Reddedildi' ? istatistikler.reddedildi :
                       durum === 'Tamamlandı' ? istatistikler.tamamlandi : 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Randevu Talepleri List */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Randevu talepleri yükleniyor...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Randevu Talepleri ({filteredRandevuTalepleri.length})
                </h2>
                <div className="text-sm text-gray-500">
                  Toplam {randevuTalepleri.length} talep
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Firma</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Konu</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Tercih Edilen Tarih</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Durum</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Atanan Personel</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Talep Tarihi</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRandevuTalepleri && filteredRandevuTalepleri.length > 0 ? filteredRandevuTalepleri.map((randevu) => {
                      const randevuId = randevu.id || randevu.ID;
                      const firmaAdi = randevu.firmaAdi || randevu.FirmaAdı;
                      const konu = randevu.konu || randevu.Konu;
                      const durum = randevu.durum || randevu.Durum;
                      const tercihTarih = randevu.tercihEdilenTarihSaat1 || randevu.TercihEdilenTarihSaat1;
                      const personelAdi = randevu.personelAdi || randevu.PersonelAdı;
                      const talepTarihi = randevu.talepTarihi || randevu.TalepTarihi;

                      return (
                        <tr key={randevuId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-6">
                            <div className="font-medium text-gray-900">{firmaAdi}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-medium text-gray-900">{konu}</div>
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {tercihTarih && new Date(tercihTarih).toLocaleDateString('tr-TR')} 
                            {tercihTarih && ` `} 
                            {tercihTarih && new Date(tercihTarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-6">
                            {editingId === randevuId ? (
                              <select
                                value={editData.durum}
                                onChange={(e) => setEditData(prev => ({ ...prev, durum: e.target.value }))}
                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm pr-8"
                              >
                                <option value="Beklemede">Beklemede</option>
                                <option value="Onaylandı">Onaylandı</option>
                                <option value="Reddedildi">Reddedildi</option>
                                <option value="Tamamlandı">Tamamlandı</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDurumBadge(durum)}`}>
                                <i className={`${getDurumIcon(durum)} mr-1`}></i>
                                {durum}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {editingId === randevuId ? (
                              <select
                                value={editData.atananPersonelId}
                                onChange={(e) => setEditData(prev => ({ ...prev, atananPersonelId: e.target.value }))}
                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm pr-8"
                              >
                                <option value="">Personel Seç</option>
                                {personeller && personeller.length > 0 ? personeller.map(personel => (
                                  <option key={personel.id || personel.ID} value={personel.id || personel.ID}>
                                    {personel.adSoyad || personel.AdSoyad}
                                  </option>
                                )) : null}
                              </select>
                            ) : (
                              <span className="text-gray-600">{personelAdi || 'Atanmadı'}</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-gray-600 text-sm">
                            {talepTarihi && new Date(talepTarihi).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="py-4 px-6">
                            {editingId === randevuId ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSaveEdit(randevuId)}
                                  className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center hover:bg-green-200 transition-colors"
                                  title="Kaydet"
                                >
                                  <i className="ri-check-line text-green-600"></i>
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                                  title="İptal"
                                >
                                  <i className="ri-close-line text-gray-600"></i>
                                </button>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleShowDetail(randevu)}
                                  className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors"
                                  title="Detayları Görüntüle"
                                >
                                  <i className="ri-eye-line text-blue-600"></i>
                                </button>
                                <button
                                  onClick={() => handleStartEdit(randevu)}
                                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                                  title="Düzenle"
                                >
                                  <i className="ri-edit-line text-gray-600"></i>
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(randevuId)}
                                  className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors"
                                  title="Sil"
                                >
                                  <i className="ri-delete-bin-line text-red-600"></i>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={7} className="py-8 px-6 text-center text-gray-500">
                          <div className="flex flex-col items-center space-y-2">
                            <i className="ri-calendar-check-line text-4xl text-gray-300"></i>
                            <p>Henüz randevu talebi bulunmuyor</p>
                            <button
                              onClick={() => setShowAddModal(true)}
                              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              İlk Randevu Talebini Oluştur
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Randevu Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Yeni Randevu Talebi Oluştur</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Firma *</label>
                  <select
                    value={addFormData.firmaId}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, firmaId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm pr-8"
                    required
                  >
                    <option value="">Firma Seçin</option>
                    {firmalar.map(firma => (
                      <option key={firma.id} value={firma.id}>
                        {firma.firma_adi}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                  <select
                    value={addFormData.durum}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, durum: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm pr-8"
                  >
                    <option value="Beklemede">Beklemede</option>
                    <option value="Onaylandı">Onaylandı</option>
                    <option value="Reddedildi">Reddedildi</option>
                    <option value="Tamamlandı">Tamamlandı</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Randevu Konusu *</label>
                <input
                  type="text"
                  value={addFormData.konu}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, konu: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Örn: E-ihracat eğitimi, Dijital pazarlama danışmanlığı"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mesaj</label>
                <textarea
                  value={addFormData.mesaj}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, mesaj: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Randevu ile ilgili detaylı açıklama..."
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">1. Tercih Tarih/Saat *</label>
                  <input
                    type="datetime-local"
                    value={addFormData.tercihEdilenTarihSaat1}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, tercihEdilenTarihSaat1: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">2. Tercih Tarih/Saat</label>
                  <input
                    type="datetime-local"
                    value={addFormData.tercihEdilenTarihSaat2}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, tercihEdilenTarihSaat2: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">3. Tercih Tarih/Saat</label>
                  <input
                    type="datetime-local"
                    value={addFormData.tercihEdilenTarihSaat3}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, tercihEdilenTarihSaat3: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                İptal
              </button>
              <button
                onClick={handleAddRandevu}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Randevu Talebi Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRandevu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Randevu Detayları</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
                  <p className="text-gray-900">{selectedRandevu.firmaAdi || selectedRandevu.FirmaAdı}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konu</label>
                  <p className="text-gray-900">{selectedRandevu.konu || selectedRandevu.Konu}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900">{selectedRandevu.mesaj || selectedRandevu.Mesaj}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tercih Edilen Tarih/Saat</label>
                  <p className="text-gray-900">
                    {selectedRandevu.tercihEdilenTarihSaat1 || selectedRandevu.TercihEdilenTarihSaat1 ? 
                      new Date(selectedRandevu.tercihEdilenTarihSaat1 || selectedRandevu.TercihEdilenTarihSaat1).toLocaleDateString('tr-TR') + ' ' +
                      new Date(selectedRandevu.tercihEdilenTarihSaat1 || selectedRandevu.TercihEdilenTarihSaat1).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                      : 'Belirtilmedi'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talep Tarihi</label>
                  <p className="text-gray-900">
                    {selectedRandevu.talepTarihi || selectedRandevu.TalepTarihi ?
                      new Date(selectedRandevu.talepTarihi || selectedRandevu.TalepTarihi).toLocaleDateString('tr-TR')
                      : 'Belirtilmedi'
                    }
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDurumBadge(selectedRandevu.durum || selectedRandevu.Durum)}`}>
                    <i className={`${getDurumIcon(selectedRandevu.durum || selectedRandevu.Durum)} mr-1`}></i>
                    {selectedRandevu.durum || selectedRandevu.Durum}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Atanan Personel</label>
                  <p className="text-gray-900">{selectedRandevu.personelAdi || selectedRandevu.PersonelAdı || 'Atanmadı'}</p>
                </div>
              </div>

              {(selectedRandevu.gerceklesenTarihSaat || selectedRandevu.GerceklesenTarihSaat) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gerçekleşen Tarih/Saat</label>
                  <p className="text-gray-900">
                    {new Date(selectedRandevu.gerceklesenTarihSaat || selectedRandevu.GerceklesenTarihSaat).toLocaleDateString('tr-TR')} 
                    {' '} 
                    {new Date(selectedRandevu.gerceklesenTarihSaat || selectedRandevu.GerceklesenTarihSaat).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}

              {(selectedRandevu.adminNotu || selectedRandevu.AdminNotu) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notu</label>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-900">{selectedRandevu.adminNotu || selectedRandevu.AdminNotu}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <i className="ri-delete-bin-line text-red-600 text-lg"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Randevu Talebini Sil</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Bu randevu talebini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                İptal
              </button>
              <button
                onClick={() => handleDeleteRandevu(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
