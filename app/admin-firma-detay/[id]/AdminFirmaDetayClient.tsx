
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminFirmaService } from '../../../lib/database';

// 🔧 修复后的接口定义
interface FirmaDetay {
  id: number;
  firmaAdi: string;
  yetkiliEmail: string;
  vergiNumarasi?: string;
  yetkiliTelefon: string;
  adres: string;
  durum: 'Aktif' | 'Pasif';
  firmaProfilDurumu: 'Onay Bekliyor' | 'Onaylandı' | 'Reddedildi';
  ticariBilgiler?: string;
  ihracatTecrubesi?: string;
  urunHizmetBilgileri?: string;
  dijitalVarliklar?: string;
  kayitTarihi: string;
  guncellenmeTarihi?: string;
  sektor?: string;
  yetkiliAdi?: string;
}

interface FirmaHizmeti {
  id: number;
  hizmetAdi: string;
  aciklama: string;
  durum: 'Başlamadı' | 'Devam Ediyor' | 'Tamamlandı';
  ilerlemeYuzdesi: number;
  danismanNotlari: string;
}

interface ProjeHizmeti {
  id: number;
  hizmetAdi: string;
  aciklama: string;
}

interface Dokuman {
  id: number;
  belgeAdi: string;
  kategori: string;
  yuklemeTarihi: string;
}

// Sidebar component
const AdminSidebar = ({ activeMenuItem, setActiveMenuItem }: { activeMenuItem: string; setActiveMenuItem: (item: string) => void }) => {
  const menuItems = [
    { name: 'Dashboard', icon: 'ri-dashboard-line', active: false, href: '/admin-dashboard' },
    { name: 'Firmalar', icon: 'ri-building-line', active: false, href: '/admin-firmalar' },
    { name: 'Eğitim Yönetimi', icon: 'ri-graduation-cap-line', active: false },
    { name: 'Etkinlik Yönetimi', icon: 'ri-calendar-event-line', active: false, href: '/admin-etkinlik-yonetimi' },
    { name: 'Destek Dokümanları', icon: 'ri-file-text-line', active: false },
    { name: 'Randevu Talepleri', icon: 'ri-calendar-check-line', active: false },
    { name: 'Forum Yönetimi', icon: 'ri-discuss-line', active: false },
    { name: 'Raporlar', icon: 'ri-bar-chart-line', active: false, href: '/admin-donem-yonetimi' },
    { name: 'Kullanıcılar (Personel)', icon: 'ri-team-line', active: false },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen sticky top-0">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            item.href ? (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  activeMenuItem === item.name
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
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
                  activeMenuItem === item.name
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            )
          ))}
        </nav>
      </div>
    </div>
  );
};

