'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserAuthGuardProps {
  children: React.ReactNode;
}

interface UserData {
  email: string;
  firmaAdi: string;
  firmaId: number;
}

export default function UserAuthGuard({ children }: UserAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const checkAuth = () => {
      try {
        console.log('🔐 UserAuthGuard: Basit auth kontrolü başlatılıyor...');

        // ✅ YENİ: Daha esnek ve güvenilir auth kontrolü
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userEmail = localStorage.getItem('userEmail');
        const firmaAdi = localStorage.getItem('firmaAdi');
        const firmaId = localStorage.getItem('firmaId');

        // Session backup kontrolü
        let sessionBackup = null;
        try {
          const sessionData = sessionStorage.getItem('userSession');
          if (sessionData) {
            sessionBackup = JSON.parse(sessionData);
          }
        } catch (e) {
          console.warn('Session backup parse edilemedi:', e);
        }

        // Ana kontrol: localStorage VEYA sessionStorage
        const hasMainAuth = (isLoggedIn === 'true' && userEmail && firmaAdi && firmaId);
        const hasSessionBackup = (sessionBackup && sessionBackup.isLoggedIn && sessionBackup.userEmail);

        if (hasMainAuth || hasSessionBackup) {
          // Kullanılacak veri kaynağını belirle
          const finalEmail = userEmail || (sessionBackup?.userEmail || '');
          const finalFirmaAdi = firmaAdi || (sessionBackup?.firmaAdi || '');
          const finalFirmaId = firmaId || (sessionBackup?.firmaId?.toString() || '0');

          if (finalEmail && finalFirmaAdi && finalFirmaId !== '0') {
            const userDataObj = {
              email: finalEmail,
              firmaAdi: finalFirmaAdi,
              firmaId: parseInt(finalFirmaId) || 0
            };

            console.log('✅ UserAuthGuard: Auth başarılı:', {
              source: hasMainAuth ? 'localStorage' : 'sessionStorage',
              email: finalEmail,
              firmaAdi: finalFirmaAdi
            });

            // Eğer session backup kullanıldıysa, localStorage'ı güncelle
            if (!hasMainAuth && hasSessionBackup) {
              localStorage.setItem('isLoggedIn', 'true');
              localStorage.setItem('userEmail', finalEmail);
              localStorage.setItem('firmaAdi', finalFirmaAdi);
              localStorage.setItem('firmaId', finalFirmaId);
              console.log('✅ localStorage session backup ile güncellendi');
            }

            setUserData(userDataObj);
            setIsAuthenticated(true);
            setLoading(false);
            return;
          }
        }

        console.log('❌ UserAuthGuard: Auth başarısız - login sayfasına yönlendiriliyor');
        setIsAuthenticated(false);
        setLoading(false);
        
        // Kısa delay ile yönlendirme (ani logout hissini azaltmak için)
        setTimeout(() => {
          router.push('/login');
        }, 100);
        
      } catch (error) {
        console.error('❌ UserAuthGuard kontrol hatası:', error);
        setIsAuthenticated(false);
        setLoading(false);
        router.push('/login');
      }
    };

    // ✅ YENİ: Daha kısa timeout
    const timeoutId = setTimeout(checkAuth, 10);
    return () => clearTimeout(timeoutId);
  }, [mounted, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Yetki kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Hata:</strong> Kullanıcı girişi gerekli
          </div>
          <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}