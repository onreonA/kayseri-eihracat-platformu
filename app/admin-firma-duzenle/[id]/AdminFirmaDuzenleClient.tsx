
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminFirmaService } from '../../../lib/database';
import { supabase } from '../../../lib/supabase-services';

// ✅ SUPABASE-ONLY INTERFACE 
interface Firma {
  id: number;
  firmaAdi: string;
  yetkiliEmail: string;
  yetkiliTelefon: string;
  durum: 'Aktif' | 'Pasif';
  firmaProfilDurumu: 'Onay Bekliyor' | 'Onaylandı' | 'Reddedildi';
  kayitTarihi: string;
  adres?: string;
  sifre?: string;
  sektor?: string;
  yetkiliAdi?: string;
  vergiNumarasi?: string;
  guncellenmeTarihi?: string;
}

// Sidebar component
const AdminSidebar = ({ activeMenuItem, setActiveMenuItem }: { activeMenuItem: string; setActiveMenuItem: (item: string) => void }) => {
  const menuItems = [
    { name: 'Dashboard', icon: 'ri-dashboard-line', active: false, href: '/admin-dashboard' },
    { name: 'Firmalar', icon: 'ri-building-line', active: false, href: '/admin-firmalar' },
    { name: 'Proje Yönetimi', icon: 'ri-project-line', active: false, href: '/admin-proje-yonetimi' },
    { name: 'Randevu Talepleri', icon: 'ri-calendar-check-line', active: false, href: '/admin-randevu-talepleri' },
    { name: 'Eğitim Yönetimi', icon: 'ri-graduation-cap-line', active: false, href: '/admin-egitim-yonetimi' },
    { name: 'Etkinlik Yönetimi', icon: 'ri-calendar-event-line', active: false, href: '/admin-etkinlik-yonetimi' },
    { name: 'Dönem Yönetimi', icon: 'ri-bar-chart-line', active: false, href: '/admin-donem-yonetimi' },
    { name: 'Forum Yönetimi', icon: 'ri-discuss-line', active: false, href: '/admin-forum-yonetimi' },
    { name: 'Platform Geri Bildirimleri', icon: 'ri-feedback-line', active: false, href: '/admin-geri-bildirimler' },
    { name: 'Destek Dokümanları', icon: 'ri-file-text-line', active: false, href: '/admin-destek-dokumanlari' },
    { name: 'Kullanıcılar (Personel)', icon: 'ri-team-line', active: false, href: '/admin-kullanici-yonetimi' },
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

// ✅ SUPABASE-ONLY FIRMA EDIT MANAGER
class SupabaseFirmaEditManager {
  // Supabase'den firma yükle
  static async loadFirmaForEdit(firmaId: string): Promise<Firma | null> {
    try {
      console.log('✅ Supabase\'den firma yükleniyor ID:', firmaId);

      const targetId = parseInt(firmaId);
      if (isNaN(targetId)) {
        console.error('❌ Geçersiz ID formatı:', firmaId);
        return null;
      }

      // Supabase'den firma getir
      const { data: firma, error } = await supabase
        .from('firmalar')
        .select('*')
        .eq('id', targetId)
        .single();

      if (error) {
        console.error('❌ Supabase firma yükleme hatası:', error);
        return null;
      }

      if (!firma) {
        console.error('❌ Firma bulunamadı ID:', targetId);
        return null;
      }

      console.log('✅ Firma Supabase\'den başarıyla yüklendi:', firma);

      // Frontend format'ına çevir
      return {
        id: firma.id,
        firmaAdi: firma.firma_adi || '',
        yetkiliEmail: firma.yetkili_email || '',
        yetkiliTelefon: firma.telefon || '',
        durum: firma.durum || 'Aktif',
        firmaProfilDurumu: firma.firma_profil_durumu || 'Onay Bekliyor',
        kayitTarihi: firma.kayit_tarihi ? new Date(firma.kayit_tarihi).toISOString().split('T')[0] : '',
        adres: firma.adres || '',
        sifre: firma.sifre || '',
        sektor: firma.sektor || '',
        yetkiliAdi: firma.yetkili_adi || '',
        vergiNumarasi: firma.vergi_numarasi || '',
        guncellenmeTarihi: firma.guncelleme_tarihi || ''
      };

    } catch (error) {
      console.error('💥 Firma yükleme sistem hatası:', error);
      return null;
    }
  }

  // Supabase'de firma güncelle
  static async updateFirmaInSupabase(firmaId: string, updatedData: Partial<Firma>): Promise<boolean> {
    try {
      console.log('✅ Supabase\'de firma güncelleniyor ID:', firmaId);

      const targetId = parseInt(firmaId);
      if (isNaN(targetId)) {
        console.error('❌ Geçersiz ID formatı:', firmaId);
        return false;
      }

      // Supabase format'ına çevir
      const supabaseData: any = {
        firma_adi: updatedData.firmaAdi?.trim(),
        yetkili_adi: updatedData.yetkiliAdi?.trim(),
        yetkili_email: updatedData.yetkiliEmail?.trim().toLowerCase(),
        telefon: updatedData.yetkiliTelefon?.trim(),
        adres: updatedData.adres?.trim(),
        sektor: updatedData.sektor?.trim(),
        durum: updatedData.durum,
        firma_profil_durumu: updatedData.firmaProfilDurumu,
        guncelleme_tarihi: new Date().toISOString()
      };

      // Şifre varsa ekle
      if (updatedData.sifre) {
        supabaseData.sifre = updatedData.sifre.trim();
      }

      // Null/empty değerleri temizle
      Object.keys(supabaseData).forEach(key => {
        if (supabaseData[key] === null || supabaseData[key] === undefined || supabaseData[key] === '') {
          delete supabaseData[key];
        }
      });

      console.log('📝 Supabase güncelleme verisi:', supabaseData);

      // Supabase'de güncelle
      const { data, error } = await supabase
        .from('firmalar')
        .update(supabaseData)
        .eq('id', targetId)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase firma güncelleme hatası:', {
          message: error.message,
          details: error.details,
          code: error.code,
          hint: error.hint
        });

        // Kullanıcı dostu hata mesajları
        if (error.code === '23505') {
          throw new Error('Bu email adresi başka bir firma tarafından kullanılıyor!');
        } else if (error.code === '23514') {
          if (error.message.includes('durum')) {
            throw new Error('Firma durumu geçersiz! (Aktif/Pasif olmalı)');
          } else if (error.message.includes('firma_profil_durumu')) {
            throw new Error('Profil durumu geçersiz!');
          }
        } else if (error.code === '42501') {
          throw new Error('Yetki hatası! Admin hesabıyla giriş yaptığınızdan emin olun.');
        }

        throw new Error(`Güncelleme hatası: ${error.message}`);
      }

      if (!data) {
        console.error('❌ Güncelleme sonrası veri döndürülmedi');
        throw new Error('Güncelleme tamamlandı ancak veri doğrulanamadı');
      }

      console.log('✅ Firma Supabase\'de başarıyla güncellendi:', {
        id: data.id,
        firma_adi: data.firma_adi,
        yetkili_email: data.yetkili_email
      });

      return true;

    } catch (error) {
      console.error('💥 Firma güncelleme sistem hatası:', error);
      throw error;
    }
  }
}

