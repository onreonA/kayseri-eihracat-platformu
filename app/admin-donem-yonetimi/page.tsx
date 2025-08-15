
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProjeDönemi {
  ID: number;
  DönemAdı: string;
  BaslangicTarihi: Date;
  BitisTarihi: Date;
  Hedefler: string;
  Durum: 'Aktif' | 'Pasif' | 'Tamamlandı';
  OluşturmaTarihi: Date;
}

interface FirmaRaporu {
  ID: number;
  FirmaID: number;
  DonemID: number;
  FirmaRaporu: string;
  RaporTarihi: Date;
  OnayDurumu: 'Beklemede' | 'Onaylandı' | 'Reddedildi';
  NSLNotlari: string;
  GuncellenmeTarihi: Date;
  DönemAdı: string;
  FirmaAdı: string;
}

interface Firma {
  ID: number;
  FirmaAdı: string;
  YetkiliEmail: string;
  Durum: 'Aktif' | 'Pasif';
}

class ProjeDönemleriService {
  static async getAllDönemler(): Promise<ProjeDönemi[]> {
    try {
      const savedData = localStorage.getItem('admin_donemler');
      if (!savedData) {
        const sampleData: ProjeDönemi[] = [
          {
            ID: 1,
            DönemAdı: '2024 1. Dönem',
            BaslangicTarihi: new Date('2024-01-01'),
            BitisTarihi: new Date('2024-06-30'),
            Hedefler: '2024 yılı ilk dönem hedefleri ve planları. E-ihracat süreçlerinin başlatılması, firma profil tamamlama oranının artırılması ve dijital pazarlama eğitimlerinin verilmesi hedeflenmektedir.',
            Durum: 'Tamamlandı',
            OluşturmaTarihi: new Date('2023-12-15')
          },
          {
            ID: 2,
            DönemAdı: '2024 2. Dönem',
            BaslangicTarihi: new Date('2024-07-01'),
            BitisTarihi: new Date('2024-12-31'),
            Hedefler: '2024 yılı ikinci yarı gelişim planları. B2B ve B2C platformlarda firma entegrasyonlarının tamamlanması, uluslararası pazarlara açılma süreçlerinin desteklenmesi ve teknik eğitimlerin yaygınlaştırılması amaçlanmaktadır.',
            Durum: 'Aktif',
            OluşturmaTarihi: new Date('2024-06-15')
          }
        ];
        localStorage.setItem('admin_donemler', JSON.stringify(sampleData));
        return sampleData;
      }
      return JSON.parse(savedData);
    } catch (error) {
      console.error('Proje dönemleri yükleme hatası:', error);
      return [];
    }
  }

  static async createDonem(donemData: Omit<ProjeDönemi, 'ID' | 'OluşturmaTarihi'>): Promise<ProjeDönemi> {
    try {
      const existingData = await this.getAllDönemler();
      const newId = Math.max(...existingData.map(d => d.ID), 0) + 1;

      const newDonem: ProjeDönemi = {
        ...donemData,
        ID: newId,
        OluşturmaTarihi: new Date()
      };

      const updatedData = [...existingData, newDonem];
      localStorage.setItem('admin_donemler', JSON.stringify(updatedData));

      return newDonem;
    } catch (error) {
      console.error('Proje dönemi oluşturma hatası:', error);
      throw error;
    }
  }

  static async updateDonem(donemId: number, updateData: Partial<ProjeDönemi>): Promise<void> {
    try {
      const existingData = await this.getAllDönemler();
      const donemIndex = existingData.findIndex(d => d.ID === donemId);

      if (donemIndex === -1) {
        throw new Error('Proje dönemi bulunamadı');
      }

      existingData[donemIndex] = { ...existingData[donemIndex], ...updateData };
      localStorage.setItem('admin_donemler', JSON.stringify(existingData));
    } catch (error) {
      console.error('Proje dönemi güncelleme hatası:', error);
      throw error;
    }
  }

