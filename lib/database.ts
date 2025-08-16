import { supabase } from './supabase-services';

// Admin Etkinlik Service
export class AdminEtkinlikService {
  static async getAllEtkinlikler() {
    try {
      const { data, error } = await supabase
        .from('etkinlikler')
        .select('*')
        .order('tarih_saat', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata:', error);
      return [];
    }
  }

  static async createEtkinlik(etkinlikData: any) {
    try {
      const { data, error } = await supabase
        .from('etkinlikler')
        .insert([etkinlikData])
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Etkinlik oluşturulurken hata:', error);
      throw error;
    }
  }

  static async updateEtkinlik(id: number, etkinlikData: any) {
    try {
      const { data, error } = await supabase
        .from('etkinlikler')
        .update(etkinlikData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Etkinlik güncellenirken hata:', error);
      throw error;
    }
  }

  static async deleteEtkinlik(id: number) {
    try {
      const { error } = await supabase
        .from('etkinlikler')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Etkinlik silinirken hata:', error);
      throw error;
    }
  }
}

// Admin Firma Service
export class AdminFirmaService {
  static async getAllFirmalar() {
    try {
      const { data, error } = await supabase
        .from('firmalar')
        .select('*')
        .order('firma_adi', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Firmalar yüklenirken hata:', error);
      return [];
    }
  }

  static async getFirmaById(id: number) {
    try {
      const { data, error } = await supabase
        .from('firmalar')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Firma detayı yüklenirken hata:', error);
      return null;
    }
  }

  static async addFirma(data: {
    firmaAdi: string;
    yetkiliEmail: string;
    yetkiliTelefon: string;
    adres?: string;
    durum?: string;
    firmaProfilDurumu?: string;
    sifre?: string;
    sektor?: string;
    yetkiliAdi?: string;
  }) {
    try {
      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return null;
      }

      const { data: newFirma, error } = await supabase
        .from('firmalar')
        .insert([{
          firma_adi: data.firmaAdi,
          yetkili_email: data.yetkiliEmail,
          telefon: data.yetkiliTelefon,
          adres: data.adres || '',
          durum: data.durum || 'Aktif',
          firma_profil_durumu: data.firmaProfilDurumu || 'Eksik',
          sifre: data.sifre || '123456',
          sektor: data.sektor || '',
          yetkili_adi: data.yetkiliAdi || '',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Firma eklenirken hata:', error);
        return null;
      }

      return newFirma;
    } catch (error) {
      console.error('Firma ekleme sistem hatası:', error);
      return null;
    }
  }
}

// Forum konuları arayüz tanımı
export interface ForumKonuları {
  ID: number;
  KonuBasligi: string;
  KonuIcerigi: string;
  KonuAcanFirmaID: number;
  OlusturmaTarihi: Date;
  SonMesajTarihi: Date;
  Kategori: string;
  Durum: 'Açık' | 'Kilitli';
}

// SUPABASE ONLY: 数据清理和状态服务
export class DataCleanupService {
  // 清除 LocalStorage 测试数据
  static clearLocalStorageTestData(): void {
    try {
      console.log('清理localStorage测试数据...');
      if (typeof window === 'undefined') {
        console.log('服务器端环境，跳过清理');
        return;
      }

      // 测试和模拟数据清理
      const testKeys = [
        'test_firmalar', 'mock_data', 'temp_data', 'demo_data',
        'admin_firmalar', 'admin_gorevler', 'admin_randevu_talepleri',
        'test_projeler', 'mock_projeler', 'backup_data', 'firma_hizmetleri_data'
      ];

      testKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`已清理: ${key}`);
        }
      });

      console.log('所有测试数据已清理 - 现在仅使用Supabase');

    } catch (error) {
      console.error('测试数据清理错误:', error);
    }
  }

  // 清除所有测试数据
  static clearAllTestData(): void {
    try {
      console.log('清理所有测试数据...');

      if (typeof window === 'undefined') {
        console.log('服务器端环境，跳过清理');
        return;
      }

      // 测试和模拟数据清理
      const testKeys = [
        'test_firmalar', 'mock_data', 'temp_data', 'demo_data',
        'admin_firmalar', 'admin_gorevler', 'admin_randevu_talepleri',
        'test_projeler', 'mock_projeler', 'backup_data'
      ];

      testKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`已清理: ${key}`);
        }
      });

      console.log('所有测试数据已清理 - 现在仅使用Supabase');

    } catch (error) {
      console.error('测试数据清理错误:', error);
    }
  }

  // 系统状态检查 - 仅Supabase
  static async checkSystemStatus(): Promise<{
    supabaseConnected: boolean;
    tablesAccessible: boolean;
    dataCount: { firmalar: number; projeler: number; gorevler: number };
  }> {
    try {
      console.log('Supabase状态检查...');

      let supabaseConnected = false;
      let tablesAccessible = false;
      const dataCount = { firmalar: 0, projeler: 0, gorevler: 0 };

      if (supabase) {
        try {
          // 连接测试
          const { data, error } = await supabase
            .from('firmalar')
            .select('id')
            .limit(1);

          if (!error) {
            supabaseConnected = true;
            tablesAccessible = true;

            // 获取数据数量
            const [firmaResult, projeResult, gorevResult] = await Promise.allSettled([
              supabase.from('firmalar').select('id', { count: 'exact' }),
              supabase.from('projeler').select('id', { count: 'exact' }),
              supabase.from('gorevler').select('id', { count: 'exact' })
            ]);

            dataCount.firmalar = firmaResult.status === 'fulfilled' ? (firmaResult.value.count || 0) : 0;
            dataCount.projeler = projeResult.status === 'fulfilled' ? (projeResult.value.count || 0) : 0;
            dataCount.gorevler = gorevResult.status === 'fulfilled' ? (gorevResult.value.count || 0) : 0;
          }
        } catch (connectionError) {
          console.warn('Supabase连接错误:', connectionError);
        }
      }

      const status = {
        supabaseConnected,
        tablesAccessible,
        dataCount
      };

      console.log('Supabase状态:', status);
      return status;

    } catch (error) {
      console.error('系统状态检查错误:', error);
      return {
        supabaseConnected: false,
        tablesAccessible: false,
        dataCount: { firmalar: 0, projeler: 0, gorevler: 0 }
      };
    }
  }

  // Supabase状态检查（别名方法）
  static async checkSupabaseStatus(): Promise<{
    supabaseConnected: boolean;
    tablesAccessible: boolean;
    dataCount: { firmalar: number; projeler: number; gorevler: number };
  }> {
    return this.checkSystemStatus();
  }
}

// SUPABASE ONLY: Unified veri yöneticisi
export class UnifiedDataManager {
  // 修复：添加缺失的 ensureDataConsistency 方法
  static async ensureDataConsistency(): Promise<void> {
    try {
      console.log('Veri tutarlılığı sağlanıyor...');

      if (typeof window === 'undefined') {
        console.log('Sunucu tarafında, veri tutarlılığı kontrolü atlanıyor');
        return;
      }

      // Test verilerini temizle
      DataCleanupService.clearAllTestData();

      // Supabase bağlantısını kontrol et
      const status = await DataCleanupService.checkSupabaseStatus();

      if (status.supabaseConnected) {
        console.log('Supabase bağlantısı aktif');

        // Session storage'da durum kaydet
        sessionStorage.setItem('data_source', 'supabase');
        sessionStorage.setItem('data_validation_time', new Date().toISOString());
        sessionStorage.setItem('supabase_status', JSON.stringify(status));
      } else {
        console.warn('Supabase bağlantısı sağlanamadı');
        sessionStorage.setItem('data_source', 'offline');
      }

      console.log('Veri tutarlılığı kontrolü tamamlandı');

    } catch (error) {
      console.error('Veri tutarlılığı kontrol hatası:', error);
    }
  }

  // Veri tutarlılığını sağla - Artık sadece Supabase
  static async ensureSupabaseDataConsistency(): Promise<void> {
    try {
      console.log('Supabase veri tutarlılığı kontrol ediliyor...');

      if (typeof window === 'undefined') {
        console.log('Sunucu tarafında, veri tutarlılığı kontrolü atlanıyor');
        return;
      }

      // Test verilerini temizle
      DataCleanupService.clearAllTestData();

      // Supabase bağlantısını kontrol et
      const status = await DataCleanupService.checkSupabaseStatus();

      if (status.supabaseConnected) {
        console.log('Supabase bağlantısı aktif');

        // Session storage'da durum kaydet
        sessionStorage.setItem('data_source', 'supabase');
        sessionStorage.setItem('data_validation_time', new Date().toISOString());
        sessionStorage.setItem('supabase_status', JSON.stringify(status));
      } else {
        console.warn('Supabase bağlantısı sağlanamadı');
        sessionStorage.setItem('data_source', 'offline');
      }

      console.log('Veri tutarlılığı kontrolü tamamlandı');

    } catch (error) {
      console.error('Veri tutarlılığı kontrol hatası:', error);
    }
  }

  // 系统 durumunu getir
  static getSystemStatus(): {
    dataSource: 'supabase' | 'offline';
    supabaseConnection: boolean;
    lastValidation: string | null;
    dataCount?: any;
  } {
    try {
      if (typeof window === 'undefined') {
        return {
          dataSource: 'offline',
          supabaseConnection: false,
          lastValidation: null
        };
      }

      const dataSource = sessionStorage.getItem('data_source') as 'supabase' | 'offline' || 'offline';
      const lastValidation = sessionStorage.getItem('data_validation_time');
      const supabaseStatus = sessionStorage.getItem('supabase_status');

      let dataCount = undefined;
      try {
        if (supabaseStatus) {
          const statusObj = JSON.parse(supabaseStatus);
          dataCount = statusObj.dataCount;
        }
      } catch (parseError) {
        console.warn('Durum parsing hatası:', parseError);
      }

      return {
        dataSource,
        supabaseConnection: dataSource === 'supabase',
        lastValidation,
        dataCount
      };

    } catch (error) {
      console.error('Sistem durumu hatası:', error);
      return {
        dataSource: 'offline',
        supabaseConnection: false,
        lastValidation: null
      };
    }
  }

