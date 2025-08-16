
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

interface AltProje {
  id: string;
  alt_proje_adi: string;
  aciklama: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  durum: string;
  ana_proje_id: number;
  ana_proje_adi?: string;
}

interface Gorev {
  id: number;
  gorev_adi: string;
  gorev_aciklama: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  durum: string;
  atanan_firmalar: number[];
  proje_id: number;
  alt_proje_id: string;
}

interface TamamlamaTalebi {
  gorevId: number;
  kullaniciAciklama: string;
  kanitDosyaURL: string;
  kanitDosyaAdi: string;
}

interface FormErrors {
  aciklama: string;
  dokuman: string;
}

interface AltProjeDetayClientProps {
  altProjeId: string;
}

export default function AltProjeDetayClient({ altProjeId }: AltProjeDetayClientProps) {
  const [altProje, setAltProje] = useState<AltProje | null>(null);
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [firmaId, setFirmaId] = useState<number | null>(null);
  const [firmaAdi, setFirmaAdi] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [showTamamlamaModal, setShowTamamlamaModal] = useState(false);
  const [selectedGorev, setSelectedGorev] = useState<Gorev | null>(null);
  const [submitLoading, setSubmitLoading] = useState<number | null>(null);
  const [tamamlamaTalebi, setTamamlamaTalebi] = useState<TamamlamaTalebi>({
    gorevId: 0,
    kullaniciAciklama: '',
    kanitDosyaURL: '',
    kanitDosyaAdi: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({
    aciklama: '',
    dokuman: '',
  });

  const router = useRouter();

  const validateAltProjeId = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const numericId = parseInt(id);

    return uuidRegex.test(id) || (!isNaN(numericId) && numericId > 0);
  };

  useEffect(() => {
    initializeAuth();
  }, [altProjeId]);

  const initializeAuth = async () => {
    try {
      const supabase = getSupabaseClient();

      if (!validateAltProjeId(altProjeId)) {
        console.error('Geçersiz alt proje ID:', altProjeId);
        router.replace('/dashboard');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.warn('❌ Session bulunamadı, login\'e yönlendiriliyor');
        router.replace('/login');
        return;
      }

      setSession(session);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
        if (event === 'SIGNED_OUT' || !session) {
          console.log('🚪 Kullanıcı logout oldu, yönlendiriliyor...');
          router.replace('/login');
        }
      });

      const firmaAdiCache = localStorage.getItem('firmaAdi') || '';
      const firmaIdCache = parseInt(localStorage.getItem('firmaId') || '0');
      const userEmailCache = localStorage.getItem('userEmail') || session.user.email || '';

      if (!firmaAdiCache || !firmaIdCache) {
        console.warn('❌ Firma bilgileri eksik');
        router.replace('/login');
        return;
      }

      setFirmaId(firmaIdCache);
      setFirmaAdi(firmaAdiCache);
      setUserEmail(userEmailCache);

      await loadAltProjeDetay();

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Auth hatası:', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      router.replace('/login');
    }
  };

  const loadAltProjeDetay = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('alt_projeler')
        .select(`
          id, 
          alt_proje_adi, 
          aciklama, 
          baslangic_tarihi, 
          bitis_tarihi, 
          durum, 
          ana_proje_id,
          projeler:ana_proje_id(id, proje_adi)
        `)
        .eq('id', altProjeId)
        .single();

      if (error) {
        throw new Error(`Supabase select failed: ${error.message}`);
      }

      if (!data) {
        console.warn('⚠️ No record found');
        setLoading(false);
        return;
      }

      const anaProjeAdi = data.projeler?.proje_adi || 'Bilinmeyen Proje';

      setAltProje({
        id: data.id,
        alt_proje_adi: data.alt_proje_adi || 'İsimsiz Alt Proje',
        aciklama: data.aciklama || '',
        baslangic_tarihi: data.baslangic_tarihi || '',
        bitis_tarihi: data.bitis_tarihi || '',
        durum: data.durum || 'Aktif',
        ana_proje_id: data.ana_proje_id || 0,
        ana_proje_adi: anaProjeAdi,
      });

      if (firmaId) {
        const { data: gorevlerData, error: gorevlerError } = await supabase
          .from('gorevler')
          .select('*')
          .eq('alt_proje_id', altProjeId);

        if (gorevlerError) {
          console.error('Görevler sorgu hatası ->', gorevlerError?.message || gorevlerError);
          setGorevler([]);
        } else if (gorevlerData && gorevlerData.length > 0) {
          const firmaGorevleri = gorevlerData.filter((gorev: Gorev) => {
            if (!gorev.atanan_firmalar) return false;

            try {
              let atananFirmalar = [];
              if (Array.isArray(gorev.atanan_firmalar)) {
                atananFirmalar = gorev.atanan_firmalar;
              } else if (typeof gorev.atanan_firmalar === 'string') {
                atananFirmalar = JSON.parse(gorev.atanan_firmalar);
              }
              return Array.isArray(atananFirmalar) && atananFirmalar.includes(firmaId);
            } catch (error) {
              console.warn('Görev firma parse hatası:', error);
              return false;
            }
          });

          setGorevler(firmaGorevleri);
        } else {
          setGorevler([]);
        }
      }

    } catch (error) {
      console.error('AltProjeDetay load error ->', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      setGorevler([]);
      if (!altProje) {
        setAltProje(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const validateTamamlamaForm = (): boolean => {
    const errors: FormErrors = {
      aciklama: '',
      dokuman: '',
    };

    if (!tamamlamaTalebi.kullaniciAciklama.trim()) {
      errors.aciklama = 'Açıklama alanı zorunludur';
    } else if (tamamlamaTalebi.kullaniciAciklama.trim().length < 20) {
      errors.aciklama = 'Açıklama en az 20 karakter olmalıdır';
    } else if (tamamlamaTalebi.kullaniciAciklama.trim().length > 500) {
      errors.aciklama = 'Açıklama en fazla 500 karakter olmalıdır';
    }

    if (!tamamlamaTalebi.kanitDosyaURL.trim() && !tamamlamaTalebi.kanitDosyaAdi.trim()) {
      errors.dokuman = 'Kanıt dökümanı zorunludur';
    }

    setFormErrors(errors);
    return !errors.aciklama && !errors.dokuman;
  };

  const handleTamamlamaTalebiGonder = async () => {
    try {
      console.log('📝 Tamamlama talebi gönderme başlatılıyor...');

      if (selectedGorev) {
        setSubmitLoading(selectedGorev.id);
      }

      if (!validateTamamlamaForm()) {
        console.warn('🚫 Form validasyonu başarısız');
        setSubmitLoading(null);
        return;
      }

      if (!selectedGorev || !firmaId || !getSupabaseClient()) {
        console.error('🚫 Gerekli bilgiler eksik:', {
          selectedGorev: !!selectedGorev,
          firmaId: !!firmaId,
          supabase: !!getSupabaseClient(),
        });
        alert('Sistem hatası. Lütfen sayfayı yenileyin.');
        setSubmitLoading(null);
        return;
      }

      console.log('👍 Form validasyonu başarılı');

      const { data: mevcutTalep, error: kontrolError } = await getSupabaseClient()
        .from('gorev_tamamlama_talepleri')
        .select('id, durum, created_at')
        .eq('gorev_id', selectedGorev.id)
        .eq('firma_id', firmaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (kontrolError && kontrolError.code !== 'PGRST116') {
        console.error('🚫 Mevcut talep kontrol hatası:', kontrolError);
        alert('Talep kontrolü yapılamadı. Lütfen tekrar deneyin.');
        setSubmitLoading(null);
        return;
      }

      if (mevcutTalep) {
        console.log('👀 Mevcut talep bulundu:', mevcutTalep);
        if (mevcutTalep.durum === 'Onaylandı' || mevcutTalep.durum === 'Onaylandi') {
          alert('Bu görev zaten tamamlandı olarak onaylanmış.');
        } else if (mevcutTalep.durum === 'Onay Bekliyor') {
          alert('Bu görev için zaten bir tamamlama talebi gönderilmiş ve onay bekleniyor.');
        }
        setSubmitLoading(null);
        return;
      }

      console.log('👍 Duplicate kontrolü geçti, yeni talep oluşturuluyor...');

      const talepData = {
        gorev_id: selectedGorev.id,
        firma_id: firmaId,
        tamamlama_notu: tamamlamaTalebi.kullaniciAciklama.trim(),
        kanit_dosya_url: tamamlamaTalebi.kanitDosyaURL?.trim() || null,
        kanit_dosya_adi: tamamlamaTalebi.kanitDosyaAdi?.trim() || `Görev_${selectedGorev.id}_Kanıt_${Date.now()}`,
        durum: 'Onay Bekliyor',
        talep_tarihi: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Talep verisi hazırlandı:', {
        gorev_id: talepData.gorev_id,
        firma_id: talepData.firma_id,
        aciklama_length: talepData.tamamlama_notu.length,
        has_kanit_url: !!talepData.kanit_dosya_url,
      });

      const { data: insertResult, error: insertError } = await getSupabaseClient()
        .from('gorev_tamamlama_talepleri')
        .insert([talepData])
        .select('id, gorev_id, firma_id, durum, tamamlama_notu')
        .single();

      if (insertError) {
        console.error('🚫 Tamamlama talebi ekleme hatası:', insertError);

        let userMessage = 'Tamamlama talebi gönderilemedi. ';
        if (insertError.code === '23505') {
          userMessage += 'Bu görev için zaten bir talep mevcut.';
        } else if (insertError.code === '23503') {
          userMessage += 'Geçersiz görev veya firma bilgisi.';
        } else if (insertError.code === '42501') {
          userMessage += 'Yetki hatası. Lütfen tekrar giriş yapın.';
        } else {
          userMessage += `Hata: ${insertError.message}`;
        }

        alert(userMessage);
        setSubmitLoading(null);
        return;
      }

      if (!insertResult || !insertResult.id) {
        console.error('🚫 Insert başarılı ama sonuç verisi boş:', insertResult);
        alert('Talep gönderildi, fakat doğrulama yapılamadı.');
        setSubmitLoading(null);
        return;
      }

      console.log('📝 Tamamlama talebi başarıyla gönderildi:', {
        talep_id: insertResult.id,
        gorev_id: insertResult.gorev_id,
        durum: insertResult.durum,
      });

      alert(
        `Tamamlama talebi başarıyla gönderildi!\\nTalep ID: #${insertResult.id}\\nDurum: ${insertResult.durum}\\nAdmin onayı bekleniyor.`
      );

      setShowTamamlamaModal(false);
      setSelectedGorev(null);
      setTamamlamaTalebi({
        gorevId: 0,
        kullaniciAciklama: '',
        kanitDosyaURL: '',
        kanitDosyaAdi: '',
      });
      setFormErrors({
        aciklama: '',
        dokuman: '',
      });

      if (firmaId) {
        await loadAltProjeDetay();
      }

    } catch (error) {
      console.error('💥 Tamamlama talebi sistem hatası ->', error instanceof Error ? error.message : 'Bilinmeyen hata', error);
      alert(`Beklenmeyen sistem hatası oluştu: ${error instanceof Error ? error.message : 'Lütfen tekrar deneyin.'}`);
    } finally {
      setSubmitLoading(null);
    }
  };

  const handleTamamlamaModalAc = (gorev: Gorev) => {
    setSelectedGorev(gorev);
    setTamamlamaTalebi({
      gorevId: gorev.id,
      kullaniciAciklama: '',
      kanitDosyaURL: '',
      kanitDosyaAdi: '',
    });
    setFormErrors({
      aciklama: '',
      dokuman: '',
    });
    setShowTamamlamaModal(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  const getDurumRengi = (durum: string) => {
    switch (durum) {
      case 'Aktif':
      case 'Devam Ediyor':
        return 'bg-green-100 text-green-800';
      case 'Tamamlandı':
        return 'bg-blue-100 text-blue-800';
      case 'Beklemede':
        return 'bg-yellow-100 text-yellow-800';
      case 'İptal':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Alt proje detayları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!altProje) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-red-600 text-2xl"></i>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">No record found</h1>
          <p className="text-gray-600 mb-4">Aradığınız alt proje mevcut değil veya erişim izniniz bulunmuyor.</p>
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Dashboard'a Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-[`Pacifico`]">
                logo
              </Link>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Link href="/dashboard" className="hover:text-blue-600 cursor-pointer">
                  Dashboard
                </Link>
                <span className="text-gray-400">/</span>
                <Link href={`/alt-projeler/${altProje.ana_proje_id}`} className="hover:text-blue-600 cursor-pointer">
                  {altProje.ana_proje_adi}
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">{altProje.alt_proje_adi}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{firmaAdi}</span>
              <Link
                href="/dashboard"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Dashboard'a Dön
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alt Proje Başlığı */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{altProje.alt_proje_adi}</h1>
              <p className="text-gray-600 mb-4">{altProje.aciklama}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Başlangıç Tarihi</span>
                  <p className="text-gray-900">{formatDate(altProje.baslangic_tarihi)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Bitiş Tarihi</span>
                  <p className="text-gray-900">{formatDate(altProje.bitis_tarihi)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Durum</span>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getDurumRengi(altProje.durum)}`}
                  >
                    {altProje.durum}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Görevler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Görevleriniz</h2>
            <p className="text-gray-600 mt-1">Bu alt projeye ait görevlerinizi görüntüleyin ve yönetin</p>
          </div>

          <div className="p-6">
            {gorevler.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-task-line text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Görev Yok</h3>
                <p className="text-gray-600">Bu alt proje için size henüz görev atanmamış.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {gorevler.map((gorev) => (
                  <div
                    key={gorev.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{gorev.gorev_adi}</h3>
                        <p className="text-gray-600 mb-3">{gorev.gorev_aciklama}</p>

                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <i className="ri-calendar-line"></i>
                            <span>Başlangıç: {formatDate(gorev.baslangic_tarihi)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <i className="ri-calendar-check-line"></i>
                            <span>Bitiş: {formatDate(gorev.bitis_tarihi)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getDurumRengi(gorev.durum)}`}
                        >
                          {gorev.durum}
                        </span>

                        {gorev.durum !== 'Tamamlandı' && (
                          <button
                            onClick={() => handleTamamlamaModalAc(gorev)}
                            disabled={submitLoading === gorev.id}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                          >
                            {submitLoading === gorev.id ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Gönderiliyor...</span>
                              </div>
                            ) : (
                              'Tamamlandı İşaretle'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tamamlama Modal */}
      {showTamamlamaModal && selectedGorev && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Görev Tamamlama Talebi</h3>
                <button
                  onClick={() => setShowTamamlamaModal(false)}
                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600"></i>
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                <strong>{selectedGorev.gorev_adi}</strong> görevini tamamladığınızı bildirmek için gerekli bilgileri doldurun.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Açıklama Alanı */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamamlama Açıklaması <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={tamamlamaTalebi.kullaniciAciklama}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 500) {
                      setTamamlamaTalebi((prev) => ({ ...prev, kullaniciAciklama: value }));
                      if (formErrors.aciklama) {
                        setFormErrors((prev) => ({ ...prev, aciklama: '' }));
                      }
                    }
                  }}
                  placeholder="Görevi nasıl tamamladığınızı detaylı olarak açıklayın... (En az 20 karakter, en fazla 500 karakter)"
                  className={`w-full px-4 py-3 border rounded-lg resize-none ${
                    formErrors.aciklama
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } focus:ring-1 focus:outline-none`}
                  rows={4}
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.aciklama && <span className="text-red-600 text-sm">{formErrors.aciklama}</span>}
                  <span
                    className={`text-sm ml-auto ${
                      tamamlamaTalebi.kullaniciAciklama.length < 20
                        ? 'text-red-500'
                        : tamamlamaTalebi.kullaniciAciklama.length > 450
                        ? 'text-yellow-500'
                        : 'text-gray-500'
                    }`}
                  >
                    {tamamlamaTalebi.kullaniciAciklama.length}/500 karakter
                  </span>
                </div>
              </div>

              {/* Kanıt Dökümanı */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kanıt Dökümanı <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    value={tamamlamaTalebi.kanitDosyaURL}
                    onChange={(e) => {
                      setTamamlamaTalebi((prev) => ({ ...prev, kanitDosyaURL: e.target.value }));
                      if (formErrors.dokuman) {
                        setFormErrors((prev) => ({ ...prev, dokuman: '' }));
                      }
                    }}
                    placeholder="Döküman URL'si (örn: https://drive.google.com/file/...)"
                    className={`w-full px-4 py-3 border rounded-lg ${
                      formErrors.dokuman
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    } focus:ring-1 focus:outline-none text-sm`}
                  />

                  <div className="text-center text-gray-500 text-sm">veya</div>

                  <input
                    type="text"
                    value={tamamlamaTalebi.kanitDosyaAdi}
                    onChange={(e) => {
                      setTamamlamaTalebi((prev) => ({ ...prev, kanitDosyaAdi: e.target.value }));
                      if (formErrors.dokuman) {
                        setFormErrors((prev) => ({ ...prev, dokuman: '' }));
                      }
                    }}
                    placeholder="Dosya adı (örn: proje_raporu_2024.pdf)"
                    className={`w-full px-4 py-3 border rounded-lg ${
                      formErrors.dokuman
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    } focus:ring-1 focus:outline-none text-sm`}
                  />
                </div>
                {formErrors.dokuman && <p className="text-red-600 text-sm mt-1">{formErrors.dokuman}</p>}
                <p className="text-gray-600 text-sm mt-2">
                  Kabul edilen formatlar: PDF, Word, Excel, PowerPoint, resim dosyaları veya bulut depolama linkleri
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowTamamlamaModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  onClick={handleTamamlamaTalebiGonder}
                  disabled={submitLoading !== null}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {submitLoading !== null ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Gönderiliyor...</span>
                    </div>
                  ) : (
                    'Tamamlama Talebini Gönder'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
