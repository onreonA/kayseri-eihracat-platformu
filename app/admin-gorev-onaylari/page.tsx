
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

// Supabase Service Imports
import { supabase } from '../../lib/supabase-services';

interface OnayBekleyenTalep {
  ID: number;
  GorevID: number;
  FirmaID: number;
  KullaniciAciklama: string;
  KanitDosyaURL?: string;
  KanitDosyaAdi?: string;
  TalepTarihi: Date;
  Durum: 'Beklemede' | 'Onaylandı' | 'Reddedildi';
  AdminCevapTarihi?: Date;
  AdminAciklama?: string;
  AdminPersonelID?: number;
  GorevBasligi: string;
  ProjeBasligi: string;
  FirmaAdi: string;
}

// 完全修复的Supabase集成服务
class SupabaseGorevOnaylariService {
  static checkConnection(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      if (!supabase) return false;

      const config = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      };

      if (!config.url || !config.key) return false;
      if (config.url === 'https://dummy-url-for-ssr.supabase.co') return false;

      return true;
    } catch (error) {
      console.error('检查Supabase连接错误:', error);
      return false;
    }
  }

  static async getOnayBekleyenTalepler(): Promise<OnayBekleyenTalep[]> {
    try {
      console.log('正在从Supabase获取待审批请求...');

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用 - 返回空列表');
        return [];
      }

      // ✅ DÜZELTME: Supabase'deki gerçek durum değerlerini kullan
      const { data: taleplerData, error: taleplerError } = await supabase
        .from('gorev_tamamlama_talepleri')
        .select(`
          id,
          gorev_id,
          firma_id,
          tamamlama_notu,
          dosya_linkleri,
          durum,
          created_at,
          updated_at
        `)
        .eq('durum', 'Onay Bekliyor')  // ✅ Supabase'deki değer ile aynı
        .order('created_at', { ascending: false });

      if (taleplerError) {
        console.error('Görev onay talepleri sorgu hatası:', taleplerError);
        console.log('⚠️ Görev onay talepleri tablosu henüz oluşturulmamış, boş liste döndürülüyor');
        return [];
      }

      if (!taleplerData || taleplerData.length === 0) {
        console.log('ℹ️ Supabase中未找到待审批请求');
        return [];
      }

      console.log(`✅ 从Supabase找到 ${taleplerData.length} 个待审批请求`);

      // Güvenli bir şekilde her talebi işle
      const zenginlestirilmisTalepler = await Promise.all(
        taleplerData.map(async (talep: any) => {
          try {
            // Görev bilgilerini al - hata yönetimi ile
            let gorevData = null;
            try {
              const { data: gorevResult, error: gorevError } = await supabase
                .from('gorevler')
                .select('id, proje_id, gorev_adi')
                .eq('id', talep.gorev_id)
                .maybeSingle();

              if (!gorevError && gorevResult) {
                gorevData = gorevResult;
              }
            } catch (gorevQueryError) {
              console.warn(`⚠️ 任务 ${talep.gorev_id} 查询错误:`, gorevQueryError);
            }

            // Proje bilgilerini al - hata yönetimi ile
            let projeData = null;
            if (gorevData?.proje_id) {
              try {
                const { data: projeResult, error: projeError } = await supabase
                  .from('projeler')
                  .select('id, proje_adi')
                  .eq('id', gorevData.proje_id)
                  .maybeSingle();

                if (!projeError && projeResult) {
                  projeData = projeResult;
                }
              } catch (projeQueryError) {
                console.warn(`⚠️ 项目 ${gorevData.proje_id} 查询错误:`, projeQueryError);
              }
            }

            // Firma bilgilerini al - hata yönetimi ile
            let firmaData = null;
            try {
              const { data: firmaResult, error: firmaError } = await supabase
                .from('firmalar')
                .select('id, firma_adi')
                .eq('id', talep.firma_id)
                .maybeSingle();

              if (!firmaError && firmaResult) {
                firmaData = firmaResult;
              }
            } catch (firmaQueryError) {
              console.warn(`⚠️ 公司 ${talep.firma_id} 查询错误:`, firmaQueryError);
            }

            // ✅ DÜZELTME: Durum dönüşümünü güvenli yap
            const durumDonusturulmus = this.normalizeDurum(talep.durum);

            // Güvenli bir şekilde return objesi oluştur
            return {
              ID: talep.id || 0,
              GorevID: talep.gorev_id || 0,
              FirmaID: talep.firma_id || 0,
              KullaniciAciklama: talep.tamamlama_notu || '',
              KanitDosyaURL: talep.dosya_linkleri || undefined,
              KanitDosyaAdi: talep.dosya_linkleri ? 'Dosya Mevcut' : undefined,
              TalepTarihi: new Date(talep.created_at || new Date()),
              Durum: durumDonusturulmus,
              AdminCevapTarihi: undefined,
              AdminAciklama: undefined,
              AdminPersonelID: undefined,
              GorevBasligi: gorevData?.gorev_adi || `Görev #${talep.gorev_id || 'Bilinmeyen'}`,
              ProjeBasligi: projeData?.proje_adi || 'Proje Bilgisi Alınamadı',
              FirmaAdi: firmaData?.firma_adi || `Firma #${talep.firma_id || 'Bilinmeyen'}`
            };

          } catch (itemProcessError) {
            console.warn('处理请求项时出错:', itemProcessError);

            // Hata durumunda bile temel veriyi döndür
            return {
              ID: talep.id || 0,
              GorevID: talep.gorev_id || 0,
              FirmaID: talep.firma_id || 0,
              KullaniciAciklama: talep.tamamlama_notu || '',
              KanitDosyaURL: talep.dosya_linkleri || undefined,
              KanitDosyaAdi: talep.dosya_linkleri ? 'Dosya Mevcut' : undefined,
              TalepTarihi: new Date(talep.created_at || new Date()),
              Durum: 'Beklemede' as 'Beklemede',
              AdminCevapTarihi: undefined,
              AdminAciklama: undefined,
              AdminPersonelID: undefined,
              GorevBasligi: 'Veri Yükleme Hatası',
              ProjeBasligi: 'Veri Yükleme Hatası',
              FirmaAdi: 'Veri Yükleme Hatası'
            };
          }
        })
      );

      // Null değerleri filtrele
      const gecerliTalepler = zenginlestirilmisTalepler.filter(talep => talep !== null) as OnayBekleyenTalep[];

      console.log(`✅ 成功处理了 ${gecerliTalepler.length} 个待审批请求`);
      return gecerliTalepler;

    } catch (error) {
      console.error('加载待审批请求时系统错误:', error);
      return [];
    }
  }

  // ✅ YENİ YÖNTEM: Durum değerlerini normalize et
  static normalizeDurum(supabaseDurum: string): 'Beklemede' | 'Onaylandı' | 'Reddedildi' {
    switch (supabaseDurum) {
      case 'Onay Bekliyor':
      case 'Beklemede':
        return 'Beklemede';
      case 'Onaylandı':
      case 'Onaylandi':
        return 'Onaylandı';
      case 'Reddedildi':
      case 'Red':
        return 'Reddedildi';
      default:
        console.warn(`⚠️ Bilinmeyen durum değeri: ${supabaseDurum}`);
        return 'Beklemede';
    }
  }

  static async getTalepDetay(talepId: number): Promise<OnayBekleyenTalep | null> {
    try {
      console.log(`🔍 正在获取请求详情: ${talepId}`);

      if (!this.checkConnection()) {
        console.warn('⚠️ Supabase连接不可用');
        return null;
      }

      const { data: talepData, error: talepError } = await supabase
        .from('gorev_tamamlama_talepleri')
        .select('*')
        .eq('id', talepId)
        .maybeSingle();

      if (talepError || !talepData) {
        console.error('❌ 未找到请求详情:', talepError?.message);
        return null;
      }

      // 安全地获取相关数据
      let gorevData = null;
      let projeData = null;
      let firmaData = null;

      try {
        const { data: gorevResult } = await supabase
          .from('gorevler')
          .select('id, proje_id, gorev_adi')
          .eq('id', talepData.gorev_id)
          .maybeSingle();
        gorevData = gorevResult;
      } catch (gorevError) {
        console.warn('⚠️ 无法获取任务信息:', gorevError);
      }

      if (gorevData?.proje_id) {
        try {
          const { data: projeResult } = await supabase
            .from('projeler')
            .select('id, proje_adi')
            .eq('id', gorevData.proje_id)
            .maybeSingle();
          projeData = projeResult;
        } catch (projeError) {
          console.warn('⚠️ 无法获取项目信息:', projeError);
        }
      }

      try {
        const { data: firmaResult } = await supabase
          .from('firmalar')
          .select('id, firma_adi')
          .eq('id', talepData.firma_id)
          .maybeSingle();
        firmaData = firmaResult;
      } catch (firmaError) {
        console.warn('⚠️ 无法获取公司信息:', firmaError);
      }

      return {
        ID: talepData.id,
        GorevID: talepData.gorev_id,
        FirmaID: talepData.firma_id,
        KullaniciAciklama: talepData.tamamlama_notu || '',
        KanitDosyaURL: talepData.dosya_linkleri,
        KanitDosyaAdi: talepData.dosya_linkleri ? 'Dosya Mevcut' : undefined,
        TalepTarihi: new Date(talepData.created_at),
        Durum: this.normalizeDurum(talepData.durum),
        AdminCevapTarihi: undefined,
        AdminAciklama: undefined,
        AdminPersonelID: undefined,
        GorevBasligi: gorevData?.gorev_adi || 'Bilinmeyen Görev',
        ProjeBasligi: projeData?.proje_adi || 'Bilinmeyen Proje',
        FirmaAdi: firmaData?.firma_adi || 'Bilinmeyen Firma'
      };

    } catch (error) {
      console.error('💥 加载请求详情时系统错误:', error);
      return null;
    }
  }

  static async updateTalep(talepId: number, updateData: {
    Durum: 'Onaylandı' | 'Reddedildi';
    AdminAciklama?: string;
    AdminPersonelID: number;
  }): Promise<boolean> {
    try {
      console.log(`🔄 正在更新请求: ${talepId}`, updateData);

      if (!this.checkConnection()) {
        console.warn('⚠️ Supabase连接不可用');
        return false;
      }

      // ✅ DÜZELTME: Doğru durum değerlerini kullan
      const supabaseDurum = updateData.Durum === 'Onaylandı' ? 'Onaylandı' : 'Reddedildi';

      const { error: updateError } = await supabase
        .from('gorev_tamamlama_talepleri')
        .update({
          durum: supabaseDurum, // ✅ Normalize edilmiş durum
          admin_aciklama: updateData.AdminAciklama,
          admin_personel_id: updateData.AdminPersonelID,
          admin_cevap_tarihi: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', talepId);

      if (updateError) {
        console.error('❌ 更新请求时出错:', updateError);
        return false;
      }

      // Onaylandıysa görev durumunu da güncelle
      if (updateData.Durum === 'Onaylandı') {
        try {
          // Önce talep bilgilerini al
          const { data: talepData } = await supabase
            .from('gorev_tamamlama_talepleri')
            .select('gorev_id')
            .eq('id', talepId)
            .single();

          if (talepData?.gorev_id) {
            // Görev durumunu "Tamamlandı" olarak güncelle  
            await supabase
              .from('gorevler')
              .update({
                durum: 'Tamamlandı',
                updated_at: new Date().toISOString()
              })
              .eq('id', talepData.gorev_id);

            console.log(`✅ 任务状态已更新 - 任务ID: ${talepData.gorev_id}`);
          }
        } catch (gorevUpdateError) {
          console.warn('⚠️ 更新任务状态时出错:', gorevUpdateError);
          // Ana işlem başarılı olduğu için true döndürmeye devam et
        }
      }

      console.log('✅ 请求更新成功');
      return true;

    } catch (error) {
      console.error('💥 更新请求时系统错误:', error);
      return false;
    }
  }
}

export default function AdminGorevOnaylariPage() {
  const [onayBekleyenTalepler, setOnayBekleyenTalepler] = useState<OnayBekleyenTalep[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedTalep, setSelectedTalep] = useState<OnayBekleyenTalep | null>(null);
  const [showDetayModal, setShowDetayModal] = useState(false);
  const [adminKarar, setAdminKarar] = useState<{
    karar: 'Onaylandı' | 'Reddedildi' | '';
    aciklama: string;
  }>({ karar: '', aciklama: '' });
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const router = useRouter();

  const menuItems = [
    {
      icon: 'ri-dashboard-line',
      label: 'Panel',
      href: '/admin-dashboard',
    },
    {
      icon: 'ri-building-line',
      label: 'Firma Yönetimi',
      href: '/admin-firmalar',
    },
    {
      icon: 'ri-project-line',
      label: 'Proje Yönetimi',
      href: '/admin-proje-yonetimi',
    },
    {
      icon: 'ri-check-double-line',
      label: 'Görev Onayları',
      href: '/admin-gorev-onaylari',
      active: true,
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
      icon: 'ri-file-text-line',
      label: 'Destek Dokümanları',
      href: '/admin-destek-dokumanlari',
    },
    {
      icon: 'ri-team-line',
      label: 'Kullanıcılar (Personel)',
      href: '/admin-kullanici-yonetimi',
    },
  ];

  useEffect(() => {
    setMounted(true);
    checkAdminAuth();
    // 检查Supabase连接状态
    setSupabaseConnected(SupabaseGorevOnaylariService.checkConnection());
  }, []);

  useEffect(() => {
    if (mounted) {
      loadOnayBekleyenTalepler();
    }
  }, [mounted]);

  // 清理LocalStorage和测试数据
  useEffect(() => {
    if (mounted) {
      try {
        // 清理测试数据
        const testKeys = [
          'test_gorev_onaylari',
          'mock_talepler',
          'admin_test_data',
          'cached_onay_talepleri'
        ];

        testKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        console.log('✅ 测试数据和缓存已清理');
      } catch (error) {
        console.warn('⚠️ 缓存清理错误:', error);
      }
    }
  }, [mounted]);

  const checkAdminAuth = async () => {
    try {
      // Önce localStorage kontrolü yap
      const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
      const adminToken = localStorage.getItem('admin_token');
      
      console.log('🔍 Admin kontrolü (Görev Onayları):', { isAdminLoggedIn, adminToken });
      
      if (isAdminLoggedIn === 'true' && adminToken) {
        console.log('✅ Admin girişi doğrulandı (Görev Onayları), veriler yükleniyor...');
        return;
      }

      // Fallback: Supabase kontrolü
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.log('❌ Supabase bağlantısı yok, login\'e yönlendiriliyor...');
        router.replace('/admin-login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ Supabase session yok, login\'e yönlendiriliyor...');
        router.replace('/admin-login');
        return;
      }
    } catch (error) {
      console.error('[AdminGorevOnaylari]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/admin-login');
    }
  };

  const loadOnayBekleyenTalepler = async () => {
    try {
      setLoading(true);
      console.log('正在加载待审批请求...');

      const talepler = await SupabaseGorevOnaylariService.getOnayBekleyenTalepler();
      setOnayBekleyenTalepler(talepler);

      console.log(`✅ ${talepler.length} 个请求已加载`);
    } catch (error) {
      console.error('❌ 加载待审批请求错误:', error);
      // 错误情况下设置空数组
      setOnayBekleyenTalepler([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTalepDetayGoster = async (talepId: number) => {
    try {
      console.log(`🔍 正在显示请求详情: ${talepId}`);

      const talepDetay = await SupabaseGorevOnaylariService.getTalepDetay(talepId);
      if (talepDetay) {
        setSelectedTalep(talepDetay);
        setShowDetayModal(true);
        setAdminKarar({ karar: '', aciklama: '' });
        console.log('✅ 请求详情已显示');
      } else {
        alert('Talep detayı bulunamadı.');
      }
    } catch (error) {
      console.error('❌ 加载请求详情错误:', error);
      alert('Talep detalles yüklenirken hata oluştu.');
    }
  };

  const handleKararVer = async () => {
    try {
      if (!selectedTalep || !adminKarar.karar) {
        alert('Lütfen karar seçiniz.');
        return;
      }

      if (adminKarar.karar === 'Reddedildi' && !adminKarar.aciklama.trim()) {
        alert('Red için açıklama zorunludur.');
        return;
      }

      console.log('⚖️ 正在做决定...', {
        talepId: selectedTalep.ID,
        karar: adminKarar.karar
      });

      const updateResult = await SupabaseGorevOnaylariService.updateTalep(selectedTalep.ID, {
        Durum: adminKarar.karar,
        AdminAciklama: adminKarar.aciklama || undefined,
        AdminPersonelID: 1 // 固定管理员ID（实际应用中应使用登录的管理员ID）
      });

      if (updateResult) {
        alert(`Görev tamamlama talebi ${adminKarar.karar === 'Onaylandı' ? 'onaylandı' : 'reddedildi'}.`);

        setShowDetayModal(false);
        setSelectedTalep(null);
        await loadOnayBekleyenTalepler(); // 刷新列表

        console.log('✅ 决定成功做出并列表已刷新');
      } else {
        alert('Karar verilirken hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('❌ 做决定错误:', error);
      alert('Karar verilirken hata oluştu.');
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Geçersiz tarih';
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('adminEmail');
      router.push('/admin-login');
    } catch (error) {
      console.error('[AdminGorevOnaylari]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.push('/admin-login');
    }
  };

  const getDosyaIcon = (dosyaAdi?: string) => {
    if (!dosyaAdi) return 'ri-file-line';

    const extension = dosyaAdi.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'ri-file-pdf-line';
      case 'doc':
      case 'docx':
        return 'ri-file-word-line';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'ri-image-line';
      default:
        return 'ri-file-line';
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-[\'Pacifico\']">
                logo
              </Link>
              <span className="text-gray-600">Yönetim Paneli</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Supabase连接状态 */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${supabaseConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                <span>{supabaseConnected ? 'Supabase Bağlı' : 'Çevrimdışı Mod'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <div className="w-64 bg-white shadow-lg h-screen sticky top-0">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Yönetim Menüsü</h2>
            <nav className="space-y-2">
              {menuItems.map((item, index) => (
                <Link
                  key={`menu-${index}-${item.href}`}
                  href={item.href}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${item.active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${item.icon} text-lg`}></i>
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Görev Onayları</h1>
                <p className="text-gray-600 mt-2">Firma görev tamamlama taleplerini inceleyin ve onaylayın</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                  <i className="ri-time-line mr-2"></i>
                  Onay Bekleyen: {onayBekleyenTalepler.length}
                </div>
              </div>
            </div>

            {/* Onay Bekleyen Talepler Listesi */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Onay Bekleyen Görev Tamamlama Talepleri</h2>

                {onayBekleyenTalepler.length > 0 ? (
                  <div className="space-y-4">
                    {onayBekleyenTalepler.map((talep, index) => (
                      <div key={`talep-${talep.ID}-${index}`} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                                {talep.ProjeBasligi}
                              </span>
                              <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                                {talep.FirmaAdi}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                              {talep.GorevBasligi}
                            </h3>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              <strong>Firma Açıklaması:</strong> {talep.KullaniciAciklama}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <i className="ri-calendar-line"></i>
                                <span>Talep: {formatDate(talep.TalepTarihi)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <i className="ri-building-line"></i>
                                <span>Firma ID: #{talep.FirmaID}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <i className="ri-task-line"></i>
                                <span>Görev ID: #{talep.GorevID}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {talep.KanitDosyaURL && (
                              <div className="flex items-center space-x-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                                <i className={getDosyaIcon(talep.KanitDosyaAdi)}></i>
                                <span>Dosya mevcut</span>
                              </div>
                            )}
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                              {talep.Durum}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            Talep ID: #{talep.ID}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleTalepDetayGoster(talep.ID)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
                            >
                              <i className="ri-eye-line"></i>
                              <span>İncele & Karar Ver</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-check-double-line text-gray-400 text-4xl"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Onay bekleyen talep yok</h3>
                    <p className="text-gray-600">Tüm görev tamamlama talepleri işlenmiş durumda.</p>
                    {/* Supabase连接信息 */}
                    <div className="mt-4 text-sm text-gray-500">
                      {supabaseConnected ? (
                        <div className="flex items-center justify-center space-x-2">
                          <i className="ri-database-2-line text-green-500"></i>
                          <span>Supabase veritabanına bağlı - Gerçek veriler gösteriliyor</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <i className="ri-wifi-off-line text-red-500"></i>
                          <span>Çevrimdışı mod - Veritabanı bağlantısı gerekiyor</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Talep Detay Modalı */}
      {showDetayModal && selectedTalep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Görev Tamamlama Talebi İncelemesi</h3>
              <button
                onClick={() => setShowDetayModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            {/* Talep Detayları */}
            <div className="space-y-6">
              {/* Proje ve Görev Bilgileri */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Proje & Görev Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Proje:</span>
                    <div className="font-medium text-gray-900">{selectedTalep.ProjeBasligi}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Görev:</span>
                    <div className="font-medium text-gray-900">{selectedTalep.GorevBasligi}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Firma:</span>
                    <div className="font-medium text-gray-900">{selectedTalep.FirmaAdi}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Talep Tarihi:</span>
                    <div className="font-medium text-gray-900">{formatDate(selectedTalep.TalepTarihi)}</div>
                  </div>
                </div>
              </div>

              {/* Firma Açıklaması */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Firma Açıklaması</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTalep.KullaniciAciklama}</p>
                </div>
              </div>

              {/* Kanıt Dosyası */}
              {selectedTalep.KanitDosyaURL && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Kanıt Dosyası</h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <i className={`${getDosyaIcon(selectedTalep.KanitDosyaAdi)} text-green-600 text-lg`}></i>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{selectedTalep.KanitDosyaAdi}</p>
                        <p className="text-sm text-gray-600">Kanıt dosyası mevcut</p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <i className="ri-download-line mr-1"></i>
                        İndir
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Yönetici Kararı */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Yönetici Kararı</h4>

                <div className="space-y-4">
                  {/* Karar Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Karar <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="adminKarar"
                          value="Onaylandı"
                          checked={adminKarar.karar === 'Onaylandı'}
                          onChange={(e) => setAdminKarar(prev => ({ ...prev, karar: e.target.value as 'Onaylandı' }))}
                          className="mr-2"
                        />
                        <span className="text-green-700 font-medium">
                          <i className="ri-check-circle-line mr-1"></i>
                          Onayla
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="adminKarar"
                          value="Reddedildi"
                          checked={adminKarar.karar === 'Reddedildi'}
                          onChange={(e) => setAdminKarar(prev => ({ ...prev, karar: e.target.value as 'Reddedildi' }))}
                          className="mr-2"
                        />
                        <span className="text-red-700 font-medium">
                          <i className="ri-close-circle-line mr-1"></i>
                          Reddet
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Yönetici Yorumu */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Açıklama {adminKarar.karar === 'Reddedildi' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={adminKarar.aciklama}
                      onChange={(e) => setAdminKarar(prev => ({ ...prev, aciklama: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder={adminKarar.karar === 'Onaylandı'
                        ? 'Görev başarıyla tamamlanmıştır. (İsteğe bağlı açıklama)'
                        : 'Lütfen red sebebini açıklayın...'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Alt Kısmı */}
            <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowDetayModal(false)}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleKararVer}
                disabled={!adminKarar.karar || (adminKarar.karar === 'Reddedildi' && !adminKarar.aciklama.trim())}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors cursor-pointer ${adminKarar.karar && (adminKarar.karar !== 'Reddedildi' || adminKarar.aciklama.trim())
                  ? adminKarar.karar === 'Onaylandı'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {adminKarar.karar === 'Onaylandı' ? (
                  <>
                    <i className="ri-check-circle-line mr-2"></i>
                    Görevi Onayla
                  </>
                ) : adminKarar.karar === 'Reddedildi' ? (
                  <>
                    <i className="ri-close-circle-line mr-2"></i>
                    Görevi Reddet
                  </>
                ) : (
                  'Karar Ver'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
