
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ModernLayout } from '../../components/Layout/ModernLayout';
import { UnifiedAuthService } from '../../lib/unified-auth';
import Link from 'next/link';
import React from 'react';
import { SupabaseEgitimService } from '@/lib/supabase-services';

interface EgitimSeti {
  id: number;
  set_adi: string;
  aciklama: string;
  kategori: string;
  durum: string;
  atanan_firmalar: number[];
  toplam_video_sayisi: number;
  toplam_sure: number;
  created_at: string;
  atanmis_mi?: boolean;
  kilitli?: boolean;
}

interface EgitimVideosu {
  id: number;
  egitim_set_id: number;
  video_adi: string;
  video_url: string;
  video_suresi: number;
  sira_no: number;
  aciklama: string;
  pdf_url?: string;
  durum: string;
  created_at: string;
}

interface EgitimDokumani {
  id: number;
  dokuman_adi: string;
  aciklama: string;
  kategori: string;
  dosya_url: string;
  dosya_boyutu: number;
  durum: string;
  created_at: string;
}

interface IlerlemeIstatistik {
  toplamVideoSayisi: number;
  izlenenVideoSayisi: number;
  ilerlemeYuzdesi: number;
  tamamlananSetSayisi: number;
  toplamSetSayisi: number;
}

export default function EgitimlerimPage() {
  const [firmaId, setFirmaId] = useState<number | null>(null);
  const [firmaAdi, setFirmaAdi] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'videolar' | 'dokumanlar'>('videolar');
  const [currentView, setCurrentView] = useState<'sets' | 'videos' | 'player'>('sets');

  const router = useRouter();
  const redirectRef = useRef(false);
  const isMountedRef = useRef(false);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAuthCheck = useRef(0);
  const AUTH_CHECK_COOLDOWN = 2500;

  const [egitimSetleri, setEgitimSetleri] = useState<EgitimSeti[]>([]);
  const [selectedSet, setSelectedSet] = useState<EgitimSeti | null>(null);
  const [setVideolari, setSetVideolari] = useState<EgitimVideosu[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<EgitimVideosu | null>(null);
  const [egitimDokumanlari, setEgitimDokumanlari] = useState<EgitimDokumani[]>([]);
  const [izlenenVideolar, setIzlenenVideolar] = useState<number[]>([]);
  const [ilerlemeIstatistik, setIlerlemeIstatistik] = useState<IlerlemeIstatistik>({
    toplamVideoSayisi: 0,
    izlenenVideoSayisi: 0,
    ilerlemeYuzdesi: 0,
    tamamlananSetSayisi: 0,
    toplamSetSayisi: 0,
  });

  const [message, setMessage] = useState('');
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [completedSetId, setCompletedSetId] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text);
    setTimeout(() => setMessage(''), 5000);
  };

  const getYouTubeEmbedUrl = (videoUrl: string): string => {
    try {
      const url = new URL(videoUrl);
      let videoId = '';

      if (url.hostname.includes('youtube.com')) {
        videoId = url.searchParams.get('v') || '';
      } else if (url.hostname.includes('youtu.be')) {
        videoId = url.pathname.slice(1);
      }

      return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    } catch {
      return '';
    }
  };

  const isVideoLocked = (video: EgitimVideosu): boolean => {
    if (video.sira_no === 1) return false;

    const oncekiVideo = setVideolari.find(v => v.sira_no === video.sira_no - 1);
    return oncekiVideo ? !izlenenVideolar.includes(oncekiVideo.id) : false;
  };

  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'Temel Eğitim':
        return 'bg-blue-500';
      case 'İleri Eğitim':
        return 'bg-purple-500';
      case 'Pazarlama':
        return 'bg-green-500';
      case 'Gümrük':
        return 'bg-yellow-500';
      case 'Platform':
        return 'bg-indigo-500';
      case 'Finans':
        return 'bg-red-500';
      case 'Lojistik':
        return 'bg-orange-500';
      case 'Güvenlik':
        return 'bg-gray-500';
      case 'Müşteri Hizmetleri':
        return 'bg-pink-500';
      case 'Teknik':
        return 'bg-teal-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const submitRating = async () => {
    try {
      if (!firmaId || !completedSetId || rating === 0) return;

      const success = await SupabaseEgitimService.kaydetKullaniciDegerlendirmesi(
        firmaId,
        completedSetId,
        rating,
        ratingComment.trim() || undefined,
      );

      if (success) {
        showMessage('Değerlendirmeniz kaydedildi! Teşekkür ederiz.');
        setShowRatingModal(false);
        setRating(0);
        setRatingComment('');
        setCompletedSetId(null);
      } else {
        showMessage('Değerlendirme kaydedilirken hata oluştu!', 'error');
      }
    } catch (error) {
      console.error('Değerlendirme kaydetme hatası:', error);
      showMessage('Değerlendirme kaydedilirken hata oluştu!', 'error');
    }
  };

  const downloadDocument = async (dokuman: EgitimDokumani) => {
    try {
      if (!firmaId) return;

      await SupabaseEgitimService.kaydetDokumanIndirme(firmaId, dokuman.id);

      const a = document.createElement('a');
      a.href = dokuman.dosya_url;
      a.download = dokuman.dokuman_adi;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showMessage('Doküman indiriliyor...');
    } catch (error) {
      console.error('Doküman indirme hatası:', error);
      showMessage('Doküman indirilemedi!', 'error');
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
        console.log('🔍 EĞİTİMLERİM: Anti-loop korumalı auth kontrolü başlatılıyor...');

        const now = Date.now();
        if ((now - lastAuthCheck.current) < AUTH_CHECK_COOLDOWN) {
          console.log('🚫 EĞİTİMLERİM: Auth kontrol atlandı - çok erken:', now - lastAuthCheck.current, 'ms');
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
                console.log('⏰ EĞİTİMLERİM: Giriş süresi dolmuş');
                if (isMountedRef.current && !redirectRef.current) {
                  redirectRef.current = true;
                  router.push('/login');
                }
                return;
              }

              if (isMountedRef.current) {
                console.log('✅ EĞİTİMLERİM: Unified format auth başarılı');
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
            console.warn('⚠️ EĞİTİMLERİM: Unified data parse hatası:', parseError);
          }
        }

        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const firma = localStorage.getItem('firmaAdi');
        const id = localStorage.getItem('firmaId');
        const email = localStorage.getItem('userEmail');

        console.log('🔄 EĞİTİMLERİM: Legacy kontrol:', { isLoggedIn, firma: !!firma, id: !!id, email: !!email });

        if (!isLoggedIn || isLoggedIn !== 'true' || !firma || !email) {
          console.log('❌ EĞİTİMLERİM: Auth başarısız, login\'e yönlendiriliyor');
          if (isMountedRef.current && !redirectRef.current) {
            redirectRef.current = true;
            setTimeout(() => {
              router.push('/login');
            }, 800);
          }
          return;
        }

        if (isMountedRef.current) {
          console.log('✅ EĞİTİMLERİM: Legacy format auth başarılı');
          setFirmaId(parseInt(id || '0'));
          setFirmaAdi(firma);
          setUserEmail(email);
          setAuthChecked(true);
          setInitialCheckDone(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ EĞİTİMLERİM: Auth kontrol hatası:', error);
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
      loadEgitimData(firmaId);
    }
  }, [mounted, authChecked, firmaId]);

  const loadEgitimData = async (currentFirmaId: number) => {
    try {
      setLoading(true);
      console.log('📚 EĞİTİMLERİM: Eğitim setleri yükleniyor (KALICI ÇÖZÜM)...', { firmaId: currentFirmaId });

      const [setlerData, dokumanlarData, izlenenData, istatistikData] = await Promise.all([
        SupabaseEgitimService.getTumEgitimSetleriForUser(currentFirmaId),
        SupabaseEgitimService.getEgitimDokumanlari(),
        SupabaseEgitimService.getFirmaVideoIzlemeDurumu(currentFirmaId),
        SupabaseEgitimService.hesaplaFirmaEgitimIlerlemesi(currentFirmaId),
      ]);

      setEgitimSetleri(setlerData || []);
      setEgitimDokumanlari(dokumanlarData || []);
      setIzlenenVideolar(izlenenData || []);
      setIlerlemeIstatistik(istatistikData || {
        toplamVideoSayisi: 0,
        izlenenVideoSayisi: 0,
        ilerlemeYuzdesi: 0,
        tamamlananSetSayisi: 0,
        toplamSetSayisi: 0,
      });

      console.log('✅ EĞİTİMLERİM: Eğitim verileri başarıyla yüklendi:', {
        tumSetler: setlerData?.length || 0,
        atanmisSetler: setlerData?.filter((s: any) => s.atanmis_mi).length || 0,
        kilitliSetler: setlerData?.filter((s: any) => s.kilitli).length || 0,
        dokumanlar: dokumanlarData?.length || 0,
        izlenenVideolar: izlenenData?.length || 0,
        ilerleme: istatistikData?.ilerlemeYuzdesi || 0,
      });
    } catch (error) {
      console.error('❌ EĞİTİMLERİM: Eğitim verileri yükleme hatası:', error);
      showMessage('Eğitim verileri yüklenirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSetVideos = async (set: EgitimSeti) => {
    try {
      if (set.kilitli) {
        showMessage('Bu eğitim seti henüz size atanmamış. Admin onayı bekliyor.', 'error');
        return;
      }

      console.log(`Set ${set.id} videoları yükleniyor (AÇIK SET)...`);

      const videolar = await SupabaseEgitimService.getEgitimVideolari(set.id);

      if (!videolar || videolar.length === 0) {
        showMessage(`Bu eğitim setinde henüz video bulunmamaktadır.`, 'error');
        return;
      }

      const siraliVideolar = videolar.sort((a, b) => a.sira_no - b.sira_no);

      setSelectedSet(set);
      setSetVideolari(siraliVideolar);
      setCurrentView('videos');

      console.log(`${siraliVideolar.length} video başarıyla yüklendi (AÇIK SET)`);
      showMessage(`${siraliVideolar.length} video yüklendi. İzlemeye başlayabilirsiniz!`);
    } catch (error) {
      console.error('Video yükleme hatası:', error);
      showMessage('Videolar yüklenirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'), 'error');
    }
  };

  const playVideo = async (video: EgitimVideosu) => {
    try {
      if (!firmaId || !selectedSet) return;

      if (selectedSet.kilitli) {
        showMessage('Bu eğitim setine erişiminiz bulunmamaktadır!', 'error');
        return;
      }

      if (video.sira_no > 1) {
        const oncekiVideo = setVideolari.find(v => v.sira_no === video.sira_no - 1);
        if (oncekiVideo && !izlenenVideolar.includes(oncekiVideo.id)) {
          showMessage(`Bu videoyu izleyebilmek için önce "${oncekiVideo.video_adi}" videosunu tamamlamalısınız!`, 'error');
          return;
        }
      }

      setSelectedVideo(video);
      setCurrentView('player');

      await SupabaseEgitimService.kaydetVideoIzleme(firmaId, video.id, false);

      console.log('Video oynatılıyor (AÇIK SET):', video.video_adi);
      showMessage(`"${video.video_adi}" videosu oynatılıyor...`);
    } catch (error) {
      console.error('Video oynatma hatası:', error);
      showMessage('Video oynatılırken hata oluştu!', 'error');
    }
  };

  const markVideoAsCompleted = async (video: EgitimVideosu) => {
    try {
      if (!firmaId || !selectedSet) return;

      if (selectedSet.kilitli) {
        showMessage('Bu eğitim setine erişiminiz bulunmamaktadır!', 'error');
        return;
      }

      const success = await SupabaseEgitimService.kaydetVideoIzleme(firmaId, video.id, true);

      if (success) {
        setIzlenenVideolar(prev => [...prev.filter(id => id !== video.id), video.id]);

        const yeniIstatistik = await SupabaseEgitimService.hesaplaFirmaEgitimIlerlemesi(firmaId);
        setIlerlemeIstatistik(yeniIstatistik);

        const tumVideolarIzlendi = setVideolari.every(v =>
          izlenenVideolar.includes(v.id) || v.id === video.id
        );

        if (tumVideolarIzlendi) {
          setCompletedSetId(selectedSet.id);
          setShowCongratsModal(true);
        }

        showMessage(`"${video.video_adi}" tamamlandı olarak işaretlendi! `);

        const sonrakiVideo = setVideolari.find(v => v.sira_no === video.sira_no + 1);
        if (sonrakiVideo) {
          setTimeout(() => {
            showMessage(`Sonraki video "${sonrakiVideo.video_adi}" artık izlenebilir! `);
          }, 2000);
        }
      } else {
        showMessage('Video işaretlenirken hata oluştu!', 'error');
      }
    } catch (error) {
      console.error('Video tamamlama hatası:', error);
      showMessage('Video tamamlanırken hata oluştu!', 'error');
    }
  };

  if (loading || !mounted || !initialCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">📚 Eğitim setleri yükleniyor...</p>
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
                <i className="ri-graduation-cap-line text-purple-600 mr-3"></i>
                Eğitim Setleri
              </h1>
              <p className="text-gray-600 text-lg mb-4">Size atanmış eğitimler açık, diğerleri admin onayı bekliyor</p>
              <div className="text-sm text-blue-600 bg-blue-50 rounded-lg p-3 inline-block">
                <strong>Hoş geldiniz:</strong> {firmaAdi} - {userEmail}
              </div>
            </div>

            {/* İlerleme Göstergesi */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-sm text-gray-500">Genel İlerleme</div>
                <div className="flex items-center space-x-3 mt-1">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-gray-200" fill="none" stroke="currentColor" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-purple-600" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${ilerlemeIstatistik.ilerlemeYuzdesi}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ animation: 'progress-animation 2s ease-in-out' }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{ilerlemeIstatistik.ilerlemeYuzdesi}%</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-600">
                      {ilerlemeIstatistik.izlenenVideoSayisi}/{ilerlemeIstatistik.toplamVideoSayisi} video
                    </div>
                    <div className="text-sm text-gray-600">
                      {ilerlemeIstatistik.tamamlananSetSayisi}/{ilerlemeIstatistik.toplamSetSayisi} set tamamlandı
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      {egitimSetleri.filter(s => s.atanmis_mi).length}/{egitimSetleri.length} set açık
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${message.includes('tamamlandı') || message.includes('kaydedildi') || message.includes('başarı') ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          {/* Breadcrumb */}
          {(currentView === 'videos' || currentView === 'player') && (
            <div className="flex items-center space-x-2 text-gray-600 mb-6">
              <button onClick={() => { setCurrentView('sets'); setSelectedSet(null); setSelectedVideo(null); }} className="hover:text-purple-600 cursor-pointer transition-colors">
                Tüm Eğitim Setleri
              </button>
              {selectedSet && (
                <React.Fragment>
                  <i className="ri-arrow-right-s-line"></i>
                  <button onClick={() => { if (currentView === 'player') { setCurrentView('videos'); setSelectedVideo(null); } }} className={`hover:text-purple-600 cursor-pointer transition-colors ${currentView === 'videos' ? 'text-purple-600 font-medium' : ''}`}>
                    {selectedSet.set_adi} {selectedSet.kilitli && '🔒'}
                  </button>
                </React.Fragment>
              )}
              {selectedVideo && (
                <React.Fragment>
                  <i className="ri-arrow-right-s-line"></i>
                  <span className="text-purple-600 font-medium">{selectedVideo.video_adi}</span>
                </React.Fragment>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          {currentView === 'sets' && (
            <div className="border-b border-gray-200 mb-8">
              <nav className="flex space-x-8">
                <button onClick={() => setActiveTab('videolar')} className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors ${activeTab === 'videolar' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  <i className="ri-play-circle-line mr-2"></i>
                  Eğitim Setleri ({egitimSetleri.length} Set)
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {egitimSetleri.filter(s => s.atanmis_mi).length} Açık
                  </span>
                </button>
                <button onClick={() => setActiveTab('dokumanlar')} className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors ${activeTab === 'dokumanlar' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  <i className="ri-file-pdf-line mr-2"></i>
                  Dökümanlar ({egitimDokumanlari.length})
                </button>
              </nav>
            </div>
          )}

          {/* Content based on current view and active tab */}
          {currentView === 'sets' && activeTab === 'videolar' && (
            <div className="space-y-8">
              {egitimSetleri.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="ri-graduation-cap-line text-gray-400 text-4xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Henüz eğitim seti yok</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-8">
                    Sistem henüz eğitim seti içermiyor. Admin tarafından eğitim setleri eklendikten sonra burada görünecektir.
                  </p>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {egitimSetleri.map((set) => {
                    const setIzlenenSayisi = set.atanmis_mi
                      ? izlenenVideolar.filter(videoId =>
                          setVideolari.some(v => v.egitim_set_id === set.id && v.id === videoId)
                        ).length
                      : 0;
                    const setIlerlemeYuzdesi = (set.atanmis_mi && set.toplam_video_sayisi > 0)
                      ? Math.round((setIzlenenSayisi / set.toplam_video_sayisi) * 100)
                      : 0;

                    return (
                      <div
                        key={set.id}
                        className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 overflow-hidden ${set.atanmis_mi ? 'border-gray-200 cursor-pointer hover:shadow-xl hover:border-purple-300 hover:scale-[1.02]' : 'border-gray-200 opacity-75'}`}
                        onClick={() => {
                          if (set.atanmis_mi) {
                            loadSetVideos(set);
                          } else {
                            showMessage('Bu eğitim seti henüz size atanmamış. Admin onayı bekleniyor.', 'error');
                          }
                        }}
                      >
                        {/* Kilit ikonu ve durum göstergesi */}
                        <div className="absolute top-4 right-4 z-10">
                          {set.kilitli ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                Admin Onayı Bekleniyor
                              </span>
                              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                                <i className="ri-lock-line text-white text-sm"></i>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                Açık
                              </span>
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                <i className="ri-unlock-line text-white text-sm"></i>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-8">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div
                                className={`w-4 h-4 rounded-full ${getKategoriColor(set.kategori)} ${set.kilitli ? 'opacity-50' : ''}`}
                              ></div>
                              <div>
                                <h3
                                  className={`text-xl font-bold ${set.kilitli ? 'text-gray-500' : 'text-gray-900'}`}
                                >
                                  {set.set_adi} {set.kilitli && '🔒'}
                                </h3>
                                <p className={`${set.kilitli ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {set.kategori}
                                </p>
                              </div>
                            </div>

                            {set.atanmis_mi && setIlerlemeYuzdesi === 100 && (
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <i className="ri-check-line text-green-600"></i>
                              </div>
                            )}
                          </div>

                          <p
                            className={`mb-6 leading-relaxed ${set.kilitli ? 'text-gray-400' : 'text-gray-600'}`}
                          >
                            {set.aciklama}
                          </p>

                          {/* İlerleme çubuğu - Sadece atanmış setler için */}
                          {set.atanmis_mi && (
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">İlerleme</span>
                                <span className="text-sm font-medium text-gray-900">{setIlerlemeYuzdesi}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                  style={{
                                    width: `${setIlerlemeYuzdesi}%`,
                                    animation: 'progress-fill 1.5s ease-out',
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}

                          <div
                            className={`flex items-center justify-between mb-6 text-sm ${set.kilitli ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            <div className="flex items-center space-x-1">
                              <i className="ri-play-circle-line"></i>
                              <span>{set.toplam_video_sayisi} video</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <i className="ri-time-line"></i>
                              <span>{set.toplam_sure} dakika</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <i className="ri-calendar-line"></i>
                              <span>{new Date(set.created_at).toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>

                          {/* Durum bazlı butonlar */}
                          {set.atanmis_mi ? (
                            <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 whitespace-nowrap cursor-pointer">
                              {setIlerlemeYuzdesi === 0 ? '🚀 Eğitime Başla' : '▶️ Devam Et'}
                              <i className="ri-arrow-right-line ml-2"></i>
                            </button>
                          ) : (
                            <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-lg text-center font-medium cursor-not-allowed relative group">
                              <i className="ri-lock-line mr-2"></i>
                              Admin Onayı Bekleniyor

                              {/* Hover Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                                Bu eğitim seti henüz size atanmamış. Admin tarafından size atandığında erişim sağlayabilirsiniz.
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Kilitli setler için overlay efekti */}
                        {set.kilitli && (
                          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 pointer-events-none"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Dokümanlar Görünümü */}
          {currentView === 'sets' && activeTab === 'dokumanlar' && (
            <div className="space-y-8">
              {egitimDokumanlari.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="ri-file-pdf-line text-gray-400 text-4xl"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Henüz doküman yok</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Eğitim dokümanları yüklendiğinde burada görüntülenecektir.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {egitimDokumanlari.map((dokuman) => (
                    <div key={dokuman.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <i className="ri-file-pdf-line text-red-600 text-xl"></i>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{dokuman.dokuman_adi}</h3>
                            <p className="text-sm text-gray-500">{dokuman.kategori}</p>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{dokuman.aciklama}</p>

                      <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                        <div className="flex items-center space-x-1">
                          <i className="ri-download-line"></i>
                          <span>PDF</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <i className="ri-file-line"></i>
                          <span>{formatFileSize(dokuman.dosya_boyutu)}</span>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => window.open(dokuman.dosya_url, '_blank')}
                          className="flex-1 bg-blue-50 text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium cursor-pointer whitespace-nowrap"
                        >
                          Önizle
                        </button>
                        <button
                          onClick={() => downloadDocument(dokuman)}
                          className="flex-1 bg-green-50 text-green-600 py-2 px-4 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium cursor-pointer whitespace-nowrap"
                        >
                          İndir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Tebrikler Modal */}
        {showCongratsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-105">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <i className="ri-trophy-line text-white text-3xl"></i>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-4">Tebrikler!</h3>
                <p className="text-gray-600 mb-6">
                  "{selectedSet?.set_adi}" eğitim setini başarıyla tamamladınız!
                  Bu başarınızın devamını diliyoruz.
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowCongratsModal(false);
                      setCurrentView('sets');
                      setSelectedSet(null);
                      // İstatistikleri güncelle
                      if (firmaId) loadEgitimData(firmaId);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer whitespace-nowrap"
                  >
                    Ana Sayfaya Dön
                  </button>
                  <button
                    onClick={() => {
                      setShowCongratsModal(false);
                      setShowRatingModal(true);
                    }}
                    className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-star-line mr-2"></i>
                    Değerlendir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Değerlendirme Modal */}
        {showRatingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Eğitimi Değerlendirin</h3>
                  <p className="text-gray-600">Bu eğitim seti hakkında düşüncelerinizi paylaşın</p>
                </div>

                {/* Yıldız Değerlendirme */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Puan verin</label>
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-3xl transition-colors cursor-pointer ${star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                      >
                        <i className={`${star <= rating ? 'ri-star-fill' : 'ri-star-line'}`}></i>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Yorum */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yorum (Opsiyonel)</label>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={4}
                    placeholder="Bu eğitim hakkında düşüncelerinizi paylaşın..."
                    maxLength={500}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowRatingModal(false);
                      setRating(0);
                      setRatingComment('');
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer whitespace-nowrap"
                  >
                    Atla
                  </button>
                  <button
                    onClick={submitRating}
                    disabled={rating === 0}
                    className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  >
                    Gönder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}
