'use client';

import { ReactNode, useEffect, useState } from 'react';
import { UnifiedLoginService } from '@/lib/multi-level-auth';
import { PermissionGuard } from '@/lib/rbac-permission-system';
import { useUserContext } from '@/components/UserTypeSwitch';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  onClick?: () => void;
  permission?: string;
}

interface DashboardSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  permission?: string;
  userTypes?: string[];
}

interface QuickActionProps {
  label: string;
  icon: string;
  color: string;
  onClick: () => void;
  permission?: string;
  badge?: number;
}

interface RecentActivityItem {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  href?: string;
}

// Dashboard Card Component
export function DashboardCard({ 
  title, 
  value, 
  icon, 
  color, 
  change, 
  onClick,
  permission 
}: DashboardCardProps) {
  const content = (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200 ${
        onClick ? 'hover:shadow-md cursor-pointer hover:scale-105' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              <i className={`ri-arrow-${change.type === 'increase' ? 'up' : 'down'}-line text-sm ${
                change.type === 'increase' ? 'text-green-500' : 'text-red-500'
              }`}></i>
              <span className={`text-sm font-medium ml-1 ${
                change.type === 'increase' ? 'text-green-500' : 'text-red-500'
              }`}>
                {Math.abs(change.value)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">{change.period}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center`}>
          <i className={`${icon} text-white text-xl`}></i>
        </div>
      </div>
    </div>
  );

  if (permission) {
    return (
      <div className="transition-opacity duration-200">
        {/* We'll implement this with PermissionGuard later */}
        {content}
      </div>
    );
  }

  return content;
}

// Dashboard Section Component
export function DashboardSection({ 
  title, 
  children, 
  className = '',
  permission,
  userTypes 
}: DashboardSectionProps) {
  const context = useUserContext();

  // Check user type restrictions
  if (userTypes && (!context || !userTypes.includes(context.userType))) {
    return null;
  }

  const content = (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );

  if (permission) {
    return (
      <div className="transition-opacity duration-200">
        {/* We'll implement this with PermissionGuard later */}
        {content}
      </div>
    );
  }

  return content;
}

// Quick Actions Component
export function QuickActions({ actions }: { actions: QuickActionProps[] }) {
  return (
    <DashboardSection title="Hızlı İşlemler">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const content = (
            <button
              key={index}
              onClick={action.onClick}
              className={`relative p-4 ${action.color} rounded-lg text-white transition-all duration-200 hover:shadow-lg hover:scale-105 flex flex-col items-center space-y-2`}
            >
              <i className={`${action.icon} text-2xl`}></i>
              <span className="text-sm font-medium text-center">{action.label}</span>
              {action.badge && action.badge > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{action.badge}</span>
                </div>
              )}
            </button>
          );

          if (action.permission) {
            return (
              <div key={index} className="transition-opacity duration-200">
                {/* We'll implement this with PermissionGuard later */}
                {content}
              </div>
            );
          }

          return content;
        })}
      </div>
    </DashboardSection>
  );
}

// Recent Activity Component
export function RecentActivity({ 
  activities, 
  title = "Son Aktiviteler",
  maxItems = 5 
}: { 
  activities: RecentActivityItem[];
  title?: string;
  maxItems?: number;
}) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <DashboardSection title={title}>
      {displayActivities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <i className="ri-time-line text-4xl mb-4"></i>
          <p>Henüz aktivite bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayActivities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                activity.href ? 'hover:bg-gray-50 cursor-pointer' : ''
              }`}
              onClick={activity.href ? () => window.location.href = activity.href : undefined}
            >
              <div className={`w-10 h-10 ${activity.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                <i className={`${activity.icon} text-white`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-500">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
              </div>
              {activity.href && (
                <i className="ri-arrow-right-s-line text-gray-400"></i>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}

// Statistics Overview Component
export function StatisticsOverview({ 
  stats, 
  title = "İstatistikler" 
}: { 
  stats: DashboardCardProps[];
  title?: string;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <DashboardCard key={index} {...stat} />
        ))}
      </div>
    </div>
  );
}

