
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { AdminFirmaService, DataCleanupService } from '../../lib/database';
import { checkAdminAuth, adminLogout, getAdminInfo } from '../../lib/admin-auth';

interface Firma {
  id: number;
  firmaAdi: string;
  yetkiliEmail: string;
  yetkiliTelefon: string;
  durum: 'Aktif' | 'Pasif';
  firmaProfilDurumu: 'Eksik' | 'Tamamlandı' | 'Onay Bekliyor';
  kayitTarihi: string;
  adres?: string;
  sifre?: string;
  sektor?: string;
  yetkiliAdi?: string;
}

// Admin Sidebar Component
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
      active: true,
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
    {
      icon: 'ri-check-double-line',
      label: 'Görev Onayları',
      href: '/admin-gorev-onaylari',
    },
  ];

  return (
    <div
      className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col h-screen fixed left-0 top-0 z-50`}
    >
      {/* Logo and Toggle */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h2 className="text-lg font-bold font-[ 'Pacifico' ]">logo</h2>
              <p className="text-xs text-slate-300 mt-1">Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className={`ri-${sidebarOpen ? 'menu-fold' : 'menu-unfold'}-line text-lg`}></i>
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group ${
              item.active
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className={`${item.icon} text-lg`}></i>
            </div>
            {sidebarOpen && (
              <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
            )}
            {!sidebarOpen && (
              <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <i className="ri-admin-line text-sm"></i>
          </div>
          {sidebarOpen && (
            <div>
              <div className="text-sm font-medium text-white">Admin</div>
              <div className="text-xs text-slate-300 truncate">Yönetici</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// SUPABASE-ONLY Data Manager
class SupabaseOnlyDataManager {
  // 获取所有公司 - 仅使用 SUPABASE
  static async getAllFirmalar(): Promise<Firma[]> {
    try {
      console.log('🔍 Supabase\'dan firma verileri yükleniyor...');

      const supabaseFirmalar = await AdminFirmaService.getAllFirmalar();

      console.log(`📊 Supabase'dan ${supabaseFirmalar?.length || 0} firma yüklendi`);
      
      if (supabaseFirmalar && supabaseFirmalar.length > 0) {
        console.log('📄 İlk firma örneği:', supabaseFirmalar[0]);
      }

      // Convert Supabase data to frontend format
      const convertedFirmalar: Firma[] = (supabaseFirmalar || []).map((firma: any) => ({
        id: firma.id,
        firmaAdi: firma.firma_adi || '',
        yetkiliEmail: firma.yetkili_email || '',
        yetkiliTelefon: firma.telefon || '',
        durum: firma.durum || 'Aktif',
        firmaProfilDurumu: firma.firma_profil_durumu || 'Eksik',
        kayitTarihi: firma.kayit_tarihi ? new Date(firma.kayit_tarihi).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        adres: firma.adres || '',
        sifre: firma.sifre || '',
        sektor: firma.sektor || '',
        yetkiliAdi: firma.yetkili_adi || '',
      }));

      console.log(`✅ Converted firmalar: ${convertedFirmalar?.length || 0} kayıt`);
      if (convertedFirmalar && convertedFirmalar.length > 0) {
        console.log('📄 İlk converted firma:', convertedFirmalar[0]);
      }
      return convertedFirmalar;
    } catch (error) {
      console.error(' Supabase firma veri yükleme hatası:', error);
      return [];
    }
  }

  // 添加公司 - 仅使用 SUPABASE
  static async addFirma(newFirmaData: Omit<Firma, 'id'>): Promise<Firma | null> {
    try {
      console.log(' Yeni firma Supabase\'a ekleniyor...');

      const addedFirma = await AdminFirmaService.addFirma({
        firmaAdi: newFirmaData.firmaAdi,
        yetkiliEmail: newFirmaData.yetkiliEmail,
        yetkiliTelefon: newFirmaData.yetkiliTelefon,
        adres: newFirmaData.adres || '',
        durum: newFirmaData.durum,
        firmaProfilDurumu: newFirmaData.firmaProfilDurumu,
        sifre: newFirmaData.sifre || '123456',
        sektor: newFirmaData.sektor || '',
        yetkiliAdi: newFirmaData.yetkiliAdi || '',
      });

      if (addedFirma) {
        console.log(' Firma Supabase\'a başarıyla eklendi:', addedFirma);

        // Convert to return format
        return {
          id: addedFirma.id,
          firmaAdi: addedFirma.firma_adi,
          yetkiliEmail: addedFirma.yetkili_email,
          yetkiliTelefon: addedFirma.telefon,
          durum: addedFirma.durum,
          firmaProfilDurumu: addedFirma.firma_profil_durumu,
          kayitTarihi: new Date(addedFirma.kayit_tarihi).toISOString().split('T')[0],
          adres: addedFirma.adres,
          sifre: addedFirma.sifre,
          sektor: addedFirma.sektor,
          yetkiliAdi: addedFirma.yetkili_adi,
        };
      }

      return null;
    } catch (error) {
      console.error(' Supabase firma ekleme hatası:', error);
      return null;
    }
  }

  // 删除公司 - 仅使用 SUPABASE
  static async deleteFirma(firmaId: number): Promise<boolean> {
    try {
      console.log(` Firma Supabase\'dan siliniyor ID: ${firmaId}`);

      // Validasyon
      if (!firmaId || isNaN(firmaId) || firmaId <= 0) {
        console.error(' Geçersiz firma ID:', firmaId);
        throw new Error('Geçersiz firma ID');
      }

      // AdminFirmaService üzerinden sil
      const success = await AdminFirmaService.deleteFirma(firmaId);

      if (success) {
        console.log(' Firma Supabase\'dan başarıyla silindi');
        return true;
      } else {
        console.error(' AdminFirmaService false döndürdü');
        throw new Error('Firma silme işlemi başarısız');
      }
    } catch (error) {
      console.error(' SupabaseOnlyDataManager firma silme hatası:', {
        firmaId,
        error: error instanceof Error ? error.message : error,
      });

      // Hatayı yeniden fırlat (üst seviyede yakalanacak)
      throw error;
    }
  }
}

