/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/certificate/generate': [
      './public/fonts/**/*',
      './public/certificate-template.png',
    ],
  },
};

export default nextConfig;
