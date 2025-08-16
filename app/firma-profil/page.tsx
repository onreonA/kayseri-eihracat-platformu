
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ModernLayout from '../../components/Layout/ModernLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { LoginSyncService } from '../../lib/database';
import { supabase } from '../../lib/supabase-services';

interface FirmaProfileData {
  FirmaAdı: string;
  YetkiliEmail: string;
  VergiNumarası: string;
  YetkiliTelefon: string;
  Adres: string;
  TicariBilgiler: string;
  İhracatTecrubesi: string;
  ÜrünHizmetBilgileri: string;
  DijitalVarlıklar: string;
  FirmaProfilDurumu: string;
}

class SupabaseFirmaProfilService {
  static async getFirmaProfilByEmail(email: string): Promise<FirmaProfileData | null> {
    try {
      console.log('Supabase\'den firma profil verisi yükleniyor:', email);

      if (!email || !email.includes('@')) {
        console.error('Geçersiz email formatı:', email);
        return null;
      }

      const { data: firma, error } = await supabase
        .from('firmalar')
        .select('*')
        .eq('yetkili_email', email.toLowerCase())
        .single();

      if (error) {
        console.error('Supabase firma profil sorgu hatası:', error);
        return null;
      }

      if (!firma) {
        console.error('Email için firma bulunamadı:', email);
        return null;
      }

      console.log('Firma profil Supabase\'den başarıyla yüklendi:', {
        id: firma.id,
        firma_adi: firma.firma_adi,
        yetkili_email: firma.yetkili_email,
      });

      return {
        FirmaAdı: firma.firma_adi || '',
        YetkiliEmail: firma.yetkili_email || email,
        VergiNumarası: firma.vergi_numarasi || '',
        YetkiliTelefon: firma.telefon || '',
        Adres: firma.adres || '',
        TicariBilgiler: firma.ticari_bilgiler || '',
        İhracatTecrubesi: firma.ihracat_tecrubesi || '',
        ÜrünHizmetBilgileri: firma.urun_hizmet_bilgileri || '',
        DijitalVarlıklar: firma.dijital_varliklar || '',
        FirmaProfilDurumu: firma.firma_profil_durumu || 'Eksik',
      };
    } catch (error) {
      console.error('Firma profil yükleme sistem hatası:', error);
      return null;
    }
  }

  static async updateGenelBilgiler(email: string, data: Partial<FirmaProfileData>): Promise<boolean> {
    try {
      console.log('Supabase\'de genel bilgiler güncelleniyor:', email);

      const supabaseData: any = {
        firma_adi: data.FirmaAdı?.trim(),
        yetkili_email: data.YetkiliEmail?.trim().toLowerCase(),
        vergi_numarasi: data.VergiNumarası?.trim(),
        telefon: data.YetkiliTelefon?.trim(),
        adres: data.Adres?.trim(),
        guncelleme_tarihi: new Date().toISOString(),
      };

      Object.keys(supabaseData).forEach((key) => {
        if (supabaseData[key] === null || supabaseData[key] === undefined || supabaseData[key] === '') {
          delete supabaseData[key];
        }
      });

      const { error } = await supabase
        .from('firmalar')
        .update(supabaseData)
        .eq('yetkili_email', email.toLowerCase());

      if (error) {
        console.error('Genel bilgiler güncelleme hatası:', error);
        return false;
      }

      console.log('Genel bilgiler başarıyla güncellendi');
      return true;
    } catch (error) {
      console.error('Genel bilgiler güncelleme sistem hatası:', error);
      return false;
    }
  }

  static async updateTicariBilgiler(email: string, ticariBilgiler: string): Promise<boolean> {
    try {
      console.log('Supabase\'de ticari bilgiler güncelleniyor:', email);

      const { error } = await supabase
        .from('firmalar')
        .update({
          ticari_bilgiler: ticariBilgiler.trim(),
          guncelleme_tarihi: new Date().toISOString(),
        })
        .eq('yetkili_email', email.toLowerCase());

      if (error) {
        console.error('Ticari bilgiler güncelleme hatası:', error);
        return false;
      }

      console.log('Ticari bilgiler başarıyla güncellendi');
      return true;
    } catch (error) {
      console.error('Ticari bilgiler güncelleme sistem hatası:', error);
      return false;
    }
  }

