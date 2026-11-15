/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
if (process.env.NODE_ENV === 'production') {
  let validApiOrigin = false;
  try {
    const parsed = new URL(apiUrl);
    validApiOrigin = parsed.protocol === 'https:' && parsed.origin === apiUrl;
  } catch {
    validApiOrigin = false;
  }
  if (!validApiOrigin) {
    throw new Error('NEXT_PUBLIC_API_URL must be the public HTTPS API origin when building for production.');
  }
}

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  experimental: {
    typedRoutes: true
  },
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' }
    ];
    if (process.env.NODE_ENV === 'production') {
      headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
    }

    return [{ source: '/:path*', headers }];
  }
};

module.exports = nextConfig;
