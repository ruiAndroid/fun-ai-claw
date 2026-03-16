"use client";

import type { DesiredState } from "@/types/contracts";

export type InstanceTemplateAgentBinding = {
  agentKey: string;
  provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  agentic?: boolean | null;
  systemPrompt?: string | null;
  allowedTools?: string[] | null;
  allowedSkills?: string[] | null;
};

export type InstanceTemplateChannelsConfig = {
  cliEnabled: boolean;
  messageTimeoutSecs: number;
  dingtalkEnabled: boolean;
  dingtalkClientId?: string;
  dingtalkClientSecret?: string;
  dingtalkAllowedUsers?: string[];
  qqEnabled: boolean;
  qqAppId?: string;
  qqAppSecret?: string;
  qqAllowedUsers?: string[];
};

export type InstanceTemplateDefaultModelConfig = {
  apiKey: string;
  defaultProvider: string;
  defaultModel: string;
  defaultTemperature: number;
};

export type InstanceTemplateRoutingConfig = {
  queryClassificationEnabled: boolean;
  modelRoutes: Array<{ hint: string; provider: string; model: string }>;
  queryClassificationRules: Array<{
    hint: string;
    keywords: string[];
    patterns: string[];
    priority?: number | null;
    minLength?: number | null;
    maxLength?: number | null;
  }>;
};

export type InstanceTemplateDefinition = {
  key: string;
  displayName: string;
  description: string;
  summary: string;
  imagePresetId: string;
  desiredState: DesiredState;
  mainAgent: InstanceTemplateAgentBinding;
  skillKeys: string[];
  lockedScopes: string[];
  tags: string[];
  runtimeConfigToml?: string;
  channelsConfig?: InstanceTemplateChannelsConfig;
  defaultModelConfig?: InstanceTemplateDefaultModelConfig;
  routingConfig?: InstanceTemplateRoutingConfig;
  mainAgentGuidance?: {
    prompt?: string;
    enabled?: boolean;
  };
};

const scriptStudioSkillKeys = [
  "novel-to-script-main",
  "novel-to-script-story-synopsis-generate",
  "novel-to-script-character-profile-generate",
  "novel-to-script-episode-outline-generate",
  "novel-to-script-full-script-generate",
  "one-line-script-story-synopsis-generate",
  "one-line-script-character-profile-generate",
  "one-line-script-episode-outline-generate",
  "one-line-script-full-script-generate",
];

export const instanceTemplates: InstanceTemplateDefinition[] = [
  {
    key: "script-master-standard",
    displayName: "编剧大神AI 标准模板",
    description: "面向小说转剧本与一句话剧本的标准运行模板，预装主 Agent 与完整编剧技能链。",
    summary: "推荐用于标准化生产环境：固定主 Agent、固定 Skills、实例配置默认只读。",
    imagePresetId: "zeroclaw-shell",
    desiredState: "RUNNING",
    mainAgent: {
      agentKey: "mgc-novel-to-script",
      allowedSkills: scriptStudioSkillKeys,
    },
    skillKeys: scriptStudioSkillKeys,
    lockedScopes: ["主 Agent", "Skills", "Main Guidance", "Config", "Channel", "Model Routing"],
    tags: ["推荐", "编剧", "标准模板"],
  },
];

export function getInstanceTemplate(templateKey?: string | null): InstanceTemplateDefinition | undefined {
  if (!templateKey) {
    return undefined;
  }
  return instanceTemplates.find((template) => template.key === templateKey);
}

export function getDefaultInstanceTemplate(): InstanceTemplateDefinition {
  return instanceTemplates[0];
}
