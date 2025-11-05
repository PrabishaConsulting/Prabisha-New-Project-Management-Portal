import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "prabisha.com",
      "bidisharay.com",
      "prishatheexplorer.com",
      "pratyushkumar.co.uk",
      "res.cloudinary.com",
      "intranet.prabisha.com",
      "harrowbusiness.com",
      "placehold.co",
      "lh3.googleusercontent.com",
      "randomuser.me",
      "media-cdn.prabisha.com",
    ],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
