/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hcnssdxsajfdwvbcfxkq.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
      {
        protocol: "https",
        hostname: "hcnssdxsajfdwvbcfxkq.supabase.co",
        pathname: "/storage/v1/object/public/project-covers/**",
      },
    ],
  },
};

module.exports = nextConfig;  