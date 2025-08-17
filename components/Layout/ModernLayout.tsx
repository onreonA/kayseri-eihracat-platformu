
'use client';

import { useState, useEffect } from 'react';
import ModernHeader from './ModernHeader';
import ModernSidebar from './ModernSidebar';

interface ModernLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userRole?: string;
  isAdmin?: boolean;
  notifications?: number;
}

export default function ModernLayout({ 
  children, 
  userEmail: propUserEmail, 
  userRole: propUserRole, 
  isAdmin = false,
  notifications = 0
}: ModernLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState(propUserEmail || '');
  const [userRole, setUserRole] = useState(propUserRole || '');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      if (!propUserEmail || !propUserRole) {
        if (isAdmin) {
          setUserEmail(localStorage.getItem('adminEmail') || '');
          setUserRole(localStorage.getItem('adminRole') || '');
        } else {
          setUserEmail(localStorage.getItem('userEmail') || '');
          setUserRole('Firma Kullanıcısı');
        }
      }
    }
  }, [isAdmin, propUserEmail, propUserRole]);

  // Props'tan gelen değerleri kullan
  useEffect(() => {
    if (propUserEmail) setUserEmail(propUserEmail);
    if (propUserRole) setUserRole(propUserRole);
  }, [propUserEmail, propUserRole]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <ModernSidebar
        userEmail={userEmail}
        userRole={userRole}
        isAdmin={isAdmin}
        isOpen={!sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <ModernHeader
          userEmail={userEmail}
          userRole={userRole}
          isAdmin={isAdmin}
          notifications={notifications}
        />

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
export default ModernLayout;
