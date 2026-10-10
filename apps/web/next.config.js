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
  experimental: {
    typedRoutes: true
  }
};

module.exports = nextConfig;
