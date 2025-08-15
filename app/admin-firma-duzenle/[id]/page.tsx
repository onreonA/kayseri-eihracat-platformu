
import { Suspense } from 'react';
import AdminFirmaDuzenleClient from './AdminFirmaDuzenleClient';

// 🔧 扩展的 generateStaticParams - 支持更多 ADMIN 公司 ID
export async function generateStaticParams() {
  const staticParams = [];
  
  // 1-100 范围内的所有公司 ID（大幅扩展范围以避免运行时错误）
  for (let i = 1; i <= 100; i++) {
    staticParams.push({ id: i.toString() });
  }
  
  // 添加一些特殊的 ID 情况
  const specialIds = ['200', '300', '500', '999'];
  specialIds.forEach(id => {
    staticParams.push({ id });
  });
  
  console.log('📋 Admin 公司编辑参数已创建:', staticParams.length);
  return staticParams;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminFirmaDuzenlePage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">公司编辑页面加载中...</p>
        </div>
      </div>
    }>
      <AdminFirmaDuzenleClient firmaId={id} />
    </Suspense>
  );
}
