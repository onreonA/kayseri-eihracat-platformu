import { Suspense } from 'react';
import ProjeDuzenleClient from './ProjeDuzenleClient';

// 🔧 GÜÇLENDİRİLMİŞ generateStaticParams - ADMIN PROJE DÜZENLE
export async function generateStaticParams() {
  // Dinamik rota için tüm olası parametreleri oluştur
  const staticParams = [];
  
  // 1-20 arası tüm ID'leri ekle
  for (let i = 1; i <= 20; i++) {
    staticParams.push({ id: i.toString() });
  }
  
  console.log('📋 Admin proje düzenle parametreleri oluşturuldu:', staticParams.length);
  return staticParams;
}

export default function AdminProjeDuzenlePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Proje düzenleme sayfası yükleniyor...</p>
        </div>
      </div>
    }>
      <ProjeDuzenleClient projeId={params.id} />
    </Suspense>
  );
}