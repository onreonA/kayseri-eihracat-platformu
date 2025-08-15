
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ContactForm from '@/components/ContactForm';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);

  const slides = [
    {
      id: 1,
      title: "Global Pazarlara Açılın",
      subtitle: "E-ihracat ile dünya pazarlarında yerinizi alın",
      image: "https://readdy.ai/api/search-image?query=Modern%20business%20professionals%20working%20on%20global%20trade%20and%20e-export%20platform%20with%20world%20map%20background%20showing%20international%20connections%2C%20digital%20commerce%20interface%2C%20professional%20corporate%20environment%20with%20blue%20and%20white%20color%20scheme&width=1200&height=600&seq=slide1&orientation=landscape",
      cta: "Hemen Başlayın"
    },
    {
      id: 2,
      title: "Kapsamlı Eğitim Modülleri",
      subtitle: "Uzman eğitmenlerden e-ihracat süreçlerini öğrenin",
      image: "https://readdy.ai/api/search-image?query=Professional%20training%20session%20with%20modern%20classroom%20setting%2C%20business%20people%20learning%20digital%20export%20processes%2C%20interactive%20presentations%20on%20screens%2C%20corporate%20training%20environment%20with%20modern%20design&width=1200&height=600&seq=slide2&orientation=landscape",
      cta: "Eğitimleri İncele"
    },
    {
      id: 3,
      title: "Proje Yönetim Dashboard",
      subtitle: "Tüm süreçlerinizi tek platformdan yönetin",
      image: "https://readdy.ai/api/search-image?query=Modern%20project%20management%20dashboard%20interface%20on%20computer%20screens%2C%20data%20analytics%20charts%20and%20graphs%2C%20business%20intelligence%20visualization%2C%20clean%20corporate%20office%20environment%20with%20professional%20lighting&width=1200&height=600&seq=slide3&orientation=landscape",
      cta: "Dashboard'u Görün"
    }
  ];

  useEffect(() => {
    setMounted(true);

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const slideInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(slideInterval);
  }, [mounted, slides.length]);

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('ChunkLoadError')) {
        console.log('检测到chunk加载错误，正在刷新页面...');
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 1000);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.toString().includes('ChunkLoadError')) {
        console.log('检测到chunk promise rejection，正在刷新页面...');
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 1000);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleChunkError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleChunkError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">加载出现问题</h1>
          <p className="text-gray-600 mb-4">页面正在刷新，请稍等...</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer"
          >
            手动刷新
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Header */}
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
                href="#neden-katilmalisiniz"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
              >
                <i className="ri-question-line"></i>
                <span>Neden Katılmalısınız</span>
              </Link>

              <Link
                href="#sagladigimiz-faydalar"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
              >
                <i className="ri-gift-line"></i>
                <span>Sağladığımız Faydalar</span>
              </Link>

              <Link
                href="#basarilarimiz"
                onClick={() => setIsSideMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer bg-white"
              >
                <i className="ri-trophy-line"></i>
                <span>Başarılarımız</span>
              </Link>

              <Link
                href="#proje-akisim"
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
                href="#iletisim"
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

      {/* Hero Section with Slider */}
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === activeSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  // 图片加载失败时的fallback
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/40"></div>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
                <i className="ri-government-line mr-2"></i>
                T.C. Ticaret Bakanlığı Destekli
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              E-İhracat Tanıtım
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Destek Platformu
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8 leading-relaxed">
              {slides[activeSlide]?.subtitle || "E-ihracat ile dünya pazarlarında yerinizi alın"}
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
              <Link
                href="/login"
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 whitespace-nowrap cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {slides[activeSlide]?.cta || "Hemen Başlayın"}
              </Link>
              <Link
                href="#sagladigimiz-faydalar"
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300 whitespace-nowrap cursor-pointer backdrop-blur-sm"
              >
                Faydaları Keşfet
              </Link>
            </div>
          </div>
        </div>

        {/* Slider Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
                index === activeSlide
                  ? 'bg-white scale-125'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Neden Katılmalısınız Section */}
      <section id="neden-katilmalisiniz" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
              <i className="ri-question-line mr-2"></i>
              Neden Bu Platform?
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Neden Katılmalısınız?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              STK'lar ve odalar için dijital dönüşümün gücünü keşfedin. Kurumsal büyümeye odaklı çözümlerimizle fark yaratın.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <i className="ri-building-4-line text-white text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Kurumsal Güçlenme</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Üye firmalarınızın e-ihracat kapasitelerini artırarak kurumunuzun sektördeki etki gücünü
                    büyütün. Dijital dönüşüm liderliğinizi pekiştirin.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <i className="ri-award-line text-white text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Prestij ve Tanınırlık</h3>
                  <p className="text-gray-600 leading-relaxed">
                    T.C. Ticaret Bakanlığı destekli projelerle kurumunuzun prestijini artırın.
                    Başarılı projelerin öncüsü olarak sektörde öne çıkın.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <i className="ri-line-chart-line text-white text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Ölçülebilir Çıktılar</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Detaylı raporlama sistemi ile üye firmalarınızın gelişimini takip edin.
                    Başarı hikayelerini somut verilerle destekleyin.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <i className="ri-rocket-line text-white text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Dijitalleşme Öncülüğü</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Sektörünüzde dijital dönüşümün öncüsü olun. Modern teknolojilerle donatılmış
                    platformumuzla geleceğin ticaretine bugünden hazırlanın.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://readdy.ai/api/search-image?query=Modern%20corporate%20building%20with%20glass%20facade%20representing%20institutional%20strength%20and%20prestige%2C%20business%20professionals%20in%20suits%20walking%2C%20Turkish%20flag%20visible%2C%20government%20building%20architecture%20with%20blue%20sky%20background&width=600&height=800&seq=institution-strength&orientation=portrait"
                alt="Kurumsal Güçlenme"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Sağladığımız Faydalar Section */}
      <section id="sagladigimiz-faydalar" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-600 rounded-full text-sm font-medium mb-4">
              <i className="ri-gift-line mr-2"></i>
              Sunduğumuz Değer
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Sağladığımız Faydalar</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              E-ihracat sürecinizin her adımında yanınızdayız. Kapsamlı çözümlerimizle global pazarlara açılın.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* B2B/B2C Pazaryerleri */}
            <div className="group bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-200 hover:border-blue-300">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <i className="ri-store-2-line text-white text-2xl"></i>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">B2B/B2C Pazaryerlerine Açılım</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Amazon, eBay, Alibaba gibi global pazaryerlerinde mağaza kurulumu, ürün listeleme
                ve satış optimizasyonu konularında kapsamlı destek alın.
              </p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
                <span>Detayları İnceleyin</span>
                <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>

            {/* SGS & BV Denetimleri */}
            <div className="group bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-200 hover:border-green-300">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <i className="ri-shield-check-line text-white text-2xl"></i>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">SGS & BV Denetimleri</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Uluslararası kalite standartlarına uygunluk için SGS ve Bureau Veritas gibi
                prestijli kuruluşlardan denetim ve sertifikasyon süreçlerinde rehberlik.
              </p>
              <div className="flex items-center text-green-600 font-semibold group-hover:text-green-700 transition-colors">
                <span>Süreçleri Öğrenin</span>
                <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>

            {/* Dijital Pazarlama */}
            <div className="group bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-200 hover:border-purple-300">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <i className="ri-advertisement-line text-white text-2xl"></i>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Dijital Pazarlama</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Google Ads, Facebook Business, LinkedIn Marketing gibi platformlarda
                etkili reklam kampanyaları oluşturma ve yönetme stratejileri.
              </p>
              <div className="flex items-center text-purple-600 font-semibold group-hover:text-purple-700 transition-colors">
                <span>Stratejileri Keşfedin</span>
                <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>

            {/* Devlet Destekleri */}
            <div className="group bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-200 hover:border-orange-300">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <i className="ri-government-line text-white text-2xl"></i>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Devlet Destekleri</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                KOSGEB, İşkur, TİM destekleri başvuru süreçlerinde profesyonel rehberlik.
                Hibe ve teşvik imkanlarından maksimum fayda sağlayın.
              </p>
              <div className="flex items-center text-orange-600 font-semibold group-hover:text-orange-700 transition-colors">
                <span>Destekleri Görün</span>
                <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>

            {/* Raporlama */}
            <div className="group bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-indigo-200 hover:border-indigo-300">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <i className="ri-bar-chart-box-line text-white text-2xl"></i>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Detaylı Raporlama</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Satış performansı, pazar analizi, ROI hesaplamaları ve büyüme trendleri
                ile iş zekası raporları. Veriye dayalı kararlar alın.
              </p>
              <div className="flex items-center text-indigo-600 font-semibold group-hover:text-indigo-700 transition-colors">
                <span>Raporları İnceleyin</span>
                <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>

            {/* Eğitim ve Sertifikasyon */}
            <div className="group bg-gradient-to-br from-teal-50 to-teal-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-teal-200 hover:border-teal-300">
              <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <i className="ri-graduation-cap-line text-white text-2xl"></i>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Eğitim ve Sertifikasyon</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Uzman eğitmenlerden e-ihracat, dijital pazarlama ve uluslararası ticaret
                konularında kapsamlı eğitimler. Sertifikalı programlarla uzmanlaşın.
              </p>
              <div className="flex items-center text-teal-600 font-semibold group-hover:text-teal-700 transition-colors">
                <span>Eğitimlere Başlayın</span>
                <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Başarılarımız Section */}
      <section id="basarilarimiz" className="py-20 bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
              <i className="ri-trophy-line mr-2"></i>
              Kanıtlanmış Başarı
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Başarılarımız</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              İlk fazda 20 firma ile elde ettiğimiz somut sonuçlar. Dijital dönüşümde öncü projelerin rakamları.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold text-blue-300 mb-2">20</div>
              <div className="text-blue-100 font-medium">Pilot Firma</div>
              <div className="text-sm text-blue-200 mt-2">İlk faz katılımcıları</div>
            </div>

            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold text-green-300 mb-2">₺15M+</div>
              <div className="text-blue-100 font-medium">İhracat Hacmi</div>
              <div className="text-sm text-blue-200 mt-2">6 aylık dönem sonucu</div>
            </div>

            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold text-purple-300 mb-2">45</div>
              <div className="text-blue-100 font-medium">Eğitim Modülü</div>
              <div className="text-sm text-blue-200 mt-2">Uzman eğitmen desteği</div>
            </div>

            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold text-orange-300 mb-2">1,200+</div>
              <div className="text-blue-100 font-medium">İşlem Hareketi</div>
              <div className="text-sm text-blue-200 mt-2">Platform aktivitesi</div>
            </div>
          </div>

          {/* Success Stories */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <i className="ri-global-line text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Global Market Entry</h3>
              <p className="text-blue-100 leading-relaxed mb-4">
                Pilot firmalarimizin %75'i 6 ay içinde yeni pazarlara giriş yaptı.
                Amazon ve eBay'de ortalama %340 satış artışı kaydedildi.
              </p>
              <div className="flex items-center text-blue-300">
                <span className="text-sm font-medium">Detaylı Rapor</span>
                <i className="ri-arrow-right-line ml-2"></i>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center mb-6">
                <i className="ri-team-line text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Kapasite Geliştirme</h3>
              <p className="text-blue-100 leading-relaxed mb-4">
                Eğitim programlarımız sayesinde firma çalışanlarının e-ihracat bilgi düzeyi
                ortalama %85 arttı. 180+ sertifika verildi.
              </p>
              <div className="flex items-center text-blue-300">
                <span className="text-sm font-medium">Eğitim Sonuçları</span>
                <i className="ri-arrow-right-line ml-2"></i>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <i className="ri-funds-line text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Destek Başarısı</h3>
              <p className="text-blue-100 leading-relaxed mb-4">
                Pilot firmalarımız ₺3.2M değerinde devlet desteği aldı.
                Başvuru süreçlerinde %90 başarı oranına ulaşıldı.
              </p>
              <div className="flex items-center text-blue-300">
                <span className="text-sm font-medium">Destek Detayları</span>
                <i className="ri-arrow-right-line ml-2"></i>
              </div>
            </div>
          </div>

          {/* Visual Success Indicators */}
          <div className="mt-16 text-center">
            <img
              src="https://readdy.ai/api/search-image?query=Professional%20business%20dashboard%20with%20charts%20and%20graphs%20showing%20export%20growth%20statistics%2C%20modern%20analytics%20interface%20with%20Turkish%20business%20data%20visualization%2C%20success%20metrics%20on%20computer%20screen&width=800&height=400&seq=success-dashboard&orientation=landscape"
              alt="Başarı Göstergeleri"
              className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      </section>

      {/* Proje Akışım Section */}
      <section id="proje-akisim" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-medium mb-4">
              <i className="ri-flow-chart mr-2"></i>
              Süreç Yönetimi
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Proje Akışım</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              E-ihracat yolculuğunuzun her adımını profesyonel rehberlik ile planlı şekilde ilerletin.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {/* Phase 1 */}
              <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Başvuru ve Değerlendirme</h3>
                  <p className="text-gray-600 mb-3">
                    Firma profili analizi, e-ihracat potansiyeli değerlendirmesi ve uygunluk tespiti.
                  </p>
                  <div className="text-sm text-blue-600 font-medium">Süre: 1-2 hafta</div>
                </div>
              </div>

              {/* Phase 2 */}
              <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Eğitim ve Sertifikasyon</h3>
                  <p className="text-gray-600 mb-3">
                    Kapsamlı eğitim modülleri, uzman mentörlük ve e-ihracat sertifikasyonu programı.
                  </p>
                  <div className="text-sm text-green-600 font-medium">Süre: 6-8 hafta</div>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Platform Kurulum</h3>
                  <p className="text-gray-600 mb-3">
                    Pazaryeri mağaza kurulumu, ürün listeleme, SEO optimizasyonu ve ödeme sistemleri.
                  </p>
                  <div className="text-sm text-purple-600 font-medium">Süre: 3-4 hafta</div>
                </div>
              </div>

              {/* Phase 4 */}
              <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Pazarlama ve Satış</h3>
                  <p className="text-gray-600 mb-3">
                    Dijital reklam kampanyaları, influencer pazarlaması ve satış optimizasyonu stratejileri.
                  </p>
                  <div className="text-sm text-orange-600 font-medium">Süre: Devam Eden</div>
                </div>
              </div>

              {/* Phase 5 */}
              <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  5
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">İzleme ve Raporlama</h3>
                  <p className="text-gray-600 mb-3">
                    Performans analizi, ROI hesaplamaları ve büyüme stratejileri ile sürekli iyileştirme.
                  </p>
                  <div className="text-sm text-indigo-600 font-medium">Süre: Sürekli</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://readdy.ai/api/search-image?query=Modern%20project%20workflow%20visualization%20with%20step-by-step%20process%20diagram%2C%20professional%20business%20process%20infographic%2C%20digital%20transformation%20roadmap%20with%20connecting%20arrows%20and%20milestones&width=600&height=800&seq=project-flow&orientation=portrait"
                alt="Proje Akış Şeması"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">E-İhracat Yolculuğunuza Başlayın</h2>
            <p className="text-xl md:text-2xl text-blue-100 mb-10 leading-relaxed">
              T.C. Ticaret Bakanlığı destekli platformumuzla global pazarlarda yerinizi alın.
              Dijital dönüşümün gücünü keşfedin.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-lg mx-auto">
              <Link
                href="/login"
                className="bg-white text-blue-600 px-10 py-5 rounded-xl font-bold hover:bg-gray-100 transition-all duration-300 whitespace-nowrap cursor-pointer text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Hemen Başlayın
              </Link>
              <Link
                href="#iletisim"
                className="border-2 border-white text-white px-10 py-5 rounded-xl font-bold hover:bg-white hover:text-blue-600 transition-all duration-300 whitespace-nowrap cursor-pointer text-lg backdrop-blur-sm"
              >
                Bilgi Alın
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* İletişim Section */}
      <section id="iletisim" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6">
                <i className="ri-phone-line mr-2"></i>
                İletişime Geçin
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Size Nasıl Yardımcı Olabiliriz?</h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                E-ihracat yolculuğunuzda sorularınız mı var? Uzman ekibimiz sizleri bekliyor.
              </p>

              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <i className="ri-building-line"></i>
                  </div>
                  <div>
                    <div className="font-semibold text-white">T.C. Ticaret Bakanlığı</div>
                    <div className="text-gray-300">E-İhracat Destek Birimi</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <i className="ri-mail-line"></i>
                  </div>
                  <div>
                    <div className="font-semibold text-white">info@e-ihracat-destek.gov.tr</div>
                    <div className="text-gray-300">7/24 Destek Hattı</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <i className="ri-phone-line"></i>
                  </div>
                  <div>
                    <div className="font-semibold text-white">+90 312 xxx xx xx</div>
                    <div className="text-gray-300">Pazartesi - Cuma, 09:00 - 18:00</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6">Bilgi Talebi Formu</h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="text-3xl font-bold mb-4 font-[\\'Pacifico\\']">
                logo
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                T.C. Ticaret Bakanlığı destekli E-İhracat Tanıtım Destek Platformu.
                Firmalarınızın global pazarlarda büyümesi için kapsamlı çözümler sunuyoruz.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <i className="ri-facebook-fill text-xl"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <i className="ri-twitter-fill text-xl"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <i className="ri-linkedin-fill text-xl"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <i className="ri-instagram-fill text-xl"></i>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/egitimlerim" className="hover:text-white transition-colors cursor-pointer">
                    Eğitimlerim
                  </Link>
                </li>
                <li>
                  <Link href="/forum" className="hover:text-white transition-colors cursor-pointer">
                    Forum
                  </Link>
                </li>
                <li>
                  <Link href="/donem-raporlari" className="hover:text-white transition-colors cursor-pointer">
                    Raporlama
                  </Link>
                </li>
                <li>
                  <Link href="/destek-merkezi" className="hover:text-white transition-colors cursor-pointer">
                    Destek Merkezi
                  </Link>
                </li>
                <li>
                  <Link href="/projelerim" className="hover:text-white transition-colors cursor-pointer">
                    Projelerim
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Kurumsal</h3>
              <div className="text-gray-400 space-y-3">
                <div className="flex items-center">
                  <i className="ri-government-line mr-2"></i>
                  <span>T.C. Ticaret Bakanlığı</span>
                </div>
                <div className="flex items-center">
                  <i className="ri-shield-check-line mr-2"></i>
                  <span>NSL Savunma Bilişim</span>
                </div>
                <div className="flex items-center">
                  <i className="ri-mail-line mr-2"></i>
                  <span>destek@platform.gov.tr</span>
                </div>
                <div className="flex items-center">
                  <i className="ri-phone-line mr-2"></i>
                  <span>+90 312 xxx xx xx</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm">
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-8 mb-4 md:mb-0">
                <div className="flex items-center space-x-2">
                  <i className="ri-government-line text-blue-400"></i>
                  <span className="text-gray-400">T.C. Ticaret Bakanlığı Destekli</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="ri-shield-check-line text-green-400"></i>
                  <span className="text-gray-400">NSL Savunma Bilişim San. ve Tic. A.Ş.</span>
                </div>
              </div>
              <p className="text-gray-400">
                2024 E-İhracat Destek Platformu. Tüm hakları saklıdır.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
