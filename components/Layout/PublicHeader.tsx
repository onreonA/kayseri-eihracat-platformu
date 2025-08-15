'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PublicHeader() {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Sol Taraf - Hamburger Menu */}
          <div className="flex items-center">
            <button
              onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}
              className="w-10 h-10 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-all duration-300 cursor-pointer"
            >
              <i className="ri-menu-line text-2xl"></i>
            </button>
          </div>

          {/* Orta - Logo */}
          <div className="flex-1 flex justify-center">
            <Link href="/" className="flex items-center cursor-pointer">
              <img
                src="https://static.readdy.ai/image/24aa2a118c1d89bdb327761b85495631/a135913a0f4bf368c862bb32d08543dd.png"
                alt="İhracat Akademi Logo"
                className="h-12 w-auto hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>

          {/* Sağ Taraf - Kariyer Merkezi ve Giriş */}
          <div className="flex items-center space-x-4">
            <Link
              href="/kariyer-merkezi"
              className="hidden md:inline-flex text-gray-700 hover:text-blue-600 font-medium transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Kariyer Merkezi
            </Link>

            {/* Giriş Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLoginDropdown(!showLoginDropdown)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 whitespace-nowrap cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <span>Giriş</span>
                <i className={`ri-arrow-down-s-line transition-transform duration-200 ${showLoginDropdown ? 'rotate-180' : ''}`}></i>
              </button>

              {/* Dropdown Menu */}
              {showLoginDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200/50 z-50">
                  <div className="py-2">
                    <Link
                      href="/login"
                      className="flex items-center space-x-3 px-4 py-3 hover:bg-blue-50 transition-colors cursor-pointer text-gray-700 hover:text-blue-600"
                    >
                      <i className="ri-building-line"></i>
                      <span>Firma Girişi</span>
                    </Link>
                    <Link
                      href="/admin-login"
                      className="flex items-center space-x-3 px-4 py-3 hover:bg-blue-50 transition-colors cursor-pointer text-gray-700 hover:text-blue-600"
                    >
                      <i className="ri-admin-line"></i>
                      <span>Admin Girişi</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hamburger Side Menu */}
      <div className={`fixed inset-0 z-50 ${isSideMenuOpen ? 'block' : 'hidden'}`}>
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSideMenuOpen(false)}
        ></div>

        {/* Side Menu */}
        <div className={`absolute left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-out ${isSideMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <img
                src="https://static.readdy.ai/image/24aa2a118c1d89bdb327761b85495631/a135913a0f4bf368c862bb32d08543dd.png"
                alt="İhracat Akademi Logo"
                className="h-10 w-auto"
              />
              <button
                onClick={() => setIsSideMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
          </div>

          <nav className="p-6 space-y-2 bg-white h-full overflow-y-auto">
            <Link
              href="/"
              onClick={() => setIsSideMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
            >
              <i className="ri-home-line"></i>
              <span>Ana Sayfa</span>
            </Link>

            <Link
              href="/#neden-katilmalisiniz"
              onClick={() => setIsSideMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
            >
              <i className="ri-question-line"></i>
              <span>Neden Katılmalısınız</span>
            </Link>

            <Link
              href="/#sagladigimiz-faydalar"
              onClick={() => setIsSideMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
            >
              <i className="ri-gift-line"></i>
              <span>Sağladığımız Faydalar</span>
            </Link>

            <Link
              href="/#basarilarimiz"
              onClick={() => setIsSideMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
            >
              <i className="ri-trophy-line"></i>
              <span>Başarılarımız</span>
            </Link>

            <Link
              href="/#proje-akisim"
              onClick={() => setIsSideMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
            >
              <i className="ri-flow-chart"></i>
              <span>Proje Akışım</span>
            </Link>

            {/* Platformum Submenu */}
            <div className="space-y-1 bg-white">
              <div className="flex items-center space-x-3 px-4 py-3 text-gray-700 font-medium bg-white">
                <i className="ri-dashboard-line"></i>
                <span>Platformum</span>
              </div>
              <div className="pl-10 space-y-1 bg-white">
                <Link
                  href="/egitimlerim"
                  onClick={() => setIsSideMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-sm bg-white"
                >
                  <i className="ri-graduation-cap-line"></i>
                  <span>Eğitimlerim</span>
                </Link>
                <Link
                  href="/forum"
                  onClick={() => setIsSideMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-sm bg-white"
                >
                  <i className="ri-discuss-line"></i>
                  <span>Forum</span>
                </Link>
                <Link
                  href="/donem-raporlari"
                  onClick={() => setIsSideMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-sm bg-white"
                >
                  <i className="ri-file-chart-line"></i>
                  <span>Raporlama</span>
                </Link>
                <Link
                  href="/destek-merkezi"
                  onClick={() => setIsSideMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-sm bg-white"
                >
                  <i className="ri-customer-service-line"></i>
                  <span>Destek Merkezi</span>
                </Link>
              </div>
            </div>

            <Link
              href="/#iletisim"
              onClick={() => setIsSideMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
            >
              <i className="ri-phone-line"></i>
              <span>İletişim</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* Login Dropdown Overlay */}
      {showLoginDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowLoginDropdown(false)}
        ></div>
      )}
    </header>
  );
}