  static async updateIhracatTecrubesi(email: string, ihracatTecrubesi: string): Promise<boolean> {
    try {
      console.log('Supabase\'de ihracat tecrübesi güncelleniyor:', email);

      const { error } = await supabase
        .from('firmalar')
        .update({
          ihracat_tecrubesi: ihracatTecrubesi.trim(),
          guncelleme_tarihi: new Date().toISOString(),
        })
        .eq('yetkili_email', email.toLowerCase());

      if (error) {
        console.error('İhracat tecrübesi güncelleme hatası:', error);
        return false;
      }

      console.log('İhracat tecrübesi başarıyla güncellendi');
      return true;
    } catch (error) {
      console.error('İhracat tecrübesi güncelleme sistem hatası:', error);
      return false;
    }
  }

  static async updateUrunHizmetBilgileri(email: string, urunHizmetBilgileri: string): Promise<boolean> {
    try {
      console.log('Supabase\'de ürün/hizmet bilgileri güncelleniyor:', email);

      const { error } = await supabase
        .from('firmalar')
        .update({
          urun_hizmet_bilgileri: urunHizmetBilgileri.trim(),
          guncelleme_tarihi: new Date().toISOString(),
        })
        .eq('yetkili_email', email.toLowerCase());

      if (error) {
        console.error('Ürün/hizmet bilgileri güncelleme hatası:', error);
        return false;
      }

      console.log('Ürün/hizmet bilgileri başarıyla güncellendi');
      return true;
    } catch (error) {
      console.error('Ürün/hizmet bilgileri güncelleme sistem hatası:', error);
      return false;
    }
  }

  static async updateDijitalVarliklar(email: string, dijitalVarliklar: string): Promise<boolean> {
    try {
      console.log('Supabase\'de dijital varlıklar güncelleniyor:', email);

      const { error } = await supabase
        .from('firmalar')
        .update({
          dijital_varliklar: dijitalVarliklar.trim(),
          guncelleme_tarihi: new Date().toISOString(),
        })
        .eq('yetkili_email', email.toLowerCase());

      if (error) {
        console.error('Dijital varlıklar güncelleme hatası:', error);
        return false;
      }

      console.log('Dijital varlıklar başarıyla güncellendi');
      return true;
    } catch (error) {
      console.error('Dijital varlıklar güncelleme sistem hatası:', error);
      return false;
    }
  }

  static async updateFirmaProfilInSupabase(email: string, profileData: FirmaProfileData, uploadedFiles: any): Promise<boolean> {
    try {
      console.log('Supabase\'de firma profil güncelleniyor:', email);

      if (!email || !email.includes('@')) {
        console.error('Geçersiz email formatı:', email);
        return false;
      }

      const supabaseData: any = {
        firma_adi: profileData.FirmaAdı?.trim() || null,
        yetkili_email: profileData.YetkiliEmail?.trim().toLowerCase() || email.toLowerCase(),
        telefon: profileData.YetkiliTelefon?.trim() || null,
        adres: profileData.Adres?.trim() || null,
        guncelleme_tarihi: new Date().toISOString(),
      };

      try {
        if (profileData.VergiNumarası) {
          supabaseData.vergi_numarasi = profileData.VergiNumarası.trim();
        }
        if (profileData.TicariBilgiler) {
          supabaseData.ticari_bilgiler = profileData.TicariBilgiler.trim();
        }
        if (profileData.İhracatTecrubesi) {
          supabaseData.ihracat_tecrubesi = profileData.İhracatTecrubesi.trim();
        }
        if (profileData.ÜrünHizmetBilgileri) {
          supabaseData.urun_hizmet_bilgileri = profileData.ÜrünHizmetBilgileri.trim();
        }
        if (profileData.DijitalVarlıklar) {
          supabaseData.dijital_varliklar = profileData.DijitalVarlıklar.trim();
        }

        supabaseData.firma_profil_durumu = 'Onay Bekliyor';
      } catch (dataError) {
        console.warn('Veri hazırlama uyarısı:', dataError);
      }

      const { data, error } = await supabase
        .from('firmalar')
        .update(supabaseData)
        .eq('yetkili_email', email.toLowerCase())
        .select()
        .single();

      if (error) {
        console.error('Supabase firma profil güncelleme detaylı hatası:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          sentData: Object.keys(supabaseData),
        });

        let userFriendlyError = 'Profil güncelleme hatası';

        if (error.code === '42703') {
          userFriendlyError = 'Veritabanı şema hatası - sistem yöneticisine bildirildi';
          console.error('SCHEMA ERROR: Sütun bulunamadı hatası:', error.message);
        } else if (error.code === '23505') {
          userFriendlyError = 'Bu email adresi zaten başka bir firma tarafından kullanılıyor';
        } else if (error.code === '23502') {
          userFriendlyError = 'Zorunlu alanlar eksik - firma adı ve email gerekli';
        } else {
          userFriendlyError = `Güncelleme hatası: ${error.message}`;
        }

        throw new Error(userFriendlyError);
      }

      if (!data) {
        console.error('Supabase\'den veri döndürülmedi');
        return false;
      }

      console.log('Firma profil Supabase\'de başarıyla güncellendi:', {
        id: data.id,
        firma_adi: data.firma_adi,
        yetkili_email: data.yetkili_email,
        guncelleme_tarihi: data.guncelleme_tarihi,
      });

      return true;
    } catch (error) {
      console.error('Firma profil güncelleme sistem hatası:', error);
      throw error;
    }
  }
}

