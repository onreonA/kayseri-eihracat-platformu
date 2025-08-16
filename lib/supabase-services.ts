import { getSupabaseClient } from './supabaseClient';

// Use unified manual Supabase client
export const supabase = getSupabaseClient();

// Admin Firma Service
export class SupabaseFirmaService {
  static async getAllFirmalar() {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('firmalar').select('*').order('id', { ascending: true });
      if (error) {
        console.error('Supabase firmalar query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Firmalar yüklenirken hata:', error);
      return [];
    }
  }

  static async getFirmaById(id: number) {
    try {
      if (!supabase) return null;
      const { data, error } = await supabase.from('firmalar').select('*').eq('id', id).single();
      if (error) {
        console.error('Firma detay query error:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Firma detay yüklenirken hata:', error);
      return null;
    }
  }
}

// Supabase Eğitim Service
export class SupabaseEgitimService {
  static async getAllEgitimSetleri() {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('egitim_setleri').select('*').order('id', { ascending: true });
      if (error) {
        console.error('Eğitim setleri query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Eğitim setleri yüklenirken hata:', error);
      return [];
    }
  }

  static async getEgitimVideoları() {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('egitim_videolari').select('*').order('id', { ascending: true });
      if (error) {
        console.error('Eğitim videoları query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Eğitim videoları yüklenirken hata:', error);
      return [];
    }
  }

  static async getFirmaEgitimIlerlemesi(firmaId: number) {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('firma_egitim_ilerlemesi').select('*').eq('firma_id', firmaId);
      if (error) {
        console.error('Firma eğitim ilerlemesi query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Firma eğitim ilerlemesi yüklenirken hata:', error);
      return [];
    }
  }

  static async ataEgitimSetiFirmaya(firmaId: number, egitimSetId: number) {
    try {
      if (!supabase) return false;
      const { error } = await supabase.from('firma_egitim_ilerlemesi').insert({
        firma_id: firmaId,
        egitim_set_id: egitimSetId,
        tamamlanan_video_sayisi: 0,
        toplam_video_sayisi: 0,
        created_at: new Date().toISOString()
      });
      if (error) {
        console.error('Eğitim set atama hatası:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Eğitim set atama işleminde hata:', error);
      return false;
    }
  }
}

// Supabase Proje Service
export class SupabaseProjeService {
  static async getAllProjeler() {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('projeler').select('*').order('id', { ascending: true });
      if (error) {
        console.error('Projeler query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Projeler yüklenirken hata:', error);
      return [];
    }
  }

  static async getProjeById(id: number) {
    try {
      if (!supabase) return null;
      const { data, error } = await supabase.from('projeler').select('*').eq('id', id).single();
      if (error) {
        console.error('Proje detay query error:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Proje detay yüklenirken hata:', error);
      return null;
    }
  }

  static async getAltProjelerByProjeId(projeId: number) {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('alt_projeler').select('*').eq('ana_proje_id', projeId).order('id', { ascending: true });
      if (error) {
        console.error('Alt projeler query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Alt projeler yüklenirken hata:', error);
      return [];
    }
  }

  static async getGorevlerByProjeId(projeId: number) {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('gorevler').select('*').eq('proje_id', projeId).order('id', { ascending: true });
      if (error) {
        console.error('Görevler query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Görevler yüklenirken hata:', error);
      return [];
    }
  }
}

// Supabase Etkinlik Service
export class SupabaseEtkinlikService {
  static async getAllEtkinlikler() {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('etkinlikler').select('*').order('id', { ascending: true });
      if (error) {
        console.error('Etkinlikler query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata:', error);
      return [];
    }
  }
}

// Destek Dokümanları Service
export class DestekDokümanlarıService {
  static async getAllDokümanlar() {
    try {
      if (!supabase) return [];
      const { data, error } = await supabase.from('destek_dokumanlari').select('*').order('id', { ascending: true });
      if (error) {
        console.error('Destek dokümanları query error:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Destek dokümanları yüklenirken hata:', error);
      return [];
    }
  }
}

// Login Sync Service
export class LoginSyncService {
  static async syncUserLogin(email: string, userType: 'admin' | 'user') {
    try {
      if (!supabase) return false;
      const { error } = await supabase.from('login_logs').insert({
        email,
        user_type: userType,
        login_time: new Date().toISOString()
      });
      if (error) {
        console.error('Login sync hatası:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Login sync işleminde hata:', error);
      return false;
    }
  }
}

export default supabase;
