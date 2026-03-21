"use client";

import { isImagePresetAvailable } from "@/lib/agent-session-protocol";
import {
  createInstance,
  installInstanceSkill,
  previewInstanceTemplateConfig,
  submitInstanceAction,
  upsertInstanceAgentBinding,
  upsertInstanceConfig,
  upsertInstanceMainAgentGuidance,
} from "@/lib/control-api";
import { buildInstanceTemplateUpsertRequest } from "@/lib/instance-template-upsert";
import type {
  ClawInstance,
  DesiredState,
  ImagePreset,
  InstanceTemplate,
  InstanceTemplateAgentBinding,
} from "@/types/contracts";

const TEMPLATE_UPDATED_BY = "template-center";

export class ManagedInstanceTemplateError extends Error {
  readonly instance?: ClawInstance;

  constructor(message: string, instance?: ClawInstance) {
    super(message);
    this.name = "ManagedInstanceTemplateError";
    this.instance = instance;
  }
}

export function resolveTemplateImagePreset(
  template: InstanceTemplate,
  images: ImagePreset[],
): ImagePreset | undefined {
  const availableImages = images.filter(isImagePresetAvailable);
  const exactMatch = availableImages.find((image) => image.id === template.imagePresetId);
  if (exactMatch) {
    return exactMatch;
  }
  return availableImages.find((image) => image.recommended) ?? availableImages[0];
}

function resolveTemplateAgentKeys(template: InstanceTemplate): string[] {
  const explicitBindingKeys = Array.from(
    new Set((template.agentBindings ?? []).map((binding) => binding.agentKey?.trim()).filter(Boolean)),
  ) as string[];
  if (explicitBindingKeys.length > 0) {
    return explicitBindingKeys;
  }
  const explicitAgentKeys = Array.from(new Set((template.agentKeys ?? []).map((value) => value.trim()).filter(Boolean)));
  if (explicitAgentKeys.length > 0) {
    return explicitAgentKeys;
  }
  const legacyMainAgentKey = template.mainAgent?.agentKey?.trim();
  return legacyMainAgentKey ? [legacyMainAgentKey] : [];
}

function resolveTemplateAgentBindings(template: InstanceTemplate): InstanceTemplateAgentBinding[] {
  const explicitBindings = (template.agentBindings ?? [])
    .map((binding) => ({
      agentKey: binding.agentKey?.trim() ?? "",
      provider: binding.provider ?? null,
      model: binding.model ?? null,
      temperature: binding.temperature ?? null,
      agentic: binding.agentic ?? null,
      systemPrompt: binding.systemPrompt ?? null,
      allowedTools: Array.from(new Set((binding.allowedTools ?? []).map((value) => value.trim()).filter(Boolean))),
      allowedSkills: Array.from(new Set((binding.allowedSkills ?? []).map((value) => value.trim()).filter(Boolean))),
    }))
    .filter((binding) => binding.agentKey);
  if (explicitBindings.length > 0) {
    return explicitBindings;
  }
  return resolveTemplateAgentKeys(template).map((agentKey) => ({
    agentKey,
    provider: null,
    model: null,
    temperature: null,
    agentic: null,
    systemPrompt: null,
    allowedTools: [],
    allowedSkills: [],
  }));
}

type CreateManagedInstanceFromTemplateOptions = {
  hostId: string;
  name: string;
  desiredState: DesiredState;
  template: InstanceTemplate;
  images: ImagePreset[];
  onProgress?: (message: string) => void;
};

function undefinedWhenNull<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

function shouldApplyTemplateRuntimeConfig(template: InstanceTemplate) {
  return Boolean(
    template.channelsConfig
    || template.defaultModelConfig
    || template.routingConfig
    || template.agentConfig,
  );
}

export async function createManagedInstanceFromTemplate({
  hostId,
  name,
  desiredState,
  template,
  images,
  onProgress,
}: CreateManagedInstanceFromTemplateOptions): Promise<ClawInstance> {
  const resolvedImage = resolveTemplateImagePreset(template, images);
  if (!resolvedImage) {
    throw new ManagedInstanceTemplateError("当前没有可用的模板镜像，请先检查镜像预设。");
  }

  onProgress?.("正在创建实例...");
  const instance = await createInstance({
    name,
    hostId,
    image: resolvedImage.image,
    desiredState: "STOPPED",
  });

  try {
    onProgress?.("正在绑定 Agent...");
    const agentBindings = resolveTemplateAgentBindings(template);
    for (const binding of agentBindings) {
      await upsertInstanceAgentBinding(instance.id, binding.agentKey, {
        provider: undefinedWhenNull(binding.provider),
        model: undefinedWhenNull(binding.model),
        temperature: undefinedWhenNull(binding.temperature),
        agentic: undefinedWhenNull(binding.agentic),
        systemPrompt: undefinedWhenNull(binding.systemPrompt),
        allowedTools: binding.allowedTools,
        allowedSkills: binding.allowedSkills,
        updatedBy: TEMPLATE_UPDATED_BY,
      });
    }

    for (const skillKey of template.skillKeys) {
      onProgress?.(`正在安装 Skill: ${skillKey}`);
      await installInstanceSkill(instance.id, skillKey, TEMPLATE_UPDATED_BY);
    }

    if (shouldApplyTemplateRuntimeConfig(template)) {
      onProgress?.("正在写入 runtime config...");
      const preview = await previewInstanceTemplateConfig(buildInstanceTemplateUpsertRequest(template));
      await upsertInstanceConfig(instance.id, {
        configToml: preview.configToml,
        updatedBy: TEMPLATE_UPDATED_BY,
      });
    }

    if (template.mainAgentGuidance) {
      onProgress?.("正在同步 Main Agent Guidance...");
      await upsertInstanceMainAgentGuidance(instance.id, {
        prompt: undefinedWhenNull(template.mainAgentGuidance.prompt),
        enabled: undefinedWhenNull(template.mainAgentGuidance.enabled),
        updatedBy: TEMPLATE_UPDATED_BY,
      });
    }

    if (desiredState === "RUNNING") {
      onProgress?.("正在启动实例...");
      await submitInstanceAction(instance.id, "START");
    }

    return instance;
  } catch (error) {
    const message = error instanceof Error ? error.message : "模板下发失败";
    throw new ManagedInstanceTemplateError(message, instance);
  }
}