export default function FirmaProfilPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [firmaAdi, setFirmaAdi] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('genel');
  const [currentFirmaId, setCurrentFirmaId] = useState<number | null>(null);

  const [tabSaving, setTabSaving] = useState({
    genel: false,
    ticari: false,
    ihracat: false,
    urun: false,
    dijital: false,
    belgeler: false,
  });

  const [authChecking, setAuthChecking] = useState(true);
  const [authAttempts, setAuthAttempts] = useState(0);
  const MAX_AUTH_ATTEMPTS = 3;

  const router = useRouter();

  const [profileData, setProfileData] = useState<FirmaProfileData>({
    FirmaAdı: '',
    YetkiliEmail: '',
    VergiNumarası: '',
    YetkiliTelefon: '',
    Adres: '',
    TicariBilgiler: '',
    İhracatTecrubesi: '',
    ÜrünHizmetBilgileri: '',
    DijitalVarlıklar: '',
    FirmaProfilDurumu: 'Eksik',
  });

  const [uploadedFiles, setUploadedFiles] = useState<{
    [key: string]: File[];
  }>({
    vergiLevhasi: [],
    faaliyetBelgesi: [],
    urunKatalogu: [],
    imzaSirkuleri: [],
    ticaretSicil: [],
    diger: [],
  });

  // Anti-loop auth kontrolü
  useEffect(() => {
    let authTimeout: NodeJS.Timeout;

    const performAuthCheck = async () => {
      try {
        console.log(`Auth kontrol başlatılıyor - deneme: ${authAttempts + 1}/${MAX_AUTH_ATTEMPTS}`);
        
        setAuthChecking(true);
        await new Promise(resolve => setTimeout(resolve, 300));

        const loggedIn = localStorage.getItem('isLoggedIn');
        const email = localStorage.getItem('userEmail') || localStorage.getItem('firmaEmail');

        console.log('Login kontrol:', { loggedIn, email });

        if (!loggedIn || loggedIn !== 'true') {
          console.log('Kullanıcı giriş yapmamış, login sayfasına yönlendiriliyor');
          router.push('/login');
          return;
        }

        if (!email || !email.includes('@')) {
          console.log('Geçersiz email, login sayfasına yönlendiriliyor');
          router.push('/login');
          return;
        }

        setIsLoggedIn(true);
        setUserEmail(email);
        setAuthChecking(false);
        
        console.log('Auth kontrolü başarılı');
        loadProfileDataFromSupabase(email);

      } catch (error) {
        console.error('Auth kontrol hatası:', error);
        setAuthAttempts(prev => prev + 1);
        
        if (authAttempts < MAX_AUTH_ATTEMPTS - 1) {
          console.log(`Auth kontrol tekrar deneniyor... (${authAttempts + 2}/${MAX_AUTH_ATTEMPTS})`);
          authTimeout = setTimeout(performAuthCheck, 1000);
        } else {
          console.error('Maksimum auth kontrol denemesi aşıldı');
          setAuthChecking(false);
          router.push('/login');
        }
      }
    };

    performAuthCheck();

    return () => {
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
    };
  }, [router, authAttempts]);

  const loadProfileDataFromSupabase = async (email: string) => {
    try {
      setLoading(true);
      console.log('Supabase\'den profil verileri yükleniyor:', email);

      const firmaProfilData = await SupabaseFirmaProfilService.getFirmaProfilByEmail(email);

      if (firmaProfilData) {
        console.log('Supabase\'den profil verileri başarıyla yüklendi:', firmaProfilData);

        setProfileData(firmaProfilData);
        setFirmaAdi(firmaProfilData.FirmaAdı);
        setUserEmail(firmaProfilData.YetkiliEmail);

        localStorage.setItem('userEmail', firmaProfilData.YetkiliEmail);
        localStorage.setItem('firmaAdi', firmaProfilData.FirmaAdı);
      } else {
        console.log('Supabase\'de firma profil bulunamadı, varsayılan değerler kullanılıyor');

        const defaultProfileData: FirmaProfileData = {
          FirmaAdı: '',
          YetkiliEmail: email,
          VergiNumarası: '',
          YetkiliTelefon: '',
          Adres: '',
          TicariBilgiler: '',
          İhracatTecrubesi: '',
          ÜrünHizmetBilgileri: '',
          DijitalVarlıklar: '',
          FirmaProfilDurumu: 'Eksik',
        };

        setProfileData(defaultProfileData);
        setFirmaAdi('Yeni Firma');

        setMessage('Firma profil bilgileriniz bulunamadı. Lütfen bilgilerinizi doldurun ve kaydedin.');
      }
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
      setMessage('Profil bilgileri yüklenirken hata oluştu. Sayfayı yenileyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (category: string, files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setUploadedFiles((prev) => ({ ...prev, [category]: [...prev[category], ...fileArray] }));
    }
  };

  const removeFile = (category: string, index: number) => {
    setUploadedFiles((prev) => ({ ...prev, [category]: prev[category].filter((_, i) => i !== index) }));
  };

  const handleSaveGenelBilgiler = async () => {
    setTabSaving((prev) => ({ ...prev, genel: true }));
    setMessage('');

    try {
      if (!profileData.FirmaAdı.trim() || !profileData.YetkiliEmail.trim()) {
        setMessage('Firma adı ve yetkili e-posta alanları zorunludur!');
        return;
      }

      const email = profileData.YetkiliEmail.trim().toLowerCase();
      if (!email.includes('@') || !email.includes('.')) {
        setMessage('Geçerli bir email adresi giriniz (örn: firma@example.com)');
        return;
      }

      const success = await SupabaseFirmaProfilService.updateGenelBilgiler(userEmail, profileData);

      if (success) {
        setMessage('Genel bilgiler başarıyla kaydedildi!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Genel bilgiler kaydedilirken hata oluştu.');
      }
    } catch (error) {
      console.error('Genel bilgiler kaydetme hatası:', error);
      setMessage('Genel bilgiler kaydedilirken sistem hatası oluştu.');
    } finally {
      setTabSaving((prev) => ({ ...prev, genel: false }));
    }
  };

  const handleSaveTicariBilgiler = async () => {
    setTabSaving((prev) => ({ ...prev, ticari: true }));
    setMessage('');

    try {
      if (!profileData.TicariBilgiler.trim()) {
        setMessage('Ticari bilgiler alanı boş olamaz!');
        return;
      }

      const success = await SupabaseFirmaProfilService.updateTicariBilgiler(userEmail, profileData.TicariBilgiler);

      if (success) {
        setMessage('Ticari bilgiler başarıyla kaydedildi!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Ticari bilgiler kaydedilirken hata oluştu.');
      }
    } catch (error) {
      console.error('Ticari bilgiler kaydetme hatası:', error);
      setMessage('Ticari bilgiler kaydedilirken sistem hatası oluştu.');
    } finally {
      setTabSaving((prev) => ({ ...prev, ticari: false }));
    }
  };

  const handleSaveIhracatTecrubesi = async () => {
    setTabSaving((prev) => ({ ...prev, ihracat: true }));
    setMessage('');

    try {
      if (!profileData.İhracatTecrubesi.trim()) {
        setMessage('İhracat tecrübesi alanı boş olamaz!');
        return;
      }

      const success = await SupabaseFirmaProfilService.updateIhracatTecrubesi(userEmail, profileData.İhracatTecrubesi);

      if (success) {
        setMessage('İhracat tecrübesi başarıyla kaydedildi!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('İhracat tecrübesi kaydedilirken hata oluştu.');
      }
    } catch (error) {
      console.error('İhracat tecrübesi kaydetme hatası:', error);
      setMessage('İhracat tecrübesi kaydedilirken sistem hatası oluştu.');
    } finally {
      setTabSaving((prev) => ({ ...prev, ihracat: false }));
    }
  };

  const handleSaveUrunHizmet = async () => {
    setTabSaving((prev) => ({ ...prev, urun: true }));
    setMessage('');

    try {
      if (!profileData.ÜrünHizmetBilgileri.trim()) {
        setMessage('Ürün/Hizmet bilgileri alanı boş olamaz!');
        return;
      }

      const success = await SupabaseFirmaProfilService.updateUrunHizmetBilgileri(userEmail, profileData.ÜrünHizmetBilgileri);

      if (success) {
        setMessage('Ürün/Hizmet bilgileri başarıyla kaydedildi!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Ürün/Hizmet bilgileri kaydedilirken hata oluştu.');
      }
    } catch (error) {
      console.error('Ürün/Hizmet bilgileri kaydetme hatası:', error);
      setMessage('Ürün/Hizmet bilgileri kaydedilirken sistem hatası oluştu.');
    } finally {
      setTabSaving((prev) => ({ ...prev, urun: false }));
    }
  };

  const handleSaveDijitalVarliklar = async () => {
    setTabSaving((prev) => ({ ...prev, dijital: true }));
    setMessage('');

    try {
      if (!profileData.DijitalVarlıklar.trim()) {
        setMessage('Dijital varlıklar alanı boş olamaz!');
        return;
      }

      const success = await SupabaseFirmaProfilService.updateDijitalVarliklar(userEmail, profileData.DijitalVarlıklar);

      if (success) {
        setMessage('Dijital varlıklar başarıyla kaydedildi!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Dijital varlıklar kaydedilirken hata oluştu.');
      }
    } catch (error) {
      console.error('Dijital varlıklar kaydetme hatası:', error);
      setMessage('Dijital varlıklar kaydedilirken sistem hatası oluştu.');
    } finally {
      setTabSaving((prev) => ({ ...prev, dijital: false }));
    }
  };

  const handleSaveBelgeler = async () => {
    setTabSaving((prev) => ({ ...prev, belgeler: true }));
    setMessage('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage('Belgeler başarıyla kaydedildi! (Özellik geliştirme aşamasında)');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Belgeler kaydetme hatası:', error);
      setMessage('Belgeler kaydedilirken hata oluştu.');
    } finally {
      setTabSaving((prev) => ({ ...prev, belgeler: false }));
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');

    try {
      if (!profileData.FirmaAdı.trim() || !profileData.YetkiliEmail.trim()) {
        setMessage('Firma adı ve yetkili e-posta alanları zorunludur!');
        setSaving(false);
        return;
      }

      const email = profileData.YetkiliEmail.trim().toLowerCase();
      if (!email.includes('@') || !email.includes('.')) {
        setMessage('Geçerli bir email adresi giriniz (örn: firma@example.com)');
        setSaving(false);
        return;
      }

      console.log('Firma profil kaydediliyor...');

      const success = await SupabaseFirmaProfilService.updateFirmaProfilInSupabase(userEmail, profileData, uploadedFiles);

      if (success) {
        setMessage('Profil başarıyla kaydedildi! Onay için sistem yöneticisine iletildi.');
        setProfileData((prev) => ({ ...prev, FirmaProfilDurumu: 'Onay Bekliyor' }));

        if (profileData.YetkiliEmail !== userEmail) {
          localStorage.setItem('userEmail', profileData.YetkiliEmail);
          localStorage.setItem('firmaEmail', profileData.YetkiliEmail);
          setUserEmail(profileData.YetkiliEmail);
        }

        if (profileData.FirmaAdı !== firmaAdi) {
          localStorage.setItem('firmaAdi', profileData.FirmaAdı);
          setFirmaAdi(profileData.FirmaAdı);
        }

        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage('Profil kaydedilirken beklenmeyen bir hata oluştu.');
      }
    } catch (error) {
      console.error('Profil kaydetme hatası:', error);

      let errorMessage = 'Profil kaydedilirken bir hata oluştu.';

      if (error instanceof Error) {
        errorMessage = ` ${error.message}`;
      }

      setMessage(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Auth loading durumu
  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">
            {authChecking ? 'Güvenlik kontrolü yapılıyor...' : 'Profil bilgileriniz yükleniyor...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ModernLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-100 mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Firma Profilim</h1>
                <p className="text-gray-600 mt-2">Firma bilgilerinizi güncelleyin ve belgelerinizi yükleyin</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Profil Durumu</div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      profileData.FirmaProfilDurumu === 'Onaylandı'
                        ? 'bg-green-100 text-green-800'
                        : profileData.FirmaProfilDurumu === 'Onay Bekliyor'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      profileData.FirmaProfilDurumu === 'Onaylandı'
                        ? 'bg-green-500'
                        : profileData.FirmaProfilDurumu === 'Onay Bekliyor'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}></div>
                    {profileData.FirmaProfilDurumu}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Çevrimiçi</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl border-l-4 ${
                message.includes('başarıyla')
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-red-50 border-red-500 text-red-700'
              }`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <i className={`ri-${message.includes('başarıyla') ? 'check' : 'error-warning'}-line text-xl`}></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 bg-gray-50 px-8 py-4">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('genel')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'genel'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <i className="ri-user-line"></i>
                    <span>Genel Bilgiler</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('ticari')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'ticari'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <i className="ri-briefcase-line"></i>
                    <span>Ticari Bilgiler</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('ihracat')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'ihracat'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <i className="ri-global-line"></i>
                    <span>İhracat Tecrübesi</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('urun')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'urun'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <i className="ri-shopping-bag-line"></i>
                    <span>Ürün/Hizmet</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('dijital')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'dijital'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <i className="ri-computer-line"></i>
                    <span>Dijital Varlıklar</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('belgeler')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'belgeler'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <i className="ri-file-text-line"></i>
                    <span>Belgeler</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === 'genel' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Temel Firma Bilgileri</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Firma Adı *
                        </label>
                        <input
                          type="text"
                          value={profileData.FirmaAdı}
                          onChange={(e) => handleInputChange('FirmaAdı', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                          placeholder="Firma adınızı giriniz"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Yetkili E-posta *
                        </label>
                        <input
                          type="email"
                          value={profileData.YetkiliEmail}
                          onChange={(e) => handleInputChange('YetkiliEmail', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                          placeholder="yetkili@firma.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vergi Numarası
                        </label>
                        <input
                          type="text"
                          value={profileData.VergiNumarası}
                          onChange={(e) => handleInputChange('VergiNumarası', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                          placeholder="Vergi numaranızı giriniz"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Yetkili Telefon
                        </label>
                        <input
                          type="tel"
                          value={profileData.YetkiliTelefon}
                          onChange={(e) => handleInputChange('YetkiliTelefon', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                          placeholder="+90 352 123 45 67"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Firma Adresi
                        </label>
                        <textarea
                          value={profileData.Adres}
                          onChange={(e) => handleInputChange('Adres', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                          placeholder="Firma adresinizi detaylı olarak giriniz"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end mt-8">
                      <button
                        onClick={handleSaveGenelBilgiler}
                        disabled={tabSaving.genel}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                      >
                        {tabSaving.genel ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Kaydediliyor...</span>
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line"></i>
                            <span>Genel Bilgileri Kaydet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ticari' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Ticari Faaliyet Bilgileri</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ticari Bilgiler
                      </label>
                      <textarea
                        value={profileData.TicariBilgiler}
                        onChange={(e) => handleInputChange('TicariBilgiler', e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                        placeholder="Firmanızın faaliyet alanı, kuruluş yılı, çalışan sayısı, ciro bilgileri vb. ticari bilgilerinizi detaylı olarak açıklayınız..."
                        maxLength={500}
                      />
                      <div className="text-right text-sm text-gray-500 mt-2">
                        {profileData.TicariBilgiler.length}/500 karakter
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveTicariBilgiler}
                        disabled={tabSaving.ticari}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                      >
                        {tabSaving.ticari ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Kaydediliyor...</span>
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line"></i>
                            <span>Ticari Bilgileri Kaydet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ihracat' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">İhracat Geçmişi ve Deneyim</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İhracat Tecrübesi
                      </label>
                      <textarea
                        value={profileData.İhracatTecrubesi}
                        onChange={(e) => handleInputChange('İhracatTecrubesi', e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                        placeholder="İhracat geçmişiniz, ihracat yaptığınız ülkeler, ürün grupları, karşılaştığınız zorluklar ve başarı hikayeleri..."
                        maxLength={500}
                      />
                      <div className="text-right text-sm text-gray-500 mt-2">
                        {profileData.İhracatTecrubesi.length}/500 karakter
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveIhracatTecrubesi}
                        disabled={tabSaving.ihracat}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                      >
                        {tabSaving.ihracat ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Kaydediliyor...</span>
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line"></i>
                            <span>İhracat Tecrübesi Kaydet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'urun' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Ürün ve Hizmet Portföyü</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ürün/Hizmet Bilgileri
                      </label>
                      <textarea
                        value={profileData.ÜrünHizmetBilgileri}
                        onChange={(e) => handleInputChange('ÜrünHizmetBilgileri', e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                        placeholder="Ürettiğiniz ürünler, sunduğunuz hizmetler, kalite standartlarınız, sertifikalarınız, üretim kapasitesi..."
                        maxLength={500}
                      />
                      <div className="text-right text-sm text-gray-500 mt-2">
                        {profileData.ÜrünHizmetBilgileri.length}/500 karakter
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveUrunHizmet}
                        disabled={tabSaving.urun}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                      >
                        {tabSaving.urun ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Kaydediliyor...</span>
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line"></i>
                            <span>Ürün/Hizmet Kaydet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dijital' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Dijital Altyapı ve Varlıklar</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dijital Varlıklar
                      </label>
                      <textarea
                        value={profileData.DijitalVarlıklar}
                        onChange={(e) => handleInputChange('DijitalVarlıklar', e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                        placeholder="Web siteniz, sosyal medya hesaplarınız, e-ticaret platformlarınız, dijital pazarlama faaliyetleriniz..."
                        maxLength={500}
                      />
                      <div className="text-right text-sm text-gray-500 mt-2">
                        {profileData.DijitalVarlıklar.length}/500 karakter
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveDijitalVarliklar}
                        disabled={tabSaving.dijital}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                      >
                        {tabSaving.dijital ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Kaydediliyor...</span>
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line"></i>
                            <span>Dijital Varlıklar Kaydet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'belgeler' && (
                <div className="space-y-8">
                  <h3 className="text-lg font-semibold text-gray-900">Gerekli Belgeler</h3>
                  
                  {/* Belge kategorileri */}
                  {[
                    { key: 'vergiLevhasi', title: 'Vergi Levhası', icon: 'ri-file-text-line' },
                    { key: 'faaliyetBelgesi', title: 'Faaliyet Belgesi', icon: 'ri-file-shield-line' },
                    { key: 'urunKatalogu', title: 'Ürün Kataloğu', icon: 'ri-book-line' },
                    { key: 'imzaSirkuleri', title: 'İmza Sirküleri', icon: 'ri-quill-pen-line' },
                    { key: 'ticaretSicil', title: 'Ticaret Sicil Gazetesi', icon: 'ri-newspaper-line' },
                    { key: 'diger', title: 'Diğer Belgeler', icon: 'ri-folder-line' }
                  ].map((category) => (
                    <div key={category.key} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <i className={`${category.icon} text-blue-600`}></i>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">{category.title}</h4>
                      </div>
                      <div className="space-y-4">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(category.key, e.target.files)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {uploadedFiles[category.key].map((file, index) => (
                          <div key={`${category.key}-${index}`} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-3">
                              <i className="ri-file-line text-gray-500"></i>
                              <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                              <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button
                              onClick={() => removeFile(category.key, index)}
                              className="text-red-600 hover:text-red-700 cursor-pointer p-1 rounded hover:bg-red-50 transition-colors"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveBelgeler}
                      disabled={tabSaving.belgeler}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                    >
                      {tabSaving.belgeler ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>Kaydediliyor...</span>
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line"></i>
                          <span>Belgeleri Kaydet</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ana Kaydet Butonu */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    Tüm değişiklikleri kaydetmek için "Profili Kaydet" butonunu kullanın
                  </p>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-12 py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer flex items-center space-x-3 shadow-lg"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Profil Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-database-2-line text-xl"></i>
                      <span>PROFİLİ KAYDET</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}
