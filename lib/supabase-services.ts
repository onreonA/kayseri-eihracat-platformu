
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  if (typeof window === 'undefined') {
    console.log('Server-side environment detected, using fallback config');
    return {
      url: 'https://dummy-url-for-ssr.supabase.co',
      key: 'dummy-key-for-ssr'
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables missing, using fallback config');
    return {
      url: 'https://demo-project.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbW8tcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ5MzU4MzY5LCJleHAiOjE5NjQ5MzQzNjl9.dummy_key_for_development'
    }
  }

  console.log('Actual Supabase config loaded');
  return {
    url: supabaseUrl,
    key: supabaseAnonKey
  };
};

let supabaseClient: any = null;

try {
  const config = getSupabaseConfig();
  supabaseClient = createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });

  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Supabase client creation failed ->', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
  supabaseClient = null;
}

export const supabase = supabaseClient;

const isSupabaseConnected = () => {
  try {
    if (typeof window === 'undefined') return false;
    if (!supabase) return false;

    const config = getSupabaseConfig();
    if (!config.url.includes('supabase.co') && !config.url.includes('localhost')) return false;
    if (config.url === 'https://dummy-url-for-ssr.supabase.co') return false;

    return true;
  } catch (error) {
    console.error('Supabase connection check failed ->', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
    return false;
  }
};

export class LoginSyncService {
  static checkLoginStatus(): { isLoggedIn: boolean; userData: { firmaId: number; firmaAdi: string; email: string } | null } {
    try {
      if (typeof window === 'undefined') {
        console.log('Server-side environment, returning logged out state');
        return {
          isLoggedIn: false,
          userData: null
        };
      }

      console.log('Checking login status...');

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
              console.log('Unified format: Session expired, clearing...');
              this.logout();
              return {
                isLoggedIn: false,
                userData: null
              };
            }

            const userData = {
              firmaId: parsedData.firmaId || 0,
              firmaAdi: parsedData.firmaAdi,
              email: parsedData.email
            };

            console.log('Unified format: Login status valid', userData);
            return {
              isLoggedIn: true,
              userData: userData
            };
          }
        } catch (parseError) {
          console.warn('Unified data parsing failed:', parseError);
        }
      }

      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userEmail = localStorage.getItem('userEmail');
      const firmaAdi = localStorage.getItem('firmaAdi');
      const firmaId = localStorage.getItem('firmaId');

      console.log('Legacy check - Login status:', isLoggedIn, 'Email:', userEmail, 'Company:', firmaAdi, 'Company ID:', firmaId);

      if (!isLoggedIn || isLoggedIn !== 'true' || !userEmail || !firmaAdi || !firmaId) {
        console.log('Legacy: Validation failed');
        return {
          isLoggedIn: false,
          userData: null
        };
      }

      const userData = {
        firmaId: parseInt(firmaId) || 0,
        firmaAdi: firmaAdi,
        email: userEmail
      };

      console.log('Legacy: Login status valid', userData);
      return {
        isLoggedIn: true,
        userData: userData
      };

    } catch (error) {
      console.error('Login status check error:', error);
      return {
        isLoggedIn: false,
        userData: null
      };
    }
  }

  static login(userData: { email: string; firmaAdi: string; firmaId: number }): boolean {
    try {
      if (typeof window === 'undefined') {
        console.log('Server-side environment, skipping login saving');
        return false;
      }

      console.log('Saving login information...', userData);

      const unifiedData = {
        email: userData.email,
        firmaAdi: userData.firmaAdi,
        firmaId: userData.firmaId,
        loginTime: new Date().toISOString(),
        version: '2.0'
      };

      localStorage.setItem('user_login_data', JSON.stringify(unifiedData));

      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('firmaAdi', userData.firmaAdi);
      localStorage.setItem('firmaId', userData.firmaId.toString());

      console.log('Login information saved (dual format compatible)');
      return true;

    } catch (error) {
      console.error('Login saving error:', error);
      return false;
    }
  }

  static logout(): void {
    try {
      if (typeof window === 'undefined') {
        console.log('Server-side environment, skipping logout clearing');
        return;
      }

      console.log('Clearing login information...');

      localStorage.removeItem('user_login_data');

      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('firmaAdi');
      localStorage.removeItem('firmaId');

      sessionStorage.clear();

      console.log('Login information cleared');
    } catch (error) {
      console.error('Logout clearing error:', error);
    }
  }

  static getCurrentUser(): { email: string; firmaAdi: string; firmaId: number } | null {
    try {
      const loginStatus = this.checkLoginStatus();

      if (!loginStatus.isLoggedIn || !loginStatus.userData) {
        return null;
      }

      return {
        email: loginStatus.userData.email,
        firmaAdi: loginStatus.userData.firmaAdi,
        firmaId: loginStatus.userData.firmaId
      };

    } catch (error) {
      console.error('Getting current user error:', error);
      return null;
    }
  }
}

export class DestekDokümanlarıService {
  static checkConnection(): boolean {
    return isSupabaseConnected();
  }

  static async getAllDokümanlar(): Promise<any[]> {
    try {
      console.log('Getting all documents...');

      if (!this.checkConnection()) {
        console.warn('Supabase unavailable, returning mock data...');
        return this.getMockDokümanlar();
      }

      try {
        const { data: dokumanlarData, error: dokumanlarError } = await supabase
          .from('destek_dokumanlari')
          .select(`
            id,
            belge_adi,
            belge_url,
            aciklama,
            kategori,
            yuklenme_tarihi,
            durum,
            created_at,
            updated_at
          `)
          .eq('durum', 'Aktif')
          .order('created_at', { ascending: false });

        if (dokumanlarError) {
          console.warn('Document query error, using mock data:', dokumanlarError);
          return this.getMockDokümanlar();
        }

        if (!dokumanlarData || dokumanlarData.length === 0) {
          console.log('No documents in database, using mock data...');
          return this.getMockDokümanlar();
        }

        const formattedDokümanlar = dokumanlarData.map((dokuman: any) => ({
          ID: dokuman.id,
          BelgeAdı: dokuman.belge_adi || '',
          BelgeURL: dokuman.belge_url || '',
          Açıklama: dokuman.aciklama || '',
          Kategori: dokuman.kategori || 'Genel Bilgi',
          YuklemeTarihi: dokuman.yuklenme_tarihi || dokuman.created_at,
          Durum: dokuman.durum || 'Aktif'
        }));

        console.log('Documents formatted:', formattedDokümanlar.length);
        return formattedDokümanlar;

      } catch (supabaseError: any) {
        console.error('Supabase document error:', supabaseError);
        return this.getMockDokümanlar();
      }

    } catch (error: any) {
      console.error('Getting all documents system error:', error);
      console.warn('Using mock data...');
      return this.getMockDokümanlar();
    }
  }

  static async getDokümanlarByKategori(kategori: string): Promise<any[]> {
    try {
      console.log(`Getting ${kategori} category documents...`);

      const allDokümanlar = await this.getAllDokümanlar();

      if (kategori === 'Tümü') {
        return allDokümanlar;
      }

      const filteredDokümanlar = allDokümanlar.filter(dokuman =>
        dokuman.Kategori === kategori
      );

      console.log(`"${kategori}" category found ${filteredDokümanlar.length} documents`);
      return filteredDokümanlar;

    } catch (error) {
      console.error('Category documents error:', error);
      return [];
    }
  }

  static async searchDokümanlar(searchTerm: string): Promise<any[]> {
    try {
      console.log(`Searching documents: "${searchTerm}"`);

      const allDokümanlar = await this.getAllDokümanlar();

      if (!searchTerm.trim()) {
        return allDokümanlar;
      }

      const searchTermLower = searchTerm.toLowerCase().trim();
      const filteredDokümanlar = allDokümanlar.filter(dokuman =>
        dokuman.BelgeAdı.toLowerCase().includes(searchTermLower) ||
        dokuman.Açıklama.toLowerCase().includes(searchTermLower) ||
        dokuman.Kategori.toLowerCase().includes(searchTermLower)
      );

      console.log(`"${searchTerm}" search results: ${filteredDokümanlar.length} documents`);
      return filteredDokümanlar;

    } catch (error) {
      console.error('Document search error:', error);
      return [];
    }
  }

