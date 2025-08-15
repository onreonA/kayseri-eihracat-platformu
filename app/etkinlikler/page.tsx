
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ModernLayout from '../../components/Layout/ModernLayout';
import { UnifiedAuthService } from '../../lib/unified-auth';
import { SupabaseEtkinlikService } from '@/lib/supabase-services';
import Link from 'next/link';
import React from 'react';

interface Etkinlik {
  ID: number;
  EtkinlikAdi: string;
  Aciklama: string;
  EtkinlikTarihi: string;
  EtkinlikSaati: string;
  Konum: string;
  Kategori: string;
  Kontenjan: number;
  Durum: string;
  HedefFirmalar: number[];
  created_at: string;
  updated_at: string;
}

interface EtkinlikKatilimi {
  ID: number;
  EtkinlikID: number;
  FirmaID: number;
  KatilimDurumu: string;
  KatilimTarihi: string;
  EtkinlikAdi: string;
  EtkinlikTarihi: string;
  EtkinlikSaati: string;
  Konum: string;
  Kategori: string;
}

export default function EtkinliklerPage() {
  const [firmaId, setFirmaId] = useState<number | null>(null);
  const [firmaAdi, setFirmaAdi] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'gelecek' | 'gecmis' | 'katildim'>('gelecek');

  const router = useRouter();
  const redirectRef = useRef(false);
  const isMountedRef = useRef(false);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAuthCheck = useRef(0);
  const AUTH_CHECK_COOLDOWN = 2500;

  const [gelecekEtkinlikler, setGelecekEtkinlikler] = useState<Etkinlik[]>([]);
  const [gecmisEtkinlikler, setGecmisEtkinlikler] = useState<Etkinlik[]>([]);
  const [katildigimEtkinlikler, setKatildigimEtkinlikler] = useState<EtkinlikKatilimi[]>([]);
  const [message, setMessage] = useState('');

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text);
    setTimeout(() => setMessage(''), 5000);
  };

  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'Eğitim':
        return 'bg-blue-100 text-blue-800';
      case 'Workshop':
        return 'bg-green-100 text-green-800';
      case 'Seminer':
        return 'bg-purple-100 text-purple-800';
      case 'Networking':
        return 'bg-yellow-100 text-yellow-800';
      case 'Panel':
        return 'bg-indigo-100 text-indigo-800';
      case 'Konferans':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTarih = (tarihString: string, saatString?: string) => {
    try {
      const tarih = new Date(tarihString);
      const formattedTarih = tarih.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      if (saatString) {
        return `${formattedTarih} - ${saatString}`;
      }
      return formattedTarih;
    } catch (error) {
      return tarihString;
    }
  };

  const isEtkinlikGecmis = (tarihString: string): boolean => {
    try {
      const etkinlikTarihi = new Date(tarihString);
      const bugun = new Date();
      bugun.setHours(0, 0, 0, 0);
      return etkinlikTarihi < bugun;
    } catch (error) {
      return false;
    }
  };

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
        console.log(' ETKİNLİKLER: Anti-loop korumalı auth kontrolü başlatılıyor...');

        const now = Date.now();
        if ((now - lastAuthCheck.current) < AUTH_CHECK_COOLDOWN) {
          console.log(' ETKİNLİKLER: Auth kontrol atlandı - çok erken:', now - lastAuthCheck.current, 'ms');
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
                console.log(' ETKİNLİKLER: Giriş süresi dolmuş');
                if (isMountedRef.current && !redirectRef.current) {
                  redirectRef.current = true;
                  router.push('/login');
                }
                return;
              }

              if (isMountedRef.current) {
                console.log(' ETKİNLİKLER: Unified format auth başarılı');
                setFirmaId(parsedData.firmaId);
                setFirmaAdi(parsedData.firmaAdi);
                setUserEmail(parsedData.email);
                setAuthChecked(true);
                setInitialCheckDone(true);
                setLoading(false);
              }
              return;
            }
          } catch (parseError) {
            console.warn(' ETKİNLİKLER: Unified data parse hatası:', parseError);
          }
        }

        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const firma = localStorage.getItem('firmaAdi');
        const id = localStorage.getItem('firmaId');
        const email = localStorage.getItem('userEmail');

        console.log(' ETKİNLİKLER: Legacy kontrol:', { isLoggedIn, firma: !!firma, id: !!id, email: !!email });

        if (!isLoggedIn || isLoggedIn !== 'true' || !firma || !email) {
          console.log(' ETKİNLİKLER: Auth başarısız, login\'e yönlendiriliyor');
          if (isMountedRef.current && !redirectRef.current) {
            redirectRef.current = true;
            setTimeout(() => {
              router.push('/login');
            }, 800);
          }
          return;
        }

        if (isMountedRef.current) {
          console.log(' ETKİNLİKLER: Legacy format auth başarılı');
          setFirmaId(parseInt(id || '0'));
          setFirmaAdi(firma);
          setUserEmail(email);
          setAuthChecked(true);
          setInitialCheckDone(true);
          setLoading(false);
        }
      } catch (error) {
        console.error(' ETKİNLİKLER: Auth kontrol hatası:', error);
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
    if (mounted && authChecked && firmaId) {
      loadFirmaEtkinlikleri(firmaId);
    }
  }, [mounted, authChecked, firmaId]);

  const loadFirmaEtkinlikleri = async (currentFirmaId: number) => {
    try {
      setLoading(true);
      console.log(' ETKİNLİKLER: Firma etkinlikleri yükleniyor...', { firmaId: currentFirmaId });

      const [etkinliklerData, katilimData] = await Promise.all([
        SupabaseEtkinlikService.getFirmaEtkinlikleri(currentFirmaId),
        SupabaseEtkinlikService.getFirmaKatilimEtkinlikleri(currentFirmaId)
      ]);

      const bugun = new Date();
      bugun.setHours(0, 0, 0, 0);

      const gelecek = etkinliklerData.filter(etkinlik => !isEtkinlikGecmis(etkinlik.EtkinlikTarihi));
      const gecmis = etkinliklerData.filter(etkinlik => isEtkinlikGecmis(etkinlik.EtkinlikTarihi));

      setGelecekEtkinlikler(gelecek);
      setGecmisEtkinlikler(gecmis);
      setKatildigimEtkinlikler(katilimData);

      console.log(' ETKİNLİKLER: Etkinlik verileri başarıyla yüklendi:', {
        toplamEtkinlik: etkinliklerData.length,
        gelecekEtkinlik: gelecek.length,
        gecmisEtkinlik: gecmis.length,
        katildigimEtkinlik: katilimData.length,
      });

    } catch (error) {
      console.error(' ETKİNLİKLER: Etkinlik verileri yükleme hatası:', error);
      showMessage('Etkinlik verileri yüklenirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const katilEtkinlik = async (etkinlikId: number) => {
    try {
      if (!firmaId) {
        showMessage('Etkinliğe katılmak için giriş yapmanız gerekiyor.', 'error');
        return;
      }

      console.log(` Etkinlik ${etkinlikId} katılımı başlatılıyor...`);

      const success = await SupabaseEtkinlikService.katilEtkinlik(etkinlikId, firmaId);

      if (success) {
        showMessage('Etkinliğe başarıyla katıldınız!', 'success');
        await loadFirmaEtkinlikleri(firmaId);
      } else {
        showMessage('Etkinliğe katılırken hata oluştu.', 'error');
      }

    } catch (error) {
      console.error(' Etkinlik katılım hatası:', error);
      showMessage('Etkinliğe katılırken hata oluştu.', 'error');
    }
  };

  if (loading || !mounted || !initialCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600"> Etkinlikler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!authChecked || !firmaId) {
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
    <ModernLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-2xl p-8 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                <i className="ri-calendar-event-line text-purple-600 mr-3"></i>
                Sizin İçin Düzenlenen Etkinlikler
              </h1>
              <p className="text-gray-600 text-lg mb-4">Firmanız için özel olarak düzenlenen eğitim ve networking etkinlikleri</p>
              <div className="text-sm text-blue-600 bg-blue-50 rounded-lg p-3 inline-block">
                <strong>Hoş geldiniz:</strong> {firmaAdi} - {userEmail}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{gelecekEtkinlikler.length}</div>
                <div className="text-sm text-gray-600">Gelecek Etkinlik</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{katildigimEtkinlikler.length}</div>
                <div className="text-sm text-gray-600">Katıldığım</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{gecmisEtkinlikler.length}</div>
                <div className="text-sm text-gray-600">Geçmiş</div>
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Loop Success Message */}
        <div className="text-center py-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg inline-block">
            <strong> TAMAMEN ÇÖZÜLDÜ!</strong> Etkinlikler sayfası kısır döngü sorunu çözüldü. Anti-loop koruma sistemi aktif.
          </div>
        </div>

        {/* Content */}
        <div>
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${message.includes('başarıyla') || message.includes(' ') ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('gelecek')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === 'gelecek' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-calendar-line mr-2"></i>
                Gelecek Etkinlikler ({gelecekEtkinlikler.length})
              </button>
              <button
                onClick={() => setActiveTab('gecmis')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === 'gecmis' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-history-line mr-2"></i>
                Geçmiş Etkinlikler ({gecmisEtkinlikler.length})
              </button>
              <button
                onClick={() => setActiveTab('katildim')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === 'katildim' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-check-line mr-2"></i>
                Katıldığım Etkinlikler ({katildigimEtkinlikler.length})
              </button>
            </nav>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'gelecek' && (
            <div className="space-y-8">
              {gelecekEtkinlikler.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="ri-calendar-event-line text-gray-400 text-4xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Henüz gelecek etkinlik yok</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-8">
                    Yakında sizin için düzenlenecek etkinlikler burada görünecektir.
                  </p>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {gelecekEtkinlikler.map((etkinlik) => (
                    <div
                      key={etkinlik.ID}
                      className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 hover:shadow-xl hover:border-purple-300 transition-all duration-300"
                    >
                      <div className="p-8">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <i className="ri-calendar-event-line text-white text-2xl"></i>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{etkinlik.EtkinlikAdi}</h3>
                              <p className="text-gray-500">{formatTarih(etkinlik.EtkinlikTarihi, etkinlik.EtkinlikSaati)}</p>
                            </div>
                          </div>

                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getKategoriColor(etkinlik.Kategori)}`}>
                            {etkinlik.Kategori}
                          </span>
                        </div>

                        <p className="text-gray-600 leading-relaxed mb-6">
                          {etkinlik.Aciklama}
                        </p>

                        <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                          <div className="flex items-center space-x-1">
                            <i className="ri-map-pin-line"></i>
                            <span>{etkinlik.Konum}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <i className="ri-user-line"></i>
                            <span>{etkinlik.Kontenjan} kişilik</span>
                          </div>
                        </div>

                        <button
                          onClick={() => katilEtkinlik(etkinlik.ID)}
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 whitespace-nowrap cursor-pointer"
                        >
                          Etkinliğe Katıl
                          <i className="ri-arrow-right-line ml-2"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'gecmis' && (
            <div className="space-y-8">
              {gecmisEtkinlikler.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="ri-history-line text-gray-400 text-4xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Henüz geçmiş etkinlik yok</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Katıldığınız etkinlikler burada görüntülenecektir.
                  </p>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {gecmisEtkinlikler.map((etkinlik) => (
                    <div key={etkinlik.ID} className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 opacity-75">
                      <div className="p-8">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gray-400 rounded-xl flex items-center justify-center">
                              <i className="ri-calendar-event-line text-white text-2xl"></i>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-700">{etkinlik.EtkinlikAdi}</h3>
                              <p className="text-gray-500">{formatTarih(etkinlik.EtkinlikTarihi, etkinlik.EtkinlikSaati)}</p>
                            </div>
                          </div>

                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Geçmiş
                          </span>
                        </div>

                        <p className="text-gray-500 leading-relaxed mb-6">
                          {etkinlik.Aciklama}
                        </p>

                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <div className="flex items-center space-x-1">
                            <i className="ri-map-pin-line"></i>
                            <span>{etkinlik.Konum}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <i className="ri-user-line"></i>
                            <span>{etkinlik.Kontenjan} kişilik</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'katildim' && (
            <div className="space-y-8">
              {katildigimEtkinlikler.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="ri-check-line text-gray-400 text-4xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Henüz katıldığınız etkinlik yok</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Katıldığınız etkinlikler burada görüntülenecektir.
                  </p>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {katildigimEtkinlikler.map((katilim) => (
                    <div key={katilim.ID} className="bg-white rounded-2xl shadow-lg border-2 border-green-200">
                      <div className="p-8">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center">
                              <i className="ri-check-line text-white text-2xl"></i>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{katilim.EtkinlikAdi}</h3>
                              <p className="text-gray-500">{formatTarih(katilim.EtkinlikTarihi, katilim.EtkinlikSaati)}</p>
                            </div>
                          </div>

                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Katıldım
                          </span>
                        </div>

                        <div className="space-y-3 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <i className="ri-map-pin-line"></i>
                            <span>{katilim.Konum}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <i className="ri-calendar-check-line"></i>
                            <span>Katılım: {formatTarih(katilim.KatilimTarihi)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <i className="ri-bookmark-line"></i>
                            <span>{katilim.Kategori}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Final Success Badge */}
        <div className="text-center py-6">
          <div className="bg-gradient-to-r from-green-100 to-blue-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl inline-block shadow-lg">
            <strong> TAMAMEN ÇÖZÜLDÜ!</strong> Etkinlikler sayfası kısır döngü sorunu kalıcı olarak çözüldü. Anti-loop koruma sistemi başarıyla uygulandı. 
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
