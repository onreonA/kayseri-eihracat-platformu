
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ModernLayout from '../../components/Layout/ModernLayout';

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
}

interface ProjeDönemi {
  ID: number;
  DönemAdı: string;
  BaslangicTarihi: Date;
  BitisTarihi: Date;
  Hedefler: string;
  Durum: 'Aktif' | 'Pasif' | 'Tamamlandı';
  OluşturmaTarihi: Date;
}

class FirmaDönemİlerlemesiService {
  static async getFirmaRaporlari(firmaId: number): Promise<FirmaRaporu[]> {
    try {
      const savedData = localStorage.getItem('admin_donem_ilerlemesi');
      if (!savedData) {
        return [];
      }

      const tümRaporlar: FirmaRaporu[] = JSON.parse(savedData);
      return tümRaporlar.filter(rapor => rapor.FirmaID === firmaId);
    } catch (error) {
      console.error('Dönem raporu alma hatası:', error);
      return [];
    }
  }

  static async firmaDönemRaporuVarMi(firmaId: number, dönemId: number): Promise<boolean> {
    try {
      const raporlar = await this.getFirmaRaporlari(firmaId);
      return raporlar.some(rapor => rapor.DonemID === dönemId);
    } catch (error) {
      console.error('Dönem raporu kontrol hatası:', error);
      return false;
    }
  }

  static async gonderRapor(firmaId: number, dönemId: number, raporMetni: string): Promise<void> {
    try {
      const savedData = localStorage.getItem('admin_donem_ilerlemesi');
      const mevcutRaporlar: FirmaRaporu[] = savedData ? JSON.parse(savedData) : [];

      const yeniRapor: FirmaRaporu = {
        ID: Date.now(),
        FirmaID: firmaId,
        DonemID: dönemId,
        FirmaRaporu: raporMetni,
        RaporTarihi: new Date(),
        OnayDurumu: 'Beklemede',
        NSLNotlari: '',
        GuncellenmeTarihi: new Date(),
        DönemAdı: 'Mevcut Dönem'
      };

      mevcutRaporlar.push(yeniRapor);
      localStorage.setItem('admin_donem_ilerlemesi', JSON.stringify(mevcutRaporlar));
    } catch (error) {
      console.error('Rapor gönderme hatası:', error);
      throw error;
    }
  }

  static async guncelleRapor(raporId: number, yeniMetin: string): Promise<void> {
    try {
      const savedData = localStorage.getItem('admin_donem_ilerlemesi');
      if (!savedData) return;

      const raporlar: FirmaRaporu[] = JSON.parse(savedData);
      const raporIndex = raporlar.findIndex(r => r.ID === raporId);

      if (raporIndex !== -1) {
        raporlar[raporIndex].FirmaRaporu = yeniMetin;
        raporlar[raporIndex].GuncellenmeTarihi = new Date();
        localStorage.setItem('admin_donem_ilerlemesi', JSON.stringify(raporlar));
      }
    } catch (error) {
      console.error('Rapor güncelleme hatası:', error);
      throw error;
    }
  }
}

class ProjeDönemleriService {
  static async getMevcutDönem(): Promise<ProjeDönemi | null> {
    try {
      const savedData = localStorage.getItem('admin_donemler');
      if (!savedData) {
        const defaultDönem: ProjeDönemi = {
          ID: 1,
          DönemAdı: '2024 Yılı 1. Dönem',
          BaslangicTarihi: new Date('2024-01-01'),
          BitisTarihi: new Date('2024-06-30'),
          Hedefler: 'Bu döneminde firmaların e-ihracat kapasitelerini artırmaları ve uluslararası pazarlarda yer edinmaları hedeflenmektedir.',
          Durum: 'Aktif',
          OluşturmaTarihi: new Date()
        };

        localStorage.setItem('admin_donemler', JSON.stringify([defaultDönem]));
        return defaultDönem;
      }

      const dönemler: ProjeDönemi[] = JSON.parse(savedData);
      return dönemler.find(d => d.Durum === 'Aktif') || null;
    } catch (error) {
      console.error('Mevcut dönem alma hatası:', error);
      return null;
    }
  }
}

