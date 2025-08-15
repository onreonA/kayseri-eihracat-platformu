
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-services';

interface ProjeDetay {
  id: number;
  proje_adi: string;
  aciklama: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  durum: string;
  hedef_firmalar: number[];
}

interface GorevDetay {
  id: number;
  proje_id: number;
  gorev_adi: string;
  aciklama: string;
  yuzde_katki: number;
  durum: string;
  atanan_firmalar: number[];
  isTamamlandi?: boolean;
  isBeklemede?: boolean;
  tamamlama_tarihi?: string;
}

interface UserData {
  email: string;
  firma_adi: string;
  firma_id: number;
}

interface GorevTamamlamaTalebi {
  gorev_id: number;
  kullanici_aciklamasi: string;
  kanit_dosya_url?: string;
  kanit_dosya_adi?: string;
}

export default function ProjeDetayClient({ projeId }: { projeId: string }) {
  const [proje, setProje] = useState<ProjeDetay | null>(null);
  const [gorevler, setGorevler] = useState<GorevDetay[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('gorevler');
  const [showTamamlamaModal, setShowTamamlamaModal] = useState(false);
  const [selectedGorev, setSelectedGorev] = useState<GorevDetay | null>(null);
  const [tamamlamaTalebi, setTamamlamaTalebi] = useState<GorevTamamlamaTalebi>({
    gorev_id: 0,
    kullanici_aciklamasi: '',
    kanit_dosya_url: '',
    kanit_dosya_adi: '',
  });
  const [formErrors, setFormErrors] = useState({
    aciklama: '',
    dokuman: '',
  });
  const [message, setMessage] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [projeIlerleme, setProjeIlerleme] = useState<number>(0);

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkSupabaseConnection();
      checkUserAuth();
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted && userData && projeId && supabaseConnected) {
      loadProjeDetay();
    }
  }, [mounted, userData, projeId, supabaseConnected]);

  const checkSupabaseConnection = async () => {
    try {
      console.log('🔗 Supabase bağlantısı kontrol ediliyor...');

      if (!supabase) {
        console.error('❌ Supabase client bulunamadı');
        setSupabaseConnected(false);
        setMessage('Supabase bağlantısı başarısız');
        return;
      }

      const { error } = await supabase
        .from('projeler')
        .select('id')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Supabase bağlantı hatası:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        setSupabaseConnected(false);
        setMessage('Veritabanı bağlantısı başarısız');
        return;
      }

      setSupabaseConnected(true);
      console.log('✅ Supabase bağlantısı başarılı');
    } catch (error) {
      console.error('💥 Supabase bağlantı kontrol hatası:', error);
      setSupabaseConnected(false);
      setMessage('Sistem hatası: Veritabanına erişilemiyor');
    }
  };

  const checkUserAuth = () => {
    try {
      if (typeof window === 'undefined') return;

      console.log('🔐 Kullanıcı kimlik doğrulaması başlıyor...');

      const unifiedData = localStorage.getItem('user_login_data');
      if (unifiedData) {
        try {
          const parsedData = JSON.parse(unifiedData);
          const isValid =
            parsedData.email && parsedData.firmaAdi && parsedData.loginTime && parsedData.firmaId;

          if (isValid) {
            const loginTime = new Date(parsedData.loginTime);
            const now = new Date();
            const timeDiff = now.getTime() - loginTime.getTime();
            const hoursDiff = timeDiff / (1000 * 3600);

            if (hoursDiff > 24) {
              console.log('⏰ Unified: Giriş süresi dolmuş');
              router.push('/login');
              return;
            }

            const loginData = {
              email: parsedData.email,
              firma_adi: parsedData.firmaAdi,
              firma_id: parsedData.firmaId,
            };

            if (isNaN(loginData.firma_id) || loginData.firma_id <= 0) {
              console.error('❌ Unified: Geçersiz firma ID:', parsedData.firmaId);
              router.push('/login');
              return;
            }

            console.log('✅ Unified format: Kullanıcı kimlik doğrulaması başarılı:', loginData);
            setUserData(loginData);
            return;
          }
        } catch (parseError) {
          console.warn('⚠️ Unified data parse hatası:', parseError);
        }
      }

      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userEmail = localStorage.getItem('userEmail');
      const firmaAdi = localStorage.getItem('firmaAdi');
      const firmaId = localStorage.getItem('firmaId');

      console.log('🔍 Legacy format kontrolü:', {
        isLoggedIn: isLoggedIn === 'true',
        hasEmail: !!userEmail,
        hasFirmaAdi: !!firmaAdi,
        hasFirmaId: !!firmaId,
      });

      if (!isLoggedIn || isLoggedIn !== 'true' || !userEmail || !firmaAdi || !firmaId) {
        console.error('❌ Legacy: Kullanıcı giriş yapmamış veya bilgiler eksik');
        router.push('/login');
        return;
      }

      const loginData = {
        email: userEmail,
        firma_adi: firmaAdi || '',
        firma_id: parseInt(firmaId),
      };

      if (isNaN(loginData.firma_id) || loginData.firma_id <= 0) {
        console.error('❌ Legacy: Geçersiz firma ID:', firmaId);
        router.push('/login');
        return;
      }

      console.log('✅ Legacy format: Kullanıcı kimlik doğrulaması başarılı:', loginData);
      setUserData(loginData);
    } catch (error) {
      console.error('💥 Kimlik doğrulama sistem hatası:', error);
      router.push('/login');
    }
  };

  const loadProjeDetay = async () => {
    try {
      if (!userData || !supabaseConnected) {
        console.error('❌ UserData veya Supabase bağlantısı mevcut değil');
        return;
      }

      setLoading(true);
      console.log('📊 Proje detayı yükleniyor - ID:', projeId, 'Firma ID:', userData.firma_id);

      const numericId = parseInt(projeId);
      if (isNaN(numericId) || numericId <= 0) {
        console.error('❌ Geçersiz proje ID:', projeId);
        setMessage('Geçersiz proje ID');
        setLoading(false);
        return;
      }

      console.log('🔍 Proje sorgusu çalıştırılıyor...');

      const { data: projeData, error: projeError } = await supabase
        .from('projeler')
        .select(
          `
            id,
            proje_adi,
            aciklama,
            baslangic_tarihi,
            bitis_tarihi,
            durum,
            hedef_firmalar,
            kategori,
            oncelik,
            created_at
          `
        )
        .eq('id', numericId)
        .single();

      if (projeError) {
        console.error('❌ Proje sorgu hatası detayları:', {
          message: projeError.message || 'Bilinmeyen hata',
          code: projeError.code || 'Kod yok',
          projeId: numericId,
        });

        if (projeError.code === 'PGRST116') {
          setMessage(`Proje bulunamadı - ID: ${numericId}. Bu proje silinmiş veya mevcut değil.`);
        } else if (projeError.code === '42P01') {
          setMessage(`Veritabanı tablosu mevcut değil: ${projeError.message}`);
        } else {
          setMessage(`Veritabanı hatası: ${projeError.message}. Lütfen daha sonra tekrar deneyin.`);
        }
        setLoading(false);
        return;
      }

      if (!projeData) {
        console.error('❌ Proje bulunamadı, ID:', numericId);
        setMessage(`Proje bulunamadı - ID: ${numericId}. Bu proje mevcut değil.`);
        setLoading(false);
        return;
      }

      console.log('✅ Proje bulundu:', {
        id: projeData.id,
        proje_adi: projeData.proje_adi,
        hedef_firmalar: projeData.hedef_firmalar,
      });

      // Erişim kontrolü
      console.log('🔐 Kapsamlı erişim kontrolü analizi başlıyor...');

      let hasAccess = false;
      let accessReason = '';

      if (projeData.hedef_firmalar === null || projeData.hedef_firmalar === undefined) {
        hasAccess = true;
        accessReason = 'Herkese açık proje (hedef_firmalar: null/undefined)';
      } else if (Array.isArray(projeData.hedef_firmalar) && projeData.hedef_firmalar.length === 0) {
        hasAccess = true;
        accessReason = 'Herkese açık proje (hedef_firmalar: boş array)';
      } else if (Array.isArray(projeData.hedef_firmalar) && projeData.hedef_firmalar.length > 0) {
        hasAccess = projeData.hedef_firmalar.includes(userData.firma_id);
        accessReason = hasAccess ? `Firma atanmış (${userData.firma_id})` : `Firma atanmamış (${userData.firma_id})`;
      } else {
        const stringIncludes = String(projeData.hedef_firmalar).includes(String(userData.firma_id));
        hasAccess = stringIncludes;
        accessReason = 'String kontrolü';
      }

      console.log('🔐 Erişim kontrolü sonucu:', {
        hasAccess,
        accessReason,
        hedef_firmalar: projeData.hedef_firmalar,
        firma_id: userData.firma_id,
      });

      if (!hasAccess) {
        console.error('🚫 Proje erişimi reddedildi');
        setMessage(`Bu projeye erişim yetkiniz yok. Detay: ${accessReason}`);
        setLoading(false);
        return;
      }

      console.log('✅ Proje erişimi onaylandı:', accessReason);

      const formattedProje: ProjeDetay = {
        id: projeData.id,
        proje_adi: projeData.proje_adi,
        aciklama: projeData.aciklama || '',
        baslangic_tarihi: projeData.baslangic_tarihi,
        bitis_tarihi: projeData.bitis_tarihi,
        durum: projeData.durum || 'Aktif',
        hedef_firmalar: projeData.hedef_firmalar || [],
      };

      setProje(formattedProje);

      // 🔧 YENİ: Alt proje sayısını hesapla ve yönlendirme karar ver
      console.log('📊 Alt proje sayısı hesaplanıyor...');

      try {
        const { data: altProjelerData, error: altProjelerError } = await supabase
          .from('alt_projeler')
          .select('id')
          .eq('ana_proje_id', numericId);

        const altProjeSayisi = altProjelerError ? 0 : altProjelerData?.length || 0;
        console.log(`✅ ${altProjeSayisi} alt proje bulundu`);

        // Eğer alt proje varsa, alt projeler sayfasına yönlendir
        if (altProjeSayisi > 0) {
          console.log('🔄 Alt projeler mevcut, alt projeler sayfasına yönlendiriliyor...');
          router.push(`/alt-projeler/${numericId}`);
          return;
        }

        console.log('ℹ️ Alt proje bulunamadı, görevleri direkt göster');
      } catch (altProjeError) {
        console.warn('⚠️ Alt proje sayısı hesaplanamadı:', altProjeError);
      }

      // Görev sorgusu (sadece alt proje yoksa)
      console.log('📝 Görev sorgusu başlıyor...');

      try {
        const { data: gorevlerData, error: gorevlerError } = await supabase
          .from('gorevler')
          .select(
            `
            id,
            proje_id,
            gorev_adi,
            aciklama,
            yuzde_katki,
            durum,
            atanan_firmalar,
            baslangic_tarihi,
            bitis_tarihi,
            created_at
          `
          )
          .eq('proje_id', numericId)
          .neq('durum', 'Silindi');

        if (gorevlerError) {
          console.error('❌ Görev sorgu hatası:', {
            kod: gorevlerError.code || 'Hata kodu yok',
            mesaj: gorevlerError.message || 'Bilinmeyen görev sorgu hatası',
          });

          console.warn('⚠️ Görevler yüklenemedi, sadece proje bilgisi gösteriliyor');
          setGorevler([]);
          setProjeIlerleme(0);

          let errorMessage = 'Görevler yüklenirken hata oluştu: ';
          if (gorevlerError.code === 'PGRST116') {
            errorMessage += 'Görevler tablosu bulunamadı';
          } else if (gorevlerError.code === '42P01') {
            errorMessage += 'Veritabanı tablosu mevcut değil';
          } else {
            errorMessage += gorevlerError.message || 'Bilinmeyen veritabanı hatası';
          }

          setMessage(errorMessage);
          setLoading(false);
          return;
        }

        const safeGorevlerData = gorevlerData || [];
        console.log(`✅ ${safeGorevlerData.length} görev bulundu`);

        // Kullanıcı görev filtreleme
        const userGorevler = safeGorevlerData.filter((gorev) => {
          if (!gorev) return false;
          if (!gorev.atanan_firmalar) return true;
          if (!Array.isArray(gorev.atanan_firmalar)) return true;
          if (gorev.atanan_firmalar.length === 0) return true;
          return gorev.atanan_firmalar.includes(userData.firma_id);
        });

        console.log(`✅ Kullanıcı için ${userGorevler.length} görev filtrelendi`);

        // Tamamlama talep sorgusu
        console.log('📊 Tamamlama talepleri sorgulanıyor...');

        const { data: tamamlamaData, error: tamamlamaError } = await supabase
          .from('gorev_tamamlama_talepleri')
          .select(
            `
            id,
            gorev_id,
            firma_id,
            durum,
            onay_tarihi,
            created_at
          `
          )
          .eq('firma_id', userData.firma_id);

        if (tamamlamaError) {
          console.warn('⚠️ Tamamlama talepleri sorgulanamadı:', tamamlamaError?.message || 'Bilinmeyen hata');
        }

        const safeTamamlamaData = tamamlamaData || [];

        // Görev durumu birleştirme
        const gorevlerWithStatus = userGorevler.map((gorev) => {
          const tamamlandi = safeTamamlamaData.find((t) => t && t.gorev_id === gorev.id && t.durum === 'Onaylandı');
          const beklemede = safeTamamlamaData.find((t) => t && t.gorev_id === gorev.id && t.durum === 'Onay Bekliyor');

          return {
            ...gorev,
            isTamamlandi: !!tamamlandi,
            isBeklemede: !!beklemede,
            tamamlama_tarihi: tamamlandi?.onay_tarihi || null,
          };
        });

        setGorevler(gorevlerWithStatus);

        // İlerleme hesaplama
        const tamamlananGorevler = gorevlerWithStatus.filter((g) => g && g.isTamamlandi);
        const toplamPuan = gorevlerWithStatus.reduce((sum, g) => sum + ((g && g.yuzde_katki) || 0), 0);
        const tamamlananPuan = tamamlananGorevler.reduce((sum, g) => sum + ((g && g.yuzde_katki) || 0), 0);
        const ilerlemePuan = toplamPuan > 0 ? Math.round((tamamlananPuan / toplamPuan) * 100) : 0;
        setProjeIlerleme(ilerlemePuan);

        console.log('📈 İlerleme hesaplaması:', {
          total_tasks: gorevlerWithStatus.length,
          completed_tasks: tamamlananGorevler.length,
          progress_percentage: ilerlemePuan,
        });
      } catch (gorevErr: any) {
        console.error('💥 Görev yükleme kritik hatası:', gorevErr?.message || 'Bilinmeyen hata');
        setGorevler([]);
        setProjeIlerleme(0);
        setMessage(`Görev yükleme kritik hatası: ${gorevErr?.message || 'Bilinmeyen hata'}`);
      }

      console.log('🎉 Tüm proje verileri başarıyla yüklendi');
      setLoading(false);
    } catch (error: any) {
      console.error('💥 Proje detay yükleme kritik hatası:', error?.message || 'Bilinmeyen hata');
      setMessage(`Sistem hatası: ${error?.message || 'Proje detay verileri yüklenirken beklenmeyen hata oluştu'}`);
      setLoading(false);
    }
  };

  const handleGorevTamamlamaClick = (gorev: GorevDetay) => {
    console.log('📝 Görev tamamlama tıklandı:', gorev.id);

    if (gorev.isTamamlandi) {
      setMessage('Bu görev zaten tamamlanmış.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (gorev.isBeklemede) {
      setMessage('Bu görev için zaten bir tamamlama talebi bekletiliyor.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSelectedGorev(gorev);
    setTamamlamaTalebi({
      gorev_id: gorev.id,
      kullanici_aciklamasi: '',
      kanit_dosya_url: '',
      kanit_dosya_adi: '',
    });
    // ✅ Form hatalarını sıfırla
    setFormErrors({
      aciklama: '',
      dokuman: '',
    });
    setShowTamamlamaModal(true);
  };

  // ✅ YENİ: Form validasyon fonksiyonu
  const validateTamamlamaForm = (): boolean => {
    const errors = {
      aciklama: '',
      dokuman: '',
    };

    // Açıklama kontrolü
    if (!tamamlamaTalebi.kullanici_aciklamasi.trim()) {
      errors.aciklama = 'Açıklama alanı zorunludur.';
    } else if (tamamlamaTalebi.kullanici_aciklamasi.trim().length < 20) {
      errors.aciklama = 'Açıklama en az 20 karakter olmalıdır.';
    } else if (tamamlamaTalebi.kullanici_aciklamasi.trim().length > 500) {
      errors.aciklama = 'Açıklama en fazla 500 karakter olabilir.';
    }

    // Döküman kontrolü - URL veya dosya adı en az birisi zorunlu
    const hasURL = tamamlamaTalebi.kanit_dosya_url && tamamlamaTalebi.kanit_dosya_url.trim().length > 0;
    const hasFileName = tamamlamaTalebi.kanit_dosya_adi && tamamlamaTalebi.kanit_dosya_adi.trim().length > 0;

    if (!hasURL && !hasFileName) {
      errors.dokuman = 'Kanıt dökümanı zorunludur. Dosya URL\'si veya dosya adı girin.';
    } else if (hasURL) {
      // URL formatı kontrolü
      try {
        new URL(tamamlamaTalebi.kanit_dosya_url);
      } catch {
        errors.dokuman = 'Geçerli bir URL formatı girin (örn: https://...)';
      }
    }

    setFormErrors(errors);
    return !errors.aciklama && !errors.dokuman;
  };

  const handleTamamlamaTalebiGonder = async () => {
    try {
      console.log('📤 GELİŞTİRİLMİŞ Görev tamamlama talebi gönderiliyor...', {
        selectedGorev: selectedGorev?.id,
        userData: userData?.firma_id,
        tamamlamaTalep_aciklama: tamamlamaTalebi.kullanici_aciklamasi?.length,
      });

      // ✅ FORM VALİDASYONU
      if (!validateTamamlamaForm()) {
        console.warn('⚠️ Form validasyonu başarısız');
        return;
      }

      if (!selectedGorev || !userData || !supabaseConnected) {
        console.error('❌ Gerekli bilgiler eksik:', {
          selectedGorev: !!selectedGorev,
          userData: !!userData,
          supabaseConnected,
        });
        setMessage('Gerekli bilgiler eksik.');
        return;
      }

      // Mevcut talep kontrolü
      console.log('🔍 Mevcut talep kontrolü yapılıyor...');

      const { data: mevcutTalepler, error: kontrolError } = await supabase
        .from('gorev_tamamlama_talepleri')
        .select('*')
        .eq('gorev_id', selectedGorev.id)
        .eq('firma_id', userData.firma_id)
        .in('durum', ['Onay Bekliyor', 'Onaylandı']);

      if (kontrolError) {
        const kontrolErrorDetails = {
          message: kontrolError.message || 'Bilinmeyen kontrol hatası',
          code: kontrolError.code || 'UNKNOWN_CONTROL_ERROR',
          details: kontrolError.details || 'Detay bilgi mevcut değil',
          gorev_id: selectedGorev.id,
          firma_id: userData.firma_id,
          timestamp: new Date().toISOString(),
          context: 'existing_request_check',
        };

        console.error('❌ Önceki talep kontrolü hatası:', kontrolErrorDetails);
        setMessage('Talep kontrolü sırasında hata oluştu. Lütfen tekrar deneyin.');
        return;
      }

      if (mevcutTalepler && mevcutTalepler.length > 0) {
        const oncekiTalep = mevcutTalepler[0];
        console.warn('⚠️ Önceki talep var:', {
          talep_id: oncekiTalep.id,
          durum: oncekiTalep.durum,
          created_at: oncekiTalep.created_at,
        });
        setMessage(`Bu görev için zaten ${oncekiTalep.durum} statuesi ile bir talep gönderilmiş.`);
        return;
      }

      // Yeni talep oluştur
      console.log('✅ Kontroller başarılı, yeni talep oluşturuluyor...');

      // ✅ GELİŞTİRİLMİŞ VERİ YAPISI
      const talepData = {
        gorev_id: selectedGorev.id,
        firma_id: userData.firma_id,
        kullanici_aciklama: tamamlamaTalebi.kullanici_aciklamasi.trim(),
        kanit_dosya_url: tamamlamaTalebi.kanit_dosya_url?.trim() || null,
        kanit_dosya_adi: tamamlamaTalebi.kanit_dosya_adi?.trim() || `Görev_${selectedGorev.id}_Kanıt_${Date.now()}`,
        durum: 'Onay Bekliyor',
        talep_tarihi: new Date().toISOString(),
      };

      console.log('📝 Gelişmiş talep verisi hazırlandı:', {
        gorev_id: talepData.gorev_id,
        firma_id: talepData.firma_id,
        aciklama_length: talepData.kullanici_aciklama.length,
        has_kanit_url: !!talepData.kanit_dosya_url,
        has_kanit_adi: !!talepData.kanit_dosya_adi,
      });

      const { data: yeniTalep, error: talepError } = await supabase
        .from('gorev_tamamlama_talepleri')
        .insert([talepData])
        .select()
        .single();

      if (talepError) {
        const talepErrorDetails = {
          message: talepError.message || 'Bilinmeyen talep oluşturma hatası',
          code: talepError.code || 'UNKNOWN_INSERT_ERROR',
          details: talepError.details || 'Detay bilgi mevcut değil',
          hint: talepError.hint || 'Öneri bulunmuyor',
          gorev_id: selectedGorev.id,
          firma_id: userData.firma_id,
          timestamp: new Date().toISOString(),
          context: 'request_creation',
          table: 'gorev_tamamlama_talepleri',
          operation: 'INSERT',
          submitted_data: {
            gorev_id: talepData.gorev_id,
            firma_id: talepData.firma_id,
            durum: talepData.durum,
            aciklama_length: talepData.kullanici_aciklama.length,
          },
        };

        console.error('❌ Talep oluşturma detaylı hatası:', talepErrorDetails);

        let userFriendlyMessage = 'Talep gönderilirken hata oluştu. ';
        if (talepError.code === '23505') {
          userFriendlyMessage += 'Bu talep zaten mevcut. Sayfa yenilenerek kontrol edilsin.';
        } else if (talepError.code === '23503') {
          userFriendlyMessage += 'Geçersiz görev veya firma referansı.';
        } else if (talepError.code === '42P01') {
          userFriendlyMessage += 'Veritabanı tablosu bulunamadı. Sistem yöneticisiyle iletişime geçin.';
        } else {
          userFriendlyMessage += `Hata kodu: ${talepError.code}. Lütfen tekrar deneyin.`;
        }

        setMessage(userFriendlyMessage);
        return;
      }

      if (yeniTalep) {
        console.log('✅ Gelişmiş talep başarıyla Supabase\'ye kaydedildi:', {
          talep_id: yeniTalep.id,
          gorev_id: yeniTalep.gorev_id,
          firma_id: yeniTalep.firma_id,
          durum: yeniTalep.durum,
          created_at: yeniTalep.created_at,
        });

        setMessage(`🎉 Görev tamamlama talebi başarıyla gönderildi!\n\nTalep ID: #${yeniTalep.id}\nDurum: ${yeniTalep.durum}\n\nYönetici onayı bekleniyor. Talep durumunu takip edebilirsiniz.`);
        setShowTamamlamaModal(false);
        setSelectedGorev(null);
        setTamamlamaTalebi({
          gorev_id: 0,
          kullanici_aciklamasi: '',
          kanit_dosya_url: '',
          kanit_dosya_adi: '',
        });
        setFormErrors({
          aciklama: '',
          dokuman: '',
        });

        // Verileri yenile
        console.log('🔄 Proje verileri yeniden yükleniyor...');
        await loadProjeDetay();
      } else {
        console.error('❌ Talep kaydedilemedi - yeniTalep null:', {
          returned_data: yeniTalep,
          expected: 'Talep objesi',
          context: 'request_creation_success_check',
        });
        setMessage('Talep gönderilirken beklenmeyen hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error: any) {
      const criticalErrorDetails = {
        message: error?.message || 'Kritik sistem hatası',
        name: error?.name || 'UnknownError',
        stack: error?.stack || 'Stack bilgisi mevcut değil',
        timestamp: new Date().toISOString(),
        context: 'task_completion_request_critical_error',
        user_data: {
          firma_id: userData?.firma_id,
          email: userData?.email,
        },
        selected_gorev: {
          id: selectedGorev?.id,
          gorev_adi: selectedGorev?.gorev_adi,
        },
        supabase_connected: supabaseConnected,
        function_name: 'handleTamamlamaTalebiGonder',
        component: 'ProjeDetayClient',
      };

      console.error('💥 Görev tamamlama talebi kritik hatası:', criticalErrorDetails);
      setMessage('Sistem hatası oluştu. Lütfen sayfayı yenileme ve tekrar deneyin.');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return 'Geçersiz tarih';
    }
  };

  const getDurumColor = (durum: string) => {
    switch (durum) {
      case 'Aktif':
        return 'bg-green-100 text-green-800';
      case 'Tamamlandı':
        return 'bg-blue-100 text-blue-800';
      case 'Durduruldu':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIlerlemeRenk = (yuzde: number) => {
    if (yuzde >= 80) return { bgColor: 'bg-green-500', textColor: 'text-green-600', gradientFrom: 'from-green-400', gradientTo: 'to-green-600' };
    if (yuzde >= 50) return { bgColor: 'bg-yellow-500', textColor: 'text-yellow-600', gradientFrom: 'from-yellow-400', gradientTo: 'to-yellow-600' };
    return { bgColor: 'bg-red-500', textColor: 'text-red-600', gradientFrom: 'from-red-400', gradientTo: 'to-red-600' };
  };

  const handleLogout = () => {
    try {
      console.log('🚪 Kullanıcı çıkış yapılıyor.');

      localStorage.removeItem('user_login_data');

      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('firmaAdi');
      localStorage.removeItem('firmaId');

      sessionStorage.clear();

      router.push('/');
    } catch (error) {
      console.error('💥 Çıkış hatası:', error);
      router.push('/');
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Proje detayı yükleniyor...</p>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className={`w-3 h-3 rounded-full ${supabaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-500">
              Supabase {supabaseConnected ? 'bağlantısı başarılı' : 'bağlantısı başarısız'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Proje ID: {projeId}</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl mb-6">
            <strong>Hata:</strong> Kullanıcı giriş yapmamış
          </div>
          <Link href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 cursor-pointer transition-colors">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  if (message && !proje) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-lg mx-4">
          <div
            className={`mb-6 p-4 rounded-xl backdrop-blur-sm ${message.includes('başarılı') ? 'bg-green-50/80 border border-green-200' : 'bg-yellow-50/80 border border-yellow-200'
              }`}
          >
            <p className={`text-sm font-medium ${message.includes('başarılı') ? 'text-green-600' : 'text-yellow-600'}`}>{message}</p>
          </div>

          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-left">
            <p className="font-semibold text-red-800 mb-2">🔍 Debug Bilgileri:</p>
            <div className="space-y-1 text-red-700">
              <p>
                <span className="font-medium">Proje ID:</span> {projeId}
              </p>
              <p>
                <span className="font-medium">Kullanıcı Firma ID:</span> {userData?.firma_id}
              </p>
              <p>
                <span className="font-medium">Kullanıcı E-Posta:</span> {userData?.email}
              </p>
              <p>
                <span className="font-medium">Supabase Durumu:</span> {supabaseConnected ? 'Bağlantı Başarılı' : 'Bağlantı Başarısız'}
              </p>
              <p>
                <span className="font-medium">Zaman Damgası:</span> {new Date().toLocaleString('tr-TR')}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/projelerim"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 cursor-pointer transition-colors text-center font-medium"
            >
              📋 Projelerime Dön
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 cursor-pointer transition-colors text-center font-medium"
            >
              🏠 Ana Sayfaya Dön
            </Link>
          </div>

          <button
            onClick={() => {
              console.log('🔄 Sayfa yeniden yükleniyor...');
              window.location.reload();
            }}
            className="mt-3 w-full bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 cursor-pointer transition-colors font-medium"
          >
            🔄 Sayfayı Yenile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-bold text-blue-600 cursor-pointer font-[\'Pacifico\']">
                logo
              </Link>
              <span className="text-gray-600 font-medium">Proje Detayi</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-500">
                  {supabaseConnected ? 'Supabase Bağlantısı Başarılı' : 'Bağlantı Başarısız'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{userData?.firma_adi} - {userData?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-red-700 hover:scale-105 transition-all duration-200 whitespace-nowrap cursor-pointer shadow-lg"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 mb-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="py-4 text-sm font-medium text-gray-600 hover:text-blue-600 border-b-2 border-transparent hover:border-blue-600 cursor-pointer transition-colors">
              Dashboard
            </Link>
            <Link href="/projelerim" className="py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600 cursor-pointer">
              Projelerim
            </Link>
            <Link href="/egitimlerim" className="py-4 text-sm font-medium text-gray-600 hover:text-blue-600 border-b-2 border-transparent hover:border-gray-300 cursor-pointer transition-colors">
              Eğitime Başla
            </Link>
            <Link href="/forum" className="py-4 text-sm font-medium text-gray-600 hover:text-blue-600 border-b-2 border-transparent hover:border-gray-300 cursor-pointer transition-colors">
              Forum
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {message && proje && (
          <div
            className={`mb-6 p-4 rounded-xl backdrop-blur-sm ${message.includes('başarılı') ? 'bg-green-50/80 border border-green-200' : 'bg-yellow-50/80 border border-yellow-200'
              }`}
          >
            <p className={`text-sm font-medium ${message.includes('başarılı') ? 'text-green-600' : 'text-yellow-600'}`}>{message}</p>
          </div>
        )}

        {proje && (
          <div>
            {/* Project Header */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 mb-8 border border-gray-200">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{proje.proje_adi}</h1>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${getDurumColor(proje.durum)} shadow-sm`}>{proje.durum}</span>
                  </div>

                  <p className="text-gray-600 text-lg mb-6 leading-relaxed">{proje.aciklama}</p>

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                      <i className="ri-calendar-line w-4 h-4 flex items-center justify-center text-blue-500"></i>
                      <span>Başlangıç: {formatDate(proje.baslangic_tarihi)}</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                      <i className="ri-calendar-check-line w-4 h-4 flex items-center justify-center text-green-500"></i>
                      <span>Bitiş: {formatDate(proje.bitis_tarihi)}</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                      <i className="ri-hashtag w-4 h-4 flex items-center justify-center text-purple-500"></i>
                      <span>Proje ID: {proje.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Link
                    href={`/alt-projeler/${proje.id}`}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 hover:scale-105 transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                  >
                    <i className="ri-folder-2-line w-4 h-4 flex items-center justify-center"></i>
                    <span>Alt Projeleri Görüntüle</span>
                  </Link>
                  <Link
                    href="/projelerim"
                    className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-gray-700 hover:to-gray-800 hover:scale-105 transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                  >
                    <i className="ri-arrow-left-line w-4 h-4 flex items-center justify-center"></i>
                    <span>Projelerime Dön</span>
                  </Link>
                </div>
              </div>

              {/* Project Progress Bar */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Proje İlerlemesi</h3>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{projeIlerleme}%</div>
                      <div className="text-sm text-gray-500">{gorevler.filter((g) => g.isTamamlandi).length}/{gorevler.length} görev tamamlandı</div>
                    </div>
                  </div>
                </div>

                <div className="relative mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${getIlerlemeRenk(projeIlerleme).gradientFrom} ${getIlerlemeRenk(projeIlerleme).gradientTo} rounded-full transition-all duration-1000 ease-out relative`}
                      style={{ width: `${projeIlerleme}%`, animation: 'progressAnimation 1.5s ease-out' }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Tüm Görevler: {gorevler.length}</span>
                  <span className={`font-medium ${getIlerlemeRenk(projeIlerleme).textColor}`}>
                    {projeIlerleme >= 80 ? 'Mükemmel' : projeIlerleme >= 50 ? 'İyi' : projeIlerleme >= 20 ? 'Orta' : 'Başlangıç'}
                  </span>
                </div>

                {/* YENİ: Alt proje yönlendirme mesajı */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="ri-information-line text-blue-600"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">Bu proje üç katmanlı yapıdadır</p>
                      <p className="text-xs text-blue-600 mt-1">Ana Proje → Alt Projeler → Görevler şeklinde organize edilmiştir</p>
                    </div>
                    <Link
                      href={`/alt-projeler/${proje.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-medium whitespace-nowrap transition-colors"
                    >
                      Alt Projeleri Gör
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg mb-6 border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('gorevler')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer transition-colors ${activeTab === 'gorevler' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-center space-x-2">
                      <i className="ri-task-line w-4 h-4 flex items-center justify-center"></i>
                      <span>Görevlerim ({gorevler.length})</span>
                    </div>
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'gorevler' && (
              <div className="space-y-4">
                {gorevler.length > 0 ? (
                  gorevler.map((gorev, index) => (
                    <div key={`gorev-${gorev.id}-${index}`} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden hover:shadow-3xl transition-all duration-300">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{gorev.gorev_adi}</h3>
                              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">#{gorev.id}</span>
                              {gorev.isTamamlandi && (
                                <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 text-green-800 text-xs font-medium rounded-full flex items-center space-x-1 shadow-sm">
                                  <i className="ri-check-line w-3 h-3 flex items-center justify-center"></i>
                                  <span>Tamamlandı</span>
                                </span>
                              )}
                              {gorev.isBeklemede && !gorev.isTamamlandi && (
                                <span className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 text-xs font-medium rounded-full flex items-center space-x-1 shadow-sm">
                                  <i className="ri-time-line w-3 h-3 flex items-center justify-center"></i>
                                  <span>Onay Bekleniyor</span>
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 mb-4 leading-relaxed">{gorev.aciklama}</p>

                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1 bg-blue-50 px-3 py-1 rounded-lg">
                                <i className="ri-percentage-line w-3 h-3 flex items-center justify-center text-blue-500"></i>
                                <span>{gorev.yuzde_katki}% puan</span>
                              </div>
                              {gorev.tamamlama_tarihi && (
                                <div className="flex items-center space-x-1 bg-green-50 px-3 py-1 rounded-lg">
                                  <i className="ri-calendar-check-line w-3 h-3 flex items-center justify-center text-green-500"></i>
                                  <span>Tamamlanma Tarihi: {formatDate(gorev.tamamlama_tarihi)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {!gorev.isTamamlandi ? (
                              !gorev.isBeklemede ? (
                                <button
                                  onClick={() => handleGorevTamamlamaClick(gorev)}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl hover:from-blue-700 hover:to-blue-800 hover:scale-105 transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center space-x-2 shadow-lg"
                                >
                                  <i className="ri-check-line w-4 h-4 flex items-center justify-center"></i>
                                  <span>Tamamlandı olarak işaretle</span>
                                </button>
                              ) : (
                                <div className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 rounded-xl flex items-center space-x-2 shadow-sm">
                                  <i className="ri-time-line w-4 h-4 flex items-center justify-center"></i>
                                  <span>Onay Bekleniyor</span>
                                </div>
                              )
                            ) : (
                              <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-xl flex items-center space-x-2 shadow-sm">
                                <i className="ri-check-double-line w-4 h-4 flex items-center justify-center"></i>
                                <span>Onaylandı</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Task Progress Bar */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Görev Durumu</span>
                            <span className="text-sm font-bold text-gray-900">{gorev.isTamamlandi ? '100%' : gorev.isBeklemede ? '50%' : '0%'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${gorev.isTamamlandi ? 'bg-gradient-to-r from-green-400 to-green-500' : gorev.isBeklemede ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gray-300'
                                }`}
                              style={{ width: gorev.isTamamlandi ? '100%' : gorev.isBeklemede ? '50%' : '0%' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-task-line text-gray-400 text-4xl w-8 h-8 flex items-center justify-center"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Görev Yok</h3>
                    <p className="text-gray-600">Bu projede henüz görev atanmamış.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Completion Request Modal */}
      {showTamamlamaModal && selectedGorev && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">📝 Görev Tamamlama Talebi</h3>
                  <p className="text-sm text-gray-600 mt-1">Görev tamamlandığını bildirmek için gerekli bilgileri doldurun</p>
                </div>
                <button
                  onClick={() => setShowTamamlamaModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="ri-close-line text-xl w-5 h-5 flex items-center justify-center"></i>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Görev Bilgileri */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <i className="ri-task-line mr-2 w-4 h-4 flex items-center justify-center"></i>
                  {selectedGorev.gorev_adi}
                </h4>
                <p className="text-sm text-blue-700 mb-3 leading-relaxed">{selectedGorev.aciklama}</p>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">ID: #{selectedGorev.id}</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Puan: {selectedGorev.yuzde_katki}%</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* ✅ GELİŞTİRİLMİŞ Açıklama Alanı */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    📋 Tamamlama Açıklaması 
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={tamamlamaTalebi.kullanici_aciklamasi}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 500) {
                          setTamamlamaTalebi((prev) => ({ ...prev, kullanici_aciklamasi: value }));
                          // Anlık hata temizleme
                          if (formErrors.aciklama && value.length >= 20) {
                            setFormErrors(prev => ({ ...prev, aciklama: '' }));
                          }
                        }
                      }}
                      rows={5}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-sm resize-none ${formErrors.aciklama ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                      placeholder="Bu görevin nasıl tamamlandığını detaylı olarak açıklayın...\n\nÖrnek:\n- Hangi adımları takip ettiniz?\n- Hangi sonuçlara ulaştınız?\n- Varsa karşılaştığınız zorluklar nelerdi?\n- Görevin başarıyla tamamlandığını gösteren kanıtlar nelerdir?\n\n(En az 20, en fazla 500 karakter)"
                      minLength={20}
                      maxLength={500}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
                      {tamamlamaTalebi.kullanici_aciklamasi.length}/500
                    </div>
                  </div>

                  {formErrors.aciklama && (
                    <div className="mt-2 flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg">
                      <i className="ri-error-warning-line w-4 h-4 flex items-center justify-center"></i>
                      <span>{formErrors.aciklama}</span>
                    </div>
                  )}

                  <div className="mt-2 flex items-center space-x-2 text-gray-500 text-xs">
                    <i className="ri-information-line w-3 h-3 flex items-center justify-center"></i>
                    <span>Detaylı açıklama admin onay sürecini hızlandırır</span>
                  </div>
                </div>

                {/* ✅ GELİŞTİRİLMİŞ Kanıt Dökümanı */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    📎 Kanıt Dökümanı 
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Dosya URL'si (Tercih Edilen)
                      </label>
                      <input
                        type="url"
                        value={tamamlamaTalebi.kanit_dosya_url}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTamamlamaTalebi((prev) => ({ ...prev, kanit_dosya_url: value }));
                          // Anlık hata temizleme
                          if (formErrors.dokuman && (value.trim() || tamamlamaTalebi.kanit_dosya_adi)) {
                            setFormErrors(prev => ({ ...prev, dokuman: '' }));
                          }
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-sm ${formErrors.dokuman && !tamamlamaTalebi.kanit_dosya_url && !tamamlamaTalebi.kanit_dosya_adi ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                        placeholder="https://drive.google.com/dosya-linki veya https://firma.com/dokuman.pdf"
                      />
                    </div>

                    <div className="flex items-center">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs text-gray-500 bg-gray-50 rounded-full">VEYA</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Dosya Adı / Açıklama
                      </label>
                      <input
                        type="text"
                        value={tamamlamaTalebi.kanit_dosya_adi}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTamamlamaTalebi((prev) => ({ ...prev, kanit_dosya_adi: value }));
                          if (formErrors.dokuman && (value.trim() || tamamlamaTalebi.kanit_dosya_url)) {
                            setFormErrors(prev => ({ ...prev, dokuman: '' }));
                          }
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-sm ${formErrors.dokuman && !tamamlamaTalebi.kanit_dosya_url && !tamamlamaTalebi.kanit_dosya_adi ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                        placeholder="Örn: Tamamlanan_Proje_Raporu.pdf veya E-posta ile gönderildi"
                      />
                    </div>
                  </div>

                  {formErrors.dokuman && (
                    <div className="mt-2 flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg">
                      <i className="ri-error-warning-line w-4 h-4 flex items-center justify-center"></i>
                      <span>{formErrors.dokuman}</span>
                    </div>
                  )}

                  <div className="mt-3 bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">💡 Kabul Edilen Kanıt Türleri:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <i className="ri-file-pdf-line text-red-500 w-3 h-3 flex items-center justify-center"></i>
                        <span>PDF Raporları</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <i className="ri-image-line text-green-500 w-3 h-3 flex items-center justify-center"></i>
                        <span>Ekran Görüntüleri</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <i className="ri-file-excel-line text-blue-500 w-3 h-3 flex items-center justify-center"></i>
                        <span>Excel Dosyaları</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <i className="ri-mail-line text-purple-500 w-3 h-3 flex items-center justify-center"></i>
                        <span>E-posta Belgeleri</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Validasyon Durumu */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <i className="ri-checkbox-circle-line text-gray-600 w-4 h-4 flex items-center justify-center"></i>
                  <span className="text-sm font-medium text-gray-700">Form Kontrolü</span>
                </div>
                <div className="space-y-2">
                  <div className={`flex items-center space-x-2 text-xs ${tamamlamaTalebi.kullanici_aciklamasi.length >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
                    <i className={`${tamamlamaTalebi.kullanici_aciklamasi.length >= 20 ? 'ri-check-line' : 'ri-close-line'} w-3 h-3 flex items-center justify-center`}></i>
                    <span>Açıklama en az 20 karakter ({tamamlamaTalebi.kullanici_aciklamasi.length}/20)</span>
                  </div>
                  <div className={`flex items-center space-x-2 text-xs ${tamamlamaTalebi.kanit_dosya_url || tamamlamaTalebi.kanit_dosya_adi ? 'text-green-600' : 'text-gray-500'}`}>
                    <i className={`${(tamamlamaTalebi.kanit_dosya_url || tamamlamaTalebi.kanit_dosya_adi) ? 'ri-check-line' : 'ri-close-line'} w-3 h-3 flex items-center justify-center`}></i>
                    <span>Kanıt dökümanı bilgisi</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex space-x-3 bg-gray-50">
              <button
                onClick={() => {
                  setShowTamamlamaModal(false);
                  setFormErrors({ aciklama: '', dokuman: '' });
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer font-medium"
              >
                ❌ İptal
              </button>
              <button
                onClick={handleTamamlamaTalebiGonder}
                disabled={
                  !tamamlamaTalebi.kullanici_aciklamasi.trim() ||
                  tamamlamaTalebi.kullanici_aciklamasi.trim().length < 20 ||
                  (!tamamlamaTalebi.kanit_dosya_url && !tamamlamaTalebi.kanit_dosya_adi)
                }
                className={`flex-2 px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer font-medium ${!tamamlamaTalebi.kullanici_aciklamasi.trim() || tamamlamaTalebi.kullanici_aciklamasi.trim().length < 20 || (!tamamlamaTalebi.kanit_dosya_url && !tamamlamaTalebi.kanit_dosya_adi) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-105 shadow-lg'
                  }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <i className="ri-send-plane-line w-4 h-4 flex items-center justify-center"></i>
                  <span>🚀 Tamamlama Talebini Gönder</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