  static async deleteDonem(donemId: number): Promise<void> {
    try {
      const existingData = await this.getAllDönemler();
      const updatedData = existingData.filter(d => d.ID !== donemId);
      localStorage.setItem('admin_donemler', JSON.stringify(updatedData));
    } catch (error) {
      console.error('Proje dönemi silme hatası:', error);
      throw error;
    }
  }
}

class FirmaDönemİlerlemesiService {
  static async getFirmaRaporlari(firmaId: number): Promise<FirmaRaporu[]> {
    try {
      const savedData = localStorage.getItem(`firma_${firmaId}_raporlar`);
      if (!savedData) {
        if (firmaId === 6) {
          const sampleReports: FirmaRaporu[] = [
            {
              ID: 1,
              FirmaID: 6,
              DonemID: 1,
              FirmaRaporu: 'İlk dönemde e-ihracat süreçlerinin temel altyapısını tamamladık. B2B ve B2C platformlarını kurduk. Dijital pazarlama eğitimlerine katılım sağladık ve firma profil bilgilerimizi güncelledik. Hedeflenen satış rakamlarına ulaştık.',
              RaporTarihi: new Date('2024-06-25'),
              OnayDurumu: 'Onaylandı',
              NSLNotlari: 'İlerleme durumu çok iyi, plana uygun şekilde devam ediyor. Tebrikler.',
              GuncellenmeTarihi: new Date('2024-06-26'),
              DönemAdı: '2024 1. Dönem',
              FirmaAdı: 'Ömer'
            },
            {
              ID: 2,
              FirmaID: 6,
              DonemID: 2,
              FirmaRaporu: 'İkinci yarıda dijital pazarlama stratejilerine ve uluslararası pazar genişlemesine odaklandık. Yeni müşteri kazanım oranlarında artış yaşadık. Teknik eğitimleri tamamladık ve sistem entegrasyonlarını gerçekleştirdik.',
              RaporTarihi: new Date('2024-12-15'),
              OnayDurumu: 'Beklemede',
              NSLNotlari: '',
              GuncellenmeTarihi: new Date('2024-12-15'),
              DönemAdı: '2024 2. Dönem',
              FirmaAdı: 'Ömer'
            }
          ];
          localStorage.setItem(`firma_${firmaId}_raporlar`, JSON.stringify(sampleReports));
          return sampleReports;
        }
        return [];
      }
      return JSON.parse(savedData);
    } catch (error) {
      console.error('Firma raporları yükleme hatası:', error);
      return [];
    }
  }

  static async updateRapor(firmaId: number, raporId: number, updateData: Partial<FirmaRaporu>): Promise<void> {
    try {
      const existingData = await this.getFirmaRaporlari(firmaId);
      const raporIndex = existingData.findIndex(r => r.ID === raporId);

      if (raporIndex === -1) {
        throw new Error('Rapor bulunamadı');
      }

      existingData[raporIndex] = { ...existingData[raporIndex], ...updateData };
      localStorage.setItem(`firma_${firmaId}_raporlar`, JSON.stringify(existingData));
    } catch (error) {
      console.error('Firma raporu güncelleme hatası:', error);
      throw error;
    }
  }
}

const sampleFirmalar: Firma[] = [
  {
    ID: 1,
    FirmaAdı: 'Örnek Firma A.Ş.',
    YetkiliEmail: 'demo@example.com',
    Durum: 'Aktif'
  },
  {
    ID: 2,
    FirmaAdı: 'Kayseri İhracat Merkezi',
    YetkiliEmail: 'admin@kayseriihracat.com',
    Durum: 'Aktif'
  },
  {
    ID: 3,
    FirmaAdı: 'Test Firma A.Ş.',
    YetkiliEmail: 'test@firma.com',
    Durum: 'Aktif'
  },
  {
    ID: 6,
    FirmaAdı: 'Ömer',
    YetkiliEmail: 'bilgi@omerfarukunsal.com',
    Durum: 'Aktif'
  },
  {
    ID: 7,
    FirmaAdı: 'Milenyum Metal',
    YetkiliEmail: 'export@palm.com.tr',
    Durum: 'Aktif'
  }
];

