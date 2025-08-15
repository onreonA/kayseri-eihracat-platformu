
import { Suspense } from 'react';
import ProjeDetayClient from './ProjeDetayClient';

// 🔧 Genişletilmiş generateStaticParams - Daha geniş ID aralığı
export async function generateStaticParams() {
  const staticParams = [];
  
  // 1-200 arasındaki tüm ID'ler için statik parametreler oluştur
  for (let i = 1; i <= 200; i++) {
    staticParams.push({ id: i.toString() });
  }
  
  // Ek özel ID'ler ekle
  const specialIds = ['300', '400', '500', '999', '1000'];
  specialIds.forEach(id => {
    staticParams.push({ id });
  });
  
  console.log('📋 Proje detay statik parametreleri oluşturuldu:', staticParams.length, 'adet');
  return staticParams;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjeDetayPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Proje detayları yükleniyor...</p>
          <p className="text-sm text-gray-500 mt-2">Proje ID: {id}</p>
        </div>
      </div>
    }>
      <ProjeDetayClient projeId={id} />
    </Suspense>
  );
}
