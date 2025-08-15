
import AltProjelerClient from './AltProjelerClient';

// 🔧 Genişletilmiş generateStaticParams - Daha geniş ID kapsamı
export async function generateStaticParams() {
  const staticParams = [];
  
  // 1-50 aralığındaki tüm ana proje ID'leri (kapsamlı kapsama için)
  for (let i = 1; i <= 50; i++) {
    staticParams.push({ ana_proje_id: i.toString() });
  }
  
  // Ek özel ID durumları
  const specialIds = ['100', '200', '999'];
  specialIds.forEach(id => {
    staticParams.push({ ana_proje_id: id });
  });
  
  console.log('Alt projeler statik parametreleri oluşturuldu:', staticParams.length);
  return staticParams;
}

export default function AltProjelerPage({ params }: { params: { ana_proje_id: string } }) {
  return <AltProjelerClient anaProjeId={params.ana_proje_id} />;
}
