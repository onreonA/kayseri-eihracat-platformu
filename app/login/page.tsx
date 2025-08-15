
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '@/lib/api';

// 🔒 TAMAMEN YENİ GÜVENLİ LOGIN SERVICE - OTOMATİK GİRİŞ YOK
class SecureLoginService {
  // Giriş doğrulama - Supabase entegrasyonu
  static async validateLogin(email: string, password: string): Promise<{
    success: boolean;
    firma?: any;
    error?: string;
  }> {
    try {
      console.log('🔐 SUPABASE GİRİŞ DOĞRULAMA:', email);

      const { supabase } = await import('@/lib/supabase-services');
      if (!supabase) {
        return {
          success: false,
          error: 'Veritabanı bağlantısı bulunamadı.',
        };
      }

      const { data: supabaseFirmalar, error } = await supabase
        .from('firmalar')
        .select('*')
        .eq('durum', 'Aktif')
        .limit(50);

      if (error) {
        console.error('❌ Supabase sorgu hatası:', error);
        return {
          success: false,
          error: 'Veritabanı sorgu hatası.',
        };
      }

      if (!supabaseFirmalar || supabaseFirmalar.length === 0) {
        return {
          success: false,
          error: 'Aktif firma bulunamadı.',
        };
      }

      // Email kontrolü
      const emailLower = email.toLowerCase().trim();
      const matchingFirma = supabaseFirmalar.find((firma) => {
        const firmaEmail = firma.yetkili_email;
        return firmaEmail && firmaEmail.toLowerCase().trim() === emailLower;
      });

      if (!matchingFirma) {
        return {
          success: false,
          error: 'Bu email adresi ile kayıtlı aktif firma bulunamadı.',
        };
      }

      // Şifre kontrolü
      const validPasswords = ['123456', '111111', '112233'];
      const isPasswordValid = validPasswords.includes(password.trim());

      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Yanlış şifre. (Geçerli şifreler: 123456, 111111, 112233)',
        };
      }

      console.log('✅ Supabase firma girişi başarılı:', matchingFirma.firma_adi);

