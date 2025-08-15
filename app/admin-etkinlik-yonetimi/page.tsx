'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { AdminEtkinlikService, AdminFirmaService } from '../../lib/database';

interface Etkinlik {
  id: number;
  etkinlik_adi: string;
  aciklama: string;
  tarih_saat: Date;
  yer: string;
  organizator: string;
  katilimci_firmalar: number[];
  katilimci_firma_detaylari?: any[];
  onayli_katilimcilar?: number[];
  bekleyen_onaylar?: number[];
  toplam_kayit_talebi?: number;
  katilimci_sayisi_limit: number;
  kayit_baslangic_tarihi: Date;
  kayit_bitis_tarihi: Date;
  ucretsiz_mi: boolean;
  ucret_miktari: number;
  durum: 'Aktif' | 'Pasif' | 'Tamamlandı';
  created_at: string;
  updated_at: string;
}

interface Firma {
  id: number;
  firma_adi: string;
  yetkili_email: string;
  durum: 'Aktif' | 'Pasif';
}

const AdminSidebar = ({ sidebarOpen, setSidebarOpen, adminEmail }: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  adminEmail: string;
}) => {
  const menuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/admin-dashboard' },
    { icon: 'ri-building-line', label: 'Firma Yönetimi', href: '/admin-firmalar' },
    { icon: 'ri-project-line', label: 'Proje Yönetimi', href: '/admin-proje-yonetimi' },
    { icon: 'ri-calendar-check-line', label: 'Randevu Talepleri', href: '/admin-randevu-talepleri' },
    { icon: 'ri-graduation-cap-line', label: 'Eğitim Yönetimi', href: '/admin-egitim-yonetimi' },
    { icon: 'ri-calendar-event-line', label: 'Etkinlik Yönetimi', href: '/admin-etkinlik-yonetimi', active: true },
    { icon: 'ri-bar-chart-line', label: 'Dönem Yönetimi', href: '/admin-donem-yonetimi' },
    { icon: 'ri-discuss-line', label: 'Forum Yönetimi', href: '/admin-forum-yonetimi' },
    { icon: 'ri-feedback-line', label: 'Platform Geri Bildirimleri', href: '/admin-geri-bildirimler' },
    { icon: 'ri-file-text-line', label: 'Destek Dokümanları', href: '/admin-destek-dokumanlari' },
    { icon: 'ri-team-line', label: 'Kullanıcılar (Personel)', href: '/admin-kullanici-yonetimi' },
    { icon: 'ri-check-double-line', label: 'Görev Onayları', href: '/admin-gorev-onaylari' }
  ];

  return (
    <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-white shadow-lg h-screen sticky top-0`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin-dashboard" className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <i className="ri-shield-star-line text-white text-xl"></i>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold text-gray-800 font-['Pacifico']">logo</h1>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className={`${sidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} text-gray-600`}></i>
          </button>
        </div>

        {sidebarOpen && <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>}
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                item.active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
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

export default function AdminEtkinlikYonetimiPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [etkinlikler, setEtkinlikler] = useState<Etkinlik[]>([]);
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEtkinlikForm, setShowEtkinlikForm] = useState(false);
  const [editingEtkinlik, setEditingEtkinlik] = useState<Etkinlik | null>(null);
  const [message, setMessage] = useState('');
  const [activeSection, setActiveSection] = useState<'management' | 'calendar'>('management');
  const [activeView, setActiveView] = useState<'list' | 'weekly' | 'monthly'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedEtkinlikForApproval, setSelectedEtkinlikForApproval] = useState<Etkinlik | null>(null);
  const [participantRegistrations, setParticipantRegistrations] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  const [formData, setFormData] = useState({
    etkinlikAdi: '',
    aciklama: '',
    tarihSaat: '',
    yer: '',
    organizator: 'NSL Admin',
    katilimciSayisiLimit: 50,
    ucretsizMi: true,
    ucretMiktari: 0,
    durum: 'Aktif',
    katilimciFirmalar: [] as number[],
  });

  const router = useRouter();

  useEffect(() => {
    checkAdminAuth();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const checkAdminAuth = async () => {
    try {
      // Önce localStorage kontrolü yap
      const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
      const adminToken = localStorage.getItem('admin_token');
      
      console.log('🔍 Admin kontrolü (Etkinlik Yönetimi):', { isAdminLoggedIn, adminToken });
      
      if (isAdminLoggedIn === 'true' && adminToken) {
        console.log('✅ Admin girişi doğrulandı (Etkinlik Yönetimi), veriler yükleniyor...');
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
      console.error('[AdminEtkinlikYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/admin-login');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const etkinliklerData = await AdminEtkinlikService.getAllEtkinlikler();
      const firmalarData = await AdminFirmaService.getAllFirmalar();

      const formattedFirmalar = firmalarData.map((f: any) => ({
        id: f.id,
        firma_adi: f.firma_adi,
        yetkili_email: f.yetkili_email,
        durum: f.durum === 'Aktif' ? 'Aktif' as 'Aktif' : 'Pasif' as 'Pasif',
      }));

      setEtkinlikler(etkinliklerData);
      setFirmalar(formattedFirmalar);

      setLoading(false);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setMessage('Veriler yüklenirken bir hata oluştu.');
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.push('/admin-login');
    } catch (error) {
      console.error('[AdminEtkinlikYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.push('/admin-login');
    }
  };

  const resetForm = () => {
    setFormData({
      etkinlikAdi: '',
      aciklama: '',
      tarihSaat: '',
      yer: '',
      organizator: 'NSL Admin',
      katilimciSayisiLimit: 50,
      ucretsizMi: true,
      ucretMiktari: 0,
      durum: 'Aktif',
      katilimciFirmalar: [] as number[],
    });
    setEditingEtkinlik(null);
  };

  const handleFirmaToggle = (firmaId: number) => {
    setFormData((prev) => ({
      ...prev,
      katilimciFirmalar: prev.katilimciFirmalar.includes(firmaId)
        ? prev.katilimciFirmalar.filter((id) => id !== firmaId)
        : [...prev.katilimciFirmalar, firmaId],
    }));
  };

  const getFirmaAdi = (firmaId: number) => {
    const firma = firmalar.find((f) => f.id === firmaId);
    return firma ? firma.firma_adi : `Firma ${firmaId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Etkinlik yönetimi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} adminEmail={adminEmail} />

      <div className={`${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300 flex-1 flex flex-col`}>
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Etkinlik Yönetimi</h1>
              <p className="text-gray-600 mt-1">Firma etkinliklerini yönetin ve katılım onaylarını kontrol edin</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Sistem Saati</div>
                <div className="text-lg font-semibold text-gray-900" suppressHydrationWarning={true}>
                  {currentTime.toLocaleTimeString('tr-TR')}
                </div>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowEtkinlikForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap flex items-center space-x-2 cursor-pointer"
              >
                <i className="ri-add-line"></i>
                <span>Yeni Etkinlik</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-0">
          <div className="p-4">
            {message && (
              <div
                className={`mb-6 p-4 rounded-lg border ${
                  message.includes('başarıyla') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <i className={`${message.includes('başarıyla') ? 'ri-check-line' : 'ri-error-warning-line'} text-lg`}></i>
                  <p className="text-sm font-medium">{message}</p>
                </div>
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                <button
                  onClick={() => setActiveSection('management')}
                  className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center space-x-2 ${
                    activeSection === 'management' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i className="ri-settings-3-line"></i>
                  <span>Etkinlik Yönetimi</span>
                </button>
                <button
                  onClick={() => setActiveSection('calendar')}
                  className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center space-x-2 ${
                    activeSection === 'calendar' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i className="ri-calendar-view-line"></i>
                  <span>Takvim Görünümü</span>
                </button>
              </div>
            </div>

            {activeSection === 'management' && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium opacity-90">Toplam Etkinlik</h3>
                        <p className="text-3xl font-bold">{etkinlikler.length}</p>
                      </div>
                      <i className="ri-calendar-event-line text-3xl opacity-80"></i>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium opacity-90">Aktif Etkinlik</h3>
                        <p className="text-3xl font-bold">{etkinlikler.filter((e) => e.durum === 'Aktif').length}</p>
                      </div>
                      <i className="ri-checkbox-circle-line text-3xl opacity-80"></i>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium opacity-90">Bu Ay</h3>
                        <p className="text-3xl font-bold">
                          {etkinlikler.filter((e) => {
                            const eventDate = new Date(e.tarih_saat);
                            const now = new Date();
                            return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
                          }).length}
                        </p>
                      </div>
                      <i className="ri-calendar-line text-3xl opacity-80"></i>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium opacity-90">Katılımcı Sayısı</h3>
                        <p className="text-3xl font-bold">
                          {etkinlikler.reduce((total, e) => total + (e.katilimci_firmalar?.length || 0), 0)}
                        </p>
                      </div>
                      <i className="ri-team-line text-3xl opacity-80"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Etkinlik Listesi ({etkinlikler.length} etkinlik)</h2>
                  </div>
                  <div className="p-6">
                    {etkinlikler.length === 0 ? (
                      <div className="text-center py-12">
                        <i className="ri-calendar-event-line text-6xl text-gray-300 mb-4"></i>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz etkinlik bulunmuyor</h3>
                        <p className="text-gray-500 mb-6">İlk etkinliğinizi oluşturmak için "Yeni Etkinlik" butonuna tıklayın.</p>
                        <button
                          onClick={() => {
                            resetForm();
                            setShowEtkinlikForm(true);
                          }}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <i className="ri-add-line mr-2"></i>
                          İlk Etkinliği Oluştur
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {etkinlikler.map((etkinlik) => (
                          <div key={etkinlik.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <i className="ri-calendar-event-line text-2xl text-blue-600"></i>
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{etkinlik.etkinlik_adi}</h3>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      etkinlik.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 
                                      etkinlik.durum === 'Pasif' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {etkinlik.durum}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <i className="ri-time-line"></i>
                                    <span>{new Date(etkinlik.tarih_saat).toLocaleDateString('tr-TR')} {new Date(etkinlik.tarih_saat).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <i className="ri-map-pin-line"></i>
                                    <span>{etkinlik.yer}</span>
                                  </div>
                                </div>

                                <p className="text-gray-700 mb-4 line-clamp-2">{etkinlik.aciklama}</p>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span className="flex items-center space-x-1">
                                      <i className="ri-team-line"></i>
                                      <span>{etkinlik.katilimci_firmalar?.length || 0} katılımcı firma</span>
                                    </span>
                                    {!etkinlik.ucretsiz_mi && (
                                      <span className="flex items-center space-x-1">
                                        <i className="ri-money-dollar-circle-line"></i>
                                        <span>{etkinlik.ucret_miktari} TL</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => {
                                        setEditingEtkinlik(etkinlik);
                                        setFormData({
                                          etkinlikAdi: etkinlik.etkinlik_adi,
                                          aciklama: etkinlik.aciklama,
                                          tarihSaat: new Date(etkinlik.tarih_saat).toISOString().slice(0, 16),
                                          yer: etkinlik.yer,
                                          organizator: etkinlik.organizator,
                                          katilimciSayisiLimit: etkinlik.katilimci_sayisi_limit,
                                          ucretsizMi: etkinlik.ucretsiz_mi,
                                          ucretMiktari: etkinlik.ucret_miktari,
                                          durum: etkinlik.durum,
                                          katilimciFirmalar: etkinlik.katilimci_firmalar || [],
                                        });
                                        setShowEtkinlikForm(true);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                      title="Düzenle"
                                    >
                                      <i className="ri-edit-line text-lg"></i>
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) {
                                          // Silme işlemi
                                        }
                                      }}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Sil"
                                    >
                                      <i className="ri-delete-bin-line text-lg"></i>
                                    </button>
                                  </div>
                                </div>

                                {etkinlik.katilimci_firmalar && etkinlik.katilimci_firmalar.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Katılımcı Firmalar:</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {etkinlik.katilimci_firmalar.map((firmaId) => (
                                        <span
                                          key={firmaId}
                                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors cursor-pointer"
                                        >
                                          {getFirmaAdi(firmaId)}
                                        </span>
                                      ))}
                                    </div>
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
              </div>
            )}

            {activeSection === 'calendar' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Takvim Görünümü</h2>
                <p className="text-gray-600">Takvim görünümü yakında eklenecek...</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {showEtkinlikForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingEtkinlik ? 'Etkinlik Düzenle' : 'Yeni Etkinlik Ekle'}
              </h2>
            </div>

            <form className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Etkinlik Adı *
                  </label>
                  <input
                    type="text"
                    value={formData.etkinlikAdi}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, etkinlikAdi: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Etkinlik adını giriniz"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tarih ve Saat *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.tarihSaat}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tarihSaat: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Yer *
                </label>
                <input
                  type="text"
                  value={formData.yer}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, yer: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Etkinlik yerini giriniz"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Organizatör
                </label>
                <input
                  type="text"
                  value={formData.organizator}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, organizator: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Organizatör adı"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Açıklama *
                </label>
                <textarea
                  value={formData.aciklama}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, aciklama: e.target.value }))
                  }
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  placeholder="Etkinlik açıklamasını giriniz"
                  required
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {formData.aciklama.length}/500 karakter
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Katılımcı Firmalar ({formData.katilimciFirmalar.length} seçili)
                </label>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
                  {firmalar && firmalar.length > 0 ? (
                    firmalar.map((firma, index) => (
                      <label
                        key={`firma-${firma.id}-${index}`}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-white p-3 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={formData.katilimciFirmalar.includes(firma.id)}
                          onChange={() => handleFirmaToggle(firma.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700 truncate block">{firma.firma_adi}</span>
                          <span className="text-xs text-gray-500 truncate block">{firma.yetkili_email}</span>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 col-span-3 py-8 text-center">
                      Henüz firma bulunmamaktadır.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEtkinlikForm(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 whitespace-nowrap cursor-pointer flex items-center space-x-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line"></i>
                      <span>{editingEtkinlik ? 'Güncelle' : 'Etkinlik Ekle'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
