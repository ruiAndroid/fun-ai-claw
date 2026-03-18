"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearUserCenterAuthState,
  hasUserCenterAuthCredentials,
  USER_CENTER_AUTH_REQUIRED_EVENT,
} from "@/lib/user-center-api";

export function useRequireUserCenterAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const redirectToLogin = useCallback(() => {
    clearUserCenterAuthState();
    setAuthenticated(false);
    setChecking(false);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (!hasUserCenterAuthCredentials()) {
      redirectToLogin();
      return;
    }

    setAuthenticated(true);
    setChecking(false);
  }, [redirectToLogin]);

  useEffect(() => {
    function handleAuthRequired() {
      redirectToLogin();
    }

    window.addEventListener(USER_CENTER_AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => {
      window.removeEventListener(USER_CENTER_AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, [redirectToLogin]);

  return {
    checking,
    authenticated,
    redirectToLogin,
  };
}
