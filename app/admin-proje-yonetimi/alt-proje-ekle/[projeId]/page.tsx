import { Suspense } from 'react';
import AltProjeEkleClient from './AltProjeEkleClient';

export async function generateStaticParams() {
  const staticParams = [];
  
  // 1-100 arası tüm proje ID'leri için parametre oluştur
  for (let i = 1; i <= 100; i++) {
    staticParams.push({ projeId: i.toString() });
  }
  
  console.log('📋 Alt proje ekle parametreleri oluşturuldu:', staticParams.length, 'parametre');
  
  return staticParams;
}

export default function AltProjeEklePage({ params }: { params: { projeId: string } }) {
  console.log('🚀 Alt proje ekle sayfası yükleniyor, Proje ID:', params.projeId);
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Alt proje ekleme formu yükleniyor...</p>
        </div>
      </div>
    }>
      <AltProjeEkleClient projeId={params.projeId} />
    </Suspense>
  );
}