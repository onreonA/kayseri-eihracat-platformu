'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 🔧 HATA ÇÖZÜMÜ: /proje-takvimi yönlendirmesi
export default function ProjeTakvimiPage() {
  const router = useRouter();

  useEffect(() => {
    console.log('🔄 /proje-takvimi sayfasından /projelerim sayfasına yönlendiriliyor...');
    router.replace('/projelerim');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Projelerim sayfasına yönlendiriliyor...</p>
      </div>
    </div>
  );
}