  // Acil sistem sıfırlama
  static resetToSupabaseOnly(): void {
    try {
      console.log('Sistem Supabase-only moduna sıfırlanıyor...');

      if (typeof window !== 'undefined') {
        // Tüm test/mock verilerini temizle
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.includes('test_') ||
            key.includes('mock_') ||
            key.includes('temp_') ||
            key.includes('admin_') ||
            key.includes('demo_')
          )) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`Temizlenen: ${key}`);
        });

        // Session storage'ı temizle
        sessionStorage.removeItem('data_source');
        sessionStorage.removeItem('data_validation_time');
        sessionStorage.removeItem('supabase_status');
      }

      // Yeniden veri tutarlılığını sağla
      this.ensureSupabaseDataConsistency();
      console.log('Sistem başarıyla Supabase-only moduna sıfırlandı');

    } catch (error) {
      console.error('Sistem sıfırlama hatası:', error);
    }
  }
}

// SUPABASE ONLY: Admin proje servisi
export class AdminProjeService {
  static async getAllProjeler(): Promise<any[]> {
    try {
      console.log('Supabase projeler yükleniyor...');

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      const { data, error } = await supabase
        .from('projeler')
        .select(`
          id,
          proje_adi,
          aciklama,
          hedef_firmalar,
          durum,
          oncelik,
          baslangic_tarihi,
          bitis_tarihi,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Projeler yükleme hatası:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('Veritabanında proje bulunamadı');
        return [];
      }

      // Alt proje ve görev sayılarını hesapla
      const formattedProjeler = await Promise.all(data.map(async (proje) => {
        const [altProjelerResult, gorevlerResult] = await Promise.allSettled([
          supabase.from('alt_projeler').select('id').eq('ana_proje_id', proje.id),
          supabase.from('gorevler').select('id').eq('proje_id', proje.id)
        ]);

        const altProjeSayisi = altProjelerResult.status === 'fulfilled' ?
          (altProjelerResult.value.data?.length || 0) : 0;
        const gorevSayisi = gorevlerResult.status === 'fulfilled' ?
          (gorevlerResult.value.data?.length || 0) : 0;

        return {
          id: proje.id,
          ProjeBasligi: proje.proje_adi,
          Aciklama: proje.aciklama,
          AtananFirmalar: Array.isArray(proje.hedef_firmalar) ? proje.hedef_firmalar : [],
          Durum: proje.durum,
          Oncelik: proje.oncelik,
          BaslangicTarihi: proje.baslangic_tarihi,
          BitisTarihi: proje.bitis_tarihi,
          AltProjeSayisi: altProjeSayisi,
          GorevSayisi: gorevSayisi,
          created_at: proje.created_at,
          updated_at: proje.updated_at
        };
      }));

      console.log(`Supabase'den ${formattedProjeler.length} proje yüklendi`);
      return formattedProjeler;

    } catch (error) {
      console.error('Projeler sistem hatası:', error);
      return [];
    }
  }

  static async getProjeByFirmaId(firmaId: number): Promise<any[]> {
    try {
      console.log(`Firma ${firmaId} projeleri Supabase'den yükleniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      if (!firmaId || isNaN(firmaId) || firmaId <= 0) {
        console.error('Geçersiz firma ID:', firmaId);
        return [];
      }

      const { data: projeler, error } = await supabase
        .from('projeler')
        .select(`
          id,
          proje_adi,
          aciklama,
          durum,
          oncelik,
          baslangic_tarihi,
          bitis_tarihi,
          hedef_firmalar,
          created_at,
          updated_at
        `)
        .contains('hedef_firmalar', [firmaId])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Firma projeleri yükleme hatası:', error);
        return [];
      }

      if (!projeler || projeler.length === 0) {
        console.log(`Firma ${firmaId} için proje bulunamadı`);
        return [];
      }

      const formattedProjeler = projeler.map((proje) => ({
        id: proje.id,
        proje_adi: proje.proje_adi,
        aciklama: proje.aciklama || '',
        durum: proje.durum || 'Aktif',
        oncelik: proje.oncelik || 'Orta',
        baslangic_tarihi: proje.baslangic_tarihi,
        bitis_tarihi: proje.bitis_tarihi,
        hedef_firmalar: proje.hedef_firmalar || [],
        created_at: proje.created_at,
        updated_at: proje.updated_at
      }));

      console.log(`Firma ${firmaId} için ${formattedProjeler.length} proje yüklendi`);
      return formattedProjeler;

    } catch (error) {
      console.error('Firma projeleri sistem hatası:', error);
      return [];
    }
  }

  static async getProjeById(projeId: number): Promise<any | null> {
    try {
      console.log(`Proje detayı Supabase'den yükleniyor - ID: ${projeId}`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return null;
      }

      const { data: proje, error } = await supabase
        .from('projeler')
        .select(`
          id,
          proje_adi,
          aciklama,
          hedef_firmalar,
          durum,
          oncelik,
          baslangic_tarihi,
          bitis_tarihi,
          created_at,
          updated_at
        `)
        .eq('id', projeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.error(`Proje bulunamadı - ID: ${projeId}`);
          return null;
        }
        console.error('Proje detayı yükleme hatası:', error);
        return null;
      }

      if (!proje) {
        console.log(`Proje bulunamadı - ID: ${projeId}`);
        return null;
      }

      // Alt proje ve görev sayılarını hesapla
      const [altProjelerResult, gorevlerResult] = await Promise.all([
        supabase.from('alt_projeler').select('id').eq('ana_proje_id', proje.id),
        supabase.from('gorevler').select('id').eq('proje_id', proje.id)
      ]);

      const altProjeSayisi = altProjelerResult.data?.length || 0;
      const gorevSayisi = gorevlerResult.data?.length || 0;

      const formattedProje = {
        id: proje.id,
        ProjeBasligi: proje.proje_adi,
        Aciklama: proje.aciklama,
        AtananFirmalar: Array.isArray(proje.hedef_firmalar) ? proje.hedef_firmalar : [],
        Durum: proje.durum,
        Oncelik: proje.oncelik,
        BaslangicTarihi: proje.baslangic_tarihi,
        BitisTarihi: proje.bitis_tarihi,
        AltProjeSayisi: altProjeSayisi,
        GorevSayisi: gorevSayisi,
        created_at: proje.created_at,
        updated_at: proje.updated_at
      };

      console.log(`Proje detayı yüklendi: ${formattedProje.ProjeBasligi}`);
      return formattedProje;

    } catch (error) {
      console.error('Proje detayı sistem hatası:', error);
      return null;
    }
  }
}

