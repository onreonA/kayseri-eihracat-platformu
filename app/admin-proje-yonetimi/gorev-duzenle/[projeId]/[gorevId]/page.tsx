
import { Suspense } from 'react';
import GorevDuzenleClient from './GorevDuzenleClient';

// 🔧 UPDATED generateStaticParams - PROJE ve GÖREV ID DESTEĞİ
export async function generateStaticParams() {
  const staticParams = [];
  
  // Reduced for Vercel build size limit: 5x5 = 25 total  
  for (let projeId = 1; projeId <= 5; projeId++) {
    for (let gorevId = 1; gorevId <= 5; gorevId++) {
      staticParams.push({ 
        projeId: projeId.toString(), 
        gorevId: gorevId.toString() 
      });
    }
  }
  
  console.log('📋 Görev düzenleme parametreleri oluşturuldu:', staticParams.length);
  return staticParams;
}

interface PageProps {
  params: Promise<{ projeId: string; gorevId: string }>;
}

export default async function GorevDuzenlePage({ params }: PageProps) {
  const { projeId, gorevId } = await params;
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Görev düzenleme sayfası yükleniyor...</p>
        </div>
      </div>
    }>
      <GorevDuzenleClient projeId={projeId} gorevId={gorevId} />
    </Suspense>
  );
}
