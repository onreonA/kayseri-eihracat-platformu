'use client';

import { getSupabaseClient } from './supabaseClient';

export interface AdminAuthResult {
  isAuthenticated: boolean;
  redirect?: string;
  error?: string;
}

export const checkAdminAuth = async (): Promise<AdminAuthResult> => {
  try {
    // Önce localStorage kontrolü yap
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const adminToken = localStorage.getItem('admin_token');
    
    console.log('🔍 Admin kontrolü:', { isAdminLoggedIn, adminToken });
    
    if (isAdminLoggedIn === 'true' && adminToken) {
      console.log('✅ Admin girişi localStorage ile doğrulandı');
      return { isAuthenticated: true };
    }

    // Fallback: Supabase kontrolü
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.log('❌ Supabase bağlantısı yok, login\'e yönlendiriliyor...');
      return { isAuthenticated: false, redirect: '/admin-login' };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('❌ Supabase session yok, login\'e yönlendiriliyor...');
      return { isAuthenticated: false, redirect: '/admin-login' };
    }

    console.log('✅ Admin girişi Supabase session ile doğrulandı');
    return { isAuthenticated: true };
  } catch (error) {
    console.error('Admin auth kontrolü hatası:', error instanceof Error ? error.message : 'Bilinmeyen hata');
    return { isAuthenticated: false, redirect: '/admin-login', error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
};

export const adminLogout = async () => {
  try {
    // LocalStorage temizliği
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('adminEmail');
    
    // Supabase logout
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    
    console.log('✅ Admin logout başarılı');
    return true;
  } catch (error) {
    console.error('Admin logout hatası:', error);
    return false;
  }
};

export const getAdminInfo = () => {
  return {
    email: localStorage.getItem('adminEmail') || '',
    isLoggedIn: localStorage.getItem('isAdminLoggedIn') === 'true',
    token: localStorage.getItem('admin_token') || ''
  };
};
