'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import apiService from '@/lib/api';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email || !password) {
        setError('E-posta ve şifre alanları zorunludur.');
        setLoading(false);
        return;
      }

      console.log('🔍 Admin girişi deneniyor:', { email: email.toLowerCase() });
      
      // Immediate debug check
      console.log('📊 Form data:', { email, password: password ? '***' : 'empty' });

      const cleanEmail = email.toLowerCase().trim();
      
      // Backend API ile admin girişi (apiService üzerinden)
      try {
        const data = await apiService.admin.login(cleanEmail, password);

        if (data.success && data.data?.token && data.data?.admin) {
          console.log('✅ Backend admin girişi başarılı:', data.data.admin.name);

          // Admin bilgilerini localStorage'a kaydet
          localStorage.setItem('isAdminLoggedIn', 'true');
          localStorage.setItem('adminEmail', data.data.admin.email);
          localStorage.setItem('adminRole', data.data.admin.role);
          localStorage.setItem('adminId', '1');
          localStorage.setItem('adminName', data.data.admin.name);
          localStorage.setItem('admin_token', data.data.token);

          console.log('✅ Admin bilgileri kaydedildi, yönlendiriliyor...');
          router.push('/admin-dashboard');
          return;
        } else {
          console.log('❌ Backend admin girişi başarısız:', (data.error as any)?.message);
          setError((data.error as any)?.message || 'Geçersiz admin bilgileri.');
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.log('❌ Backend API hatası:', apiError);
        
        // Fallback: Basit admin kontrolü
        const validAdmins = [
          { email: 'bilgi@omerfarukunsal.com', password: 'admin123', name: 'Ömer Farukunsal' },
          { email: 'admin@system.com', password: 'admin123', name: 'System Admin' },
          { email: 'demo@example.com', password: 'demo123', name: 'Demo Admin' }
        ];

        const matchedAdmin = validAdmins.find(admin => 
          admin.email === cleanEmail && admin.password === password
        );

        if (matchedAdmin) {
          console.log('✅ Fallback admin kontrolü başarılı:', matchedAdmin.name);
          
          localStorage.setItem('isAdminLoggedIn', 'true');
          localStorage.setItem('adminEmail', matchedAdmin.email);
          localStorage.setItem('adminRole', 'admin');
          localStorage.setItem('adminId', '1');
          localStorage.setItem('adminName', matchedAdmin.name);
          localStorage.setItem('admin_token', 'fallback_token_' + Date.now());

          console.log('✅ Admin bilgileri kaydedildi, yönlendiriliyor...');
          router.push('/admin-dashboard');
          return;
        } else {
          setError('Geçersiz admin bilgileri.');
          setLoading(false);
          return;
        }
      }

      console.log('❌ Basit kontrolde eşleşme bulunamadı');

      // Supabase ile kontrol (opsiyonel)
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          console.log('🔍 Supabase ile kullanıcı aranıyor...');

          const { data: userData, error: userError } = await supabase
            .from('kullanicilar')
            .select('id, email, sifre, ad_soyad, rol')
            .eq('email', cleanEmail)
            .single();

          if (!userError && userData) {
            console.log('👤 Supabase kullanıcı bulundu:', { 
              id: userData.id, 
              email: userData.email, 
              rol: userData.rol 
            });

            // Şifre kontrolü
            if (userData.sifre === password) {
              console.log('🔒 Şifre doğru');
              
              // Admin yetkisi kontrolü
              if (userData.rol === 'Yonetici') {
                console.log('✅ Admin yetkisi onaylandı');

                // Admin bilgilerini localStorage'a kaydet
                localStorage.setItem('isAdminLoggedIn', 'true');
                localStorage.setItem('adminEmail', userData.email);
                localStorage.setItem('adminRole', userData.rol);
                localStorage.setItem('adminId', userData.id.toString());
                localStorage.setItem('adminName', userData.ad_soyad || 'Admin');
                localStorage.setItem('admin_token', 'supabase_token_' + Date.now());

                console.log('✅ Supabase admin girişi başarılı, yönlendiriliyor...');
                router.push('/admin-dashboard');
                return;
              } else {
                console.warn('🚫 Yetki yok:', userData.rol);
                setError(`Bu panele erişim yetkiniz bulunmamaktadır. Mevcut rol: ${userData.rol}`);
              }
            } else {
              console.warn('🔒 Şifre uyuşmuyor');
              setError('Geçersiz şifre.');
            }
          } else {
            console.warn('⚠️ Supabase\'de kullanıcı bulunamadı');
            setError('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.');
          }
        } else {
          console.warn('⚠️ Supabase bağlantısı yok');
          setError('Geçersiz e-posta veya şifre.');
        }
      } catch (supabaseErr: any) {
        console.warn('⚠️ Supabase hatası:', supabaseErr.message);
        setError('Veritabanı bağlantı hatası.');
      }

      // Eğer hiçbir kontrol başarılı değilse
      console.log('❌ Tüm kontroller başarısız');
      setError('Geçersiz e-posta veya şifre. Lütfen bilgilerinizi kontrol edin.');

    } catch (err: any) {
      console.error('❌ Admin giriş sistem hatası:', err);
      setError(`Giriş sırasında bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-white font-['Pacifico']">
                logo
              </div>
              <span className="ml-4 text-gray-300">Yönetici Paneli</span>
            </div>
            <Link href="/" className="text-gray-300 hover:text-white transition-colors cursor-pointer">
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex items-center justify-center py-20">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-shield-user-line text-white text-2xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Yönetici Girişi</h1>
              <p className="text-gray-400">
                Admin paneline erişim
              </p>
            </div>

            {/* Admin Hesapları Info */}
            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
              <div className="text-center">
                <p className="text-blue-300 text-sm font-medium mb-3">
                  🔑 Geçerli Admin Hesapları:
                </p>
                <div className="space-y-2 text-xs text-blue-200">
                  <div className="bg-blue-800/50 p-2 rounded">
                    <p><strong>Email:</strong> bilgi@omerfarukunsal.com</p>
                    <p><strong>Şifre:</strong> admin123</p>
                  </div>
                  <div className="bg-blue-800/50 p-2 rounded">
                    <p><strong>Email:</strong> admin@system.com</p>
                    <p><strong>Şifre:</strong> admin123</p>
                  </div>
                  <div className="bg-blue-800/50 p-2 rounded">
                    <p><strong>Email:</strong> demo@example.com</p>
                    <p><strong>Şifre:</strong> demo123</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hata Mesajı */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                <div className="flex items-center space-x-2">
                  <i className="ri-error-warning-line text-red-400"></i>
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Debug Bilgisi */}
            <div className="mb-6 p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
              <div className="text-center">
                <p className="text-green-300 text-xs font-medium mb-2">
                  🔧 Debug Modu Aktif
                </p>
                <div className="text-xs text-green-200">
                  <p>Girilen Email: {email || 'Henüz girilmedi'}</p>
                  <p>Şifre Uzunluğu: {password.length} karakter</p>
                  <p>Loading: {loading ? 'Evet' : 'Hayır'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  E-posta Adresi
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-white placeholder-gray-400 text-sm"
                  placeholder="bilgi@omerfarukunsal.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Şifre
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-white placeholder-gray-400 text-sm"
                  placeholder="admin123"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Giriş yapılıyor...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-login-circle-line"></i>
                    <span>Yönetici Girişi Yap</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                🔧 Bu panel sadece yönetici yetkisi olan hesaplar için çalışır.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Sorun yaşıyorsanız tarayıcı konsolunu (F12) açıp hataları kontrol edin.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Giriş yaparak{' '}
              <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                Admin Kullanım Şartları
              </a>
              {`'nı kabul etmiş olursunuz.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}