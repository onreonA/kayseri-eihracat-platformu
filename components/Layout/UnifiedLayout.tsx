'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { UnifiedLoginService } from '@/lib/multi-level-auth';
import { PermissionNavItem } from '@/components/PermissionGuard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface UnifiedLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowedUserTypes?: string[];
  fallbackUrl?: string;
}

interface MenuItem {
  icon: string;
  label: string;
  href: string;
  permission?: string;
  userTypes?: string[];
  active?: boolean;
  badge?: number;
}

interface UserContextInfo {
  id: number;
  email: string;
  fullName: string;
  userType: string;
  companyId?: number;
  companyName?: string;
  avatarUrl?: string;
  permissions?: string[];
}

export default function UnifiedLayout({ 
  children, 
  requireAuth = true,
  allowedUserTypes = [],
  fallbackUrl = '/login'
}: UnifiedLayoutProps) {
  const [user, setUser] = useState<UserContextInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState(0);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    checkAuthAndLoadUser();
  }, []);

  const checkAuthAndLoadUser = async () => {
    try {
      if (requireAuth) {
        const currentUser = UnifiedLoginService.getCurrentUser();
        
        if (!currentUser) {
          router.push(fallbackUrl);
          return;
        }

        // Check user type restrictions
        if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(currentUser.userType)) {
          console.log('❌ User type not allowed:', currentUser.userType);
          router.push('/unauthorized');
          return;
        }

        // Map to UserContextInfo
        const userInfo: UserContextInfo = {
          id: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.fullName,
          userType: currentUser.userType,
          companyId: currentUser.companyId,
          companyName: currentUser.companyName,
          avatarUrl: generateAvatarUrl(currentUser.fullName),
          permissions: [] // TODO: Load from RBAC
        };

        setUser(userInfo);
        
        // Load notifications count
        await loadNotifications(currentUser.id);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (requireAuth) {
        router.push(fallbackUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (userId: number) => {
    try {
      // TODO: Implement notification loading
      setNotifications(Math.floor(Math.random() * 5));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const generateAvatarUrl = (fullName: string): string => {
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=3B82F6&color=ffffff&size=128&font-size=0.6`;
  };

  const getMenuItems = (): MenuItem[] => {
    if (!user) return [];

    const baseItems: MenuItem[] = [];

    // Common items for all authenticated users
    baseItems.push({
      icon: 'ri-dashboard-line',
      label: 'Dashboard',
      href: user.userType === 'master_admin' || user.userType === 'admin' ? '/admin-dashboard' :
            user.userType === 'consultant' ? '/consultant-dashboard' : '/dashboard',
      active: pathname === '/dashboard' || pathname === '/admin-dashboard' || pathname === '/consultant-dashboard'
    });

    // User type specific menus
    switch (user.userType) {
      case 'master_admin':
        baseItems.push(
          { icon: 'ri-building-line', label: 'Firma Yönetimi', href: '/admin-firmalar', permission: 'companies.view_all' },
          { icon: 'ri-project-line', label: 'Proje Yönetimi', href: '/admin-proje-yonetimi', permission: 'projects.view_all' },
          { icon: 'ri-user-star-line', label: 'Danışman Yönetimi', href: '/admin-consultant-yonetimi', permission: 'users.view_all' },
          { icon: 'ri-shield-user-line', label: 'Yetki Yönetimi', href: '/admin-permission-yonetimi', permission: 'permissions.manage' },
          { icon: 'ri-calendar-check-line', label: 'Randevu Talepleri', href: '/admin-randevu-talepleri', permission: 'companies.view_all' },
          { icon: 'ri-graduation-cap-line', label: 'Eğitim Yönetimi', href: '/admin-egitim-yonetimi', permission: 'education.view_all' },
          { icon: 'ri-calendar-event-line', label: 'Etkinlik Yönetimi', href: '/admin-etkinlik-yonetimi', permission: 'events.view_all' },
          { icon: 'ri-bar-chart-line', label: 'Dönem Yönetimi', href: '/admin-donem-yonetimi', permission: 'reports.view_all' },
          { icon: 'ri-discuss-line', label: 'Forum Yönetimi', href: '/admin-forum-yonetimi', permission: 'content.edit' },
          { icon: 'ri-file-text-line', label: 'Destek Dokümanları', href: '/admin-destek-dokumanlari', permission: 'content.edit' },
          { icon: 'ri-team-line', label: 'Kullanıcılar (Personel)', href: '/admin-kullanici-yonetimi', permission: 'users.view_all' },
          { icon: 'ri-check-double-line', label: 'Görev Onayları', href: '/admin-gorev-onaylari', permission: 'projects.edit_all' }
        );
        break;

      case 'admin':
        baseItems.push(
          { icon: 'ri-building-line', label: 'Firma Yönetimi', href: '/admin-firmalar', permission: 'companies.view_all' },
          { icon: 'ri-project-line', label: 'Proje Yönetimi', href: '/admin-proje-yonetimi', permission: 'projects.view_all' },
          { icon: 'ri-user-star-line', label: 'Danışman Yönetimi', href: '/admin-consultant-yonetimi', permission: 'users.view_all' },
          { icon: 'ri-calendar-check-line', label: 'Randevu Talepleri', href: '/admin-randevu-talepleri', permission: 'companies.view_all' },
          { icon: 'ri-graduation-cap-line', label: 'Eğitim Yönetimi', href: '/admin-egitim-yonetimi', permission: 'education.view_all' },
          { icon: 'ri-calendar-event-line', label: 'Etkinlik Yönetimi', href: '/admin-etkinlik-yonetimi', permission: 'events.view_all' },
          { icon: 'ri-discuss-line', label: 'Forum Yönetimi', href: '/admin-forum-yonetimi', permission: 'content.edit' },
          { icon: 'ri-team-line', label: 'Kullanıcılar (Personel)', href: '/admin-kullanici-yonetimi', permission: 'users.view_all' }
        );
        break;

      case 'consultant':
        baseItems.push(
          { icon: 'ri-building-line', label: 'Firmalarım', href: '/consultant-companies', permission: 'companies.view_assigned' },
          { icon: 'ri-project-line', label: 'Projelerim', href: '/consultant-projects', permission: 'projects.view_assigned' },
          { icon: 'ri-graduation-cap-line', label: 'Eğitim Programları', href: '/consultant-education', permission: 'education.view_assigned' },
          { icon: 'ri-calendar-event-line', label: 'Etkinlikler', href: '/consultant-events', permission: 'events.view_all' },
          { icon: 'ri-bar-chart-line', label: 'Raporlar', href: '/consultant-reports', permission: 'reports.view_own' },
          { icon: 'ri-user-line', label: 'Profil', href: '/consultant-profile' }
        );
        break;

      case 'company_owner':
        baseItems.push(
          { icon: 'ri-folder-line', label: 'Projelerim', href: '/projelerim', permission: 'projects.view_assigned' },
          { icon: 'ri-graduation-cap-line', label: 'Eğitimlerim', href: '/egitimlerim', permission: 'education.view_assigned' },
          { icon: 'ri-calendar-event-line', label: 'Etkinlikler', href: '/etkinlikler', permission: 'events.view_public' },
          { icon: 'ri-discuss-line', label: 'Forum', href: '/forum', permission: 'content.view' },
          { icon: 'ri-news-line', label: 'Haberler', href: '/haberler', permission: 'content.view' },
          { icon: 'ri-calendar-check-line', label: 'Randevu Talebi', href: '/randevu-talebi' },
          { icon: 'ri-file-text-line', label: 'Destek Merkezi', href: '/destek-merkezi' },
          { icon: 'ri-bar-chart-line', label: 'Dönem Raporları', href: '/donem-raporlari', permission: 'reports.view_own' },
          { icon: 'ri-building-line', label: 'Firma Profil', href: '/firma-profil', permission: 'companies.edit_own' },
          { icon: 'ri-team-line', label: 'Personel Yönetimi', href: '/firma-personel-yonetimi', permission: 'users.edit_company' },
          { icon: 'ri-calendar-line', label: 'Proje Takvimi', href: '/proje-takvimi', permission: 'projects.view_assigned' }
        );
        break;

      case 'company_manager':
      case 'company_personnel':
        baseItems.push(
          { icon: 'ri-folder-line', label: 'Projelerim', href: '/projelerim', permission: 'projects.view_assigned' },
          { icon: 'ri-graduation-cap-line', label: 'Eğitimlerim', href: '/egitimlerim', permission: 'education.participate' },
          { icon: 'ri-calendar-event-line', label: 'Etkinlikler', href: '/etkinlikler', permission: 'events.view_public' },
          { icon: 'ri-discuss-line', label: 'Forum', href: '/forum', permission: 'content.view' },
          { icon: 'ri-news-line', label: 'Haberler', href: '/haberler', permission: 'content.view' },
          { icon: 'ri-file-text-line', label: 'Destek Merkezi', href: '/destek-merkezi' },
          { icon: 'ri-bar-chart-line', label: 'Raporlar', href: '/donem-raporlari', permission: 'reports.view_own' },
          { icon: 'ri-calendar-line', label: 'Proje Takvimi', href: '/proje-takvimi', permission: 'projects.view_assigned' }
        );
        break;

      default:
        // Guest or unknown user type
        baseItems.push(
          { icon: 'ri-news-line', label: 'Haberler', href: '/haberler', permission: 'content.view' },
          { icon: 'ri-calendar-event-line', label: 'Etkinlikler', href: '/etkinlikler', permission: 'events.view_public' }
        );
        break;
    }

    return baseItems;
  };

  const handleLogout = async () => {
    try {
      await UnifiedLoginService.logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserTypeDisplayName = (userType: string): string => {
    const displayNames: Record<string, string> = {
      master_admin: 'Master Admin',
      admin: 'Admin',
      consultant: 'Danışman',
      company_owner: 'Firma Sahibi',
      company_manager: 'Firma Yöneticisi',
      company_personnel: 'Firma Personeli',
      guest: 'Misafir'
    };
    return displayNames[userType] || userType;
  };

  const getUserTypeColor = (userType: string): string => {
    const colors: Record<string, string> = {
      master_admin: 'from-red-500 to-red-600',
      admin: 'from-purple-500 to-purple-600',
      consultant: 'from-blue-500 to-blue-600',
      company_owner: 'from-green-500 to-green-600',
      company_manager: 'from-yellow-500 to-yellow-600',
      company_personnel: 'from-indigo-500 to-indigo-600',
      guest: 'from-gray-500 to-gray-600'
    };
    return colors[userType] || 'from-gray-500 to-gray-600';
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (requireAuth && !user) {
    return null; // Will redirect
  }

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-white/90 backdrop-blur-lg border-r border-white/20 shadow-2xl transition-all duration-300 flex flex-col h-screen fixed left-0 top-0 z-40 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <Link href="/" className="text-2xl font-bold text-blue-600 cursor-pointer font-['Pacifico']">
                E-İhracat Platform
              </Link>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg bg-gray-100/50 hover:bg-gray-200/50 transition-colors cursor-pointer"
            >
              <i className={`ri-${sidebarCollapsed ? 'menu-unfold' : 'menu-fold'}-line text-gray-600`}></i>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 px-2 overflow-y-auto">
          <nav className="space-y-1">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href;

              if (item.permission) {
                return (
                  <PermissionNavItem
                    key={`${item.href}-${index}`}
                    permission={item.permission}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActive}
                    className={sidebarCollapsed ? 'justify-center' : ''}
                  />
                );
              }

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

                    {!sidebarCollapsed && (
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

                    {sidebarCollapsed && item.badge && item.badge > 0 && (
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

        {/* User Info & Logout */}
        {user && (
          <div className="p-4 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-blue-50/50">
            {!sidebarCollapsed ? (
              <div className="space-y-3">
                <div className="text-center">
                  <div className={`w-12 h-12 bg-gradient-to-r ${getUserTypeColor(user.userType)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.fullName}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <i className="ri-user-line text-white text-xl"></i>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 truncate">{user.email}</p>
                  <p className="text-xs font-semibold text-gray-800">{getUserTypeDisplayName(user.userType)}</p>
                  {user.companyName && (
                    <p className="text-xs text-gray-500 truncate">{user.companyName}</p>
                  )}
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
                <div className={`w-10 h-10 bg-gradient-to-r ${getUserTypeColor(user.userType)} rounded-full flex items-center justify-center`}>
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.fullName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <i className="ri-user-line text-white"></i>
                  )}
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
        )}
      </div>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-sm sticky top-0 z-30">
          <div className="flex justify-between items-center px-6 py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {user && getUserTypeDisplayName(user.userType)} Panel
              </h1>
              {notifications > 0 && (
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors">
                    <i className="ri-notification-line text-blue-600"></i>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {notifications}
                  </div>
                </div>
              )}
            </div>

            {user && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                  <div className="text-xs text-gray-500">{getUserTypeDisplayName(user.userType)}</div>
                </div>
                <div className={`w-10 h-10 bg-gradient-to-r ${getUserTypeColor(user.userType)} rounded-full flex items-center justify-center`}>
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.fullName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <i className="ri-user-line text-white"></i>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
