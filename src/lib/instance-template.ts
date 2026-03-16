"use client";

import { isImagePresetAvailable } from "@/lib/agent-session-protocol";
import {
  createInstance,
  installInstanceSkill,
  submitInstanceAction,
  upsertInstanceAgentBinding,
  upsertInstanceChannelsConfig,
  upsertInstanceConfig,
  upsertInstanceDefaultModelConfig,
  upsertInstanceMainAgentGuidance,
  upsertInstanceRoutingConfig,
} from "@/lib/control-api";
import type { ClawInstance, DesiredState, ImagePreset } from "@/types/contracts";
import type { InstanceTemplateDefinition } from "@/config/instance-templates";

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
  template: InstanceTemplateDefinition,
  images: ImagePreset[],
): ImagePreset | undefined {
  const availableImages = images.filter(isImagePresetAvailable);
  const exactMatch = availableImages.find((image) => image.id === template.imagePresetId);
  if (exactMatch) {
    return exactMatch;
  }
  return availableImages.find((image) => image.recommended) ?? availableImages[0];
}

type CreateManagedInstanceFromTemplateOptions = {
  hostId: string;
  name: string;
  desiredState: DesiredState;
  template: InstanceTemplateDefinition;
  images: ImagePreset[];
  onProgress?: (message: string) => void;
};

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

  onProgress?.("正在创建实例…");
  const instance = await createInstance({
    name,
    hostId,
    image: resolvedImage.image,
    desiredState: "STOPPED",
  });

  try {
    onProgress?.("正在绑定主 Agent…");
    await upsertInstanceAgentBinding(instance.id, template.mainAgent.agentKey, {
      ...template.mainAgent,
      allowedSkills: template.mainAgent.allowedSkills ?? template.skillKeys,
      updatedBy: TEMPLATE_UPDATED_BY,
    });

    for (const skillKey of template.skillKeys) {
      onProgress?.(`正在安装 Skill：${skillKey}`);
      await installInstanceSkill(instance.id, skillKey, TEMPLATE_UPDATED_BY);
    }

    if (template.runtimeConfigToml?.trim()) {
      onProgress?.("正在写入运行时配置…");
      await upsertInstanceConfig(instance.id, {
        configToml: template.runtimeConfigToml,
        updatedBy: TEMPLATE_UPDATED_BY,
      });
    }

    if (template.channelsConfig) {
      onProgress?.("正在写入渠道配置…");
      await upsertInstanceChannelsConfig(instance.id, {
        ...template.channelsConfig,
        updatedBy: TEMPLATE_UPDATED_BY,
      });
    }

    if (template.defaultModelConfig) {
      onProgress?.("正在写入默认模型配置…");
      await upsertInstanceDefaultModelConfig(instance.id, {
        ...template.defaultModelConfig,
        updatedBy: TEMPLATE_UPDATED_BY,
      });
    }

    if (template.routingConfig) {
      onProgress?.("正在写入模型路由配置…");
      await upsertInstanceRoutingConfig(instance.id, {
        ...template.routingConfig,
        updatedBy: TEMPLATE_UPDATED_BY,
      });
    }

    if (template.mainAgentGuidance) {
      onProgress?.("正在同步主 Agent Guidance…");
      await upsertInstanceMainAgentGuidance(instance.id, {
        ...template.mainAgentGuidance,
        updatedBy: TEMPLATE_UPDATED_BY,
      });
    }

    if (desiredState === "RUNNING") {
      onProgress?.("正在启动实例…");
      await submitInstanceAction(instance.id, "START");
    }

    return instance;
  } catch (error) {
    const message = error instanceof Error ? error.message : "模板下发失败";
    throw new ManagedInstanceTemplateError(message, instance);
  }
}
