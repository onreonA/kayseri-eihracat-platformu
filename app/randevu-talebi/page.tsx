
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ModernLayout from '../../components/Layout/ModernLayout';
import { RandevuTalepleriService, LoginSyncService } from '@/lib/database';

interface RandevuTalebi {
  ID: number;
  FirmaID: number;
  Konu: string;
  Mesaj: string;
  TercihEdilenTarihSaat1: Date;
  TercihEdilenTarihSaat2?: Date;
  TercihEdilenTarihSaat3?: Date;
  TalepTarihi: Date;
  Durum: 'Beklemede' | 'Onaylandı' | 'Reddedildi' | 'Tamamlandı';
  AtananPersonelID?: number;
  PersonelAdı?: string;
  GerceklesenTarihSaat?: Date;
  AdminNotu?: string;
  FirmaAdı?: string;
  YetkiliAdı?: string;
  YetkiliEmail?: string;
  Telefon?: string;
}

interface FormData {
  konu: string;
  mesaj: string;
  tercihEdilenTarihSaat1: string;
  tercihEdilenTarihSaat2: string;
  tercihEdilenTarihSaat3: string;
}

interface RandevuIstatistikleri {
  toplam: number;
  beklemede: number;
  onaylandi: number;
  reddedildi: number;
  tamamlandi: number;
  buAyToplam: number;
  sonRandevuTarihi?: Date;
}