// ✅ PROPS INTERFACE
interface AdminFirmaDuzenleClientProps {
  firmaId: string;
}

export default function AdminFirmaDuzenleClient({ firmaId }: AdminFirmaDuzenleClientProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('');
  const [activeMenuItem, setActiveMenuItem] = useState('Firmalar');
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [firma, setFirma] = useState<Firma | null>(null);
  const [formData, setFormData] = useState({
    firmaAdi: '',
    yetkiliEmail: '',
    yetkiliAdi: '',
    yetkiliTelefon: '',
    sektor: '',
    adres: '',
    durum: 'Aktif' as 'Aktif' | 'Pasif',
    firmaProfilDurumu: 'Onay Bekliyor' as 'Onay Bekliyor' | 'Onaylandı' | 'Reddedildi',
    yeniSifre: '',
    sifreOnay: ''
  });
  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem('isAdminLoggedIn');
    const email = localStorage.getItem('adminEmail');
    const role = localStorage.getItem('adminRole');

    if (!loggedIn || loggedIn !== 'true' || role !== 'Yonetici') {
      router.push('/admin-login');
      return;
    }

    setIsAdminLoggedIn(true);
    setAdminEmail(email || '');
    setAdminRole(role || '');

    if (!firmaId) {
      console.error('❌ ID parametresi bulunamadı:', firmaId);
      setFirma(null);
      setLoading(false);
      return;
    }

    console.log('📋 Firma düzenleme sayfası yükleniyor, ID:', firmaId);
    loadFirma();
  }, [firmaId, router]);

  const loadFirma = async () => {
    try {
      setLoading(true);

      if (!firmaId) {
        console.error('❌ ID parametresi bulunamadı');
        setFirma(null);
        return;
      }

      // ✅ Supabase'den firma yükle
      const firmaData = await SupabaseFirmaEditManager.loadFirmaForEdit(firmaId);

      if (!firmaData) {
        console.error('❌ Düzenlenecek firma bulunamadı');
        setFirma(null);
        return;
      }

      setFirma(firmaData);
      setFormData({
        firmaAdi: firmaData.firmaAdi,
        yetkiliEmail: firmaData.yetkiliEmail,
        yetkiliAdi: firmaData.yetkiliAdi || '',
        yetkiliTelefon: firmaData.yetkiliTelefon,
        sektor: firmaData.sektor || '',
        adres: firmaData.adres || '',
        durum: firmaData.durum,
        firmaProfilDurumu: firmaData.firmaProfilDurumu,
        yeniSifre: '',
        sifreOnay: ''
      });

      console.log('✅ Firma düzenleme için Supabase\'den yüklendi:', firmaData);
    } catch (error) {
      console.error('💥 Firma yükleme hatası:', error);
      setFirma(null);
      setMessage('🚫 Firma bilgileri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setUpdateLoading(true);

    // Validasyonlar
    if (formData.yeniSifre && formData.yeniSifre !== formData.sifreOnay) {
      setMessage('🚫 Şifreler eşleşmiyor!');
      setUpdateLoading(false);
      return;
    }

    if (!formData.firmaAdi.trim() || !formData.yetkiliEmail.trim()) {
      setMessage('🚫 Firma adı ve yetkili e-posta alanları zorunludur!');
      setUpdateLoading(false);
      return;
    }

    // ✅ Basit email validation
    const email = formData.yetkiliEmail.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) {
      setMessage('📧 Geçerli bir email adresi giriniz (örn: firma@example.com)');
      setUpdateLoading(false);
      return;
    }

    try {
      console.log('✅ Firma güncelleme başlatılıyor...');

      const updateData: Partial<Firma> = {
        firmaAdi: formData.firmaAdi.trim(),
        yetkiliEmail: email,
        yetkiliAdi: formData.yetkiliAdi.trim() || formData.firmaAdi.trim(),
        yetkiliTelefon: formData.yetkiliTelefon.trim(),
        sektor: formData.sektor.trim() || 'Genel',
        adres: formData.adres.trim(),
        durum: formData.durum,
        firmaProfilDurumu: formData.firmaProfilDurumu
      };

      // Şifre varsa ekle
      if (formData.yeniSifre) {
        updateData.sifre = formData.yeniSifre;
      }

      // ✅ Supabase'de güncelle
      const success = await SupabaseFirmaEditManager.updateFirmaInSupabase(firmaId, updateData);

      if (success) {
        // Başarı durumunda firma state'ini güncelle
        const updatedFirma = { ...firma!, ...updateData };
        setFirma(updatedFirma);

        setMessage('✅ Firma bilgileri başarıyla Supabase\'de güncellendi!');

        // Şifre alanlarını temizle
        setFormData(prev => ({ ...prev, yeniSifre: '', sifreOnay: '' }));

        // Başarı mesajını 5 saniye sonra temizle
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage('🚫 Güncelleme sırasında beklenmeyen bir hata oluştu.');
      }
    } catch (error) {
      console.error('💥 Güncelleme hatası:', error);

      let errorMessage = '🚫 Güncelleme sırasında bir hata oluştu.';
      if (error instanceof Error) {
        errorMessage = `🚫 ${error.message}`;
      }

      setMessage(errorMessage);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/admin-login');
  };

  if (!isAdminLoggedIn || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">{loading ? '🔄 Supabase\'den firma yükleniyor...' : 'Yükleniyor...'}</p>
        </div>
      </div>
    );
  }

  if (!firma) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
            <strong>❌ Hata:</strong> Firma bulunamadı (ID: {firmaId || 'Bilinmeyen'})
          </div>
          <p className="text-gray-600 mb-4">Düzenlenmek istenen firma Supabase'de mevcut değil veya silinmiş olabilir.</p>
          <Link href="/admin-firmalar" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap">
            Firma Listesine Dön
          </Link>
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
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-[\'Pacifico\']">
                logo
              </Link>
              <div className="flex items-center space-x-2 text-gray-600">
                <Link href="/admin-firmalar" className="hover:text-blue-600 cursor-pointer">
                  Firma Yönetimi
                </Link>
                <i className="ri-arrow-right-s-line"></i>
                <span>Firma Düzenle</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                {adminRole} - {adminEmail}
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
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">🔧 Firma Düzenle</h1>
                  <p className="text-gray-600 mt-2">{firma.firmaAdi} - Supabase Bilgileri Güncelle</p>
                  <p className="text-sm text-green-600 mt-1">🔄 Canlı Supabase Verisi - Firma ID: #{firma.id}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Link
                    href={`/admin-firma-detay/${firma.id}`}
                    className="text-blue-600 hover:text-blue-700 cursor-pointer flex items-center space-x-2"
                  >
                    <i className="ri-eye-line"></i>
                    <span>Detayları Görüntüle</span>
                  </Link>
                  <Link
                    href="/admin-firmalar"
                    className="text-gray-600 hover:text-gray-700 cursor-pointer flex items-center space-x-2"
                  >
                    <i className="ri-arrow-left-line"></i>
                    <span>Geri Dön</span>
                  </Link>
                </div>
              </div>

              {message && (
                <div className={`mb-6 p-4 rounded-lg ${
                  message.includes('✅') || message.includes('başarıyla')
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${
                    message.includes('✅') || message.includes('başarıyla')
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {message}
                  </p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Temel Bilgiler */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Temel Bilgiler</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Firma Adı *
                      </label>
                      <input
                        type="text"
                        value={formData.firmaAdi}
                        onChange={(e) => setFormData(prev => ({ ...prev, firmaAdi: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Firma adını giriniz"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yetkili E-posta *
                      </label>
                      <input
                        type="email"
                        value={formData.yetkiliEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, yetkiliEmail: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="yetkili@firma.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yetkili Adı
                      </label>
                      <input
                        type="text"
                        value={formData.yetkiliAdi}
                        onChange={(e) => setFormData(prev => ({ ...prev, yetkiliAdi: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Yetkili adı ve soyadı"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yetkili Telefon
                      </label>
                      <input
                        type="tel"
                        value={formData.yetkiliTelefon}
                        onChange={(e) => setFormData(prev => ({ ...prev, yetkiliTelefon: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="+90 555 123 4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sektör
                      </label>
                      <input
                        type="text"
                        value={formData.sektor}
                        onChange={(e) => setFormData(prev => ({ ...prev, sektor: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Sektör"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adres
                      </label>
                      <textarea
                        value={formData.adres}
                        onChange={(e) => setFormData(prev => ({ ...prev, adres: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Firma adresini giriniz"
                      />
                    </div>
                  </div>
                </div>

                {/* Durum Bilgileri */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Durum Bilgileri</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Firma Durumu
                      </label>
                      <select
                        value={formData.durum}
                        onChange={(e) => setFormData(prev => ({ ...prev, durum: e.target.value as 'Aktif' | 'Pasif' }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Pasif">Pasif</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profil Durumu
                      </label>
                      <select
                        value={formData.firmaProfilDurumu}
                        onChange={(e) => setFormData(prev => ({ ...prev, firmaProfilDurumu: e.target.value as 'Onay Bekliyor' | 'Onaylandı' | 'Reddedildi' }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                      >
                        <option value="Onay Bekliyor">Onay Bekliyor</option>
                        <option value="Onaylandı">Onaylandı</option>
                        <option value="Reddedildi">Reddedildi</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Şifre Güncelleme */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🔒 Şifre Güncelleme</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Yeni Şifre
                      </label>
                      <input
                        type="password"
                        value={formData.yeniSifre}
                        onChange={(e) => setFormData(prev => ({ ...prev, yeniSifre: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Yeni şifre (boş bırakılabilir)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Şifre Onay
                      </label>
                      <input
                        type="password"
                        value={formData.sifreOnay}
                        onChange={(e) => setFormData(prev => ({ ...prev, sifreOnay: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Şifre onay"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    💡 Şifre değiştirmek istemiyorsanız bu alanları boş bırakabilirsiniz.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4">
                  <Link
                    href="/admin-firmalar"
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    İptal
                  </Link>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-2 ${updateLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {updateLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Supabase'de Güncelleniyor...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-database-2-line"></i>
                        <span>Supabase'de Güncelle</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