const AdminSidebar = ({ sidebarOpen, setSidebarOpen, adminEmail }: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  adminEmail: string;
}) => {
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
      active: true,
    },
    {
      icon: 'ri-discuss-line',
      label: 'Forum Yönetimi',
      href: '/admin-forum-yonetimi',
    },
    {
      icon: 'ri-feedback-line',
      label: 'Platform Geri Bildirimleri',
      href: '/admin-geri-bildirimler',
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
  ];

  return (
    <div
      className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col h-screen fixed left-0 top-0 z-50`}
    >
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <Link href="/admin-dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <i className="ri-shield-star-line text-white text-xl"></i>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Pacifico' }}>
                  logo
                </h1>
                <p className="text-xs text-slate-300">Admin Panel</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
          >
            <i className={`${sidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} text-white`}></i>
          </button>
        </div>
      </div>

      <nav className="flex-1 py-6">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-6 py-3 text-sm font-medium transition-all duration-200 group ${
              item.active
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-r-4 border-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                item.active ? 'bg-white/20' : 'bg-slate-700 group-hover:bg-slate-600'
              }`}
            >
              <i className={`${item.icon} text-lg`}></i>
            </div>
            {sidebarOpen && <span className="ml-3 transition-opacity duration-200">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <i className="ri-user-line text-white"></i>
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin</p>
              <p className="text-xs text-slate-300 truncate">{adminEmail}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AdminDonemYonetimiPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'donemler' | 'raporlar'>('donemler');
  const [donemler, setDonemler] = useState<ProjeDönemi[]>([]);
  const [raporlar, setRaporlar] = useState<FirmaRaporu[]>([]);
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [showDonemForm, setShowDonemForm] = useState(false);
  const [editingDonem, setEditingDonem] = useState<ProjeDönemi | null>(null);
  const [donemFormData, setDonemFormData] = useState({
    donemAdi: '',
    baslangicTarihi: '',
    bitisTarihi: '',
    hedefler: '',
    durum: 'Aktif' as 'Aktif' | 'Pasif' | 'Tamamlandı',
  });

  const [filters, setFilters] = useState({
    firmaId: '',
    donemId: '',
    onayDurumu: '',
  });

  const [selectedRapor, setSelectedRapor] = useState<FirmaRaporu | null>(null);
  const [showRaporModal, setShowRaporModal] = useState(false);
  const [raporFormData, setRaporFormData] = useState({
    onayDurumu: '',
    nslNotlari: '',
  });

  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem('isAdminLoggedIn');
    const email = localStorage.getItem('adminEmail');

    if (!loggedIn || loggedIn !== 'true') {
      router.push('/admin-login');
      return;
    }

    setIsAdminLoggedIn(true);
    setAdminEmail(email || '');

    loadData();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const loadData = async () => {
    try {
      const [donemleriData, firmalariData] = await Promise.all([
        ProjeDönemleriService.getAllDönemler(),
        Promise.resolve(sampleFirmalar),
      ]);

      setDonemler(donemleriData);
      setFirmalar(firmalariData);

      const allRaporlar = await loadAllRaporlar();
      setRaporlar(allRaporlar);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllRaporlar = async (): Promise<FirmaRaporu[]> => {
    const allRaporlar: FirmaRaporu[] = [];

    for (const firma of sampleFirmalar) {
      const firmaRaporlari = await FirmaDönemİlerlemesiService.getFirmaRaporlari(firma.ID);
      firmaRaporlari.forEach((rapor) => {
        allRaporlar.push({
          ...rapor,
          FirmaAdı: firma.FirmaAdı,
        });
      });
    }

    return allRaporlar.sort((a, b) => new Date(b.RaporTarihi).getTime() - new Date(a.RaporTarihi).getTime());
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/admin-login');
  };

  const resetDonemForm = () => {
    setDonemFormData({
      donemAdi: '',
      baslangicTarihi: '',
      bitisTarihi: '',
      hedefler: '',
      durum: 'Aktif',
    });
    setEditingDonem(null);
  };

  const handleDonemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      if (editingDonem) {
        const updatedDonem: ProjeDönemi = {
          ...editingDonem,
          DönemAdı: donemFormData.donemAdi,
          BaslangicTarihi: new Date(donemFormData.baslangicTarihi),
          BitisTarihi: new Date(donemFormData.bitisTarihi),
          Hedefler: donemFormData.hedefler,
          Durum: donemFormData.durum,
        };

        await ProjeDönemleriService.updateDonem(editingDonem.ID, updatedDonem);
        setDonemler((prev) =>
          prev.map((d) => (d.ID === editingDonem.ID ? updatedDonem : d))
        );
        setMessage('Dönem başarıyla güncellendi.');
      } else {
        const newDonem = await ProjeDönemleriService.createDonem({
          DönemAdı: donemFormData.donemAdi,
          BaslangicTarihi: new Date(donemFormData.baslangicTarihi),
          BitisTarihi: new Date(donemFormData.bitisTarihi),
          Hedefler: donemFormData.hedefler,
          Durum: donemFormData.durum,
        });

        setDonemler((prev) => [newDonem, ...prev]);
        setMessage('Yeni dönem başarıyla eklendi.');
      }

      setShowDonemForm(false);
      resetDonemForm();
    } catch (error) {
      setMessage('İşlem sırasında bir hata oluştu.');
    }
  };

  const handleDonemEdit = (donem: ProjeDönemi) => {
    setEditingDonem(donem);
    setDonemFormData({
      donemAdi: donem.DönemAdı,
      baslangicTarihi: new Date(donem.BaslangicTarihi).toISOString().split('T')[0],
      bitisTarihi: new Date(donem.BitisTarihi).toISOString().split('T')[0],
      hedefler: donem.Hedefler,
      durum: donem.Durum,
    });
    setShowDonemForm(true);
  };

  const handleDonemDelete = async (donemId: number) => {
    if (confirm('Bu dönemi silmek istediğinizden emin misiniz?')) {
      try {
        await ProjeDönemleriService.deleteDonem(donemId);
        setDonemler((prev) => prev.filter((d) => d.ID !== donemId));
        setMessage('Dönem başarıyla silindi.');
      } catch (error) {
        setMessage('Dönem silinirken bir hata oluştu.');
      }
    }
  };

  const handleRaporClick = (rapor: FirmaRaporu) => {
    setSelectedRapor(rapor);
    setRaporFormData({
      onayDurumu: rapor.OnayDurumu,
      nslNotlari: rapor.NSLNotlari,
    });
    setShowRaporModal(true);
  };

  const handleRaporUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRapor) return;

    try {
      const updatedRapor: FirmaRaporu = {
        ...selectedRapor,
        OnayDurumu: raporFormData.onayDurumu as 'Beklemede' | 'Onaylandı' | 'Reddedildi',
        NSLNotlari: raporFormData.nslNotlari,
        GuncellenmeTarihi: new Date(),
      };

      await FirmaDönemİlerlemesiService.updateRapor(selectedRapor.FirmaID, selectedRapor.ID, updatedRapor);

      setRaporlar((prev) =>
        prev.map((r) => (r.ID === selectedRapor.ID ? updatedRapor : r))
      );

      setMessage('Rapor başarıyla güncellendi.');
      setShowRaporModal(false);
      setSelectedRapor(null);
    } catch (error) {
      setMessage('Rapor güncellenirken bir hata oluştu.');
    }
  };

  const getFilteredRaporlar = () => {
    return raporlar.filter((rapor) => {
      if (filters.firmaId && rapor.FirmaID.toString() !== filters.firmaId) return false;
      if (filters.donemId && rapor.DonemID.toString() !== filters.donemId) return false;
      if (filters.onayDurumu && rapor.OnayDurumu !== filters.onayDurumu) return false;
      return true;
    });
  };

  const getDurumColor = (durum: string) => {
    switch (durum) {
      case 'Aktif':
        return 'bg-green-100 text-green-800';
      case 'Tamamlandı':
        return 'bg-blue-100 text-blue-800';
      case 'Pasif':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOnayDurumuColor = (durum: string) => {
    switch (durum) {
      case 'Onaylandı':
        return 'bg-green-100 text-green-800';
      case 'Reddedildi':
        return 'bg-red-100 text-red-800';
      case 'Beklemede':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTarih = (tarih: Date) => {
    return new Date(tarih).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTarihSaat = (tarih: Date) => {
    return new Date(tarih).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} adminEmail={adminEmail} />

      <div className={`${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 flex-1 flex flex-col`}>
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dönem Yönetimi</h1>
              <p className="text-gray-600 mt-1">Proje dönemlerini ve firma raporlarını yönetin</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Sistem Saati</div>
                <div className="text-lg font-semibold text-gray-900" suppressHydrationWarning={true}>
                  {currentTime.toLocaleTimeString('tr-TR')}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('donemler')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                    activeTab === 'donemler'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dönem Yönetimi
                </button>
                <button
                  onClick={() => setActiveTab('raporlar')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                    activeTab === 'raporlar'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Firma Raporları
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'donemler' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">Proje Dönemleri</h2>
                    <button
                      onClick={() => {
                        resetDonemForm();
                        setShowDonemForm(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
                    >
                      <i className="ri-add-line"></i>
                      <span>Yeni Dönem</span>
                    </button>
                  </div>

                  {showDonemForm && (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {editingDonem ? 'Dönem Düzenle' : 'Yeni Dönem Ekle'}
                        </h3>
                        <button
                          onClick={() => {
                            setShowDonemForm(false);
                            resetDonemForm();
                          }}
                          className="text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          <i className="ri-close-line text-xl"></i>
                        </button>
                      </div>

                      <form onSubmit={handleDonemSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Dönem Adı *
                            </label>
                            <input
                              type="text"
                              value={donemFormData.donemAdi}
                              onChange={(e) =>
                                setDonemFormData((prev) => ({ ...prev, donemAdi: e.target.value }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Örn: 2024 1. Dönem"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Durum
                            </label>
                            <select
                              value={donemFormData.durum}
                              onChange={(e) =>
                                setDonemFormData((prev) => ({
                                  ...prev,
                                  durum: e.target.value as 'Aktif' | 'Pasif' | 'Tamamlandı',
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                            >
                              <option value="Aktif">Aktif</option>
                              <option value="Pasif">Pasif</option>
                              <option value="Tamamlandı">Tamamlandı</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Başlangıç Tarihi *
                            </label>
                            <input
                              type="date"
                              value={donemFormData.baslangicTarihi}
                              onChange={(e) =>
                                setDonemFormData((prev) => ({
                                  ...prev,
                                  baslangicTarihi: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bitiş Tarihi *
                            </label>
                            <input
                              type="date"
                              value={donemFormData.bitisTarihi}
                              onChange={(e) =>
                                setDonemFormData((prev) => ({
                                  ...prev,
                                  bitisTarihi: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Hedefler *
                          </label>
                          <textarea
                            value={donemFormData.hedefler}
                            onChange={(e) =>
                              setDonemFormData((prev) => ({
                                ...prev,
                                hedefler: e.target.value,
                              }))
                            }
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Bu dönemin hedeflerini yazınız..."
                            required
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowDonemForm(false);
                              resetDonemForm();
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            İptal
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {editingDonem ? 'Güncelle' : 'Dönem Ekle'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="space-y-4">
                    {donemler.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="ri-calendar-line text-gray-400 text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz dönem yok</h3>
                        <p className="text-gray-600">İlk proje dönemini ekleyin.</p>
                      </div>
                    ) : (
                      donemler.map((donem) => (
                        <div key={donem.ID} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{donem.DönemAdı}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDurumColor(donem.Durum)}`}>
                                  {donem.Durum}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                                <span className="flex items-center">
                                  <i className="ri-calendar-line mr-1"></i>
                                  {formatTarih(donem.BaslangicTarihi)} - {formatTarih(donem.BitisTarihi)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{donem.Hedefler}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleDonemEdit(donem)}
                                className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors"
                              >
                                <i className="ri-edit-line text-blue-600"></i>
                              </button>
                              <button
                                onClick={() => handleDonemDelete(donem.ID)}
                                className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-200 transition-colors"
                              >
                                <i className="ri-delete-bin-line text-red-600"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'raporlar' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtreler</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Firma
                        </label>
                        <select
                          value={filters.firmaId}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, firmaId: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                        >
                          <option value="">Tüm Firmalar</option>
                          {firmalar.map((firma) => (
                            <option key={firma.ID} value={firma.ID.toString()}>
                              {firma.FirmaAdı}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dönem
                        </label>
                        <select
                          value={filters.donemId}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, donemId: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                        >
                          <option value="">Tüm Dönemler</option>
                          {donemler.map((donem) => (
                            <option key={donem.ID} value={donem.ID.toString()}>
                              {donem.DönemAdı}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Onay Durumu
                        </label>
                        <select
                          value={filters.onayDurumu}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, onayDurumu: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                        >
                          <option value="">Tüm Durumlar</option>
                          <option value="Beklemede">Beklemede</option>
                          <option value="Onaylandı">Onaylandı</option>
                          <option value="Reddedildi">Reddedildi</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Firma Raporları ({getFilteredRaporlar().length})
                      </h2>
                    </div>

                    {getFilteredRaporlar().length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="ri-file-text-line text-gray-400 text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rapor bulunamadı</h3>
                        <p className="text-gray-600">Seçilen kriterlere uygun rapor bulunmuyor.</p>
                      </div>
                    ) : (
                      getFilteredRaporlar().map((rapor) => (
                        <div key={rapor.ID} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{rapor.FirmaAdı}</h3>
                                <span className="text-sm text-gray-600">•</span>
                                <span className="text-sm text-gray-600">{rapor.DönemAdı}</span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getOnayDurumuColor(
                                    rapor.OnayDurumu
                                  )}`}
                                >
                                  {rapor.OnayDurumu}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                                <span className="flex items-center">
                                  <i className="ri-calendar-line mr-1"></i>
                                  {formatTarihSaat(rapor.RaporTarihi)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {rapor.FirmaRaporu.substring(0, 150)}...
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleRaporClick(rapor)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap cursor-pointer"
                              >
                                Detay
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {showRaporModal && selectedRapor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedRapor.FirmaAdı}</h3>
                    <p className="text-gray-600">{selectedRapor.DönemAdı}</p>
                  </div>
                  <button
                    onClick={() => setShowRaporModal(false)}
                    className="text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    <i className="ri-close-line text-2xl"></i>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Firma Raporu</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedRapor.FirmaRaporu}
                    </p>
                  </div>

                  <form onSubmit={handleRaporUpdate} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Onay Durumu
                        </label>
                        <select
                          value={raporFormData.onayDurumu}
                          onChange={(e) =>
                            setRaporFormData((prev) => ({ ...prev, onayDurumu: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                        >
                          <option value="Beklemede">Beklemede</option>
                          <option value="Onaylandı">Onaylandı</option>
                          <option value="Reddedildi">Reddedildi</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rapor Tarihi
                        </label>
                        <input
                          type="text"
                          value={formatTarihSaat(selectedRapor.RaporTarihi)}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NSL Notları
                      </label>
                      <textarea
                        value={raporFormData.nslNotlari}
                        onChange={(e) =>
                          setRaporFormData((prev) => ({ ...prev, nslNotlari: e.target.value }))
                        }
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="NSL notlarınızı buraya yazınız..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowRaporModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Güncelle
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