export default function AdminFirmalarPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFirmaForm, setShowNewFirmaForm] = useState(false);
  const [newFirma, setNewFirma] = useState({
    firmaAdi: '',
    yetkiliEmail: '',
    sifre: '',
    yetkiliTelefon: '',
    sektor: '',
    yetkiliAdi: '',
  });
  const [message, setMessage] = useState('');
  const [systemStatus, setSystemStatus] = useState({
    supabaseConnected: false,
    tablesAccessible: false,
    dataCount: { firmalar: 0, projeler: 0, gorevler: 0 },
  });
  const router = useRouter();

  useEffect(() => {
    handleAuthCheck();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleAuthCheck = async () => {
    try {
      const authResult = await checkAdminAuth();
      
      if (!authResult.isAuthenticated) {
        console.log('❌ Admin authentication failed, redirecting to login...');
        router.replace(authResult.redirect || '/admin-login');
        return;
      }
      
      console.log('✅ Admin authenticated, initializing system...');
      initializeSupabaseOnlySystem();
    } catch (error) {
      console.error('[AdminFirmalar]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/admin-login');
    }
  };

  const initializeSupabaseOnlySystem = async () => {
    try {
      setLoading(true);
      console.log('🚀 Supabase-Only sistemi başlatılıyor...');
      
      // Direct client test
      const directClient = getSupabaseClient();
      console.log('🔍 Direct client test:', !!directClient);
      
      if (directClient) {
        try {
          const { data: testData, error: testError } = await directClient
            .from('firmalar')
            .select('id, firma_adi')
            .limit(3);
          
          console.log('🧪 Direct client test result:', { 
            success: !testError, 
            recordCount: testData?.length || 0,
            error: testError?.message || null,
            sampleData: testData?.[0] || null
          });
        } catch (e) {
          console.log('❌ Direct client test failed:', e);
        }
      }

      // 1. localStorage test verilerini temizle
      console.log(' localStorage test verileri temizleniyor...');
      DataCleanupService.clearLocalStorageTestData();

      // 2. Sistem durumunu kontrol et
      console.log(' Sistem durumu kontrol ediliyor...');
      const status = await DataCleanupService.checkSystemStatus();
      setSystemStatus(status);

      if (!status.supabaseConnected) {
        setMessage(' Supabase bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.');
        return;
      }

      // 3. Firmaları yükle
      console.log(' Firmalar Supabase\'den yükleniyor...');
      await loadFirmalarFromSupabase();

      console.log(' Supabase-Only sistemi başarıyla başlatıldı!');
      setMessage(' Sistem tamamen Supabase\'e geçti! Artık tüm veriler canlı veritabanından geliyor.');
    } catch (error) {
      console.error(' Sistem başlatma hatası:', error);
      setMessage(' Sistem başlatılırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadFirmalarFromSupabase = async () => {
    try {
      console.log(' SADECE Supabase\'dan firmalar yükleniyor...');

      const allFirmalar = await SupabaseOnlyDataManager.getAllFirmalar();
      setFirmalar(allFirmalar);

      console.log(` ${allFirmalar.length} firma Supabase\'den yüklendi`);
    } catch (error) {
      console.error(' Supabase firma yükleme hatası:', error);
      setMessage(' Supabase\'den firma verileri yüklenirken hata oluştu.');
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
      console.error('[AdminFirmalar]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.push('/admin-login');
    }
  };

  const handleNewFirmaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    // Enhanced client-side validation
    if (!newFirma.firmaAdi.trim()) {
      setMessage(' Firma adı zorunludur ve boş olamaz.');
      setLoading(false);
      return;
    }

    if (!newFirma.yetkiliEmail.trim()) {
      setMessage(' İletişim e-postası zorunludur.');
      setLoading(false);
      return;
    }

    // BASIT VE ESNEK EMAIL VALIDATION - SORUN KALICI OLARAK ÇÖZÜLDÜ!
    const email = newFirma.yetkiliEmail.trim().toLowerCase();

    // Sadece temel kontroller - @ ve . karakterlerinin varlığı yeterli
    if (!email.includes('@')) {
      setMessage(' Email adresinde @ karakteri bulunmalı (örn: firma@example.com)');
      setLoading(false);
      return;
    }

    if (!email.includes('.')) {
      setMessage(' Email adresinde . karakteri bulunmalı (örn: firma@example.com)');
      setLoading(false);
      return;
    }

    // @ karakterinin . karakterinden önce olması kontrolü
    const atIndex = email.indexOf('@');
    const lastDotIndex = email.lastIndexOf('.');

    if (atIndex >= lastDotIndex) {
      setMessage(' Geçersiz email formatı. Doğru format: kullanici@domain.com');
      setLoading(false);
      return;
    }

    // Email'in başında ve sonunda @ veya . olmaması
    if (email.startsWith('@') || email.startsWith('.') || email.endsWith('@') || email.endsWith('.')) {
      setMessage(' Email adresi @ veya . ile başlayamaz/bitemez');
      setLoading(false);
      return;
    }

    // Minimum uzunluk kontrolü (örn: a@b.c = 5 karakter)
    if (email.length < 5) {
      setMessage(' Email adresi çok kısa. En az 5 karakter olmalı');
      setLoading(false);
      return;
    }

    try {
      const newFirmaData = {
        firmaAdi: newFirma.firmaAdi.trim(),
        yetkiliEmail: email, // lowercase olarak kaydet
        yetkiliTelefon: newFirma.yetkiliTelefon.trim(),
        durum: 'Aktif' as const,
        firmaProfilDurumu: 'Onay Bekliyor' as const, // CONSTRAINT COMPLIANT
        kayitTarihi: new Date().toISOString().split('T')[0],
        sifre: newFirma.sifre.trim() || '123456',
        adres: '',
        sektor: newFirma.sektor.trim() || 'Genel',
        yetkiliAdi: newFirma.yetkiliAdi.trim() || newFirma.firmaAdi.trim(),
      };

      console.log(' Yeni firma Supabase\'a ekleniyor:', {
        firmaAdi: newFirmaData.firmaAdi,
        yetkiliEmail: newFirmaData.yetkiliEmail,
        durum: newFirmaData.durum,
        firmaProfilDurumu: newFirmaData.firmaProfilDurumu,
      });

      const addedFirma = await SupabaseOnlyDataManager.addFirma(newFirmaData);

      if (addedFirma) {
        // Success: Update UI and state
        setFirmalar((prev) => [addedFirma, ...prev]);
        setShowNewFirmaForm(false);
        setNewFirma({
          firmaAdi: '',
          yetkiliEmail: '',
          sifre: '',
          yetkiliTelefon: '',
          sektor: '',
          yetkiliAdi: '',
        });

        setMessage(' Yeni firma başarıyla Supabase veritabanına eklendi ve kalıcı olarak kaydedildi!');

        // Update system status
        const newStatus = await DataCleanupService.checkSystemStatus();
        setSystemStatus(newStatus);

        console.log(' Firma başarıyla eklendi ve sistem durumu güncellendi!');
      } else {
        setMessage(' Firma eklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error(' Firma ekleme hatası:', error);

      // Enhanced error message handling
      let errorMessage = ' Bilinmeyen bir hata oluştu.';

      if (error instanceof Error) {
        errorMessage = ` ${error.message}`;

        // Additional context for common errors
        if (error.message.includes('email adresi zaten')) {
          errorMessage += ' Farklı bir email adresi deneyiniz.';
        } else if (error.message.includes('Yetki hatası')) {
          errorMessage += ' Lütfen admin hesabıyla giriş yapın.';
        } else if (error.message.includes('format')) {
          errorMessage += ' Veri formatını kontrol edin.';
        }
      }

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFirma = async (firmaId: number) => {
    if (!confirm(' Bu firmayı kalıcı olarak Supabase veritabanından silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      console.log(` Firma Supabase\'dan siliniyor ID: ${firmaId}`);

      const firmaToDelete = firmalar.find((f) => f.id === firmaId);
      const firmaAdi = firmaToDelete?.firmaAdi || `ID ${firmaId}`;

      console.log(` Silinecek firma: ${firmaAdi}`);

      const success = await SupabaseOnlyDataManager.deleteFirma(firmaId);

      if (success) {
        setFirmalar((prev) => prev.filter((f) => f.id !== firmaId));
        setMessage(` "${firmaAdi}" firması Supabase veritabanından kalıcı olarak silindi!`);

        // Sistem durumunu güncelle
        const newStatus = await DataCleanupService.checkSystemStatus();
        setSystemStatus(newStatus);

        console.log(' Firma başarıyla silindi ve UI güncellendi');
      } else {
        setMessage(` "${firmaAdi}" firması silinirken beklenmeyen bir hata oluştu.`);
      }
    } catch (error) {
      console.error(' Firma silme işlemi hatası:', error);

      // Detaylı hata mesajı
      let errorMessage = ' Firma silinirken sistem hatası oluştu.';

      if (error instanceof Error) {
        errorMessage = ` ${error.message}`;

        // Ek bağlam bilgileri
        if (error.message.includes('ilişkili')) {
          errorMessage += '\n İpucu: Önce firmanın projelerini ve görevlerini silin.';
        } else if (error.message.includes('Yetki hatası')) {
          errorMessage += '\n İpucu: Admin hesabıyla giriş yaptığınızdan emin olun.';
        } else if (error.message.includes('bağlantı')) {
          errorMessage += '\n İpucu: İnternet bağlantınızı kontrol edin.';
        }
      }

      setMessage(errorMessage);
    } finally {
      setLoading(false);

      // Mesajı 5 saniye sonra temizle
      setTimeout(() => {
        setMessage('');
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">
            {loading ? ' Supabase veriler yükleniyor...' : ' Yükleniyor...'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Sistem tamamen Supabase\'e geçiriliyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} adminEmail="Yönetici" />

      {/* Main Content */}
      <div className={`${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 flex-1 flex flex-col`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">Firma Yönetimi</h1>
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Supabase Aktif
                  </div>
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Canlı Senkronizasyon
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    Kalıcı Depolama
                  </div>
                </div>
              </div>
              <p className="text-gray-600">Tüm veriler canlı Supabase veritabanından geliyor</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Sistem Saati</div>
                <div className="text-lg font-semibold text-gray-900" suppressHydrationWarning={true}>
                  {currentTime.toLocaleTimeString('tr-TR')}
                </div>
              </div>
              <button
                onClick={() => setShowNewFirmaForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap flex items-center space-x-2 cursor-pointer"
              >
                <i className="ri-add-line"></i>
                <span>Yeni Firma Ekle</span>
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

        {/* Panel Content */}
        <main className="flex-1 p-8">
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg border ${message.includes('') || message.includes('başarıyla') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
            >
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}

          {/* Sistem Durum Kartı */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Supabase-Only Sistemi Aktif
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-600">Bağlantı:</span>
                    <span
                      className={`ml-2 font-medium ${systemStatus.supabaseConnected ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {systemStatus.supabaseConnected ? 'Aktif' : 'Kapalı'}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-600">Tablolar:</span>
                    <span
                      className={`ml-2 font-medium ${systemStatus.tablesAccessible ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {systemStatus.tablesAccessible ? 'Erişilebilir' : 'Erişilemez'}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-600">Veri Durumu:</span>
                    <span className="ml-2 font-medium text-green-700">
                      Canlı Senkronizasyon
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-700">{systemStatus.dataCount.firmalar}</div>
                <div className="text-sm text-green-600">Toplam Firma</div>
              </div>
            </div>
          </div>

          {/* New Company Form */}
          {showNewFirmaForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Yeni Firma Ekle</h2>
                  <p className="text-sm text-green-600 mt-1">
                    Bu form direkt Supabase veritabanına kayıt yapar
                  </p>
                </div>
                <button
                  onClick={() => setShowNewFirmaForm(false)}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <form onSubmit={handleNewFirmaSubmit} className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firma Adı *
                  </label>
                  <input
                    type="text"
                    value={newFirma.firmaAdi}
                    onChange={(e) => setNewFirma((prev) => ({ ...prev, firmaAdi: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Firma adını giriniz"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İletişim E-postası *
                  </label>
                  <input
                    type="email"
                    value={newFirma.yetkiliEmail}
                    onChange={(e) => setNewFirma((prev) => ({ ...prev, yetkiliEmail: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="iletisim@firma.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={newFirma.sifre}
                    onChange={(e) => setNewFirma((prev) => ({ ...prev, sifre: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Şifre (varsayılan: 123456)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İletişim Telefonu
                  </label>
                  <input
                    type="tel"
                    value={newFirma.yetkiliTelefon}
                    onChange={(e) => setNewFirma((prev) => ({ ...prev, yetkiliTelefon: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="+90 555 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sektor
                  </label>
                  <input
                    type="text"
                    value={newFirma.sektor}
                    onChange={(e) => setNewFirma((prev) => ({ ...prev, sektor: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Sektör"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yetkili Adı
                  </label>
                  <input
                    type="text"
                    value={newFirma.yetkiliAdi}
                    onChange={(e) => setNewFirma((prev) => ({ ...prev, yetkiliAdi: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Yetkili adı"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowNewFirmaForm(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Supabase\'a Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-database-2-line"></i>
                        <span>Supabase\'a Kaydet</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Company List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Firma Listesi ({firmalar.length} firma) - Canlı Supabase Verisi
                </h2>
                <button
                  onClick={loadFirmalarFromSupabase}
                  disabled={loading}
                  className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer flex items-center space-x-2 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Yenileniyor...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-refresh-line"></i>
                      <span>Supabase\'dan Yenile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">ID</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Firma Adı</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">İletişim E-postası</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Telefon</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Durum</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Profil Durumu</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Kayıt Tarihi</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {firmalar.map((firma) => (
                    <tr key={firma.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-mono text-gray-500">#{firma.id}</div>
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Canlı Supabase verisi"></div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{firma.firmaAdi}</div>
                      </td>
                      <td className="py-4 px-6 text-gray-600">{firma.yetkiliEmail}</td>
                      <td className="py-4 px-6 text-gray-600">{firma.yetkiliTelefon}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            firma.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {firma.durum}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getDurumBadge(
                            firma.firmaProfilDurumu
                          )}`}
                        >
                          {firma.firmaProfilDurumu}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600">{firma.kayitTarihi}</td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin-firma-detay/${firma.id}`}
                            className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors"
                            title="Firma Detayları"
                          >
                            <i className="ri-eye-line text-blue-600"></i>
                          </Link>
                          <Link
                            href={`/admin-firma-duzenle/${firma.id}`}
                            className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                            title="Firmayı Düzenle"
                          >
                            <i className="ri-edit-line text-gray-600"></i>
                          </Link>
                          <button
                            onClick={() => handleDeleteFirma(firma.id)}
                            className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-200 transition-colors"
                            title="Supabase\'dan Kalıcı Sil"
                          >
                            <i className="ri-delete-bin-line text-red-600"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {firmalar.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center space-y-3">
                          <i className="ri-building-line text-4xl text-gray-300"></i>
                          <p>Supabase\'de hiç firma bulunamadı</p>
                          <button
                            onClick={() => setShowNewFirmaForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer"
                          >
                            İlk Firmayı Supabase\'a Ekleyin
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  function getDurumBadge(durum: string) {
    switch (durum) {
      case 'Tamamlandı':
        return 'bg-green-100 text-green-800';
      case 'Onay Bekliyor':
        return 'bg-yellow-100 text-yellow-800';
      case 'Eksik':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