// Role-specific Dashboard Layouts
export function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const context = useUserContext();
  
  if (!context || !['master_admin', 'admin'].includes(context.userType)) {
    return <div className="text-center py-8 text-red-500">Yetkisiz erişim</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Sistem genel durumu ve yönetim araçları</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{context.fullName}</div>
            <div className="text-xs text-gray-500">{context.userType === 'master_admin' ? 'Master Admin' : 'Admin'}</div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
            <i className="ri-admin-line text-white"></i>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function ConsultantDashboardLayout({ children }: { children: ReactNode }) {
  const context = useUserContext();
  
  if (!context || context.userType !== 'consultant') {
    return <div className="text-center py-8 text-red-500">Yetkisiz erişim</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Danışman Dashboard</h1>
          <p className="text-gray-600 mt-2">Atanmış firmalar ve projeler</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{context.fullName}</div>
            <div className="text-xs text-gray-500">Danışman</div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <i className="ri-user-star-line text-white"></i>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function CompanyDashboardLayout({ children }: { children: ReactNode }) {
  const context = useUserContext();
  
  if (!context || !['company_owner', 'company_manager', 'company_personnel'].includes(context.userType)) {
    return <div className="text-center py-8 text-red-500">Yetkisiz erişim</div>;
  }

  const getUserTypeLabel = (userType: string) => {
    const labels: Record<string, string> = {
      company_owner: 'Firma Sahibi',
      company_manager: 'Firma Yöneticisi',
      company_personnel: 'Firma Personeli'
    };
    return labels[userType] || userType;
  };

  const getUserTypeColor = (userType: string) => {
    const colors: Record<string, string> = {
      company_owner: 'from-green-500 to-green-600',
      company_manager: 'from-yellow-500 to-yellow-600',
      company_personnel: 'from-indigo-500 to-indigo-600'
    };
    return colors[userType] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Hoş Geldiniz, {context.companyName || 'Firma Kullanıcısı'}! 👋
          </h1>
          <p className="text-gray-600 mt-2">E-ihracat yolculuğunuzda başarılı adımlar atıyorsunuz.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{context.fullName}</div>
            <div className="text-xs text-gray-500">{getUserTypeLabel(context.userType)}</div>
            {context.companyName && (
              <div className="text-xs text-gray-400">{context.companyName}</div>
            )}
          </div>
          <div className={`w-10 h-10 bg-gradient-to-r ${getUserTypeColor(context.userType)} rounded-full flex items-center justify-center`}>
            <i className="ri-building-line text-white"></i>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// Welcome Banner Component
export function WelcomeBanner({ 
  title, 
  subtitle, 
  userType,
  actions = [] 
}: {
  title: string;
  subtitle: string;
  userType: string;
  actions?: QuickActionProps[];
}) {
  const getUserTypeGradient = (type: string) => {
    const gradients: Record<string, string> = {
      master_admin: 'from-red-500 via-purple-500 to-blue-500',
      admin: 'from-purple-500 via-blue-500 to-indigo-500',
      consultant: 'from-blue-500 via-indigo-500 to-purple-500',
      company_owner: 'from-green-500 via-teal-500 to-blue-500',
      company_manager: 'from-yellow-500 via-orange-500 to-red-500',
      company_personnel: 'from-indigo-500 via-purple-500 to-pink-500'
    };
    return gradients[type] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className={`bg-gradient-to-r ${getUserTypeGradient(userType)} rounded-lg shadow-lg p-8 text-white`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-lg opacity-90 mb-4">{subtitle}</p>
          
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <i className={action.icon}></i>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="hidden lg:block">
          <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
            <i className="ri-dashboard-line text-6xl opacity-50"></i>
          </div>
        </div>
      </div>
    </div>
  );
}
