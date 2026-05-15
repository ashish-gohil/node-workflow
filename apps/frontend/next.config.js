/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/types"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
