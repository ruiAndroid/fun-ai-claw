"use client";

import {
  confirmAgentTask,
  createInstance,
  deleteInstanceMainAgentGuidance,
  deleteInstance,
  getAgentTask,
  getInstanceMainAgentGuidance,
  getInstancePairingCode,
  listImages,
  listInstanceAgents,
  listInstanceSkills,
  listInstances,
  prepareAgentTask,
  submitInstanceAction,
  upsertInstanceAgentSystemPrompt,
  upsertInstanceMainAgentGuidance,
} from "@/lib/control-api";
import { Badge } from "@/components/ui/badge";
import { Card as ShadCard, CardContent as ShadCardContent, CardHeader as ShadCardHeader, CardTitle as ShadCardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app-config";
import { AgentDescriptor, AgentTaskResponse, ClawInstance, CreateInstanceRequest, ImagePreset, InstanceActionType, InstanceMainAgentGuidance, PairingCodeResponse, SkillDescriptor } from "@/types/contracts";
import { ArrowLeft, Bot, ChevronLeft, ChevronRight, Server, Wrench } from "lucide-react";
import { Alert, Button, Card, Descriptions, Form, Input, Layout, Modal, Select, Space, Switch, Tabs, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
type CreateInstanceFormValues = Omit<CreateInstanceRequest, "hostId">;
type ConsoleView = "instances" | "agents" | "skills" | "instance-detail";
type InstanceDetailTabKey = "agents" | "skills";

const uiText = {
  loadFailed: "\u52a0\u8f7dclaw\u5b9e\u4f8b\u5931\u8d25",
  loadImagesFailed: "\u52a0\u8f7d\u955c\u50cf\u5217\u8868\u5931\u8d25",
  createInstanceFailed: "\u521b\u5efa\u5b9e\u4f8b\u5931\u8d25",
  actionSubmittedPrefix: "\u52a8\u4f5c\u5df2\u63d0\u4ea4\uff1a",
  instanceCreatedPrefix: "\u5b9e\u4f8b\u521b\u5efa\u6210\u529f\uff1a",
  actionFailed: "\u63d0\u4ea4\u52a8\u4f5c\u5931\u8d25",
  pageTitle: "fun-ai-claw claw\u5b9e\u4f8b\u7ba1\u7406\u53f0",
  menuCollapse: "\u6536\u8d77\u83dc\u5355",
  menuExpand: "\u5c55\u5f00\u83dc\u5355",
  menuInstances: "\u5b9e\u4f8b\u5217\u8868",
  menuAgents: "Agents",
  menuSkills: "Skills",
  backToInstances: "\u8fd4\u56de\u5b9e\u4f8b\u5217\u8868",
  listTitle: "claw\u5b9e\u4f8b\u5217\u8868",
  listSubtitle: "\u70b9\u51fb\u4efb\u610f claw \u5b9e\u4f8b\u8fdb\u5165\u8be6\u60c5",
  instanceDetailTitle: "\u5b9e\u4f8b\u8be6\u60c5",
  totalInstances: "\u5b9e\u4f8b\u603b\u6570",
  runningInstances: "\u8fd0\u884c\u4e2d",
  stoppedInstances: "\u5df2\u505c\u6b62",
  errorInstances: "\u5f02\u5e38\u5b9e\u4f8b",
  loadingInstances: "\u5b9e\u4f8b\u52a0\u8f7d\u4e2d...",
  refresh: "\u5237\u65b0",
  create: "\u65b0\u589e\u5b9e\u4f8b",
  image: "\u955c\u50cf",
  gatewayHostPort: "\u7f51\u5173\u7aef\u53e3",
  gatewayUrl: "\u8bbf\u95ee\u5730\u5740",
  gatewayUrlUnavailable: "\u672a\u5206\u914d",
  instanceName: "\u5b9e\u4f8b\u540d",
  status: "\u72b6\u6001",
  desiredState: "\u671f\u671b\u72b6\u6001",
  updatedAt: "\u66f4\u65b0\u65f6\u95f4",
  detailTitlePrefix: "\u5b9e\u4f8b\u8be6\u60c5\uff1a",
  selectInstance: "\u8bf7\u9009\u62e9\u5b9e\u4f8b",
  instanceId: "\u5b9e\u4f8bID",
  hostId: "\u5bbf\u4e3b\u673aID",
  currentStatus: "\u5f53\u524d\u72b6\u6001",
  createdAt: "\u521b\u5efa\u65f6\u95f4",
  start: "\u542f\u52a8",
  stop: "\u505c\u6b62",
  restartInstance: "\u91cd\u542f\u5b9e\u4f8b",
  rollback: "\u56de\u6eda",
  delete: "\u5220\u9664",
  remoteConnect: "\u8fdc\u7a0b\u8fde\u63a5",
  remoteConnectTitle: "\u8fdc\u7a0b\u547d\u4ee4\u884c\u8fde\u63a5",
  remoteConnectHint: "\u590d\u5236\u4e0b\u65b9\u547d\u4ee4\u540e\uff0c\u5728\u4f60\u7684\u7ec8\u7aef\u6267\u884c\u5373\u53ef\u8fdb\u5165\u5b9e\u4f8b\u3002",
  remoteConnectUnavailable: "\u672a\u914d\u7f6e\u8fdc\u7a0b\u8fde\u63a5\u547d\u4ee4\u6a21\u677f",
  remoteConnectCommand: "\u8fde\u63a5\u547d\u4ee4",
  webTerminal: "Web\u7ec8\u7aef",
  connectTerminal: "\u8fde\u63a5\u7ec8\u7aef",
  disconnectTerminal: "\u65ad\u5f00\u7ec8\u7aef",
  openVisualUi: "UI\u53ef\u89c6\u5316\u64cd\u4f5c",
  openVisualUiUnavailable: "\u5f53\u524d\u5b9e\u4f8b\u6682\u65e0\u53ef\u8bbf\u95ee\u5730\u5740",
  pairingCode: "\u56fa\u5b9a\u914d\u5bf9\u7801",
  pairingLink: "\u914d\u5bf9\u94fe\u63a5",
  fetchPairingCode: "\u914d\u5bf9\u4fe1\u606f",
  pairingCodeTitle: "\u5b9e\u4f8b\u56fa\u5b9a\u914d\u5bf9",
  pairingCodeHint: "\u4f18\u5148\u70b9\u51fb\u4e0b\u65b9\u914d\u5bf9\u94fe\u63a5\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u5e26\u4e0a\u8bbf\u95ee\u4ee4\u724c\u5b8c\u6210\u767b\u5f55\u3002",
  pairingCodeUnavailable: "\u6682\u65f6\u65e0\u6cd5\u83b7\u53d6\u914d\u5bf9\u7801\uff0c\u8bf7\u7a0d\u540e\u5237\u65b0\u3002",
  pairingCodeFetchFailed: "\u83b7\u53d6\u914d\u5bf9\u7801\u5931\u8d25",
  refreshPairingCode: "\u5237\u65b0\u914d\u5bf9\u4fe1\u606f",
  pairingCodeFetchedAt: "\u83b7\u53d6\u65f6\u95f4",
  pairingCodeSource: "\u624b\u52a8\u914d\u5bf9\u8bf7\u6c42",
  sendCommand: "\u53d1\u9001",
  terminalInputPlaceholder: "\u8f93\u5165\u547d\u4ee4\uff0c\u56de\u8f66\u53ef\u53d1\u9001",
  terminalNotRunning: "\u5b9e\u4f8b\u672a\u8fd0\u884c\uff0c\u65e0\u6cd5\u6253\u5f00Web\u7ec8\u7aef",
  terminalConnectFailed: "Web\u7ec8\u7aef\u8fde\u63a5\u5931\u8d25",
  terminalConnected: "Web\u7ec8\u7aef\u5df2\u8fde\u63a5",
  terminalDisconnected: "Web\u7ec8\u7aef\u5df2\u65ad\u5f00",
  terminalOutput: "\u7ec8\u7aef\u8f93\u51fa",
  copyCommand: "\u590d\u5236\u547d\u4ee4",
  copyCommandSuccess: "\u8fde\u63a5\u547d\u4ee4\u5df2\u590d\u5236",
  copyCommandFailed: "\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236",
  confirmActionTitle: "\u786e\u8ba4\u64cd\u4f5c",
  confirmActionContentPrefix: "\u786e\u8ba4\u5bf9\u5b9e\u4f8b\u6267\u884c\u64cd\u4f5c\uff1a",
  confirmActionOk: "\u786e\u8ba4\u6267\u884c",
  deleteConfirmTitle: "\u5220\u9664\u5b9e\u4f8b",
  deleteConfirmContentPrefix: "\u5220\u9664\u540e\u4e0d\u53ef\u6062\u590d\uff0c\u786e\u8ba4\u5220\u9664\uff1a",
  deleteSuccessPrefix: "\u5b9e\u4f8b\u5df2\u5220\u9664\uff1a",
  deleteFailed: "\u5220\u9664\u5b9e\u4f8b\u5931\u8d25",
  instanceNotFound: "\u5b9e\u4f8b\u4e0d\u5b58\u5728\uff0c\u5df2\u5237\u65b0\u5217\u8868",
  instanceIdCopied: "\u5b9e\u4f8bID\u5df2\u590d\u5236",
  cancel: "\u53d6\u6d88",
  noInstances: "\u5f53\u524d\u6ca1\u6709\u53ef\u7ba1\u7406\u7684claw\u5b9e\u4f8b\u3002",
  noAgentsSection: "Agents \u533a\u57df\u6682\u672a\u5f00\u653e\uff0c\u4e0b\u4e00\u6b65\u518d\u5bf9\u63a5\u5206\u9875\u529f\u80fd\u3002",
  noSkillsSection: "Skills \u533a\u57df\u6682\u672a\u5f00\u653e\uff0c\u4e0b\u4e00\u6b65\u518d\u5bf9\u63a5\u5206\u9875\u529f\u80fd\u3002",
  selectInstanceFirst: "\u8bf7\u5148\u5728\u5de6\u4fa7\u5b9e\u4f8b\u5217\u8868\u9009\u62e9\u4e00\u4e2a claw \u5b9e\u4f8b\u3002",
  createModalTitle: "\u521b\u5efa\u65b0\u5b9e\u4f8b",
  desiredStateRunning: "\u8fd0\u884c",
  desiredStateStopped: "\u505c\u6b62",
  noPresetImage: "\u5f53\u524d\u6ca1\u6709\u53ef\u9009\u9884\u7f6e\u955c\u50cf\uff0c\u8bf7\u5148\u5728API\u914d\u7f6e app.images.presets",
  requiredName: "\u8bf7\u8f93\u5165\u5b9e\u4f8b\u540d",
  nameAlreadyExists: "\u5b9e\u4f8b\u540d\u5df2\u5b58\u5728\uff0c\u8bf7\u66f4\u6362",
  requiredImage: "\u8bf7\u9009\u62e9\u955c\u50cf",
  fixedHostTipPrefix: "\u5f53\u524d\u5bbf\u4e3b\u673aID\u5df2\u56fa\u5b9a\uff1a",
  agentChatTitle: "\u5b9e\u4f8b Agent \u804a\u5929",
  loadAgentsFailed: "\u52a0\u8f7d Agent \u5217\u8868\u5931\u8d25",
  noAgents: "\u8be5\u5b9e\u4f8b\u6682\u65e0\u53ef\u7528 Agent",
  refreshAgents: "\u5237\u65b0 Agent \u5217\u8868",
  loadSkillsFailed: "\u52a0\u8f7d Skill \u5217\u8868\u5931\u8d25",
  noSkills: "\u8be5\u5b9e\u4f8b\u6682\u65e0\u53ef\u7528 Skill",
  tabAgent: "Agent",
  tabSkill: "Skill",
  agentSkillPanelTitle: "Agent / Skill",
  refreshSkills: "\u5237\u65b0 Skill \u5217\u8868",
  selectSkill: "\u9009\u62e9 Skill",
  skillListHint: "\u70b9\u51fb Skill \u5361\u7247\u67e5\u770b\u8be6\u60c5",
  skillAllowed: "\u53ef\u8c03\u7528",
  skillNotAllowed: "\u672a\u6388\u6743",
  skillPath: "Skill \u8def\u5f84",
  skillPrompt: "Skill \u63d0\u793a\u8bcd",
  noSkillPrompt: "\u8bf7\u9009\u62e9 Skill \u67e5\u770b\u63d0\u793a\u8bcd",
  skillScopeHint: "Skill \u5c5e\u4e8e\u5b9e\u4f8b\u5de5\u4f5c\u533a\u5171\u4eab\u80fd\u529b\uff0c\u5f53\u524d Agent \u80fd\u5426\u8c03\u7528\u7531 allowed_tools \u9650\u5236",
  agentAllowedTools: "allowed_tools",
  agentSystemPromptTitle: "Agent system_prompt",
  agentSystemPromptPath: "\u914d\u7f6e\u8def\u5f84",
  agentSystemPromptPreview: "system_prompt \u9884\u89c8",
  agentSystemPromptPlaceholder: "\u8f93\u5165\u5e76\u4fdd\u5b58\u8be5 Agent \u7684 system_prompt",
  agentSystemPromptEdit: "\u7f16\u8f91",
  agentSystemPromptSave: "\u4fdd\u5b58",
  agentSystemPromptCancel: "\u53d6\u6d88",
  agentSystemPromptSaved: "Agent system_prompt \u5df2\u4fdd\u5b58",
  agentSystemPromptSaveFailed: "\u4fdd\u5b58 Agent system_prompt \u5931\u8d25",
  agentSystemPromptMissingAgent: "\u8bf7\u5148\u9009\u62e9 Agent",
  agentSkillNotAllowed: "\u5f53\u524d Agent \u7684 allowed_tools \u672a\u5305\u542b\u8be5 Skill ID\uff0c\u53ef\u80fd\u65e0\u6cd5\u76f4\u63a5\u8c03\u7528",
  selectAgent: "\u9009\u62e9 Agent",
  agentModel: "\u6a21\u578b",
  agentProvider: "\u63d0\u4f9b\u65b9",
  agenticMode: "Agentic",
  agentMessage: "\u6d88\u606f",
  agentMessagePlaceholder: "\u8f93\u5165\u4f60\u8981\u53d1\u7ed9\u8be5 Agent \u7684\u4efb\u52a1\u63cf\u8ff0",
  sendAgentMessage: "\u53d1\u9001\u7ed9 Agent",
  preparingTask: "\u6b63\u5728\u9884\u5907\u4efb\u52a1...",
  confirmingTask: "\u6b63\u5728\u786e\u8ba4\u4efb\u52a1...",
  pollingTask: "\u4efb\u52a1\u6267\u884c\u4e2d\uff0c\u6b63\u5728\u8f6e\u8be2\u7ed3\u679c...",
  taskTimeout: "\u4efb\u52a1\u6267\u884c\u8d85\u65f6\uff0c\u8bf7\u7a0d\u540e\u5237\u65b0\u67e5\u770b",
  taskResult: "\u6700\u65b0\u4efb\u52a1\u7ed3\u679c",
  taskError: "\u4efb\u52a1\u9519\u8bef",
  taskStatus: "\u4efb\u52a1\u72b6\u6001",
  taskId: "Task ID",
  agentTaskSuccess: "Agent \u4efb\u52a1\u6267\u884c\u6210\u529f",
  agentTaskFailed: "Agent \u4efb\u52a1\u6267\u884c\u5931\u8d25",
  missingAgentOrMessage: "\u8bf7\u5148\u9009\u62e9 Agent \u5e76\u8f93\u5165\u6d88\u606f",
  mainAgentGuidanceTitle: "\u4e3b Agent \u63d0\u793a\u8bcd",
  mainAgentGuidanceRefresh: "\u5237\u65b0\u63d0\u793a\u8bcd",
  mainAgentGuidanceEdit: "\u7f16\u8f91",
  mainAgentGuidanceCancel: "\u53d6\u6d88",
  mainAgentGuidanceSave: "\u4fdd\u5b58\u8986\u76d6",
  mainAgentGuidanceDelete: "\u5220\u9664\u8986\u76d6",
  mainAgentGuidanceLoadingFailed: "\u52a0\u8f7d\u4e3b Agent \u63d0\u793a\u8bcd\u5931\u8d25",
  mainAgentGuidanceSaveFailed: "\u4fdd\u5b58\u4e3b Agent \u63d0\u793a\u8bcd\u5931\u8d25",
  mainAgentGuidanceDeleteFailed: "\u5220\u9664\u4e3b Agent \u63d0\u793a\u8bcd\u8986\u76d6\u5931\u8d25",
  mainAgentGuidanceSaved: "\u4e3b Agent \u63d0\u793a\u8bcd\u5df2\u4fdd\u5b58",
  mainAgentGuidanceDeleted: "\u4e3b Agent \u63d0\u793a\u8bcd\u8986\u76d6\u5df2\u5220\u9664",
  mainAgentGuidanceSource: "\u751f\u6548\u6765\u6e90",
  mainAgentGuidanceWorkspacePath: "\u8fd0\u884c\u8def\u5f84",
  mainAgentGuidanceGlobalPath: "\u5168\u5c40\u9ed8\u8ba4\u8def\u5f84",
  mainAgentGuidanceOverwriteOnStart: "\u542f\u52a8\u65f6\u8986\u76d6",
  mainAgentGuidanceOverrideEnabled: "\u5b9e\u4f8b\u8986\u76d6\u542f\u7528",
  mainAgentGuidanceOverridePrompt: "\u5b9e\u4f8b\u8986\u76d6\u5185\u5bb9",
  mainAgentGuidanceOverridePromptPlaceholder: "\u8f93\u5165\u6216\u7c98\u8d34\u8be5\u5b9e\u4f8b\u7684\u4e3b Agent \u63d0\u793a\u8bcd",
  mainAgentGuidanceEffectivePrompt: "\u5f53\u524d\u751f\u6548\u5185\u5bb9\u9884\u89c8",
  mainAgentGuidanceNoEffectivePrompt: "\u5f53\u524d\u65e0\u751f\u6548\u4e3b Agent \u63d0\u793a\u8bcd",
  mainAgentGuidancePromptRequired: "\u9996\u6b21\u4fdd\u5b58\u5b9e\u4f8b\u8986\u76d6\u65f6\uff0c\u8bf7\u5148\u586b\u5199\u63d0\u793a\u8bcd\u5185\u5bb9",
} as const;

function statusColor(status: ClawInstance["status"]) {
  if (status === "RUNNING") {
    return "green";
  }
  if (status === "ERROR") {
    return "red";
  }
  if (status === "CREATING") {
    return "blue";
  }
  return "default";
}

function resolveUiControllerUrl(instance: Pick<ClawInstance, "id" | "gatewayUrl">) {
  const configuredBaseUrl = appConfig.uiControllerBaseUrl?.trim();
  if (configuredBaseUrl) {
    const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
    return `${normalizedBaseUrl}/${instance.id}`;
  }

  const gatewayUrl = instance.gatewayUrl?.trim();
  return gatewayUrl || undefined;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shortInstanceId(id: string) {
  if (!id || id.length <= 14) {
    return id;
  }
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

export function Dashboard() {
  const [messageApi, messageContext] = message.useMessage();
  const [createForm] = Form.useForm<CreateInstanceFormValues>();
  const [instances, setInstances] = useState<ClawInstance[]>([]);
  const [images, setImages] = useState<ImagePreset[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>();
  const [activeView, setActiveView] = useState<ConsoleView>("instances");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<Exclude<InstanceActionType, "START">>();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [deletingInstance, setDeletingInstance] = useState(false);
  const [error, setError] = useState<string>();
  const [pairingCodeModalOpen, setPairingCodeModalOpen] = useState(false);
  const [pairingCodeLoading, setPairingCodeLoading] = useState(false);
  const [pairingCodeData, setPairingCodeData] = useState<PairingCodeResponse>();
  const [pairingCodeInstanceName, setPairingCodeInstanceName] = useState<string>();
  const [agents, setAgents] = useState<AgentDescriptor[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string>();
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [skills, setSkills] = useState<SkillDescriptor[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string>();
  const [selectedSkillId, setSelectedSkillId] = useState<string>();
  const [agentMessageInput, setAgentMessageInput] = useState("");
  const [agentTaskSubmitting, setAgentTaskSubmitting] = useState(false);
  const [agentTaskProgress, setAgentTaskProgress] = useState<string>();
  const [latestAgentTask, setLatestAgentTask] = useState<AgentTaskResponse>();
  const [agentSystemPromptEditing, setAgentSystemPromptEditing] = useState(false);
  const [agentSystemPromptSaving, setAgentSystemPromptSaving] = useState(false);
  const [agentSystemPromptDraft, setAgentSystemPromptDraft] = useState("");
  const [mainAgentGuidance, setMainAgentGuidance] = useState<InstanceMainAgentGuidance>();
  const [mainAgentGuidanceLoading, setMainAgentGuidanceLoading] = useState(false);
  const [mainAgentGuidanceSaving, setMainAgentGuidanceSaving] = useState(false);
  const [mainAgentGuidanceDeleting, setMainAgentGuidanceDeleting] = useState(false);
  const [mainAgentGuidanceError, setMainAgentGuidanceError] = useState<string>();
  const [mainAgentPromptDraft, setMainAgentPromptDraft] = useState("");
  const [mainAgentOverrideEnabledDraft, setMainAgentOverrideEnabledDraft] = useState(true);
  const [mainAgentGuidanceEditing, setMainAgentGuidanceEditing] = useState(false);
  const [instanceDetailTab, setInstanceDetailTab] = useState<InstanceDetailTabKey>("agents");
  const terminalSocketRef = useRef<WebSocket | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalCommand, setTerminalCommand] = useState("");
  const [terminalConnecting, setTerminalConnecting] = useState(false);
  const [terminalConnected, setTerminalConnected] = useState(false);
  const terminalOutputRef = useRef<HTMLDivElement | null>(null);

  const selectedInstance = useMemo(
    () => instances.find((item) => item.id === selectedInstanceId),
    [instances, selectedInstanceId]
  );
  const selectedAgent = useMemo(
    () => agents.find((item) => item.id === selectedAgentId),
    [agents, selectedAgentId]
  );
  const selectedSkill = useMemo(
    () => skills.find((item) => item.id === selectedSkillId),
    [skills, selectedSkillId]
  );
  const selectedAgentAllowedTools = useMemo(
    () => (selectedAgent?.allowedTools ?? []).filter((item): item is string => typeof item === "string" && item.trim().length > 0),
    [selectedAgent]
  );
  const selectedSkillNotAllowed = useMemo(() => {
    if (!selectedSkill) {
      return false;
    }
    if (selectedAgentAllowedTools.length === 0) {
      return false;
    }
    return !selectedAgentAllowedTools.includes(selectedSkill.id);
  }, [selectedAgentAllowedTools, selectedSkill]);
  const selectedStatus = selectedInstance?.status;
  const actionBusy = submittingAction || deletingInstance;
  const disableStart = !selectedInstance || actionBusy || selectedStatus === "RUNNING" || selectedStatus === "CREATING";
  const disableStop = !selectedInstance || actionBusy || selectedStatus === "STOPPED" || selectedStatus === "CREATING";
  const disableRestartInstance = !selectedInstance || actionBusy || selectedStatus === "CREATING";
  const disableRollback = !selectedInstance || actionBusy || selectedStatus === "CREATING";
  const disableDelete = !selectedInstance || actionBusy;
  const disableRemoteConnect = !selectedInstance;
  const disableSendAgentMessage = !selectedInstance || !selectedAgentId || !agentMessageInput.trim() || agentTaskSubmitting || agentsLoading;
  const selectedRemoteConnectCommand = selectedInstance?.remoteConnectCommand?.trim();
  const selectedGatewayUrl = selectedInstance ? resolveUiControllerUrl(selectedInstance) : undefined;
  const terminalRenderedLines = useMemo(() => terminalOutput.split("\n"), [terminalOutput]);
  const selectedPairingCode = pairingCodeData?.pairingCode?.trim();
  const selectedPairingLink = pairingCodeData?.pairingLink?.trim();
  const actionLabelMap: Record<InstanceActionType, string> = {
    START: uiText.start,
    STOP: uiText.stop,
    RESTART: uiText.restartInstance,
    ROLLBACK: uiText.rollback,
  };
  const baselineMainAgentPrompt = mainAgentGuidance?.overridePrompt ?? "";
  const baselineMainAgentOverrideEnabled = mainAgentGuidance?.overrideEnabled ?? true;
  const baselineAgentSystemPrompt = selectedAgent?.systemPrompt ?? "";
  const agentSystemPromptDirty = agentSystemPromptDraft !== baselineAgentSystemPrompt;
  const mainAgentGuidanceDirty = mainAgentPromptDraft !== baselineMainAgentPrompt
    || mainAgentOverrideEnabledDraft !== baselineMainAgentOverrideEnabled;
  const dashboardStats = useMemo(() => {
    const running = instances.filter((item) => item.status === "RUNNING").length;
    const stopped = instances.filter((item) => item.status === "STOPPED").length;
    const errorCount = instances.filter((item) => item.status === "ERROR").length;
    return {
      total: instances.length,
      running,
      stopped,
      errorCount,
    };
  }, [instances]);
  const activeMenuView: Exclude<ConsoleView, "instance-detail"> =
    activeView === "instance-detail" ? "instances" : activeView;

  const loadInstances = useCallback(async () => {
    setLoadingInstances(true);
    setError(undefined);
    try {
      const response = await listInstances();
      setInstances(response.items);
      if (response.items.length > 0) {
        setSelectedInstanceId((current) => {
          if (!current) {
            return response.items[0].id;
          }
          const exists = response.items.some((item) => item.id === current);
          return exists ? current : response.items[0].id;
        });
      } else {
        setSelectedInstanceId(undefined);
        setActiveView((current) => (current === "instance-detail" ? "instances" : current));
      }
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : uiText.loadFailed);
    } finally {
      setLoadingInstances(false);
    }
  }, []);

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const response = await listImages();
      setImages(response.items);
      if (response.items.length > 0) {
        const defaultImage = response.items.find((item) => item.recommended)?.image ?? response.items[0].image;
        createForm.setFieldValue("image", defaultImage);
      }
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.loadImagesFailed);
    } finally {
      setLoadingImages(false);
    }
  }, [createForm, messageApi]);

  const loadAgents = useCallback(async (instanceId?: string) => {
    if (!instanceId) {
      setAgents([]);
      setSelectedAgentId(undefined);
      setAgentsError(undefined);
      return;
    }

    setAgentsLoading(true);
    setAgentsError(undefined);
    try {
      const response = await listInstanceAgents(instanceId);
      setAgents(response.items);
      setSelectedAgentId((current) => {
        if (!response.items.length) {
          return undefined;
        }
        if (current && response.items.some((item) => item.id === current)) {
          return current;
        }
        return response.items[0].id;
      });
    } catch (apiError) {
      setAgents([]);
      setSelectedAgentId(undefined);
      setAgentsError(apiError instanceof Error ? apiError.message : uiText.loadAgentsFailed);
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const loadSkills = useCallback(async (instanceId?: string) => {
    if (!instanceId) {
      setSkills([]);
      setSelectedSkillId(undefined);
      setSkillsError(undefined);
      return;
    }

    setSkillsLoading(true);
    setSkillsError(undefined);
    try {
      const response = await listInstanceSkills(instanceId);
      setSkills(response.items);
      setSelectedSkillId((current) => {
        if (!response.items.length) {
          return undefined;
        }
        if (current && response.items.some((item) => item.id === current)) {
          return current;
        }
        return response.items[0].id;
      });
    } catch (apiError) {
      setSkills([]);
      setSelectedSkillId(undefined);
      setSkillsError(apiError instanceof Error ? apiError.message : uiText.loadSkillsFailed);
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  const loadMainAgentGuidance = useCallback(async (instanceId?: string) => {
    if (!instanceId) {
      setMainAgentGuidance(undefined);
      setMainAgentGuidanceError(undefined);
      setMainAgentPromptDraft("");
      setMainAgentOverrideEnabledDraft(true);
      setMainAgentGuidanceEditing(false);
      return;
    }

    setMainAgentGuidanceLoading(true);
    setMainAgentGuidanceError(undefined);
    try {
      const response = await getInstanceMainAgentGuidance(instanceId);
      setMainAgentGuidance(response);
      setMainAgentPromptDraft(response.overridePrompt ?? "");
      setMainAgentOverrideEnabledDraft(response.overrideEnabled ?? true);
      setMainAgentGuidanceEditing(false);
    } catch (apiError) {
      setMainAgentGuidance(undefined);
      setMainAgentPromptDraft("");
      setMainAgentOverrideEnabledDraft(true);
      setMainAgentGuidanceError(apiError instanceof Error ? apiError.message : uiText.mainAgentGuidanceLoadingFailed);
    } finally {
      setMainAgentGuidanceLoading(false);
    }
  }, []);

  const saveMainAgentGuidance = useCallback(async (): Promise<boolean> => {
    if (!selectedInstanceId) {
      return false;
    }
    if (!mainAgentGuidance?.overrideExists && !mainAgentPromptDraft.trim()) {
      messageApi.warning(uiText.mainAgentGuidancePromptRequired);
      return false;
    }
    setMainAgentGuidanceSaving(true);
    setMainAgentGuidanceError(undefined);
    try {
      const request: { prompt?: string; enabled?: boolean; updatedBy?: string } = {
        enabled: mainAgentOverrideEnabledDraft,
        updatedBy: "ui-dashboard",
      };
      if (mainAgentPromptDraft.trim()) {
        request.prompt = mainAgentPromptDraft;
      }
      const response = await upsertInstanceMainAgentGuidance(selectedInstanceId, request);
      setMainAgentGuidance(response);
      setMainAgentPromptDraft(response.overridePrompt ?? "");
      setMainAgentOverrideEnabledDraft(response.overrideEnabled ?? true);
      messageApi.success(uiText.mainAgentGuidanceSaved);
      return true;
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.mainAgentGuidanceSaveFailed);
      return false;
    } finally {
      setMainAgentGuidanceSaving(false);
    }
  }, [mainAgentGuidance?.overrideExists, mainAgentOverrideEnabledDraft, mainAgentPromptDraft, messageApi, selectedInstanceId]);

  const removeMainAgentGuidanceOverride = useCallback(async () => {
    if (!selectedInstanceId) {
      return;
    }
    setMainAgentGuidanceDeleting(true);
    setMainAgentGuidanceError(undefined);
    try {
      const response = await deleteInstanceMainAgentGuidance(selectedInstanceId);
      setMainAgentGuidance(response);
      setMainAgentPromptDraft("");
      setMainAgentOverrideEnabledDraft(true);
      setMainAgentGuidanceEditing(false);
      messageApi.success(uiText.mainAgentGuidanceDeleted);
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.mainAgentGuidanceDeleteFailed);
    } finally {
      setMainAgentGuidanceDeleting(false);
    }
  }, [messageApi, selectedInstanceId]);

  const cancelMainAgentGuidanceEdit = useCallback(() => {
    setMainAgentPromptDraft(baselineMainAgentPrompt);
    setMainAgentOverrideEnabledDraft(baselineMainAgentOverrideEnabled);
    setMainAgentGuidanceEditing(false);
  }, [baselineMainAgentOverrideEnabled, baselineMainAgentPrompt]);

  const saveAgentSystemPrompt = useCallback(async () => {
    if (!selectedInstanceId || !selectedAgent) {
      messageApi.warning(uiText.agentSystemPromptMissingAgent);
      return;
    }
    setAgentSystemPromptSaving(true);
    try {
      await upsertInstanceAgentSystemPrompt(selectedInstanceId, selectedAgent.id, {
        systemPrompt: agentSystemPromptDraft,
      });
      messageApi.success(uiText.agentSystemPromptSaved);
      await loadAgents(selectedInstanceId);
      setAgentSystemPromptEditing(false);
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.agentSystemPromptSaveFailed);
    } finally {
      setAgentSystemPromptSaving(false);
    }
  }, [agentSystemPromptDraft, loadAgents, messageApi, selectedAgent, selectedInstanceId]);

  useEffect(() => {
    void loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    void loadAgents(selectedInstanceId);
    void loadSkills(selectedInstanceId);
    void loadMainAgentGuidance(selectedInstanceId);
    setLatestAgentTask(undefined);
    setAgentTaskProgress(undefined);
  }, [loadAgents, loadMainAgentGuidance, loadSkills, selectedInstanceId]);

  useEffect(() => {
    setAgentSystemPromptEditing(false);
    setAgentSystemPromptDraft(selectedAgent?.systemPrompt ?? "");
  }, [selectedAgent?.id, selectedAgent?.systemPrompt]);

  useEffect(() => {
    return () => {
      terminalSocketRef.current?.close();
      terminalSocketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const outputElement = terminalOutputRef.current;
    if (!outputElement) {
      return;
    }
    outputElement.scrollTop = outputElement.scrollHeight;
  }, [terminalOutput]);

  const openCreateModal = () => {
    setCreateModalOpen(true);
    createForm.setFieldsValue({
      desiredState: "RUNNING",
    });
    void loadImages();
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    createForm.resetFields();
  };

  const openDeleteModal = () => {
    if (!selectedInstance) {
      return;
    }
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deletingInstance) {
      return;
    }
    setDeleteModalOpen(false);
  };

  const openRemoteModal = () => {
    if (!selectedInstance) {
      return;
    }
    setRemoteModalOpen(true);
  };

  const closeRemoteModal = () => {
    disconnectTerminal();
    setTerminalOutput("");
    setTerminalCommand("");
    setRemoteModalOpen(false);
  };

  const closePairingCodeModal = () => {
    if (pairingCodeLoading) {
      return;
    }
    setPairingCodeModalOpen(false);
  };

  const fetchAndShowPairingCode = useCallback(async (instanceId: string, instanceName?: string) => {
    setPairingCodeLoading(true);
    try {
      const response = await getInstancePairingCode(instanceId);
      setPairingCodeData(response);
      setPairingCodeInstanceName(instanceName);
      setPairingCodeModalOpen(true);
      if (!response.pairingCode) {
        messageApi.warning(response.note ?? uiText.pairingCodeUnavailable);
      }
      return response;
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.pairingCodeFetchFailed);
      return undefined;
    } finally {
      setPairingCodeLoading(false);
    }
  }, [messageApi]);

  const handleCreateInstance = async () => {
    try {
      const values = await createForm.validateFields();
      const request: CreateInstanceRequest = {
        ...values,
        hostId: appConfig.defaultHostId,
      };
      setCreatingInstance(true);
      const instance = await createInstance(request);
      closeCreateModal();
      await loadInstances();
      setSelectedInstanceId(instance.id);
      messageApi.success(`${uiText.instanceCreatedPrefix}${instance.name}`);
      if (values.desiredState === "RUNNING") {
        await fetchAndShowPairingCode(instance.id, instance.name);
      }
    } catch (apiError) {
      const hasValidationError =
        typeof apiError === "object" &&
        apiError !== null &&
        "errorFields" in apiError;
      if (hasValidationError) {
        return;
      }
      if (apiError instanceof Error && apiError.message.includes("HTTP 409")) {
        createForm.setFields([{ name: "name", errors: [uiText.nameAlreadyExists] }]);
        messageApi.error(uiText.nameAlreadyExists);
        return;
      }
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.createInstanceFailed);
    } finally {
      setCreatingInstance(false);
    }
  };

  const handleAction = async (action: InstanceActionType) => {
    if (!selectedInstanceId) {
      return false;
    }
    const instanceId = selectedInstanceId;
    const instanceName = selectedInstance?.name;
    setSubmittingAction(true);
    try {
      await submitInstanceAction(instanceId, action);
      await loadInstances();
      messageApi.success(`${uiText.actionSubmittedPrefix}${actionLabelMap[action]}`);
      if (action === "START" || action === "RESTART" || action === "ROLLBACK") {
        await fetchAndShowPairingCode(instanceId, instanceName);
      }
      return true;
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.actionFailed);
      return false;
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSensitiveAction = (action: Exclude<InstanceActionType, "START">) => {
    const instanceName = selectedInstance?.name;
    if (!instanceName) {
      return;
    }
    setPendingAction(action);
    setActionConfirmOpen(true);
  };

  const closeActionConfirm = () => {
    if (submittingAction) {
      return;
    }
    setActionConfirmOpen(false);
    setPendingAction(undefined);
  };

  const handleConfirmSensitiveAction = async () => {
    if (!pendingAction) {
      return;
    }
    const succeeded = await handleAction(pendingAction);
    if (succeeded) {
      closeActionConfirm();
    }
  };

  const handleDeleteInstance = async () => {
    if (!selectedInstance) {
      return;
    }

    const instanceName = selectedInstance.name;
    const instanceId = selectedInstance.id;
    setDeletingInstance(true);
    try {
      await deleteInstance(instanceId);
      await loadInstances();
      setDeleteModalOpen(false);
      messageApi.success(`${uiText.deleteSuccessPrefix}${instanceName}`);
    } catch (apiError) {
      if (apiError instanceof Error && apiError.message.includes("HTTP 404")) {
        await loadInstances();
        setDeleteModalOpen(false);
        messageApi.warning(uiText.instanceNotFound);
        return;
      }
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.deleteFailed);
    } finally {
      setDeletingInstance(false);
    }
  };

  const submitAgentTask = useCallback(async () => {
    if (!selectedInstance || !selectedAgentId || !agentMessageInput.trim()) {
      messageApi.warning(uiText.missingAgentOrMessage);
      return;
    }

    setAgentTaskSubmitting(true);
    setLatestAgentTask(undefined);
    try {
      setAgentTaskProgress(uiText.preparingTask);
      const prepared = await prepareAgentTask({
        instanceId: selectedInstance.id,
        agentId: selectedAgentId,
        message: agentMessageInput.trim(),
      });

      setAgentTaskProgress(uiText.confirmingTask);
      const confirmed = await confirmAgentTask({
        confirmToken: prepared.confirmToken,
      });

      const terminalStatus = new Set(["SUCCEEDED", "FAILED"]);
      let latest: AgentTaskResponse | undefined;

      setAgentTaskProgress(uiText.pollingTask);
      for (let attempt = 0; attempt < 120; attempt += 1) {
        latest = await getAgentTask(confirmed.taskId);
        setLatestAgentTask(latest);
        if (terminalStatus.has(String(latest.status).toUpperCase())) {
          break;
        }
        await sleep(1500);
      }

      if (!latest || !terminalStatus.has(String(latest.status).toUpperCase())) {
        throw new Error(uiText.taskTimeout);
      }

      if (String(latest.status).toUpperCase() === "SUCCEEDED") {
        setAgentMessageInput("");
        messageApi.success(uiText.agentTaskSuccess);
      } else {
        messageApi.error(latest.errorMessage || uiText.agentTaskFailed);
      }
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.agentTaskFailed);
    } finally {
      setAgentTaskProgress(undefined);
      setAgentTaskSubmitting(false);
    }
  }, [agentMessageInput, messageApi, selectedAgentId, selectedInstance]);

  const copyRemoteConnectCommand = async () => {
    if (!selectedRemoteConnectCommand) {
      messageApi.warning(uiText.remoteConnectUnavailable);
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedRemoteConnectCommand);
      messageApi.success(uiText.copyCommandSuccess);
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.copyCommandFailed);
    }
  };

  const appendTerminalOutput = useCallback((chunk: string) => {
    setTerminalOutput((current) => {
      const next = `${current}${chunk}`;
      if (next.length <= 120000) {
        return next;
      }
      return next.slice(next.length - 120000);
    });
  }, []);

  const buildTerminalWebSocketUrl = useCallback((instanceId: string) => {
    const apiBase = appConfig.controlApiBaseUrl;
    const query = `instanceId=${encodeURIComponent(instanceId)}`;

    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      const wsBase = apiBase.replace(/^http/i, "ws").replace(/\/$/, "");
      return `${wsBase}/v1/terminal/ws?${query}`;
    }

    const normalizedApiBase = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${normalizedApiBase}/v1/terminal/ws?${query}`;
  }, []);

  const disconnectTerminal = useCallback(() => {
    const socket = terminalSocketRef.current;
    terminalSocketRef.current = null;
    if (socket) {
      socket.close();
    }
    setTerminalConnecting(false);
    setTerminalConnected(false);
  }, []);

  const connectTerminal = useCallback(() => {
    if (!selectedInstance) {
      return;
    }
    if (selectedInstance.status !== "RUNNING") {
      messageApi.warning(uiText.terminalNotRunning);
      return;
    }

    disconnectTerminal();
    setTerminalOutput("");
    setTerminalCommand("");
    setTerminalConnecting(true);

    const socket = new WebSocket(buildTerminalWebSocketUrl(selectedInstance.id));
    terminalSocketRef.current = socket;

    socket.onopen = () => {
      setTerminalConnecting(false);
      setTerminalConnected(true);
      messageApi.success(uiText.terminalConnected);
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        appendTerminalOutput(event.data);
      }
    };

    socket.onerror = () => {
      messageApi.error(uiText.terminalConnectFailed);
    };

    socket.onclose = () => {
      terminalSocketRef.current = null;
      setTerminalConnecting(false);
      setTerminalConnected(false);
      appendTerminalOutput(`[system] ${uiText.terminalDisconnected}\n`);
    };
  }, [appendTerminalOutput, buildTerminalWebSocketUrl, disconnectTerminal, messageApi, selectedInstance]);

  const sendTerminalCommand = useCallback(() => {
    const socket = terminalSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      messageApi.warning(uiText.terminalConnectFailed);
      return;
    }
    if (!terminalCommand.trim()) {
      return;
    }
    appendTerminalOutput(`[you] ${terminalCommand}\n`);
    socket.send(`${terminalCommand}\n`);
    setTerminalCommand("");
  }, [appendTerminalOutput, messageApi, terminalCommand]);

  const openVisualUi = useCallback(() => {
    if (!selectedGatewayUrl) {
      return;
    }
    window.open(selectedGatewayUrl, "_blank", "noopener,noreferrer");
  }, [selectedGatewayUrl]);

  const openPairingCodeModal = useCallback(() => {
    if (!selectedInstance) {
      return;
    }
    void fetchAndShowPairingCode(selectedInstance.id, selectedInstance.name);
  }, [fetchAndShowPairingCode, selectedInstance]);

  const openInstanceDetail = useCallback((instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setActiveView("instance-detail");
    setInstanceDetailTab("agents");
  }, []);

  const openMenuView = useCallback((view: Exclude<ConsoleView, "instance-detail">) => {
    setActiveView(view);
    if (view === "instances") {
      setInstanceDetailTab("agents");
    }
  }, []);

  return (
    <>
      {messageContext}
      <div className="ai-console">
        <div className="mx-auto w-full max-w-[1680px]">
          <div className={`console-shell ${sidebarCollapsed ? "is-collapsed" : ""}`}>
            <aside className="console-sidebar">
              <div className="sidebar-head">
                <Button
                  type="text"
                  className="sidebar-toggle"
                  title={sidebarCollapsed ? uiText.menuExpand : uiText.menuCollapse}
                  onClick={() => setSidebarCollapsed((value) => !value)}
                  icon={sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                />
                {!sidebarCollapsed ? <span className="sidebar-title">Console</span> : null}
              </div>
              <nav className="sidebar-nav">
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "instances" ? "is-active" : ""}`}
                  onClick={() => openMenuView("instances")}
                  title={uiText.menuInstances}
                >
                  <Server size={16} />
                  {!sidebarCollapsed ? <span>{uiText.menuInstances}</span> : null}
                </button>
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "agents" ? "is-active" : ""}`}
                  onClick={() => openMenuView("agents")}
                  title={uiText.menuAgents}
                >
                  <Bot size={16} />
                  {!sidebarCollapsed ? <span>{uiText.menuAgents}</span> : null}
                </button>
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "skills" ? "is-active" : ""}`}
                  onClick={() => openMenuView("skills")}
                  title={uiText.menuSkills}
                >
                  <Wrench size={16} />
                  {!sidebarCollapsed ? <span>{uiText.menuSkills}</span> : null}
                </button>
              </nav>
            </aside>
            <div className="console-main">
              <Layout className="ai-layout" style={{ minHeight: "100vh" }}>
            <Header className="console-header">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                  <p className="console-kicker">AI Runtime Control</p>
                  <Title level={3} style={{ margin: 0 }}>
                    {uiText.pageTitle}
                  </Title>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">shadcn/ui</Badge>
                  <Badge variant="neutral">Tailwind CSS</Badge>
                  <Badge variant="warning">Next.js 15</Badge>
                </div>
              </div>
              <p className="console-subtitle">UI layer refreshed with modern AI-console visual style.</p>
            </Header>
            <Content className="console-content">
              <Space direction="vertical" style={{ width: "100%" }} size="large">
                {activeView === "instances" ? (
                  <>
                    <div className="kpi-grid">
                      <ShadCard>
                        <ShadCardHeader>
                          <ShadCardTitle>{uiText.totalInstances}</ShadCardTitle>
                        </ShadCardHeader>
                        <ShadCardContent className="text-3xl font-semibold text-slate-900">
                          {dashboardStats.total}
                        </ShadCardContent>
                      </ShadCard>
                      <ShadCard>
                        <ShadCardHeader>
                          <ShadCardTitle>{uiText.runningInstances}</ShadCardTitle>
                        </ShadCardHeader>
                        <ShadCardContent className="text-3xl font-semibold text-emerald-700">
                          {dashboardStats.running}
                        </ShadCardContent>
                      </ShadCard>
                      <ShadCard>
                        <ShadCardHeader>
                          <ShadCardTitle>{uiText.stoppedInstances}</ShadCardTitle>
                        </ShadCardHeader>
                        <ShadCardContent className="text-3xl font-semibold text-slate-600">
                          {dashboardStats.stopped}
                        </ShadCardContent>
                      </ShadCard>
                      <ShadCard>
                        <ShadCardHeader>
                          <ShadCardTitle>{uiText.errorInstances}</ShadCardTitle>
                        </ShadCardHeader>
                        <ShadCardContent className="text-3xl font-semibold text-red-600">
                          {dashboardStats.errorCount}
                        </ShadCardContent>
                      </ShadCard>
                    </div>
                    <Card
                      className="glass-card"
                      title={uiText.listTitle}
                      extra={(
                        <Space>
                          <Button loading={loadingInstances} onClick={() => void loadInstances()}>{uiText.refresh}</Button>
                          <Button type="primary" onClick={openCreateModal}>
                            {uiText.create}
                          </Button>
                        </Space>
                      )}
                    >
                      {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} /> : null}
                      <Text type="secondary">{uiText.listSubtitle}</Text>
                      {loadingInstances ? (
                        <div className="empty-panel">{uiText.loadingInstances}</div>
                      ) : instances.length === 0 ? (
                        <div className="empty-panel">{uiText.noInstances}</div>
                      ) : (
                        <div className="instance-card-grid">
                          {instances.map((instance) => {
                            const isSelected = selectedInstanceId === instance.id;
                            const gatewayUrl = resolveUiControllerUrl(instance) ?? uiText.gatewayUrlUnavailable;
                            return (
                              <button
                                key={instance.id}
                                type="button"
                                className={`instance-card ${isSelected ? "is-selected" : ""}`}
                                onClick={() => openInstanceDetail(instance.id)}
                              >
                                <div className="instance-card-head">
                                  <strong>{instance.name}</strong>
                                  <Tag color={statusColor(instance.status)}>{instance.status}</Tag>
                                </div>
                                <p className="instance-card-line">{instance.image}</p>
                                <p className="instance-card-line">{gatewayUrl}</p>
                                <div className="instance-card-foot">
                                  <span
                                    onClick={(event) => event.stopPropagation()}
                                    onMouseDown={(event) => event.stopPropagation()}
                                  >
                                    <Text
                                      copyable={{
                                        text: instance.id,
                                        onCopy: () => messageApi.success(uiText.instanceIdCopied),
                                      }}
                                      title={instance.id}
                                    >
                                      {shortInstanceId(instance.id)}
                                    </Text>
                                  </span>
                                  <span>{instance.updatedAt}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </>
                ) : null}

                {activeView === "instance-detail" ? (
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <Button icon={<ArrowLeft size={14} />} className="back-button" onClick={() => openMenuView("instances")}>
                      {uiText.backToInstances}
                    </Button>
                    <Card className="glass-card" title={selectedInstance ? `${uiText.instanceDetailTitle}：${selectedInstance.name}` : uiText.selectInstance}>
              {selectedInstance ? (
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label={uiText.instanceId}>
                      <Text
                        code
                        copyable={{
                          text: selectedInstance.id,
                          onCopy: () => messageApi.success(uiText.instanceIdCopied),
                        }}
                      >
                        {selectedInstance.id}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={uiText.hostId}>{selectedInstance.hostId}</Descriptions.Item>
                    <Descriptions.Item label={uiText.image}>{selectedInstance.image}</Descriptions.Item>
                    <Descriptions.Item label={uiText.gatewayHostPort}>
                      {selectedInstance.gatewayHostPort ?? uiText.gatewayUrlUnavailable}
                    </Descriptions.Item>
                    <Descriptions.Item label={uiText.gatewayUrl} span={2}>
                      {selectedGatewayUrl ?? uiText.gatewayUrlUnavailable}
                    </Descriptions.Item>
                    <Descriptions.Item label={uiText.currentStatus}>
                      <Tag color={statusColor(selectedInstance.status)}>{selectedInstance.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={uiText.desiredState}>{selectedInstance.desiredState}</Descriptions.Item>
                    <Descriptions.Item label={uiText.createdAt}>{selectedInstance.createdAt}</Descriptions.Item>
                    <Descriptions.Item label={uiText.updatedAt}>{selectedInstance.updatedAt}</Descriptions.Item>
                  </Descriptions>
                  <Space>
                    <Button
                      type="primary"
                      loading={submittingAction}
                      disabled={disableStart}
                      onClick={() => void handleAction("START")}
                    >
                      {uiText.start}
                    </Button>
                    <Button
                      loading={submittingAction}
                      disabled={disableStop}
                      onClick={() => handleSensitiveAction("STOP")}
                    >
                      {uiText.stop}
                    </Button>
                    <Button
                      loading={submittingAction}
                      disabled={disableRestartInstance}
                      onClick={() => handleSensitiveAction("RESTART")}
                    >
                      {uiText.restartInstance}
                    </Button>
                    <Button
                      danger
                      loading={submittingAction}
                      disabled={disableRollback}
                      onClick={() => handleSensitiveAction("ROLLBACK")}
                    >
                      {uiText.rollback}
                    </Button>
                    <Button danger loading={deletingInstance} disabled={disableDelete} onClick={openDeleteModal}>
                      {uiText.delete}
                    </Button>
                    <Button type="primary" disabled={disableRemoteConnect} onClick={openRemoteModal}>
                      {uiText.remoteConnect}
                    </Button>
                    <Button loading={pairingCodeLoading} disabled={!selectedInstance} onClick={openPairingCodeModal}>
                      {uiText.fetchPairingCode}
                    </Button>
                    <Button type="primary" onClick={openVisualUi} disabled={!selectedGatewayUrl}>
                      {uiText.openVisualUi}
                    </Button>
                  </Space>
                  <Card
                    className="sub-glass-card"
                    size="small"
                    title={uiText.mainAgentGuidanceTitle}
                    extra={(
                      <Space>
                        <Button
                          loading={mainAgentGuidanceLoading}
                          onClick={() => void loadMainAgentGuidance(selectedInstance.id)}
                        >
                          {uiText.mainAgentGuidanceRefresh}
                        </Button>
                        {mainAgentGuidanceEditing ? (
                          <>
                            <Button
                              type="primary"
                              loading={mainAgentGuidanceSaving}
                              disabled={mainAgentGuidanceLoading || mainAgentGuidanceDeleting || !mainAgentGuidanceDirty}
                              onClick={async () => {
                                const saved = await saveMainAgentGuidance();
                                if (saved) {
                                  setMainAgentGuidanceEditing(false);
                                }
                              }}
                            >
                              {uiText.mainAgentGuidanceSave}
                            </Button>
                            <Button
                              disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                              onClick={cancelMainAgentGuidanceEdit}
                            >
                              {uiText.mainAgentGuidanceCancel}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                              onClick={() => setMainAgentGuidanceEditing(true)}
                            >
                              {uiText.mainAgentGuidanceEdit}
                            </Button>
                            <Button
                              danger
                              loading={mainAgentGuidanceDeleting}
                              disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || !mainAgentGuidance?.overrideExists}
                              onClick={() => void removeMainAgentGuidanceOverride()}
                            >
                              {uiText.mainAgentGuidanceDelete}
                            </Button>
                          </>
                        )}
                      </Space>
                    )}
                  >
                    <Space direction="vertical" style={{ width: "100%" }} size="middle">
                      {mainAgentGuidanceError ? <Alert type="error" showIcon message={mainAgentGuidanceError} /> : null}
                      <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label={uiText.mainAgentGuidanceSource}>
                          {mainAgentGuidance?.source ?? "-"}
                        </Descriptions.Item>
                        <Descriptions.Item label={uiText.mainAgentGuidanceWorkspacePath}>
                          <Text code copyable={mainAgentGuidance?.workspacePath ? { text: mainAgentGuidance.workspacePath } : false}>
                            {mainAgentGuidance?.workspacePath ?? "-"}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label={uiText.mainAgentGuidanceGlobalPath}>
                          {mainAgentGuidance?.globalDefaultPath ? (
                            <Text code copyable={{ text: mainAgentGuidance.globalDefaultPath }}>
                              {mainAgentGuidance.globalDefaultPath}
                            </Text>
                          ) : "-"}
                        </Descriptions.Item>
                        <Descriptions.Item label={uiText.mainAgentGuidanceOverwriteOnStart}>
                          {typeof mainAgentGuidance?.overwriteOnStart === "boolean"
                            ? String(mainAgentGuidance.overwriteOnStart)
                            : "-"}
                        </Descriptions.Item>
                      </Descriptions>
                      {mainAgentGuidanceEditing ? (
                        <>
                          <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
                            <Text>{uiText.mainAgentGuidanceOverrideEnabled}</Text>
                            <Switch
                              checked={mainAgentOverrideEnabledDraft}
                              onChange={setMainAgentOverrideEnabledDraft}
                              disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                            />
                          </Space>
                          <Input.TextArea
                            rows={8}
                            value={mainAgentPromptDraft}
                            onChange={(event) => setMainAgentPromptDraft(event.target.value)}
                            placeholder={uiText.mainAgentGuidanceOverridePromptPlaceholder}
                            disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                          />
                        </>
                      ) : (
                        <>
                          <Text strong>{uiText.mainAgentGuidanceEffectivePrompt}</Text>
                          {mainAgentGuidance?.effectivePrompt ? (
                            <Paragraph style={{ marginBottom: 0 }}>
                              <Text code style={{ whiteSpace: "pre-wrap" }}>
                                {mainAgentGuidance.effectivePrompt}
                              </Text>
                            </Paragraph>
                          ) : (
                            <Text type="secondary">{uiText.mainAgentGuidanceNoEffectivePrompt}</Text>
                          )}
                        </>
                      )}
                    </Space>
                  </Card>
                  <Card
                    className="sub-glass-card"
                    size="small"
                    title={uiText.agentSkillPanelTitle}
                  >
                    <Tabs
                      activeKey={instanceDetailTab}
                      onChange={(key) => setInstanceDetailTab(key as InstanceDetailTabKey)}
                      items={[
                        {
                          key: "agents",
                          label: uiText.tabAgent,
                          children: (
                            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                              <Button loading={agentsLoading} onClick={() => void loadAgents(selectedInstance.id)}>
                                {uiText.refreshAgents}
                              </Button>
                              {agentsError ? <Alert type="error" showIcon message={agentsError} /> : null}
                              {(!agentsLoading && agents.length === 0) ? (
                                <Text type="secondary">{uiText.noAgents}</Text>
                              ) : null}
                              <Select
                                showSearch
                                loading={agentsLoading}
                                placeholder={uiText.selectAgent}
                                value={selectedAgentId}
                                onChange={setSelectedAgentId}
                                options={agents.map((item) => ({
                                  value: item.id,
                                  label: item.id,
                                }))}
                              />
                              {selectedAgent ? (
                                <Descriptions column={1} size="small" bordered>
                                  <Descriptions.Item label={uiText.selectAgent}>{selectedAgent.id}</Descriptions.Item>
                                  <Descriptions.Item label={uiText.agentProvider}>{selectedAgent.provider ?? "-"}</Descriptions.Item>
                                  <Descriptions.Item label={uiText.agentModel}>{selectedAgent.model ?? "-"}</Descriptions.Item>
                                  <Descriptions.Item label={uiText.agenticMode}>
                                    {typeof selectedAgent.agentic === "boolean" ? String(selectedAgent.agentic) : "-"}
                                  </Descriptions.Item>
                                  <Descriptions.Item label={uiText.agentAllowedTools}>
                                    {selectedAgentAllowedTools.length > 0 ? selectedAgentAllowedTools.join(", ") : "-"}
                                  </Descriptions.Item>
                                </Descriptions>
                              ) : null}
                              {selectedAgent ? (
                                <Card
                                  className="sub-glass-card"
                                  size="small"
                                  title={uiText.agentSystemPromptTitle}
                                  extra={agentSystemPromptEditing ? (
                                    <Space>
                                      <Button
                                        type="primary"
                                        loading={agentSystemPromptSaving}
                                        disabled={!agentSystemPromptDirty}
                                        onClick={() => void saveAgentSystemPrompt()}
                                      >
                                        {uiText.agentSystemPromptSave}
                                      </Button>
                                      <Button
                                        disabled={agentSystemPromptSaving}
                                        onClick={() => {
                                          setAgentSystemPromptDraft(baselineAgentSystemPrompt);
                                          setAgentSystemPromptEditing(false);
                                        }}
                                      >
                                        {uiText.agentSystemPromptCancel}
                                      </Button>
                                    </Space>
                                  ) : (
                                    <Button
                                      disabled={agentSystemPromptSaving}
                                      onClick={() => setAgentSystemPromptEditing(true)}
                                    >
                                      {uiText.agentSystemPromptEdit}
                                    </Button>
                                  )}
                                >
                                  <Space direction="vertical" style={{ width: "100%" }} size="small">
                                    <Descriptions column={1} size="small" bordered>
                                      <Descriptions.Item label={uiText.agentSystemPromptPath}>
                                        {selectedAgent.configPath ? (
                                          <Text code copyable={{ text: selectedAgent.configPath }}>{selectedAgent.configPath}</Text>
                                        ) : "-"}
                                      </Descriptions.Item>
                                    </Descriptions>
                                    <Text strong>{uiText.agentSystemPromptPreview}</Text>
                                    <Input.TextArea
                                      rows={8}
                                      value={agentSystemPromptDraft}
                                      onChange={(event) => setAgentSystemPromptDraft(event.target.value)}
                                      placeholder={uiText.agentSystemPromptPlaceholder}
                                      readOnly={!agentSystemPromptEditing}
                                      disabled={agentSystemPromptSaving}
                                    />
                                  </Space>
                                </Card>
                              ) : null}
                              <div className="agent-sender">
                                <Input.TextArea
                                  rows={4}
                                  value={agentMessageInput}
                                  onChange={(event) => setAgentMessageInput(event.target.value)}
                                  placeholder={uiText.agentMessagePlaceholder}
                                  onPressEnter={(event) => {
                                    if (!event.shiftKey) {
                                      event.preventDefault();
                                      void submitAgentTask();
                                    }
                                  }}
                                />
                                <div className="agent-sender-actions">
                                  <Button
                                    type="primary"
                                    loading={agentTaskSubmitting}
                                    disabled={disableSendAgentMessage}
                                    onClick={() => void submitAgentTask()}
                                  >
                                    {uiText.sendAgentMessage}
                                  </Button>
                                </div>
                              </div>
                              {disableSendAgentMessage ? (
                                <Text type="secondary">{uiText.missingAgentOrMessage}</Text>
                              ) : null}
                              {agentTaskProgress ? <Alert type="info" showIcon message={agentTaskProgress} /> : null}
                              {latestAgentTask ? (
                                <Space direction="vertical" style={{ width: "100%" }} size="small">
                                  <Descriptions column={1} size="small" bordered>
                                    <Descriptions.Item label={uiText.taskId}>{latestAgentTask.taskId}</Descriptions.Item>
                                    <Descriptions.Item label={uiText.taskStatus}>{latestAgentTask.status}</Descriptions.Item>
                                    <Descriptions.Item label={uiText.updatedAt}>{latestAgentTask.updatedAt}</Descriptions.Item>
                                  </Descriptions>
                                  {latestAgentTask.responseBody ? (
                                    <div className="agent-bubble-wrap">
                                      <Text strong>{uiText.taskResult}</Text>
                                      <pre className="agent-bubble-text">{latestAgentTask.responseBody}</pre>
                                    </div>
                                  ) : null}
                                  {latestAgentTask.errorMessage ? (
                                    <Alert type="error" showIcon message={uiText.taskError} description={latestAgentTask.errorMessage} />
                                  ) : null}
                                </Space>
                              ) : null}
                            </Space>
                          ),
                        },
                        {
                          key: "skills",
                          label: uiText.tabSkill,
                          children: (
                            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                              <Button loading={skillsLoading} onClick={() => void loadSkills(selectedInstance.id)}>
                                {uiText.refreshSkills}
                              </Button>
                              {skillsError ? <Alert type="error" showIcon message={skillsError} /> : null}
                              <Alert type="info" showIcon message={uiText.skillScopeHint} />
                              {(!skillsLoading && skills.length === 0) ? (
                                <Text type="secondary">{uiText.noSkills}</Text>
                              ) : null}
                              {skills.length > 0 ? (
                                <>
                                  <Text type="secondary">{uiText.skillListHint}</Text>
                                  <div className="skill-card-grid">
                                    {skills.map((item) => {
                                      const selected = selectedSkillId === item.id;
                                      const allowed = selectedAgentAllowedTools.length === 0 || selectedAgentAllowedTools.includes(item.id);
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          className={`skill-card ${selected ? "is-selected" : ""}`}
                                          onClick={() => setSelectedSkillId(item.id)}
                                        >
                                          <div className="skill-card-head">
                                            <strong className="skill-card-title">{item.id}</strong>
                                            <Tag color={allowed ? "green" : "orange"}>
                                              {allowed ? uiText.skillAllowed : uiText.skillNotAllowed}
                                            </Tag>
                                          </div>
                                          <p className="skill-card-path">{item.path}</p>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              ) : null}
                              {selectedSkill ? (
                                <Space direction="vertical" style={{ width: "100%" }} size="small">
                                  <Descriptions column={1} size="small" bordered>
                                    <Descriptions.Item label={uiText.selectSkill}>{selectedSkill.id}</Descriptions.Item>
                                    <Descriptions.Item label={uiText.skillPath}>
                                      <Text code copyable={{ text: selectedSkill.path }}>{selectedSkill.path}</Text>
                                    </Descriptions.Item>
                                  </Descriptions>
                                  {selectedSkillNotAllowed ? <Alert type="warning" showIcon message={uiText.agentSkillNotAllowed} /> : null}
                                  <Text strong>{uiText.skillPrompt}</Text>
                                  <Input.TextArea
                                    rows={10}
                                    readOnly
                                    value={selectedSkill.prompt}
                                  />
                                </Space>
                              ) : (
                                <Text type="secondary">{uiText.noSkillPrompt}</Text>
                              )}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </Card>
                </Space>
              ) : (
                <Text type="secondary">{uiText.selectInstanceFirst}</Text>
              )}
                    </Card>
                  </Space>
                ) : null}
                {activeView === "agents" ? (
                  <Card className="glass-card" title={uiText.menuAgents}>
                    <div className="empty-panel">{uiText.noAgentsSection}</div>
                  </Card>
                ) : null}
                {activeView === "skills" ? (
                  <Card className="glass-card" title={uiText.menuSkills}>
                    <div className="empty-panel">{uiText.noSkillsSection}</div>
                  </Card>
                ) : null}
              </Space>
            </Content>
              </Layout>
            </div>
          </div>
        </div>
      </div>
      <Modal
        title={uiText.createModalTitle}
        open={createModalOpen}
        onCancel={closeCreateModal}
        onOk={() => void handleCreateInstance()}
        okText={uiText.create}
        confirmLoading={creatingInstance}
      >
        <Form<CreateInstanceFormValues> form={createForm} layout="vertical">
          <Form.Item
            name="name"
            label={uiText.instanceName}
            rules={[
              { required: true, message: uiText.requiredName },
              {
                validator: (_, value) => {
                  if (typeof value !== "string") {
                    return Promise.resolve();
                  }
                  const normalized = value.trim().toLowerCase();
                  if (!normalized) {
                    return Promise.resolve();
                  }
                  const duplicated = instances.some((item) => item.name.trim().toLowerCase() === normalized);
                  if (duplicated) {
                    return Promise.reject(new Error(uiText.nameAlreadyExists));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="zeroclaw-instance-01" />
          </Form.Item>
          <Alert type="info" showIcon message={`${uiText.fixedHostTipPrefix}${appConfig.defaultHostId}`} style={{ marginBottom: 16 }} />
          <Form.Item
            name="image"
            label={uiText.image}
            rules={[{ required: true, message: uiText.requiredImage }]}
          >
            <Select
              loading={loadingImages}
              options={images.map((item) => ({
                value: item.image,
                label: item.recommended ? `${item.name} (recommended) - ${item.image}` : `${item.name} - ${item.image}`,
              }))}
            />
          </Form.Item>
          {images.length === 0 && !loadingImages ? (
            <Alert type="warning" showIcon message={uiText.noPresetImage} />
          ) : null}
          <Form.Item name="desiredState" label={uiText.desiredState} initialValue="RUNNING">
            <Select
              options={[
                { value: "RUNNING", label: uiText.desiredStateRunning },
                { value: "STOPPED", label: uiText.desiredStateStopped },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={uiText.remoteConnectTitle}
        open={remoteModalOpen}
        onCancel={closeRemoteModal}
        width="min(1100px, 96vw)"
        styles={{ body: { maxHeight: "78vh", overflowY: "auto" } }}
        footer={[
          <Button key="cancel" onClick={closeRemoteModal}>
            {uiText.cancel}
          </Button>,
          <Button key="copy" type="primary" onClick={() => void copyRemoteConnectCommand()} disabled={!selectedRemoteConnectCommand}>
            {uiText.copyCommand}
          </Button>,
        ]}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary">{uiText.remoteConnectHint}</Text>
          <Text strong>{`${uiText.instanceName}: ${selectedInstance?.name ?? "-"}`}</Text>
          <Text strong>{uiText.remoteConnectCommand}</Text>
          {selectedRemoteConnectCommand ? (
            <Paragraph copyable={{ text: selectedRemoteConnectCommand }} style={{ marginBottom: 0 }}>
              <Text code>{selectedRemoteConnectCommand}</Text>
            </Paragraph>
          ) : (
            <Alert type="warning" showIcon message={uiText.remoteConnectUnavailable} />
          )}
          <Text strong>{uiText.webTerminal}</Text>
          <Space>
            <Button type="primary" loading={terminalConnecting} disabled={terminalConnected} onClick={connectTerminal}>
              {uiText.connectTerminal}
            </Button>
            <Button disabled={!terminalConnected} onClick={disconnectTerminal}>
              {uiText.disconnectTerminal}
            </Button>
          </Space>
          <Text>{uiText.terminalOutput}</Text>
          <div
            ref={terminalOutputRef}
            style={{
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              padding: 12,
              height: 360,
              overflowY: "auto",
              background: "#fff",
              fontFamily: "monospace",
              fontSize: 13,
            }}
          >
            {terminalRenderedLines.map((line, index) => {
              const normalizedLine = line ?? "";
              const isSystemLine = normalizedLine.startsWith("[system]");
              const isUserLine = normalizedLine.startsWith("[you]");
              const color = isUserLine ? "#1677ff" : isSystemLine ? "#8c8c8c" : "#111111";
              return (
                <div key={`${index}-${normalizedLine}`} style={{ whiteSpace: "pre-wrap", color }}>
                  {normalizedLine}
                </div>
              );
            })}
          </div>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              value={terminalCommand}
              onChange={(event) => setTerminalCommand(event.target.value)}
              placeholder={uiText.terminalInputPlaceholder}
              onPressEnter={() => sendTerminalCommand()}
              disabled={!terminalConnected}
            />
            <Button type="primary" onClick={sendTerminalCommand} disabled={!terminalConnected || !terminalCommand.trim()}>
              {uiText.sendCommand}
            </Button>
          </Space.Compact>
        </Space>
      </Modal>
      <Modal
        title={uiText.pairingCodeTitle}
        open={pairingCodeModalOpen}
        onCancel={closePairingCodeModal}
        footer={[
          <Button key="cancel" onClick={closePairingCodeModal} disabled={pairingCodeLoading}>
            {uiText.cancel}
          </Button>,
          <Button
            key="refresh"
            type="primary"
            loading={pairingCodeLoading}
            disabled={!selectedInstance}
            onClick={openPairingCodeModal}
          >
            {uiText.refreshPairingCode}
          </Button>,
        ]}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary">{uiText.pairingCodeHint}</Text>
          <Text strong>{`${uiText.instanceName}: ${pairingCodeInstanceName ?? selectedInstance?.name ?? "-"}`}</Text>
          <Text strong>{uiText.pairingCode}</Text>
          {selectedPairingCode ? (
            <Paragraph copyable={{ text: selectedPairingCode }} style={{ marginBottom: 0 }}>
              <Text code style={{ fontSize: 24 }}>{selectedPairingCode}</Text>
            </Paragraph>
          ) : (
            <Alert type="warning" showIcon message={pairingCodeData?.note ?? uiText.pairingCodeUnavailable} />
          )}
          {selectedPairingLink ? (
            <>
              <Text strong>{uiText.pairingLink}</Text>
              <Paragraph copyable={{ text: selectedPairingLink }} style={{ marginBottom: 0 }}>
                <a href={selectedPairingLink} target="_blank" rel="noreferrer">
                  {selectedPairingLink}
                </a>
              </Paragraph>
            </>
          ) : null}
          {pairingCodeData?.fetchedAt ? (
            <Text type="secondary">{`${uiText.pairingCodeFetchedAt}: ${pairingCodeData.fetchedAt}`}</Text>
          ) : null}
          {pairingCodeData?.note ? (
            <Text type="secondary">{pairingCodeData.note}</Text>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={uiText.confirmActionTitle}
        open={actionConfirmOpen}
        onCancel={closeActionConfirm}
        onOk={() => void handleConfirmSensitiveAction()}
        okText={uiText.confirmActionOk}
        cancelText={uiText.cancel}
        confirmLoading={submittingAction}
        okButtonProps={{ danger: pendingAction === "ROLLBACK" }}
        destroyOnHidden
      >
        <Text>{`${uiText.confirmActionContentPrefix}${pendingAction ? actionLabelMap[pendingAction] : "-"} (${selectedInstance?.name ?? "-"})`}</Text>
      </Modal>
      <Modal
        title={uiText.deleteConfirmTitle}
        open={deleteModalOpen}
        onCancel={closeDeleteModal}
        onOk={() => void handleDeleteInstance()}
        okText={uiText.delete}
        cancelText={uiText.cancel}
        confirmLoading={deletingInstance}
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Text>{`${uiText.deleteConfirmContentPrefix}${selectedInstance?.name ?? "-"}`}</Text>
      </Modal>
    </>
  );
}
