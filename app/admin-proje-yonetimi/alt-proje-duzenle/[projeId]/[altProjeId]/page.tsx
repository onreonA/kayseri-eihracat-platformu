import { Suspense } from 'react';
import AltProjeDuzenleClient from './AltProjeDuzenleClient';

export async function generateStaticParams() {
  const staticParams = [];
  
  // 1-100 arası proje ID'leri ve 1-500 arası alt proje ID'leri için parametre oluştur
  for (let projeId = 1; projeId <= 100; projeId++) {
    for (let altProjeId = 1; altProjeId <= 100; altProjeId++) {
      staticParams.push({ 
        projeId: projeId.toString(), 
        altProjeId: altProjeId.toString() 
      });
    }
  }
  
  console.log('📋 Alt proje düzenleme parametreleri oluşturuldu:', staticParams.length, 'parametre');
  
  return staticParams;
}

interface PageProps {
  params: Promise<{ projeId: string; altProjeId: string }>;
}

export default async function AltProjeDuzenlePage({ params }: PageProps) {
  const { projeId, altProjeId } = await params;
  console.log('🚀 Alt proje düzenleme sayfası yükleniyor:', {
    projeId,
    altProjeId
  });
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Alt proje düzenleme formu yükleniyor...</p>
          <p className="text-sm text-gray-500 mt-2">
            Proje: {projeId}, Alt Proje: {altProjeId}
          </p>
        </div>
      </div>
    }>
            <AltProjeDuzenleClient 
        projeId={projeId} 
        altProjeId={altProjeId}
      />
    </Suspense>
  );
}