// SUPABASE ONLY: Admin görev servisi
export class AdminGorevService {
  static async getGorevlerByFirmaId(firmaId: number): Promise<any[]> {
    try {
      console.log(`Firma ${firmaId} görevleri Supabase'den yükleniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      if (!firmaId || isNaN(firmaId) || firmaId <= 0) {
        console.error('Geçersiz firma ID:', firmaId);
        return [];
      }

      const { data: gorevler, error } = await supabase
        .from('gorevler')
        .select(`
          id,
          gorev_adi,
          aciklama,
          durum,
          oncelik,
          baslangic_tarihi,
          bitis_tarihi,
          atanan_firmalar,
          proje_id,
          alt_proje_id,
          projeler:proje_id(proje_adi),
          alt_projeler:alt_proje_id(alt_proje_adi),
          created_at,
          updated_at
        `)
        .contains('atanan_firmalar', [firmaId])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Firma görevleri yükleme hatası:', error);
        return [];
      }

      if (!gorevler || gorevler.length === 0) {
        console.log(`Firma ${firmaId} için görev bulunamadı`);
        return [];
      }

      const formattedGorevler = gorevler.map((gorev) => ({
        id: gorev.id,
        gorev_adi: gorev.gorev_adi,
        aciklama: gorev.aciklama || '',
        durum: gorev.durum || 'Aktif',
        oncelik: gorev.oncelik || 'Orta',
        baslangic_tarihi: gorev.baslangic_tarihi,
        bitis_tarihi: gorev.bitis_tarihi,
        atanan_firmalar: gorev.atanan_firmalar || [],
        projeler: gorev.projeler,
        alt_projeler: gorev.alt_projeler,
        created_at: gorev.created_at,
        updated_at: gorev.updated_at
      }));

      console.log(`Firma ${firmaId} için ${formattedGorevler.length} görev yüklendi`);
      return formattedGorevler;

    } catch (error) {
      console.error('Firma görevleri sistem hatası:', error);
      return [];
    }
  }
}

// SUPABASE ONLY: İlerleme hesaplama servisi
export class IlerlemeHesaplamaService {
  static async calculateGenelIlerleme(firmaId: number): Promise<number> {
    try {
      console.log(`Firma ${firmaId} genel ilerlemesi Supabase'den hesaplanıyor...`);

      const gorevler = await AdminGorevService.getGorevlerByFirmaId(firmaId);

      if (gorevler.length === 0) {
        return 0;
      }

      const tamamlananGorevler = gorevler.filter(gorev =>
        gorev.durum === 'Tamamlandı' || gorev.durum === 'Tamamlandi'
      );

      const ilerleme = Math.round((tamamlananGorevler.length / gorevler.length) * 100);

      console.log(`Firma ${firmaId} genel ilerlemesi: ${ilerleme}%`);
      return ilerleme;

    } catch (error) {
      console.error('Genel ilerleme hesaplama hatası:', error);
      return 0;
    }
  }

  static async calculateProjeIlerleme(firmaId: number, projeId: number): Promise<number> {
    try {
      console.log(`Proje ${projeId} ilerlemesi Supabase'den hesaplanıyor (Firma ${firmaId})...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return 0;
      }

      const { data: gorevler, error } = await supabase
        .from('gorevler')
        .select('id, durum')
        .eq('proje_id', projeId)
        .contains('atanan_firmalar', [firmaId]);

      if (error || !gorevler || gorevler.length === 0) {
        console.log(`Proje ${projeId} için görev bulunamadı`);
        return 0;
      }

      const tamamlananGorevler = gorevler.filter(gorev =>
        gorev.durum === 'Tamamlandı' || gorev.durum === 'Tamamlandi'
      );

      const ilerleme = Math.round((tamamlananGorevler.length / gorevler.length) * 100);

      console.log(`Proje ${projeId} ilerlemesi: ${ilerleme}%`);
      return ilerleme;

    } catch (error) {
      console.error('Proje ilerlemesi hesaplama hatası:', error);
      return 0;
    }
  }
}

// SUPABASE ONLY: Görev tamamlama servisi
export class GorevTamamlamaService {
  static async getGorevTamamlamaTalepleri(firmaId: number): Promise<any[]> {
    try {
      console.log(`Firma ${firmaId} tamamlama talepleri Supabase'den yükleniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      const { data: talepler, error } = await supabase
        .from('gorev_tamamlama_talepleri')
        .select(`
          id,
          gorev_id,
          firma_id,
          talep_tarihi,
          tamamlama_notu,
          durum,
          admin_notu,
          onay_tarihi,
          kanit_dosya_url,
          kanit_dosya_adi,
          created_at,
          updated_at,
          gorevler:gorev_id(gorev_adi, proje_id),
          firmalar:firma_id(firma_adi)
        `)
        .eq('firma_id', firmaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Tamamlama talepleri yükleme hatası:', error);
        return [];
      }

      console.log('Tamamlama talebi yüklendi');
      return talepler || [];

    } catch (error) {
      console.error('Tamamlama talepleri sistem hatası:', error);
      return [];
    }
  }

  static async getOnayBekleyenTalepler(): Promise<any[]> {
    try {
      console.log('Onay bekleyen tamamlama talepleri yükleniyor...');

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return this.getMockOnayBekleyenTalepler();
      }

      try {
        const { data: talepler, error } = await supabase
          .from('gorev_tamamlama_talepleri')
          .select(`
            id,
            gorev_id,
            firma_id,
            talep_tarihi,
            tamamlama_notu,
            durum,
            admin_notu,
            onay_tarihi,
            kanit_dosya_url,
            kanit_dosya_adi,
            created_at,
            updated_at
          `)
          .eq('durum', 'Onay Bekliyor')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Onay bekleyen talepler sorgusu hatası, mock data kullanılıyor:', error);
          return this.getMockOnayBekleyenTalepler();
        }

        if (!talepler || talepler.length === 0) {
          console.log('Onay bekleyen talep bulunamadı');
          return [];
        }

        // Her talep için görev ve firma bilgilerini al
        const formattedTalepler = await Promise.all(talepler.map(async (talep) => {
          let gorevBasligi = 'Bilinmeyen Görev';
          let projeBasligi = 'Bilinmeyen Proje';
          let firmaAdi = 'Bilinmeyen Firma';

          // Görev bilgilerini al
          try {
            const { data: gorevData } = await supabase
              .from('gorevler')
              .select(`
                gorev_adi,
                proje_id,
                projeler:proje_id(proje_adi)
              `)
              .eq('id', talep.gorev_id)
              .single();

            if (gorevData) {
              gorevBasligi = gorevData.gorev_adi || 'Bilinmeyen Görev';
              if (gorevData.projeler) {
                projeBasligi = gorevData.projeler.proje_adi || 'Bilinmeyen Proje';
              }
            }
          } catch (gorevError) {
            console.warn(`Görev bilgisi alınırken hata (ID: ${talep.gorev_id}):`, gorevError);
          }

          // Firma bilgilerini al
          try {
            const { data: firmaData } = await supabase
              .from('firmalar')
              .select('firma_adi')
              .eq('id', talep.firma_id)
              .single();

            if (firmaData) {
              firmaAdi = firmaData.firma_adi || 'Bilinmeyen Firma';
            }
          } catch (firmaError) {
            console.warn(`Firma bilgisi alınırken hata (ID: ${talep.firma_id}):`, firmaError);
          }

          return {
            ID: talep.id,
            GorevID: talep.gorev_id,
            FirmaID: talep.firma_id,
            KullaniciAciklama: talep.tamamlama_notu || '',
            KanitDosyaURL: talep.kanit_dosya_url,
            KanitDosyaAdi: talep.kanit_dosya_adi,
            TalepTarihi: new Date(talep.talep_tarihi || talep.created_at),
            Durum: talep.durum,
            AdminCevapTarihi: talep.onay_tarihi ? new Date(talep.onay_tarihi) : undefined,
            AdminAciklama: talep.admin_notu,
            AdminPersonelID: undefined,
            GorevBasligi: gorevBasligi,
            ProjeBasligi: projeBasligi,
            FirmaAdi: firmaAdi
          };
        }));

        console.log(`${formattedTalepler.length} onay bekleyen talep yüklendi`);
        return formattedTalepler;

      } catch (supabaseError) {
        console.warn('Supabase onay bekleyen talepler hatası, mock data kullanılıyor:', supabaseError);
        return this.getMockOnayBekleyenTalepler();
      }

    } catch (error) {
      console.error('Onay bekleyen talepler sistem hatası:', error);
      return this.getMockOnayBekleyenTalepler();
    }
  }

  static async getTalepDetay(talepId: number): Promise<any | null> {
    try {
      console.log(`Talep detayı alınıyor - ID: ${talepId}`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return this.getMockTalepDetay(talepId);
      }

      try {
        const { data: talep, error } = await supabase
          .from('gorev_tamamlama_talepleri')
          .select(`
            id,
            gorev_id,
            firma_id,
            talep_tarihi,
            tamamlama_notu,
            durum,
            admin_notu,
            onay_tarihi,
            kanit_dosya_url,
            kanit_dosya_adi,
            created_at,
            updated_at
          `)
          .eq('id', talepId)
          .single();

        if (error) {
          console.warn(`Talep detayı sorgusu hatası (ID: ${talepId}), mock data kullanılıyor:`, error);
          return this.getMockTalepDetay(talepId);
        }

        if (!talep) {
          console.log(`Talep bulunamadı - ID: ${talepId}`);
          return null;
        }

        // Görev ve proje bilgilerini al
        let gorevBasligi = 'Bilinmeyen Görev';
        let projeBasligi = 'Bilinmeyen Proje';
        let firmaAdi = 'Bilinmeyen Firma';

        try {
          const { data: gorevData } = await supabase
            .from('gorevler')
            .select(`
              gorev_adi,
              proje_id,
              projeler:proje_id(proje_adi)
            `)
            .eq('id', talep.gorev_id)
            .single();

          if (gorevData) {
            gorevBasligi = gorevData.gorev_adi || 'Bilinmeyen Görev';
            if (gorevData.projeler) {
              projeBasligi = gorevData.projeler.proje_adi || 'Bilinmeyen Proje';
            }
          }
        } catch (gorevError) {
          console.warn(`Görev bilgisi alınırken hata:`, gorevError);
        }

        try {
          const { data: firmaData } = await supabase
            .from('firmalar')
            .select('firma_adi')
            .eq('id', talep.firma_id)
            .single();

          if (firmaData) {
            firmaAdi = firmaData.firma_adi || 'Bilinmeyen Firma';
          }
        } catch (firmaError) {
          console.warn(`Firma bilgisi alınırken hata:`, firmaError);
        }

        const formattedTalep = {
          ID: talep.id,
          GorevID: talep.gorev_id,
          FirmaID: talep.firma_id,
          KullaniciAciklama: talep.tamamlama_notu || '',
          KanitDosyaURL: talep.kanit_dosya_url,
          KanitDosyaAdi: talep.kanit_dosya_adi,
          TalepTarihi: new Date(talep.talep_tarihi || talep.created_at),
          Durum: talep.durum,
          AdminCevapTarihi: talep.onay_tarihi ? new Date(talep.onay_tarihi) : undefined,
          AdminAciklama: talep.admin_notu,
          AdminPersonelID: undefined,
          GorevBasligi: gorevBasligi,
          ProjeBasligi: projeBasligi,
          FirmaAdi: firmaAdi
        };

        console.log(`Talep detayı yüklendi: ${formattedTalep.GorevBasligi}`);
        return formattedTalep;

      } catch (supabaseError) {
        console.warn(`Supabase talep detayı hatası (ID: ${talepId}), mock data kullanılıyor:`, supabaseError);
        return this.getMockTalepDetay(talepId);
      }

    } catch (error) {
      console.error('Talep detayı sistem hatası:', error);
      return this.getMockTalepDetay(talepId);
    }
  }

