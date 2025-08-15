// PROJE YÖNETİMİ VERİLERİNİ TEMİZLEME SCRIPT'İ
// Bu dosya localStorage'daki tüm proje yönetimi verilerini temizler

// Admin tarafı proje verileri
const adminProjectKeys = [
  'admin_projeler',
  'admin_gorevler', 
  'admin_proje_gorevleri',
  'admin_firma_projeleri',
  'proje_ilerlemeleri',
  'proje_durumları',
  'gorev_atamalari'
];

// User tarafı proje verileri
const userProjectKeys = [
  'firma_projeler',
  'firma_gorevler',
  'proje_takvimleri',
  'gorev_raporlari',
  'proje_ilerlemeleri',
  'user_proje_data',
  'dashboard_proje_data'
];

// Firma bazlı proje anahtarları (her firma için ayrı temizlik)
const firmaBazliKeys = [
  'firma_1_projeler',
  'firma_1_gorevler', 
  'firma_1_rapor',
  'firma_2_projeler',
  'firma_2_gorevler',
  'firma_2_rapor',
  'firma_3_projeler', 
  'firma_3_gorevler',
  'firma_3_rapor',
  'firma_6_projeler',
  'firma_6_gorevler',
  'firma_6_rapor',
  'firma_7_projeler',
  'firma_7_gorevler', 
  'firma_7_rapor'
];

// Tüm anahtarları birleştir
const allProjectKeys = [...adminProjectKeys, ...userProjectKeys, ...firmaBazliKeys];

// Temizlik fonksiyonu
function cleanupProjectData() {
  console.log('🧹 Proje Yönetimi verileri temizleniyor...');
  
  let cleanedCount = 0;
  
  allProjectKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      cleanedCount++;
      console.log(`✅ ${key} temizlendi`);
    }
  });
  
  console.log(`🎉 Temizlik tamamlandı! ${cleanedCount} proje verisi silindi.`);
  console.log('🔥 Proje Yönetimi modülü tamamen temizlendi!');
}

// Otomatik temizlik (sayfa yüklendiğinde çalışır)
if (typeof window !== 'undefined') {
  cleanupProjectData();
}

export { cleanupProjectData, allProjectKeys };