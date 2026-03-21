"use client";

import { useEffect } from "react";
import {
  getUserCenterVipInfo,
  hasUserCenterAuthCredentials,
  refreshUserCenterVipInfo,
  USER_CENTER_AUTH_UPDATED_EVENT,
} from "@/lib/user-center-api";

function warmupVipInfo(forceRefresh = false) {
  if (!hasUserCenterAuthCredentials()) {
    return;
  }

  const request = forceRefresh ? refreshUserCenterVipInfo() : getUserCenterVipInfo();
  void request.catch(() => {
    // Vip info warmup is best-effort and should not block the current page.
  });
}

export function UserCenterVipBootstrap() {
  useEffect(() => {
    warmupVipInfo(false);

    function handleAuthUpdated() {
      warmupVipInfo(true);
    }

    window.addEventListener(USER_CENTER_AUTH_UPDATED_EVENT, handleAuthUpdated);
    return () => {
      window.removeEventListener(USER_CENTER_AUTH_UPDATED_EVENT, handleAuthUpdated);
    };
  }, []);

  return null;
}
