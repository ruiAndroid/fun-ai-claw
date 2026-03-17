"use client";

import { useMemo, useState } from "react";
import type { AccountTabKey } from "./account-data";
import { AccountSidebar } from "./account-sidebar";
import { AccountSettingsPanel } from "./account-settings-panel";
import { AccountUsagePanel } from "./account-usage-panel";
import { AccountWorksPanel } from "./account-works-panel";

export function AccountPage() {
  const [activeTab, setActiveTab] = useState<AccountTabKey>("settings");

  const content = useMemo(() => {
    switch (activeTab) {
      case "usage":
        return <AccountUsagePanel />;
      case "works":
        return <AccountWorksPanel />;
      case "settings":
      default:
        return <AccountSettingsPanel />;
    }
  }, [activeTab]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f9fffe_100%)] px-5 py-4 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-[1800px] gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AccountSidebar activeTab={activeTab} onChange={setActiveTab} />
        <section className="rounded-[28px] bg-white/48 px-6 py-8 sm:px-10 sm:py-10">
          {content}
        </section>
      </div>
    </main>
  );
}
