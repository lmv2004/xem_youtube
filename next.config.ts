import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Thumbnails YouTube vẫn đỡ nén tốt; bật định dạng hiện đại giúp giảm
    // ~20-30% dung lượng so với JPEG gốc. TTL dài vì URL thumbnail ổn định.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
