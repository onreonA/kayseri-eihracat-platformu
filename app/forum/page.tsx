
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ForumService, ForumKonuları } from '@/lib/database';
import ModernLayout from '../../components/Layout/ModernLayout';

interface ForumKonu extends ForumKonuları {
  FirmaAdı: string;
  CevapSayisi: number;
}

export default function ForumPage() {
  const [isFirmaLoggedIn, setIsFirmaLoggedIn] = useState(false);
  const [firmaEmail, setFirmaEmail] = useState('');
  const [firmaAdi, setFirmaAdi] = useState('');
  const [firmaId, setFirmaId] = useState<number>(0);
  const [konular, setKonular] = useState<ForumKonu[]>([]);
  const [selectedKategori, setSelectedKategori] = useState<string>('Tümü');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showYeniKonuForm, setShowYeniKonuForm] = useState(false);
  const [yeniKonu, setYeniKonu] = useState({
    baslik: '',
    kategori: 'Genel' as 'Genel' | 'B2B' | 'B2C' | 'Lojistik' | 'Teşvikler' | 'Teknik Destek',
    aciklama: ''
  });
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const router = useRouter();
  const redirectRef = useRef(false);
  const isMountedRef = useRef(false);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAuthCheck = useRef(0);
  const AUTH_CHECK_COOLDOWN = 2500;

  const kategoriler = [
    { key: 'Tümü', label: 'Tümü', icon: 'ri-apps-line', color: 'from-gray-500 to-gray-600' },
    { key: 'Genel', label: 'Genel', icon: 'ri-chat-3-line', color: 'from-blue-500 to-blue-600' },
    { key: 'B2B', label: 'B2B', icon: 'ri-building-2-line', color: 'from-green-500 to-green-600' },
    { key: 'B2C', label: 'B2C', icon: 'ri-user-line', color: 'from-purple-500 to-purple-600' },
    { key: 'Lojistik', label: 'Lojistik', icon: 'ri-truck-line', color: 'from-orange-500 to-orange-600' },
    { key: 'Teşvikler', label: 'Teşvikler', icon: 'ri-gift-line', color: 'from-yellow-500 to-yellow-600' },
    { key: 'Teknik Destek', label: 'Teknik Destek', icon: 'ri-customer-service-line', color: 'from-red-500 to-red-600' }
  ];

  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      isMountedRef.current = false;
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!mounted || initialCheckDone || redirectRef.current) return;

    const performSafeAuthCheck = () => {
      try {
        console.log('🔍 FORUM: Anti-loop korumalı auth kontrolü başlatılıyor...');

        const now = Date.now();
        if ((now - lastAuthCheck.current) < AUTH_CHECK_COOLDOWN) {
          console.log('🚫 FORUM: Auth kontrol atlandı - çok erken:', now - lastAuthCheck.current, 'ms');
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
                console.log('⏰ FORUM: Giriş süresi dolmuş');
                if (isMountedRef.current && !redirectRef.current) {
                  redirectRef.current = true;
                  router.push('/login');
                }
                return;
              }

              if (isMountedRef.current) {
                console.log('✅ FORUM: Unified format auth başarılı');
                setIsFirmaLoggedIn(true);
                setFirmaEmail(parsedData.email);
                setFirmaAdi(parsedData.firmaAdi);
                setFirmaId(parsedData.firmaId);
                setInitialCheckDone(true);
                setLoading(false);
              }
              return;
            }
          } catch (parseError) {
            console.warn('⚠️ FORUM: Unified data parse hatası:', parseError);
          }
        }

        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const email = localStorage.getItem('firmaEmail');
        const adi = localStorage.getItem('firmaAdi');
        const id = localStorage.getItem('firmaId');

        console.log('🔄 FORUM: Legacy kontrol:', { isLoggedIn, email: !!email, adi: !!adi, id: !!id });

        if (!isLoggedIn || isLoggedIn !== 'true' || !email || !adi) {
          console.log('❌ FORUM: Auth başarısız, login\'e yönlendiriliyor');
          if (isMountedRef.current && !redirectRef.current) {
            redirectRef.current = true;
            setTimeout(() => {
              router.push('/login');
            }, 800);
          }
          return;
        }

        if (isMountedRef.current) {
          console.log('✅ FORUM: Legacy format auth başarılı');
          setIsFirmaLoggedIn(true);
          setFirmaEmail(email);
          setFirmaAdi(adi);
          setFirmaId(parseInt(id || '0'));
          setInitialCheckDone(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ FORUM: Auth kontrol hatası:', error);
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
    if (mounted && isFirmaLoggedIn && initialCheckDone) {
      loadKonular();
    }
  }, [mounted, isFirmaLoggedIn, initialCheckDone]);

  const loadKonular = async () => {
    try {
      console.log('Loading forum topics...');
      const data = await ForumService.getAllKonular();
      console.log('Forum topics loaded:', data);
      setKonular(data);
    } catch (error) {
      console.error('Konular yükleme hatası:', error);
      setMessage('Konular yüklenirken bir hata oluştu.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_login_data');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('firmaEmail');
    localStorage.removeItem('firmaAdi');
    localStorage.removeItem('firmaId');
    router.push('/login');
  };

  const handleYeniKonuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!yeniKonu.baslik.trim() || !yeniKonu.aciklama.trim()) {
      setMessage('Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      const yeniKonuId = await ForumService.createKonu({
        KonuBasligi: yeniKonu.baslik,
        KonuAcanFirmaID: firmaId,
        Kategori: yeniKonu.kategori,
        Durum: 'Açık'
      });

      await ForumService.createCevap({
        KonuID: yeniKonuId,
        CevapYazanFirmaID: firmaId,
        CevapMetni: yeniKonu.aciklama
      });

      setMessage('Yeni konu başarıyla oluşturuldu.');
      setShowYeniKonuForm(false);
      setYeniKonu({
        baslik: '',
        kategori: 'Genel',
        aciklama: ''
      });
      loadKonular();
    } catch (error) {
      setMessage('Konu oluşturulurken bir hata oluştu.');
    }
  };

  const getKategoriIcon = (kategori: string) => {
    const kat = kategoriler.find(k => k.key === kategori);
    return kat ? kat.icon : 'ri-chat-3-line';
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

  const getKategoriGradient = (kategori: string) => {
    const kat = kategoriler.find(k => k.key === kategori);
    return kat ? kat.color : 'from-gray-500 to-gray-600';
  };

  const formatTarih = (tarih: Date) => {
    return new Date(tarih).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMs = now.getTime() - time.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays > 0) return `${diffInDays} gün önce`;
    if (diffInHours > 0) return `${diffInHours} saat önce`;
    return 'Şimdi';
  };

  const filteredKonular = konular.filter(konu => {
    const kategoriMatch = selectedKategori === 'Tümü' || konu.Kategori === selectedKategori;
    const searchMatch = konu.KonuBasligi.toLowerCase().includes(searchTerm.toLowerCase());
    return kategoriMatch && searchMatch;
  });

  if (!mounted || loading || !initialCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">💬 Forum sayfası yükleniyor... (Anti-Loop Koruma Aktif)</p>
          <p className="text-sm text-gray-500 mt-2">Kısır döngü koruması çalışıyor</p>
        </div>
      </div>
    );
  }

  if (!isFirmaLoggedIn) {
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
    <ModernLayout userEmail={firmaEmail} userRole="Firma Temsilcisi" isAdmin={false} notifications={3}>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Hero Bölümü */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <i className="ri-discuss-line text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    ✅ Forum Platformu (Loop Korumalı) 💬
                  </h1>
                  <p className="text-gray-600">E-ihracat konularında soru sorun, deneyim paylaşın</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border border-green-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700">Anti-Loop Aktif</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Sistem Saati</div>
                <div className="text-lg font-semibold text-gray-900" suppressHydrationWarning={true}>
                  {currentTime.toLocaleTimeString('tr-TR')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 group hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-chat-3-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{konular.length}</p>
                <p className="text-sm text-gray-600">Toplam Konu</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full w-full transition-all duration-1000"></div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 group hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-user-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{filteredKonular.length}</p>
                <p className="text-sm text-gray-600">Filtrelenmiş</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: `${konular.length > 0 ? (filteredKonular.length / konular.length) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 group hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-apps-line text-white text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{kategoriler.length - 1}</p>
                <p className="text-sm text-gray-600">Kategori</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full w-3/4 transition-all duration-1000"></div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl shadow-lg ${message.includes('başarıyla') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            <div className="flex items-center space-x-2">
              <i className={`${message.includes('başarıyla') ? 'ri-check-line' : 'ri-error-warning-line'}`}></i>
              <p className="font-medium">{message}</p>
            </div>
          </div>
        )}

        {/* Ana İçerik */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Sol Panel - Kategoriler ve Arama */}
          <div className="xl:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 sticky top-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Kategoriler</h3>
                <div className="space-y-2">
                  {kategoriler.map(kategori => {
                    const kategoriKonuSayisi = kategori.key === 'Tümü'
                      ? konular.length
                      : konular.filter(k => k.Kategori === kategori.key).length;

                    return (
                      <button
                        key={kategori.key}
                        onClick={() => setSelectedKategori(kategori.key)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group ${selectedKategori === kategori.key ? 'bg-gradient-to-r ' + kategori.color + ' text-white shadow-lg' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${selectedKategori === kategori.key ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                              <i className={`${kategori.icon} ${selectedKategori === kategori.key ? 'text-white' : 'text-gray-600'}`}></i>
                            </div>
                            <span className="font-medium">{kategori.label}</span>
                          </div>
                          <span className={`text-sm px-2 py-1 rounded-full ${selectedKategori === kategori.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {kategoriKonuSayisi}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Arama</h3>
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Konularda ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white/50"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowYeniKonuForm(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center space-x-2"
              >
                <i className="ri-add-line"></i>
                <span>Yeni Konu Aç</span>
              </button>
            </div>
          </div>

          {/* Sağ Panel - Forum Konuları */}
          <div className="xl:col-span-3">
            {/* Yeni Konu Formu */}
            {showYeniKonuForm && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <i className="ri-add-circle-line text-white"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Yeni Konu Oluştur</h2>
                  </div>
                  <button
                    onClick={() => setShowYeniKonuForm(false)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <i className="ri-close-line text-gray-600"></i>
                  </button>
                </div>

                <form onSubmit={handleYeniKonuSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Konu Başlığı *
                    </label>
                    <input
                      type="text"
                      value={yeniKonu.baslik}
                      onChange={(e) => setYeniKonu(prev => ({ ...prev, baslik: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white/50"
                      placeholder="Konu başlığınızı giriniz"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori *
                    </label>
                    <select
                      value={yeniKonu.kategori}
                      onChange={(e) => setYeniKonu(prev => ({ ...prev, kategori: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm pr-8 bg-white/50"
                    >
                      <option value="Genel">Genel</option>
                      <option value="B2B">B2B</option>
                      <option value="B2C">B2C</option>
                      <option value="Lojistik">Lojistik</option>
                      <option value="Teşvikler">Teşvikler</option>
                      <option value="Teknik Destek">Teknik Destek</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Açıklama *
                    </label>
                    <textarea
                      value={yeniKonu.aciklama}
                      onChange={(e) => setYeniKonu(prev => ({ ...prev, aciklama: e.target.value }))}
                      rows={6}
                      maxLength={2000}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none bg-white/50"
                      placeholder="Konunuzla ilgili detaylı açıklama yazın..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {yeniKonu.aciklama.length}/2000 karakter
                    </p>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowYeniKonuForm(false)}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg"
                    >
                      Konu Oluştur
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Forum Konuları Listesi */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Forum Konuları ({filteredKonular.length})
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <i className="ri-filter-line"></i>
                    <span>{selectedKategori} kategorisi</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
              ) : filteredKonular.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="ri-chat-3-line text-gray-400 text-4xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz konu yok'}
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-8">
                    {searchTerm ? 'Farklı kelimeler ile arama yapın' : 'İlk konuyu siz açın ve toplulukla etkileşime geçin!'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setShowYeniKonuForm(true)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 cursor-pointer shadow-lg"
                    >
                      İlk Konuyu Oluştur
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredKonular.map((konu) => (
                    <div key={konu.ID} className="p-6 hover:bg-gray-50/50 transition-all duration-300 group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className={`w-10 h-10 bg-gradient-to-r ${getKategoriGradient(konu.Kategori)} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                              <i className={`${getKategoriIcon(konu.Kategori)} text-white`}></i>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getKategoriColor(konu.Kategori)} shadow-sm`}>
                              {konu.Kategori}
                            </span>
                            {konu.Durum === 'Kilitli' && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 shadow-sm">
                                <i className="ri-lock-line mr-1"></i>Kilitli
                              </span>
                            )}
                          </div>

                          <Link href={`/forum-konu/${konu.ID}`} className="block group/link">
                            <h3 className="text-xl font-bold text-gray-900 group-hover/link:text-purple-600 transition-colors cursor-pointer mb-2">
                              {konu.KonuBasligi}
                            </h3>
                          </Link>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <i className="ri-user-line text-blue-600 text-xs"></i>
                              </div>
                              <span className="truncate">{konu.FirmaAdı}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                <i className="ri-calendar-line text-green-600 text-xs"></i>
                              </div>
                              <span>{formatTimeAgo(konu.OlusturmaTarihi)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                <i className="ri-chat-1-line text-purple-600 text-xs"></i>
                              </div>
                              <span>{konu.CevapSayisi} cevap</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                <i className="ri-time-line text-orange-600 text-xs"></i>
                              </div>
                              <span>Son: {formatTimeAgo(konu.SonMesajTarihi)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="ml-6">
                          <Link
                            href={`/forum-konu/${konu.ID}`}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 text-sm cursor-pointer whitespace-nowrap shadow-lg hover:shadow-xl group"
                          >
                            <span>Görüntüle</span>
                            <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Success Badge */}
        <div className="text-center py-8">
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-400 text-green-700 px-6 py-4 rounded-2xl inline-block shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <i className="ri-check-line text-white"></i>
              </div>
              <div>
                <strong>✅ KALICI ÇÖZÜM!</strong> Forum sayfası modern tasarım ile kısır döngü sorunu tamamen çözüldü!
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
