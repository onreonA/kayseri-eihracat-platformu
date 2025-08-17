const path = require('path'); // BUNU EN ÜSTE EKLEYİN

/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    domains: [
      'ui-avatars.com',
      'supabase.co',
      'ihracatakademi.com',
      'www.ihracatakademi.com'
    ]
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'ihracat-akademisi',
    APP_VERSION: '2.8.0'
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://www.ihracatakademi.com' 
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin-dashboard',
        permanent: true,
      },
      {
        source: '/dashboard',
        destination: '/unified-dashboard',
        permanent: false,
      },
      // Redirect non-www to www in production
      ...(process.env.NODE_ENV === 'production' ? [
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: 'ihracatakademi.com',
            },
          ],
          destination: 'https://www.ihracatakademi.com/:path*',
          permanent: true,
        },
      ] : []),
    ];
  },
  
  // Rewrites for API and SEO
  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap',
      },
      {
        source: '/robots.txt',
        destination: '/api/robots',
      },
    ];
  },
  
// Webpack configuration
webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
  // Path alias configuration for @ symbol
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, '.'),
  };
  
  // Optimize bundle size
  config.optimization = {
    ...config.optimization,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  };
  
  return config;
},
  
  // Enable TypeScript error checking
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Output configuration for static export if needed
  output: 'standalone',
  
  // Note: i18n will be implemented later with App Router compatible approach
};

module.exports = nextConfig;
