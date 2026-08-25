/** @type {import('next').NextConfig} */
const apiOrigin = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000/api/v1';

const nextConfig = {
  // The browser talks to the same origin; Next proxies API calls in previews and
  // avoids exposing localhost URLs to a user's browser.
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
