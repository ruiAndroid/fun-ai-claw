import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import type { ReactNode } from "react";
import "nextra-theme-docs/style.css";

const navbar = (
  <Navbar
    logo={<span style={{ fontWeight: 700 }}>fun-ai-claw Docs</span>}
    projectLink="https://github.com/fun-ai-claw/fun-ai-claw"
  />
);

const footer = <Footer>{new Date().getFullYear()} © fun-ai-claw</Footer>;

export default async function DocsLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pageMap = await getPageMap();

  return (
    <>
      <Head />
      <Layout
        navbar={navbar}
        pageMap={pageMap}
        footer={footer}
        docsRepositoryBase="https://github.com/fun-ai-claw/fun-ai-claw/tree/main/fun-ai-claw"
        editLink={null}
        feedback={{ content: null }}
        sidebar={{
          defaultMenuCollapseLevel: 1,
          autoCollapse: true,
        }}
        toc={{
          backToTop: "Back to top",
        }}
      >
        {children}
      </Layout>
    </>
  );
}