      return {
        success: true,
        firma: {
          id: matchingFirma.id,
          firmaAdi: matchingFirma.firma_adi,
          yetkiliEmail: matchingFirma.yetkili_email,
          durum: matchingFirma.durum,
          source: 'supabase'
        },
      };

    } catch (error: any) {
      console.error('❌ Giriş doğrulama sistem hatası:', error);
      return {
        success: false,
        error: 'Sistem hatası oluştu.',
      };
    }
  }

  // Giriş bilgilerini kaydet
  static login(userData: { email: string; firmaAdi: string; firmaId: number }): boolean {
    try {
      if (typeof window === 'undefined') return false;

      // ÖNCELİKLE TÜM ESKİ VERİLERİ TEMİZLE
      this.cleanupAllData();

      const unifiedData = {
        email: userData.email,
        firmaAdi: userData.firmaAdi,
        firmaId: userData.firmaId,
        loginTime: new Date().toISOString(),
        isLoggedIn: true,
        version: '4.0',
        source: 'supabase',
        sessionId: Math.random().toString(36).substring(2, 15),
      };

      localStorage.setItem('user_login_data', JSON.stringify(unifiedData));

      const verification = localStorage.getItem('user_login_data');
      const success = !!verification;

      console.log(success ? '🎉 SUPABASE GİRİŞ KAYDI BAŞARILI' : '❌ Giriş kayıt hatası');
      return success;
    } catch (error) {
      console.error('❌ Giriş kayıt hatası:', error);
      return false;
    }
  }

  // Çıkış
  static logout(): void {
    try {
      if (typeof window === 'undefined') return;

      console.log('🧹 TAMAMEN TEMİZLİK başlatılıyor...');
      this.cleanupAllData();
      console.log('✅ Tamamen temizlik tamamlandı');
    } catch (error) {
      console.error('❌ Çıkış hatası:', error);
    }
  }

  // TÜM VERİLERİ TEMİZLE - GELİŞTİRİLMİŞ
  static cleanupAllData(): void {
    try {
      // Ana login verilerini temizle
      localStorage.removeItem('user_login_data');
      
      // Tüm eski format verilerini temizle
      const keysToRemove = [
        'isLoggedIn', 'userEmail', 'firmaAdi', 'firmaId',
        'testUser', 'demoUser', 'adminUser',
        'login_data', 'user_data', 'firma_data',
        'projeler', 'egitimler', 'forum_konular', 'etkinlikler',
        'dashboard_data', 'stats_data', 'activities_data'
      ];

      keysToRemove.forEach((key) => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🗑️ ${key} temizlendi`);
        }
      });

      // Session storage da temizle
      sessionStorage.clear();

    } catch (error) {
      console.warn('⚠️ Veri temizliği hatası:', error);
    }
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const redirectRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🚫 OTOMATİK GİRİŞ TAMAMEN KALDIRILDI
  useEffect(() => {
    if (!mounted) return;

    // Sayfa yüklendiğinde tüm eski verileri temizle
    console.log('🧹 Login sayfası yüklendi, eski veriler temizleniyor...');
    SecureLoginService.cleanupAllData();

    console.log('✅ Login sayfası hazır - OTOMATİK GİRİŞ YOK');
  }, [mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading || redirectRef.current) {
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Email ve şifre alanları boş bırakılamaz!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Backend API üzerinden kimlik doğrulama
      const data = await apiService.auth.login(email.trim(), password.trim());

      if (data.success && data.data.token) {
        // Store token and user data
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('user_data', JSON.stringify(data.data.user));
        
        // Also store in the existing format for compatibility
        const loginData = {
          email: data.data.user.email,
          firmaAdi: data.data.user.firmaAdi,
          firmaId: data.data.user.id,
        };
        SecureLoginService.login(loginData);

        redirectRef.current = true;
        console.log('✅ Başarılı giriş, dashboard\'a yönlendiriliyor');
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(data.error?.message || 'Giriş başarısız!');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Giriş hatası oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  // Yükleniyor durumu
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-200">Sayfa hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-purple-900/50"></div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Modern Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="text-3xl font-bold text-white font-['Pacifico']">logo</span>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Hoş Geldiniz! 👋
            </h1>
            <p className="text-purple-200">
              E-İhracat platformuna güvenli giriş yapın
            </p>
          </div>
        </div>

        {/* Modern Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 space-y-6">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Firma Girişi</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto"></div>
            </div>

            {error && (
              <div className="bg-red-500/20 backdrop-blur-lg border border-red-400/30 text-red-100 px-4 py-3 rounded-xl text-sm">
                <div className="flex items-center space-x-2">
                  <i className="ri-error-warning-line text-red-300"></i>
                  <span><strong>Hata:</strong> {error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-purple-200 mb-2">
                    <i className="ri-mail-line mr-2"></i>
                    E-posta Adresi
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all disabled:opacity-50 text-white placeholder-purple-300 text-sm"
                    placeholder="firma@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-purple-200 mb-2">
                    <i className="ri-lock-line mr-2"></i>
                    Şifre
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all disabled:opacity-50 text-white placeholder-purple-300 text-sm"
                    placeholder="Şifrenizi giriniz"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold cursor-pointer whitespace-nowrap shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Giriş yapılıyor...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <i className="ri-login-circle-line"></i>
                    <span>Güvenli Giriş Yap</span>
                  </div>
                )}
              </button>
            </form>

            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="h-px bg-white/20 flex-1"></div>
                <span className="text-purple-300 text-sm">Destek</span>
                <div className="h-px bg-white/20 flex-1"></div>
              </div>
              
              <div className="flex items-center justify-center space-x-6 text-sm">
                <a href="#" className="text-purple-300 hover:text-white transition-colors flex items-center space-x-1">
                  <i className="ri-lock-unlock-line"></i>
                  <span>Şifremi unuttum</span>
                </a>
                <a href="#" className="text-purple-300 hover:text-white transition-colors flex items-center space-x-1">
                  <i className="ri-customer-service-line"></i>
                  <span>Yardım</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-500/10 backdrop-blur-lg border border-blue-400/20 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <i className="ri-shield-check-line text-blue-300"></i>
            </div>
            <h3 className="text-blue-200 font-semibold">Güvenli Platform</h3>
          </div>
          <p className="text-blue-300 text-sm">
            Sadece Supabase veritabanında kayıtlı aktif firmalar giriş yapabilir.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-purple-300 text-sm">
            Henüz hesabınız yok mu?{' '}
            <a href="#" className="text-white hover:text-purple-200 font-medium transition-colors">
              Bizimle iletişime geçin
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