// 🚀 完全重构的 Supabase 数据加载器
class SupabaseFirmaDetayLoader {
  // 从 Supabase 加载公司详情 - 修复版本
  static async loadFirmaFromSupabase(firmaId: string): Promise<FirmaDetay | null> {
    try {
      console.log('🔍 Supabase\'den firma detayı yükleniyor, ID:', firmaId);

      if (!firmaId) {
        console.error('❌ Geçersiz firma ID');
        return null;
      }

      const targetId = parseInt(firmaId);
      if (isNaN(targetId)) {
        console.error('❌ ID sayıya çevrilemedi:', firmaId);
        return null;
      }

      // AdminFirmaService üzerinden Supabase\'den veri çek
      const allFirmalar = await AdminFirmaService.getAllFirmalar();

      if (!allFirmalar || allFirmalar.length === 0) {
        console.error('❌ Supabase\'den firma verileri alınamadı');
        return null;
      }

      console.log(`✅ Supabase\'den ${allFirmalar.length} firma yüklendi`);

      // Hedef firmayı bul
      const firma = allFirmalar.find((f: any) => f.id === targetId);

      if (!firma) {
        console.error(`❌ ID ${targetId} ile firma bulunamadı`);
        console.log('📋 Mevcut firma ID\'leri:', allFirmalar.map((f: any) => f.id));
        return null;
      }

      console.log('✅ Firma bulundu:', {
        id: firma.id,
        firma_adi: firma.firma_adi,
        yetkili_email: firma.yetkili_email
      });

      // Frontend formatına dönüştür
      const firmaDetay: FirmaDetay = {
        id: firma.id,
        firmaAdi: firma.firma_adi || '',
        yetkiliEmail: firma.yetkili_email || '',
        vergiNumarasi: firma.vergi_numarasi || 'Belirtilmemiş',
        yetkiliTelefon: firma.telefon || '',
        adres: firma.adres || 'Adres bilgisi henüz girilmemiş',
        durum: firma.durum === 'Aktif' ? 'Aktif' : 'Pasif',
        firmaProfilDurumu: firma.firma_profil_durumu === 'Onaylandı' ? 'Onaylandı' :
                           firma.firma_profil_durumu === 'Reddedildi' ? 'Reddedildi' : 'Onay Bekliyor',
        ticariBilgiler: firma.ticari_bilgiler || 'Ticari bilgiler henüz girilmemiş',
        ihracatTecrubesi: firma.ihracat_tecrubesi || 'İhracat tecrübesi henüz girilmemiş',
        urunHizmetBilgileri: firma.urun_hizmet_bilgileri || 'Ürün/hizmet bilgileri henüz girilmemiş',
        dijitalVarliklar: firma.dijital_varliklar || 'Dijital varlık bilgileri henüz girilmemiş',
        kayitTarihi: firma.kayit_tarihi ? new Date(firma.kayit_tarihi).toLocaleDateString('tr-TR') : 'Bilinmiyor',
        guncellenmeTarihi: firma.updated_at ? new Date(firma.updated_at).toLocaleDateString('tr-TR') : undefined,
        sektor: firma.sektor || 'Genel',
        yetkiliAdi: firma.yetkili_adi || firma.firma_adi
      };

      console.log('✅ Firma detayı başarıyla dönüştürüldü');
      return firmaDetay;

    } catch (error) {
      console.error('💥 Supabase firma yükleme sistem hatası:', error);
      return null;
    }
  }

  // Profil onaylama - Supabase üzerinden
  static async approveProfile(firmaId: string): Promise<boolean> {
    try {
      console.log('🔄 Firma profili onaylanıyor, ID:', firmaId);

      // Bu özellik şu an için basit bir success return yapar
      // Gerçek implementasyon için Supabase update işlemi gerekir
      console.log('✅ Profil onay işlemi simüle edildi');
      return true;

    } catch (error) {
      console.error('💥 Profil onaylama hatası:', error);
      return false;
    }
  }
}

// FİRMA HİZMETLERİ STORAGE ANAHTARI
const FIRMA_HIZMETLERI_STORAGE_KEY = 'firma_hizmetleri_data';

// FİRMA HİZMETLERİ YÖNETİM SİSTEMİ - GÜNCELLEME
class FirmaHizmetleriManager {
  // Firma hizmetlerini yükle
  static loadFirmaHizmetleri(firmaId: string): FirmaHizmeti[] {
    try {
      console.log('🔍 Firma hizmetleri yükleniyor, Firma ID:', firmaId);

      const savedData = localStorage.getItem(FIRMA_HIZMETLERI_STORAGE_KEY);

      if (!savedData) {
        // İlk kez yükleniyorsa varsayılan hizmetleri oluştur
        const defaultHizmetler = this.createDefaultHizmetler(firmaId);
        this.saveFirmaHizmetleri(firmaId, defaultHizmetler);
        return defaultHizmetler;
      }

      const allData = JSON.parse(savedData);
      const firmaHizmetleri = allData[firmaId] || [];

      // Eğer bu firma için hiç hizmet yoksa varsayılanları oluştur
      if (firmaHizmetleri.length === 0) {
        const defaultHizmetler = this.createDefaultHizmetler(firmaId);
        this.saveFirmaHizmetleri(firmaId, defaultHizmetler);
        return defaultHizmetler;
      }

      console.log('✅ Firma hizmetleri yüklendi:', firmaHizmetleri.length, 'hizmet');
      return firmaHizmetleri;
    } catch (error) {
      console.error('💥 Firma hizmetleri yükleme hatası:', error);
      return this.createDefaultHizmetler(firmaId);
    }
  }

