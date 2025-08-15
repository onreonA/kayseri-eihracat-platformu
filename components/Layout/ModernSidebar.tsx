
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface MenuItem {
  icon: string;
  label: string;
  href: string;
  active: boolean;
  badge?: number;
}

interface ModernSidebarProps {
  menuItems?: MenuItem[];
  userEmail?: string;
  userRole?: string;
  isAdmin?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function ModernSidebar({ 
  menuItems = [], 
  userEmail = '', 
  userRole = '', 
  isAdmin = false,
  isOpen = true,
  onToggle 
}: ModernSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const userMenuItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', href: '/dashboard', active: false },
    { icon: 'ri-folder-line', label: 'Projelerim', href: '/projelerim', active: false },
    { icon: 'ri-graduation-cap-line', label: 'Eğitimlerim', href: '/egitimlerim', active: false },
    { icon: 'ri-calendar-event-line', label: 'Etkinlikler', href: '/etkinlikler', active: false },
    { icon: 'ri-discuss-line', label: 'Forum', href: '/forum', active: false },
    { icon: 'ri-news-line', label: 'Haberler', href: '/haberler', active: false },
    { icon: 'ri-user-star-line', label: 'Onaylanan Başvurular', href: '/onaylanan-kariyer-basvurulari', active: false },
    { icon: 'ri-calendar-check-line', label: 'Randevu Talebi', href: '/randevu-talebi', active: false },
    { icon: 'ri-file-text-line', label: 'Destek Merkezi', href: '/destek-merkezi', active: false },
    { icon: 'ri-bar-chart-line', label: 'Dönem Raporları', href: '/donem-raporlari', active: false },
    { icon: 'ri-building-line', label: 'Firma Profil', href: '/firma-profil', active: false },
    { icon: 'ri-calendar-line', label: 'Proje Takvimi', href: '/proje-takvimi', active: false },
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem('user_login_data');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('firmaAdi');
      localStorage.removeItem('firmaId');
      localStorage.removeItem('userEmail');
      
      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');

      router.push('/');
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
  };

  return (
    <div className={`bg-white/90 backdrop-blur-lg border-r border-white/20 shadow-2xl transition-all duration-300 flex flex-col h-screen fixed left-0 top-0 z-40 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <Link href={isAdmin ? "/admin-dashboard" : "/dashboard"} className="text-2xl font-bold text-blue-600 cursor-pointer font-['Pacifico']">
              logo
            </Link>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg bg-gray-100/50 hover:bg-gray-200/50 transition-colors cursor-pointer"
          >
            <i className={`ri-${isCollapsed ? 'menu-unfold' : 'menu-fold'}-line text-gray-600`}></i>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-2 overflow-y-auto">
        <nav className="space-y-1">
          {userMenuItems.map((item, index) => {
            const isActive = pathname === item.href || (pathname === '/projelerim' && item.href === '/projelerim');

            return (
              <Link key={`${item.href}-${index}`} href={item.href}>
                <div className={`group flex items-center px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105' 
                    : 'text-gray-700 hover:bg-gray-100/70 hover:scale-102'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isActive 
                      ? 'bg-white/20 backdrop-blur-lg text-white' 
                      : 'bg-gray-100/50 text-gray-600 group-hover:bg-white group-hover:shadow-md'
                  }`}>
                    <i className={`${item.icon} text-lg`}></i>
                  </div>

                  {!isCollapsed && (
                    <div className="ml-3 flex items-center justify-between flex-1">
                      <span className="font-medium text-sm">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive 
                            ? 'bg-white/30 text-white' 
                            : 'bg-red-500 text-white animate-pulse'
                        }`}>
                          {item.badge}
                        </div>
                      )}
                    </div>
                  )}

                  {isCollapsed && item.badge && item.badge > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
                      {item.badge}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Kullanıcı bilgileri ve çıkış */}
      <div className="p-4 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-blue-50/50">
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <i className="ri-user-line text-white text-xl"></i>
              </div>
              <p className="text-xs text-gray-600 truncate">{userEmail}</p>
              <p className="text-xs font-semibold text-gray-800">{userRole}</p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105 text-sm font-medium whitespace-nowrap"
            >
              <i className="ri-logout-circle-r-line mr-2"></i>
              Çıkış Yap
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <i className="ri-user-line text-white"></i>
            </div>

            <button
              onClick={handleLogout}
              className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center whitespace-nowrap"
              title="Çıkış Yap"
            >
              <i className="ri-logout-circle-r-line"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}