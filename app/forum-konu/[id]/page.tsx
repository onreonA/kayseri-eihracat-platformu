import { Suspense } from 'react';
import ForumKonuClient from './ForumKonuClient';

// 🔧 GÜÇLENDİRİLMİŞ generateStaticParams - FORUM KONU
export async function generateStaticParams() {
  const staticParams = [];
  
  // 1-50 arası forum konu ID'leri
  for (let i = 1; i <= 50; i++) {
    staticParams.push({ id: i.toString() });
  }
  
  console.log('📋 Forum konu parametreleri oluşturuldu:', staticParams.length);
  return staticParams;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ForumKonuPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Forum konusu yükleniyor...</p>
        </div>
      </div>
    }>
      <ForumKonuClient konuId={id} />
    </Suspense>
  );
}