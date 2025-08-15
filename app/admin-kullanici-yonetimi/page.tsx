
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface AdminUser {
  id: number;
  adi: string;
  soyadi: string;
  email: string;
  rol: 'Yonetici' | 'Personel' | 'Editor';
  durum: 'Aktif' | 'Pasif';
  kayitTarihi: string;
  sonGiris?: string;
  yetkiler: string[];
  telefon?: string;
  departman?: string;
  sifre?: string;
}

// Sidebar component
const AdminSidebar = ({ activeMenuItem, setActiveMenuItem }: { activeMenuItem: string; setActiveMenuItem: (item: string) => void }) => {
  const menuItems = [
    { name: 'Dashboard', icon: 'ri-dashboard-line', active: false, href: '/admin-dashboard' },
    { name: 'Firmalar', icon: 'ri-building-line', active: false, href: '/admin-firmalar' },
    { name: 'Proje Yönetimi', icon: 'ri-folder-line', active: false, href: '/admin-proje-yonetimi' },
    { name: 'Randevu Talepleri', icon: 'ri-calendar-check-line', active: false, href: '/admin-randevu-talepleri' },
    { name: 'Eğitim Yönetimi', icon: 'ri-graduation-cap-line', active: false, href: '/admin-egitim-yonetimi' },
    { name: 'Etkinlik Yönetimi', icon: 'ri-calendar-event-line', active: false, href: '/admin-etkinlik-yonetimi' },
    { name: 'Dönem Yönetimi', icon: 'ri-bar-chart-line', active: false, href: '/admin-donem-yonetimi' },
    { name: 'Forum Yönetimi', icon: 'ri-discuss-line', active: false, href: '/admin-forum-yonetimi' },
    { name: 'Platform Geri Bildirimleri', icon: 'ri-feedback-line', active: false, href: '/admin-geri-bildirimler' },
    { name: 'Destek Dokümanları', icon: 'ri-file-text-line', active: false, href: '/admin-destek-dokumanlari' },
    { name: 'Kullanıcılar (Personel)', icon: 'ri-team-line', active: true },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen sticky top-0">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Yönetim Menüsü</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            item.href ? (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  activeMenuItem === item.name
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            ) : (
              <button
                key={item.name}
                onClick={() => setActiveMenuItem(item.name)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  activeMenuItem === item.name
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            )
          ))}
        </nav>
      </div>
    </div>
  );
};

class AdminUserManager {
  static initializeDatabase(): void {
    const existingData = localStorage.getItem('admin_users');
    if (!existingData) {
      const initialUsers: AdminUser[] = [
        {
          id: 1,
          adi: 'Super',
          soyadi: 'Admin',
          email: 'admin@kayseriihracat.com',
          rol: 'Yonetici',
          durum: 'Aktif',
          kayitTarihi: '2024-01-01',
          yetkiler: ['Tüm Yetkiler'],
          departman: 'Yönetim',
          telefon: '+90 352 123 45 67'
        }
      ];
      localStorage.setItem('admin_users', JSON.stringify(initialUsers));
    }
  }

  static getAllUsers(): AdminUser[] {
    try {
      const savedUsers = localStorage.getItem('admin_users');
      if (!savedUsers) {
        this.initializeDatabase();
        return this.getAllUsers();
      }
      return JSON.parse(savedUsers);
    } catch (error) {
      console.error('Kullanıcılar yükleme hatası:', error);
      return [];
    }
  }

  static addUser(userData: Omit<AdminUser, 'id' | 'kayitTarihi'>): AdminUser | null {
    try {
      const users = this.getAllUsers();
      const existingIds = users.map(u => u.id);
      const newId = Math.max(...existingIds, 0) + 1;

      const newUser: AdminUser = {
        ...userData,
        id: newId,
        kayitTarihi: new Date().toISOString().split('T')[0]
      };

      users.push(newUser);
      localStorage.setItem('admin_users', JSON.stringify(users));
      return newUser;
    } catch (error) {
      console.error('Kullanıcı ekleme hatası:', error);
      return null;
    }
  }

  static updateUser(userId: number, updatedData: Partial<AdminUser>): boolean {
    try {
      const users = this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === userId);

      if (userIndex === -1) {
        return false;
      }

      users[userIndex] = { ...users[userIndex], ...updatedData };
      localStorage.setItem('admin_users', JSON.stringify(users));
      return true;
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      return false;
    }
  }

  static deleteUser(userId: number): boolean {
    try {
      const users = this.getAllUsers();
      const filteredUsers = users.filter(u => u.id !== userId);
      localStorage.setItem('admin_users', JSON.stringify(filteredUsers));
      return true;
    } catch (error) {
      console.error('Kullanıcı silme hatası:', error);
      return false;
    }
  }
}

export default function AdminKullaniciYonetimiPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('');
  const [activeMenuItem, setActiveMenuItem] = useState('Kullanıcılar (Personel)');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [message, setMessage] = useState('');

  const [newUser, setNewUser] = useState({
    adi: '',
    soyadi: '',
    email: '',
    sifre: '',
    rol: 'Personel' as 'Yonetici' | 'Personel' | 'Editor',
    durum: 'Aktif' as 'Aktif' | 'Pasif',
    telefon: '',
    departman: '',
    yetkiler: [] as string[]
  });

  const router = useRouter();

  const availablePermissions = [
    'Firma Yönetimi',
    'Eğitim Yönetimi', 
    'Etkinlik Yönetimi',
    'Randevu Yönetimi',
    'Forum Yönetimi',
    'Dönem Yönetimi',
    'Destek Dokümanları',
    'Geri Bildirimler',
    'Kullanıcı Yönetimi',
    'Raporlama'
  ];

  useEffect(() => {
    checkAdminAuth();
  }, [router]);

  const checkAdminAuth = async () => {
    try {
      // Önce localStorage kontrolü yap
      const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
      const adminToken = localStorage.getItem('admin_token');
      
      console.log('🔍 Admin kontrolü (Kullanıcı Yönetimi):', { isAdminLoggedIn, adminToken });
      
      if (isAdminLoggedIn === 'true' && adminToken) {
        console.log('✅ Admin girişi doğrulandı (Kullanıcı Yönetimi), veriler yükleniyor...');
        setIsAdminLoggedIn(true);
        setAdminEmail(localStorage.getItem('adminEmail') || '');
        loadUsers();
        return;
      }

      // Fallback: Supabase kontrolü
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.log('❌ Supabase bağlantısı yok, login\'e yönlendiriliyor...');
        router.replace('/admin-login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ Supabase session yok, login\'e yönlendiriliyor...');
        router.replace('/admin-login');
        return;
      }

      loadUsers();
    } catch (error) {
      console.error('[AdminKullaniciYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/admin-login');
    }
  };

  const loadUsers = () => {
    try {
      setLoading(true);
      AdminUserManager.initializeDatabase();
      const allUsers = AdminUserManager.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Kullanıcılar yükleme hatası:', error);
      setMessage('Kullanıcılar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('adminEmail');
      router.push('/admin-login');
    } catch (error) {
      console.error('[AdminKullaniciYonetimi]', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.push('/admin-login');
    }
  };

  const handleNewUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!newUser.adi.trim() || !newUser.soyadi.trim() || !newUser.email.trim()) {
      setMessage('Ad, soyad ve e-posta alanları zorunludur.');
      return;
    }

    const userData = {
      adi: newUser.adi.trim(),
      soyadi: newUser.soyadi.trim(),
      email: newUser.email.trim(),
      rol: newUser.rol,
      durum: newUser.durum,
      telefon: newUser.telefon.trim(),
      departman: newUser.departman.trim(),
      yetkiler: newUser.yetkiler,
      sifre: newUser.sifre.trim()
    };

    const addedUser = AdminUserManager.addUser(userData);

    if (addedUser) {
      setUsers(prev => [...prev, addedUser]);
      setShowNewUserForm(false);
      setNewUser({
        adi: '',
        soyadi: '',
        email: '',
        sifre: '',
        rol: 'Personel',
        durum: 'Aktif',
        telefon: '',
        departman: '',
        yetkiler: []
      });
      setMessage('Yeni kullanıcı başarıyla eklendi.');
    } else {
      setMessage('Kullanıcı eklenirken bir hata oluştu.');
    }
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      const success = AdminUserManager.deleteUser(userId);

      if (success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setMessage('Kullanıcı başarıyla silindi.');
      } else {
        setMessage('Kullanıcı silinirken bir hata oluştu.');
      }
    }
  };

  const handleUpdateUserStatus = (userId: number, newStatus: 'Aktif' | 'Pasif') => {
    const success = AdminUserManager.updateUser(userId, { durum: newStatus });

    if (success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, durum: newStatus } : u));
      setMessage(`Kullanıcı durumu ${newStatus.toLowerCase()} olarak güncellendi.`);
    } else {
      setMessage('Durum güncellenirken bir hata oluştu.');
    }
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'Yonetici':
        return 'bg-red-100 text-red-800';
      case 'Editor':
        return 'bg-blue-100 text-blue-800';
      case 'Personel':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDurumBadge = (durum: string) => {
    return durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setNewUser(prev => ({
      ...prev,
      yetkiler: checked 
        ? [...prev.yetkiler, permission]
        : prev.yetkiler.filter(p => p !== permission)
    }));
  };

  if (!isAdminLoggedIn || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer" style={{ fontFamily: 'Pacifico' }}>
                logo
              </Link>
              <span className="ml-4 text-gray-600">Kullanıcı Yönetimi</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                Dashboard
              </Link>
              <span className="text-gray-600">
                Yönetici
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar activeMenuItem={activeMenuItem} setActiveMenuItem={setActiveMenuItem} />

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Kullanıcı Yönetimi</h1>
                  <p className="text-gray-600">Admin panel kullanıcılarını yönetin</p>
                </div>
                <button
                  onClick={() => setShowNewUserForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2"
                >
                  <i className="ri-user-add-line"></i>
                  <span>Yeni Kullanıcı Ekle</span>
                </button>
              </div>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-lg ${message.includes('başarıyla') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm ${message.includes('başarıyla') ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </p>
              </div>
            )}

            {/* Yeni Kullanıcı Formu */}
            {showNewUserForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Yeni Kullanıcı Ekle</h2>
                  <button
                    onClick={() => setShowNewUserForm(false)}
                    className="text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
                <form onSubmit={handleNewUserSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ad *
                      </label>
                      <input
                        type="text"
                        value={newUser.adi}
                        onChange={(e) => setNewUser(prev => ({ ...prev, adi: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Kullanıcı adı"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Soyad *
                      </label>
                      <input
                        type="text"
                        value={newUser.soyadi}
                        onChange={(e) => setNewUser(prev => ({ ...prev, soyadi: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Kullanıcı soyadı"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-posta *
                      </label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="kullanici@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Şifre *
                      </label>
                      <input
                        type="password"
                        value={newUser.sifre}
                        onChange={(e) => setNewUser(prev => ({ ...prev, sifre: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Güçlü şifre"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rol
                      </label>
                      <select
                        value={newUser.rol}
                        onChange={(e) => setNewUser(prev => ({ ...prev, rol: e.target.value as 'Yonetici' | 'Personel' | 'Editor' }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                      >
                        <option value="Personel">Personel</option>
                        <option value="Editor">Editor</option>
                        <option value="Yonetici">Yönetici</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={newUser.telefon}
                        onChange={(e) => setNewUser(prev => ({ ...prev, telefon: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="+90 352 123 45 67"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Departman
                      </label>
                      <input
                        type="text"
                        value={newUser.departman}
                        onChange={(e) => setNewUser(prev => ({ ...prev, departman: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="İnsan Kaynakları, IT, Muhasebe..."
                      />
                    </div>
                  </div>
                  
                  {/* Yetki Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Yetkiler
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availablePermissions.map((permission) => (
                        <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newUser.yetkiler.includes(permission)}
                            onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowNewUserForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Kullanıcı Ekle
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Kullanıcı Listesi */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Kullanıcı Listesi ({users.length} kullanıcı)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Kullanıcı</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">E-posta</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Rol</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Departman</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Durum</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Kayıt Tarihi</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {user.adi.charAt(0)}{user.soyadi.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.adi} {user.soyadi}</div>
                              {user.telefon && (
                                <div className="text-sm text-gray-500">{user.telefon}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600">{user.email}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.rol)}`}>
                            {user.rol}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600">{user.departman || '-'}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDurumBadge(user.durum)}`}>
                            {user.durum}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600">{user.kayitTarihi}</td>
                        <td className="py-4 px-6">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdateUserStatus(user.id, user.durum === 'Aktif' ? 'Pasif' : 'Aktif')}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                                user.durum === 'Aktif' 
                                  ? 'bg-red-100 hover:bg-red-200' 
                                  : 'bg-green-100 hover:bg-green-200'
                              }`}
                              title={user.durum === 'Aktif' ? 'Pasif Yap' : 'Aktif Yap'}
                            >
                              <i className={`${user.durum === 'Aktif' ? 'ri-pause-line text-red-600' : 'ri-play-line text-green-600'}`}></i>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-200 transition-colors"
                              title="Kullanıcıyı Sil"
                            >
                              <i className="ri-delete-bin-line text-red-600"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
