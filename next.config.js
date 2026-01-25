/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bkypfuyiknytkuhxtduc.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Increase API route timeout for receipt processing
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Configure serverless function size
  serverComponentsExternalPackages: ['sharp'],
}

module.exports = nextConfig
