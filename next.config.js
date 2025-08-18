/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.css': ['css-loader'],
      },
    },
  },
  // Force static optimization
  trailingSlash: false,
  // Ensure CSS is properly processed
  swcMinify: true,
}

module.exports = nextConfig