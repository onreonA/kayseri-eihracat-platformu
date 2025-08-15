
import { Suspense } from 'react';
import ProjeDetayClient from './ProjeDetayClient';

// 🔧 TAMAMEN DÜZELTİLMİŞ generateStaticParams - ADMIN PROJE DETAY
export async function generateStaticParams() {
  // GENİŞLETİLMİŞ statik parametre listesi - 1-100 arası tüm ID'ler
  const staticParams = [];
  
  // 1-100 arası tüm ID'leri ekle (daha geniş kapsam)
  for (let i = 1; i <= 100; i++) {
    staticParams.push({ id: i.toString() });
  }
  
  // Özel durumlar için ek parametreler
  const specialIds = ['new', 'create', 'test', 'demo'];
  specialIds.forEach(id => {
    staticParams.push({ id });
  });
  
  console.log('📋 Admin proje detay parametreleri oluşturuldu:', staticParams.length, 'parametre');
  
  return staticParams;
}

export default function AdminProjeDetayPage({ params }: { params: { id: string } }) {
  console.log('🚀 Admin proje detay sayfası yükleniyor, ID:', params.id);
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Admin proje detayları yükleniyor...</p>
        </div>
      </div>
    }>
      <ProjeDetayClient projeId={params.id} />
    </Suspense>
  );
}
