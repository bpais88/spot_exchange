/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@spot-exchange/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@spot-exchange/database'],
  },
};

module.exports = nextConfig;