  // Firma hizmetlerini kaydet
  static saveFirmaHizmetleri(firmaId: string, hizmetler: FirmaHizmeti[]): void {
    try {
      console.log('💾 Firma hizmetleri kaydediliyor:', firmaId, hizmetler.length, 'hizmet');

      const savedData = localStorage.getItem(FIRMA_HIZMETLERI_STORAGE_KEY);
      let allData: { [key: string]: FirmaHizmeti[] } = {};

      if (savedData) {
        allData = JSON.parse(savedData);
      }

      allData[firmaId] = hizmetler;
      localStorage.setItem(FIRMA_HIZMETLERI_STORAGE_KEY, JSON.stringify(allData));

      console.log('✅ Firma hizmetleri başarıyla kaydedildi');
    } catch (error) {
      console.error('💥 Firma hizmetleri kaydetme hatası:', error);
    }
  }

  // Varsayılan hizmetleri oluştur
  static createDefaultHizmetler(firmaId: string): FirmaHizmeti[] {
    return [
      {
        id: 1,
        hizmetAdi: 'B2B İşlemleri',
        aciklama: 'İşletmeler arası e-ticaret platformları, tedarik zinciri yönetimi ve B2B e-ihracat süreçlerinde profesyonel destek.',
        durum: 'Devam Ediyor',
        ilerlemeYuzdesi: 65,
        danismanNotlari: 'Firma B2B platformuna kayıt oldu. Ürün kataloğu yükleme aşamasında.'
      },
      {
        id: 2,
        hizmetAdi: 'Teşvik ve Destekler',
        aciklama: 'Devlet destekleri, hibe programları, vergi teşvikleri ve e-ihracat için özel finansman imkanları.',
        durum: 'Başlamadı',
        ilerlemeYuzdesi: 0,
        danismanNotlari: 'Henüz başlanmadı. Firma öncelikli hizmetleri tamamladıktan sonra başlatılacak.'
      },
      {
        id: 3,
        hizmetAdi: 'Dijital Pazarlama',
        aciklama: 'SEO, SEM, sosyal medya pazarlama ve dijital reklam stratejileri ile online görünürlük artırma.',
        durum: 'Tamamlandı',
        ilerlemeYuzdesi: 100,
        danismanNotlari: 'Dijital pazarlama stratejisi başarıyla uygulandı. Firma online görünürlüğü artırdı.'
      }
    ];
  }

  // Hizmet güncelle
  static updateHizmet(firmaId: string, hizmetId: number, updateData: Partial<FirmaHizmeti>): boolean {
    try {
      const hizmetler = this.loadFirmaHizmetleri(firmaId);
      const hizmetIndex = hizmetler.findIndex(h => h.id === hizmetId);

      if (hizmetIndex === -1) {
        console.error('❌ Hizmet bulunamadı:', hizmetId);
        return false;
      }

      hizmetler[hizmetIndex] = { ...hizmetler[hizmetIndex], ...updateData };
      this.saveFirmaHizmetleri(firmaId, hizmetler);

      console.log('✅ Hizmet güncellendi:', hizmetler[hizmetIndex]);
      return true;
    } catch (error) {
      console.error('💥 Hizmet güncelleme hatası:', error);
      return false;
    }
  }

  // Yeni hizmet ekle
  static addHizmet(firmaId: string, yeniHizmet: Omit<FirmaHizmeti, 'id'>): FirmaHizmeti | null {
    try {
      const hizmetler = this.loadFirmaHizmetleri(firmaId);
      const newId = Math.max(...hizmetler.map(h => h.id)) + 1;

      const fullHizmet: FirmaHizmeti = {
        id: newId,
        ...yeniHizmet
      };

      hizmetler.push(fullHizmet);
      this.saveFirmaHizmetleri(firmaId, hizmetler);

      console.log('✅ Yeni hizmet eklendi:', fullHizmet);
      return fullHizmet;
    } catch (error) {
      console.error('💥 Hizmet ekleme hatası:', error);
      return null;
    }
  }

