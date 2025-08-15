
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

interface ForumKonuClientProps {
  konuId: string;
}

export default function ForumKonuClient({ konuId }: ForumKonuClientProps) {
  const [isFirmaLoggedIn, setIsFirmaLoggedIn] = useState(false);
  const [firmaEmail, setFirmaEmail] = useState('');
  const [firmaAdi, setFirmaAdi] = useState('');
  const [firmaId, setFirmaId] = useState<number>(0);
  const [konu, setKonu] = useState<ForumKonu | null>(null);
  const [cevaplar, setCevaplar] = useState<ForumCevap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCevaplar, setLoadingCevaplar] = useState(false);
  const [yeniCevap, setYeniCevap] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  const menuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/dashboard' },
    { icon: 'ri-user-line', label: 'Firma Profil', href: '/firma-profil' },
    { icon: 'ri-project-line', label: 'Projelerim', href: '/projelerim' },
    { icon: 'ri-graduation-cap-line', label: 'Eğitimlerim', href: '/egitimlerim' },
    { icon: 'ri-calendar-event-line', label: 'Etkinlikler', href: '/etkinlikler' },
    { icon: 'ri-calendar-check-line', label: 'Randevu Talebi', href: '/randevu-talebi' },
    { icon: 'ri-discuss-line', label: 'Forum', href: '/forum' },
    { icon: 'ri-file-text-line', label: 'Dönem Raporları', href: '/donem-raporlari' },
    { icon: 'ri-customer-service-line', label: 'Destek Merkezi', href: '/destek-merkezi' }
  ];

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn');
    const email = localStorage.getItem('firmaEmail');
    const adi = localStorage.getItem('firmaAdi');
    const id = localStorage.getItem('firmaId');

    if (!loggedIn || loggedIn !== 'true') {
      router.push('/login');
      return;
    }

    setIsFirmaLoggedIn(true);
    setFirmaEmail(email || '');
    setFirmaAdi(adi || '');
    setFirmaId(parseInt(id || '0'));

    console.log('💬 Forum detay başlatılıyor:', {
      konuId,
      firmaId: parseInt(id || '0'),
      firmaAdi: adi,
      timestamp: new Date().toISOString()
    });

    loadKonuDetay();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [konuId, router]);

  const loadKonuDetay = async () => {
    try {
      console.log('💬 Konu detayı yükleniyor...', {
        konuId,
        firmaId,
        timestamp: new Date().toISOString()
      });

      setLoading(true);
      setMessage('');
      const konuIdNum = parseInt(konuId);
      if (isNaN(konuIdNum) || konuIdNum <= 0) {
        console.error('💬 Geçersiz konu ID:', konuId);
        setMessage(`Geçersiz konu ID: ${konuId}`);
        setLoading(false);
        return;
      }

      try {
        const konuData = await ForumService.getKonuDetay(konuIdNum);

        console.log('💬 Konu detayı sonucu:', {
          found: !!konuData,
          data: konuData ? {
            ID: konuData.ID,
            KonuBasligi: konuData.KonuBasligi,
            FirmaAdı: konuData.FirmaAdı,
            Durum: konuData.Durum
          } : 'BOŞ'
        });

        if (!konuData) {
          console.error('💬 Konu bulunamadı:', konuIdNum);
          setMessage(`ID ${konuIdNum} numaralı forum konusu bulunamadı.`);
          setKonu(null);
          setCevaplar([]);
          setLoading(false);
          return;
        }

        setKonu(konuData);
        console.log('💬 Konu detayı başarıyla ayarlandı');

        console.log('💬 Cevaplar alınıyor...');
        setLoadingCevaplar(true);

        try {
          const cevaplarData = await ForumService.getKonuCevapları(konuIdNum);

          console.log('💬 Cevaplar sonucu:', {
            count: cevaplarData?.length || 0,
            firstComment: cevaplarData?.[0] ? {
              ID: cevaplarData[0].ID,
              YazarAdı: cevaplarData[0].YazarAdı,
              YazarTipi: cevaplarData[0].YazarTipi,
              CevapMetni: cevaplarData[0].CevapMetni?.substring(0, 50) + '...'
            } : 'CEVAP_YOK'
          });

          setCevaplar(cevaplarData || []);
          console.log('💬 Cevaplar başarıyla ayarlandı');

        } catch (cevapError) {
          console.error('💬 Cevaplar yüklenirken hata:', cevapError);
          setCevaplar([]);
          setMessage('Cevaplar yüklenirken sorun oluştu, ancak konu görüntülenebilir.');
        } finally {
          setLoadingCevaplar(false);
        }

        console.log('💬 Tüm veri yükleme tamamlandı');

      } catch (dbError) {
        console.error('💬 Veritabanı hatası:', dbError);
        setMessage('Veri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
        setKonu(null);
        setCevaplar([]);
      }

    } catch (error) {
      console.error('💬 Konu detayı yükleme sistem hatası:', error);
      setMessage('Konu detayları yüklenirken beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('firmaEmail');
    localStorage.removeItem('firmaAdi');
    localStorage.removeItem('firmaId');
    router.push('/login');
  };

  const handleCevapGonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    console.log('💬 🔧 ENHANCED: Cevap gönderme başleniyor...', {
      konuId,
      firmaId,
      firmaAdi,
      cevapLength: yeniCevap.length,
      konuDurum: konu?.Durum,
      timestamp: new Date().toISOString()
    });

    // 🔧 ENHANCED Frontend Validation
    if (!yeniCevap.trim()) {
      setMessage('❌ Lütfen cevabınızı yazın.');
      return;
    }

    if (yeniCevap.length < 10) {
      setMessage('❌ Cevabınız en az 10 karakter olmalıdır.');
      return;
    }

    if (yeniCevap.length > 2000) {
      setMessage('❌ Cevabınız en fazla 2000 karakter olmalıdır.');
      return;
    }

    if (!firmaId || firmaId <= 0) {
      setMessage('❌ Giriş durumunuz doğrulanamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    if (konu?.Durum === 'Kilitli') {
      setMessage('❌ Bu konu kilitli olduğu için cevap yazamazsınız.');
      return;
    }

    if (!konu) {
      setMessage('❌ Konu bilgisi bulunamadı. Lütfen sayfayı yenileyin.');
      return;
    }

    setSubmitting(true);

    try {
      console.log('💬 🔧 ENHANCED: Supabase\'e cevap gönderiliyor...', {
        KonuID: parseInt(konuId),
        CevapYazanFirmaID: firmaId,
        CevapMetni: yeniCevap.substring(0, 100) + (yeniCevap.length > 100 ? '...' : ''),
        YazarAdı: firmaAdi
      });

      // 🔧 ENHANCED Supabase Call with Full Error Handling
      const success = await ForumService.createCevap({
        KonuID: parseInt(konuId),
        CevapYazanFirmaID: firmaId,
        CevapMetni: yeniCevap.trim()
      });

      console.log('💬 🔧 ENHANCED: Supabase kayıt sonucu:', success);

      if (success) {
        console.log('💬 ✅ Cevap başarıyla Supabase\'e kaydedildi');

        setYeniCevap('');
        setMessage('✅ Cevabınız başarıyla gönderildi! Sayfa yenileniyor...');

        console.log('💬 🔧 Sayfayı yenileme başlatılıyor...');

        // 🔧 ENHANCED Page Refresh Logic
        setTimeout(async () => {
          try {
            console.log('💬 🔧 Veri yenileme işlemi başlatılıyor...');

            setLoadingCevaplar(true);
            const freshCevaplar = await ForumService.getKonuCevapları(parseInt(konuId));

            console.log('💬 🔧 Yenilenmiş cevaplar:', {
              count: freshCevaplar?.length || 0,
              lastComment: freshCevaplar?.slice(-1)?.[0] ? {
                ID: freshCevaplar.slice(-1)[0].ID,
                YazarAdı: freshCevaplar.slice(-1)[0].YazarAdı,
                CevapMetni: freshCevaplar.slice(-1)[0].CevapMetni?.substring(0, 50) + '...'
              } : 'YENİ_CEVAP_YOK'
            });

            setCevaplar(freshCevaplar || []);
            setLoadingCevaplar(false);
            setMessage('✅ Cevabınız başarıyla eklendi ve görüntülendi!');

            // 3 saniye sonra mesajı temizle
            setTimeout(() => setMessage(''), 3000);

            console.log('💬 ✅ Cevaplar başarıyla yenilendi');

          } catch (refreshError: any) {
            console.error('💬 ❌ Cevaplar yenilenemedi:', refreshError);
            setLoadingCevaplar(false);
            setMessage('✅ Cevabınız kaydedildi ancak sayfa yenilenemedi. Lütfen manuel yenileyin.');
          }
        }, 1500);

      } else {
        console.error('💬 ❌ Cevap gönderme başarısız - Beklenmeyen false dönüşü');
        setMessage('❌ Cevap gönderilirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      }

    } catch (error: any) {
      console.error('💬 ❌ ENHANCED Cevap gönderme hatası:', {
        message: error?.message || 'Bilinmeyen hata',
        name: error?.name || 'Hata adı yok',
        stack: error?.stack || 'Stack yok',
        type: typeof error
      });

      // 🔧 ENHANCED User-Friendly Error Messages
      let userMessage = '❌ Cevap gönderilirken beklenmeyen bir hata oluştu.';

      if (error?.message) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes('foreign key constraint')) {
          userMessage = '❌ Kullanıcı bilgilerinizde sorun var. Lütfen çıkış yapıp tekrar giriş yapın.';
        } else if (errorMsg.includes('firma bulunamadı')) {
          userMessage = '❌ Hesabınız sistemde bulunamadı. Lütfen yöneticiye başvurun.';
        } else if (errorMsg.includes('konu bulunamadı') || errorMsg.includes('konu mevcut değil')) {
          userMessage = '❌ Bu forum konusu artık mevcut değil. Lütfen sayfayı yenileyin.';
        } else if (errorMsg.includes('konu kilitli') || errorMsg.includes('kilitli olduğu için')) {
          userMessage = '❌ Bu konu kilitli olduğu için cevap yazamazsınız.';
        } else if (errorMsg.includes('izin reddedildi') || errorMsg.includes('permission')) {
          userMessage = '❌ Cevap yazma yetkiniz bulunmuyor. Lütfen yöneticiye başvurun.';
        } else if (errorMsg.includes('en az 10 karakter')) {
          userMessage = '❌ Cevabınız en az 10 karakter olmalıdır.';
        } else if (errorMsg.includes('hesabınız aktif değil')) {
          userMessage = '❌ Hesabınız aktif değil. Lütfen yöneticiye başvurun.';
        } else if (errorMsg.includes('veritabanı bağlantısı')) {
          userMessage = '❌ Veritabanı bağlantı sorunu. Lütfen daha sonra tekrar deneyin.';
        } else {
          userMessage = `❌ ${error.message}`;
        }
      }

      setMessage(userMessage);

      // 5 saniye sonra hata mesajını temizle
      setTimeout(() => {
        if (message.includes('❌')) {
          setMessage('');
        }
      }, 5000);

    } finally {
      setSubmitting(false);
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
    try {
      return new Date(tarih).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('💬 Tarih formatlama hatası:', error);
      return 'Tarih bilinmiyor';
    }
  };

  if (!isFirmaLoggedIn || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Forum konusu yükleniyor...' : 'Yükleniyor...'}
          </p>
          <div className="text-xs text-gray-400 mt-2">
            Konu ID: {konuId} | Firma ID: {firmaId}
          </div>
        </div>
      </div>
    );
  }

  if (!konu) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col`}>
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <i className="ri-dashboard-line text-white text-xl"></i>
                </div>
                {sidebarOpen && (
                  <div>
                    <h1 className="text-xl font-bold text-white font-[\'Pacifico\']">
                      logo
                    </h1>
                    <p className="text-xs text-slate-300">E-İhracat Platformu</p>
                  </div>
                )}
              </Link>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors cursor-pointer"
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
                className="flex items-center px-6 py-3 text-sm font-medium transition-all duration-200 group text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 bg-slate-700 group-hover:bg-slate-600">
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
                  <p className="text-sm font-medium text-white truncate">{firmaAdi}</p>
                  <p className="text-xs text-slate-300 truncate">{firmaEmail}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="w-full mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                Çıkış Yap
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Forum Konusu</h1>
                <p className="text-gray-600 mt-1">Konu bulunamadı</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Konu ID</div>
                  <div className="text-lg font-semibold text-gray-900">{konuId}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Konu Bulunamadı</span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="ri-error-warning-line text-red-500 text-4xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Konu Bulunamadı</h3>
              <p className="text-gray-600 mb-2">
                ID: {konuId} numaralı forum konusu bulunamadı veya silinmiş.
              </p>
              <div className="bg-gray-100 rounded-lg p-4 mb-6 text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Konu ID:</span>
                  <span className="font-mono text-gray-900">{konuId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Firma ID:</span>
                  <span className="font-mono text-gray-900">{firmaId}</span>
                </div>
              </div>
              {message && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{message}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/forum"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  Forum'a Dön
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-refresh-line mr-2"></i>
                  Sayfayı Yenile
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col`}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i className="ri-dashboard-line text-white text-xl"></i>
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-xl font-bold text-white font-[\'Pacifico\']">
                    logo
                  </h1>
                  <p className="text-xs text-slate-300">E-İhracat Platformu</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors cursor-pointer"
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
              className={`flex items-center px-6 py-3 text-sm font-medium transition-all duration-200 group ${item.href === '/forum' || item.href.includes('forum') ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-r-4 border-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-700'} cursor-pointer`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${item.href === '/forum' || item.href.includes('forum') ? 'bg-white/20' : 'bg-slate-700 group-hover:bg-slate-600'}`}
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
                <p className="text-sm font-medium text-white truncate">{firmaAdi}</p>
                <p className="text-xs text-slate-300 truncate">{firmaEmail}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="w-full mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              Çıkış Yap
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Forum Konusu</h1>
              <p className="text-gray-600 mt-1">Konu detayını görüntüleyin ve cevap yazın</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right text-xs">
                <div className="text-gray-500">Debug Bilgisi</div>
                <div className="font-mono text-gray-700">
                  Konu: {konuId} | Firma ID: {firmaId}
                </div>
              </div>
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
        </header>

        <main className="flex-1 p-8">
          <div className="mb-6">
            <Link
              href="/forum"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Forum'a Dön
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getKategoriColor(konu.Kategori)}`}>
                    {konu.Kategori}
                  </span>
                  {konu.Durum === 'Kilitli' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      <i className="ri-lock-line mr-1"></i>Kilitli
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    ID: {konu.ID}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{konu.KonuBasligi}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 flex-wrap">
                  <span className="flex items-center">
                    <i className="ri-user-line mr-1"></i>
                    {konu.FirmaAdı}
                  </span>
                  <span className="flex items-center">
                    <i className="ri-calendar-line mr-1"></i>
                    {formatTarih(konu.OlusturmaTarihi)}
                  </span>
                  <span className="flex items-center">
                    <i className="ri-chat-1-line mr-1"></i>
                    {cevaplar.length} cevap
                  </span>
                  {konu.SonMesajTarihi && (
                    <span className="flex items-center">
                      <i className="ri-time-line mr-1"></i>
                      Son: {formatTarih(konu.SonMesajTarihi)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.includes('başarıyla') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center">
                <i className={`${message.includes('başarıyla') ? 'ri-check-line text-green-600' : 'ri-error-warning-line text-red-600'} mr-2`}></i>
                <p className={`text-sm ${message.includes('başarıyla') ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8">
            {loadingCevaplar ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Cevaplar yükleniyor...</p>
              </div>
            ) : cevaplar.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-chat-1-line text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz cevap yok</h3>
                <p className="text-gray-600">Bu konuya ilk cevabı siz verin!</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Cevaplar ({cevaplar.length})
                  </h2>
                  <button
                    onClick={() => loadKonuDetay()}
                    className="text-blue-600 hover:text-blue-700 text-sm cursor-pointer flex items-center"
                  >
                    <i className="ri-refresh-line mr-1"></i>
                    Yenile
                  </button>
                </div>
                {cevaplar.map((cevap, index) => (
                  <div key={cevap.ID} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className={`${cevap.YazarTipi === 'Personel' ? 'ri-shield-user-line' : 'ri-building-line'} text-blue-600`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{cevap.YazarAdı}</h3>
                          {cevap.YazarTipi === 'Personel' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              Uzman
                            </span>
                          )}
                          {index === 0 && cevap.CevapYazanFirmaID === konu.KonuAcanFirmaID && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Konu Sahibi
                            </span>
                          )}
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            #{cevap.ID}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3 whitespace-pre-wrap break-words">
                          {cevap.CevapMetni}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <i className="ri-time-line mr-1"></i>
                            {formatTarih(cevap.CevapTarihi)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {cevap.YazarTipi} • {cevap.CevapYazanFirmaID ? `Firma ID: ${cevap.CevapYazanFirmaID}` : `Personel ID: ${cevap.CevapYazanPersonelID}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {konu.Durum === 'Açık' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="ri-user-line text-blue-600"></i>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Cevap Yaz</h2>
                  <p className="text-sm text-gray-600">
                    {firmaAdi} (ID: {firmaId}) olarak cevap yazıyorsunuz
                  </p>
                </div>
              </div>

              <form onSubmit={handleCevapGonder} className="space-y-4">
                <div>
                  <textarea
                    value={yeniCevap}
                    onChange={(e) => setYeniCevap(e.target.value)}
                    rows={6}
                    maxLength={2000}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    placeholder="Cevabınızı buraya yazın... (En az 10 karakter)"
                    disabled={submitting}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className={yeniCevap.length >= 10 ? 'text-green-600' : 'text-red-500'}>
                        {yeniCevap.length}/2000 karakter
                      </span>
                      <span className={yeniCevap.length >= 10 ? 'text-green-600' : 'text-red-500'}>
                        {yeniCevap.length >= 10 ? '✓ Yeterli' : '⚠ Min 10 karakter'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Konu ID: {konuId} | Firma ID: {firmaId}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setYeniCevap('')}
                    disabled={submitting || !yeniCevap.trim()}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                  >
                    Temizle
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !yeniCevap.trim() || yeniCevap.length < 10}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center space-x-2"
                  >
                    {submitting ? (
                      <div>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Gönderiliyor...</span>
                      </div>
                    ) : (
                      <div>
                        <i className="ri-send-plane-line"></i>
                        <span>Cevap Gönder</span>
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-lock-line text-red-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Konu Kilitli</h3>
              <p className="text-red-600">Bu konu kilitli olduğu için yeni cevap yazamazsınız.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
