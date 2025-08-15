
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-services';

interface GorevDetay {
  id: number;
  proje_id: number;
  alt_proje_id?: number;
  gorev_adi: string;
  aciklama: string;
  atanan_firmalar: number[];
  durum: string;
  oncelik: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
}

interface Firma {
  id: number;
  firma_adi: string;
  yetkili_email: string;
  telefon?: string;
  durum: string;
}

interface Proje {
  id: number;
  proje_adi: string;
  aciklama: string;
  durum: string;
}

interface GorevDuzenleClientProps {
  projeId: string;
  gorevId: string;
}

export default function GorevDuzenleClient({ projeId, gorevId }: GorevDuzenleClientProps) {
  const [gorev, setGorev] = useState<GorevDetay | null>(null);
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [proje, setProje] = useState<Proje | null>(null);
  const [message, setMessage] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  const [formData, setFormData] = useState({
    gorev_adi: '',
    aciklama: '',
    atanan_firmalar: [] as number[],
    durum: 'Aktif',
    oncelik: 'Orta',
    baslangic_tarihi: '',
    bitis_tarihi: '',
  });

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, projeId, gorevId]);

  const checkAdminAuth = () => {
    try {
      const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
      const role = localStorage.getItem('adminRole');

      if (!isLoggedIn || isLoggedIn !== 'true' || role !== 'Yonetici') {
        router.push('/admin-login');
        return;
      }
    } catch (error) {
      console.error('Admin yetki kontrolü hatası:', error);
      router.push('/admin-login');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage('');

      const gorevIdNum = parseInt(gorevId);

      if (isNaN(gorevIdNum)) {
        throw new Error('Geçersiz görev ID parametresi');
      }

      console.log('🔄 Supabase direkt entegrasyonu - Görev düzenleme verileri yükleniyor...', {
        gorevId: gorevIdNum,
      });

      // Supabase bağlantısını kontrol et
      if (!supabase) {
        throw new Error('Supabase bağlantısı mevcut değil');
      }
      setSupabaseConnected(true);

      // ÖNEMLİ: Önce görev detaylarını çek, sonra proje bilgilerini görevin proje_id'sine göre al
      const { data: gorevDataArray, error: gorevError } = await supabase
        .from('gorevler')
        .select(`
          id,
          proje_id,
          alt_proje_id,
          gorev_adi,
          aciklama,
          atanan_firmalar,
          durum,
          oncelik,
          baslangic_tarihi,
          bitis_tarihi
        `)
        .eq('id', gorevIdNum);

      if (gorevError) {
        throw new Error(`Görev yükleme hatası: ${gorevError.message}`);
      }

      // Array kontrolü yap
      if (!gorevDataArray || gorevDataArray.length === 0) {
        throw new Error(`Görev bulunamadı (ID: ${gorevIdNum})`);
      }

      // İlk görev verisini al
      const gorevData = gorevDataArray[0];

      // Görevin gerçek proje_id'sini al
      const gerçekProjeId = gorevData.proje_id;

      console.log('✅ Görev bulunduğu:', {
        gorevId: gorevData.id,
        gorevAdi: gorevData.gorev_adi,
        gerçekProjeId: gerçekProjeId,
        urlProjeId: projeId,
      });

      // URL'deki proje ID ile görevin proje ID'si eşleşmiyor mu kontrol et
      if (parseInt(projeId) !== gerçekProjeId) {
        console.warn(`⚠️ URL proje ID (${projeId}) ile görevin proje ID (${gerçekProjeId}) eşleşmiyor. Doğru proje ID'ye yönlendiriliyor...`);

        // Doğru URL'ye yönlendir
        router.replace(`/admin-proje-yonetimi/gorev-duzenle/${gerçekProjeId}/${gorevIdNum}`);
        return;
      }

      // Proje bilgilerini görevin proje_id'sine göre çek
      const { data: projeData, error: projeError } = await supabase
        .from('projeler')
        .select('id, proje_adi, aciklama, durum')
        .eq('id', gerçekProjeId);

      if (projeError) {
        throw new Error(`Proje yükleme hatası: ${projeError.message}`);
      }

      if (!projeData || projeData.length === 0) {
        throw new Error(`Proje bulunamadı (ID: ${gerçekProjeId})`);
      }

      const projeInfo = projeData[0];
      setProje(projeInfo);
      console.log('✅ Proje Supabase\'den yüklendi:', projeInfo.proje_adi);

      // Görev verilerini set et
      const gorevDetay: GorevDetay = {
        id: gorevData.id,
        proje_id: gorevData.proje_id,
        alt_proje_id: gorevData.alt_proje_id,
        gorev_adi: gorevData.gorev_adi || '',
        aciklama: gorevData.aciklama || '',
        atanan_firmalar: Array.isArray(gorevData.atanan_firmalar) ? gorevData.atanan_firmalar : [],
        durum: gorevData.durum || 'Aktif',
        oncelik: gorevData.oncelik || 'Orta',
        baslangic_tarihi: gorevData.baslangic_tarihi || new Date().toISOString().split('T')[0],
        bitis_tarihi: gorevData.bitis_tarihi || new Date().toISOString().split('T')[0],
      };

      setGorev(gorevDetay);
      setFormData({
        gorev_adi: gorevDetay.gorev_adi,
        aciklama: gorevDetay.aciklama,
        atanan_firmalar: gorevDetay.atanan_firmalar,
        durum: gorevDetay.durum,
        oncelik: gorevDetay.oncelik,
        baslangic_tarihi: gorevDetay.baslangic_tarihi,
        bitis_tarihi: gorevDetay.bitis_tarihi,
      });

      console.log('✅ Görev Supabase\'den yüklendi:', gorevDetay.gorev_adi);

      // Firmaları Supabase'den direkt çek
      const { data: firmalarData, error: firmalarError } = await supabase
        .from('firmalar')
        .select('id, firma_adi, yetkili_email, telefon, durum')
        .eq('durum', 'Aktif')
        .order('firma_adi', { ascending: true });

      if (firmalarError) {
        console.warn('Firmalar yüklenirken hata:', firmalarError);
        setFirmalar([]);
      } else {
        setFirmalar(firmalarData || []);
        console.log('✅ Firmalar Supabase\'den yüklendi:', firmalarData?.length || 0);
      }

      console.log('🎉 Tüm veriler Supabase\'den başarıyla yüklendi');
    } catch (error) {
      console.error('🔥 Veri yükleme hatası:', error);
      setSupabaseConnected(false);
      setMessage(`❌ Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFirmaSelection = (firmaId: number) => {
    setFormData((prev) => ({
      ...prev,
      atanan_firmalar: prev.atanan_firmalar.includes(firmaId)
        ? prev.atanan_firmalar.filter((id) => id !== firmaId)
        : [...prev.atanan_firmalar, firmaId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // Form validasyonu
    if (!formData.gorev_adi.trim()) {
      setMessage('❌ Görev başlığı gereklidir');
      return;
    }

    if (!formData.aciklama.trim()) {
      setMessage('❌ Görev açıklaması gereklidir');
      return;
    }

    if (formData.atanan_firmalar.length === 0) {
      setMessage('❌ En az bir firma seçmelisiniz');
      return;
    }

    if (!formData.bitis_tarihi) {
      setMessage('❌ Bitiş tarihi gereklidir');
      return;
    }

    // Tarih kontrolü
    if (formData.baslangic_tarihi && formData.bitis_tarihi) {
      const baslangic = new Date(formData.baslangic_tarihi);
      const bitis = new Date(formData.bitis_tarihi);

      if (bitis <= baslangic) {
        setMessage('❌ Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
        return;
      }
    }

    try {
      setSaving(true);
      console.log('🔄 Görev Supabase\'de güncelleniyor...', {
        gorevId: parseInt(gorevId),
        gorev_adi: formData.gorev_adi,
        atanan_firmalar: formData.atanan_firmalar,
      });

      if (!supabase) {
        throw new Error('Supabase bağlantısı mevcut değil');
      }

      const updatedData = {
        gorev_adi: formData.gorev_adi.trim(),
        aciklama: formData.aciklama.trim(),
        atanan_firmalar: formData.atanan_firmalar,
        durum: formData.durum,
        oncelik: formData.oncelik,
        baslangic_tarihi: formData.baslangic_tarihi,
        bitis_tarihi: formData.bitis_tarihi,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('gorevler')
        .update(updatedData)
        .eq('id', parseInt(gorevId));

      if (error) {
        throw new Error(`Güncelleme hatası: ${error.message}`);
      }

      setMessage('✅ Görev başarıyla güncellendi!');

      // 2 saniye sonra proje detay sayfasına yönlendir - doğru proje ID'sini kullan
      setTimeout(() => {
        const doğruProjeId = gorev?.proje_id || projeId;
        router.push(`/admin-proje-yonetimi/detay/${doğruProjeId}`);
      }, 2000);
    } catch (error) {
      console.error('🔥 Görev güncelleme hatası:', error);
      setMessage(`❌ Görev güncellenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');
      router.push('/admin-login');
    } catch (error) {
      console.error('Logout hatası:', error);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <i className="ri-settings-3-line text-white text-2xl animate-spin"></i>
          </div>
          <p className="text-gray-600 text-lg font-medium">Görev bilgileri yükleniyor...</p>
          <p className="text-gray-400 text-sm mt-2">Supabase bağlantısı kontrol ediliyor</p>
        </div>
      </div>
    );
  }

  if (!gorev) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-8 max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-white text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Görev Bulunamadı</h2>
          <p className="text-gray-600 mb-6">Düzenlemek istediğiniz görev mevcut değil veya erişim izniniz bulunmuyor.</p>
          <Link
            href={`/admin-proje-yonetimi`}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 cursor-pointer whitespace-nowrap inline-flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <i className="ri-arrow-left-line"></i>
            <span>Proje Yönetimine Dön</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-6">
              <Link href="/admin-dashboard" className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text cursor-pointer font-[\\\'Pacifico\\\']">
                logo
              </Link>
              <div className="flex items-center space-x-2 text-sm">
                <Link href="/admin-proje-yonetimi" className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer font-medium">
                  Proje Yönetimi
                </Link>
                <i className="ri-arrow-right-s-line text-gray-400"></i>
                <Link href={`/admin-proje-yonetimi/detay/${gorev.proje_id}`} className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer font-medium">
                  {proje?.proje_adi || 'Proje Detayı'}
                </Link>
                <i className="ri-arrow-right-s-line text-gray-400"></i>
                <span className="text-blue-600 font-semibold">Görev Düzenle</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Supabase Bağlantı Durumu */}
              <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs font-medium text-green-700">
                  {supabaseConnected ? 'Supabase Bağlı' : 'Bağlantı Yok'}
                </span>
                <i className="ri-database-2-line text-green-600"></i>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">{localStorage.getItem('adminRole')}</div>
                <div className="text-xs text-gray-500">{localStorage.getItem('adminEmail')}</div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <i className="ri-logout-box-line mr-2"></i>
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Modern Page Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="ri-edit-box-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Görev Düzenle</h1>
                <p className="text-gray-600 text-lg">{gorev.gorev_adi} görevini düzenleyin</p>
                <div className="flex items-center space-x-4 mt-2 text-sm">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <i className="ri-hashtag"></i>
                    <span>Görev ID: {gorev.id}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-purple-600">
                    <i className="ri-folder-line"></i>
                    <span>Proje: {proje?.proje_adi}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-600">
                    <i className="ri-database-2-line"></i>
                    <span>Proje ID: {gorev.proje_id}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Son Güncellenme</div>
              <div className="text-lg font-semibold text-gray-900" suppressHydrationWarning={true}>
                {new Date().toLocaleDateString('tr-TR')}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6 lg:p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-xl border ${message.includes('✅') ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700' : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-700'}`}>
              <div className="flex items-center space-x-2">
                <i className={`${message.includes('✅') ? 'ri-check-line' : 'ri-error-warning-line'}`}></i>
                <p className="font-medium">{message}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Temel Bilgiler */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Görev Başlığı */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <i className="ri-edit-line mr-2 text-blue-600"></i>
                  Görev Başlığı *
                </label>
                <input
                  type="text"
                  name="gorev_adi"
                  value={formData.gorev_adi}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                  placeholder="Görev başlığını girin"
                  required
                />
              </div>
            </div>

            {/* Görev Açıklaması */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <i className="ri-file-text-line mr-2 text-orange-600"></i>
                Görev Açıklaması *
              </label>
              <textarea
                name="aciklama"
                value={formData.aciklama}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                placeholder="Görev açıklamasını girin"
                required
              />
            </div>

            {/* Tarih Bilgileri */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <i className="ri-calendar-line mr-2 text-blue-600"></i>
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  name="baslangic_tarihi"
                  value={formData.baslangic_tarihi}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <i className="ri-calendar-check-line mr-2 text-red-600"></i>
                  Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  name="bitis_tarihi"
                  value={formData.bitis_tarihi}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                  required
                />
              </div>
            </div>

            {/* Durum ve Öncelik */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <i className="ri-toggle-line mr-2 text-green-600"></i>
                  Görev Durumu
                </label>
                <select
                  name="durum"
                  value={formData.durum}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-8 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Pasif">Pasif</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <i className="ri-flag-line mr-2 text-yellow-600"></i>
                  Öncelik Seviyesi
                </label>
                <select
                  name="oncelik"
                  value={formData.oncelik}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-8 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-sm"
                >
                  <option value="Düşük">Düşük Öncelik</option>
                  <option value="Orta">Orta Öncelik</option>
                  <option value="Yüksek">Yüksek Öncelik</option>
                </select>
              </div>
            </div>

            {/* Atanan Firmalar - Supabase Entegrasyonlu */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <i className="ri-building-line mr-2 text-indigo-600"></i>
                Atanan Firmalar * 
                <span className="text-xs text-blue-600 ml-2">(Supabase'den Yükleniyor)</span>
              </label>

              {firmalar.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-building-line text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-gray-500 font-medium">Hiç aktif firma bulunamadı</p>
                  <p className="text-gray-400 text-sm mt-1">Supabase bağlantısını kontrol edin</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 max-h-80 overflow-y-auto border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {firmalar.map((firma) => (
                        <label
                          key={firma.id}
                          className={`flex items-center space-x-3 cursor-pointer p-4 rounded-lg border-2 transition-all duration-300 ${
                            formData.atanan_firmalar.includes(firma.id)
                              ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 shadow-md'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.atanan_firmalar.includes(firma.id)}
                            onChange={() => handleFirmaSelection(firma.id)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900 truncate">{firma.firma_adi}</span>
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                {firma.durum}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 truncate">{firma.yetkili_email}</div>
                            {firma.telefon && (
                              <div className="text-xs text-gray-400 truncate">{firma.telefon}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.atanan_firmalar.length > 0 && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2">
                        <i className="ri-check-line text-blue-600"></i>
                        <span className="text-sm font-medium text-blue-700">
                          {formData.atanan_firmalar.length} firma seçildi
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200">
              <Link
                href={`/admin-proje-yonetimi/detay/${projeId}`}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 cursor-pointer font-medium inline-flex items-center space-x-2"
              >
                <i className="ri-close-line"></i>
                <span>İptal</span>
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Güncelleniyor...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-save-line"></i>
                    <span>Değişiklikleri Kaydet</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
