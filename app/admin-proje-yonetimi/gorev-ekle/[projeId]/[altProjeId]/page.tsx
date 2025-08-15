import { Suspense } from 'react';
import AltProjeGorevEkleClient from './AltProjeGorevEkleClient';

// 🔧 generateStaticParams - ALT PROJE GÖREV EKLEME
export async function generateStaticParams() {
  const staticParams = [];
  
  // Proje ID'leri 1-100 arası, Alt Proje ID'leri 1-50 arası
  for (let projeId = 1; projeId <= 100; projeId++) {
    for (let altProjeId = 1; altProjeId <= 50; altProjeId++) {
      staticParams.push({ 
        projeId: projeId.toString(), 
        altProjeId: altProjeId.toString() 
      });
    }
  }
  
  console.log('📋 Alt proje görev ekleme parametreleri oluşturuldu:', staticParams.length);
  return staticParams;
}

export default function AltProjeGorevEklePage({ params }: { params: { projeId: string; altProjeId: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Alt proje görev ekleme sayfası yükleniyor...</p>
        </div>
      </div>
    }>
      <AltProjeGorevEkleClient projeId={params.projeId} altProjeId={params.altProjeId} />
    </Suspense>
  );
}