export default function DonemRaporlariPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [firmaAdi, setFirmaAdi] = useState('');
  const [firmaId, setFirmaId] = useState(1);
  const [raporlar, setRaporlar] = useState<FirmaRaporu[]>([]);
  const [mevcutDonem, setMevcutDonem] = useState<ProjeDönemi | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  const [newReportText, setNewReportText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [editReportText, setEditReportText] = useState('');
  const [activeTab, setActiveTab] = useState('raporlar');
  const [currentTime, setCurrentTime] = useState(new Date());

  const router = useRouter();
  const redirectRef = useRef(false);
  const isMountedRef = useRef(false);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastAuthCheck = useRef(0);
  const AUTH_CHECK_COOLDOWN = 2500;

  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted || initialCheckDone || redirectRef.current) return;

    const performSafeAuthCheck = () => {
      try {
        console.log('🔐 DÖNEM RAPORLARI: Güvenli auth kontrolü başlatılıyor...');

        const now = Date.now();
        if ((now - lastAuthCheck.current) < AUTH_CHECK_COOLDOWN) {
          console.log('⚡ Dönem Raporları auth kontrol atlandı - çok erken:', now - lastAuthCheck.current, 'ms');
          setInitialCheckDone(true);
          setLoading(false);
          return;
        }
        lastAuthCheck.current = now;

        if (typeof window === 'undefined') {
          setLoading(false);
          return;
        }

        const unifiedData = localStorage.getItem('user_login_data');
        if (unifiedData) {
          try {
            const parsedData = JSON.parse(unifiedData);
            const isValid = parsedData.email && parsedData.firmaAdi && parsedData.loginTime;

            if (isValid) {
              const loginTime = new Date(parsedData.loginTime);
              const now = new Date();
              const timeDiff = now.getTime() - loginTime.getTime();
              const hoursDiff = timeDiff / (1000 * 3600);

              if (hoursDiff > 24) {
                console.log('⏰ Dönem Raporları: Giriş süresi dolmuş');
                if (isMountedRef.current && !redirectRef.current) {
                  redirectRef.current = true;
                  setTimeout(() => {
                    router.push('/login');
                  }, 800);
                }
                return;
              }

              if (isMountedRef.current) {
                console.log('✅ Dönem Raporları: Unified format auth başarılı');
                setIsLoggedIn(true);
                setUserEmail(parsedData.email);
                setFirmaAdi(parsedData.firmaAdi);
                setFirmaId(parsedData.firmaId || 1);
                setInitialCheckDone(true);
                setLoading(false);
              }
              return;
            }
          } catch (parseError) {
            console.warn('⚠️ Dönem Raporları: Unified data parse hatası:', parseError);
          }
        }

        const isLoggedInLegacy = localStorage.getItem('isLoggedIn');
        const email = localStorage.getItem('firmaEmail');
        const adi = localStorage.getItem('firmaAdi');

        console.log('🔍 Dönem Raporları legacy kontrol:', { isLoggedIn: isLoggedInLegacy, email: !!email, adi: !!adi });

        if (!isLoggedInLegacy || isLoggedInLegacy !== 'true' || !adi) {
          console.log('❌ Dönem Raporları: Auth başarısız, login\'e yönlendiriliyor');
          if (isMountedRef.current && !redirectRef.current) {
            redirectRef.current = true;
            setTimeout(() => {
              router.push('/login');
            }, 800);
          }
          return;
        }

        if (isMountedRef.current) {
          console.log('✅ Dönem Raporları: Legacy format auth başarılı');
          setIsLoggedIn(true);
          setUserEmail(email || '');
          setFirmaAdi(adi);
          setFirmaId(parseInt(localStorage.getItem('firmaId') || '1'));
          setInitialCheckDone(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('💥 Dönem Raporları auth kontrol hatası:', error);
        if (isMountedRef.current) {
          setLoading(false);
          setInitialCheckDone(true);
        }
      }
    };

    authCheckTimeoutRef.current = setTimeout(performSafeAuthCheck, 4000);

    return () => {
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, [mounted, initialCheckDone, router]);

  useEffect(() => {
    if (mounted && isLoggedIn) {
      loadData();

      const timeTimer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timeTimer);
    }
  }, [mounted, isLoggedIn]);

  const loadData = async () => {
    try {
      const [firmaRaporlari, aktifDonem] = await Promise.all([
        FirmaDönemİlerlemesiService.getFirmaRaporlari(firmaId),
        ProjeDönemleriService.getMevcutDönem()
      ]);

      setRaporlar(firmaRaporlari);
      setMevcutDonem(aktifDonem);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem('user_login_data');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('firmaEmail');
      localStorage.removeItem('firmaAdi');
      localStorage.removeItem('firmaId');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNewReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportText.trim() || !mevcutDonem) return;

    setSaving(true);
    setMessage('');

    try {
      const raporVarMi = await FirmaDönemİlerlemesiService.firmaDönemRaporuVarMi(firmaId, mevcutDonem.ID);

      if (raporVarMi) {
        setMessage('Bu dönem için zaten rapor gönderilmiş.');
        setSaving(false);
        return;
      }

      await FirmaDönemİlerlemesiService.gonderRapor(firmaId, mevcutDonem.ID, newReportText);

      setMessage('Rapor başarıyla gönderildi.');
      setShowNewReportForm(false);
      setNewReportText('');

      loadData();
    } catch (error) {
      setMessage('Rapor gönderilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditReport = (rapor: FirmaRaporu) => {
    setEditingReportId(rapor.ID);
    setEditReportText(rapor.FirmaRaporu);
  };

  const handleSaveEdit = async (raporId: number) => {
    setSaving(true);
    setMessage('');

    try {
      await FirmaDönemİlerlemesiService.guncelleRapor(raporId, editReportText);

      setMessage('Rapor başarıyla güncellendi.');
      setEditingReportId(null);
      setEditReportText('');

      loadData();
    } catch (error) {
      setMessage('Rapor güncellenirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingReportId(null);
    setEditReportText('');
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
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEditReport = (rapor: FirmaRaporu) => {
    return rapor.OnayDurumu === 'Beklemede' || rapor.OnayDurumu === 'Reddedildi';
  };

  if (!mounted || loading || !initialCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Dönem Raporları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Hata:</strong> Oturum açmanız gerekli
          </div>
          <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ModernLayout userEmail={userEmail} userRole="Firma Temsilcisi" isAdmin={false} notifications={2}>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Modern Hero Bölümü */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <i className="ri-file-text-line text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Dönem Raporları
                  </h1>
                  <p className="text-gray-600">Proje dönemlerinize ait raporları görüntüleyin ve yönetin</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-200">
                <div className="text-center">
                  <div className="text-xs text-blue-600 font-medium">Sistem Saati</div>
                  <div className="text-sm font-bold text-blue-900" suppressHydrationWarning={true}>
                    {currentTime.toLocaleTimeString('tr-TR')}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Çevrimiçi</span>
              </div>
            </div>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-file-list-3-line text-white text-xl"></i>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{raporlar.length}</p>
                  <p className="text-sm text-gray-600">Toplam Rapor</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(raporlar.length * 20, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Gönderilen raporlar</p>
            </div>
          </div>

          <div className="group">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-check-double-line text-white text-xl"></i>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {raporlar.filter(r => r.OnayDurumu === 'Onaylandı').length}
                  </p>
                  <p className="text-sm text-gray-600">Onaylanan</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000"
                  style={{
                    width: `${raporlar.length > 0 ? (raporlar.filter(r => r.OnayDurumu === 'Onaylandı').length / raporlar.length) * 100 : 0}%`
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Onay durumu</p>
            </div>
          </div>

          <div className="group">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="ri-calendar-check-line text-white text-xl"></i>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{mevcutDonem ? '1' : '0'}</p>
                  <p className="text-sm text-gray-600">Aktif Dönem</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: mevcutDonem ? '100%' : '0%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Dönem durumu</p>
            </div>
          </div>
        </div>

        {/* Ana İçerik */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
          {message && (
            <div
              className={`m-6 p-4 rounded-lg ${message.includes('başarıyla') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
            >
              <p className={`text-sm ${message.includes('başarıyla') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('raporlar')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-all duration-200 ${
                  activeTab === 'raporlar'
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <i className="ri-file-list-line"></i>
                  <span>Gönderilen Raporlar</span>
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {raporlar.length}
                  </div>
                </div>
              </button>
              {mevcutDonem && (
                <button
                  onClick={() => setActiveTab('donem')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-all duration-200 ${
                    activeTab === 'donem'
                      ? 'border-green-500 text-green-600 bg-green-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <i className="ri-calendar-line"></i>
                    <span>Mevcut Dönem</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'raporlar' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Gönderilen Raporlar</h2>
                    <p className="text-gray-600">Dönemsel raporlarınızı görüntüleyin ve düzenleyin</p>
                  </div>
                  {mevcutDonem && (
                    <button
                      onClick={() => setShowNewReportForm(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:scale-105 transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                    >
                      <i className="ri-add-line"></i>
                      <span>Yeni Rapor Gönder</span>
                    </button>
                  )}
                </div>

                {raporlar.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-file-text-line text-gray-400 text-3xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz rapor yok</h3>
                    <p className="text-gray-600">Gönderdiğiniz dönem raporları burada görünecek.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {raporlar.map((rapor) => (
                      <div
                        key={rapor.ID}
                        className="bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 hover:shadow-lg hover:bg-white/70 transition-all duration-300 group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                              {rapor.DönemAdı}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center">
                                <i className="ri-time-line mr-1"></i>
                                {formatTarih(rapor.RaporTarihi)}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOnayDurumuColor(rapor.OnayDurumu)}`}>
                                {rapor.OnayDurumu}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {canEditReport(rapor) && (
                              <button
                                onClick={() => handleEditReport(rapor)}
                                className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-200 hover:scale-110 transition-all duration-200 group"
                              >
                                <i className="ri-edit-line text-blue-600 group-hover:scale-110"></i>
                              </button>
                            )}
                          </div>
                        </div>

                        {editingReportId === rapor.ID ? (
                          <div className="space-y-4">
                            <textarea
                              value={editReportText}
                              onChange={(e) => setEditReportText(e.target.value)}
                              rows={8}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm backdrop-blur-sm"
                              placeholder="Rapor içeriğinizi buraya yazınız..."
                              maxLength={2000}
                            />
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">
                                {editReportText.length}/2000 karakter
                              </span>
                              <div className="flex space-x-2">
                                <button
                                  onClick={cancelEdit}
                                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  İptal
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(rapor.ID)}
                                  disabled={saving || !editReportText.trim()}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                                >
                                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl p-4 backdrop-blur-sm">
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                <i className="ri-file-text-line mr-2 text-blue-600"></i>
                                Rapor İçeriği
                              </h4>
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {rapor.FirmaRaporu}
                              </p>
                            </div>

                            {rapor.NSLNotlari && (
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                                  <i className="ri-chat-quote-line mr-2 text-blue-600"></i>
                                  NSL Notları
                                </h4>
                                <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
                                  {rapor.NSLNotlari}
                                </p>
                              </div>
                            )}

                            {rapor.OnayDurumu === 'Reddedildi' && (
                              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
                                <div className="flex items-center">
                                  <i className="ri-error-warning-line text-red-600 mr-2"></i>
                                  <span className="text-red-800 font-medium">Rapor reddedildi</span>
                                </div>
                                <p className="text-red-700 text-sm mt-1">
                                  Lütfen NSL notlarını inceleyerek raporu düzenleyin ve tekrar gönderin.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'donem' && mevcutDonem && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <i className="ri-calendar-check-line text-white text-xl"></i>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-1">{mevcutDonem.DönemAdı}</h3>
                        <p className="text-white/80">Aktif proje dönemi</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-blue-100 text-sm mb-1">Başlangıç Tarihi</p>
                        <p className="font-semibold text-lg">{new Date(mevcutDonem.BaslangicTarihi).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div>
                        <p className="text-blue-100 text-sm mb-1">Bitiş Tarihi</p>
                        <p className="font-semibold text-lg">{new Date(mevcutDonem.BitisTarihi).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="ri-target-line mr-2 text-indigo-600"></i>
                    Dönem Hedefleri
                  </h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {mevcutDonem.Hedefler}
                  </p>
                </div>

                {showNewReportForm && (
                  <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <i className="ri-file-add-line text-white"></i>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Yeni Dönem Raporu</h4>
                    </div>

                    <form onSubmit={handleNewReportSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rapor İçeriği
                        </label>
                        <textarea
                          value={newReportText}
                          onChange={(e) => setNewReportText(e.target.value)}
                          rows={10}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm backdrop-blur-sm"
                          placeholder="Bu dönemde gerçekleştirdiğiniz faaliyetleri, karşılaştığınız zorlukları, elde ettiğiniz sonuçları ve gelecek dönem planlarınızı detaylı olarak açıklayınız..."
                          maxLength={2000}
                          required
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-500">
                            {newReportText.length}/2000 karakter
                          </span>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => setShowNewReportForm(false)}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              İptal
                            </button>
                            <button
                              type="submit"
                              disabled={saving || !newReportText.trim()}
                              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                            >
                              {saving ? 'Gönderiliyor...' : 'Raporu Gönder'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Başarı Mesajı */}
        <div className="text-center py-8">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-400 text-blue-700 px-6 py-4 rounded-xl inline-block">
            <strong>📋 Dönem Raporları</strong> Bu bölümde dönemsel raporlarınızı yönetebilirsiniz.
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
