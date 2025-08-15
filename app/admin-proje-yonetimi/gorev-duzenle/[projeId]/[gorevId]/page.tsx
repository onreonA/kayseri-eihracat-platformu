
import { Suspense } from 'react';
import GorevDuzenleClient from './GorevDuzenleClient';

// 🔧 UPDATED generateStaticParams - PROJE ve GÖREV ID DESTEĞİ
export async function generateStaticParams() {
  const staticParams = [];
  
  // Proje ID'leri 1-100 arası, Görev ID'leri 1-200 arası
  for (let projeId = 1; projeId <= 100; projeId++) {
    for (let gorevId = 1; gorevId <= 50; gorevId++) {
      staticParams.push({ 
        projeId: projeId.toString(), 
        gorevId: gorevId.toString() 
      });
    }
  }
  
  console.log('📋 Görev düzenleme parametreleri oluşturuldu:', staticParams.length);
  return staticParams;
}

export default function GorevDuzenlePage({ params }: { params: { projeId: string; gorevId: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Görev düzenleme sayfası yükleniyor...</p>
        </div>
      </div>
    }>
      <GorevDuzenleClient projeId={params.projeId} gorevId={params.gorevId} />
    </Suspense>
  );
}
