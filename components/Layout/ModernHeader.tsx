
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ModernHeaderProps {
  userEmail?: string;
  userRole?: string;
  isAdmin?: boolean;
  notifications?: number;
}

export default function ModernHeader({ 
  userEmail = '', 
  userRole = '', 
  isAdmin = false,
  notifications = 3 
}: ModernHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [weatherInfo] = useState({ temp: '22°C', condition: 'Güneşli' });
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    try {
      if (typeof window === 'undefined') return;

      if (isAdmin) {
        localStorage.removeItem('isAdminLoggedIn');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminRole');
      } else {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('firmaAdi');
        localStorage.removeItem('firmaId');
      }
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const notificationData = [
    {
      id: 1,
      title: 'Yeni Proje Görevi',
      message: 'B2B platform geliştirme görevinde güncelleme',
      time: '2 saat önce',
      type: 'info',
      icon: 'ri-task-line'
    },
    {
      id: 2,
      title: 'Eğitim Hatırlatması',
      message: 'Dijital pazarlama eğitimine devam etmeyi unutmayın',
      time: '1 gün önce',
      type: 'warning',
      icon: 'ri-graduation-cap-line'
    },
    {
      id: 3,
      title: 'Forum Yanıtı',
      message: 'E-ihracat konusundaki sorunuza yanıt geldi',
      time: '3 gün önce',
      type: 'success',
      icon: 'ri-discuss-line'
    },
  ];

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Sol Taraf - Logo */}
          <div className="flex items-center space-x-4">
            <Link href={isAdmin ? "/admin-dashboard" : "/dashboard"} className="flex items-center space-x-3 cursor-pointer">
              <img 
                src="https://static.readdy.ai/image/24aa2a118c1d89bdb327761b85495631/41e18ce990b0915113783412920e4806.png" 
                alt="İhracat Akademi" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">İhracat Akademi</h1>
                <p className="text-xs text-gray-600">Dijital Dönüşüm Platformu</p>
              </div>
            </Link>
          </div>

          {/* Sağ Taraf - Sistem Bilgileri ve Kullanıcı Menüsü */}
          <div className="flex items-center space-x-6">
            {/* Sistem Saati ve Hava Durumu */}
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2 bg-gray-50/70 px-3 py-2 rounded-lg">
                <i className="ri-time-line text-blue-600"></i>
                <span className="text-gray-700 font-medium" suppressHydrationWarning={true}>
                  {currentTime.toLocaleTimeString('tr-TR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>

              <div className="flex items-center space-x-2 bg-gray-50/70 px-3 py-2 rounded-lg">
                <i className="ri-sun-line text-yellow-500"></i>
                <span className="text-gray-700 font-medium">{weatherInfo.temp}</span>
                <span className="text-gray-600">{weatherInfo.condition}</span>
              </div>
            </div>

            {/* Bildirimler */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100/70 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-notification-line text-xl"></i>
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Bildirim Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200/50 z-50">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Bildirimler</h3>
                    <p className="text-sm text-gray-600">{notifications} yeni bildirim</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificationData.map((notification) => (
                      <div key={notification.id} className="p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            notification.type === 'info' ? 'bg-blue-100 text-blue-600' :
                            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            <i className={`${notification.icon} text-sm`}></i>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">{notification.title}</h4>
                            <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                            <p className="text-gray-400 text-xs mt-2">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-gray-50/50">
                    <button className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer">
                      Tümünü Gör
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Kullanıcı Profil Menüsü */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 p-2 hover:bg-gray-100/70 rounded-lg transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <i className="ri-user-line text-white"></i>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900">{userRole}</p>
                  <p className="text-xs text-gray-600">{userEmail}</p>
                </div>
                <i className="ri-arrow-down-s-line text-gray-400"></i>
              </button>

              {/* Profil Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200/50 z-50">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <i className="ri-user-line text-white text-lg"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{userRole}</h3>
                        <p className="text-sm text-gray-600">{userEmail}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/firma-profil"
                      className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <i className="ri-building-line text-gray-600"></i>
                      <span className="text-gray-900">Firma Profili</span>
                    </Link>
                    <Link
                      href="/destek-merkezi"
                      className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <i className="ri-customer-service-line text-gray-600"></i>
                      <span className="text-gray-900">Destek</span>
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 py-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors w-full text-left cursor-pointer"
                    >
                      <i className="ri-logout-box-line"></i>
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown'ları kapatmak için overlay */}
      {(showNotifications || showProfileMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowProfileMenu(false);
          }}
        ></div>
      )}
    </header>
  );
}
