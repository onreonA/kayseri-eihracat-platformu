
import AltProjeDetayClient from './AltProjeDetayClient';

// 🔧 Genişletilmiş generateStaticParams - Daha kapsamlı alt proje ID'leri
export async function generateStaticParams() {
  const staticParams = [];
  
  // 1-100 aralığındaki tüm alt proje ID'leri (geniş kapsama için)
  for (let i = 1; i <= 100; i++) {
    staticParams.push({ alt_proje_id: i.toString() });
  }
  
  // Ek özel ID durumları
  const specialIds = ['150', '200', '500', '999'];
  specialIds.forEach(id => {
    staticParams.push({ alt_proje_id: id });
  });

  console.log('Alt proje detay statik parametreleri oluşturuldu:', staticParams.length);
  return staticParams;
}

export default function AltProjeDetayPage({ params }: { params: { alt_proje_id: string } }) {
  return <AltProjeDetayClient altProjeId={params.alt_proje_id} />;
}