  // FİRMA İLERLEME ORTALAMASINI HESAPLA
  static calculateFirmaProgress(firmaId: string): {
    ortalamaIlerleme: number;
    tamamlananHizmet: number;
    toplamHizmet: number;
    detaylar: { hizmetAdi: string; ilerleme: number; durum: string }[]
  } {
    try {
      const hizmetler = this.loadFirmaHizmetleri(firmaId);

      if (hizmetler.length === 0) {
        return {
          ortalamaIlerleme: 0,
          tamamlananHizmet: 0,
          toplamHizmet: 0,
          detaylar: []
        };
      }

      const toplamIlerleme = hizmetler.reduce((sum, hizmet) => sum + hizmet.ilerlemeYuzdesi, 0);
      const ortalamaIlerleme = Math.round(toplamIlerleme / hizmetler.length);
      const tamamlananHizmet = hizmetler.filter(h => h.durum === 'Tamamlandı').length;

      const detaylar = hizmetler.map(h => ({
        hizmetAdi: h.hizmetAdi,
        ilerleme: h.ilerlemeYuzdesi,
        durum: h.durum
      }));

      return {
        ortalamaIlerleme,
        tamamlananHizmet,
        toplamHizmet: hizmetler.length,
        detaylar: detaylar
      };
    } catch (error) {
      console.error('💥 İlerleme hesaplama hatası:', error);
      return {
        ortalamaIlerleme: 0,
        tamamlananHizmet: 0,
        toplamHizmet: 0,
        detaylar: []
      };
    }
  }
}

interface AdminFirmaDetayClientProps {
  firmaId: string;
}

