import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Experimental features including Server Actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increase limit to 50MB for file uploads
    },
  },
  
  // Compiler options to handle third-party integrations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;
