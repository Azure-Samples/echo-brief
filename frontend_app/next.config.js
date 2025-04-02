/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports
  output: 'export',
  
  // Disable image optimization since it requires a server component
  images: {
    unoptimized: true,
  },
  
  // Enable strict mode for better development experience
  reactStrictMode: true,
  
  // Trailing slashes are recommended for static sites
  trailingSlash: true,
}

module.exports = nextConfig 