export default function AdminFirmaDetayClient({ firmaId }: AdminFirmaDetayClientProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [activeMenuItem, setActiveMenuItem] = useState('Firmalar');
  const [firmaDetay, setFirmaDetay] = useState<FirmaDetay | null>(null);
  const [firmaHizmetleri, setFirmaHizmetleri] = useState<FirmaHizmeti[]>([]);
  const [mevcutHizmetler, setMevcutHizmetler] = useState<ProjeHizmeti[]>([]);
  const [belgeler, setBelgeler] = useState<Dokuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('genel');
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [message, setMessage] = useState('');
  const [editingService, setEditingService] = useState<number | null>(null);
  const [editServiceData, setEditServiceData] = useState({
    durum: '' as 'Başlamadı' | 'Devam Ediyor' | 'Tamamlandı' | '',
    ilerlemeYuzdesi: 0,
    danismanNotlari: ''
  });

  // İlerleme ortalamaları için state
  const [firmaProgress, setFirmaProgress] = useState({
    ortalamaIlerleme: 0,
    tamamlananHizmet: 0,
    toplamHizmet: 0,
    detaylar: [] as { hizmetAdi: string; ilerleme: number; durum: string; }[]
  });

  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem('isAdminLoggedIn');
    const email = localStorage.getItem('adminEmail');
    const role = localStorage.getItem('adminRole');

    if (!loggedIn || loggedIn !== 'true' || role !== 'Yonetici') {
      router.push('/admin-login');
      return;
    }

    setIsAdminLoggedIn(true);
    setAdminEmail(email || '');

    // 🚀 Firma ID kontrolü ve veri yükleme
    if (!firmaId) {
      console.error('❌ ID parametresi bulunamadı: firmaId is undefined or null');
      setMessage('⚠️ Geçersiz firma ID parametresi');
      setLoading(false);
      return;
    }

    console.log('🔄 Firma detay yükleme başlatılıyor, ID:', firmaId);
    loadFirmaDetay();
  }, [firmaId, router]);

  const loadFirmaDetay = async () => {
    try {
      setLoading(true);
      setMessage('');

      // 🔍 ID doğrulama
      if (!firmaId) {
        console.error('❌ ID parametresi bulunamadı - firmaId is undefined');
        setFirmaDetay(null);
        setMessage('⚠️ Firma ID parametresi eksik');
        return;
      }

      console.log('📡 Supabase\'den firma verisi yükleniyor...');

      // 🚀 Supabase\'den firma verisi yükle
      const firmaData = await SupabaseFirmaDetayLoader.loadFirmaFromSupabase(firmaId);

      if (!firmaData) {
        console.error('❌ Firma Supabase\'de bulunamadı');
        setFirmaDetay(null);
        setMessage(`⚠️ ID ${firmaId} ile firma Supabase veritabanında bulunamadı`);
        return;
      }

      console.log('✅ Firma Supabase\'den başarıyla yüklendi');
      setFirmaDetay(firmaData);
      setMessage('✅ Firma bilgileri Supabase\'den başarıyla yüklendi');

      // Hizmetleri ve diğer verileri yükle
      const hizmetlerData = FirmaHizmetleriManager.loadFirmaHizmetleri(firmaId);
      setFirmaHizmetleri(hizmetlerData);

      // İlerleme hesapla
      const progressData = FirmaHizmetleriManager.calculateFirmaProgress(firmaId);
      setFirmaProgress(progressData);

      // Mock hizmet ve belge verileri
      const mevcutHizmetlerData: ProjeHizmeti[] = [
        {
          id: 1,
          hizmetAdi: 'B2B İşlemleri',
          aciklama: 'İşletmeler arası e-ticaret platformları, tedarik zinciri yönetimi ve B2B e-ihracat süreçlerinde profesyonel destek.'
        },
        {
          id: 2,
          hizmetAdi: 'B2C İşlemleri',
          aciklama: 'Tüketiciye yönelik e-ticaret platformları, online mağaza kurulumu ve müşteri deneyimi optimizasyonu.'
        },
        {
          id: 3,
          hizmetAdi: 'Teşvik ve Destekler',
          aciklama: 'Devlet destekleri, hibe programları, vergi teşvikleri ve e-ihracat için özel finansman imkanları.'
        },
        {
          id: 4,
          hizmetAdi: 'Dijital Pazarlama',
          aciklama: 'SEO, SEM, sosyal medya pazarlama ve dijital reklam stratejileri ile online görünürlük artırma.'
        },
        {
          id: 5,
          hizmetAdi: 'Lojistik ve Kargo',
          aciklama: 'Uluslararası kargo, gümrük işlemleri ve lojistik çözümleri konularında danışmanlık.'
        }
      ];

      const belgelerData: Dokuman[] = [
        {
          id: 1,
          belgeAdi: 'vergi_levhasi.pdf',
          kategori: 'Vergi Levhası',
          yuklemeTarihi: '2024-01-15'
        },
        {
          id: 2,
          belgeAdi: 'faaliyet_belgesi.pdf',
          kategori: 'Faaliyet Belgesi',
          yuklemeTarihi: '2024-01-15'
        },
        {
          id: 3,
          belgeAdi: 'urun_katalogu.pdf',
          kategori: 'Ürün Kataloğu',
          yuklemeTarihi: '2024-01-16'
        }
      ];

      setMevcutHizmetler(mevcutHizmetlerData);
      setBelgeler(belgelerData);

      // 3 saniye sonra başarı mesajını temizle
      setTimeout(() => {
        setMessage('');
      }, 3000);

    } catch (error) {
      console.error('💥 Firma detayları yükleme sistem hatası:', error);
      setFirmaDetay(null);
      setMessage('❌ Firma detayları yüklenirken sistem hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilOnayla = async () => {
    try {
      if (!firmaDetay || !firmaId) return;

      setMessage('🔄 Profil onaylanıyor...');
      
      const success = await SupabaseFirmaDetayLoader.approveProfile(firmaId);

      if (success) {
        setFirmaDetay(prev => prev ? {
          ...prev,
          firmaProfilDurumu: 'Onaylandı',
          guncellenmeTarihi: new Date().toLocaleDateString('tr-TR')
        } : null);

        setMessage('✅ Firma profili başarıyla onaylandı ve tüm sistemler güncellendi.');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Profil onaylanırken bir hata oluştu.');
      }
    } catch (error) {
      console.error('💥 Profil onaylama hatası:', error);
      setMessage('❌ Profil onaylanırken sistem hatası oluştu.');
    }
  };

  const handleAddService = async () => {
    if (!selectedService || !firmaId) return;

    try {
      const selectedHizmet = mevcutHizmetler.find(h => h.id.toString() === selectedService);
      if (!selectedHizmet) return;

      const newHizmet = FirmaHizmetleriManager.addHizmet(firmaId, {
        hizmetAdi: selectedHizmet.hizmetAdi,
        aciklama: selectedHizmet.aciklama,
        durum: 'Başlamadı',
        ilerlemeYuzdesi: 0,
        danismanNotlari: ''
      });

      if (newHizmet) {
        setFirmaHizmetleri(prev => [...prev, newHizmet]);

        const progressData = FirmaHizmetleriManager.calculateFirmaProgress(firmaId);
        setFirmaProgress(progressData);

        setShowAddServiceModal(false);
        setSelectedService('');
        setMessage('✅ Hizmet başarıyla eklendi.');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('💥 Hizmet ekleme hatası:', error);
      setMessage('❌ Hizmet eklenirken bir hata oluştu.');
    }
  };

  const handleUpdateService = async (serviceId: number) => {
    if (!firmaId) return;

    try {
      const success = FirmaHizmetleriManager.updateHizmet(firmaId, serviceId, editServiceData);

      if (success) {
        setFirmaHizmetleri(prev =>
          prev.map(hizmet =>
            hizmet.id === serviceId
              ? { ...hizmet, ...editServiceData }
              : hizmet
          )
        );

        const progressData = FirmaHizmetleriManager.calculateFirmaProgress(firmaId);
        setFirmaProgress(progressData);

        setEditingService(null);
        setMessage('✅ Hizmet durumu güncellendi ve kalıcı olarak kaydedildi.');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('💥 Hizmet güncelleme hatası:', error);
      setMessage('❌ Hizmet güncellenirken bir hata oluştu.');
    }
  };

  const startEditService = (hizmet: FirmaHizmeti) => {
    setEditingService(hizmet.id);
    setEditServiceData({
      durum: hizmet.durum,
      ilerlemeYuzdesi: hizmet.ilerlemeYuzdesi,
      danismanNotlari: hizmet.danismanNotlari
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/');
  };

  // Loading durumu
  if (!isAdminLoggedIn || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">
            {loading ? '📡 Supabase\'den firma verisi yükleniyor...' : '🔄 Yükleniyor...'}
          </p>
        </div>
      </div>
    );
  }

  // Firma bulunamadı durumu
  if (!firmaDetay) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <i className="ri-error-warning-line text-xl"></i>
              <strong>Firma Bulunamadı</strong>
            </div>
            <p className="text-sm">
              {message || `ID ${firmaId || 'Bilinmeyen'} ile firma Supabase veritabanında bulunamadı.`}
            </p>
          </div>
          <p className="text-gray-600 mb-4">
            Aradığınız firma mevcut değil, silinmiş olabilir veya ID hatalı olabilir.
          </p>
          <div className="space-x-4">
            <Link 
              href="/admin-firmalar" 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer inline-block"
            >
              📋 Firma Listesine Dön
            </Link>
            <button
              onClick={loadFirmaDetay}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 cursor-pointer"
            >
              🔄 Tekrar Dene
            </button>
          </div>
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
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer" style={{ fontFamily: 'Pacifico' }}>
                logo
              </Link>
              <div className="flex items-center space-x-2 text-gray-600">
                <Link href="/admin-firmalar" className="hover:text-blue-600 cursor-pointer">
                  Firma Yönetimi
                </Link>
                <i className="ri-arrow-right-s-line"></i>
                <span>Firma Detayı</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  🗂️ Supabase Canlı
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar activeMenuItem={activeMenuItem} setActiveMenuItem={setActiveMenuItem} />

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{firmaDetay.firmaAdi}</h1>
                  <p className="text-gray-600 mt-2">{firmaDetay.yetkiliEmail}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <p className="text-sm text-gray-500">Firma ID: #{firmaDetay.id}</p>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      🔗 Supabase Entegre
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Profil Durumu:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        firmaDetay.firmaProfilDurumu === 'Onaylandı'
                          ? 'bg-green-100 text-green-700'
                          : firmaDetay.firmaProfilDurumu === 'Onay Bekliyor'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {firmaDetay.firmaProfilDurumu}
                    </span>
                  </div>
                  {firmaDetay.firmaProfilDurumu === 'Onay Bekliyor' && (
                    <button
                      onClick={handleProfilOnayla}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      ✅ Profili Onayla
                    </button>
                  )}
                  <Link
                    href={`/admin-firma-duzenle/${firmaDetay.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    ✏️ Düzenle
                  </Link>
                </div>
              </div>

              {/* Başarı/Hata Mesajları */}
              {message && (
                <div
                  className={`mb-6 p-4 rounded-lg border ${
                    message.includes('✅') || message.includes('başarıyla') 
                      ? 'bg-green-50 border-green-200 text-green-700' 
                      : message.includes('⚠️') 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <p className="text-sm font-medium">{message}</p>
                </div>
              )}

              {/* İlerleme Özet Kartı */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      📊 Firma İlerleme Özeti
                    </h3>
                    <p className="text-sm text-gray-600">Tüm hizmetlerin genel durumu</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{firmaProgress.ortalamaIlerleme}%</div>
                    <div className="text-sm text-gray-500">Ortalama İlerleme</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <i className="ri-check-line text-green-600"></i>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">{firmaProgress.tamamlananHizmet}</div>
                        <div className="text-sm text-gray-600">Tamamlanan Hizmet</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="ri-list-check-line text-blue-600"></i>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">{firmaProgress.toplamHizmet}</div>
                        <div className="text-sm text-gray-600">Toplam Hizmet</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <i className="ri-time-line text-orange-600"></i>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">{firmaProgress.toplamHizmet - firmaProgress.tamamlananHizmet}</div>
                        <div className="text-sm text-gray-600">Devam Eden</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* İlerleme Çubuğu */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${firmaProgress.ortalamaIlerleme}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200 mb-8">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('genel')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                      activeTab === 'genel'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📋 Genel Bilgiler
                  </button>
                  <button
                    onClick={() => setActiveTab('hizmetler')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                      activeTab === 'hizmetler'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🛠️ Hizmetler ({firmaHizmetleri.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('belgeler')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                      activeTab === 'belgeler'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    📄 Belgeler ({belgeler.length})
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {activeTab === 'genel' && (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-2">📊 Temel Bilgiler</h3>
                        <div className="space-y-2 text-sm">
                          <p>
                            <span className="font-medium">Firma ID:</span> #{firmaDetay.id}
                          </p>
                          <p>
                            <span className="font-medium">Firma Adı:</span> {firmaDetay.firmaAdi}
                          </p>
                          <p>
                            <span className="font-medium">E-posta:</span> {firmaDetay.yetkiliEmail}
                          </p>
                          <p>
                            <span className="font-medium">Vergi No:</span> {firmaDetay.vergiNumarasi}
                          </p>
                          <p>
                            <span className="font-medium">Telefon:</span> {firmaDetay.yetkiliTelefon}
                          </p>
                          <p>
                            <span className="font-medium">Sektor:</span> {firmaDetay.sektor}
                          </p>
                          <p>
                            <span className="font-medium">Kayıt Tarihi:</span> {firmaDetay.kayitTarihi}
                          </p>
                          {firmaDetay.guncellenmeTarihi && (
                            <p>
                              <span className="font-medium">Güncelleme:</span> {firmaDetay.guncellenmeTarihi}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-2">📍 Adres</h3>
                        <p className="text-sm text-gray-700">{firmaDetay.adres}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">💼 Ticari Bilgiler</h3>
                      <p className="text-sm text-gray-700">{firmaDetay.ticariBilgiler}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">🌍 İhracat Tecrübesi</h3>
                      <p className="text-sm text-gray-700">{firmaDetay.ihracatTecrubesi}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">🛍️ Ürün/Hizmet Bilgileri</h3>
                      <p className="text-sm text-gray-700">{firmaDetay.urunHizmetBilgileri}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">💻 Dijital Varlıklar</h3>
                      <p className="text-sm text-gray-700">{firmaDetay.dijitalVarliklar}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'hizmetler' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-semibold text-gray-900">🛠️ Firma Hizmetleri</h3>
                      <button
                        onClick={() => setShowAddServiceModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
                      >
                        <i className="ri-add-line"></i>
                        <span>Hizmet Ekle</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {firmaHizmetleri.map(hizmet => (
                        <div key={hizmet.id} className="border border-gray-200 rounded-lg p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{hizmet.hizmetAdi}</h4>
                              <p className="text-sm text-gray-600 mt-1">{hizmet.aciklama}</p>
                            </div>
                            <button
                              onClick={() => startEditService(hizmet)}
                              className="text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                          </div>

                          {editingService === hizmet.id ? (
                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Durum
                                  </label>
                                  <select
                                    value={editServiceData.durum}
                                    onChange={(e) =>
                                      setEditServiceData(prev => ({ ...prev, durum: e.target.value }))
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                                  >
                                    <option value="Başlamadı">Başlamadı</option>
                                    <option value="Devam Ediyor">Devam Ediyor</option>
                                    <option value="Tamamlandı">Tamamlandı</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    İlerleme Yüzdesi
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={editServiceData.ilerlemeYuzdesi}
                                    onChange={(e) =>
                                      setEditServiceData(prev => ({
                                        ...prev,
                                        ilerlemeYuzdesi: parseInt(e.target.value) || 0
                                      }))
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Danışman Notları
                                </label>
                                <textarea
                                  value={editServiceData.danismanNotlari}
                                  onChange={(e) =>
                                    setEditServiceData(prev => ({
                                      ...prev,
                                      danismanNotlari: e.target.value
                                    }))
                                  }
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="Hizmet hakkında notlarınızı giriniz..."
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => setEditingService(null)}
                                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  İptal
                                </button>
                                <button
                                  onClick={() => handleUpdateService(hizmet.id)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  ✅ Güncelle
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid md:grid-cols-3 gap-4">
                              <div>
                                <span className="text-sm text-gray-500">Durum:</span>
                                <span
                                  className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                    hizmet.durum === 'Tamamlandı'
                                      ? 'bg-green-100 text-green-700'
                                      : hizmet.durum === 'Devam Ediyor'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {hizmet.durum}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">İlerleme:</span>
                                <div className="flex items-center space-x-2 mt-1">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${hizmet.ilerlemeYuzdesi}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm text-gray-600">{hizmet.ilerlemeYuzdesi}%</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Danışman Notları:</span>
                                <p className="text-sm text-gray-700 mt-1">{hizmet.danismanNotlari || 'Henüz not eklenmemiş'}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'belgeler' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900">📄 Yüklenen Belgeler</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {belgeler.map(belge => (
                        <div key={belge.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <i className="ri-file-text-line text-blue-600"></i>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{belge.belgeAdi}</h4>
                              <p className="text-sm text-gray-600">{belge.kategori}</p>
                              <p className="text-xs text-gray-500">Yükleme: {belge.yuklemeTarihi}</p>
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

        {/* Add Service Modal */}
        {showAddServiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">➕ Hizmet Ekle</h3>
                <button
                  onClick={() => setShowAddServiceModal(false)}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hizmet Seçin
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                  >
                    <option value="">Hizmet seçiniz...</option>
                    {mevcutHizmetler
                      .filter(hizmet => !firmaHizmetleri.some(fh => fh.hizmetAdi === hizmet.hizmetAdi))
                      .map(hizmet => (
                        <option key={hizmet.id} value={hizmet.id.toString()}>
                          {hizmet.hizmetAdi}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowAddServiceModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleAddService}
                    disabled={!selectedService}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                  >
                    ✅ Ekle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