export default function RandevuTalebiPage() {
  const [userData, setUserData] = useState<{
    isLoggedIn: boolean;
    firmaId: number;
    firmaAdi: string;
    email: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [mounted, setMounted] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [activeTab, setActiveTab] = useState('gecmis');

  const [randevuTalepleri, setRandevuTalepleri] = useState<RandevuTalebi[]>([]);
  const [istatistikler, setIstatistikler] = useState<RandevuIstatistikleri>({
    toplam: 0,
    beklemede: 0,
    onaylandi: 0,
    reddedildi: 0,
    tamamlandi: 0,
    buAyToplam: 0
  });

  const [selectedDurum, setSelectedDurum] = useState<string>('Tümü');

  const [selectedRandevu, setSelectedRandevu] = useState<RandevuTalebi | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    konu: '',
    mesaj: '',
    tercihEdilenTarihSaat1: '',
    tercihEdilenTarihSaat2: '',
    tercihEdilenTarihSaat3: ''
  });

  const router = useRouter();
  const redirectRef = useRef(false);
  const isMountedRef = useRef(false);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastAuthCheck = useRef(0);
  const AUTH_CHECK_COOLDOWN = 2500; // 2.5 saniye

  const durumlar = ['Tümü', 'Beklemede', 'Onaylandı', 'Reddedildi', 'Tamamlandı'];

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
        console.log('📅 RANDEVU TALEPLERİ: Güvenli auth kontrolü başlatılıyor...');

        const now = Date.now();
        if ((now - lastAuthCheck.current) < AUTH_CHECK_COOLDOWN) {
          console.log('📅 Randevu auth kontrol atlandı - çok erken:', now - lastAuthCheck.current, 'ms');
          setInitialCheckDone(true);
          setLoading(false);
          return;
        }
        lastAuthCheck.current = now;

        if (typeof window === 'undefined') {
          setLoading(false);
          return;
        }

        // Unified format kontrolü
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
                console.log('📅 Randevu: Giriş süresi dolmuş');
                if (isMountedRef.current && !redirectRef.current) {
                  redirectRef.current = true;
                  setTimeout(() => {
                    router.push('/login');
                  }, 800);
                }
                return;
              }

              if (isMountedRef.current) {
                console.log('📅 Randevu: Unified format auth başarılı');
                setUserData({
                  isLoggedIn: true,
                  firmaId: parsedData.firmaId || 0,
                  firmaAdi: parsedData.firmaAdi,
                  email: parsedData.email
                });
                initializePageData(parsedData.firmaId);
                setInitialCheckDone(true);
              }
              return;
            }
          } catch (parseError) {
            console.warn('📅 Randevu: Unified data parse hatası:', parseError);
          }
        }

        // Legacy format kontrolü
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const firma = localStorage.getItem('firmaAdi');
        const id = localStorage.getItem('firmaId');
        const email = localStorage.getItem('userEmail');

        console.log('📅 Randevu legacy kontrol:', { isLoggedIn, firma: !!firma, id: !!id, email: !!email });

        if (!isLoggedIn || isLoggedIn !== 'true' || !firma || !id) {
          console.log('📅 Randevu: Auth başarısız, login\'e yönlendiriliyor');
          if (isMountedRef.current && !redirectRef.current) {
            redirectRef.current = true;
            setTimeout(() => {
              router.push('/login');
            }, 800);
          }
          return;
        }

        if (isMountedRef.current) {
          console.log('📅 Randevu: Legacy format auth başarılı');
          const firmaIdNum = parseInt(id) || 0;
          setUserData({
            isLoggedIn: true,
            firmaId: firmaIdNum,
            firmaAdi: firma,
            email: email || ''
          });
          initializePageData(firmaIdNum);
          setInitialCheckDone(true);
        }
      } catch (error) {
        console.error('📅 Randevu auth kontrol hatası:', error);
        if (isMountedRef.current) {
          setLoading(false);
          setInitialCheckDone(true);
        }
      }
    };

    // 4 saniye gecikme ile auth kontrolü başlat
    authCheckTimeoutRef.current = setTimeout(performSafeAuthCheck, 4000);

    return () => {
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, [mounted, initialCheckDone, router]);

  useEffect(() => {
    if (mounted && userData?.isLoggedIn) {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [mounted, userData?.isLoggedIn]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  const initializePageData = async (firmaId: number) => {
    try {
      console.log('📅 Randevu sayfası veri yükleme başlatılıyor...', firmaId);

      if (!firmaId || firmaId <= 0) {
        throw new Error('Geçersiz firma ID');
      }

      await Promise.all([
        loadRandevuTalepleri(firmaId),
        loadIstatistikler(firmaId)
      ]);

      console.log('📅 Randevu sayfası başarıyla yüklendi');

    } catch (error) {
      console.error('📅 Randevu sayfa yükleme hatası:', error);
      showMessage(`Sayfa yüklenirken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRandevuTalepleri = async (firmaId: number) => {
    try {
      console.log('📅 Randevu talepleri yükleniyor, Firma ID:', firmaId);

      if (!firmaId || isNaN(firmaId)) {
        console.error('📅 Geçersiz firma ID:', firmaId);
        throw new Error('Geçersiz firma ID');
      }

      const talepler = await RandevuTalepleriService.getFirmaRandevuTalepleri(firmaId);
      console.log('📅 Yüklenen talepler:', {
        count: talepler.length,
        firstItem: talepler.length > 0 ? {
          ID: talepler[0].ID,
          FirmaAdı: talepler[0].FirmaAdı,
          Konu: talepler[0].Konu,
          Durum: talepler[0].Durum
        } : null
      });

      setRandevuTalepleri(talepler);

      if (talepler.length > 0) {
        console.log('📅 ✅ Randevu talepleri başarıyla yüklendi:', talepler.length);
      } else {
        console.log('📅 ℹ️ Bu firma için randevu talebi bulunamadı');
      }

    } catch (error) {
      console.error('📅 Randevu talepleri yükleme hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      showMessage(`Randevu talepleri yüklenemedi: ${errorMessage}`, 'error');
      setRandevuTalepleri([]);
    }
  };

  const loadIstatistikler = async (firmaId: number) => {
    try {
      console.log('📊 İstatistikler hesaplanıyor...', firmaId);

      // Manuel istatistik hesapla
      const talepler = await RandevuTalepleriService.getFirmaRandevuTalepleri(firmaId);

      const stats = {
        toplam: talepler.length,
        beklemede: talepler.filter(t => t.Durum === 'Beklemede').length,
        onaylandi: talepler.filter(t => t.Durum === 'Onaylandı').length,
        reddedildi: talepler.filter(t => t.Durum === 'Reddedildi').length,
        tamamlandi: talepler.filter(t => t.Durum === 'Tamamlandı').length,
        buAyToplam: talepler.filter(t => {
          const talepTarihi = new Date(t.TalepTarihi);
          const now = new Date();
          return talepTarihi.getMonth() === now.getMonth() && talepTarihi.getFullYear() === now.getFullYear();
        }).length,
        sonRandevuTarihi: talepler.length > 0 ? new Date(Math.max(...talepler.map(t => new Date(t.TalepTarihi).getTime()))) : undefined
      };

      console.log('📊 İstatistikler:', stats);
      setIstatistikler(stats);

    } catch (error) {
      console.error('📊 İstatistikler yükleme hatası:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!userData) {
      showMessage('Kullanıcı bilgileri bulunamadı.', 'error');
      return;
    }

    console.log('📅 Form submit başlatılıyor...', {
      firmaId: userData.firmaId,
      konu: formData.konu,
      formValid: !!(formData.konu && formData.mesaj && formData.tercihEdilenTarihSaat1)
    });

    const errors = [];
    if (!formData.konu.trim()) errors.push('Konu');
    if (!formData.mesaj.trim()) errors.push('Mesaj');
    if (!formData.tercihEdilenTarihSaat1) errors.push('İlk tercih tarihi');

    if (errors.length > 0) {
      showMessage(`Lütfen şu alanları doldurun: ${errors.join(', ')}`, 'error');
      return;
    }

    const tercih1 = new Date(formData.tercihEdilenTarihSaat1);
    const now = new Date();

    if (tercih1 <= now) {
      showMessage('Tercih edilen tarih gelecekte bir tarih olmalıdır!', 'error');
      return;
    }

    setSubmitLoading(true);

    try {
      console.log('📅 Yeni randevu talebi gönderiliyor...', {
        firmaId: userData.firmaId,
        firmaAdi: userData.firmaAdi,
        konu: formData.konu,
        tercih1: formData.tercihEdilenTarihSaat1
      });

      const randevuData = {
        FirmaID: userData.firmaId,
        Konu: formData.konu,
        Mesaj: formData.mesaj,
        TercihEdilenTarihSaat1: tercih1,
        TercihEdilenTarihSaat2: formData.tercihEdilenTarihSaat2 ? new Date(formData.tercihEdilenTarihSaat2) : undefined,
        TercihEdilenTarihSaat3: formData.tercihEdilenTarihSaat3 ? new Date(formData.tercihEdilenTarihSaat3) : undefined
      };

      console.log('📅 Randevu verisi hazırlandı:', randevuData);

      const result = await RandevuTalepleriService.createRandevuTalebi(randevuData);

      if (result) {
        console.log('📅 ✅ Randevu talebi başarıyla oluşturuldu:', {
          ID: result.ID,
          FirmaAdı: result.FirmaAdı,
          Konu: result.Konu,
          Durum: result.Durum
        });

        showMessage('✅ Randevu talebiniz başarıyla gönderildi! En kısa sürede sizinle iletişime geçeceğiz.', 'success');

        setFormData({
          konu: '',
          mesaj: '',
          tercihEdilenTarihSaat1: '',
          tercihEdilenTarihSaat2: '',
          tercihEdilenTarihSaat3: ''
        });

        setActiveTab('gecmis');

        await Promise.all([
          loadRandevuTalepleri(userData.firmaId),
          loadIstatistikler(userData.firmaId)
        ]);

      } else {
        console.error('📅 ❌ Randevu talebi oluşturulamadı - result null');
        showMessage('❌ Randevu talebi gönderilirken beklenmeyen bir hata oluştu.', 'error');
      }

    } catch (error) {
      console.error('📅 Randevu talebi gönderme hatası:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });

      const errorMessage = error instanceof Error
        ? error.message
        : 'Randevu talebi gönderilirken bir hata oluştu.';

      showMessage(`❌ ${errorMessage}`, 'error');

    } finally {
      setSubmitLoading(false);
    }
  };

  const refreshData = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      await Promise.all([
        loadRandevuTalepleri(userData.firmaId),
        loadIstatistikler(userData.firmaId)
      ]);
      showMessage('Veriler yenilendi.', 'success');
    } catch (error) {
      console.error('🔄 Veri yenileme hatası:', error);
      showMessage('Veriler yenilenirken bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetail = (randevu: RandevuTalebi) => {
    setSelectedRandevu(randevu);
    setShowDetailModal(true);
  };

  const handleLogout = () => {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem('user_login_data');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('firmaAdi');
      localStorage.removeItem('firmaId');
      localStorage.removeItem('userEmail');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text);
    setMessageType(type);
  };

  const getDurumBadge = (durum: string) => {
    switch (durum) {
      case 'Beklemede':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Onaylandı':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Reddedildi':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Tamamlandı':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
    : randevuTalepleri.filter(randevu => randevu.Durum === selectedDurum);

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '-';

    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const formatDateTime = (date: Date | string | undefined): string => {
    if (!date) return '-';

    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  if (!mounted || loading || !initialCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-6"></div>
          <p className="text-gray-300 text-lg">Randevu Talepleri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!userData?.isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-4">
            <strong>Hata:</strong> Giriş yapmanız gerekiyor
          </div>
          <Link href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 cursor-pointer">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ModernLayout userEmail={userData.email} userRole="Firma Temsilcisi" isAdmin={false} notifications={3}>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Modern Hero Bölümü */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <i className="ri-calendar-check-line text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Randevu Talepleri
                  </h1>
                  <p className="text-gray-600">Uzmanlarımızla görüşme taleplerini yönetin</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Sistem Saati</div>
                <div className="text-lg font-semibold text-gray-900" suppressHydrationWarning={true}>
                  {currentTime.toLocaleTimeString('tr-TR')}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Çevrimiçi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mesaj Bildirimi */}
        {message && (
          <div className={`bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-4 ${messageType === 'success' ? 'bg-green-50/80 border-green-200' : 'bg-red-50/80 border-red-200'}`}>
            <div className="flex items-center space-x-2">
              <i className={messageType === 'success' ? 'ri-check-circle-line text-green-500' : 'ri-error-warning-line text-red-500'}></i>
              <p className={messageType === 'success' ? 'font-medium text-green-700' : 'font-medium text-red-700'}>{message}</p>
            </div>
          </div>
        )}

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-calendar-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{istatistikler.toplam}</p>
                <p className="text-sm text-gray-600">Toplam</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min((istatistikler.toplam / 10) * 100, 100)}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Bu ay: {istatistikler.buAyToplam}</p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-time-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{istatistikler.beklemede}</p>
                <p className="text-sm text-gray-600">Beklemede</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${istatistikler.toplam > 0 ? (istatistikler.beklemede / istatistikler.toplam) * 100 : 0}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Değerlendirmede</p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-check-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{istatistikler.onaylandi}</p>
                <p className="text-sm text-gray-600">Onaylandı</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${istatistikler.toplam > 0 ? (istatistikler.onaylandi / istatistikler.toplam) * 100 : 0}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Kabul edildi</p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-check-double-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{istatistikler.tamamlandi}</p>
                <p className="text-sm text-gray-600">Tamamlandı</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${istatistikler.toplam > 0 ? (istatistikler.tamamlandi / istatistikler.toplam) * 100 : 0}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Gerçekleşti</p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-close-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{istatistikler.reddedildi}</p>
                <p className="text-sm text-gray-600">Reddedildi</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${istatistikler.toplam > 0 ? (istatistikler.reddedildi / istatistikler.toplam) * 100 : 0}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Uygun değil</p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-refresh-line text-white text-xl"></i>
              </div>
              <button onClick={refreshData} disabled={loading} className="text-right hover:scale-105 transition-transform cursor-pointer">
                <p className="text-2xl font-bold text-gray-900">
                  <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
                </p>
                <p className="text-sm text-gray-600">Yenile</p>
              </button>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full w-full animate-pulse"></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Güncel veriler</p>
          </div>
        </div>

        {/* Tab Sistemi */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-1">
              <button onClick={() => setActiveTab('gecmis')} className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 whitespace-nowrap cursor-pointer flex items-center space-x-2 ${activeTab === 'gecmis' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'}`}>
                <i className="ri-history-line"></i>
                <span>Randevu Geçmişi</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {randevuTalepleri.length}
                </span>
              </button>
              <button onClick={() => setActiveTab('yeni')} className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 whitespace-nowrap cursor-pointer flex items-center space-x-2 ${activeTab === 'yeni' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'}`}>
                <i className="ri-add-line"></i>
                <span>Yeni Randevu Talebi</span>
              </button>
            </div>

            {activeTab === 'gecmis' && (
              <div className="flex space-x-2">
                {durumlar.map((durum) => (
                  <button key={durum} onClick={() => setSelectedDurum(durum)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap cursor-pointer flex items-center space-x-1 ${selectedDurum === durum ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'}`}>
                    <span>{durum}</span>
                    {durum !== 'Tümü' && (
                      <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                        {randevuTalepleri.filter(r => r.Durum === durum).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tab İçeriği */}
          {activeTab === 'gecmis' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Randevu Geçmişi ({filteredRandevuTalepleri.length})
                </h2>
                {istatistikler.sonRandevuTarihi && (
                  <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                    Son randevu: {formatDate(istatistikler.sonRandevuTarihi)}
                  </div>
                )}
              </div>

              {filteredRandevuTalepleri.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-calendar-line text-gray-400 text-3xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedDurum === 'Tümü' ? 'Henüz randevu talebiniz bulunmamaktadır' : `${selectedDurum} durumunda randevu bulunamadı`}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Uzmanlarımızla görüşme talep etmek için yeni randevu talebi oluşturun.
                  </p>
                  <button onClick={() => setActiveTab('yeni')} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg">
                    İlk Randevu Talebinizi Oluşturun
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredRandevuTalepleri.map((randevu) => (
                    <div key={randevu.ID} className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/20 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-6">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {randevu.Konu}
                            </h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDurumBadge(randevu.Durum)} transition-all duration-300 group-hover:scale-105`}>
                              <i className={`${getDurumIcon(randevu.Durum)} mr-1`}></i>
                              {randevu.Durum}
                            </span>
                          </div>

                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{randevu.Mesaj}</p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <i className="ri-calendar-line text-blue-500"></i>
                              <span>
                                <strong>Tercih:</strong> {formatDateTime(randevu.TercihEdilenTarihSaat1)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <i className="ri-time-line text-gray-500"></i>
                              <span>
                                <strong>Talep:</strong> {formatDate(randevu.TalepTarihi)}
                              </span>
                            </div>
                            {randevu.PersonelAdı && (
                              <div className="flex items-center space-x-2">
                                <i className="ri-user-line text-green-500"></i>
                                <span>
                                  <strong>Danışman:</strong> {randevu.PersonelAdı}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2">
                          <button onClick={() => handleShowDetail(randevu)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:scale-105 transition-all duration-300 text-sm whitespace-nowrap cursor-pointer shadow-lg group-hover:shadow-xl">
                            <i className="ri-eye-line mr-2"></i>
                            Detayları Gör
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'yeni' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <i className="ri-calendar-check-line text-white text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Yeni Randevu Talebi</h2>
                  <p className="text-gray-600 text-sm">Uzmanlarımızla görüşme talep etmek için formu doldurun</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="konu" className="block text-sm font-medium text-gray-700 mb-2">
                    Randevu Konusu <span className="text-red-500">*</span>
                  </label>
                  <input type="text" id="konu" value={formData.konu} onChange={(e) => setFormData(prev => ({ ...prev, konu: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-300" placeholder="Randevu konusunu kısaca belirtin (örn: İhracat Danışmanlığı)" required maxLength={100} />
                  <p className="text-xs text-gray-500 mt-1">{formData.konu.length}/100 karakter</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="tercihEdilenTarihSaat1" className="block text-sm font-medium text-gray-700 mb-2">
                      1. Tercih Tarihi <span className="text-red-500">*</span>
                    </label>
                    <input type="datetime-local" id="tercihEdilenTarihSaat1" value={formData.tercihEdilenTarihSaat1} onChange={(e) => setFormData(prev => ({ ...prev, tercihEdilenTarihSaat1: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-300" min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)} required />
                  </div>

                  <div>
                    <label htmlFor="tercihEdilenTarihSaat2" className="block text-sm font-medium text-gray-700 mb-2">
                      2. Tercih Tarihi <span className="text-gray-400">(İsteğe bağlı)</span>
                    </label>
                    <input type="datetime-local" id="tercihEdilenTarihSaat2" value={formData.tercihEdilenTarihSaat2} onChange={(e) => setFormData(prev => ({ ...prev, tercihEdilenTarihSaat2: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-300" min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)} />
                  </div>

                  <div>
                    <label htmlFor="tercihEdilenTarihSaat3" className="block text-sm font-medium text-gray-700 mb-2">
                      3. Tercih Tarihi <span className="text-gray-400">(İsteğe bağlı)</span>
                    </label>
                    <input type="datetime-local" id="tercihEdilenTarihSaat3" value={formData.tercihEdilenTarihSaat3} onChange={(e) => setFormData(prev => ({ ...prev, tercihEdilenTarihSaat3: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-300" min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)} />
                  </div>
                </div>

                <div>
                  <label htmlFor="mesaj" className="block text-sm font-medium text-gray-700 mb-2">
                    Detaylı Açıklama <span className="text-red-500">*</span>
                  </label>
                  <textarea id="mesaj" value={formData.mesaj} onChange={(e) => setFormData(prev => ({ ...prev, mesaj: e.target.value }))} rows={6} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none transition-all duration-300" placeholder="Randevu ile ilgili detaylı açıklama yazın... (görüşmek istediğiniz konular, sorularınız vb.)" required maxLength={500} />
                  <p className="text-xs text-gray-500 mt-1">{formData.mesaj.length}/500 karakter</p>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button type="button" onClick={() => setActiveTab('gecmis')} className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:scale-105 transition-all duration-300 whitespace-nowrap cursor-pointer">
                    <i className="ri-arrow-left-line mr-2"></i>
                    Geçmişe Dön
                  </button>
                  <button type="submit" disabled={submitLoading} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg">
                    {submitLoading ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        <span>Gönderiliyor...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-line"></i>
                        <span>Randevu Talebi Gönder</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Detay Modal */}
        {showDetailModal && selectedRandevu && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <i className="ri-calendar-check-line text-white text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Randevu Detayları</h3>
                    <p className="text-gray-600">ID: #{selectedRandevu.ID}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 hover:scale-110 flex items-center justify-center transition-all duration-300 cursor-pointer">
                  <i className="ri-close-line text-gray-600 text-xl"></i>
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-semibold text-gray-900">{selectedRandevu.Konu}</h4>
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getDurumBadge(selectedRandevu.Durum)}`}>
                      <i className={`${getDurumIcon(selectedRandevu.Durum)} mr-2`}></i>
                      {selectedRandevu.Durum}
                    </span>
                  </div>
                  <div className="prose prose-sm text-gray-700">
                    <p className="whitespace-pre-wrap">{selectedRandevu.Mesaj}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50">
                      <div className="flex items-center space-x-2 mb-2">
                        <i className="ri-calendar-line text-blue-600"></i>
                        <span className="font-medium text-blue-900">Tercih Edilen Tarihler</span>
                      </div>
                      <div className="space-y-2 text-blue-800">
                        <div className="flex items-center space-x-2">
                          <span className="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">1. Tercih</span>
                          <span>{formatDateTime(selectedRandevu.TercihEdilenTarihSaat1)}</span>
                        </div>
                        {selectedRandevu.TercihEdilenTarihSaat2 && (
                          <div className="flex items-center space-x-2">
                            <span className="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">2. Tercih</span>
                            <span>{formatDateTime(selectedRandevu.TercihEdilenTarihSaat2)}</span>
                          </div>
                        )}
                        {selectedRandevu.TercihEdilenTarihSaat3 && (
                          <div className="flex items-center space-x-2">
                            <span className="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-medium">3. Tercih</span>
                            <span>{formatDateTime(selectedRandevu.TercihEdilenTarihSaat3)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
                      <div className="flex items-center space-x-2 mb-2">
                        <i className="ri-time-line text-gray-600"></i>
                        <span className="font-medium text-gray-900">Talep Bilgisi</span>
                      </div>
                      <p className="text-gray-800">
                        <span className="font-medium">Talep Tarihi:</span> {formatDateTime(selectedRandevu.TalepTarihi)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedRandevu.PersonelAdı && (
                      <div className="bg-green-50/80 backdrop-blur-sm rounded-xl p-4 border border-green-200/50">
                        <div className="flex items-center space-x-2 mb-2">
                          <i className="ri-user-line text-green-600"></i>
                          <span className="font-medium text-green-900">Atanan Uzman</span>
                        </div>
                        <p className="text-green-800 font-medium">{selectedRandevu.PersonelAdı}</p>
                      </div>
                    )}

                    {selectedRandevu.GerceklesenTarihSaat && (
                      <div className="bg-purple-50/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200/50">
                        <div className="flex items-center space-x-2 mb-2">
                          <i className="ri-check-double-line text-purple-600"></i>
                          <span className="font-medium text-purple-900">Gerçekleşen Randevu</span>
                        </div>
                        <p className="text-purple-800 font-medium">
                          {formatDateTime(selectedRandevu.GerceklesenTarihSaat)}
                        </p>
                      </div>
                    )}

                    {selectedRandevu.AdminNotu && (
                      <div className="bg-orange-50/80 backdrop-blur-sm rounded-xl p-4 border border-orange-200/50">
                        <div className="flex items-center space-x-2 mb-2">
                          <i className="ri-file-text-line text-orange-600"></i>
                          <span className="font-medium text-orange-900">Admin Notu</span>
                        </div>
                        <p className="text-orange-800 whitespace-pre-wrap">{selectedRandevu.AdminNotu}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <i className="ri-information-line text-blue-600 mr-2"></i>
                    Durum Açıklaması
                  </h4>
                  <div className="text-gray-700">
                    {selectedRandevu.Durum === 'Beklemede' && (
                      <div className="flex items-start space-x-3">
                        <i className="ri-time-line text-yellow-600 text-lg mt-0.5"></i>
                        <div>
                          <p className="font-medium text-yellow-800 mb-1">Değerlendirme Aşamasında</p>
                          <p className="text-yellow-700">Randevu talebiniz uzmanlarımız tarafından incelenmektedir. En kısa sürede size dönüş yapılacaktır.</p>
                        </div>
                      </div>
                    )}
                    {selectedRandevu.Durum === 'Onaylandı' && (
                      <div className="flex items-start space-x-3">
                        <i className="ri-check-line text-green-600 text-lg mt-0.5"></i>
                        <div>
                          <p className="font-medium text-green-800 mb-1">Randevu Onaylandı</p>
                          <p className="text-green-700">Randevu talebiniz kabul edildi. Atanan uzmanımız sizinle iletişime geçecektir.</p>
                        </div>
                      </div>
                    )}
                    {selectedRandevu.Durum === 'Tamamlandı' && (
                      <div className="flex items-start space-x-3">
                        <i className="ri-check-double-line text-blue-600 text-lg mt-0.5"></i>
                        <div>
                          <p className="font-medium text-blue-800 mb-1">Randevu Tamamlandı</p>
                          <p className="text-blue-700">Randevunuz başarıyla gerçekleştirildi. Ek sorularınız varsa yeni randevu talebi oluşturabilirsiniz.</p>
                        </div>
                      </div>
                    )}
                    {selectedRandevu.Durum === 'Reddedildi' && (
                      <div className="flex items-start space-x-3">
                        <i className="ri-close-line text-red-600 text-lg mt-0.5"></i>
                        <div>
                          <p className="font-medium text-red-800 mb-1">Randevu Reddedildi</p>
                          <p className="text-red-700">Randevu talebiniz uygun görülmedi. Admin notunu inceleyerek yeni bir talep oluşturabilirsiniz.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-8 space-x-3 pt-6 border-t border-gray-200">
                <button onClick={() => setShowDetailModal(false)} className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:scale-105 transition-all duration-300 whitespace-nowrap cursor-pointer">
                  Kapat
                </button>
                {selectedRandevu.Durum === 'Reddedildi' && (
                  <button onClick={() => {
                    setShowDetailModal(false);
                    setActiveTab('yeni');
                  }} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:scale-105 transition-all duration-300 whitespace-nowrap cursor-pointer shadow-lg">
                    <i className="ri-add-line mr-2"></i>
                    Yeni Randevu Talebi
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Başarı Mesajı */}
        <div className="text-center py-8">
          <div className="bg-green-100/80 backdrop-blur-sm border border-green-400 text-green-700 px-4 py-3 rounded-xl inline-block">
            <strong>📅 Randevu Talepleri</strong> Uzmanlarımızla görüşme taleplerini buradan yönetebilirsiniz.
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
