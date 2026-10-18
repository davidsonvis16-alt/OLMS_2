import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "*.supabase.co";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: supabaseHost }] },
  serverExternalPackages: ["pdf-lib", "qrcode", "@pdf-lib/fontkit"],
  // Pin the project root (a lockfile higher up the disk would otherwise be picked).
  outputFileTracingRoot: process.cwd(),
  // Certificate fonts are read from disk to measure and embed text; ship them with every server function.
  outputFileTracingIncludes: { "/**": ["./src/assets/fonts/*.ttf", "./public/brand/logo-light.png", "./public/brand/signature.png"] },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default nextConfig;