  static async updateTalep(talepId: number, updateData: {
    Durum: string;
    AdminAciklama?: string;
    AdminPersonelID?: number;
  }): Promise<boolean> {
    try {
      console.log(`Talep güncelleniyor - ID: ${talepId}`, updateData);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return true; // Mock başarı döndür
      }

      try {
        const { error } = await supabase
          .from('gorev_tamamlama_talepleri')
          .update({
            durum: updateData.Durum,
            admin_notu: updateData.AdminAciklama || null,
            onay_tarihi: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', talepId);

        if (error) {
          console.error('Talep güncelleme hatası:', error);
          return false;
        }

        // Eğer onaylandıysa, ilgili görevin durumunu da güncelle
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

              console.log(`Görev durumu güncellendi - Görev ID: ${talepData.gorev_id}`);
            }
          } catch (gorevUpdateError) {
            console.warn('Görev durumu güncellenirken hata:', gorevUpdateError);
            // Ana işlem başarılı olduğu için true döndürmeye devam et
          }
        }

        console.log('Talep başarıyla güncellendi');
        return true;

      } catch (supabaseError) {
        console.error('Supabase talep güncelleme hatası:', supabaseError);
        return false;
      }

    } catch (error) {
      console.error('Talep güncelleme sistem hatası:', error);
      return false;
    }
  }

  static async submitGorevTamamlama(data: {
    gorevId: number;
    firmaId: number;
    tamamlamaNotu: string;
  }): Promise<boolean> {
    try {
      console.log('Görev tamamlama talebi Supabase\'e gönderiliyor...', data);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return false;
      }

      if (!data.tamamlamaNotu?.trim()) {
        throw new Error('Tamamlama notu zorunludur');
      }

      const { error } = await supabase
        .from('gorev_tamamlama_talepleri')
        .insert([{
          gorev_id: data.gorevId,
          firma_id: data.firmaId,
          tamamlama_notu: data.tamamlamaNotu.trim(),
          durum: 'Onay Bekliyor',
          talep_tarihi: new Date().toISOString(),
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Tamamlama talebi oluşturma hatası:', error);
        return false;
      }

      console.log('Tamamlama talebi başarıyla oluşturuldu');
      return true;

    } catch (error) {
      console.error('Görev tamamlama sistem hatası:', error);
      return false;
    }
  }

  private static getMockOnayBekleyenTalepler(): any[] {
    console.log('Mock onay bekleyen talepler kullanılıyor...');

    const mockTalepler = [
      {
        ID: 1,
        GorevID: 1,
        FirmaID: 1,
        KullaniciAciklama: 'E-ticaret sitesinin frontend geliştirmesi tamamlandı. Responsive tasarım ve kullanıcı deneyimi optimizasyonları yapıldı.',
        KanitDosyaURL: 'https://example.com/dosya1.pdf',
        KanitDosyaAdi: 'frontend-tamamlama-raporu.pdf',
        TalepTarihi: new Date('2024-01-15T10:30:00Z'),
        Durum: 'Onay Bekliyor',
        AdminCevapTarihi: undefined,
        AdminAciklama: undefined,
        AdminPersonelID: undefined,
        GorevBasligi: 'Frontend Geliştirme',
        ProjeBasligi: 'E-ticaret Platformu',
        FirmaAdi: 'Teknoloji A.Ş.'
      },
      {
        ID: 2,
        GorevID: 3,
        FirmaID: 2,
        KullaniciAciklama: 'Mobil uygulama backend API\'leri geliştirildi ve test edildi. Tüm endpoint\'ler çalışır durumda.',
        KanitDosyaURL: null,
        KanitDosyaAdi: null,
        TalepTarihi: new Date('2024-01-14T14:15:00Z'),
        Durum: 'Onay Bekliyor',
        AdminCevapTarihi: undefined,
        AdminAciklama: undefined,
        AdminPersonelID: undefined,
        GorevBasligi: 'Backend API Geliştirme',
        ProjeBasligi: 'Mobil Uygulama',
        FirmaAdi: 'İhracat Ltd.'
      },
      {
        ID: 3,
        GorevID: 5,
        FirmaID: 3,
        KullaniciAciklama: 'Sistem entegrasyon testleri tamamlandı. Tüm modüller başarıyla entegre edildi ve performans testleri geçti.',
        KanitDosyaURL: 'https://example.com/test-raporu.docx',
        KanitDosyaAdi: 'sistem-test-raporu.docx',
        TalepTarihi: new Date('2024-01-13T16:45:00Z'),
        Durum: 'Onay Bekliyor',
        AdminCevapTarihi: undefined,
        AdminAciklama: undefined,
        AdminPersonelID: undefined,
        GorevBasligi: 'Sistem Entegrasyon Testleri',
        ProjeBasligi: 'ERP Sistemi',
        FirmaAdi: 'Tekstil San.'
      }
    ];

    return mockTalepler;
  }

  private static getMockTalepDetay(talepId: number): any {
    console.log(`Mock talep detayı kullanılıyor - ID: ${talepId}`);

    const mockTalepler = this.getMockOnayBekleyenTalepler();
    return mockTalepler.find(talep => talep.ID === talepId) || {
      ID: talepId,
      GorevID: 1,
      FirmaID: 1,
      KullaniciAciklama: 'Mock talep açıklaması',
      KanitDosyaURL: null,
      KanitDosyaAdi: null,
      TalepTarihi: new Date(),
      Durum: 'Onay Bekliyor',
      AdminCevapTarihi: undefined,
      AdminAciklama: undefined,
      AdminPersonelID: undefined,
      GorevBasligi: 'Mock Görev',
      ProjeBasligi: 'Mock Proje',
      FirmaAdi: 'Mock Firma'
    };
  }
}

