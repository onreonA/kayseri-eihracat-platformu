
import { Suspense } from 'react';
import GorevEkleClient from './GorevEkleClient';

// 🔧 UPDATED generateStaticParams - PROJE ve ALT PROJE ID DESEğİNİ
export async function generateStaticParams() {
  const staticParams = [];
  
  // Proje ID'leri 1-100 arası (geniş destek)
  for (let projeId = 1; projeId <= 100; projeId++) {
    staticParams.push({ projeId: projeId.toString() });
  }
  
  console.log('📋 Görev ekleme parametreleri oluşturuldu:', staticParams.length);
  return staticParams;
}

interface PageProps {
  params: Promise<{ projeId: string }>;
}

export default async function GorevEklePage({ params }: PageProps) {
  const { projeId } = await params;
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Görev ekleme sayfası yükleniyor...</p>
        </div>
      </div>
    }>
      <GorevEkleClient projeId={projeId} />
    </Suspense>
  );
}