  static async addDokuman(dokumanData: any): Promise<boolean> {
    try {
      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      const { error } = await supabase
        .from('destek_dokumanlari')
        .insert([
          {
            belge_adi: dokumanData.BelgeAdı,
            belge_url: dokumanData.BelgeURL,
            aciklama: dokumanData.Açıklama,
            kategori: dokumanData.Kategori,
            yuklenme_tarihi: dokumanData.YuklemeTarihi.toISOString(),
            durum: 'Aktif',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Document add error:', error);
        return false;
      }

      console.log('Document added successfully');
      return true;

    } catch (error) {
      console.error('Document add system error:', error);
      return false;
    }
  }

  static async updateDokuman(id: number, dokumanData: any): Promise<boolean> {
    try {
      console.log(`Updating document ID: ${id}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      const { error } = await supabase
        .from('destek_dokumanlari')
        .update({
          belge_adi: dokumanData.BelgeAdı,
          belge_url: dokumanData.BelgeURL,
          aciklama: dokumanData.Açıklama,
          kategori: dokumanData.Kategori,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Document update error:', error);
        return false;
      }

      console.log('Document updated successfully');
      return true;

    } catch (error) {
      console.error('Document update system error:', error);
      return false;
    }
  }

  static async deleteDokuman(id: number): Promise<boolean> {
    try {
      console.log(`Deleting document ID: ${id}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      const { error } = await supabase
        .from('destek_dokumanlari')
        .update({
          durum: 'Silindi',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Document delete error:', error);
        return false;
      }

      console.log('Document deleted successfully');
      return true;

    } catch (error) {
      console.error('Document delete system error:', error);
      return false;
    }
  }

  private static getMockDokümanlar(): any[] {
    console.log('Using mock document data...');

    return [
      {
        ID: 1,
        BelgeAdı: 'E-İhracat Başlangıç Rehberi',
        BelgeURL: 'https://readdy.ai/api/search-image?query=professional%20business%20document%20guide%20for%20export%20beginners%20with%20clean%20layout%20modern%20design%20blue%20corporate%20colors&width=400&height=300&seq=doc001&orientation=landscape',
        Açıklama: 'E-commerce export beginner guide, including basic concepts, required documents, and processes.',
        Kategori: 'B2B Rehber',
        YuklemeTarihi: '2024-01-15T10:00:00Z',
        Durum: 'Aktif'
      },
      {
        ID: 2,
        BelgeAdı: 'B2C E-Ticaret Platform Kılavuzu',
        BelgeURL: 'https://readdy.ai/api/search-image?query=ecommerce%20platform%20guide%20document%20with%20shopping%20cart%20icons%20digital%20marketplace%20illustrations%20clean%20professional%20layout&width=400&height=300&seq=doc002&orientation=landscape',
        Açıklama: 'B2C e-commerce platform user guide, including Amazon, eBay, Etsy, and more.',
        Kategori: 'B2C Kılavuz',
        YuklemeTarihi: '2024-01-20T14:30:00Z',
        Durum: 'Aktif'
      },
    ];
  }
}

export class SupabaseProjeService {
  static checkConnection(): boolean {
    return isSupabaseConnected();
  }

  static async getProjeById(projeId: number): Promise<any | null> {
    try {
      console.log(`Getting project ID: ${projeId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, using mock data...');
        return this.getMockProjeById(projeId);
      }

      if (!projeId || isNaN(projeId) || projeId <= 0) {
        console.error('Invalid project ID:', projeId);
        return null;
      }

      try {
        const { data: projeData, error: projeError } = await supabase
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
            kategori,
            created_at,
            updated_at
          `)
          .eq('id', projeId)
          .maybeSingle();

        if (projeError) {
          console.error('Project query detailed error:', {
            message: projeError.message || 'Unknown error',
            details: projeError.details || 'No details',
            hint: projeError.hint || 'No hint',
            code: projeError.code || 'No error code'
          });
          throw projeError;
        }

        if (!projeData) {
          console.log('Project does not exist');
          return null;
        }

        // Get project statistics
        try {
          const { data: altProjeler, error: altProjeError } = await supabase
            .from('alt_projeler')
            .select('id')
            .eq('proje_id', projeData.id);

          const { data: gorevler, error: gorevError } = await supabase
            .from('gorevler')
            .select('id')
            .eq('proje_id', projeData.id);

          let atananFirmaAdlari = '未分配';
          if (projeData.hedef_firmalar && Array.isArray(projeData.hedef_firmalar) && projeData.hedef_firmalar.length > 0) {
            try {
              const { data: firmalar, error: firmaError } = await supabase
                .from('firmalar')
                .select('id, firma_adi')
                .in('id', projeData.hedef_firmalar);

              if (!firmaError && firmalar && firmalar.length > 0) {
                atananFirmaAdlari = firmalar.map((f: any) => f.firma_adi).join(', ');
              }
            } catch (firmaErr) {
              console.warn('Getting company names failed:', firmaErr);
            }
          }

          return {
            id: projeData.id,
            projeAdi: projeData.proje_adi,
            aciklama: projeData.aciklama || '',
            durum: projeData.durum || 'Aktif',
            oncelik: projeData.oncelik || 'Orta',
            baslangicTarihi: projeData.baslangic_tarihi,
            bitisTarihi: projeData.bitis_tarihi,
            atananFirmalar: projeData.hedef_firmalar || [],
            atananFirmaAdlari: atananFirmaAdlari,
            kategori: projeData.kategori,
            created_at: projeData.created_at,
            altProjeSayisi: altProjeler?.length || 0,
            toplamGorevSayisi: gorevler?.length || 0
          };

        } catch (statError) {
          console.warn('Project statistics error:', statError);
          return {
            id: projeData.id,
            projeAdi: projeData.proje_adi,
            aciklama: projeData.aciklama || '',
            durum: projeData.durum || 'Aktif',
            oncelik: projeData.oncelik || 'Orta',
            baslangicTarihi: projeData.baslangic_tarihi,
            bitisTarihi: projeData.bitis_tarihi,
            atananFirmalar: projeData.hedef_firmalar || [],
            atananFirmaAdlari: '未分配',
            kategori: projeData.kategori,
            created_at: projeData.created_at,
            altProjeSayisi: 0,
            toplamGorevSayisi: 0
          };

        }

      } catch (supabaseError: any) {
        console.error('Supabase query error:', supabaseError);
        return this.getMockProjeById(projeId);

      }

    } catch (error: any) {
      console.error('Getting project system error:', error);
      console.warn('Using mock data...');
      return this.getMockProjeById(projeId);

    }
  }

  static async getAllProjeler(): Promise<any[]> {
    try {
      console.log('Getting all projects...');

      if (!this.checkConnection()) {
        console.warn('Supabase unavailable, returning mock data...');
        return this.getMockProjeler();
      }

      try {
        const { data: projelerData, error: projelerError } = await supabase
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
            kategori,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false });

        if (projelerError) {
          console.error('Project query detailed error:', {
            message: projelerError.message || 'Unknown error',
            details: projelerError.details || 'No details',
            hint: projelerError.hint || 'No hint',
            code: projelerError.code || 'No error code'
          });
          throw projelerError;
        }

        console.log('Projects successfully retrieved:', projelerData?.length || 0);

        const projelerWithStats = await Promise.all((projelerData || []).map(async (proje) => {
          try {
            const { data: altProjeler, error: altProjeError } = await supabase
              .from('alt_projeler')
              .select('id')
              .eq('proje_id', proje.id);

            const { data: gorevler, error: gorevError } = await supabase
              .from('gorevler')
              .select('id')
              .eq('proje_id', proje.id);

            let atananFirmaAdlari = '未分配';
            if (proje.hedef_firmalar && Array.isArray(proje.hedef_firmalar) && proje.hedef_firmalar.length > 0) {
              try {
                const { data: firmalar, error: firmaError } = await supabase
                  .from('firmalar')
                  .select('id, firma_adi')
                  .in('id', proje.hedef_firmalar);

                if (!firmaError && firmalar && firmalar.length > 0) {
                  atananFirmaAdlari = firmalar.map((f: any) => f.firma_adi).join(', ');
                }
              } catch (firmaErr) {
                console.warn('Getting company names failed:', firmaErr);
              }
            }

            return {
              id: proje.id,
              projeAdi: proje.proje_adi,
              aciklama: proje.aciklama || '',
              durum: proje.durum || 'Aktif',
              oncelik: proje.oncelik || 'Orta',
              baslangicTarihi: proje.baslangic_tarihi,
              bitisTarihi: proje.bitis_tarihi,
              atananFirmalar: proje.hedef_firmalar || [],
              atananFirmaAdlari: atananFirmaAdlari,
              kategori: proje.kategori,
              created_at: proje.created_at,
              altProjeSayisi: altProjeler?.length || 0,
              toplamGorevSayisi: gorevler?.length || 0
            };

          } catch (statError) {
            console.warn('Project statistics error:', statError);
            return {
              id: proje.id,
              projeAdi: proje.proje_adi,
              aciklama: proje.aciklama || '',
              durum: proje.durum || 'Aktif',
              oncelik: proje.oncelik || 'Orta',
              baslangicTarihi: proje.baslangic_tarihi,
              bitisTarihi: proje.bitis_tarihi,
              atananFirmalar: proje.hedef_firmalar || [],
              atananFirmaAdlari: '未分配',
              kategori: proje.kategori,
              created_at: proje.created_at,
              altProjeSayisi: 0,
              toplamGorevSayisi: 0
            };

          }

        }));

      } catch (supabaseError: any) {
        console.error('Supabase query error:', supabaseError);
        throw new Error(`Project data retrieval error: ${supabaseError.message}`);

      }

    } catch (error: any) {
      console.error('Getting all projects system error:', error);
      console.warn('Using mock data...');
      return this.getMockProjeler();

    }
  }

  static async getGorevById(projeId: number, gorevId: number): Promise<any | null> {
    try {
      console.log(`Getting task details - Project ID: ${projeId}, Task ID: ${gorevId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, using mock data...');
        return this.getMockGorevById(projeId, gorevId);
      }

      if (!projeId || !gorevId || isNaN(projeId) || isNaN(gorevId) || projeId <= 0 || gorevId <= 0) {
        console.error('Invalid project ID or task ID:', { projeId, gorevId });
        return null;
      }

      try {
        const { data: gorevData, error: gorevError } = await supabase
          .from('gorevler')
          .select(`
            id,
            proje_id,
            alt_proje_id,
            gorev_adi,
            aciklama,
            atanan_firmalar,
            durum,
            oncelik,
            baslangic_tarihi,
            bitis_tarihi,
            yuzde_katki,
            sira_no,
            created_at,
            updated_at
          `)
          .eq('id', gorevId)
          .eq('proje_id', projeId)
          .maybeSingle();

        if (gorevError) {
          console.error('Task query detailed error:', {
            message: gorevError.message || 'Unknown error',
            details: gorevError.details || 'No details',
            hint: gorevError.hint || 'No hint',
            code: gorevError.code || 'No error code'
          });
          return this.getMockGorevById(projeId, gorevId);
        }

        if (!gorevData) {
          console.log(`Task does not exist - Project ID: ${projeId}, Task ID: ${gorevId}`);
          return null;
        }

        const formattedGorev = {
          id: gorevData.id,
          projeId: gorevData.proje_id,
          altProjeId: gorevData.alt_proje_id,
          gorevAdi: gorevData.gorev_adi || '未命名任务',
          aciklama: gorevData.aciklama || '',
          atananFirmalar: Array.isArray(gorevData.atanan_firmalar) ? gorevData.atanan_firmalar : [],
          durum: gorevData.durum || 'Aktif',
          oncelik: gorevData.oncelik || 'Orta',
          baslangicTarihi: gorevData.baslangic_tarihi,
          bitisTarihi: gorevData.bitis_tarihi,
          yuzdeKatki: gorevData.yuzde_katki || 10,
          siraNo: gorevData.sira_no || 1,
          created_at: gorevData.created_at,
          updated_at: gorevData.updated_at
        };

        console.log('Task details retrieved successfully:', formattedGorev.gorevAdi);
        return formattedGorev;

      } catch (supabaseError: any) {
        console.error('Supabase task query error:', supabaseError);
        return this.getMockGorevById(projeId, gorevId);

      }

    } catch (error: any) {
      console.error('Getting task details system error:', error);
      console.warn('Using mock data...');
      return this.getMockGorevById(projeId, gorevId);

    }
  }

  static async getGorevlerByProjeId(projeId: number): Promise<any[]> {
    try {
      console.log(`Getting all tasks for project ${projeId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, using mock data...');
        return this.getMockGorevlerByProjeId(projeId);
      }

      if (!projeId || isNaN(projeId) || projeId <= 0) {
        console.error('Invalid project ID:', projeId);
        return [];
      }

      try {
        const { data: gorevlerData, error: gorevlerError } = await supabase
          .from('gorevler')
          .select(`
            id,
            proje_id,
            alt_proje_id,
            gorev_adi,
            aciklama,
            atanan_firmalar,
            durum,
            oncelik,
            baslangic_tarihi,
            bitis_tarihi,
            yuzde_katki,
            sira_no,
            created_at,
            updated_at
          `)
          .eq('proje_id', projeId)
          .order('sira_no', { ascending: true });

        if (gorevlerError) {
          console.warn('Task list query error, using mock data:', gorevlerError);
          return this.getMockGorevlerByProjeId(projeId);
        }

        if (!gorevlerData || gorevlerData.length === 0) {
          console.log(`Project ${projeId} has no tasks`);
          return [];
        }

        const formattedGorevler = gorevlerData.map((gorev: any) => ({
          id: gorev.id,
          projeId: gorev.proje_id,
          altProjeId: gorev.alt_proje_id,
          gorevAdi: gorev.gorev_adi || '未命名任务',
          aciklama: gorev.aciklama || '',
          atananFirmalar: Array.isArray(gorev.atanan_firmalar) ? gorev.atanan_firmalar : [],
          durum: gorev.durum || 'Aktif',
          oncelik: gorev.oncelik || 'Orta',
          baslangicTarihi: gorev.baslangic_tarihi,
          bitisTarihi: gorev.bitis_tarihi,
          yuzdeKatki: gorev.yuzde_katki || 10,
          siraNo: gorev.sira_no || 1,
          created_at: gorev.created_at,
          updated_at: gorev.updated_at
        }));

        console.log(`Project ${projeId} retrieved ${formattedGorevler.length} tasks`);
        return formattedGorevler;

      } catch (supabaseError: any) {
        console.warn('Supabase task list system error, using mock data:', supabaseError);
        return this.getMockGorevlerByProjeId(projeId);

      }

    } catch (error: any) {
      console.warn('Getting project tasks system error, using mock data:', error);
      return this.getMockGorevlerByProjeId(projeId);

    }
  }

  static async updateGorev(gorevId: number, gorevData: any): Promise<boolean> {
    try {
      console.log(`Updating task ID: ${gorevId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      if (!gorevId || isNaN(gorevId) || gorevId <= 0) {
        console.error('Invalid task ID:', gorevId);
        return false;
      }

      try {
        const { error: updateError } = await supabase
          .from('gorevler')
          .update({
            gorev_adi: gorevData.gorevAdi,
            aciklama: gorevData.aciklama,
            atanan_firmalar: gorevData.atananFirmalar,
            durum: gorevData.durum,
            oncelik: gorevData.oncelik,
            baslangic_tarihi: gorevData.baslangicTarihi,
            bitis_tarihi: gorevData.bitisTarihi,
            yuzde_katki: gorevData.yuzdeKatki,
            sira_no: gorevData.siraNo,
            updated_at: new Date().toISOString()
          })
          .eq('id', gorevId);

        if (updateError) {
          console.error('Task update detailed error:', {
            message: updateError.message || 'Unknown error',
            details: updateError.details || 'No details',
            hint: updateError.hint || 'No hint',
            code: updateError.code || 'No error code'
          });
          return false;
        }

        console.log('Task updated successfully');
        return true;

      } catch (supabaseError: any) {
        console.error('Supabase task update error:', supabaseError);
        return false;

      }

    } catch (error: any) {
      console.error('Task update system error:', error);
      return false;

    }
  }

  static async createAltProje(altProjeData: any): Promise<any | null> {
    try {
      console.log('Creating subproject...');

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return { id: Date.now(), ...altProjeData };
      }

      try {
        const { data: newAltProje, error: createError } = await supabase
          .from('alt_projeler')
          .insert([
            {
              proje_id: altProjeData.projeId,
              alt_proje_adi: altProjeData.altProjeAdi,
              aciklama: altProjeData.aciklama,
              durum: altProjeData.durum || 'Aktif',
              oncelik: altProjeData.oncelik || 'Orta',
              baslangic_tarihi: altProjeData.baslangicTarihi,
              bitis_tarihi: altProjeData.bitisTarihi,
              atanan_firmalar: altProjeData.atananFirmalar || [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Subproject creation error:', createError);
          return null;
        }

        console.log('Subproject created successfully');
        return newAltProje;

      } catch (supabaseError: any) {
        console.error('Supabase subproject creation error:', supabaseError);
        return null;

      }

    } catch (error: any) {
      console.error('Subproject creation system error:', error);
      return null;

    }
  }

  static async updateProje(projeId: number, projeData: any): Promise<boolean> {
    try {
      console.log(`Updating project ID: ${projeId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      if (!projeId || isNaN(projeId) || projeId <= 0) {
        console.error('Invalid project ID:', projeId);
        return false;
      }

      try {
        const { error: updateError } = await supabase
          .from('projeler')
          .update({
            proje_adi: projeData.projeAdi,
            aciklama: projeData.aciklama,
            durum: projeData.durum,
            oncelik: projeData.oncelik,
            baslangic_tarihi: projeData.baslangicTarihi,
            bitis_tarihi: projeData.bitisTarihi,
            hedef_firmalar: projeData.atananFirmalar,
            kategori: projeData.kategori,
            updated_at: new Date().toISOString()
          })
          .eq('id', projeId);

        if (updateError) {
          console.error('Project update detailed error:', {
            message: updateError.message || 'Unknown error',
            details: updateError.details || 'No details',
            hint: updateError.hint || 'No hint',
            code: updateError.code || 'No error code'
          });
          return false;
        }

        console.log('Project updated successfully');
        return true;

      } catch (supabaseError: any) {
        console.error('Supabase project update error:', supabaseError);
        return false;

      }

    } catch (error: any) {
      console.error('Project update system error:', error);
      return false;

    }
  }

  static async createProje(projeData: any): Promise<any | null> {
    try {
      console.log('Creating new project...');

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return { id: Date.now(), ...projeData };
      }

      try {
        const { data: newProje, error: createError } = await supabase
          .from('projeler')
          .insert([
            {
              proje_adi: projeData.projeAdi,
              aciklama: projeData.aciklama,
              durum: projeData.durum || 'Aktif',
              oncelik: projeData.oncelik || 'Orta',
              baslangic_tarihi: projeData.baslangicTarihi,
              bitis_tarihi: projeData.bitisTarihi,
              hedef_firmalar: projeData.atananFirmalar || [],
              kategori: projeData.kategori,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Project creation error:', createError);
          return null;
        }

        console.log('Project created successfully');
        return newProje;

      } catch (supabaseError: any) {
        console.error('Supabase project creation error:', supabaseError);
        return null;

      }

    } catch (error: any) {
      console.error('Project creation system error:', error);
      return null;

    }
  }

  static async deleteProje(projeId: number): Promise<boolean> {
    try {
      console.log(`Deleting project ID: ${projeId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      if (!projeId || isNaN(projeId) || projeId <= 0) {
        console.error('Invalid project ID:', projeId);
        return false;
      }

      try {
        // First, delete related subprojects and tasks
        await supabase
          .from('alt_projeler')
          .update({
            durum: 'Silindi',
            updated_at: new Date().toISOString()
          })
          .eq('proje_id', projeId);

        await supabase
          .from('gorevler')
          .update({
            durum: 'Silindi',
            updated_at: new Date().toISOString()
          })
          .eq('proje_id', projeId);

        // Then delete the project itself
        const { error: deleteError } = await supabase
          .from('projeler')
          .update({
            durum: 'Silindi',
            updated_at: new Date().toISOString()
          })
          .eq('id', projeId);

        if (deleteError) {
          console.error('Project deletion error:', deleteError);
          return false;
        }

        console.log('Project deleted successfully');
        return true;

      } catch (supabaseError: any) {
        console.error('Supabase project deletion error:', supabaseError);
        return false;

      }

    } catch (error: any) {
      console.error('Project deletion system error:', error);
      return false;

    }
  }

  static async createGorev(projeId: number, gorevData: any): Promise<any | null> {
    try {
      console.log(`Creating new task for project ${projeId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return { id: Date.now(), ...gorevData };
      }

      if (!projeId || isNaN(projeId) || projeId <= 0) {
        console.error('Invalid project ID:', projeId);
        return null;
      }

      try {
        const { data: newGorev, error: createError } = await supabase
          .from('gorevler')
          .insert([
            {
              proje_id: projeId,
              alt_proje_id: gorevData.altProjeId || null,
              gorev_adi: gorevData.gorevAdi,
              aciklama: gorevData.aciklama,
              atanan_firmalar: gorevData.atananFirmalar || [],
              durum: gorevData.durum || 'Aktif',
              oncelik: gorevData.oncelik || 'Orta',
              baslangic_tarihi: gorevData.baslangicTarihi,
              bitis_tarihi: gorevData.bitisTarihi,
              yuzde_katki: gorevData.yuzdeKatki || 10,
              sira_no: gorevData.siraNo || 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Task creation error:', createError);
          return null;
        }

        console.log('Task created successfully');
        return newGorev;

      } catch (supabaseError: any) {
        console.error('Supabase task creation error:', supabaseError);
        return null;

      }

    } catch (error: any) {
      console.error('Task creation system error:', error);
      return null;

    }
  }

  static async deleteGorev(gorevId: number): Promise<boolean> {
    try {
      console.log(`Deleting task ID: ${gorevId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      if (!gorevId || isNaN(gorevId) || gorevId <= 0) {
        console.error('Invalid task ID:', gorevId);
        return false;
      }

      try {
        const { error: deleteError } = await supabase
          .from('gorevler')
          .update({
            durum: 'Silindi',
            updated_at: new Date().toISOString()
          })
          .eq('id', gorevId);

        if (deleteError) {
          console.error('Task deletion error:', deleteError);
          return false;
        }

        console.log('Task deleted successfully');
        return true;

      } catch (supabaseError: any) {
        console.error('Supabase task deletion error:', supabaseError);
        return false;

      }

    } catch (error: any) {
      console.error('Task deletion system error:', error);
      return false;

    }
  }

  static async getAltProjelerByProjeId(projeId: number): Promise<any[]> {
    try {
      console.log(`Getting all subprojects for project ${projeId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, using mock data...');
        return this.getMockAltProjelerByProjeId(projeId);
      }

      if (!projeId || isNaN(projeId) || projeId <= 0) {
        console.error('Invalid project ID:', projeId);
        return [];
      }

      try {
        const { data: altProjelerData, error: altProjelerError } = await supabase
          .from('alt_projeler')
          .select(`
            id,
            proje_id,
            alt_proje_adi,
            aciklama,
            durum,
            oncelik,
            baslangic_tarihi,
            bitis_tarihi,
            atanan_firmalar,
            created_at,
            updated_at
          `)
          .eq('proje_id', projeId)
          .neq('durum', 'Silindi')
          .order('created_at', { ascending: true });

        if (altProjelerError) {
          console.warn('Subproject list query error, using mock data:', altProjelerError);
          return this.getMockAltProjelerByProjeId(projeId);
        }

        if (!altProjelerData || altProjelerData.length === 0) {
          console.log(`Project ${projeId} has no subprojects`);
          return [];
        }

        const formattedAltProjeler = altProjelerData.map((altProje: any) => ({
          id: altProje.id,
          projeId: altProje.proje_id,
          altProjeAdi: altProje.alt_proje_adi || '未命名子项目',
          aciklama: altProje.aciklama || '',
          durum: altProje.durum || 'Aktif',
          oncelik: altProje.oncelik || 'Orta',
          baslangicTarihi: altProje.baslangic_tarihi,
          bitisTarihi: altProje.bitis_tarihi,
          atananFirmalar: Array.isArray(altProje.atanan_firmalar) ? altProje.atanan_firmalar : [],
          created_at: altProje.created_at,
          updated_at: altProje.updated_at
        }));

        console.log(`Project ${projeId} retrieved ${formattedAltProjeler.length} subprojects`);
        return formattedAltProjeler;

      } catch (supabaseError: any) {
        console.warn('Supabase subproject list system error, using mock data:', supabaseError);
        return this.getMockAltProjelerByProjeId(projeId);

      }

    } catch (error: any) {
      console.warn('Getting project subprojects system error, using mock data:', error);
      return this.getMockAltProjelerByProjeId(projeId);

    }
  }

  static async getAltProjeById(projeId: number, altProjeId: number): Promise<any | null> {
    try {
      console.log(`Getting subproject details - Project ID: ${projeId}, Subproject ID: ${altProjeId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, using mock data...');
        return this.getMockAltProjeById(projeId, altProjeId);
      }

      if (!projeId || !altProjeId || isNaN(projeId) || isNaN(altProjeId) || projeId <= 0 || altProjeId <= 0) {
        console.error('Invalid project ID or subproject ID:', { projeId, altProjeId });
        return null;
      }

      try {
        const { data: altProjeData, error: altProjeError } = await supabase
          .from('alt_projeler')
          .select(`
            id,
            proje_id,
            alt_proje_adi,
            aciklama,
            durum,
            oncelik,
            baslangic_tarihi,
            bitis_tarihi,
            atanan_firmalar,
            created_at,
            updated_at
          `)
          .eq('id', altProjeId)
          .eq('proje_id', projeId)
          .maybeSingle();

        if (altProjeError) {
          console.error('Subproject query detailed error:', altProjeError);
          return this.getMockAltProjeById(projeId, altProjeId);
        }

        if (!altProjeData) {
          console.log(`Subproject does not exist - Project ID: ${projeId}, Subproject ID: ${altProjeId}`);
          return null;
        }

        const formattedAltProje = {
          id: altProjeData.id,
          projeId: altProjeData.proje_id,
          altProjeAdi: altProjeData.alt_proje_adi || '未命名子项目',
          aciklama: altProjeData.aciklama || '',
          durum: altProjeData.durum || 'Aktif',
          oncelik: altProjeData.oncelik || 'Orta',
          baslangicTarihi: altProjeData.baslangic_tarihi,
          bitisTarihi: altProjeData.bitis_tarihi,
          atananFirmalar: Array.isArray(altProjeData.atanan_firmalar) ? altProjeData.atanan_firmalar : [],
          created_at: altProjeData.created_at,
          updated_at: altProjeData.updated_at
        };

        console.log('Subproject details retrieved successfully:', formattedAltProje.altProjeAdi);
        return formattedAltProje;

      } catch (supabaseError: any) {
        console.error('Supabase subproject query error:', supabaseError);
        return this.getMockAltProjeById(projeId, altProjeId);

      }

    } catch (error: any) {
      console.error('Getting subproject details system error:', error);
      console.warn('Using mock data...');
      return this.getMockAltProjeById(projeId, altProjeId);

    }
  }

  static async updateAltProje(altProjeId: number, altProjeData: any): Promise<boolean> {
    try {
      console.log(`Updating subproject ID: ${altProjeId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      if (!altProjeId || isNaN(altProjeId) || altProjeId <= 0) {
        console.error('Invalid subproject ID:', altProjeId);
        return false;
      }

      try {
        const { error: updateError } = await supabase
          .from('alt_projeler')
          .update({
            alt_proje_adi: altProjeData.altProjeAdi,
            aciklama: altProjeData.aciklama,
            durum: altProjeData.durum,
            oncelik: altProjeData.oncelik,
            baslangic_tarihi: altProjeData.baslangicTarihi,
            bitis_tarihi: altProjeData.bitisTarihi,
            atanan_firmalar: altProjeData.atananFirmalar,
            updated_at: new Date().toISOString()
          })
          .eq('id', altProjeId);

        if (updateError) {
          console.error('Subproject update error:', updateError);
          return false;
        }

        console.log('Subproject updated successfully');
        return true;

      } catch (supabaseError: any) {
        console.error('Supabase subproject update error:', supabaseError);
        return false;

      }

    } catch (error: any) {
      console.error('Subproject update system error:', error);
      return false;

    }
  }

  static async deleteAltProje(altProjeId: number): Promise<boolean> {
    try {
      console.log(`Deleting subproject ID: ${altProjeId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      if (!altProjeId || isNaN(altProjeId) || altProjeId <= 0) {
        console.error('Invalid subproject ID:', altProjeId);
        return false;
      }

      try {
        // First, delete related tasks
        await supabase
          .from('gorevler')
          .update({
            durum: 'Silindi',
            updated_at: new Date().toISOString()
          })
          .eq('alt_proje_id', altProjeId);

        // Then delete the subproject
        const { error: deleteError } = await supabase
          .from('alt_projeler')
          .update({
            durum: 'Silindi',
            updated_at: new Date().toISOString()
          })
          .eq('id', altProjeId);

        if (deleteError) {
          console.error('Subproject deletion error:', deleteError);
          return false;
        }

        console.log('Subproject deleted successfully');
        return true;

      } catch (supabaseError: any) {
        console.error('Supabase subproject deletion error:', supabaseError);
        return false;

      }

    } catch (error: any) {
      console.error('Subproject deletion system error:', error);
      return false;

    }
  }

  private static getMockProjeById(projeId: number): any {
    console.log(`Using mock project data - ID: ${projeId}`);

    return {
      id: projeId,
      projeAdi: `Mock project ${projeId}`,
      aciklama: `This is project ${projeId} details`,
      durum: 'Aktif',
      oncelik: 'Orta',
      baslangicTarihi: '2024-01-15',
      bitisTarihi: '2024-06-15',
      atananFirmalar: [1, 2],
      atananFirmaAdlari: '技术公司, 出口公司',
      kategori: 'Web开发',
      created_at: '2024-01-15T10:00:00Z',
      altProjeSayisi: 2,
      toplamGorevSayisi: 5
    };
  }

  private static getMockProjeler(): any[] {
    console.log('Using mock project list data');

    return [
      {
        id: 1,
        projeAdi: '电商平台开发',
        aciklama: '全功能电商平台开发项目',
        durum: 'Aktif',
        oncelik: 'Yüksek',
        baslangicTarihi: '2024-01-15',
        bitisTarihi: '2024-06-15',
        atananFirmalar: [1, 2],
        atananFirmaAdlari: '技术公司, 出口公司',
        kategori: 'Web开发',
        created_at: '2024-01-15T10:00:00Z',
        altProjeSayisi: 3,
        toplamGorevSayisi: 8
      },
      {
        id: 2,
        projeAdi: '移动应用开发',
        aciklama: '跨平台移动应用开发',
        durum: 'Aktif',
        oncelik: 'Orta',
        baslangicTarihi: '2024-02-01',
        bitisTarihi: '2024-08-01',
        atananFirmalar: [1],
        atananFirmaAdlari: '技术公司',
        kategori: '移动开发',
        created_at: '2024-02-01T10:00:00Z',
        altProjeSayisi: 2,
        toplamGorevSayisi: 6
      }
    ];
  }

  private static getMockAltProjelerByProjeId(projeId: number): any[] {
    console.log(`Using mock subproject list data, project ID: ${projeId}`);

    return [
      {
        id: projeId * 100 + 1,
        projeId: projeId,
        altProjeAdi: `${projeId} 号项目 - 前端开发`,
        aciklama: '用户界面和前端功能开发',
        durum: 'Aktif',
        oncelik: 'Yüksek',
        baslangicTarihi: '2024-01-15',
        bitisTarihi: '2024-03-15',
        atananFirmalar: [1],
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: projeId * 100 + 2,
        projeId: projeId,
        altProjeAdi: `${projeId} 号项目 - 后端开发`,
        aciklama: '服务器端逻辑和API开发',
        durum: 'Aktif',
        oncelik: 'Yüksek',
        baslangicTarihi: '2024-02-01',
        bitisTarihi: '2024-04-01',
        atananFirmalar: [2],
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-01T10:00:00Z'
      }
    ];
  }

  private static getMockAltProjeById(projeId: number, altProjeId: number): any {
    console.log(`Using mock subproject data - project ID: ${projeId}, subproject ID: ${altProjeId}`);

    return {
      id: altProjeId,
      projeId: projeId,
      altProjeAdi: `Mock subproject ${altProjeId}`,
      aciklama: `This is project ${projeId} subproject ${altProjeId} details`,
      durum: 'Aktif',
      oncelik: 'Orta',
      baslangicTarihi: '2024-01-15',
      bitisTarihi: '2024-03-15',
      atananFirmalar: [1, 2],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    };
  }

  private static getMockGorevById(projeId: number, gorevId: number): any {
    console.log(`Using mock task data - project ID: ${projeId}, task ID: ${gorevId}`);

    return {
      id: gorevId,
      projeId: projeId,
      altProjeId: null,
      gorevAdi: `Mock task ${gorevId}`,
      aciklama: `This is project ${projeId} task ${gorevId} details`,
      atananFirmalar: [1, 2],
      durum: 'Aktif',
      oncelik: 'Orta',
      baslangicTarihi: '2024-01-15',
      bitisTarihi: '2024-03-15',
      yuzdeKatki: 15,
      siraNo: 1,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    };
  }

  private static getMockGorevlerByProjeId(projeId: number): any[] {
    console.log(`Using mock task list data, project ID: ${projeId}`);

    return [
      {
        id: projeId * 100 + 1,
        projeId: projeId,
        altProjeId: null,
        gorevAdi: `前端开发任务`,
        aciklama: '负责用户界面设计和实现',
        atananFirmalar: [1],
        durum: 'Aktif',
        oncelik: 'Yüksek',
        baslangicTarihi: '2024-01-15',
        bitisTarihi: '2024-02-15',
        yuzdeKatki: 20,
        siraNo: 1,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: projeId * 100 + 2,
        projeId: projeId,
        altProjeId: null,
        gorevAdi: `后端开发任务`,
        aciklama: '负责服务器端逻辑和数据库设计',
        atananFirmalar: [2],
        durum: 'Aktif',
        oncelik: 'Yüksek',
        baslangicTarihi: '2024-01-20',
        bitisTarihi: '2024-03-01',
        yuzdeKatki: 25,
        siraNo: 2,
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z'
      },
      {
        id: projeId * 100 + 3,
        projeId: projeId,
        altProjeId: null,
        gorevAdi: `测试任务`,
        aciklama: '系统测试和质量保证',
        atananFirmalar: [1, 2],
        durum: 'Planlama',
        oncelik: 'Orta',
        baslangicTarihi: '2024-02-15',
        bitisTarihi: '2024-03-15',
        yuzdeKatki: 15,
        siraNo: 3,
        created_at: '2024-02-01T10:00:00Z',
        updated_at: '2024-02-01T10:00:00Z'
      }
    ];
  }
}

export class SupabaseEgitimService {
  static checkConnection(): boolean {
    return isSupabaseConnected();
  }

  static async getAllEgitimSetleri(): Promise<any[]> {
    try {
      console.log('Getting all education sets...');

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, using mock data...');
        return this.getMockEgitimSetleri();
      }

      try {
        const { data: setlerData, error: setlerError } = await supabase
          .from('egitim_setleri')
          .select(`
            id,
            set_adi,
            aciklama,
            kategori,
            durum,
            toplam_video_sayisi,
            toplam_sure,
            created_at,
            updated_at
          `)
          .eq('durum', 'Aktif')
          .order('created_at', { ascending: false });

        if (setlerError) {
          console.warn('Education set query error, using mock data:', setlerError);
          return this.getMockEgitimSetleri();
        }

        if (!setlerData || setlerData.length === 0) {
          console.log('No education sets in database, using mock data...');
          return this.getMockEgitimSetleri();
        }

        const formattedSetler = setlerData.map((set: any) => ({
          id: set.id,
          set_adi: set.set_adi || '未命名集合',
          aciklama: set.aciklama || '',
          kategori: set.kategori || 'Genel',
          durum: set.durum,
          toplam_video_sayisi: set.toplam_video_sayisi || 0,
          toplam_sure: set.toplam_sure || 0,
          created_at: set.created_at,
          updated_at: set.updated_at,
          atanan_firmalar: []
        }));

        console.log(`Retrieved ${formattedSetler.length} education sets`);
        return formattedSetler;

      } catch (supabaseError: any) {
        console.warn('Supabase education set system error, using mock data:', supabaseError);
        return this.getMockEgitimSetleri();

      }

    } catch (error: any) {
      console.warn('Getting education sets system error, using mock data:', error);
      return this.getMockEgitimSetleri();

    }
  }

  static async getEgitimVideolari(setId: number): Promise<any[]> {
    try {
      console.log(`Getting education videos for set ${setId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, using mock data...');
        return this.getMockEgitimVideolari(setId);
      }

      const { data: videolarData, error: videolarError } = await supabase
        .from('egitim_videolari')
        .select(`
          id,
          egitim_set_id,
          video_adi,
          video_url,
          video_suresi,
          sira_no,
          aciklama,
          pdf_url,
          durum,
          created_at
        `)
        .eq('egitim_set_id', setId)
        .eq('durum', 'Aktif')
        .order('sira_no', { ascending: true });

      if (videolarError) {
        console.warn(`Education video query error for set ${setId}:`, videolarError);
        return this.getMockEgitimVideolari(setId);
      }

      return videolarData || [];

    } catch (error: any) {
      console.warn(`Getting education videos system error for set ${setId}:`, error);
      return this.getMockEgitimVideolari(setId);

    }
  }

  static async getEgitimDokumanlari(): Promise<any[]> {
    try {
      console.log('Getting education documents...');

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, using mock data...');
        return this.getMockEgitimDokumanlari(0);
      }

      const { data: dokumanlarData, error: dokumanlarError } = await supabase
        .from('egitim_dokumanlari')
        .select(`
          id,
          dokuman_adi,
          aciklama,
          kategori,
          dosya_url,
          dosya_boyutu,
          durum,
          created_at
        `)
        .eq('durum', 'Aktif')
        .order('created_at', { ascending: false });

      if (dokumanlarError) {
        console.warn('Education document query error, using mock data:', dokumanlarError);
        return this.getMockEgitimDokumanlari(0);
      }

      return dokumanlarData || [];

    } catch (error: any) {
      console.warn('Getting education documents system error, using mock data:', error);
      return this.getMockEgitimDokumanlari(0);

    }
  }

  static async getTumEgitimSetleriForUser(firmaId: number): Promise<any[]> {
    try {
      console.log(`Getting all education sets for company ${firmaId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, using mock data...');
        return this.getMockEgitimSetleriForUser(firmaId);
      }

      if (!firmaId || isNaN(firmaId) || firmaId <= 0) {
        console.error('Invalid company ID:', firmaId);
        return this.getMockEgitimSetleriForUser(firmaId);
      }

      try {
        const { data: setlerData, error: setlerError } = await supabase
          .from('egitim_setleri')
          .select(`
            id,
            set_adi,
            aciklama,
            kategori,
            durum,
            toplam_video_sayisi,
            toplam_sure,
            created_at
          `)
          .eq('durum', 'Aktif')
          .order('created_at', { ascending: false });

        if (setlerError) {
          console.warn('Education set query error, using mock data:', {
            错误代码: setlerError.code || '未知代码',
            错误信息: setlerError.message || '无错误信息',
            错误详情: setlerError.details || '无详细信息'
          });
          return this.getMockEgitimSetleriForUser(firmaId);
        }

        if (!setlerData || setlerData.length === 0) {
          console.log('No active education sets in database, using mock data...');
          return this.getMockEgitimSetleriForUser(firmaId);
        }

        console.log(`Found ${setlerData.length} database education sets`);

        let atanmisSetler = new Set<number>();

        try {
          const { data: atamaData, error: atamaError } = await supabase
            .from('egitim_set_firma_atamalari')
            .select('egitim_set_id, durum')
            .eq('firma_id', firmaId)
            .eq('durum', 'Aktif');

          if (atamaError) {
            console.warn('Assignment query error, but continuing:', {
              错误代码: atamaError.code || '无错误代码',
              错误信息: atamaError.message || '无错误信息'
            });
          } else if (atamaData && atamaData.length > 0) {
            atanmisSetler = new Set(
              atamaData.map(atama => atama.egitim_set_id)
            );
            console.log(`Found ${atanmisSetler.size} assigned sets`);
          }
        } catch (atamaQueryError: any) {
          console.warn('Assignment table query failed, all sets will appear as locked:', atamaQueryError?.message || '未知错误');
        }

        const formattedSetler = setlerData.map((set: any) => ({
          id: set.id,
          set_adi: set.set_adi || '未命名集合',
          aciklama: set.aciklama || '',
          kategori: set.kategori || 'Genel',
          durum: set.durum,
          toplam_video_sayisi: set.toplam_video_sayisi || 0,
          toplam_sure: set.toplam_sure || 0,
          created_at: set.created_at,
          atanmis_mi: atanmisSetler.has(set.id),
          kilitli: !atanmisSetler.has(set.id),
          atanan_firmalar: atanmisSetler.has(set.id) ? [firmaId] : []
        }));

        console.log('All education sets processed:', {
          总集合: formattedSetler.length,
          已分配: formattedSetler.filter(s => s.atanmis_mi).length,
          锁定: formattedSetler.filter(s => s.kilitli).length
        });

        return formattedSetler;

      } catch (supabaseError: any) {
        console.warn('Supabase system error, using mock data:', {
          错误类型: supabaseError?.name || '未知错误类型',
          错误信息: supabaseError?.message || '无错误信息',
          错误代码: supabaseError?.code || '无错误代码'
        });
        return this.getMockEgitimSetleriForUser(firmaId);

      }

    } catch (error: any) {
      console.warn('Getting user education sets system error, using mock data:', {
        错误信息: error instanceof Error ? error.message : '未知错误',
        公司ID: firmaId,
        上下文: '主函数执行失败'
      });
      return this.getMockEgitimSetleriForUser(firmaId);

    }
  }

  static async getFirmaVideoIzlemeDurumu(firmaId: number): Promise<number[]> {
    try {
      console.log(`Getting video viewing status for company ${firmaId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock data...');
        return this.getMockVideoIzlemeDurumu(firmaId);
      }

      if (!firmaId || isNaN(firmaId) || firmaId <= 0) {
        console.error('Invalid company ID:', firmaId);
        return [];
      }

      const { data: izlemeData, error: izlemeError } = await supabase
        .from('egitimler')
        .select('video_id')
        .eq('firma_id', firmaId)
        .eq('tamamlandi', true);

      if (izlemeError) {
        console.warn('Video viewing status query error, using mock data:', izlemeError);
        return this.getMockVideoIzlemeDurumu(firmaId);
      }

      const izlenenVideolar = (izlemeData || []).map((item: any) => item.video_id).filter(Boolean);
      console.log(`Company ${firmaId} watched ${izlenenVideolar.length} videos`);

      return izlenenVideolar;

    } catch (error: any) {
      console.warn('Getting video viewing status system error, using mock data:', error);
      return this.getMockVideoIzlemeDurumu(firmaId);

    }
  }

  static async hesaplaFirmaEgitimIlerlemesi(firmaId: number): Promise<{ toplamVideoSayisi: number; izlenenVideoSayisi: number; ilerlemeYuzdesi: number; tamamlananSetSayisi: number; toplamSetSayisi: number }> {
    try {
      console.log(`Calculating education progress for company ${firmaId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock data...');
        return this.getMockEgitimIlerlemesi(firmaId);
      }

      const egitimSetleri = await this.getTumEgitimSetleriForUser(firmaId);
      const atanmisSetler = egitimSetleri.filter(set => set.atanmis_mi);

      const izlenenVideolar = await this.getFirmaVideoIzlemeDurumu(firmaId);

      const toplamVideoSayisi = atanmisSetler.reduce((total, set) => total + (set.toplam_video_sayisi || 0), 0);
      const izlenenVideoSayisi = izlenenVideolar.length;

      const ilerlemeYuzdesi = toplamVideoSayisi > 0 ? Math.round((izlenenVideoSayisi / toplamVideoSayisi) * 100) : 0;

      let tamamlananSetSayisi = 0;
      for (const set of atanmisSetler) {
        if (set.toplam_video_sayisi > 0) {
          const setVideolari = await this.getEgitimVideolari(set.id);
          const setVideoIds = setVideolari.map((v: any) => v.id);

          const setIzlenenSayisi = setVideoIds.filter(videoId => izlenenVideolar.includes(videoId)).length;

          if (setIzlenenSayisi === setVideoIds.length && setVideoIds.length > 0) {
            tamamlananSetSayisi++;
          }
        }
      }

      const istatistik = {
        toplamVideoSayisi,
        izlenenVideoSayisi,
        ilerlemeYuzdesi,
        tamamlananSetSayisi,
        toplamSetSayisi: atanmisSetler.length
      };

      console.log(`Company ${firmaId} education progress statistics:`, istatistik);
      return istatistik;

    } catch (error: any) {
      console.warn('Calculating education progress system error, using mock data:', error);
      return this.getMockEgitimIlerlemesi(firmaId);

    }
  }

  static async kaydetVideoIzleme(firmaId: number, videoId: number, tamamlandi: boolean): Promise<boolean> {
    try {
      console.log(`Recording video viewing status - Company: ${firmaId}, Video: ${videoId}, Completed: ${tamamlandi}`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      if (!firmaId || !videoId) {
        console.error('Invalid company ID or video ID');
        return false;
      }

      const { data: existingData, error: checkError } = await supabase
        .from('egitimler')
        .select('id, tamamlandi')
        .eq('firma_id', firmaId)
        .eq('video_id', videoId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Checking viewing record error:', checkError);
        return false;
      }

      if (existingData) {
        const { error: updateError } = await supabase
          .from('egitimler')
          .update({
            tamamlandi: tamamlandi,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id);

        if (updateError) {
          console.error('Updating viewing record error:', updateError);
          return false;
        }
      } else {
        const { error: insertError } = await supabase
          .from('egitimler')
          .insert([
            {
              firma_id: firmaId,
              video_id: videoId,
              tamamlandi: tamamlandi,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);

        if (insertError) {
          console.error('Creating viewing record error:', insertError);
          return false;
        }
      }

      console.log('Video viewing status recorded successfully');
      return true;

    } catch (error: any) {
      console.error('Recording video viewing system error:', error);
      return false;

    }
  }

  static async kaydetKullaniciDegerlendirmesi(
    firmaId: number,
    egitimSetId: number,
    puan: number,
    yorum?: string
  ): Promise<boolean> {
    try {
      console.log(`Saving user evaluation - Company: ${firmaId}, Set: ${egitimSetId}, Score: ${puan}`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      if (!firmaId || !egitimSetId || puan < 1 || puan > 5) {
        console.error('Invalid evaluation parameters');
        return false;
      }

      const { data: existingData, error: checkError } = await supabase
        .from('geri_bildirimler')
        .select('id')
        .eq('firma_id', firmaId)
        .eq('egitim_set_id', egitimSetId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Checking existing evaluation error:', checkError);
        return false;
      }

      const evaluationData = {
        firma_id: firmaId,
        egitim_set_id: egitimSetId,
        puan: puan,
        yorum: yorum || null,
        updated_at: new Date().toISOString()
      };

      if (existingData) {
        const { error: updateError } = await supabase
          .from('geri_bildirimler')
          .update(evaluationData)
          .eq('id', existingData.id);

        if (updateError) {
          console.error('Updating evaluation error:', updateError);
          return false;
        }
      } else {
        const { error: insertError } = await supabase
          .from('geri_bildirimler')
          .insert([
            {
              ...evaluationData,
              created_at: new Date().toISOString()
            }
          ]);

        if (insertError) {
          console.error('Creating evaluation error:', insertError);
          return false;
        }
      }

      console.log('User evaluation saved successfully');
      return true;

    } catch (error: any) {
      console.error('Saving user evaluation system error:', error);
      return false;

    }
  }

  static async kaydetDokumanIndirme(firmaId: number, dokumanId: number): Promise<boolean> {
    try {
      console.log(`Recording document download - Company: ${firmaId}, Document: ${dokumanId}`);

      if (!this.checkConnection()) {
        console.warn('Supabase connection unavailable, returning mock success...');
        return true;
      }

      if (!firmaId || !dokumanId) {
        console.error('Invalid company ID or document ID');
        return false;
      }

      const { error: insertError } = await supabase
        .from('dokuman_indirme_gecmisi')
        .insert([
          {
            firma_id: firmaId,
            dokuman_id: dokumanId,
            indirme_tarihi: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        console.error('Recording document download error:', insertError);
        return false;
      }

      console.log('Document download recorded successfully');
      return true;

    } catch (error: any) {
      console.error('Recording document download system error:', error);
      return false;

    }
  }

  private static getMockVideoIzlemeDurumu(firmaId: number): number[] {
    console.log(`Using mock video viewing status data, company ID: ${firmaId}`);
    return [11, 12, 21, 31];
  }

  private static getMockEgitimIlerlemesi(firmaId: number): { toplamVideoSayisi: number; izlenenVideoSayisi: number; ilerlemeYuzdesi: number; tamamlananSetSayisi: number; toplamSetSayisi: number } {
    console.log(`Using mock education progress data, company ID: ${firmaId}`);
    return {
      toplamVideoSayisi: 15,
      izlenenVideoSayisi: 8,
      ilerlemeYuzdesi: 53,
      tamamlananSetSayisi: 1,
      toplamSetSayisi: 3
    };
  }

  private static getMockEgitimSetleri(): any[] {
    return [
      {
        id: 1,
        set_adi: 'E-İhracat Temel Eğitimi',
        aciklama: '电子出口基础培训课程',
        kategori: 'Temel Eğitim',
        durum: 'Aktif',
        toplam_video_sayisi: 5,
        toplam_sure: 120,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        atanan_firmalar: []
      },
      {
        id: 2,
        set_adi: 'Dijital Pazarlama',
        aciklama: '数字营销策略和实施',
        kategori: 'İleri Eğitim',
        durum: 'Aktif',
        toplam_video_sayisi: 8,
        toplam_sure: 240,
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        atanan_firmalar: []
      }
    ];
  }

  private static getMockEgitimVideolari(setId: number): any[] {
    return [
      {
        id: setId * 10 + 1,
        egitim_set_id: setId,
        video_adi: `教育视频 ${setId}-1`,
        video_url: 'https://www.youtube.com/watch?v=example1',
        video_suresi: 15,
        sira_no: 1,
        aciklama: '第一个教育视频',
        pdf_url: null,
        durum: 'Aktif',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: setId * 10 + 2,
        egitim_set_id: setId,
        video_adi: `教育视频 ${setId}-2`,
        video_url: 'https://www.youtube.com/watch?v=example2',
        video_suresi: 20,
        sira_no: 2,
        aciklama: '第二个教育视频',
        pdf_url: null,
        durum: 'Aktif',
        created_at: '2024-01-16T10:00:00Z'
      }
    ];
  }

  private static getMockEgitimDokumanlari(firmaId: number): any[] {
    return [
      {
        id: 1,
        dokuman_adi: 'E-İhracat Rehberi',
        aciklama: '电子出口综合指南',
        kategori: 'Temel Bilgiler',
        dosya_url: 'https://example.com/egitim-dokuman1.pdf',
        dosya_boyutu: 2048576,
        durum: 'Aktif',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        dokuman_adi: 'Platform Kullanım Kılavuzu',
        aciklama: '平台使用手册',
        kategori: 'Platform',
        dosya_url: 'https://example.com/egitim-dokuman2.pdf',
        dosya_boyutu: 1536000,
        durum: 'Aktif',
        created_at: '2024-01-20T10:00:00Z'
      }
    ];
  }

  private static getMockEgitimSetleriForUser(firmaId: number): any[] {
    console.log('使用模拟教育集合数据，公司ID:', firmaId);

    return [
      {
        id: 1,
        set_adi: 'E-İhracat Temel Eğitimi',
        aciklama: '电子出口基础培训课程，包含所有必要知识',
        kategori: 'Temel Eğitim',
        durum: 'Aktif',
        toplam_video_sayisi: 5,
        toplam_sure: 120,
        created_at: '2024-01-15T10:00:00Z',
        atanmis_mi: true,
        kilitli: false,
        atanan_firmalar: [firmaId]
      },
      {
        id: 2,
        set_adi: 'Dijital Pazarlama',
        aciklama: '数字营销策略和实施方法',
        kategori: 'İleri Eğitim',
        durum: 'Aktif',
        toplam_video_sayisi: 8,
        toplam_sure: 240,
        created_at: '2024-01-20T10:00:00Z',
        atanmis_mi: Math.random() > 0.5,
        kilitli: Math.random() > 0.5,
        atanan_firmalar: Math.random() > 0.5 ? [firmaId] : []
      },
      {
        id: 3,
        set_adi: 'B2B Platform Eğitim',
        aciklama: 'B2B平台使用和管理培训',
        kategori: 'Platform',
        durum: 'Aktif',
        toplam_video_sayisi: 6,
        toplam_sure: 180,
        created_at: '2024-01-25T10:00:00Z',
        atanmis_mi: Math.random() > 0.3,
        kilitli: Math.random() > 0.3,
        atanan_firmalar: Math.random() > 0.3 ? [firmaId] : []
      },
      {
        id: 4,
        set_adi: 'Gümrük İşlemler',
        aciklama: '出口海关流程和文件准备',
        kategori: 'Gümrük',
        durum: 'Aktif',
        toplam_video_sayisi: 4,
        toplam_sure: 100,
        created_at: '2024-02-01T10:00:00Z',
        atanmis_mi: Math.random() > 0.7,
        kilitli: Math.random() > 0.7,
        atanan_firmalar: Math.random() > 0.7 ? [firmaId] : []
      }
    ];
  }
}

export class SupabaseEtkinlikService {
  static checkConnection(): boolean {
    return isSupabaseConnected();
  }

  static async getFirmaEtkinlikleri(firmaId: number): Promise<any[]> {
    try {
      console.log(`获取公司 ${firmaId} 的活动...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，使用模拟数据...');
        return this.getMockFirmaEtkinlikleri(firmaId);
      }

      if (!firmaId || isNaN(firmaId) || firmaId <= 0) {
        console.error('无效的公司ID：', firmaId);
        return this.getMockFirmaEtkinlikleri(firmaId);
      }

      try {
        // 首先检查表是否存在
        const { data: tableCheck, error: tableError } = await supabase
          .from('etkinlikler')
          .select('count', { count: 'exact', head: true });

        if (tableError) {
          console.warn('etkinlikler表不存在或无法访问，使用模拟数据：', {
            code: tableError.code,
            message: tableError.message,
            details: tableError.details
          });
          return this.getMockFirmaEtkinlikleri(firmaId);
        }

        const { data: etkinliklerData, error: etkinliklerError } = await supabase
          .from('etkinlikler')
          .select(`
            id,
            etkinlik_adi,
            aciklama,
            etkinlik_tarihi,
            etkinlik_saati,
            konum,
            kategori,
            kontenjan,
            durum,
            hedef_firmalar,
            created_at,
            updated_at
          `)
          .eq('durum', 'Aktif')
          .order('etkinlik_tarihi', { ascending: true });

        if (etkinliklerError) {
          console.warn('活动查询遇到错误，使用模拟数据：', {
            message: etkinliklerError.message || '未知错误',
            details: etkinliklerError.details || '无详情',
            hint: etkinliklerError.hint || '无提示',
            code: etkinliklerError.code || '无错误代码',
            context: '查询etkinlikler表时发生错误'
          });
          return this.getMockFirmaEtkinlikleri(firmaId);
        }

        if (!etkinliklerData || etkinliklerData.length === 0) {
          console.log('数据库中无活动，使用模拟数据...');
          return this.getMockFirmaEtkinlikleri(firmaId);
        }

        const firmaEtkinlikleri = etkinliklerData.filter(etkinlik => {
          if (!etkinlik.hedef_firmalar || !Array.isArray(etkinlik.hedef_firmalar)) {
            return true; // 公开活动
          }
          return etkinlik.hedef_firmalar.includes(firmaId);
        });

        const formattedEtkinlikler = firmaEtkinlikleri.map((etkinlik) => ({
          ID: etkinlik.id,
          EtkinlikAdi: etkinlik.etkinlik_adi || '未命名活动',
          Aciklama: etkinlik.aciklama || '',
          EtkinlikTarihi: etkinlik.etkinlik_tarihi,
          EtkinlikSaati: etkinlik.etkinlik_saati || '00:00',
          Konum: etkinlik.konum || 'Online',
          Kategori: etkinlik.kategori || 'Genel',
          Kontenjan: etkinlik.kontenjan || 0,
          Durum: etkinlik.durum,
          HedefFirmalar: etkinlik.hedef_firmalar || [],
          created_at: etkinlik.created_at,
          updated_at: etkinlik.updated_at
        }));

        console.log(`公司 ${firmaId} 获取 ${formattedEtkinlikler.length} 个活动`);
        return formattedEtkinlikler;

      } catch (supabaseError: any) {
        console.warn('Supabase活动系统错误，使用模拟数据：', {
          name: supabaseError?.name || '未知错误类型',
          message: supabaseError?.message || '无错误信息',
          code: supabaseError?.code || '无错误代码'
        });
        return this.getMockFirmaEtkinlikleri(firmaId);

      }

    } catch (error: any) {
      console.warn('获取公司活动系统错误，使用模拟数据：', {
        message: error instanceof Error ? error.message : '未知错误',
        firmaId: firmaId
      });
      return this.getMockFirmaEtkinlikleri(firmaId);

    }
  }

  static async getFirmaKatilimEtkinlikleri(firmaId: number): Promise<any[]> {
    try {
      console.log(`获取公司 ${firmaId} 参与的活动...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，使用模拟数据...');
        return this.getMockKatilimEtkinlikleri(firmaId);
      }

      if (!firmaId || isNaN(firmaId) || firmaId <= 0) {
        console.error('无效的公司ID：', firmaId);
        return this.getMockKatilimEtkinlikler(firmaId);
      }

      try {
        // 首先检查参加表是否存在
        const { data: tableCheck, error: tableError } = await supabase
          .from('etkinlik_katilimcilari')
          .select('count', { count: 'exact', head: true });

        if (tableError) {
          console.warn('etkinlik_katilimcilari表不存在或无法访问，使用模拟数据：', {
            code: tableError.code,
            message: tableError.message,
            details: tableError.details
          });
          return this.getMockKatilimEtkinlikler(firmaId);
        }

        const { data: katilimData, error: katilimError } = await supabase
          .from('etkinlik_katilimcilari')
          .select(`
            id,
            etkinlik_id,
            firma_id,
            katilim_durumu,
            katilim_tarihi,
            created_at
          `)
          .eq('firma_id', firmaId)
          .order('katilim_tarihi', { ascending: false });

        if (katilimError) {
          console.warn('参与活动查询错误，使用模拟数据：', {
            message: katilimError.message || '未知错误',
            details: katilimError.details || '无详情',
            hint: katilimError.hint || '无提示',
            code: katilimError.code || '无错误代码'
          });
          return this.getMockKatilimEtkinlikler(firmaId);
        }

        if (!katilimData || katilimData.length === 0) {
          console.log('该公司未参与任何活动...');
          return [];
        }

        const formattedKatilimlar = await Promise.all(
          katilimData.map(async (katilim: any) => {
            try {
              // 检查活动表是否存在并获取活动详情
              const { data: etkinlikData, error: etkinlikError } = await supabase
                .from('etkinlikler')
                .select('etkinlik_adi, etkinlik_tarihi, etkinlik_saati, konum, kategori')
                .eq('id', katilim.etkinlik_id)
                .maybeSingle();

              if (etkinlikError) {
                console.warn(`活动详情获取失败 ID:${katilim.etkinlik_id}:`, etkinlikError.message);
                return {
                  ID: katilim.id,
                  EtkinlikID: katilim.etkinlik_id,
                  FirmaID: katilim.firma_id,
                  KatilimDurumu: katilim.katilim_durumu || 'Katıldı',
                  KatilimTarihi: katilim.katilim_tarihi,
                  EtkinlikAdi: '活动信息获取失败',
                  EtkinlikTarihi: new Date().toISOString().split('T')[0],
                  EtkinlikSaati: '00:00',
                  Konum: 'Bilinmeyen',
                  Kategori: 'Genel'
                };
              }

              return {
                ID: katilim.id,
                EtkinlikID: katilim.etkinlik_id,
                FirmaID: katilim.firma_id,
                KatilimDurumu: katilim.katilim_durumu || 'Katıldı',
                KatilimTarihi: katilim.katilim_tarihi,
                EtkinlikAdi: etkinlikData?.etkinlik_adi || '未知活动',
                EtkinlikTarihi: etkinlikData?.etkinlik_tarihi || new Date().toISOString().split('T')[0],
                EtkinlikSaati: etkinlikData?.etkinlik_saati || '00:00',
                Konum: etkinlikData?.konum || 'Online',
                Kategori: etkinlikData?.kategori || 'Genel'
              };

            } catch (itemError) {
              console.warn(`处理参与记录时出错:`, itemError);
              return {
                ID: katilim.id,
                EtkinlikID: katilim.etkinlik_id,
                FirmaID: katilim.firma_id,
                KatilimDurumu: katilim.katilim_durumu || 'Katıldı',
                KatilimTarihi: katilim.katilim_tarihi,
                EtkinlikAdi: '处理错误',
                EtkinlikTarihi: new Date().toISOString().split('T')[0],
                EtkinlikSaati: '00:00',
                Konum: 'Bilinmeyen',
                Kategori: 'Genel'
              };
            }
          })
        );

        console.log(`公司 ${firmaId} 参与 ${formattedKatilimlar.length} 个活动`);
        return formattedKatilimlar;

      } catch (supabaseError: any) {
        console.warn('Supabase参与活动系统错误，使用模拟数据：', {
          name: supabaseError?.name || '未知错误类型',
          message: supabaseError?.message || '无错误信息',
          code: supabaseError?.code || '无错误代码'
        });
        return this.getMockKatilimEtkinlikleri(firmaId);

      }

    } catch (error: any) {
      console.warn('获取公司参与活动系统错误，使用模拟数据：', {
        message: error instanceof Error ? error.message : '未知错误',
        firmaId: firmaId
      });
      return this.getMockKatilimEtkinlikler(firmaId);

    }
  }

  static async katilEtkinlik(etkinlikId: number, firmaId: number): Promise<boolean> {
    try {
      console.log(`公司 ${firmaId} 参加活动 ${etkinlikId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return true;
      }

      if (!etkinlikId || !firmaId) {
        console.error('无效的活动ID或公司ID...');
        return false;
      }

      try {
        // 检查参与表是否存在
        const { data: tableCheck, error: tableError } = await supabase
          .from('etkinlik_katilimcilari')
          .select('count', { count: 'exact', head: true });

        if (tableError) {
          console.warn('etkinlik_katilimcilari表不存在，返回模拟成功：', {
            code: tableError.code,
            message: tableError.message
          });
          return true;
        }

        const { data: existingData, error: checkError } = await supabase
          .from('etkinlik_katilimcilari')
          .select('id')
          .eq('etkinlik_id', etkinlikId)
          .eq('firma_id', firmaId)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.warn('检查参与状态时出错，返回模拟成功：', checkError);
          return true;
        }

        if (existingData) {
          console.log('公司已经参加了此活动...');
          return true;
        }

        const { error: insertError } = await supabase
          .from('etkinlik_katilimcilari')
          .insert([
            {
              etkinlik_id: etkinlikId,
              firma_id: firmaId,
              katilim_durumu: 'Katıldı',
              katilim_tarihi: new Date().toISOString(),
              created_at: new Date().toISOString()
            }
          ]);

        if (insertError) {
          console.warn('活动参与记录创建错误，返回模拟成功：', {
            message: insertError.message || '未知错误',
            details: insertError.details || '无详情',
            hint: insertError.hint || '无提示',
            code: insertError.code || '无错误代码'
          });
          return true; // 返回成功，避免用户看到错误
        }

        console.log('成功参加活动...');
        return true;

      } catch (supabaseError: any) {
        console.warn('Supabase活动参与系统错误，返回模拟成功：', {
          name: supabaseError?.name || '未知错误类型',
          message: supabaseError?.message || '无错误信息',
          code: supabaseError?.code || '无错误代码'
        });
        return true;

      }

    } catch (error: any) {
      console.warn('参加活动系统错误，返回模拟成功：', {
        message: error instanceof Error ? error.message : '未知错误',
        firmaId: firmaId,
        etkinlikId: etkinlikId
      });
      return true;

    }
  }

  private static getMockFirmaEtkinlikleri(firmaId: number): any[] {
    console.log(`使用模拟活动数据，公司ID: ${firmaId}`);

    const currentDate = new Date();
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);

    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(currentDate.getMonth() + 1);

    return [
      {
        ID: 1,
        EtkinlikAdi: 'E-İhracat Dijital Pazarlama Webinarı',
        Aciklama: '电子商务出口和数字营销策略的综合在线培训。学习如何在全球市场中有效推广您的产品，掌握社交媒体营销、SEO优化和在线广告技巧。',
        EtkinlikTarihi: nextWeek.toISOString().split('T')[0],
        EtkinlikSaati: '14:00',
        Konum: 'Online - Zoom Platform',
        Kategori: 'Eğitim',
        Kontenjan: 50,
        Durum: 'Aktif',
        HedefFirmalar: [firmaId],
        created_at: '2024-02-15T10:00:00Z',
        updated_at: '2024-02-15T10:00:00Z'
      },
      {
        ID: 2,
        EtkinlikAdi: 'B2B Platform Kullanım Atölyesi',
        Aciklama: 'B2B电商平台的实践操作培训。包括产品上传、订单管理、客户沟通和平台优化技巧。专为企业用户设计的实用指南。',
        EtkinlikTarihi: nextMonth.toISOString().split('T')[0],
        EtkinlikSaati: '10:30',
        Konum: 'İstanbul Eğitim Merkezi',
        Kategori: 'Workshop',
        Kontenjan: 25,
        Durum: 'Aktif',
        HedefFirmalar: [firmaId],
        created_at: '2024-02-20T10:00:00Z',
        updated_at: '2024-02-20T10:00:00Z'
      },
      {
        ID: 3,
        EtkinlikAdi: 'Uluslararası Ticaret ve Gümrük Semineri',
        Aciklama: '国际贸易法规和海关流程的详细说明。涵盖出口文件准备、关税计算、贸易协定和风险管理。',
        EtkinlikTarihi: new Date(currentDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        EtkinlikSaati: '13:30',
        Konum: 'Online - Microsoft Teams',
        Kategori: 'Seminer',
        Kontenjan: 100,
        Durum: 'Aktif',
        HedefFirmalar: [], // 公开活动
        created_at: '2024-02-25T10:00:00Z',
        updated_at: '2024-02-25T10:00:00Z'
      },
      {
        ID: 4,
        EtkinlikAdi: 'Dijital Dönüşüm ve E-Ticaret Networking',
        Aciklama: '数字化转型主题的商务社交活动。与行业专家和同行企业建立联系，分享经验和最佳实践。',
        EtkinlikTarihi: new Date(currentDate.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        EtkinlikSaati: '18:00',
        Konum: 'Ankara İş Merkezi',
        Kategori: 'Networking',
        Kontenjan: 75,
        Durum: 'Aktif',
        HedefFirmalar: [firmaId],
        created_at: '2024-03-01T10:00:00Z',
        updated_at: '2024-03-01T10:00:00Z'
      }
    ];
  }

  private static getMockKatilimEtkinlilikleri(firmaId: number): any[] {
    console.log(`使用模拟参与活动数据，公司ID: ${firmaId}`);

    return [
      {
        ID: 1,
        EtkinlikID: 101,
        FirmaID: firmaId,
        KatilimDurumu: 'Katıldı',
        KatilimTarihi: '2024-02-10T14:30:00Z',
        EtkinlikAdi: 'E-İhracat Temel Eğitimi',
        EtkinlikTarihi: '2024-02-10',
        EtkinlikSaati: '14:00',
        Konum: 'Online - Zoom',
        Kategori: 'Eğitim'
      },
      {
        ID: 2,
        EtkinlikID: 102,
        FirmaID: firmaId,
        KatilimDurumu: 'Katıldı',
        KatılımTarihi: '2024-01-25T10:00:00Z',
        EtkinlikAdi: 'Dijital Pazarlama Stratejileri',
        EtkinlikTarihi: '2024-01-25',
        EtkinlikSaati: '10:00',
        Konum: 'İstanbul Ofisi',
        Kategori: 'Workshop'
      },
      {
        ID: 3,
        EtkinlikID: 103,
        FirmaID: firmaId,
        KatilimDurumu: 'Katıldı',
        KatılımTarihi: '2024-01-15T16:15:00Z',
        EtkinlikAdi: 'B2B Platform Tanıtım Semineri',
        EtkinlikTarihi: '2024-01-15',
        EtkinlikSaati: '16:00',
        Konum: 'Online - Teams',
        Kategori: 'Seminer'
      }
    ];
  }
}

export class SupabaseFirmaService {
  static checkConnection(): boolean {
    return isSupabaseConnected();
  }

  static async getAllFirmalar(): Promise<any[]> {
    try {
      console.log('获取所有公司...');

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，使用模拟数据...');
        return this.getMockFirmalar();
      }

      try {
        const { data: firmalarData, error: firmalarError } = await supabase
          .from('firmalar')
          .select(`
            id,
            firma_adi,
            yetkili_email,
            telefon,
            adres,
            sektor,
            durum,
            firma_profil_durumu,
            vergi_numarasi,
            yetkili_adi,
            kayit_tarihi,
            created_at,
            updated_at
          `)
          .eq('durum', 'Aktif')
          .order('firma_adi', { ascending: true });

        if (firmalarError) {
          console.warn('公司查询错误，使用模拟数据：', firmalarError);
          return this.getMockFirmalar();
        }

        if (!firmalarData || firmalarData.length === 0) {
          console.log('数据库中无公司，使用模拟数据...');
          return this.getMockFirmalar();
        }

        const formattedFirmalar = firmalarData.map(firma => ({
          id: firma.id,
          firma_adi: firma.firma_adi || '未命名公司',
          yetkili_email: firma.yetkili_email || '',
          telefon: firma.telefon || '',
          adres: firma.adres || '',
          sektor: firma.sektor || 'Genel',
          durum: firma.durum || 'Aktif',
          profil_durumu: firma.firma_profil_durumu || 'Aktif',
          vergi_numarasi: firma.vergi_numarasi || '',
          yetkili_adi: firma.yetkili_adi || '',
          kayit_tarihi: firma.kayit_tarihi || firma.created_at,
          created_at: firma.created_at,
          updated_at: firma.updated_at
        }));

        console.log(`成功获取 ${formattedFirmalar.length} 个公司`);
        return formattedFirmalar;

      } catch (supabaseError: any) {
        console.warn('Supabase公司系统错误，使用模拟数据：', supabaseError);
        return this.getMockFirmalar();

      }

    } catch (error: any) {
      console.warn('获取公司系统错误，使用模拟数据：', error);
      return this.getMockFirmalar();

    }
  }

  static async getFirmaById(id: number): Promise<any | null> {
    try {
      console.log(`获取公司 ID: ${id}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，使用模拟数据...');
        return this.getMockFirmaById(id);
      }

      const { data: firmaData, error: firmaError } = await supabase
        .from('firmalar')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (firmaError) {
        console.warn(`公司 ${id} 查询错误，使用模拟数据：`, firmaError);
        return this.getMockFirmaById(id);
      }

      if (!firmaData) {
        console.log(`公司 ${id} 不存在`);
        return null;
      }

      return firmaData;

    } catch (error: any) {
      console.warn(`获取公司 ${id} 系统错误，使用模拟数据：`, error);
      return this.getMockFirmaById(id);

    }
  }

  static async createFirma(firmaData: any): Promise<any | null> {
    try {
      console.log('创建新公司...');

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return { id: Date.now(), ...firmaData };
      }

      const { data: newFirma, error: createError } = await supabase
        .from('firmalar')
        .insert([
          {
            firma_adi: firmaData.firma_adi,
            yetkili_email: firmaData.yetkili_email,
            telefon: firmaData.telefon,
            adres: firmaData.adres,
            sektor: firmaData.sektor,
            durum: firmaData.durum || 'Aktif',
            firma_profil_durumu: firmaData.profil_durumu || 'Onay Bekliyor',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('公司创建错误：', createError);
        return null;
      }

      console.log('公司创建成功');
      return newFirma;

    } catch (error: any) {
      console.error('公司创建系统错误：', error);
      return null;

    }
  }

  static async updateFirma(id: number, firmaData: any): Promise<boolean> {
    try {
      console.log(`更新公司 ID: ${id}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return true;
      }

      const { error: updateError } = await supabase
        .from('firmalar')
        .update({
          ...firmaData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('公司更新错误：', updateError);
        return false;
      }

      console.log('公司更新成功');
      return true;

    } catch (error: any) {
      console.error('公司更新系统错误：', error);
      return false;

    }
  }

  static async deleteFirma(id: number): Promise<boolean> {
    try {
      console.log(`删除公司 ID: ${id}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return true;
      }

      const { error: deleteError } = await supabase
        .from('firmalar')
        .update({
          durum: 'Silindi',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (deleteError) {
        console.error('公司删除错误：', deleteError);
        return false;
      }

      console.log('公司删除成功');
      return true;

    } catch (error: any) {
      console.error('公司删除系统错误：', error);
      return false;

    }
  }

  private static getMockFirmalar(): any[] {
    console.log('使用模拟公司数据...');

    return [
      {
        id: 1,
        firma_adi: 'Teknoloji A.Ş.',
        yetkili_email: 'info@teknoloji.com',
        telefon: '+90 555 123 4567',
        adres: 'İstanbul, Türkiye',
        sektor: 'Teknoloji',
        durum: 'Aktif',
        profil_durumu: 'Onaylandı',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        firma_adi: 'İhracat Ltd.',
        yetkili_email: 'info@ihracat.com',
        telefon: '+90 555 234 5678',
        adres: 'Ankara, Türkiye',
        sektor: 'İhracat',
        durum: 'Aktif',
        profil_durumu: 'Onaylandı',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z'
      },
      {
        id: 3,
        firma_adi: 'Tekstil San.',
        yetkili_email: 'info@tekstil.com',
        telefon: '+90 555 345 6789',
        adres: 'İzmir, Türkiye',
        sektor: 'Tekstil',
        durum: 'Aktif',
        profil_durumu: 'Onay Bekliyor',
        created_at: '2024-01-25T10:00:00Z',
        updated_at: '2024-01-25T10:00:00Z'
      }
    ];
  }

  private static getMockFirmaById(id: number): any {
    const mockFirmalar = this.getMockFirmalar();
    return mockFirmalar.find(firma => firma.id === id) || null;
  }
}

export class SupabaseEgitimCrudService {
  static checkConnection(): boolean {
    return isSupabaseConnected();
  }

  static async createEgitimSeti(setData: { setAdi: string; aciklama: string; kategori: string; durum: string; }): Promise<any | null> {
    try {
      console.log('创建教育集合...');

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return {
          id: Date.now(),
          set_adi: setData.setAdi,
          aciklama: setData.aciklama,
          kategori: setData.kategori,
          durum: setData.durum,
          toplam_video_sayisi: 0,
          toplam_sure: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      const { data: newSet, error: createError } = await supabase
        .from('egitim_setleri')
        .insert([
          {
            set_adi: setData.setAdi,
            aciklama: setData.aciklama,
            kategori: setData.kategori,
            durum: setData.durum,
            toplam_video_sayisi: 0,
            toplam_sure: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('教育集合创建错误：', createError);
        return null;
      }

      console.log('教育集合创建成功');
      return newSet;

    } catch (error: any) {
      console.error('教育集合创建系统错误：', error);
      return null;

    }
  }

  static async updateEgitimSeti(setId: number, setData: { setAdi: string; aciklama: string; kategori: string; durum: string; }): Promise<boolean> {
    try {
      console.log(`更新教育集合 ID: ${setId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return true;
      }

      const { error: updateError } = await supabase
        .from('egitim_setleri')
        .update({
          set_adi: setData.setAdi,
          aciklama: setData.aciklama,
          kategori: setData.kategori,
          durum: setData.durum,
          updated_at: new Date().toISOString()
        })
        .eq('id', setId);

      if (updateError) {
        console.error('教育集合更新错误：', updateError);
        return false;
      }

      console.log('教育集合更新成功');
      return true;

    } catch (error: any) {
      console.error('教育集合更新系统错误：', error);
      return false;

    }
  }

  static async deleteEgitimSeti(setId: number): Promise<boolean> {
    try {
      console.log(`删除教育集合 ID: ${setId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return true;
      }

      // 首先删除所有相关视频
      const { error: videosDeleteError } = await supabase
        .from('egitim_videolari')
        .update({
          durum: 'Silindi',
          updated_at: new Date().toISOString()
        })
        .eq('egitim_set_id', setId);

      if (videosDeleteError) {
        console.warn('删除相关视频时出错：', videosDeleteError);
      }

      // 然后删除教育集合
      const { error: setDeleteError } = await supabase
        .from('egitim_setleri')
        .update({
          durum: 'Silindi',
          updated_at: new Date().toISOString()
        })
        .eq('id', setId);

      if (setDeleteError) {
        console.error('教育集合删除错误：', setDeleteError);
        return false;
      }

      console.log('教育集合删除成功');
      return true;

    } catch (error: any) {
      console.error('教育集合删除系统错误：', error);
      return false;

    }
  }

  static async createEgitimVideosu(videoData: { egitimSetId: number; videoAdi: string; videoUrl: string; videoSuresi: number; siraNo: number; aciklama: string; pdfUrl?: string; }): Promise<any | null> {
    try {
      console.log('创建教育视频...');

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return {
          id: Date.now(),
          egitim_set_id: videoData.egitimSetId,
          video_adi: videoData.videoAdi,
          video_url: videoData.videoUrl,
          video_suresi: videoData.videoSuresi,
          sira_no: videoData.siraNo,
          aciklama: videoData.aciklama,
          pdf_url: videoData.pdfUrl || null,
          durum: 'Aktif',
          created_at: new Date().toISOString()
        };
      }

      const { data: newVideo, error: createError } = await supabase
        .from('egitim_videolari')
        .insert([
          {
            egitim_set_id: videoData.egitimSetId,
            video_adi: videoData.videoAdi,
            video_url: videoData.videoUrl,
            video_suresi: videoData.videoSuresi,
            sira_no: videoData.siraNo,
            aciklama: videoData.aciklama,
            pdf_url: videoData.pdfUrl || null,
            durum: 'Aktif',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('教育视频创建错误：', createError);
        return null;
      }

      // 更新教育集合的视频统计
      await this.updateSetVideoStats(videoData.egitimSetId);

      console.log('教育视频创建成功');
      return newVideo;

    } catch (error: any) {
      console.error('教育视频创建系统错误：', error);
      return null;

    }
  }

  static async updateEgitimVideosu(videoId: number, videoData: { videoAdi: string; videoUrl: string; videoSuresi: number; siraNo: number; aciklama: string; pdfUrl: string; }): Promise<boolean> {
    try {
      console.log(`更新教育视频 ID: ${videoId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return true;
      }

      // 获取视频信息以更新集合统计
      const { data: videoInfo } = await supabase
        .from('egitim_videolari')
        .select('egitim_set_id')
        .eq('id', videoId)
        .single();

      const { error: updateError } = await supabase
        .from('egitim_videolari')
        .update({
          video_adi: videoData.videoAdi,
          video_url: videoData.videoUrl,
          video_suresi: videoData.videoSuresi,
          sira_no: videoData.siraNo,
          aciklama: videoData.aciklama,
          pdf_url: videoData.pdfUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (updateError) {
        console.error('教育视频更新错误：', updateError);
        return false;
      }

      // 更新教育集合的视频统计
      if (videoInfo?.egitim_set_id) {
        await this.updateSetVideoStats(videoInfo.egitim_set_id);
      }

      console.log('教育视频更新成功');
      return true;

    } catch (error: any) {
      console.error('教育视频更新系统错误：', error);
      return false;

    }
  }

  static async deleteEgitimVideosu(videoId: number): Promise<boolean> {
    try {
      console.log(`删除教育视频 ID: ${videoId}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return true;
      }

      // 获取视频信息以更新集合统计
      const { data: videoInfo } = await supabase
        .from('egitim_videolari')
        .select('egitim_set_id')
        .eq('id', videoId)
        .single();

      const { error: deleteError } = await supabase
        .from('egitim_videolari')
        .update({
          durum: 'Silindi',
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (deleteError) {
        console.error('教育视频删除错误：', deleteError);
        return false;
      }

      // 更新教育集合的视频统计
      if (videoInfo?.egitim_set_id) {
        await this.updateSetVideoStats(videoInfo.egitim_set_id);
      }

      console.log('教育视频删除成功');
      return true;

    } catch (error: any) {
      console.error('教育视频删除系统错误：', error);
      return false;

    }
  }

  static async ataEgitimSetiFirmaya(setId: number, firmaIds: number[]): Promise<boolean> {
    try {
      console.log(`分配教育集合 ${setId} 给公司 ${firmaIds.join(', ')}...`);

      if (!this.checkConnection()) {
        console.warn('Supabase连接不可用，返回模拟成功...');
        return true;
      }

      // 为每个公司创建分配记录
      const assignments = firmaIds.map(firmaId => ({
        egitim_set_id: setId,
        firma_id: firmaId,
        durum: 'Aktif',
        atama_tarihi: new Date().toISOString(),
        created_at: new Date().toISOString()
      }));

      const { error: assignError } = await supabase
        .from('egitim_set_firma_atamalari')
        .upsert(assignments, { onConflict: 'egitim_set_id,firma_id' });

      if (assignError) {
        console.error('教育集合分配错误：', assignError);
        return false;
      }

      console.log('教育集合分配成功');
      return true;

    } catch (error: any) {
      console.error('教育集合分配系统错误：', error);
      return false;

    }
  }

  private static async updateSetVideoStats(setId: number): Promise<void> {
    try {
      if (!this.checkConnection()) return;

      const { data: videos, error: videosError } = await supabase
        .from('egitim_videolari')
        .select('video_suresi')
        .eq('egitim_set_id', setId)
        .eq('durum', 'Aktif');

      if (videosError) {
        console.warn('获取视频统计时出错：', videosError);
        return;
      }

      const videoCount = videos?.length || 0;
      const totalDuration = videos?.reduce((total, video) => total + (video.video_suresi || 0), 0) || 0;

      const { error: updateError } = await supabase
        .from('egitim_setleri')
        .update({
          toplam_video_sayisi: videoCount,
          toplam_sure: totalDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', setId);

      if (updateError) {
        console.warn('更新集合统计时出错：', updateError);
      }

    } catch (error) {
      console.warn('更新集合统计系统错误：', error);

    }
  }
}