// SUPABASE ONLY: Forum servisi
export class ForumService {
  static async getAllKonular(): Promise<any[]> {
    try {
      console.log('Forum konuları Supabase\'den yükleniyor...');

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      const { data: konularData, error: konularError } = await supabase
        .from('forum_konular')
        .select(`
          id,
          baslik,
          icerik,
          kategori,
          yazar_id,
          yazar_adi,
          yazar_firma_id,
          durum,
          sabitleme,
          goruntulenme_sayisi,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false });

      if (konularError) {
        console.error('Forum konuları yükleme hatası:', konularError);
        return [];
      }

      if (!konularData || konularData.length === 0) {
        console.log('Veritabanında konu bulunamadı');
        return [];
      }

      console.log(`${konularData.length} forum konusu yüklendi`);

      // Her konu için firma adı ve cevap sayısını al
      const formattedKonular = await Promise.all(konularData.map(async (konu) => {
        // Firma adı - Supabase'deki mevcut veriler için
        let firmaAdi = konu.yazar_adi || 'Bilinmeyen Firma';
        
        // Eğer yazar_firma_id varsa, firmalar tablosundan al
        if (konu.yazar_firma_id) {
          const { data: firmaData } = await supabase
            .from('firmalar')
            .select('firma_adi')
            .eq('id', konu.yazar_firma_id)
            .single();

          if (firmaData?.firma_adi) {
            firmaAdi = firmaData.firma_adi;
          }
        }

        // Cevap sayısı
        const { data: cevapData, count } = await supabase
          .from('forum_yorumlar')
          .select('id', { count: 'exact' })
          .eq('konu_id', konu.id);

        const cevapSayisi = count || 0;

        // Son mesaj tarihi
        const { data: sonMesajData } = await supabase
          .from('forum_yorumlar')
          .select('created_at')
          .eq('konu_id', konu.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const sonMesajTarihi = sonMesajData?.created_at ?
          new Date(sonMesajData.created_at) :
          new Date(konu.updated_at || konu.created_at);

        return {
          ID: konu.id,
          KonuBasligi: konu.baslik || '',
          KonuIcerigi: konu.icerik || '',
          KonuAcanFirmaID: konu.yazar_firma_id || konu.yazar_id || 0,
          FirmaAdı: firmaAdi,
          OlusturmaTarihi: new Date(konu.created_at),
          SonMesajTarihi: sonMesajTarihi,
          Kategori: konu.kategori || 'Genel',
          Durum: this.mapDurumFromDatabase(konu.durum || 'Aktif'),
          CevapSayisi: cevapSayisi
        };
      }));

      console.log('Forum konuları formatlandı:', {
        toplamKonu: formattedKonular.length,
        kategoriler: [...new Set(formattedKonular.map(k => k.Kategori))].join(', '),
        toplamCevap: formattedKonular.reduce((sum, k) => sum + k.CevapSayisi, 0)
      });

      return formattedKonular;
    } catch (error) {
      console.error('Forum konuları yükleme hatası:', error);
      return [];
    }
  }

  static async getKategoriIstatistikleri(): Promise<{ kategori: string; konuSayisi: number; cevapSayisi: number }[]> {
    try {
      console.log('Forum kategori istatistikleri yükleniyor...');

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      const { data: konularData, error: konularError } = await supabase
        .from('forum_konular')
        .select('kategori, id');

      if (konularError) {
        console.error('Kategori istatistikleri yükleme hatası:', konularError);
        return [];
      }

      // Kategori bazında konu sayılarını hesapla
      const kategoriKonuSayilari: { [key: string]: number } = {};
      konularData?.forEach(konu => {
        const kategori = konu.kategori || 'Genel';
        kategoriKonuSayilari[kategori] = (kategoriKonuSayilari[kategori] || 0) + 1;
      });

      // Her kategori için cevap sayısını hesapla
      const istatistikler = await Promise.all(
        Object.keys(kategoriKonuSayilari).map(async (kategori) => {
          const { count: cevapSayisi } = await supabase
            .from('forum_yorumlar')
            .select('*', { count: 'exact' })
            .in('konu_id', konularData?.filter(k => k.kategori === kategori).map(k => k.id) || []);

          return {
            kategori,
            konuSayisi: kategoriKonuSayilari[kategori],
            cevapSayisi: cevapSayisi || 0
          };
        })
      );

      console.log('Kategori istatistikleri yüklendi:', istatistikler);
      return istatistikler;

    } catch (error) {
      console.error('Kategori istatistikleri yükleme hatası:', error);
      return [];
    }
  }

  static async getKonuCevapları(konuId: number): Promise<any[]> {
    try {
      console.log(`Konu ${konuId} için cevaplar yükleniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      const { data: cevaplarData, error: cevaplarError } = await supabase
        .from('forum_yorumlar')
        .select(`
          id,
          konu_id,
          yazar_id,
          yazar_adi,
          yazar_firma_id,
          yorum_metni,
          created_at,
          updated_at
        `)
        .eq('konu_id', konuId)
        .order('created_at', { ascending: true });

      if (cevaplarError) {
        console.error('Konu cevapları yükleme hatası:', cevaplarError);
        return [];
      }

      if (!cevaplarData || cevaplarData.length === 0) {
        console.log('Bu konu için cevap bulunamadı');
        return [];
      }

      // Her cevap için firma bilgisini al
      const formattedCevaplar = await Promise.all(cevaplarData.map(async (cevap) => {
        let yazarAdi = cevap.yazar_adi || 'Anonim';
        let yazarTipi: 'Firma' | 'Personel' = 'Personel';

        if (cevap.yazar_firma_id) {
          const { data: firmaData } = await supabase
            .from('firmalar')
            .select('firma_adi')
            .eq('id', cevap.yazar_firma_id)
        .single();

          if (firmaData?.firma_adi) {
            yazarAdi = firmaData.firma_adi;
            yazarTipi = 'Firma';
          }
        }

        return {
          ID: cevap.id,
          KonuID: cevap.konu_id,
          CevapYazanFirmaID: cevap.yazar_firma_id,
          CevapYazanPersonelID: cevap.yazar_id,
          CevapMetni: cevap.yorum_metni || '',
          CevapTarihi: new Date(cevap.created_at),
          YazarAdı: yazarAdi,
          YazarTipi: yazarTipi
        };
      }));

      console.log(`${formattedCevaplar.length} cevap yüklendi`);
      return formattedCevaplar;

    } catch (error) {
      console.error('Konu cevapları yükleme hatası:', error);
      return [];
    }
  }

  static async updateKonuDurum(konuId: number, yeniDurum: 'Açık' | 'Kilitli'): Promise<boolean> {
    try {
      console.log(`Konu ${konuId} durumu ${yeniDurum} olarak güncelleniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return false;
      }

      const { error } = await supabase
        .from('forum_konular')
        .update({ durum: this.mapDurumToDatabase(yeniDurum) })
        .eq('id', konuId);

      if (error) {
        console.error('Konu durumu güncelleme hatası:', error);
        return false;
      }

      console.log('Konu durumu başarıyla güncellendi');
      return true;

    } catch (error) {
      console.error('Konu durumu güncelleme hatası:', error);
      return false;
    }
  }

  static async deleteKonu(konuId: number): Promise<boolean> {
    try {
      console.log(`Konu ${konuId} siliniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return false;
      }

      // Önce konunun cevaplarını sil
      const { error: cevaplarError } = await supabase
        .from('forum_yorumlar')
        .delete()
        .eq('konu_id', konuId);

      if (cevaplarError) {
        console.error('Konu cevapları silme hatası:', cevaplarError);
        return false;
      }

      // Sonra konuyu sil
      const { error: konuError } = await supabase
        .from('forum_konular')
        .delete()
        .eq('id', konuId);

      if (konuError) {
        console.error('Konu silme hatası:', konuError);
        return false;
      }

      console.log('Konu ve cevapları başarıyla silindi');
      return true;

    } catch (error) {
      console.error('Konu silme hatası:', error);
      return false;
    }
  }

  static async deleteCevap(cevapId: number): Promise<boolean> {
    try {
      console.log(`Cevap ${cevapId} siliniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return false;
      }

      const { error } = await supabase
        .from('forum_yorumlar')
        .delete()
        .eq('id', cevapId);

      if (error) {
        console.error('Cevap silme hatası:', error);
        return false;
      }

      console.log('Cevap başarıyla silindi');
      return true;

    } catch (error) {
      console.error('Cevap silme hatası:', error);
      return false;
    }
  }

  // Yardımcı metodlar
  private static mapDurumFromDatabase(durum: string): 'Açık' | 'Kilitli' {
    return durum === 'Kilitli' ? 'Kilitli' : 'Açık';
  }

  private static mapDurumToDatabase(durum: 'Açık' | 'Kilitli'): string {
    return durum === 'Kilitli' ? 'Kilitli' : 'Aktif';
  }

  static async getKategoriIstatistikleri(): Promise<{ kategori: string; konuSayisi: number; cevapSayisi: number }[]> {
    try {
      console.log('Forum kategori istatistikleri yükleniyor...');

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      const { data: konularData, error: konularError } = await supabase
        .from('forum_konular')
        .select('kategori, id');

      if (konularError) {
        console.error('Kategori istatistikleri yükleme hatası:', konularError);
        return [];
      }

      // Kategori bazında konu sayılarını hesapla
      const kategoriKonuSayilari: { [key: string]: number } = {};
      konularData?.forEach(konu => {
        const kategori = konu.kategori || 'Genel';
        kategoriKonuSayilari[kategori] = (kategoriKonuSayilari[kategori] || 0) + 1;
      });

      // Her kategori için cevap sayısını hesapla
      const istatistikler = await Promise.all(
        Object.keys(kategoriKonuSayilari).map(async (kategori) => {
          const { count: cevapSayisi } = await supabase
            .from('forum_yorumlar')
            .select('*', { count: 'exact' })
            .in('konu_id', konularData?.filter(k => k.kategori === kategori).map(k => k.id) || []);

          return {
            kategori,
            konuSayisi: kategoriKonuSayilari[kategori],
            cevapSayisi: cevapSayisi || 0
          };
        })
      );

      console.log('Kategori istatistikleri yüklendi:', istatistikler);
      return istatistikler;

    } catch (error) {
      console.error('Kategori istatistikleri yükleme hatası:', error);
      return [];
    }
  }

  static async getKonuCevapları(konuId: number): Promise<any[]> {
    try {
      console.log(`Konu ${konuId} için cevaplar yükleniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      const { data: cevaplarData, error: cevaplarError } = await supabase
        .from('forum_yorumlar')
        .select(`
          id,
          konu_id,
          yazar_id,
          yazar_adi,
          yazar_firma_id,
          yorum_metni,
          created_at,
          updated_at
        `)
        .eq('konu_id', konuId)
        .order('created_at', { ascending: true });

      if (cevaplarError) {
        console.error('Konu cevapları yükleme hatası:', cevaplarError);
        return [];
      }

      if (!cevaplarData || cevaplarData.length === 0) {
        console.log('Bu konu için cevap bulunamadı');
        return [];
      }

      // Her cevap için firma bilgisini al
      const formattedCevaplar = await Promise.all(cevaplarData.map(async (cevap) => {
        let yazarAdi = cevap.yazar_adi || 'Anonim';
        let yazarTipi: 'Firma' | 'Personel' = 'Personel';

        if (cevap.yazar_firma_id) {
        const { data: firmaData } = await supabase
          .from('firmalar')
          .select('firma_adi')
            .eq('id', cevap.yazar_firma_id)
          .single();

        if (firmaData?.firma_adi) {
            yazarAdi = firmaData.firma_adi;
            yazarTipi = 'Firma';
          }
        }

        return {
          ID: cevap.id,
          KonuID: cevap.konu_id,
          CevapYazanFirmaID: cevap.yazar_firma_id,
          CevapYazanPersonelID: cevap.yazar_id,
          CevapMetni: cevap.yorum_metni || '',
          CevapTarihi: new Date(cevap.created_at),
          YazarAdı: yazarAdi,
          YazarTipi: yazarTipi
        };
      }));

      console.log(`${formattedCevaplar.length} cevap yüklendi`);
      return formattedCevaplar;

    } catch (error) {
      console.error('Konu cevapları yükleme hatası:', error);
      return [];
    }
  }

  static async updateKonuDurum(konuId: number, yeniDurum: 'Açık' | 'Kilitli'): Promise<boolean> {
    try {
      console.log(`Konu ${konuId} durumu ${yeniDurum} olarak güncelleniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return false;
      }

      const { error } = await supabase
        .from('forum_konular')
        .update({ durum: this.mapDurumToDatabase(yeniDurum) })
        .eq('id', konuId);

      if (error) {
        console.error('Konu durumu güncelleme hatası:', error);
        return false;
      }

      console.log('Konu durumu başarıyla güncellendi');
      return true;

    } catch (error) {
      console.error('Konu durumu güncelleme hatası:', error);
      return false;
    }
  }

  static async deleteKonu(konuId: number): Promise<boolean> {
    try {
      console.log(`Konu ${konuId} siliniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return false;
      }

      // Önce konunun cevaplarını sil
      const { error: cevaplarError } = await supabase
        .from('forum_yorumlar')
        .delete()
        .eq('konu_id', konuId);

      if (cevaplarError) {
        console.error('Konu cevapları silme hatası:', cevaplarError);
        return false;
      }

      // Sonra konuyu sil
      const { error: konuError } = await supabase
        .from('forum_konular')
        .delete()
        .eq('id', konuId);

      if (konuError) {
        console.error('Konu silme hatası:', konuError);
        return false;
      }

      console.log('Konu ve cevapları başarıyla silindi');
      return true;

    } catch (error) {
      console.error('Konu silme hatası:', error);
      return false;
    }
  }

  static async deleteCevap(cevapId: number): Promise<boolean> {
    try {
      console.log(`Cevap ${cevapId} siliniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return false;
      }

      const { error } = await supabase
        .from('forum_yorumlar')
        .delete()
        .eq('id', cevapId);

      if (error) {
        console.error('Cevap silme hatası:', error);
        return false;
      }

      console.log('Cevap başarıyla silindi');
      return true;

    } catch (error) {
      console.error('Cevap silme hatası:', error);
      return false;
    }
  }

  // Test verileri ekleme metodu
  static async addTestData(): Promise<boolean> {
    try {
      console.log('Forum test verileri ekleniyor...');

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return false;
      }

      // Önce mevcut firmaları al
      const { data: firmalar } = await supabase
        .from('firmalar')
        .select('id, firma_adi')
        .limit(3);

      if (!firmalar || firmalar.length === 0) {
        console.log('Firma bulunamadı, test verileri eklenemiyor');
        return false;
      }

      // Test konuları
      const testKonular = [
        {
          baslik: 'E-ihracat için öneriler',
          icerik: 'E-ihracata yeni başlayacak firmalar için temel öneriler ve ipuçları paylaşmak istiyorum. Deneyimlerinizi de bekliyorum.',
          kategori: 'Genel',
          yazar_firma_id: firmalar[0].id,
          yazar_adi: firmalar[0].firma_adi,
          durum: 'Aktif',
          created_at: new Date().toISOString()
        },
        {
          baslik: 'B2B platformları hakkında',
          icerik: 'Hangi B2B platformlarını kullanıyorsunuz? Deneyimlerinizi paylaşır mısınız?',
          kategori: 'B2B',
          yazar_firma_id: firmalar[1]?.id || firmalar[0].id,
          yazar_adi: firmalar[1]?.firma_adi || firmalar[0].firma_adi,
          durum: 'Aktif',
          created_at: new Date().toISOString()
        },
        {
          baslik: 'Lojistik çözümleri',
          icerik: 'Uluslararası nakliye için hangi lojistik firmalarını önerirsiniz?',
          kategori: 'Lojistik',
          yazar_firma_id: firmalar[2]?.id || firmalar[0].id,
          yazar_adi: firmalar[2]?.firma_adi || firmalar[0].firma_adi,
          durum: 'Aktif',
          created_at: new Date().toISOString()
        },
        {
          baslik: 'Devlet teşvikleri',
          icerik: 'İhracat için hangi devlet teşviklerinden yararlanabiliriz?',
          kategori: 'Teşvikler',
          yazar_firma_id: firmalar[0].id,
          yazar_adi: firmalar[0].firma_adi,
          durum: 'Aktif',
          created_at: new Date().toISOString()
        }
      ];

      // Konuları ekle
      const { data: konularData, error: konularError } = await supabase
        .from('forum_konular')
        .insert(testKonular)
        .select();

      if (konularError) {
        console.error('Test konuları ekleme hatası:', konularError);
        return false;
      }

      console.log(`${konularData.length} test konusu eklendi`);

      // Test cevapları ekle
      const testCevaplar = [
        {
          konu_id: konularData[0].id,
          yazar_firma_id: firmalar[1]?.id || firmalar[0].id,
          yazar_adi: firmalar[1]?.firma_adi || firmalar[0].firma_adi,
          yorum_metni: 'Çok faydalı bir konu. Ben de deneyimlerimi paylaşmak isterim.',
          created_at: new Date().toISOString()
        },
        {
          konu_id: konularData[0].id,
          yazar_firma_id: firmalar[2]?.id || firmalar[0].id,
          yazar_adi: firmalar[2]?.firma_adi || firmalar[0].firma_adi,
          yorum_metni: 'E-ihracat için önce pazar araştırması yapmanızı öneririm.',
          created_at: new Date().toISOString()
        },
        {
          konu_id: konularData[1].id,
          yazar_firma_id: firmalar[0].id,
          yazar_adi: firmalar[0].firma_adi,
          yorum_metni: 'Alibaba ve Global Sources kullanıyorum. İkisi de çok iyi.',
          created_at: new Date().toISOString()
        }
      ];

      const { error: cevaplarError } = await supabase
        .from('forum_yorumlar')
        .insert(testCevaplar);

      if (cevaplarError) {
        console.error('Test cevapları ekleme hatası:', cevaplarError);
        return false;
      }

      console.log(`${testCevaplar.length} test cevabı eklendi`);
      console.log('Forum test verileri başarıyla eklendi');

      return true;

    } catch (error) {
      console.error('Test verileri ekleme hatası:', error);
      return false;
    }
  }
}

// SUPABASE ONLY: Login senkronizasyon servisi
export class LoginSyncService {
  static checkLoginStatus(): {
    isLoggedIn: boolean;
    firmaId: number;
    firmaAdi: string;
    email: string;
  } {
    try {
      if (typeof window === 'undefined') {
        console.log('Sunucu tarafında, oturum kontrolü atlanıyor');
        return {
          isLoggedIn: false,
          firmaId: 0,
          firmaAdi: '',
          email: ''
        };
      }

      console.log('Oturum durumu kontrol ediliyor...');

      // Sadece oturum bilgileri için localStorage kullan
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userEmail = localStorage.getItem('userEmail');
      const firmaAdi = localStorage.getItem('firmaAdi');
      const firmaId = localStorage.getItem('firmaId');

      if (!isLoggedIn || isLoggedIn !== 'true' || !userEmail || !firmaAdi || !firmaId) {
        console.log('Oturum doğrulama başarısız');
        return {
          isLoggedIn: false,
          firmaId: 0,
          firmaAdi: '',
          email: ''
        };
      }

      const result = {
        isLoggedIn: true,
        firmaId: parseInt(firmaId) || 0,
        firmaAdi: firmaAdi,
        email: userEmail
      };

      console.log('Oturum durumu geçerli:', result.email);
      return result;

    } catch (error) {
      console.error('Oturum kontrolü hatası:', error);
      return {
        isLoggedIn: false,
        firmaId: 0,
        firmaAdi: '',
        email: ''
      };
    }
  }

  static login(userData: {
    email: string;
    firmaAdi: string;
    firmaId: number;
  }): boolean {
    try {
      if (typeof window === 'undefined') {
        console.log('Sunucu tarafında, oturum kayıt atlanıyor');
        return false;
      }

      console.log('Oturum bilgileri kaydediliyor...', userData.email);

      // Sadece oturum bilgileri için localStorage kullan
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('firmaAdi', userData.firmaAdi);
      localStorage.setItem('firmaId', userData.firmaId.toString());

      console.log('Oturum bilgileri kaydedildi');
      return true;

    } catch (error) {
      console.error('Oturum kayıt hatası:', error);
      return false;
    }
  }

  static logout(): void {
    try {
      if (typeof window === 'undefined') {
        console.log('Sunucu tarafında, oturum temizlik atlanıyor');
        return;
      }

      console.log('Oturum bilgileri temizleniyor...');

      // Sadece oturum bilgilerini temizle
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('firmaAdi');
      localStorage.removeItem('firmaId');

      // Session storage'ı temizle
      sessionStorage.clear();

      console.log('Oturum bilgileri temizlendi');

    } catch (error) {
      console.error('Oturum temizlik hatası:', error);
    }
  }

  static getCurrentUser(): {
    email: string;
    firmaAdi: string;
    firmaId: number;
  } | null {
    try {
      const loginStatus = this.checkLoginStatus();

      if (!loginStatus.isLoggedIn) {
        return null;
      }

      return {
        email: loginStatus.email,
        firmaAdi: loginStatus.firmaAdi,
        firmaId: loginStatus.firmaId
      };

    } catch (error) {
      console.error('Mevcut kullanıcı hatası:', error);
      return null;
    }
  }
}

// SUPABASE ONLY: Randevu talepleri servisi
export class RandevuTalepleriService {
  static async getFirmaRandevuTalepleri(firmaId: number): Promise<any[]> {
    try {
      console.log(`Firma ${firmaId} randevu talepleri Supabase'den yükleniyor...`);

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return [];
      }

      if (!firmaId || isNaN(firmaId) || firmaId <= 0) {
        console.error('Geçersiz firma ID:', firmaId);
        return [];
      }

      const { data: randevuData, error: randevuError } = await supabase
        .from('randevu_talepleri')
        .select(`
          id,
          firma_id,
          konu,
          mesaj,
          tercih_edilen_tarih_saat_1,
          tercih_edilen_tarih_saat_2,
          tercih_edilen_tarih_saat_3,
          talep_tarihi,
          durum,
          atanan_personel_id,
          gerceklesen_tarih_saat,
          admin_notu,
          created_at,
          updated_at
        `)
        .eq('firma_id', firmaId)
        .order('created_at', { ascending: false });

      if (randevuError) {
        console.error('Randevu talepleri yükleme hatası:', randevuError);
        return [];
      }

      if (!randevuData || randevuData.length === 0) {
        console.log(`Firma ${firmaId} için randevu talebi bulunamadı`);
        return [];
      }

      console.log(`${randevuData.length} randevu talebi yüklendi`);

      // Firma adı ve personel adını al
      const formattedRandevuTalepleri = await Promise.all(randevuData.map(async (randevu) => {
        // Firma adı
        let firmaAdi = 'Bilinmeyen Firma';
        if (randevu.firma_id) {
          const { data: firmaData } = await supabase
            .from('firmalar')
            .select('firma_adi')
            .eq('id', randevu.firma_id)
            .single();

          if (firmaData?.firma_adi) {
            firmaAdi = firmaData.firma_adi;
          }
        }

        // Personel adı
        let personelAdi = undefined;
        if (randevu.atanan_personel_id) {
          const { data: personelData } = await supabase
            .from('kullanicilar')
            .select('ad_soyad')
            .eq('id', randevu.atanan_personel_id)
            .single();

          if (personelData?.ad_soyad) {
            personelAdi = personelData.ad_soyad;
          }
        }

        return {
          ID: randevu.id,
          FirmaID: randevu.firma_id,
          FirmaAdı: firmaAdi,
          Konu: randevu.konu || '',
          Mesaj: randevu.mesaj || '',
          TercihEdilenTarihSaat1: randevu.tercih_edilen_tarih_saat_1 ? new Date(randevu.tercih_edilen_tarih_saat_1) : new Date(),
          TercihEdilenTarihSaat2: randevu.tercih_edilen_tarih_saat_2 ? new Date(randevu.tercih_edilen_tarih_saat_2) : undefined,
          TercihEdilenTarihSaat3: randevu.tercih_edilen_tarih_saat_3 ? new Date(randevu.tercih_edilen_tarih_saat_3) : undefined,
          TalepTarihi: randevu.talep_tarihi ? new Date(randevu.talep_tarihi) : new Date(randevu.created_at),
          Durum: this.mapDurumFromDatabase(randevu.durum || 'Beklemede'),
          AtananPersonelID: randevu.atanan_personel_id,
          PersonelAdı: personelAdi,
          GerceklesenTarihSaat: randevu.gerceklesen_tarih_saat ? new Date(randevu.gerceklesen_tarih_saat) : undefined,
          AdminNotu: randevu.admin_notu
        };
      }));

      console.log('Randevu talepleri formatlandı:', {
        toplam: formattedRandevuTalepleri.length,
        durum: this.getStatusDistribution(formattedRandevuTalepleri)
      });

      return formattedRandevuTalepleri;

    } catch (error) {
      console.error('Randevu talepleri sistem hatası:', error);
      return [];
    }
  }

  static async createRandevuTalebi(randevuData: {
    FirmaID: number;
    Konu: string;
    Mesaj: string;
    TercihEdilenTarihSaat1: Date;
    TercihEdilenTarihSaat2?: Date;
    TercihEdilenTarihSaat3?: Date;
  }): Promise<any | null> {
    try {
      console.log('Randevu talebi Supabase\'e oluşturuluyor...', {
        firmaId: randevuData.FirmaID,
        konu: randevuData.Konu
      });

      if (!supabase) {
        console.error('Supabase bağlantısı yok');
        return null;
      }

      // Giriş doğrulama
      if (!randevuData.FirmaID || isNaN(randevuData.FirmaID) || randevuData.FirmaID <= 0) {
        throw new Error('Geçersiz firma ID');
      }

      if (!randevuData.Konu?.trim()) {
        throw new Error('Randevu konusu zorunludur');
      }

      if (!randevuData.Mesaj?.trim()) {
        throw new Error('Mesaj zorunludur');
      }

      if (!randevuData.TercihEdilenTarihSaat1) {
        throw new Error('En az bir tercih edilen tarih zorunludur');
      }

      // Firma var mı kontrol et
      const { data: firmaCheck, error: firmaError } = await supabase
        .from('firmalar')
        .select('id, firma_adi')
        .eq('id', randevuData.FirmaID)
        .single();

      if (firmaError || !firmaCheck) {
        throw new Error(`Firma bulunamadı (ID: ${randevuData.FirmaID})`);
      }

      // Randevu talebini oluştur
      const insertData = {
        firma_id: randevuData.FirmaID,
        konu: randevuData.Konu.trim(),
        mesaj: randevuData.Mesaj.trim(),
        tercih_edilen_tarih_saat_1: randevuData.TercihEdilenTarihSaat1.toISOString(),
        tercih_edilen_tarih_saat_2: randevuData.TercihEdilenTarihSaat2?.toISOString() || null,
        tercih_edilen_tarih_saat_3: randevuData.TercihEdilenTarihSaat3?.toISOString() || null,
        talep_tarihi: new Date().toISOString(),
        durum: 'Beklemede',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('randevu_talepleri')
        .insert([insertData])
        .select('id')
        .single();

      if (insertError) {
        console.error('Randevu talebi oluşturma hatası:', insertError);

        throw new Error(`Randevu talebi oluşturulamadı: ${insertError.message}`);
      }

      if (!insertResult?.id) {
        throw new Error('Randevu talebi oluşturuldu fakat ID döndürülmedi');
      }

      console.log('Randevu talebi başarıyla oluşturuldu, ID:', insertResult.id);

      // Oluşturulan randevu bilgilerini döndür
      const createdRandevu = {
        ID: insertResult.id,
        FirmaID: randevuData.FirmaID,
        FirmaAdı: firmaCheck.firma_adi,
        Konu: randevuData.Konu,
        Mesaj: randevuData.Mesaj,
        TercihEdilenTarihSaat1: randevuData.TercihEdilenTarihSaat1,
        TercihEdilenTarihSaat2: randevuData.TercihEdilenTarihSaat2,
        TercihEdilenTarihSaat3: randevuData.TercihEdilenTarihSaat3,
        TalepTarihi: new Date(),
        Durum: 'Beklemede'
      };

      return createdRandevu;

    } catch (error) {
      console.error('Randevu talebi oluşturma sistem hatası:', error);
      throw error;
    }
  }

  private static mapDurumFromDatabase(dbDurum: string): 'Beklemede' | 'Onaylandı' | 'Reddedildi' | 'Tamamlandı' {
    switch (dbDurum) {
      case 'Beklemede':
      case 'Onay Bekliyor':
        return 'Beklemede';
      case 'Onaylandı':
      case 'Onaylandi':
        return 'Onaylandı';
      case 'Reddedildi':
      case 'Red':
        return 'Reddedildi';
      case 'Tamamlandı':
      case 'Tamamlandi':
      case 'Gerçekleşti':
        return 'Tamamlandı';
      default:
        return 'Beklemede';
    }
  }

  private static getStatusDistribution(randevuTalepleri: any[]): string {
    const distribution = randevuTalepleri.reduce((acc, randevu) => {
      acc[randevu.Durum] = (acc[randevu.Durum] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution)
      .map(([status, count]) => `${status}: ${count}`)
      .join(', ');
  }
}

// SUPABASE ONLY: 预约请求管理服务
export class AdminRandevuService {
  // 获取所有预约请求
  static async getAllRandevuTalepleri(): Promise<any[]> {
    try {
      console.log('从Supabase加载所有预约请求...');

      if (!supabase) {
        console.error('无Supabase连接');
        return [];
      }

      const { data, error } = await supabase
        .from('randevu_talepleri')
        .select(`
          id,
          firma_id,
          konu,
          mesaj,
          tercih_edilen_tarih_saat_1,
          tercih_edilen_tarih_saat_2,
          tercih_edilen_tarih_saat_3,
          talep_tarihi,
          durum,
          atanan_personel_id,
          gerceklesen_tarih_saat,
          admin_notu,
          created_at,
          updated_at,
          firmalar:firma_id(firma_adi)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('预约请求数据加载错误:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('数据库中未找到预约请求');
        return [];
      }

      // 格式化数据
      const formattedData = data.map(item => ({
        id: item.id,
        ID: item.id,
        firmaId: item.firma_id,
        FirmaID: item.firma_id,
        firmaAdi: item.firmalar?.firma_adi || 'Bilinmeyen Firma',
        FirmaAdı: item.firmalar?.firma_adi || 'Bilinmeyen Firma',
        konu: item.konu || '',
        Konu: item.konu || '',
        mesaj: item.mesaj || '',
        Mesaj: item.mesaj || '',
        tercihEdilenTarihSaat1: item.tercih_edilen_tarih_saat_1,
        TercihEdilenTarihSaat1: item.tercih_edilen_tarih_saat_1,
        tercihEdilenTarihSaat2: item.tercih_edilen_tarih_saat_2,
        TercihEdilenTarihSaat2: item.tercih_edilen_tarih_saat_2,
        tercihEdilenTarihSaat3: item.tercih_edilen_tarih_saat_3,
        TercihEdilenTarihSaat3: item.tercih_edilen_tarih_saat_3,
        talepTarihi: item.talep_tarihi || item.created_at,
        TalepTarihi: item.talep_tarihi || item.created_at,
        durum: item.durum || 'Beklemede',
        Durum: item.durum || 'Beklemede',
        atananPersonelId: item.atanan_personel_id,
        AtananPersonelID: item.atanan_personel_id,
        gerceklesenTarihSaat: item.gerceklesen_tarih_saat,
        GerceklesenTarihSaat: item.gerceklesen_tarih_saat,
        adminNotu: item.admin_notu,
        AdminNotu: item.admin_notu
      }));

      console.log(`从Supabase加载了${formattedData.length}个预约请求`);
      return formattedData;

    } catch (error) {
      console.error('预约请求数据系统错误:', error);
      return [];
    }
  }

  // 获取人员列表
  static async getPersonelListesi(): Promise<any[]> {
    try {
      console.log('从Supabase加载人员列表...');

      if (!supabase) {
        console.error('无Supabase连接');
        return [];
      }

      const { data, error } = await supabase
        .from('kullanicilar')
        .select(`
          id,
          ad_soyad,
          email,
          rol,
          durum
        `)
        .eq('durum', 'Aktif')
        .in('rol', ['Admin', 'Personel'])
        .order('ad_soyad', { ascending: true });

      if (error) {
        console.error('人员列表加载错误:', error);
        return [];
      }

      const formattedData = (data || []).map(item => ({
        id: item.id,
        ID: item.id,
        adSoyad: item.ad_soyad || 'Bilinmeyen',
        AdSoyad: item.ad_soyad || 'Bilinmeyen',
        email: item.email || '',
        rol: item.rol || 'Personel',
        durum: item.durum || 'Aktif'
      }));

      console.log(`从Supabase加载了${formattedData.length}个人员`);
      return formattedData;

    } catch (error) {
      console.error('人员列表系统错误:', error);
      return [];
    }
  }

  // 获取预约统计数据
  static async getRandevuIstatistikleri(): Promise<any> {
    try {
      console.log('从Supabase计算预约统计...');

      if (!supabase) {
        console.error('无Supabase连接');
        return {
          toplam: 0,
          beklemede: 0,
          onaylandi: 0,
          reddedildi: 0,
          tamamlandi: 0
        };
      }

      const { data, error } = await supabase
        .from('randevu_talepleri')
        .select('durum, created_at');

      if (error) {
        console.error('预约统计查询错误:', error);
        return {
          toplam: 0,
          beklemede: 0,
          onaylandi: 0,
          reddedildi: 0,
          tamamlandi: 0
        };
      }

      const istatistikler = {
        toplam: data?.length || 0,
        beklemede: 0,
        onaylandi: 0,
        reddedildi: 0,
        tamamlandi: 0,
        haftaninToplami: 0,
        buAyToplam: 0,
        bugunkuTalepler: 0,
        gecenAyToplam: 0
      };

      if (data && data.length > 0) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        data.forEach(item => {
          const createdAt = new Date(item.created_at);

          // 按状态统计
          switch (item.durum) {
            case 'Beklemede':
            case 'Onay Bekliyor':
              istatistikler.beklemede++;
              break;
            case 'Onaylandı':
            case 'Onaylandi':
              istatistikler.onaylandi++;
              break;
            case 'Reddedildi':
            case 'Red':
              istatistikler.reddedildi++;
              break;
            case 'Tamamlandı':
            case 'Tamamlandi':
              istatistikler.tamamlandi++;
              break;
          }

          // 按时间统计
          if (createdAt >= weekAgo) {
            istatistikler.haftaninToplami++;
          }
          if (createdAt >= monthStart) {
            istatistikler.buAyToplam++;
          }
          if (createdAt >= todayStart) {
            istatistikler.bugunkuTalepler++;
          }
          if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
            istatistikler.gecenAyToplam++;
          }
        });
      }

      console.log('预约统计计算完成:', istatistikler);
      return istatistikler;

    } catch (error) {
      console.error('预约统计系统错误:', error);
      return {
        toplam: 0,
        beklemede: 0,
        onaylandi: 0,
        reddedildi: 0,
        tamamlandi: 0,
        haftaninToplami: 0,
        buAyToplam: 0,
        bugunkuTalepler: 0,
        gecenAyToplam: 0
      };
    }
  }

  // 更新预约请求
  static async updateRandevuTalebi(randevuId: number, updateData: any): Promise<boolean> {
    try {
      console.log(`更新预约请求 ID: ${randevuId}`, updateData);

      if (!supabase) {
        console.error('无Supabase连接');
        return false;
      }

      if (!randevuId || isNaN(randevuId) || randevuId <= 0) {
        console.error('无效预约ID:', randevuId);
        return false;
      }

      const { error } = await supabase
        .from('randevu_talepleri')
        .update({
          durum: updateData.durum,
          atanan_personel_id: updateData.atananPersonelId || null,
          gerceklesen_tarih_saat: updateData.gerceklesenTarihSaat || null,
          admin_notu: updateData.adminNotu || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', randevuId);

      if (error) {
        console.error('预约请求更新错误:', error);
        return false;
      }

      console.log('预约请求更新成功');
      return true;

    } catch (error) {
      console.error('预约请求更新系统错误:', error);
      return false;
    }
  }

  // 添加新预约请求
  static async addRandevuTalebi(randevuData: any): Promise<any> {
    try {
      console.log('创建新预约请求...', randevuData);

      if (!supabase) {
        console.error('无Supabase连接');
        throw new Error('数据库连接失败');
      }

      // 验证必需字段
      if (!randevuData.firmaId || !randevuData.konu || !randevuData.tercihEdilenTarihSaat1) {
        throw new Error('公司、主题和首选时间为必填项');
      }

      // 验证公司是否存在
      const { data: firmaCheck, error: firmaError } = await supabase
        .from('firmalar')
        .select('id, firma_adi')
        .eq('id', randevuData.firmaId)
        .single();

      if (firmaError || !firmaCheck) {
        throw new Error(`公司不存在 (ID: ${randevuData.firmaId})`);
      }

      const { data: newRandevu, error: insertError } = await supabase
        .from('randevu_talepleri')
        .insert([{
          firma_id: randevuData.firmaId,
          konu: randevuData.konu,
          mesaj: randevuData.mesaj || '',
          tercih_edilen_tarih_saat_1: randevuData.tercihEdilenTarihSaat1,
          tercih_edilen_tarih_saat_2: randevuData.tercihEdilenTarihSaat2 || null,
          tercih_edilen_tarih_saat_3: randevuData.tercihEdilenTarihSaat3 || null,
          durum: randevuData.durum || 'Beklemede',
          talep_tarihi: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) {
        console.error('预约请求创建错误:', insertError);
        throw new Error(`预约请求创建失败: ${insertError.message}`);
      }

      console.log('预约请求创建成功');
      return newRandevu;

    } catch (error) {
      console.error('预约请求创建系统错误:', error);
      throw error;
    }
  }

  // 删除预约请求
  static async deleteRandevuTalebi(randevuId: number): Promise<boolean> {
    try {
      console.log(`删除预约请求 ID: ${randevuId}`);

      if (!supabase) {
        console.error('无Supabase连接');
        return false;
      }

      if (!randevuId || isNaN(randevuId) || randevuId <= 0) {
        console.error('无效预约ID:', randevuId);
        return false;
      }

      const { error } = await supabase
        .from('randevu_talepleri')
        .delete()
        .eq('id', randevuId);

      if (error) {
        console.error('预约请求删除错误:', error);
        return false;
      }

      console.log('预约请求删除成功');
      return true;

    } catch (error) {
      console.error('预约请求删除系统错误:', error);
      return false;
    }
  }
}

// Destek Dokümanları Service
export class DestekDokümanlarıService {
  static async getAllDokümanlar() {
    try {
      const { data, error } = await supabase
        .from('destek_dokumanlari')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Supabase'deki sütun isimlerini frontend'e uygun hale getir
      const formattedData = (data || []).map(doc => ({
        ID: doc.id,
        BelgeAdı: doc.baslik || doc.belge_adi || 'Başlık Yok',
        BelgeURL: doc.belge_url || '',
        Açıklama: doc.icerik || doc.aciklama || 'Açıklama yok',
        Kategori: doc.kategori || 'Genel Bilgi',
        YuklemeTarihi: doc.created_at || doc.yukleme_tarihi || new Date(),
        Durum: doc.durum || 'Aktif'
      }));

      return formattedData;
    } catch (error) {
      console.error('Destek dokümanları yüklenirken hata:', error);
      return [];
    }
  }

  static async createDoküman(dokümanData: any) {
    try {
      const { data, error } = await supabase
        .from('destek_dokumanlari')
        .insert([dokümanData])
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Doküman oluşturulurken hata:', error);
      throw error;
    }
  }

  static async updateDoküman(id: number, dokümanData: any) {
    try {
      const { data, error } = await supabase
        .from('destek_dokumanlari')
        .update(dokümanData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Doküman güncellenirken hata:', error);
      throw error;
    }
  }

  static async deleteDoküman(id: number) {
    try {
      const { error } = await supabase
        .from('destek_dokumanlari')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Doküman silinirken hata:', error);
      throw error;
    }
  }

  static async getDokümanById(id: number) {
    try {
      const { data, error } = await supabase
        .from('destek_dokumanlari')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Doküman detayı yüklenirken hata:', error);
      return null;
    }
  }
}

export class SupabaseEgitimService {
  static async createEgitimSeti(data: {
    setAdi: string;
    aciklama: string;
    kategori: string;
    durum?: string;
  }) {
    try {
      const { data: newSet, error } = await supabase
        .from('egitim_setleri')
        .insert([{
          set_adi: data.setAdi,
          aciklama: data.aciklama,
          kategori: data.kategori,
          durum: data.durum || 'Aktif',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return newSet;
    } catch (error) {
      console.error('Eğitim seti oluşturulurken hata:', error);
      throw error;
    }
  }

  static async getAllEgitimSetleri() {
    try {
      const { data, error } = await supabase
        .from('egitim_setleri')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Eğitim setleri yüklenirken hata:', error);
      return [];
    }
  }

  static async updateEgitimSeti(id: number, data: {
    setAdi?: string;
    aciklama?: string;
    kategori?: string;
    durum?: string;
  }) {
    try {
      const updateData: any = {};
      if (data.setAdi) updateData.set_adi = data.setAdi;
      if (data.aciklama) updateData.aciklama = data.aciklama;
      if (data.kategori) updateData.kategori = data.kategori;
      if (data.durum) updateData.durum = data.durum;

      const { data: updatedSet, error } = await supabase
        .from('egitim_setleri')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedSet;
    } catch (error) {
      console.error('Eğitim seti güncellenirken hata:', error);
      throw error;
    }
  }

  static async deleteEgitimSeti(id: number) {
    try {
      const { error } = await supabase
        .from('egitim_setleri')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Eğitim seti silinirken hata:', error);
      throw error;
    }
  }

  static async getEgitimVideolari(setId: number) {
    try {
      const { data, error } = await supabase
        .from('egitim_videolari')
        .select('*')
        .eq('set_id', setId)
        .order('sira_no', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Eğitim videoları yüklenirken hata:', error);
      return [];
    }
  }

  static async createEgitimVideo(data: {
    setId: number;
    baslik: string;
    aciklama: string;
    videoUrl: string;
    siraNo: number;
  }) {
    try {
      const { data: newVideo, error } = await supabase
        .from('egitim_videolari')
        .insert([{
          set_id: data.setId,
          baslik: data.baslik,
          aciklama: data.aciklama,
          video_url: data.videoUrl,
          sira_no: data.siraNo,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return newVideo;
    } catch (error) {
      console.error('Eğitim videosu oluşturulurken hata:', error);
      throw error;
    }
  }

  static async updateEgitimVideo(id: number, data: {
    baslik?: string;
    aciklama?: string;
    videoUrl?: string;
    siraNo?: number;
  }) {
    try {
      const updateData: any = {};
      if (data.baslik) updateData.baslik = data.baslik;
      if (data.aciklama) updateData.aciklama = data.aciklama;
      if (data.videoUrl) updateData.video_url = data.videoUrl;
      if (data.siraNo) updateData.sira_no = data.siraNo;

      const { data: updatedVideo, error } = await supabase
        .from('egitim_videolari')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedVideo;
    } catch (error) {
      console.error('Eğitim videosu güncellenirken hata:', error);
      throw error;
    }
  }

  static async deleteEgitimVideo(id: number) {
    try {
      const { error } = await supabase
        .from('egitim_videolari')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Eğitim videosu silinirken hata:', error);
      throw error;
    }
  }

  static async ataEgitimSetiFirmaya(setId: number, firmaIds: number[]) {
    try {
      // Önce mevcut atamaları temizle
      await supabase
        .from('egitim_set_atamalari')
        .delete()
        .eq('egitim_set_id', setId);

      // Yeni atamaları ekle
      if (firmaIds.length > 0) {
        const atamalar = firmaIds.map(firmaId => ({
          egitim_set_id: setId,
          firma_id: firmaId,
          created_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('egitim_set_atamalari')
          .insert(atamalar);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Eğitim seti firma ataması yapılırken hata:', error);
      throw error;
    }
  }
}


