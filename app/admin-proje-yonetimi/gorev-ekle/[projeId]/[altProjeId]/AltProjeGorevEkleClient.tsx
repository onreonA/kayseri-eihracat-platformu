
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Supabase direkt client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AltProjeGorevEkleClientProps {
  projeId: string;
  altProjeId: string;
}

export default function AltProjeGorevEkleClient({ projeId, altProjeId }: AltProjeGorevEkleClientProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [proje, setProje] = useState<any>(null);
  const [altProje, setAltProje] = useState<any>(null);
  const [firmalar, setFirmalar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [formData, setFormData] = useState({
    gorevAdi: '',
    aciklama: '',
    yuzdeKatki: 10,
    siraNo: 1,
    baslangicTarihi: '',
    bitisTarihi: '',
    atananFirmalar: [] as number[],
    durum: 'Aktif',
    oncelik: 'Orta'
  });
  const [mevcutGorevler, setMevcutGorevler] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkAdminAuth();
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted && isAdminLoggedIn && projeId && altProjeId) {
      loadData();
    }
  }, [mounted, isAdminLoggedIn, projeId, altProjeId]);

  const checkAdminAuth = () => {
    try {
      if (typeof window === 'undefined') return;

      const loggedIn = localStorage.getItem('isAdminLoggedIn');
      const email = localStorage.getItem('adminEmail');
      const role = localStorage.getItem('adminRole');

      if (!loggedIn || loggedIn !== 'true' || role !== 'Yonetici') {
        router.push('/admin-login');
        return;
      }

      setIsAdminLoggedIn(true);
      setAdminEmail(email || '');
    } catch (error) {
      console.error('Admin yetki kontrolü hatası:', error);
      setError('Yetki kontrolünde hata oluştu');
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      console.log('🔄 Alt proje görev ekleme verileri yükleniyor...');
      setLoading(true);
      setError(null);

      const numericProjeId = parseInt(projeId);
      const numericAltProjeId = parseInt(altProjeId);

      if (isNaN(numericProjeId) || isNaN(numericAltProjeId)) {
        throw new Error('Geçersiz proje veya alt proje ID');
      }

      // 1. Ana proje detayı - Supabase'den direkt
      console.log('📋 Ana proje yükleniyor...');
      const { data: projeData, error: projeError } = await supabase
        .from('projeler')
        .select('*')
        .eq('id', numericProjeId)
        .single();

      if (projeError || !projeData) {
        throw new Error(`Proje bulunamadı (ID: ${numericProjeId})`);
      }

      setProje({
        id: projeData.id,
        projeAdi: projeData.proje_adi,
        aciklama: projeData.aciklama,
        baslangicTarihi: projeData.baslangic_tarihi,
        bitisTarihi: projeData.bitis_tarihi,
        durum: projeData.durum
      });

      console.log('✅ Ana proje yüklendi:', projeData.proje_adi);

      // 2. Alt proje detayı - Supabase'den direkt
      console.log('📋 Alt proje yükleniyor...');
      const { data: altProjeData, error: altProjeError } = await supabase
        .from('alt_projeler')
        .select('*')
        .eq('id', numericAltProjeId)
        .eq('ana_proje_id', numericProjeId)
        .single();

      if (altProjeError || !altProjeData) {
        console.error('Alt proje bulunamadı:', { altProjeError, numericAltProjeId, numericProjeId });

        // Mevcut alt projeleri listele
        const { data: altProjelerList } = await supabase
          .from('alt_projeler')
          .select('id, alt_proje_adi, ana_proje_id')
          .eq('ana_proje_id', numericProjeId);

        console.log('Bu projenin mevcut alt projeleri:', altProjelerList);

        throw new Error(`Alt proje bulunamadı (ID: ${numericAltProjeId}). Bu projede mevcut alt projeler: ${altProjelerList?.map(ap => `${ap.id}-${ap.alt_proje_adi}`).join(', ') || 'Hiç alt proje yok'}`);
      }

      setAltProje({
        id: altProjeData.id,
        altProjeBasligi: altProjeData.alt_proje_adi,
        aciklama: altProjeData.aciklama,
        anaProjeId: altProjeData.ana_proje_id,
        durum: altProjeData.durum
      });

      console.log('✅ Alt proje yüklendi:', altProjeData.alt_proje_adi);

      // 3. Firmalar - Supabase'den direkt
      console.log('🏢 Firmalar yükleniyor...');
      const { data: firmaData, error: firmaError } = await supabase
        .from('firmalar')
        .select('*')
        .eq('durum', 'Aktif')
        .order('firma_adi');

      if (firmaError) {
        console.error('Firma yükleme hatası:', firmaError);
        setFirmalar([]);
        setSupabaseConnected(false);
      } else {
        const firmalarFormatted = (firmaData || []).map(firma => ({
          id: firma.id,
          firma_adi: firma.firma_adi,
          yetkili_email: firma.yetkili_email || 'E-posta belirtilmemiş',
          telefon: firma.telefon || 'Telefon belirtilmemiş',
          adres: firma.adres || 'Adres belirtilmemiş',
          durum: firma.durum,
          sektor: firma.sektor || 'Belirtilmemiş',
          kayit_tarihi: firma.created_at
        }));

        setFirmalar(firmalarFormatted);
        setSupabaseConnected(true);
        console.log('✅ Firmalar yüklendi:', firmalarFormatted.length);
      }

      // 4. Mevcut görevler - Supabase'den direkt
      console.log('📋 Mevcut görevler yükleniyor...');
      const { data: gorevData, error: gorevError } = await supabase
        .from('gorevler')
        .select('*')
        .eq('proje_id', numericProjeId)
        .eq('alt_proje_id', numericAltProjeId)
        .order('created_at', { ascending: false });

      if (gorevError) {
        console.warn('Görev yükleme hatası:', gorevError);
        setMevcutGorevler([]);
      } else {
        const gorevlerFormatted = (gorevData || []).map(gorev => ({
          ID: gorev.id,
          GorevBasligi: gorev.gorev_adi,
          Aciklama: gorev.aciklama,
          Durum: gorev.durum
        }));
        setMevcutGorevler(gorevlerFormatted);
        console.log('✅ Mevcut görevler yüklendi:', gorevlerFormatted.length);
      }

      // Form varsayılan değerleri
      setFormData(prev => ({
        ...prev,
        siraNo: (gorevData?.length || 0) + 1,
        baslangicTarihi: new Date().toISOString().split('T')[0],
        bitisTarihi: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));

      console.log('✅ Tüm veriler başarıyla yüklendi');
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setError(error instanceof Error ? error.message : 'Veri yükleme hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFirmaToggle = (firmaId: number) => {
    setFormData(prev => ({
      ...prev,
      atananFirmalar: prev.atananFirmalar.includes(firmaId)
        ? prev.atananFirmalar.filter(id => id !== firmaId)
        : [...prev.atananFirmalar, firmaId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setSubmitLoading(true);

    // Form validasyonları
    if (!formData.gorevAdi.trim()) {
      setMessage('❌ Görev adı zorunludur!');
      setSubmitLoading(false);
      return;
    }

    if (formData.gorevAdi.trim().length < 3) {
      setMessage('❌ Görev adı en az 3 karakter olmalıdır!');
      setSubmitLoading(false);
      return;
    }

    if (!formData.aciklama.trim()) {
      setMessage('❌ Görev açıklaması zorunludur!');
      setSubmitLoading(false);
      return;
    }

    if (formData.aciklama.trim().length < 10) {
      setMessage('❌ Görev açıklaması en az 10 karakter olmalıdır!');
      setSubmitLoading(false);
      return;
    }

    if (!formData.atananFirmalar || formData.atananFirmalar.length === 0) {
      setMessage('❌ En az bir firma atanmalıdır!');
      setSubmitLoading(false);
      return;
    }

    if (!formData.baslangicTarihi || !formData.bitisTarihi) {
      setMessage('❌ Başlangıç ve bitiş tarihleri zorunludur!');
      setSubmitLoading(false);
      return;
    }

    const baslangic = new Date(formData.baslangicTarihi);
    const bitis = new Date(formData.bitisTarihi);

    if (bitis <= baslangic) {
      setMessage('❌ Bitiş tarihi başlangıç tarihinden sonra olmalıdır!');
      setSubmitLoading(false);
      return;
    }

    try {
      console.log('💾 Görev oluşturma başlatılıyor...');

      // Duplicate kontrol
      const { data: existingTasks } = await supabase
        .from('gorevler')
        .select('gorev_adi')
        .eq('proje_id', parseInt(projeId))
        .eq('alt_proje_id', parseInt(altProjeId))
        .ilike('gorev_adi', formData.gorevAdi.trim());

      if (existingTasks && existingTasks.length > 0) {
        setMessage(`❌ "${formData.gorevAdi}" adlı görev zaten mevcut! Lütfen farklı bir ad seçin.`);
        setSubmitLoading(false);
        return;
      }

      // Görev oluştur - Düzeltilmiş Supabase kayıt
      const gorevData = {
        proje_id: parseInt(projeId),
        alt_proje_id: parseInt(altProjeId),
        gorev_adi: formData.gorevAdi.trim(),
        aciklama: formData.aciklama.trim(),
        atanan_firmalar: formData.atananFirmalar,
        durum: formData.durum,
        oncelik: formData.oncelik,
        baslangic_tarihi: formData.baslangicTarihi,
        bitis_tarihi: formData.bitisTarihi,
        yuzde_katki: formData.yuzdeKatki,
        sira_no: formData.siraNo,
        tamamlanma_orani: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('💾 Supabase\'e kaydedilecek görev:', gorevData);

      const { data: result, error: createError } = await supabase
        .from('gorevler')
        .insert([gorevData])
        .select()
        .single();

      if (createError) {
        console.error('❌ Supabase görev kayıt hatası:', createError);
        throw new Error(`Görev kayıt hatası: ${createError.message}`);
      }

      setMessage('✅ Görev başarıyla oluşturuldu!');
      console.log('✅ Görev başarıyla oluşturuldu:', result);

      // Form temizle
      setFormData({
        gorevAdi: '',
        aciklama: '',
        atananFirmalar: [],
        durum: 'Aktif',
        oncelik: 'Orta',
        yuzdeKatki: 10,
        siraNo: mevcutGorevler.length + 2,
        baslangicTarihi: new Date().toISOString().split('T')[0],
        bitisTarihi: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      // Yönlendirme
      setTimeout(() => {
        router.push(`/admin-proje-yonetimi/detay/${projeId}?activeTab=alt-projeler&altProjeId=${altProjeId}`);
      }, 2000);

    } catch (error: any) {
      console.error('Görev oluşturma hatası:', error);

      let errorMessage = '❌ Görev oluşturulurken bir hata oluştu.';
      if (error?.message) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = `❌ "${formData.gorevAdi}" adlı görev zaten mevcut!`;
        } else if (error.message.includes('foreign key')) {
          errorMessage = '❌ Proje bilgilerinde hata var. Lütfen sayfayı yenileyin.';
        } else {
          errorMessage = `❌ ${error.message}`;
        }
      }

      setMessage(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    router.push('/admin-login');
  };

  if (!mounted || !isAdminLoggedIn || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">
              {loading ? 'Supabase veritabanından veriler yükleniyor...' : 'Yükleniyor...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !proje) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20 max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto border border-red-500/30">
              <i className="ri-error-warning-line text-2xl text-red-400"></i>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Hata Oluştu</h2>
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">{error}</p>
            <Link
              href="/admin-proje-yonetimi"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Proje Listesine Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Modern Header */}
      <header className="bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-white cursor-pointer font-['Pacifico']">
                logo
              </Link>
              <div className="hidden md:flex items-center space-x-2 text-gray-300">
                <Link href="/admin-proje-yonetimi" className="hover:text-white transition-colors cursor-pointer">
                  Proje Yönetimi
                </Link>
                <span className="text-gray-500">/</span>
                <Link href={`/admin-proje-yonetimi/detay/${projeId}`} className="hover:text-white transition-colors cursor-pointer">
                  {proje?.projeAdi}
                </Link>
                <span className="text-gray-500">/</span>
                <span className="text-white font-medium">Alt Proje Görev Ekle</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs text-gray-300">
                  {supabaseConnected ? 'Supabase Bağlı' : 'Bağlantı Yok'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 hidden md:block">{adminEmail}</span>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 whitespace-nowrap cursor-pointer"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Page Header */}
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-xl rounded-2xl shadow-2xl mb-8 border border-green-500/30">
          <div className="px-8 py-8">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="ri-add-line text-white text-3xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Alt Proje Görev Ekle</h1>
                <p className="text-green-100 text-lg">
                  {altProje?.altProjeBasligi} için yeni görev oluştur
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30">
                    <i className="ri-folder-line mr-1"></i>
                    Proje ID: {projeId}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-200 border border-purple-500/30">
                    <i className="ri-git-branch-line mr-1"></i>
                    Alt Proje ID: {altProjeId}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center">
                    <i className="ri-error-warning-line text-red-400 mr-3 text-xl"></i>
                    <span className="text-red-100">{error}</span>
                  </div>
                </div>
              )}

              {message && (
                <div
                  className={`${message.includes('✅') ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'} border rounded-xl p-4 backdrop-blur-sm`}
                >
                  <div className="flex items-center">
                    <i
                      className={`${message.includes('✅') ? 'ri-check-line text-green-400' : 'ri-error-warning-line text-red-400'} mr-3 text-xl`}
                    ></i>
                    <span className={message.includes('✅') ? 'text-green-100' : 'text-red-100'}>{message}</span>
                  </div>
                </div>
              )}

              {/* Proje ve Alt Proje Bilgileri */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <i className="ri-folder-line text-blue-400"></i>
                    </div>
                    <h3 className="font-semibold text-white">Ana Proje</h3>
                  </div>
                  <p className="text-blue-100 text-sm">{proje?.projeAdi}</p>
                </div>
                <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <i className="ri-git-branch-line text-purple-400"></i>
                    </div>
                    <h3 className="font-semibold text-white">Alt Proje</h3>
                  </div>
                  <p className="text-purple-100 text-sm">{altProje?.altProjeBasligi}</p>
                </div>
              </div>

              {/* Görev Detayları */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Görev Başlığı */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <i className="ri-edit-line text-green-400 text-sm"></i>
                    </div>
                    <label className="text-sm font-medium text-white">
                      Görev Başlığı *
                    </label>
                  </div>
                  <input
                    type="text"
                    value={formData.gorevAdi}
                    onChange={(e) => handleInputChange('gorevAdi', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                    placeholder="Görev başlığını girin"
                    required
                  />
                </div>

                {/* Öncelik */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <i className="ri-flag-line text-orange-400 text-sm"></i>
                    </div>
                    <label className="text-sm font-medium text-white">
                      Görev Önceliği
                    </label>
                  </div>
                  <select
                    value={formData.oncelik}
                    onChange={(e) => handleInputChange('oncelik', e.target.value)}
                    className="w-full px-4 py-3 pr-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                  >
                    <option value="Düşük" className="bg-gray-800">Düşük</option>
                    <option value="Orta" className="bg-gray-800">Orta</option>
                    <option value="Yüksek" className="bg-gray-800">Yüksek</option>
                  </select>
                </div>
              </div>

              {/* Görev Açıklaması */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <i className="ri-file-text-line text-blue-400 text-sm"></i>
                  </div>
                  <label className="text-sm font-medium text-white">
                    Görev Açıklaması *
                  </label>
                </div>
                <textarea
                  value={formData.aciklama}
                  onChange={(e) => handleInputChange('aciklama', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                  placeholder="Görev açıklamasını detaylı olarak yazın"
                  required
                />
              </div>

              {/* Tarih ve Durum Bilgileri */}
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <i className="ri-calendar-line text-green-400 text-sm"></i>
                    </div>
                    <label className="text-sm font-medium text-white">
                      Başlangıç Tarihi
                    </label>
                  </div>
                  <input
                    type="date"
                    value={formData.baslangicTarihi}
                    onChange={(e) => handleInputChange('baslangicTarihi', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <i className="ri-calendar-check-line text-red-400 text-sm"></i>
                    </div>
                    <label className="text-sm font-medium text-white">
                      Bitiş Tarihi *
                    </label>
                  </div>
                  <input
                    type="date"
                    value={formData.bitisTarihi}
                    onChange={(e) => handleInputChange('bitisTarihi', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <i className="ri-settings-line text-purple-400 text-sm"></i>
                    </div>
                    <label className="text-sm font-medium text-white">
                      Görev Durumu
                    </label>
                  </div>
                  <select
                    value={formData.durum}
                    onChange={(e) => handleInputChange('durum', e.target.value)}
                    className="w-full px-4 py-3 pr-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                  >
                    <option value="Aktif" className="bg-gray-800">Aktif</option>
                    <option value="Pasif" className="bg-gray-800">Pasif</option>
                    <option value="Tamamlandı" className="bg-gray-800">Tamamlandı</option>
                  </select>
                </div>
              </div>

              {/* Atanan Firmalar */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <i className="ri-building-line text-yellow-400 text-sm"></i>
                    </div>
                    <label className="text-sm font-medium text-white">
                      Atanacak Firmalar *
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                    <span className="text-xs text-gray-300">
                      {supabaseConnected ? 'Supabase Verileri' : 'Demo Veriler'}
                    </span>
                  </div>
                </div>

                {firmalar.length === 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center backdrop-blur-sm">
                    <div className="text-yellow-400 mb-3">
                      <i className="ri-building-line text-3xl"></i>
                    </div>
                    <p className="text-yellow-100 text-sm mb-2">Henüz aktif firma bulunamadı</p>
                    <p className="text-yellow-200 text-xs">
                      Sistem yöneticisiyle iletişime geçin
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                    <div className="grid md:grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                      {firmalar.map((firma) => (
                        <label key={firma.id} className="flex items-start space-x-3 cursor-pointer hover:bg-white/5 p-3 rounded-lg transition-colors border border-transparent hover:border-white/10">
                          <input
                            type="checkbox"
                            checked={formData.atananFirmalar.includes(firma.id)}
                            onChange={() => handleFirmaToggle(firma.id)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white mb-1">
                              {firma.firma_adi}
                            </div>
                            <div className="text-xs text-gray-300 mb-1">
                              {firma.yetkili_email}
                            </div>
                            <div className="text-xs text-gray-400">
                              {firma.telefon}
                            </div>
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30 mt-2">
                              {firma.durum}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {formData.atananFirmalar.length} firma seçildi
                      </span>
                      <span className="text-xs text-gray-400">
                        / {firmalar.length} aktif firma
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Butonları */}
              <div className="flex items-center justify-between pt-8 border-t border-white/10">
                <Link
                  href={`/admin-proje-yonetimi/detay/${projeId}`}
                  className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 cursor-pointer"
                >
                  İptal
                </Link>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className={`px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 cursor-pointer flex items-center space-x-3 transform hover:scale-105 ${
                    submitLoading ? 'opacity-50 cursor-not-allowed scale-100' : ''
                  }`}
                >
                  {submitLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Supabase'e Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line text-lg"></i>
                      <span>Görevi Oluştur</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Modern Debug Info */}
        <div className="mt-8">
          <details className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <summary className="text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
              Sistem Durumu & Debug Bilgileri
            </summary>
            <div className="mt-4 grid md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Supabase Bağlantısı:</span>
                  <span className={supabaseConnected ? 'text-green-400' : 'text-yellow-400'}>
                    {supabaseConnected ? 'Aktif' : 'Bağlantı Sorunu'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Yüklenen Firma Sayısı:</span>
                  <span className="text-white">{firmalar.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seçilen Firma:</span>
                  <span className="text-white">{formData.atananFirmalar.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mevcut Görev Sayısı:</span>
                  <span className="text-white">{mevcutGorevler.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Proje ID:</span>
                  <span className="text-white">{projeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Alt Proje ID:</span>
                  <span className="text-white">{altProjeId}</span>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
