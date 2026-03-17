import type { NextConfig } from "next";
import nextra from "nextra";

const withNextra = nextra({
  contentDirBasePath: "/docs",
  search: {
    codeblocks: false,
  },
  defaultShowCopyCode: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/fun-claw",
        destination: "/",
        permanent: true,
      },
      {
        source: "/fun-claw/console",
        destination: "/console",
        permanent: true,
      },
      {
        source: "/fun-claw/console/:path*",
        destination: "/console/:path*",
        permanent: true,
      },
      {
        source: "/fun-claw/docs",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/fun-claw/docs/:path*",
        destination: "/docs/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextra(nextConfig);
