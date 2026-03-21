"use client";

import { useCallback, useEffect, useState } from "react";
import { listModelBillingConfigs } from "@/lib/control-api";
import type { ModelBillingConfig } from "@/types/contracts";

export function useModelBillingConfigs(enabled = true) {
  const [configs, setConfigs] = useState<ModelBillingConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConfigs = useCallback(async () => {
    if (!enabled) {
      setConfigs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await listModelBillingConfigs();
      setConfigs(response.items);
    } catch {
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  return {
    configs,
    loading,
    refresh: loadConfigs,
  };
}
