/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg', '@neondatabase/serverless'],
  outputFileTracingRoot: process.cwd(),
};

module.exports = nextConfig;
