
'use client';

import { useState, useEffect } from 'react';
import { supabase, SupabaseProjeService } from '../../../../lib/supabase-services';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ProjeDetayClientProps {
  projeId: string;
}

export default function ProjeDetayClient({ projeId }: ProjeDetayClientProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [proje, setProje] = useState<any>(null);
  const [altProjeler, setAltProjeler] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedAltProjeler, setExpandedAltProjeler] = useState<Set<number>>(new Set());
  const [activeView, setActiveView] = useState<'overview' | 'altprojeler' | 'gorevler'>('altprojeler');
  const [altProjelerLoading, setAltProjelerLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkAdminAuth();
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted && isAdminLoggedIn && projeId) {
      loadProjeDetay();
    }
  }, [mounted, isAdminLoggedIn, projeId]);

  const checkAdminAuth = () => {
    try {
      console.log('🔧 Admin yetki kontrolü başlatılıyor...');

      if (typeof window === 'undefined') {
        console.log('🔧 Window objesi mevcut değil');
        return;
      }

      const loggedIn = localStorage.getItem('isAdminLoggedIn');
      const email = localStorage.getItem('adminEmail');
      const role = localStorage.getItem('adminRole');

      console.log('🔧 Admin giriş durumu:', { loggedIn, email, role });

      if (!loggedIn || loggedIn !== 'true' || role !== 'Yonetici') {
        console.log('🔧 Admin yetkisi yok, login sayfasına yönlendiriliyor');
        router.push('/admin-login');
        return;
      }

      console.log('🔧 Admin yetkisi doğrulandı');
      setIsAdminLoggedIn(true);
      setAdminEmail(email || '');
    } catch (error) {
      console.error('🔧 Admin yetki kontrolü hatası:', error);
      setError('Yetki kontrolünde hata oluştu');
      setLoading(false);
    }
  };

  const loadProjeDetay = async () => {
    try {
      console.log('🎯 ALT PROJE DÜZELTMESİ: Proje detayları yükleniyor, ID:', projeId);
      setLoading(true);
      setError(null);

      const numericProjeId = parseInt(projeId);
      if (isNaN(numericProjeId) || numericProjeId <= 0) {
        console.error('🎯 Geçersiz proje ID:', projeId);
        setError(`Geçersiz proje ID: ${projeId}`);
        setLoading(false);
        return;
      }

      // Ana proje verilerini yükle
      const projeData = await SupabaseProjeService.getProjeById(numericProjeId);

      if (!projeData) {
        console.error('🎯 Proje bulunamadı, ID:', numericProjeId);
        setError(`ID ${numericProjeId} ile proje bulunamadı`);
        setLoading(false);
        return;
      }

      console.log('🎯 ✅ Ana proje yüklendi:', projeData.projeAdi);

      setProje({
        ID: projeData.id,
        ProjeBasligi: projeData.projeAdi,
        Aciklama: projeData.aciklama || 'Açıklama bulunmuyor',
        BaslangicTarihi: projeData.baslangicTarihi,
        BitisTarihi: projeData.bitisTarihi,
        OlusturmaTarihi: projeData.created_at,
        Durum: projeData.durum,
        AtananFirmalar: projeData.atananFirmalar || [],
        AtananFirmaAdlari: projeData.atananFirmaAdlari || 'Atanmamış',
        AtananFirmaDetaylari: [],
      });

      // ⚠️ ALT PROJE YÜKLEME DÜZELTMESİ: Doğru tablo adı ve sütunları kullan
      try {
        console.log('🎯 ALT PROJE DÜZELTMESİ: Alt projeler yükleniyor...');

        // Doğru tablo adı: alt_projeler, doğru foreign key: ana_proje_id 
        const { data: altProjelerData, error: altProjeError } = await supabase
          .from('alt_projeler')
          .select(`
            id,
            alt_proje_adi,
            aciklama,
            durum,
            baslangic_tarihi,
            bitis_tarihi,
            ana_proje_id,
            created_at
          `)
          .eq('ana_proje_id', numericProjeId) // ⚠️ DÜZELTİLDİ: ana_proje_id kullanıldı
          .order('created_at', { ascending: true });

        if (altProjeError) {
          console.error('🎯 Alt proje yükleme hatası:', altProjeError);
          throw altProjeError;
        }

        console.log('🎯 ✅ Alt projeler başarıyla yüklendi:', altProjelerData?.length || 0, 'alt proje');

        if (!altProjelerData || altProjelerData.length === 0) {
          console.log('🎯 Bu projeye ait alt proje bulunamadı');
          setAltProjeler([]);
        } else {
          // Alt projelere görevleri ekle
          const altProjelerWithGorevler = await Promise.all(
            altProjelerData.map(async (altProje: any) => {
              try {
                // ⚠️ GÖREV YÜKLEME DÜZELTMESİ: Doğru foreign key kullan
                const { data: gorevlerData, error: gorevError } = await supabase
                  .from('gorevler')
                  .select(`
                    id,
                    gorev_adi,
                    aciklama,
                    durum,
                    bitis_tarihi,
                    atanan_firmalar,
                    created_at
                  `)
                  .eq('alt_proje_id', altProje.id) // ⚠️ DÜZELTİLDİ: alt_proje_id kullanıldı
                  .order('created_at', { ascending: true });

                if (gorevError) {
                  console.warn(`🎯 Alt proje ${altProje.id} görevleri yüklenirken hata:`, gorevError);
                }

                return {
                  ...altProje,
                  ID: altProje.id,
                  AltProjeBasligi: altProje.alt_proje_adi,
                  Aciklama: altProje.aciklama,
                  Durum: altProje.durum,
                  BitisTarihi: altProje.bitis_tarihi,
                  BaslangicTarihi: altProje.baslangic_tarihi,
                  Gorevler: (gorevlerData || []).map((gorev: any) => ({
                    ...gorev,
                    ID: gorev.id,
                    GorevBasligi: gorev.gorev_adi,
                    Aciklama: gorev.aciklama,
                    BitisTarihi: gorev.bitis_tarihi,
                    Durum: gorev.durum,
                    YuzdeDegeri: 100,
                    SiraNo: gorev.id,
                    IsKilitli: false,
                    AtananFirmaSayisi: gorev.atanan_firmalar ? gorev.atanan_firmalar.length : 0,
                    atananFirmalar: gorev.atanan_firmalar || [],
                  })),
                };
              } catch (gorevError: any) {
                console.warn(`🎯 Alt proje ${altProje.id} görev yükleme hatası:`, gorevError);
                return {
                  ...altProje,
                  ID: altProje.id,
                  AltProjeBasligi: altProje.alt_proje_adi,
                  Aciklama: altProje.aciklama,
                  Durum: altProje.durum,
                  BitisTarihi: altProje.bitis_tarihi,
                  BaslangicTarihi: altProje.baslangic_tarihi,
                  Gorevler: [],
                };
              }
            })
          );

          setAltProjeler(altProjelerWithGorevler);
          console.log('🎯 ✅ Alt projeler görevlerle birlikte yüklendi:', altProjelerWithGorevler.length);
        }
      } catch (altProjeError: any) {
        console.error('🎯 Alt proje yükleme sistem hatası:', altProjeError?.message || 'Bilinmeyen hata');
        setAltProjeler([]);
        // Alt proje hatası ana sayfa yüklenmesini durdurmaz
      }

      // Firma detaylarını yükle
      try {
        if (projeData.atananFirmalar && projeData.atananFirmalar.length > 0) {
          const { data: firmaData, error: firmaError } = await supabase
            .from('firmalar')
            .select('*')
            .in('id', projeData.atananFirmalar);

          if (!firmaError && firmaData) {
            setProje((prev: any) => ({
              ...prev,
              AtananFirmaDetaylari: firmaData.map((firma: any) => ({
                id: firma.id,
                adi: firma.firma_adi,
                email: firma.yetkili_email,
                durum: firma.durum,
              })),
            }));
          }
        }
      } catch (firmaError: any) {
        console.warn('🎯 Firma detayları yüklenirken hata:', firmaError?.message || 'Bilinmeyen hata');
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : (error?.toString() || 'Bilinmeyen hata oluştu');
      console.error('🎯 Proje detay yükleme sistem hatası:', errorMessage);
      setError(`Proje detayları yüklenirken hata oluştu: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/admin-login');
  };

  const handleAltProjeSil = async (altProjeId: number, altProjeBasligi: string) => {
    if (confirm(`"${altProjeBasligi}" alt projesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      try {
        console.log('🎯 Alt proje siliniyor, ID:', altProjeId);

        const { error: gorevSilmeError } = await supabase
          .from('gorevler')
          .delete()
          .eq('alt_proje_id', altProjeId);

        if (gorevSilmeError) {
          console.warn('🎯 Görevler silinirken hata:', gorevSilmeError.message || 'Bilinmeyen hata');
        }

        const { error: altProjeSilmeError } = await supabase
          .from('alt_projeler')
          .delete()
          .eq('id', altProjeId);

        if (altProjeSilmeError) {
          throw altProjeSilmeError;
        }

        console.log('🎯 Alt proje başarıyla silindi');
        alert('Alt proje başarıyla silindi!');

        await loadProjeDetay();
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
        console.error('🎯 Alt proje silme hatası:', errorMessage);
        alert(`Alt proje silinirken hata oluştu: ${errorMessage}`);
      }
    }
  };

  const handleGorevSil = async (gorevId: number, gorevBasligi: string) => {
    if (confirm(`"${gorevBasligi}" görevini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      try {
        console.log('🎯 Görev siliniyor, ID:', gorevId);

        const { error: talepSilmeError } = await supabase
          .from('gorev_tamamlama_talepleri')
          .delete()
          .eq('gorev_id', gorevId);

        if (talepSilmeError) {
          console.warn('🎯 Tamamlama talepleri silinirken hata:', talepSilmeError.message || 'Bilinmeyen hata');
        }

        const { error: gorevSilmeError } = await supabase
          .from('gorevler')
          .delete()
          .eq('id', gorevId);

        if (gorevSilmeError) {
          throw gorevSilmeError;
        }

        console.log('🎯 Görev başarıyla silindi');
        alert('Görev başarıyla silindi!');

        await loadProjeDetay();
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
        console.error('🎯 Görev silme hatası:', errorMessage);
        alert(`Görev silinirken hata oluştu: ${errorMessage}`);
      }
    }
  };

  const handleGorevDuzenle = (gorevId: number, altProjeId?: number) => {
    if (altProjeId) {
      router.push(`/admin-proje-yonetimi/gorev-duzenle/${projeId}/${gorevId}?altProjeId=${altProjeId}`);
    } else {
      router.push(`/admin-proje-yonetimi/gorev-duzenle/${projeId}/${gorevId}`);
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Geçersiz tarih';
      }
      return dateObj.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return 'Geçersiz tarih';
    }
  };

  const getDurumColor = (durum: string) => {
    switch (durum) {
      case 'Aktif':
        return 'bg-green-100 text-green-800';
      case 'Tamamlandı':
        return 'bg-blue-100 text-blue-800';
      case 'Durduruldu':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleAltProjeExpansion = (altProjeId: number) => {
    const newExpanded = new Set(expandedAltProjeler);
    if (newExpanded.has(altProjeId)) {
      newExpanded.delete(altProjeId);
    } else {
      newExpanded.add(altProjeId);
    }
    setExpandedAltProjeler(newExpanded);
  };

  const calculateAltProjeIlerleme = (altProje: any) => {
    if (!altProje.Gorevler || altProje.Gorevler.length === 0) return 0;

    const tamamlananGorevler = altProje.Gorevler.filter((g: any) => g.Durum === 'Tamamlandı').length;
    return Math.round((tamamlananGorevler / altProje.Gorevler.length) * 100);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sistem hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Admin yetki kontrolü yapılıyor...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Proje detayları yükleniyor...</p>
          <p className="text-sm text-gray-500 mt-2">Proje ID: {projeId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <i className="ri-error-warning-line text-2xl text-red-600"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Hata Oluştu</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null);
                loadProjeDetay();
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <i className="ri-refresh-line mr-2"></i>
              Tekrar Dene
            </button>
            <Link
              href="/admin-proje-yonetimi"
              className="w-full inline-block text-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Proje Listesine Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!proje) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <i className="ri-file-search-line text-2xl text-yellow-600"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Proje Bulunamadı</h2>
          <p className="text-gray-600 mb-6">ID {projeId} ile proje bulunamadı veya erişim yetkisi yok.</p>
          <Link
            href="/admin-proje-yonetimi"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Proje Listesine Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-[\'Pacifico\']">
                logo
              </Link>
              <div className="flex items-center space-x-2 text-gray-600">
                <Link href="/admin-proje-yonetimi" className="hover:text-blue-600 cursor-pointer">
                  Proje Yönetimi
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Proje Detayı</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{adminEmail}</span>
              <Link
                href={`/admin-proje-yonetimi/duzenle/${projeId}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
              >
                <i className="ri-edit-line"></i>
                <span>Projeyi Düzenle</span>
              </Link>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{proje.ProjeBasligi}</h1>
                <p className="text-blue-100 text-sm">3 Katmanlı Proje Yönetimi</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white">
                  <i
                    className={`${proje.Durum === 'Aktif' ? 'ri-play-circle-line' : proje.Durum === 'Tamamlandı' ? 'ri-check-circle-line' : 'ri-pause-circle-line'} mr-1`}
                  ></i>
                  {proje.Durum}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <i className="ri-folder-line text-green-600"></i>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{altProjeler.length}</p>
                    <p className="text-sm text-green-600">Alt Proje</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <i className="ri-task-line text-blue-600"></i>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700">
                      {altProjeler.reduce((total, ap) => total + (ap.Gorevler?.length || 0), 0)}
                    </p>
                    <p className="text-sm text-blue-600">Toplam Görev</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <i className="ri-team-line text-purple-600"></i>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-700">{proje.AtananFirmaDetaylari?.length || 0}</p>
                    <p className="text-sm text-purple-600">Atanan Firma</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <i className="ri-calendar-line text-orange-600"></i>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-700">{formatDate(proje.BitisTarihi)}</p>
                    <p className="text-sm text-orange-600">Bitiş Tarihi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveView('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeView === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-information-line mr-2"></i>
                Proje Özeti
              </button>
              <button
                onClick={() => setActiveView('altprojeler')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeView === 'altprojeler'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-folder-line mr-2"></i>
                Alt Projeler ({altProjeler.length})
              </button>
              <button
                onClick={() => setActiveView('gorevler')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeView === 'gorevler'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-task-line mr-2"></i>
                Tüm Görevler ({altProjeler.reduce((total, ap) => total + (ap.Gorevler?.length || 0), 0)})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeView === 'overview' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Proje Bilgileri</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center text-sm">
                        <i className="ri-calendar-line mr-2 text-green-600"></i>
                        <span className="text-gray-600">Başlangıç:</span>
                        <span className="ml-2 font-medium">{formatDate(proje.BaslangicTarihi)}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <i className="ri-calendar-check-line mr-2 text-red-600"></i>
                        <span className="text-gray-600">Bitiş:</span>
                        <span className="ml-2 font-medium">{formatDate(proje.BitisTarihi)}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <i className="ri-calendar-event-line mr-2 text-blue-600"></i>
                        <span className="text-gray-600">Oluşturma:</span>
                        <span className="ml-2 font-medium">{formatDate(proje.OlusturmaTarihi)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Atanan Firmalar</h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {proje.AtananFirmaDetaylari && proje.AtananFirmaDetaylari.length > 0 ? (
                        proje.AtananFirmaDetaylari.map((firma: any, index: number) => (
                          <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                              <i className="ri-building-line text-white text-sm"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{firma.adi}</p>
                              <p className="text-sm text-gray-600 truncate">{firma.email}</p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                firma.durum === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {firma.durum}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">Henüz firma atanmamış</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Proje Açıklaması</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{proje.Aciklama}</p>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'altprojeler' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Alt Projeler ({altProjeler.length})
                    {altProjeler.length === 0 && <span className="text-sm text-red-600 ml-2">- Alt proje bulunamadı</span>}
                  </h3>
                  <Link
                    href={`/admin-proje-yonetimi/alt-proje-ekle/${projeId}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
                  >
                    <i className="ri-add-line"></i>
                    <span>Alt Proje Ekle</span>
                  </Link>
                </div>

                {altProjeler.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <i className="ri-checkbox-circle-line text-green-600 mr-2"></i>
                        <span className="text-green-800 font-medium">
                          ✅ Alt projeler başarıyla yüklendi! {altProjeler.length} alt proje bulundu.
                        </span>
                      </div>
                    </div>

                    {altProjeler.map((altProje, index) => (
                      <div key={altProje.ID} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold">{index + 1}</span>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-lg font-semibold text-gray-900">{altProje.AltProjeBasligi}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{altProje.Aciklama}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                    <i className="ri-task-line text-green-600"></i>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-green-700">{altProje.Gorevler?.length || 0}</p>
                                    <p className="text-xs text-gray-500">Görev</p>
                                  </div>
                                </div>

                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                    <i className="ri-calendar-line text-blue-600"></i>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-blue-700">{formatDate(altProje.BitisTarihi)}</p>
                                    <p className="text-xs text-gray-500">Bitiş</p>
                                  </div>
                                </div>

                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                    <i className="ri-progress-3-line text-purple-600"></i>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-purple-700">{calculateAltProjeIlerleme(altProje)}%</p>
                                    <p className="text-xs text-gray-500">İlerleme</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${getDurumColor(altProje.Durum)}`}
                              >
                                {altProje.Durum}
                              </span>
                              <Link
                                href={`/admin-proje-yonetimi/alt-proje-duzenle/${projeId}/${altProje.ID}`}
                                className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center hover:bg-orange-200 transition-colors cursor-pointer"
                                title="Alt Projeyi Düzenle"
                              >
                                <i className="ri-edit-line text-sm"></i>
                              </Link>
                              <button
                                onClick={() => handleAltProjeSil(altProje.ID, altProje.AltProjeBasligi)}
                                className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors cursor-pointer"
                              >
                                <i className="ri-delete-bin-line text-sm"></i>
                              </button>
                              <button
                                onClick={() => toggleAltProjeExpansion(altProje.ID)}
                                className="w-10 h-10 bg-white rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                <i
                                  className={`ri-arrow-${expandedAltProjeler.has(altProje.ID) ? 'up' : 'down'}-s-line text-gray-600`}
                                ></i>
                              </button>
                            </div>
                          </div>
                        </div>

                        {expandedAltProjeler.has(altProje.ID) && (
                          <div className="bg-white p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="font-semibold text-gray-900">
                                {altProje.AltProjeBasligi} - Görevler
                              </h5>
                              <Link
                                href={`/admin-proje-yonetimi/gorev-ekle/${projeId}/${altProje.ID}`}
                                className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm cursor-pointer"
                              >
                                <i className="ri-add-line mr-1"></i>
                                Görev Ekle
                              </Link>
                            </div>

                            {altProje.Gorevler && altProje.Gorevler.length > 0 ? (
                              <div className="space-y-3">
                                {altProje.Gorevler
                                  .sort((a: any, b: any) => (a.SiraNo || 0) - (b.SiraNo || 0))
                                  .map((gorev: any, gorevIndex: number) => (
                                    <div
                                      key={gorev.ID}
                                      className={`border rounded-lg p-4 transition-all ${
                                        gorev.IsKilitli ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:border-blue-300'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center mb-2">
                                            <div
                                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                                                gorev.IsKilitli ? 'bg-gray-200 text-gray-500' : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                              }`}
                                            >
                                              {gorev.IsKilitli ? <i className="ri-lock-line"></i> : gorev.SiraNo || gorevIndex + 1}
                                            </div>
                                            <div className="flex-1">
                                              <h6
                                                className={`font-medium ${
                                                  gorev.IsKilitli ? 'text-gray-500' : 'text-gray-800'
                                                }`}
                                              >
                                                {gorev.GorevBasligi}
                                              </h6>
                                            </div>
                                          </div>

                                          <p
                                            className={`text-sm mb-3 ml-9 ${
                                              gorev.IsKilitli ? 'text-gray-500' : 'text-gray-600'
                                            }`}
                                          >
                                            {gorev.Aciklama}
                                          </p>

                                          <div className="ml-9 mb-3">
                                            <div className="flex items-start space-x-2">
                                              <i
                                                className={`ri-building-line mt-0.5 ${
                                                  gorev.IsKilitli ? 'text-gray-400' : 'text-orange-600'
                                                }`}
                                              ></i>
                                              <div className="flex-1">
                                                <span
                                                  className={`text-sm font-medium ${
                                                    gorev.IsKilitli ? 'text-gray-500' : 'text-orange-700'
                                                  }`}
                                                >
                                                  Atanan Firmalar:
                                                </span>
                                                <div
                                                  className={`text-sm mt-1 ${
                                                    gorev.IsKilitli ? 'text-gray-500' : 'text-gray-700'
                                                  }`}
                                                >
                                                  {gorev.atananFirmalar && gorev.atananFirmalar.length > 0 ? (
                                                    <FirmaListesi firmaIds={gorev.atananFirmalar} />
                                                  ) : (
                                                    <span className="italic text-gray-500">Henüz firma atanmamış</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center space-x-4 ml-9">
                                            <div className="flex items-center">
                                              <i
                                                className={`ri-percent-line mr-1 ${
                                                  gorev.IsKilitli ? 'text-gray-400' : 'text-green-600'
                                                }`}
                                              ></i>
                                              <span
                                                className={`text-sm ${
                                                  gorev.IsKilitli ? 'text-gray-500' : 'text-green-700'
                                                }`}
                                              >
                                                %{gorev.YuzdeDegeri || 0}
                                              </span>
                                            </div>

                                            <div className="flex items-center">
                                              <i
                                                className={`ri-calendar-line mr-1 ${
                                                  gorev.IsKilitli ? 'text-gray-400' : 'text-blue-600'
                                                }`}
                                              ></i>
                                              <span
                                                className={`text-sm ${
                                                  gorev.IsKilitli ? 'text-gray-500' : 'text-blue-700'
                                                }`}
                                              >
                                                {formatDate(gorev.BitisTarihi)}
                                              </span>
                                            </div>

                                            <div className="flex items-center">
                                              <i
                                                className={`ri-team-line mr-1 ${
                                                  gorev.IsKilitli ? 'text-gray-400' : 'text-purple-600'
                                                }`}
                                              ></i>
                                              <span
                                                className={`text-sm ${
                                                  gorev.IsKilitli ? 'text-gray-500' : 'text-purple-700'
                                                }`}
                                              >
                                                {(gorev.atananFirmalar && gorev.atananFirmalar.length) || 0} firma
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleGorevDuzenle(gorev.ID, altProje.ID)}
                                            className={`px-3 py-1 rounded-lg text-sm transition-colors cursor-pointer ${
                                              gorev.IsKilitli
                                                ? 'bg-gray-100 text-gray-500'
                                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            }`}
                                            title="Görevi Düzenle"
                                          >
                                            <i className="ri-edit-line"></i>
                                          </button>

                                          <button
                                            onClick={() => handleGorevSil(gorev.ID, gorev.GorevBasligi)}
                                            className={`px-3 py-1 rounded-lg text-sm transition-colors cursor-pointer ${
                                              gorev.IsKilitli
                                                ? 'bg-gray-100 text-gray-500'
                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                            }`}
                                          >
                                            <i className="ri-delete-bin-line"></i>
                                          </button>
                                        </div>
                                      </div>

                                      {gorev.IsKilitli && (
                                        <div className="mt-3 ml-9 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                          <div className="flex items-center text-xs text-orange-700">
                                            <i className="ri-information-line mr-1"></i>
                                            Bu görev kilitli - bağımlı görev tamamlanmalı
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))
                              }
                              </div>
                            ) : (
                              <div className="text-center py-8 bg-gray-50 rounded-lg">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <i className="ri-task-line text-gray-400"></i>
                                </div>
                                <p className="text-gray-500 text-sm">Bu alt projede henüz görev yok</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  }
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-folder-line text-2xl text-gray-400"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Henüz alt proje yok</h3>
                    <p className="text-gray-600 mb-6">Bu projeye henüz alt proje eklenmemiş.</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <i className="ri-information-line text-yellow-600 mr-2"></i>
                        <div className="text-left">
                          <p className="text-yellow-800 font-medium">Alt proje bulunamadı</p>
                          <p className="text-yellow-700 text-sm">
                            Veritabanında ID {projeId} olan projeye ait alt proje bulunmuyor.
                            <br />Yeni alt proje eklemek için yukarıdaki butonu kullanabilirsiniz.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'gorevler' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Tüm Görevler</h3>
                  <div className="text-sm text-gray-600">
                    Toplam {altProjeler.reduce((total, ap) => total + (ap.Gorevler?.length || 0), 0)} görev
                  </div>
                </div>

                {altProjeler.some((ap) => ap.Gorevler && ap.Gorevler.length > 0) ? (
                  <div className="space-y-6">
                    {altProjeler.map((altProje) => (
                      altProje.Gorevler && altProje.Gorevler.length > 0 && (
                        <div key={altProje.ID} className="border border-gray-200 rounded-lg">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h4 className="font-medium text-gray-900">{altProje.AltProjeBasligi}</h4>
                            <p className="text-sm text-gray-600">{altProje.Gorevler.length} görev</p>
                          </div>
                          <div className="p-4 space-y-3">
                            {altProje.Gorevler.map((gorev: any, index: number) => (
                              <div
                                key={gorev.ID}
                                className={`flex items-center space-x-4 p-3 bg-white border border-gray-200 rounded-lg ${
                                  gorev.IsKilitli ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    gorev.IsKilitli ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'
                                  }`}
                                >
                                  {gorev.IsKilitli ? <i className="ri-lock-line"></i> : gorev.SiraNo || index + 1}
                                </div>
                                <div className="flex-1">
                                  <h5
                                    className={`font-medium ${
                                      gorev.IsKilitli ? 'text-gray-500' : 'text-gray-800'
                                    }`}
                                  >
                                    {gorev.GorevBasligi}
                                  </h5>
                                  <p
                                    className={`text-sm ${
                                      gorev.IsKilitli ? 'text-gray-400' : 'text-gray-600'
                                    }`}
                                  >
                                    {gorev.Aciklama}
                                  </p>
                                  <div className="mt-2">
                                    <span
                                      className={`text-xs ${
                                        gorev.IsKilitli ? 'text-gray-400' : 'text-orange-600'
                                      }`}
                                    >
                                      Firmalar: {gorev.atananFirmalar && gorev.atananFirmalar.length > 0 ? (
                                        <FirmaListesi firmaIds={gorev.atananFirmalar} />
                                      ) : (
                                        'Atanmamış'
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div
                                    className={`text-sm font-medium ${
                                      gorev.IsKilitli ? 'text-gray-500' : 'text-green-600'
                                    }`}
                                  >
                                    %{gorev.YuzdeDegeri || 0}
                                  </div>
                                  <div
                                    className={`text-xs ${
                                      gorev.IsKilitli ? 'text-gray-400' : 'text-gray-500'
                                    }`}
                                  >
                                    {formatDate(gorev.BitisTarihi)}
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleGorevDuzenle(gorev.ID, altProje.ID)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors cursor-pointer ${
                                      gorev.IsKilitli
                                        ? 'bg-gray-100 text-gray-500'
                                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                    }`}
                                    title="Görevi Düzenle"
                                  >
                                    <i className="ri-edit-line"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-task-line text-2xl text-gray-400"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Henüz görev yok</h3>
                    <p className="text-gray-600 mb-6">Bu projeye henüz görev atanmamış.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FirmaListesi({ firmaIds }: { firmaIds: number[] }) {
  const [firmaNames, setFirmaNames] = useState<string>('Yükleniyor...');

  useEffect(() => {
    const loadFirmaNames = async () => {
      if (!firmaIds || firmaIds.length === 0) {
        setFirmaNames('Firma atanmamış');
        return;
      }

      try {
        const { data: firmalar, error } = await supabase
          .from('firmalar')
          .select('firma_adi')
          .in('id', firmaIds);

        if (error || !firmalar) {
          setFirmaNames(`${firmaIds.length} firma atanmış`);
          return;
        }

        const names = firmalar.map((f: any) => f.firma_adi).join(', ');
        setFirmaNames(names || `${firmaIds.length} firma`);
      } catch (error) {
        setFirmaNames(`${firmaIds.length} firma atanmış`);
      }
    };

    loadFirmaNames();
  }, [firmaIds]);

  return <span className="text-sm">{firmaNames}</span>;
}
