import { Suspense } from 'react';
import AltProjeDuzenleClient from './AltProjeDuzenleClient';

export async function generateStaticParams() {
  // Reduced to prevent Vercel build size limit
  const staticParams = [];
  
  // Only generate for first 5 projects with 5 sub-projects each (25 total instead of 10,000)
  for (let projeId = 1; projeId <= 5; projeId++) {
    for (let altProjeId = 1; altProjeId <= 5; altProjeId++) {
      staticParams.push({ 
        projeId: projeId.toString(), 
        altProjeId: altProjeId.toString() 
      });
    }
  }
  
  console.log('📋 Alt proje düzenleme parametreleri oluşturuldu (reduced):', staticParams.length, 'parametre');
  
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