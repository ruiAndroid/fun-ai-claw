"use client";

import { useEffect } from "react";
import { HomepageAgentSection } from "./homepage-agent-section";
import { HomepageHero } from "./homepage-hero";
import { HomepageRobotAdoptionModal } from "./homepage-robot-adoption-modal";
import { HomepageSidebar } from "./homepage-sidebar";
import { HomepageTopbar } from "./homepage-topbar";
import { useHomepageShellData } from "./use-homepage-shell-data";
import { useState } from "react";

export function LandingPage() {
  const [adoptionModalOpen, setAdoptionModalOpen] = useState(false);
  const {
    authenticated,
    messagesHref,
    navItems,
    rechargeHref,
    sidebarMessages,
    messageEmptyText,
    userCard,
    refresh,
  } = useHomepageShellData();

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <main className="brand-sunset-theme relative h-screen overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(139,61,255,0.16),transparent_28%),linear-gradient(180deg,#fffaf7_0%,#fff7fb_48%,#fffaf7_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-orange-300/16 blur-3xl" />
        <div className="absolute right-[-6rem] top-12 h-72 w-72 rounded-full bg-violet-300/14 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/3 h-56 w-56 rounded-full bg-fuchsia-300/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(139,61,255,0.045)_1px,transparent_1px)] [background-size:22px_22px] opacity-30" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1920px] items-start">
        <HomepageSidebar
          messagesHref={messagesHref}
          navItems={navItems}
          messages={sidebarMessages}
          messageEmptyText={messageEmptyText}
          userCard={userCard}
        />

        <div className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6 xl:px-10">
          <HomepageTopbar rechargeHref={rechargeHref} authenticated={authenticated} />

          <div className="mt-6 grid gap-6">
            <HomepageHero
              messagesHref={messagesHref}
              authenticated={authenticated}
              onAdoptRequest={() => setAdoptionModalOpen(true)}
            />
            <HomepageAgentSection authenticated={authenticated} messagesHref={messagesHref} />
          </div>
        </div>
      </div>

      <HomepageRobotAdoptionModal
        open={adoptionModalOpen}
        onClose={() => setAdoptionModalOpen(false)}
        onAdopted={() => {
          void refresh();
        }}
      />
    </main>
  );
}
