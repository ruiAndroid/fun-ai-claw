"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildConsumerLoginHref, hasUserCenterSession } from "@/lib/consumer-auth-client";
import { getUserCenterMe } from "@/lib/user-center-api";

function buildCurrentPath(pathname: string, searchParams: ReturnType<typeof useSearchParams>) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function ConsumerAuthGuard({
  children,
  loadingTitle = "正在校验登录状态...",
  loadingDescription = "请稍候，正在确认你的用户中心登录信息。",
}: {
  children: ReactNode;
  loadingTitle?: string;
  loadingDescription?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  const loginHref = useMemo(
    () => buildConsumerLoginHref(buildCurrentPath(pathname, searchParams)),
    [pathname, searchParams],
  );

  useEffect(() => {
    let active = true;

    if (!hasUserCenterSession()) {
      router.replace(loginHref);
      return () => {
        active = false;
      };
    }

    void getUserCenterMe()
      .then(() => {
        if (active) {
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          router.replace(loginHref);
        }
      });

    return () => {
      active = false;
    };
  }, [loginHref, router]);

  if (!ready) {
    return (
      <main className="brand-sunset-theme min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_100%)] px-5 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[960px] rounded-[28px] bg-white/70 px-8 py-12 text-center shadow-[0_20px_48px_rgba(15,23,42,0.05)]">
          <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">{loadingTitle}</div>
          <div className="mt-4 text-lg font-semibold text-slate-500">{loadingDescription}</div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
