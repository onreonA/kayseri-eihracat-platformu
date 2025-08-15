
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface FirmaGrafik {
  id: number;
  FirmaAdi: string;
  GenelIlerleme: number;
  TamamlananGorev: number;
  ToplamGorev: number;
  ProjeKatilimi: number;
}

interface GorevDurumDagilimi {
  Beklemede: number;
  OnayBekliyor: number;
  Tamamlandi: number;
  Gecikti: number;
}

export default function AdminDashboardChartsPage() {
  const [firmaGrafikleri, setFirmaGrafikleri] = useState<FirmaGrafik[]>([]);
  const [selectedFirma, setSelectedFirma] = useState<number | null>(null);
  const [gorevDurumDagilimi, setGorevDurumDagilimi] = useState<GorevDurumDagilimi | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (mounted) {
      loadSupabaseGrafikVerileri();
    }
  }, [mounted]);

  const checkAdminAuth = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        router.replace('/admin-login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin-login');
        return;
      }
    } catch (error) {
      console.error('[AdminDashboardCharts]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/admin-login');
    }
  };

  const loadSupabaseGrafikVerileri = async () => {
    try {
      setLoading(true);

      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn('❌ Supabase bağlantısı yok, fallback veri kullanılıyor');
        await loadFallbackGrafikVerileri();
        return;
      }

      // Firmalar tablosundan veri al
      const { data: firmalarData, error: firmalarError } = await supabase
        .from('firmalar')
        .select('id, firma_adi, durum')
        .eq('durum', 'Aktif');

      if (firmalarError) {
        console.warn('Firmalar verisi alınamadı:', firmalarError);
        await loadFallbackGrafikVerileri();
        return;
      }

      const firmalar = firmalarData || [];

      // Görevler tablosundan veri al
      const { data: gorevlerData, error: gorevlerError } = await supabase
        .from('gorevler')
        .select('id, gorev_adi, atanan_firmalar, durum, bitis_tarihi, proje_id');

      if (gorevlerError) {
        console.warn('Görevler verisi alınamadı:', gorevlerError);
        await loadFallbackGrafikVerileri();
        return;
      }

      const gorevler = gorevlerData || [];

      // Görev tamamlama talepleri
      const { data: tamamlamaData, error: tamamlamaError } = await supabase
        .from('gorev_tamamlama_talepleri')
        .select('gorev_id, firma_id, durum');

      const tamamlamaTalepleri = tamamlamaError ? [] : (tamamlamaData || []);

      // Grafik verilerini hesapla
      const grafikVerileri: FirmaGrafik[] = [];

      firmalar.forEach((firma: any, index: number) => {
        const firmaGorevleri = gorevler.filter((g: any) =>
          Array.isArray(g.atanan_firmalar) && g.atanan_firmalar.includes(firma.id)
        );

        let tamamlananGorevSayisi = 0;
        for (const gorev of firmaGorevleri) {
          const onaylanmisTalep = tamamlamaTalepleri.find((t: any) =>
            t.gorev_id === gorev.id &&
            t.firma_id === firma.id &&
            t.durum === 'Onaylandı'
          );

          if (onaylanmisTalep) {
            tamamlananGorevSayisi++;
          }
        }

        const genelIlerlemeYuzdesi = firmaGorevleri.length > 0
          ? Math.round((tamamlananGorevSayisi / firmaGorevleri.length) * 100)
          : 0;

        const projeKatilimi = new Set(firmaGorevleri.map((g: any) => g.proje_id)).size;

        grafikVerileri.push({
          id: firma.id || index + 1,
          FirmaAdi: firma.firma_adi,
          GenelIlerleme: genelIlerlemeYuzdesi,
          TamamlananGorev: tamamlananGorevSayisi,
          ToplamGorev: firmaGorevleri.length,
          ProjeKatilimi: projeKatilimi,
        });
      });

      setFirmaGrafikleri(grafikVerileri.sort((a, b) => b.GenelIlerleme - a.GenelIlerleme));

      if (firmalar.length > 0) {
        const ilkFirma = firmalar[0];
        setSelectedFirma(ilkFirma.id);
        await loadFirmaGorevDagilimi(ilkFirma.id, gorevler, tamamlamaTalepleri);
      }

      console.log('✅ Supabase grafik verileri yüklendi');
    } catch (error) {
      console.error('Grafik verileri yükleme hatası:', error);
      await loadFallbackGrafikVerileri();
    } finally {
      setLoading(false);
    }
  };

  const loadFirmaGorevDagilimi = async (firmaId: number, gorevler: any[] = [], tamamlamaTalepleri: any[] = []) => {
    try {
      console.log(`📈 Firma ${firmaId} görev dağılımı hesaplanıyor...`);

      // Eğer veriler parametre olarak gelmemişse Supabase'den al
      if (gorevler.length === 0 && getSupabaseClient()) {
        const { data: gorevlerData, error: gorevlerError } = await getSupabaseClient()
          .from('gorevler')
          .select('id, atanan_firmalar, durum, bitis_tarihi')
          .contains('atanan_firmalar', [firmaId]);

        if (!gorevlerError && gorevlerData) {
          gorevler = gorevlerData;
        }

        const { data: tamamlamaData, error: tamamlamaError } = await getSupabaseClient()
          .from('gorev_tamamlama_talepleri')
          .select('gorev_id, firma_id, durum')
          .eq('firma_id', firmaId);

        if (!tamamlamaError && tamamlamaData) {
          tamamlamaTalepleri = tamamlamaData;
        }
      }

      const firmaGorevleri = gorevler.filter((g: any) =>
        Array.isArray(g.atanan_firmalar) && g.atanan_firmalar.includes(firmaId)
      );

      let beklemede = 0;
      let onayBekliyor = 0;
      let tamamlandi = 0;
      let gecikti = 0;

      const bugun = new Date();
      bugun.setHours(0, 0, 0, 0);

      for (const gorev of firmaGorevleri) {
        const onaylanmisTalep = tamamlamaTalepleri.find((t: any) =>
          t.gorev_id === gorev.id &&
          t.firma_id === firmaId &&
          t.durum === 'Onaylandı'
        );

        const bekleyenTalep = tamamlamaTalepleri.find((t: any) =>
          t.gorev_id === gorev.id &&
          t.firma_id === firmaId &&
          t.durum === 'Onay Bekliyor'
        );

        if (onaylanmisTalep) {
          tamamlandi++;
        } else if (bekleyenTalep) {
          onayBekliyor++;
        } else {
          if (gorev.bitis_tarihi) {
            const bitisTarihi = new Date(gorev.bitis_tarihi);
            bitisTarihi.setHours(0, 0, 0, 0);

            if (bitisTarihi < bugun) {
              gecikti++;
            } else {
              beklemede++;
            }
          } else {
            beklemede++;
          }
        }
      }

      setGorevDurumDagilimi({
        Beklemede: beklemede,
        OnayBekliyor: onayBekliyor,
        Tamamlandi: tamamlandi,
        Gecikti: gecikti,
      });
    } catch (error) {
      console.error('Firma görev dağılımı hesaplama hatası:', error);
      setGorevDurumDagilimi({
        Beklemede: 0,
        OnayBekliyor: 0,
        Tamamlandi: 0,
        Gecikti: 0,
      });
    }
  };

  const loadFallbackGrafikVerileri = async () => {
    try {
      console.log('📊 Fallback grafik verileri yükleniyor...');

      // Basit fallback grafik verileri
      setFirmaGrafikleri([]);
      setGorevDurumDagilimi(null);
    } catch (error) {
      console.error('Fallback grafik verileri hatası:', error);
    }
  };

  const handleFirmaSelect = async (firmaId: number) => {
    setSelectedFirma(firmaId);
    await loadFirmaGorevDagilimi(firmaId);
  };

  const renderCubukGrafik = () => {
    const maxIlerleme = Math.max(...firmaGrafikleri.map((f) => f.GenelIlerleme));

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            📊 Firma İlerleme Karşılaştırması
          </h3>
          <p className="text-gray-600">Üç katmanlı sistemde genel ilerleme yüzdeleri</p>
        </div>

        <div className="space-y-4">
          {firmaGrafikleri.map((firma, index) => {
            const renkSinifi =
              firma.GenelIlerleme >= 70
                ? 'from-green-400 to-green-600'
                : firma.GenelIlerleme >= 40
                ? 'from-yellow-400 to-yellow-600'
                : 'from-red-400 to-red-600';

            const yuzdeGenislik =
              maxIlerleme > 0 ? (firma.GenelIlerleme / maxIlerleme) * 100 : 0;

            return (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-32 text-right">
                  <div className="font-medium text-gray-900 truncate">
                    {firma.FirmaAdi}
                  </div>
                  <div className="text-xs text-gray-500">
                    {firma.TamamlananGorev}/{firma.ToplamGorev} görev
                  </div>
                </div>

                <div className="flex-1 relative">
                  <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner">
                    <div
                      className={`h-full bg-gradient-to-r ${renkSinifi} transition-all duration-1000 ease-out flex items-center justify-end pr-3 relative`}
                      style={{
                        width: `${yuzdeGenislik}%`,
                        minWidth: firma.GenelIlerleme > 0 ? '60px' : '0px',
                      }}
                    >
                      <span className="text-white font-bold text-sm">
                        {firma.GenelIlerleme}%
                      </span>
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleFirmaSelect(
                      firmaGrafikleri.find((f) => f.FirmaAdi === firma.FirmaAdi)?.id ||
                        1
                    )
                  }
                  className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors cursor-pointer"
                >
                  <i className="ri-pie-chart-line text-sm"></i>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPastaGrafik = () => {
    if (!gorevDurumDagilimi || !selectedFirma) return null;

    const toplam =
      gorevDurumDagilimi.Beklemede +
      gorevDurumDagilimi.OnayBekliyor +
      gorevDurumDagilimi.Tamamlandi +
      gorevDurumDagilimi.Gecikti;

    if (toplam === 0)
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🥧 Görev Durum Dağılımı</h3>
          <div className="text-center py-8">
            <p className="text-gray-500">Seçili firma için görev bulunamadı</p>
          </div>
        </div>
      );

    const selectedFirmaData = firmaGrafikleri.find((f) =>
      firmaGrafikleri.find((firm) => firm.FirmaAdi === f.FirmaAdi)?.id ===
        selectedFirma
    );

    const yuzdeler = {
      Beklemede: Math.round((gorevDurumDagilimi.Beklemede / toplam) * 100),
      OnayBekliyor: Math.round((gorevDurumDagilimi.OnayBekliyor / toplam) * 100),
      Tamamlandi: Math.round((gorevDurumDagilimi.Tamamlandi / toplam) * 100),
      Gecikti: Math.round((gorevDurumDagilimi.Gecikti / toplam) * 100),
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">🥧 Görev Durum Dağılımı</h3>
          <p className="text-gray-600">
            {selectedFirmaData?.FirmaAdi || 'Seçili Firma'} - {toplam} toplam görev
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex justify-center">
            <div className="relative w-48 h-48">
              <div className="w-full h-full rounded-full bg-gray-200"></div>

              <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{toplam}</div>
                  <div className="text-xs text-gray-500">toplam görev</div>
                </div>
              </div>

              <div className="absolute -bottom-8 left-0 right-0 flex justify-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-xs">Beklemede</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs">Onay Bekliyor</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-xs">Tamamlandı</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-xs">Gecikti</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                <span className="font-medium text-gray-700">Beklemede</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">
                  {gorevDurumDagilimi.Beklemede}
                </div>
                <div className="text-sm text-gray-500">
                  {yuzdeler.Beklemede}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                <span className="font-medium text-yellow-700">Onay Bekliyor</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-yellow-900">
                  {gorevDurumDagilimi.OnayBekliyor}
                </div>
                <div className="text-sm text-yellow-600">
                  {yuzdeler.OnayBekliyor}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                <span className="font-medium text-green-700">Tamamlandı</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-900">
                  {gorevDurumDagilimi.Tamamlandi}
                </div>
                <div className="text-sm text-green-600">
                  {yuzdeler.Tamamlandi}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                <span className="font-medium text-red-700">Gecikti</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-red-900">
                  {gorevDurumDagilimi.Gecikti}
                </div>
                <div className="text-sm text-red-600">
                  {yuzdeler.Gecikti}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.push('/');
    } catch (error) {
      console.error('[AdminDashboardCharts]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.push('/');
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Üç katmanlı grafik verileri yükleniyor...</p>
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
              <Link
                href="/admin-dashboard"
                className="text-2xl font-bold text-blue-600 cursor-pointer font-[ 'Pacifico' ]"
              >
                logo
              </Link>
              <div className="flex items-center space-x-2 text-gray-600">
                <Link
                  href="/admin-dashboard"
                  className="hover:text-blue-600 cursor-pointer"
                >
                  Yönetim Paneli
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Üç Katmanlı Grafikler</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin-dashboard"
                className="text-gray-600 hover:text-blue-600 cursor-pointer"
              >
                Dashboard'a Dön
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Üç Katmanlı Proje Grafikleri</h1>
          <p className="text-gray-600">Firma performansları ve görev durum analizi</p>
        </div>

        <div className="space-y-8">
          {renderCubukGrafik()}
          {renderPastaGrafik()}

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📈 Genel İstatistikler</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {firmaGrafikleri.length}
                </div>
                <div className="text-sm text-blue-700">Aktif Firma</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {firmaGrafikleri.reduce((sum, f) => sum + f.TamamlananGorev, 0)}
                </div>
                <div className="text-sm text-green-700">Tamamlanan Görev</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {firmaGrafikleri.reduce((sum, f) => sum + f.ProjeKatilimi, 0)}
                </div>
                <div className="text-sm text-purple-700">Toplam Proje Katılımı</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {firmaGrafikleri.length > 0
                    ? Math.round(
                        firmaGrafikleri.reduce((sum, f) => sum + f.GenelIlerleme, 0) /
                          firmaGrafikleri.length
                      )
                    : 0}
                  %
                </div>
                <div className="text-sm text-orange-700">Ortalama İlerleme</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
