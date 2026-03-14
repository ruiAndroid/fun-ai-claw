"use client";

import {
  createInstance,
  deleteInstanceMainAgentGuidance,
  deleteInstance,
  getInstanceMainAgentGuidance,
  getInstancePairingCode,
  listImages,
  listInstanceAgentBindings,
  listInstances,
  submitInstanceAction,
  upsertInstanceMainAgentGuidance,
} from "@/lib/control-api";
import { AgentBaselinePanel } from "@/components/agent-baseline-panel";
import { InstanceAgentPanel } from "@/components/instance-agent-panel";
import { InstanceChannelsConfigPanel } from "@/components/instance-channels-config-panel";
import { InstanceConfigPanel } from "@/components/instance-config-panel";
import { InstanceSkillPanel } from "@/components/instance-skill-panel";
import { InstanceTaskPanel } from "@/components/instance-task-panel";
import { OpenPlatformPanel } from "@/components/open-platform-panel";
import { SkillBaselinePanel } from "@/components/skill-baseline-panel";
import { appConfig } from "@/config/app-config";
import { ClawInstance, CreateInstanceRequest, ImagePreset, InstanceActionType, InstanceAgentBinding, InstanceMainAgentGuidance, PairingCodeResponse } from "@/types/contracts";
import {
  type AgentChatMessage,
  type AgentChatRole,
  type AgentChatTiming,
  type AgentComposerInteractionDraft,
  type AgentInteractionAction,
  type AgentSessionCoreFields,
  type AgentSessionDebugEntry,
  type AgentSessionDelta,
  type AgentSessionDisconnectNotice,
  type AgentSessionStreamMessage,
  type AgentTurnTracker,
  formatAgentInteractionPayloadForDisplay,
  formatAgentSessionDebugTimestamp,
  formatAgentTimingDuration,
  formatAgentTimingTooltip,
  getAgentInteractionResolvedNote,
  getAgentInteractionStateLabel,
  getAgentTimingNow,
  isAgentSessionPlaceholderValue,
  isImagePresetAvailable,
  normalizeAgentChatMessage,
  normalizeStructuredAgentChatMessage,
  parseAgentInteractionPayload,
  parseAgentSessionCoreFields,
  parseAgentSessionFrame,
} from "@/lib/agent-session-protocol";
import { uiText } from "@/constants/ui-text";
import { ArrowLeft, Bot, ChevronLeft, ChevronRight, Globe, Server, Wrench, Layers, AlertTriangle, Pause, Activity, Play, Square, RotateCcw, Trash2, Terminal, Eye, MonitorPlay, RefreshCw, FileText, Copy, Plug } from "lucide-react";
import { Alert, Button, Card, Form, Input, Layout, Modal, Segmented, Select, Space, Spin, Switch, Tabs, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";

const { Header, Content } = Layout;
const { Text, Paragraph } = Typography;
type CreateInstanceFormValues = Omit<CreateInstanceRequest, "hostId">;
type ConsoleView = "instances" | "agents" | "skills" | "mcp" | "instance-detail" | "open-platform";
type InstanceDetailTabKey = "claw" | "config" | "channels" | "agents" | "skills" | "tasks";
type AgentMessageSendOptions = {
  displayText?: string;
  resolveInteractionMessageId?: string;
  resolvedInteractionNote?: string;
};
type QueuedAgentSessionMessage = {
  normalizedMessage: string;
  options?: AgentMessageSendOptions;
};

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return <span className={className}>{displayValue}</span>;
}
type AgentSessionMode = "auto" | "direct";

const MD3_EASE = [0.22, 1, 0.36, 1] as const;
const staggerContainer = { animate: { transition: { staggerChildren: 0.08 } } };
const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: MD3_EASE } },
};

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
  const [activeInstanceAction, setActiveInstanceAction] = useState<{ action: InstanceActionType; instanceName?: string }>();
  const [deletingInstance, setDeletingInstance] = useState(false);
  const [error, setError] = useState<string>();
  const [pairingCodeModalOpen, setPairingCodeModalOpen] = useState(false);
  const [pairingCodeLoading, setPairingCodeLoading] = useState(false);
  const [pairingCodeData, setPairingCodeData] = useState<PairingCodeResponse>();
  const [pairingCodeInstanceName, setPairingCodeInstanceName] = useState<string>();
  const [agents, setAgents] = useState<InstanceAgentBinding[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string>();
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [instanceConfigReloadToken, setInstanceConfigReloadToken] = useState(0);
  const [agentSessionMode, setAgentSessionMode] = useState<AgentSessionMode>("direct");
  const [agentMessageInput, setAgentMessageInput] = useState("");
  const [agentComposerInteractionDraft, setAgentComposerInteractionDraft] = useState<AgentComposerInteractionDraft>();
  const agentSessionSocketRef = useRef<WebSocket | null>(null);
  const agentQueuedMessageRef = useRef<QueuedAgentSessionMessage | null>(null);
  const agentMessageComposingRef = useRef(false);
  const agentAssistantMessageAliasRef = useRef<Map<string, string>>(new Map());
  const queuedAgentSessionDeltasRef = useRef<AgentSessionDelta[]>([]);
  const queuedAgentSessionDeltasFlushRef = useRef<number | null>(null);
  const queuedStructuredAgentMessagesRef = useRef<Map<string, AgentSessionStreamMessage>>(new Map());
  const queuedStructuredAgentMessagesFlushRef = useRef<number | null>(null);
  const flushQueuedAgentMessageRef = useRef<() => boolean>(() => false);
  const agentSessionLineBufferRef = useRef("");
  const agentPendingAssistantMessageIdRef = useRef<string | null>(null);
  const agentTurnQueueRef = useRef<AgentTurnTracker[]>([]);
  const agentChatMessageSeqRef = useRef(0);
  const agentSessionDebugEntrySeqRef = useRef(0);
  const [agentSessionOutput, setAgentSessionOutput] = useState("");
  const [agentSessionConnecting, setAgentSessionConnecting] = useState(false);
  const [agentSessionConnected, setAgentSessionConnected] = useState(false);
  const agentSessionOutputRef = useRef<HTMLDivElement | null>(null);
  const agentSessionSuppressCloseMessageRef = useRef(false);
  const [agentChatMessages, setAgentChatMessages] = useState<AgentChatMessage[]>([]);
  const [agentSessionDebugVisible, setAgentSessionDebugVisible] = useState(false);
  const [agentSessionDebugEntries, setAgentSessionDebugEntries] = useState<AgentSessionDebugEntry[]>([]);
  const [agentSessionHasStarted, setAgentSessionHasStarted] = useState(false);
  const agentSessionHasStartedRef = useRef(false);
  const [agentSessionDisconnectNotice, setAgentSessionDisconnectNotice] = useState<AgentSessionDisconnectNotice>();
  const [agentSessionCoreFields, setAgentSessionCoreFields] = useState<AgentSessionCoreFields>();
  const [mainAgentGuidance, setMainAgentGuidance] = useState<InstanceMainAgentGuidance>();
  const [mainAgentGuidanceLoading, setMainAgentGuidanceLoading] = useState(false);
  const [mainAgentGuidanceSaving, setMainAgentGuidanceSaving] = useState(false);
  const [mainAgentGuidanceDeleting, setMainAgentGuidanceDeleting] = useState(false);
  const [mainAgentGuidanceError, setMainAgentGuidanceError] = useState<string>();
  const [mainAgentPromptDraft, setMainAgentPromptDraft] = useState("");
  const [mainAgentOverrideEnabledDraft, setMainAgentOverrideEnabledDraft] = useState(true);
  const [mainAgentGuidanceEditing, setMainAgentGuidanceEditing] = useState(false);
  const [mainAgentGuidanceCollapsed, setMainAgentGuidanceCollapsed] = useState(true);
  const [instanceDetailTab, setInstanceDetailTab] = useState<InstanceDetailTabKey>("claw");
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
    () => agents.find((item) => item.agentKey === selectedAgentId),
    [agents, selectedAgentId]
  );
  useEffect(() => {
    agentSessionHasStartedRef.current = agentSessionHasStarted;
  }, [agentSessionHasStarted]);
  const selectedStatus = selectedInstance?.status;
  const actionBusy = submittingAction || deletingInstance;
  const disableStart = !selectedInstance || actionBusy || selectedStatus === "RUNNING" || selectedStatus === "CREATING";
  const disableStop = !selectedInstance || actionBusy || selectedStatus === "STOPPED" || selectedStatus === "CREATING";
  const disableRestartInstance = !selectedInstance || actionBusy || selectedStatus === "CREATING";
  const disableDelete = !selectedInstance || actionBusy;
  const disableRemoteConnect = !selectedInstance;
  const agentSessionRequiresDirectAgent = agentSessionMode === "direct";
  const agentSessionTargetAgentId = agentSessionRequiresDirectAgent ? selectedAgentId : undefined;
  const disableSendAgentMessage = !selectedInstance
    || selectedStatus !== "RUNNING"
    || agentSessionConnecting
    || !agentMessageInput.trim()
    || (agentSessionRequiresDirectAgent && !selectedAgentId);
  const disableAgentInteractionSend = !selectedInstance
    || selectedStatus !== "RUNNING"
    || agentSessionConnecting
    || (agentSessionRequiresDirectAgent && !selectedAgentId);
  const agentSessionInputLocked = agentSessionConnecting;
  const disableConnectAgentSession = !selectedInstance
    || selectedStatus !== "RUNNING"
    || agentSessionConnecting
    || agentSessionConnected
    || agentsLoading
    || (agentSessionRequiresDirectAgent && !selectedAgentId);
  const agentSessionReconnectAvailable = Boolean(agentSessionDisconnectNotice) && !agentSessionConnected;
  const agentSessionStatusTagColor = agentSessionConnected ? "cyan" : agentSessionReconnectAvailable ? "gold" : "default";
  const agentSessionStatusLabel = agentSessionConnected
    ? uiText.agentSessionConnectedHint
    : agentSessionReconnectAvailable
      ? uiText.agentSessionDisconnectedHint
      : uiText.agentSessionIdleHint;
  const agentSessionStatusDescription = agentSessionConnected
    ? uiText.agentSessionControlActiveHint
    : agentSessionReconnectAvailable
      ? uiText.agentSessionControlReconnectHint
      : uiText.agentSessionControlIdleHint;
  const selectedRemoteConnectCommand = selectedInstance?.remoteConnectCommand?.trim();
  const selectedGatewayUrl = selectedInstance ? resolveUiControllerUrl(selectedInstance) : undefined;
  const agentSessionRenderedLines = useMemo(() => agentSessionOutput.split("\n"), [agentSessionOutput]);
  const hasAgentSessionDebugData = useMemo(
    () => agentSessionDebugEntries.length > 0 || agentSessionOutput.trim().length > 0,
    [agentSessionDebugEntries, agentSessionOutput]
  );
  const latestInteractiveAgentMessage = useMemo(
    () => [...agentChatMessages].reverse().find((item) => item.role === "assistant" && !item.interactionResolved && (item.interaction?.actions.length ?? 0) > 0),
    [agentChatMessages]
  );
  const pendingAgentApprovalMessageId = latestInteractiveAgentMessage?.interaction ? latestInteractiveAgentMessage.id : undefined;
  const agentSessionDisconnectAlertTitle = !agentSessionDisconnectNotice
    ? undefined
    : agentSessionDisconnectNotice.afterConnectionEstablished
      ? uiText.agentSessionDisconnectAlertTitle
      : uiText.agentSessionConnectInterruptedTitle;
  const agentSessionDisconnectAlertDescription = !agentSessionDisconnectNotice
    ? undefined
    : agentSessionDisconnectNotice.afterConnectionEstablished
      ? agentSessionDisconnectNotice.hadConversation
        ? uiText.agentSessionDisconnectAlertRestartDescription
        : uiText.agentSessionDisconnectAlertDescription
      : uiText.agentSessionConnectInterruptedDescription;
  const agentMessageComposerPlaceholder = agentComposerInteractionDraft?.interactionAction === "revise"
    ? `请补充你对“${getAgentInteractionStateLabel(agentComposerInteractionDraft.stateId) ?? "当前内容"}”的修改要求`
    : agentSessionConnected
      ? uiText.agentSessionFollowUpPlaceholder
      : agentSessionReconnectAvailable
        ? uiText.agentSessionReconnectFirst
        : uiText.agentMessagePlaceholder;
  const agentComposerDraftStateLabel = getAgentInteractionStateLabel(agentComposerInteractionDraft?.stateId) ?? "当前内容";
  const terminalRenderedLines = useMemo(() => terminalOutput.split("\n"), [terminalOutput]);
  const selectedPairingCode = pairingCodeData?.pairingCode?.trim();
  const selectedPairingLink = pairingCodeData?.pairingLink?.trim();
  const actionLabelMap: Record<InstanceActionType, string> = {
    START: uiText.start,
    STOP: uiText.stop,
    RESTART: uiText.restartInstance,
    ROLLBACK: uiText.rollback,
  };
  const activeActionLabel = activeInstanceAction ? actionLabelMap[activeInstanceAction.action] : "";
  const baselineMainAgentPrompt = mainAgentGuidance?.overridePrompt ?? "";
  const baselineMainAgentOverrideEnabled = mainAgentGuidance?.overrideEnabled ?? true;
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
        const availableImages = response.items.filter(isImagePresetAvailable);
        const defaultImage = availableImages.find((item) => item.recommended)?.image
          ?? availableImages[0]?.image
          ?? undefined;
        createForm.setFieldValue("image", defaultImage);
      } else {
        createForm.setFieldValue("image", undefined);
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
      const response = await listInstanceAgentBindings(instanceId);
      setAgents(response.items);
      setSelectedAgentId((current) => {
        if (!response.items.length) {
          return undefined;
        }
        if (current && response.items.some((item) => item.agentKey === current)) {
          return current;
        }
        return response.items[0].agentKey;
      });
    } catch (apiError) {
      setAgents([]);
      setSelectedAgentId(undefined);
      setAgentsError(apiError instanceof Error ? apiError.message : uiText.loadAgentsFailed);
    } finally {
      setAgentsLoading(false);
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

  useEffect(() => {
    void loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    void loadAgents(selectedInstanceId);
    void loadMainAgentGuidance(selectedInstanceId);
  }, [loadAgents, loadMainAgentGuidance, selectedInstanceId]);

  const handleInstalledAgentsChange = useCallback((nextAgents: InstanceAgentBinding[]) => {
    setAgents(nextAgents);
    setAgentsError(undefined);
    setInstanceConfigReloadToken((current) => current + 1);
    setSelectedAgentId((current) => {
      if (!nextAgents.length) {
        return undefined;
      }
      if (current && nextAgents.some((item) => item.agentKey === current)) {
        return current;
      }
      return nextAgents[0].agentKey;
    });
  }, []);

  useEffect(() => {
    setMainAgentGuidanceCollapsed(true);
  }, [selectedInstanceId]);

  const clearQueuedAgentSessionDeltas = useCallback(() => {
    if (queuedAgentSessionDeltasFlushRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(queuedAgentSessionDeltasFlushRef.current);
    }
    queuedAgentSessionDeltasFlushRef.current = null;
    queuedAgentSessionDeltasRef.current = [];
    agentAssistantMessageAliasRef.current.clear();
  }, []);

  const clearQueuedStructuredAgentSessionMessages = useCallback(() => {
    if (queuedStructuredAgentMessagesFlushRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(queuedStructuredAgentMessagesFlushRef.current);
    }
    queuedStructuredAgentMessagesFlushRef.current = null;
    queuedStructuredAgentMessagesRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      agentSessionSuppressCloseMessageRef.current = true;
      clearQueuedAgentSessionDeltas();
      clearQueuedStructuredAgentSessionMessages();
      agentQueuedMessageRef.current = null;
      agentSessionLineBufferRef.current = "";
      agentPendingAssistantMessageIdRef.current = null;
      agentTurnQueueRef.current = [];
      agentSessionSocketRef.current?.close();
      agentSessionSocketRef.current = null;
      terminalSocketRef.current?.close();
      terminalSocketRef.current = null;
    };
  }, [clearQueuedAgentSessionDeltas, clearQueuedStructuredAgentSessionMessages]);

  useEffect(() => {
    const outputElement = agentSessionOutputRef.current;
    if (!outputElement) {
      return;
    }
    outputElement.scrollTop = outputElement.scrollHeight;
  }, [agentChatMessages]);

  useEffect(() => {
    const outputElement = terminalOutputRef.current;
    if (!outputElement) {
      return;
    }
    outputElement.scrollTop = outputElement.scrollHeight;
  }, [terminalOutput]);

  useEffect(() => {
    const socket = agentSessionSocketRef.current;
    if (!socket) {
      setAgentSessionOutput("");
      setAgentChatMessages([]);
      setAgentSessionHasStarted(false);
      agentSessionHasStartedRef.current = false;
      setAgentSessionDisconnectNotice(undefined);
      setAgentMessageInput("");
      setAgentSessionDebugVisible(false);
      setAgentSessionDebugEntries([]);
      clearQueuedAgentSessionDeltas();
      clearQueuedStructuredAgentSessionMessages();
      agentQueuedMessageRef.current = null;
      agentSessionLineBufferRef.current = "";
      agentPendingAssistantMessageIdRef.current = null;
      agentTurnQueueRef.current = [];
      agentSessionDebugEntrySeqRef.current = 0;
      return;
    }
    agentSessionSuppressCloseMessageRef.current = true;
    socket.close();
    agentSessionSocketRef.current = null;
    setAgentSessionConnected(false);
    setAgentSessionConnecting(false);
    setAgentSessionOutput("");
    setAgentChatMessages([]);
    setAgentSessionHasStarted(false);
    agentSessionHasStartedRef.current = false;
    setAgentSessionDisconnectNotice(undefined);
    setAgentMessageInput("");
    setAgentSessionDebugVisible(false);
    setAgentSessionDebugEntries([]);
    clearQueuedAgentSessionDeltas();
    clearQueuedStructuredAgentSessionMessages();
    agentQueuedMessageRef.current = null;
    agentSessionLineBufferRef.current = "";
    agentPendingAssistantMessageIdRef.current = null;
    agentTurnQueueRef.current = [];
    agentSessionDebugEntrySeqRef.current = 0;
  }, [clearQueuedAgentSessionDeltas, clearQueuedStructuredAgentSessionMessages, selectedInstanceId]);

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
    const instanceName = selectedInstance?.name ?? "-";
    setActiveInstanceAction({ action, instanceName });
    setSubmittingAction(true);
    try {
      await submitInstanceAction(instanceId, action);
      await loadInstances();
      messageApi.success(`${uiText.actionSubmittedPrefix}${actionLabelMap[action]}`);
      setSubmittingAction(false);
      setActiveInstanceAction(undefined);
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
    const action = pendingAction;
    setActionConfirmOpen(false);
    setPendingAction(undefined);
    await handleAction(action);
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

  const clearAgentComposerInteractionDraft = useCallback(() => {
    setAgentComposerInteractionDraft(undefined);
    setAgentMessageInput("");
  }, []);

  const copyAgentChatContent = useCallback(async (content: string) => {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return;
    }
    try {
      await navigator.clipboard.writeText(normalizedContent);
      messageApi.success(uiText.agentSessionCopyOutputSuccess);
    } catch (apiError) {
      messageApi.error(apiError instanceof Error ? apiError.message : uiText.agentSessionCopyOutputFailed);
    }
  }, [messageApi]);

  const appendTerminalOutput = useCallback((chunk: string) => {
    setTerminalOutput((current) => {
      const next = `${current}${chunk}`;
      if (next.length <= 120000) {
        return next;
      }
      return next.slice(next.length - 120000);
    });
  }, []);

  const appendAgentSessionOutput = useCallback((chunk: string) => {
    setAgentSessionOutput((current) => {
      const next = `${current}${chunk}`;
      if (next.length <= 120000) {
        return next;
      }
      return next.slice(next.length - 120000);
    });
  }, []);

  const formatAgentMessageForDisplay = useCallback((normalizedMessage: string) => {
    const interactionDisplay = formatAgentInteractionPayloadForDisplay(normalizedMessage);
    if (interactionDisplay) {
      return interactionDisplay;
    }

    const scriptTypeMatch = normalizedMessage.match(/script_type=([^\s]+)/);
    const scriptContentMatch = normalizedMessage.match(/script_content=(.+?)(?=\s+target_audience=|\s+expected_episode_count=|$)/);
    const targetAudienceMatch = normalizedMessage.match(/target_audience=([^\s]+)/);
    const episodeCountMatch = normalizedMessage.match(/expected_episode_count=([^\s]+)/);

    if (scriptTypeMatch && scriptContentMatch && targetAudienceMatch && episodeCountMatch) {
      return [
        `请帮我生成${scriptTypeMatch[1]}`,
        `故事：${scriptContentMatch[1].trim()}`,
        `受众：${targetAudienceMatch[1]}`,
        `集数：${episodeCountMatch[1]}`,
      ].join("\n");
    }

    return normalizedMessage;
  }, []);

  const nextAgentChatMessageId = useCallback(() => {
    agentChatMessageSeqRef.current += 1;
    return `agent-chat-${agentChatMessageSeqRef.current}`;
  }, []);

  const nextAgentSessionDebugEntryId = useCallback(() => {
    agentSessionDebugEntrySeqRef.current += 1;
    return `agent-debug-${agentSessionDebugEntrySeqRef.current}`;
  }, []);

  const appendAgentSessionDebugEntry = useCallback((entry: Omit<AgentSessionDebugEntry, "id">) => {
    const normalizedContent = entry.content.trim();
    if (!normalizedContent) {
      return;
    }
    setAgentSessionDebugEntries((current) => [
      ...current,
      {
        id: nextAgentSessionDebugEntryId(),
        ...entry,
        content: normalizedContent,
      },
    ]);
  }, [nextAgentSessionDebugEntryId]);

  const pruneCommittedAgentTurns = useCallback(() => {
    agentTurnQueueRef.current = agentTurnQueueRef.current.filter((item) => !item.committed);
  }, []);

  const buildAgentChatTiming = useCallback((turn: AgentTurnTracker): AgentChatTiming | undefined => {
    const hasTiming = turn.llmRequestCount > 0
      || typeof turn.firstThinkingDurationMs === "number"
      || typeof turn.firstVisibleDurationMs === "number"
      || turn.modelDurationMs > 0
      || typeof turn.totalDurationMs === "number"
      || typeof turn.agentDurationMs === "number";
    if (!hasTiming) {
      return undefined;
    }
    return {
      provider: turn.provider,
      model: turn.model,
      llmRequestCount: turn.llmRequestCount > 0 ? turn.llmRequestCount : undefined,
      firstThinkingDurationMs: typeof turn.firstThinkingDurationMs === "number" ? turn.firstThinkingDurationMs : undefined,
      firstVisibleDurationMs: typeof turn.firstVisibleDurationMs === "number" ? turn.firstVisibleDurationMs : undefined,
      modelDurationMs: turn.modelDurationMs > 0 ? turn.modelDurationMs : undefined,
      agentDurationMs: typeof turn.agentDurationMs === "number" ? turn.agentDurationMs : undefined,
      totalDurationMs: typeof turn.totalDurationMs === "number" ? turn.totalDurationMs : undefined,
      firstThinkingAt: turn.firstThinkingAt,
      firstVisibleAt: turn.firstVisibleAt,
      completedAt: turn.completedAt,
    };
  }, []);

  const applyTimingToAgentChatMessage = useCallback((messageId: string, turn: AgentTurnTracker) => {
    const timing = buildAgentChatTiming(turn);
    if (!timing) {
      return;
    }
    setAgentChatMessages((current) => current.map((item) => (
      item.id === messageId
        ? {
          ...item,
          emittedAt: turn.assistantEmittedAt ?? item.emittedAt,
          timing: {
            ...item.timing,
            ...timing,
          },
        }
        : item
    )));
  }, [buildAgentChatTiming]);

  const commitAgentTurnTiming = useCallback((turn: AgentTurnTracker) => {
    if (!turn.assistantMessageId) {
      return;
    }
    applyTimingToAgentChatMessage(turn.assistantMessageId, turn);
    if (typeof turn.totalDurationMs === "number") {
      turn.committed = true;
      pruneCommittedAgentTurns();
    }
  }, [applyTimingToAgentChatMessage, pruneCommittedAgentTurns]);

  const bindAssistantMessageToAgentTurn = useCallback((
    messageId: string,
    emittedAt?: string,
    hasVisibleContent = false,
    hasThinkingContent = false,
  ) => {
    const existingTurn = agentTurnQueueRef.current.find((item) => item.assistantMessageId === messageId);
    if (existingTurn) {
      let changed = false;
      if (!existingTurn.assistantEmittedAt && emittedAt) {
        existingTurn.assistantEmittedAt = emittedAt;
        changed = true;
      }
      if (hasThinkingContent && typeof existingTurn.firstThinkingDurationMs !== "number") {
        existingTurn.firstThinkingAt = emittedAt ?? new Date().toISOString();
        existingTurn.firstThinkingDurationMs = Math.max(Math.round(getAgentTimingNow() - existingTurn.startedAtMs), 0);
        changed = true;
      }
      if (hasVisibleContent && typeof existingTurn.firstVisibleDurationMs !== "number") {
        existingTurn.firstVisibleAt = emittedAt ?? new Date().toISOString();
        existingTurn.firstVisibleDurationMs = Math.max(Math.round(getAgentTimingNow() - existingTurn.startedAtMs), 0);
        changed = true;
      }
      if (changed) {
        commitAgentTurnTiming(existingTurn);
      }
      return;
    }

    const placeholderTurn = agentTurnQueueRef.current.find((item) => !item.assistantMessageId && Boolean(item.placeholderAssistantMessageId));
    if (placeholderTurn) {
      let changed = false;
      const placeholderMessageId = placeholderTurn.placeholderAssistantMessageId;
      if (placeholderMessageId && placeholderMessageId !== messageId) {
        agentAssistantMessageAliasRef.current.set(messageId, placeholderMessageId);
      }
      placeholderTurn.assistantMessageId = messageId;
      placeholderTurn.placeholderAssistantMessageId = undefined;
      changed = true;
      if (emittedAt) {
        placeholderTurn.assistantEmittedAt = emittedAt;
      }
      if (hasThinkingContent && typeof placeholderTurn.firstThinkingDurationMs !== "number") {
        placeholderTurn.firstThinkingAt = emittedAt ?? new Date().toISOString();
        placeholderTurn.firstThinkingDurationMs = Math.max(Math.round(getAgentTimingNow() - placeholderTurn.startedAtMs), 0);
        changed = true;
      }
      if (hasVisibleContent && typeof placeholderTurn.firstVisibleDurationMs !== "number") {
        placeholderTurn.firstVisibleAt = emittedAt ?? new Date().toISOString();
        placeholderTurn.firstVisibleDurationMs = Math.max(Math.round(getAgentTimingNow() - placeholderTurn.startedAtMs), 0);
        changed = true;
      }
      if (changed) {
        commitAgentTurnTiming(placeholderTurn);
      }
      return;
    }

    const pendingTurn = agentTurnQueueRef.current.find((item) => !item.assistantMessageId && !item.placeholderAssistantMessageId);
    if (!pendingTurn) {
      return;
    }
    let changed = false;
    pendingTurn.assistantMessageId = messageId;
    changed = true;
    if (emittedAt) {
      pendingTurn.assistantEmittedAt = emittedAt;
    }
    if (hasThinkingContent && typeof pendingTurn.firstThinkingDurationMs !== "number") {
      pendingTurn.firstThinkingAt = emittedAt ?? new Date().toISOString();
      pendingTurn.firstThinkingDurationMs = Math.max(Math.round(getAgentTimingNow() - pendingTurn.startedAtMs), 0);
      changed = true;
    }
    if (hasVisibleContent && typeof pendingTurn.firstVisibleDurationMs !== "number") {
      pendingTurn.firstVisibleAt = emittedAt ?? new Date().toISOString();
      pendingTurn.firstVisibleDurationMs = Math.max(Math.round(getAgentTimingNow() - pendingTurn.startedAtMs), 0);
      changed = true;
    }
    if (changed) {
      commitAgentTurnTiming(pendingTurn);
    }
  }, [commitAgentTurnTiming]);

  const recordAgentTurnRequest = useCallback((provider?: string, model?: string) => {
    const activeTurn = agentTurnQueueRef.current.find((item) => typeof item.totalDurationMs !== "number");
    if (!activeTurn) {
      return;
    }
    activeTurn.llmRequestCount += 1;
    activeTurn.provider = provider ?? activeTurn.provider;
    activeTurn.model = model ?? activeTurn.model;
    if (activeTurn.assistantMessageId) {
      applyTimingToAgentChatMessage(activeTurn.assistantMessageId, activeTurn);
    }
  }, [applyTimingToAgentChatMessage]);

  const recordAgentTurnResponse = useCallback((provider?: string, model?: string, durationMs?: number) => {
    const activeTurn = agentTurnQueueRef.current.find((item) => typeof item.totalDurationMs !== "number");
    if (!activeTurn) {
      return;
    }
    activeTurn.provider = provider ?? activeTurn.provider;
    activeTurn.model = model ?? activeTurn.model;
    if (typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs >= 0) {
      activeTurn.modelDurationMs += durationMs;
    }
    if (activeTurn.assistantMessageId) {
      applyTimingToAgentChatMessage(activeTurn.assistantMessageId, activeTurn);
    }
  }, [applyTimingToAgentChatMessage]);

  const finalizeActiveAgentTurnTiming = useCallback((completedAt?: string) => {
    const activeTurn = agentTurnQueueRef.current.find((item) => typeof item.totalDurationMs !== "number");
    if (!activeTurn) {
      return;
    }
    const totalDurationMs = Math.max(Math.round(getAgentTimingNow() - activeTurn.startedAtMs), 0);
    activeTurn.totalDurationMs = totalDurationMs;
    activeTurn.agentDurationMs = Math.max(totalDurationMs - activeTurn.modelDurationMs, 0);
    activeTurn.completedAt = completedAt ?? new Date().toISOString();
    commitAgentTurnTiming(activeTurn);
  }, [commitAgentTurnTiming]);

  const trackAgentTimingFromDebug = useCallback((content: string, emittedAt?: string) => {
    const lines = content
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    lines.forEach((line) => {
      const requestMatch = line.match(/\bllm\.request\b.*\bprovider=([^\s]+)\s+model=([^\s]+)/);
      if (requestMatch) {
        recordAgentTurnRequest(requestMatch[1], requestMatch[2]);
        return;
      }

      const responseMatch = line.match(/\bllm\.response\b.*\bprovider=([^\s]+)\s+model=([^\s]+).*?\bduration_ms=(\d+)/);
      if (responseMatch) {
        recordAgentTurnResponse(responseMatch[1], responseMatch[2], Number(responseMatch[3]));
        return;
      }

      if (line.includes("turn.complete")) {
        finalizeActiveAgentTurnTiming(emittedAt);
      }
    });
  }, [finalizeActiveAgentTurnTiming, recordAgentTurnRequest, recordAgentTurnResponse]);

  const appendAgentChatMessage = useCallback((
    role: AgentChatRole,
    content: string,
    pending = false,
    metadata?: Partial<Pick<AgentChatMessage, "createdAt" | "emittedAt" | "timing">>,
  ) => {
    const normalizedMessage = normalizeAgentChatMessage(role, content, pending);
    if (!normalizedMessage) {
      return undefined;
    }
    const messageId = nextAgentChatMessageId();
    setAgentChatMessages((current) => [
      ...current,
      {
        id: messageId,
        ...normalizedMessage,
        ...metadata,
      },
    ]);
    return messageId;
  }, [nextAgentChatMessageId]);

  const appendPendingAssistantPlaceholder = useCallback((createdAt?: string) => {
    const messageId = nextAgentChatMessageId();
    setAgentChatMessages((current) => [
      ...current,
      {
        id: messageId,
        role: "assistant",
        content: "",
        thinkingContent: "",
        pending: true,
        createdAt,
      },
    ]);
    return messageId;
  }, [nextAgentChatMessageId]);

  const finalizePendingAssistantMessage = useCallback(() => {
    const pendingMessageId = agentPendingAssistantMessageIdRef.current;
    if (!pendingMessageId) {
      return;
    }
    setAgentChatMessages((current) => current.flatMap((item) => {
      if (item.id !== pendingMessageId) {
        return [item];
      }
      const normalizedMessage = normalizeAgentChatMessage(item.role, item.content, false);
      if (!normalizedMessage) {
        return [];
      }
      return [{
        ...item,
        ...normalizedMessage,
        createdAt: item.createdAt,
        emittedAt: item.emittedAt,
        timing: item.timing,
      }];
    }));
    agentPendingAssistantMessageIdRef.current = null;
  }, []);

  const appendStructuredAgentSessionMessage = useCallback((message: AgentSessionStreamMessage) => {
    finalizePendingAssistantMessage();
    const normalizedMessage = normalizeStructuredAgentChatMessage(message);
    if (!normalizedMessage) {
      return;
    }
    if (normalizedMessage.role === "assistant" && !message.pending) {
      agentAssistantMessageAliasRef.current.delete(normalizedMessage.id);
    }
    setAgentChatMessages((current) => {
      const nextMessages = normalizedMessage.role === "assistant" && normalizedMessage.content.trim()
        ? current.filter((item) => !(
          item.role === "assistant"
          && item.pending
          && item.id !== normalizedMessage.id
          && !item.content.trim()
        ))
        : current;
      const existingIndex = nextMessages.findIndex((item) => item.id === normalizedMessage.id);
      if (existingIndex < 0) {
        const activeTurn = agentTurnQueueRef.current.find((item) => typeof item.totalDurationMs !== "number");
        const placeholderMessageId = activeTurn?.placeholderAssistantMessageId;
        if (placeholderMessageId && placeholderMessageId !== normalizedMessage.id) {
          let adoptedPlaceholder = false;
          const adoptedMessages = nextMessages.map((item) => {
            if (item.id !== placeholderMessageId) {
              return item;
            }
            adoptedPlaceholder = true;
            return {
              ...item,
              ...normalizedMessage,
              id: normalizedMessage.id,
              createdAt: item.createdAt,
              emittedAt: normalizedMessage.emittedAt ?? item.emittedAt,
              timing: normalizedMessage.timing ?? item.timing,
            };
          });
          if (adoptedPlaceholder) {
            return adoptedMessages;
          }
        }
        return [...nextMessages, normalizedMessage];
      }
      return nextMessages.map((item) => (
        item.id === normalizedMessage.id
          ? {
            ...item,
            ...normalizedMessage,
            createdAt: item.createdAt,
            emittedAt: normalizedMessage.emittedAt ?? item.emittedAt,
            timing: normalizedMessage.timing ?? item.timing,
          }
          : item
      ));
    });
    if (normalizedMessage.role === "assistant") {
      bindAssistantMessageToAgentTurn(
        normalizedMessage.id,
        normalizedMessage.emittedAt ?? message.emittedAt,
        normalizedMessage.content.trim().length > 0,
        Boolean(normalizedMessage.thinkingContent?.trim()),
      );
    }
  }, [bindAssistantMessageToAgentTurn, finalizePendingAssistantMessage]);

  const flushQueuedStructuredAgentSessionMessages = useCallback(() => {
    queuedStructuredAgentMessagesFlushRef.current = null;
    const queuedMessages = Array.from(queuedStructuredAgentMessagesRef.current.values())
      .sort((left, right) => left.sequence - right.sequence);
    queuedStructuredAgentMessagesRef.current.clear();
    queuedMessages.forEach((message) => {
      appendStructuredAgentSessionMessage(message);
    });
  }, [appendStructuredAgentSessionMessage]);

  const flushQueuedAgentSessionDeltas = useCallback(() => {
    queuedAgentSessionDeltasFlushRef.current = null;
    const queuedDeltas = [...queuedAgentSessionDeltasRef.current]
      .sort((left, right) => left.sequence - right.sequence);
    queuedAgentSessionDeltasRef.current = [];
    if (queuedDeltas.length === 0) {
      return;
    }

    setAgentChatMessages((current) => {
      let next = current;
      for (const delta of queuedDeltas) {
        let targetIndex = next.findIndex((item) => item.id === delta.messageId);
        if (targetIndex < 0 && delta.role === "assistant") {
          const aliasedMessageId = agentAssistantMessageAliasRef.current.get(delta.messageId);
          if (aliasedMessageId) {
            targetIndex = next.findIndex((item) => item.id === aliasedMessageId);
            if (targetIndex >= 0) {
              agentPendingAssistantMessageIdRef.current = delta.messageId;
              next = next.map((item, index) => (
                index === targetIndex
                  ? {
                    ...item,
                    id: delta.messageId,
                    emittedAt: delta.emittedAt ?? item.emittedAt,
                  }
                  : item
              ));
            }
          }
        }
        if (targetIndex < 0 && delta.role === "assistant") {
          const placeholderMessageId = agentTurnQueueRef.current.find(
            (item) => !item.assistantMessageId && Boolean(item.placeholderAssistantMessageId),
          )?.placeholderAssistantMessageId;
          if (placeholderMessageId) {
            targetIndex = next.findIndex((item) => item.id === placeholderMessageId);
            if (targetIndex >= 0) {
              agentPendingAssistantMessageIdRef.current = delta.messageId;
              next = next.map((item, index) => (
                index === targetIndex
                  ? {
                    ...item,
                    id: delta.messageId,
                    emittedAt: delta.emittedAt ?? item.emittedAt,
                  }
                  : item
              ));
              agentAssistantMessageAliasRef.current.set(delta.messageId, placeholderMessageId);
            }
          }
        }

        if (targetIndex < 0) {
          next = [
            ...next,
            {
              id: delta.messageId,
              role: delta.role,
              content: "",
              thinkingContent: "",
              pending: true,
              emittedAt: delta.emittedAt,
            },
          ];
          targetIndex = next.length - 1;
        }

        const currentItem = next[targetIndex];
        let nextItem = currentItem;

        if (delta.operation === "clear") {
          nextItem = delta.channel === "thinking"
            ? {
              ...currentItem,
              thinkingContent: "",
              pending: true,
              emittedAt: delta.emittedAt ?? currentItem.emittedAt,
            }
            : {
              ...currentItem,
              content: "",
              pending: true,
              emittedAt: delta.emittedAt ?? currentItem.emittedAt,
            };
        } else {
          const chunk = delta.chunk ?? "";
          if (!chunk) {
            continue;
          }
          nextItem = delta.channel === "thinking"
            ? {
              ...currentItem,
              thinkingContent: `${currentItem.thinkingContent ?? ""}${chunk}`,
              pending: true,
              emittedAt: delta.emittedAt ?? currentItem.emittedAt,
            }
            : {
              ...currentItem,
              content: `${currentItem.content}${chunk}`,
              thinkingContent: "",
              pending: true,
              emittedAt: delta.emittedAt ?? currentItem.emittedAt,
            };
        }

        if (nextItem !== currentItem) {
          next = next.map((item, index) => (index === targetIndex ? nextItem : item));
        }
      }
      return next;
    });

    queuedDeltas.forEach((delta) => {
      bindAssistantMessageToAgentTurn(
        delta.messageId,
        delta.emittedAt,
        delta.operation === "append" && delta.channel === "content" && Boolean(delta.chunk),
        delta.operation === "append" && delta.channel === "thinking" && Boolean(delta.chunk),
      );
    });
  }, [bindAssistantMessageToAgentTurn]);

  const queueAgentSessionDelta = useCallback((delta: AgentSessionDelta) => {
    queuedAgentSessionDeltasRef.current.push(delta);
    if (queuedAgentSessionDeltasFlushRef.current !== null) {
      return;
    }
    if (typeof window !== "undefined") {
      queuedAgentSessionDeltasFlushRef.current = window.setTimeout(() => {
        flushQueuedAgentSessionDeltas();
      }, 0);
      return;
    }
    flushQueuedAgentSessionDeltas();
  }, [flushQueuedAgentSessionDeltas]);

  const queueStructuredAgentSessionMessage = useCallback((message: AgentSessionStreamMessage) => {
    if (message.role === "assistant" && !message.pending && queuedAgentSessionDeltasRef.current.length > 0) {
      flushQueuedAgentSessionDeltas();
    }
    queuedStructuredAgentMessagesRef.current.set(message.messageId, message);
    if (queuedStructuredAgentMessagesFlushRef.current !== null) {
      return;
    }
    if (typeof window !== "undefined") {
      queuedStructuredAgentMessagesFlushRef.current = window.setTimeout(() => {
        flushQueuedStructuredAgentSessionMessages();
      }, 0);
      return;
    }
    flushQueuedStructuredAgentSessionMessages();
  }, [flushQueuedAgentSessionDeltas, flushQueuedStructuredAgentSessionMessages]);

  const appendAssistantMessageChunk = useCallback((chunk: string) => {
    if (!chunk && !agentPendingAssistantMessageIdRef.current) {
      return;
    }

    let createdMessageId: string | undefined;
    setAgentChatMessages((current) => {
      const pendingMessageId = agentPendingAssistantMessageIdRef.current;
      if (!pendingMessageId) {
        if (!chunk.trim()) {
          return current;
        }
        const placeholderMessageId = agentTurnQueueRef.current.find(
          (item) => !item.assistantMessageId && Boolean(item.placeholderAssistantMessageId),
        )?.placeholderAssistantMessageId;
        if (placeholderMessageId && current.some((item) => item.id === placeholderMessageId)) {
          agentPendingAssistantMessageIdRef.current = placeholderMessageId;
          return current.map((item) => (
            item.id === placeholderMessageId
              ? {
                ...item,
                content: `${item.content}${chunk}`,
                pending: true,
              }
              : item
          ));
        }
        const newMessageId = nextAgentChatMessageId();
        createdMessageId = newMessageId;
        agentPendingAssistantMessageIdRef.current = newMessageId;
        return [
          ...current,
          {
            id: newMessageId,
            role: "assistant",
            content: chunk,
            pending: true,
          },
        ];
      }

      return current.map((item) => {
        if (item.id !== pendingMessageId) {
          return item;
        }
        return {
          ...item,
          content: `${item.content}${chunk}`,
          pending: true,
        };
      });
    });
    if (createdMessageId) {
      bindAssistantMessageToAgentTurn(createdMessageId, undefined, true);
    }
  }, [bindAssistantMessageToAgentTurn, nextAgentChatMessageId]);

  const isAgentSessionLogLine = useCallback((line: string) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      return false;
    }
    return normalizedLine.includes("zeroclaw::")
      || /^20\d{2}-\d{2}-\d{2}T/.test(normalizedLine);
  }, []);

  const isAgentSessionMetaLine = useCallback((line: string) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      return false;
    }
    const prefixes = [
      "The user ",
      "The user's ",
      "The user has ",
      "The user is ",
      "According to ",
      "I need to ",
      "I must ",
      "I should ",
      "Let me ",
      "This is a follow-up",
      "The keywords",
      "The input contains",
    ];
    return prefixes.some((prefix) => normalizedLine.startsWith(prefix));
  }, []);

  const isAgentSessionInternalSystemMessage = useCallback((line: string) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      return false;
    }
    const ignoredPrefixes = [
      "connected:",
      "agent session ready:",
      "tip:",
    ];
    return ignoredPrefixes.some((prefix) => normalizedLine.startsWith(prefix));
  }, []);

  const processAgentSessionLine = useCallback((rawLine: string) => {
    const normalizedLine = rawLine.replace(/\r$/, "");
    const trimmedLine = normalizedLine.trim();

    if (!trimmedLine) {
      appendAssistantMessageChunk("\n");
      return;
    }

    if (normalizedLine.startsWith("[system]")) {
      finalizePendingAssistantMessage();
      const systemContent = normalizedLine.replace(/^\[system\]\s*/, "");
      if (!isAgentSessionInternalSystemMessage(systemContent)) {
        appendAgentChatMessage("system", systemContent);
      }
      return;
    }

    if (trimmedLine === "馃 ZeroClaw Interactive Mode" || trimmedLine === "Type /help for commands.") {
      return;
    }

    if (trimmedLine === ">") {
      finalizePendingAssistantMessage();
      return;
    }

    if (trimmedLine.startsWith(">")) {
      const lineAfterPrompt = trimmedLine.slice(1).trim();
      if (!lineAfterPrompt) {
        finalizePendingAssistantMessage();
        return;
      }
      if (lineAfterPrompt.startsWith("[you]")) {
        return;
      }
      if (isAgentSessionLogLine(lineAfterPrompt) || isAgentSessionMetaLine(lineAfterPrompt)) {
        return;
      }
      appendAssistantMessageChunk(`${lineAfterPrompt}\n`);
      return;
    }

    if (isAgentSessionLogLine(trimmedLine)) {
      if (trimmedLine.includes("turn.complete")) {
        finalizePendingAssistantMessage();
      }
      return;
    }

    if (isAgentSessionMetaLine(trimmedLine)) {
      return;
    }

    appendAssistantMessageChunk(`${normalizedLine}\n`);
  }, [
    appendAgentChatMessage,
    appendAssistantMessageChunk,
    finalizePendingAssistantMessage,
    isAgentSessionInternalSystemMessage,
    isAgentSessionLogLine,
    isAgentSessionMetaLine,
  ]);

  const processAgentSessionChunk = useCallback((chunk: string) => {
    appendAgentSessionOutput(chunk);
    agentSessionLineBufferRef.current += chunk;
    const lines = agentSessionLineBufferRef.current.split("\n");
    agentSessionLineBufferRef.current = lines.pop() ?? "";
    lines.forEach((line) => processAgentSessionLine(line));
  }, [appendAgentSessionOutput, processAgentSessionLine]);

  const handleAgentSessionSocketMessage = useCallback((data: string) => {
    const frame = parseAgentSessionFrame(data);
    if (!frame) {
      appendAgentSessionDebugEntry({
        eventType: "raw",
        content: data,
      });
      processAgentSessionChunk(data);
      return;
    }

    if (frame.eventType === "debug") {
      if (typeof frame.chunk === "string") {
        appendAgentSessionDebugEntry({
          eventType: "debug",
          emittedAt: frame.emittedAt,
          content: frame.chunk,
        });
        appendAgentSessionOutput(frame.chunk);
        trackAgentTimingFromDebug(frame.chunk, frame.emittedAt);
      }
      return;
    }

    if (frame.eventType === "delta" && frame.delta) {
      queueAgentSessionDelta(frame.delta);
      return;
    }

    if (frame.eventType === "message" && frame.message) {
      if (frame.message.role === "system" && frame.message.content.startsWith("agent session ready:")) {
        flushQueuedAgentMessageRef.current();
      }
      if (!(frame.message.role === "assistant" && frame.message.pending)) {
        appendAgentSessionDebugEntry({
          eventType: "message",
          role: frame.message.role,
          emittedAt: frame.message.emittedAt,
          content: frame.message.content,
        });
      }
      queueStructuredAgentSessionMessage(frame.message);
      return;
    }

    processAgentSessionChunk(data);
  }, [
    appendAgentSessionDebugEntry,
    appendAgentSessionOutput,
    processAgentSessionChunk,
    queueAgentSessionDelta,
    queueStructuredAgentSessionMessage,
    trackAgentTimingFromDebug,
  ]);

  const normalizeAgentSessionMessage = useCallback((rawInput: string) => {
    const normalizedLines = rawInput
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return normalizedLines.join(" ").trim();
  }, []);

  const markAgentInteractionResolved = useCallback((messageId?: string, note?: string) => {
    if (!messageId) {
      return;
    }
    setAgentChatMessages((current) => current.map((item) => (
      item.id === messageId
        ? {
          ...item,
          interactionResolved: true,
          interactionResolvedNote: note ?? item.interactionResolvedNote,
        }
        : item
    )));
  }, []);

  const sendNormalizedAgentMessage = useCallback((
    normalizedMessage: string,
    options?: AgentMessageSendOptions
  ) => {
    const socket = agentSessionSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    const parsedCoreFields = parseAgentSessionCoreFields(normalizedMessage);
    if (parsedCoreFields) {
      setAgentSessionCoreFields(parsedCoreFields);
    }
    finalizePendingAssistantMessage();
    const sentAt = new Date().toISOString();
    const userMessageId = appendAgentChatMessage(
      "user",
      options?.displayText ?? formatAgentMessageForDisplay(normalizedMessage),
      false,
      { createdAt: sentAt }
    );
    const placeholderAssistantMessageId = appendPendingAssistantPlaceholder(sentAt);
    if (userMessageId) {
      setAgentSessionHasStarted(true);
      agentSessionHasStartedRef.current = true;
      agentTurnQueueRef.current.push({
        userMessageId,
        userSentAt: sentAt,
        startedAtMs: getAgentTimingNow(),
        placeholderAssistantMessageId,
        llmRequestCount: 0,
        modelDurationMs: 0,
      });
    }
    markAgentInteractionResolved(
      options?.resolveInteractionMessageId,
      options?.resolvedInteractionNote ?? getAgentInteractionResolvedNote(normalizedMessage, uiText)
    );
    socket.send(`${normalizedMessage}\n`);
    return true;
  }, [appendAgentChatMessage, appendPendingAssistantPlaceholder, finalizePendingAssistantMessage, formatAgentMessageForDisplay, markAgentInteractionResolved]);

  const flushQueuedAgentMessage = useCallback(() => {
    const queuedMessage = agentQueuedMessageRef.current;
    if (!queuedMessage) {
      return false;
    }
    const sent = sendNormalizedAgentMessage(queuedMessage.normalizedMessage, queuedMessage.options);
    if (sent) {
      agentQueuedMessageRef.current = null;
    }
    return sent;
  }, [sendNormalizedAgentMessage]);

  useEffect(() => {
    flushQueuedAgentMessageRef.current = flushQueuedAgentMessage;
  }, [flushQueuedAgentMessage]);

  const getAgentSessionCoreFields = useCallback((): AgentSessionCoreFields | undefined => {
    return agentSessionCoreFields;
  }, [agentSessionCoreFields]);

  const enrichAgentInteractionMessage = useCallback((rawInput: string) => {
    const normalizedInput = normalizeAgentSessionMessage(rawInput);
    if (!normalizedInput) {
      return "";
    }
    const parsedInteraction = parseAgentInteractionPayload(normalizedInput);
    if (!parsedInteraction?.interactionAction) {
      return normalizedInput;
    }
    const payloadCoreFields = parseAgentSessionCoreFields(normalizedInput);
    const sessionCoreFields = getAgentSessionCoreFields();
    const mergedCoreFields = {
      scriptType: !isAgentSessionPlaceholderValue(payloadCoreFields?.scriptType) ? payloadCoreFields?.scriptType : sessionCoreFields?.scriptType,
      scriptContent: !isAgentSessionPlaceholderValue(payloadCoreFields?.scriptContent) ? payloadCoreFields?.scriptContent : sessionCoreFields?.scriptContent,
      targetAudience: !isAgentSessionPlaceholderValue(payloadCoreFields?.targetAudience) ? payloadCoreFields?.targetAudience : sessionCoreFields?.targetAudience,
      expectedEpisodeCount: !isAgentSessionPlaceholderValue(payloadCoreFields?.expectedEpisodeCount) ? payloadCoreFields?.expectedEpisodeCount : sessionCoreFields?.expectedEpisodeCount,
    };
    const payloadLines = [
      `interaction_action=${parsedInteraction.interactionAction}`,
      parsedInteraction.stateId ? `stateId=${parsedInteraction.stateId}` : "",
      mergedCoreFields.scriptType ? `script_type=${mergedCoreFields.scriptType}` : "",
      mergedCoreFields.scriptContent ? `script_content=${mergedCoreFields.scriptContent}` : "",
      mergedCoreFields.targetAudience ? `target_audience=${mergedCoreFields.targetAudience}` : "",
      mergedCoreFields.expectedEpisodeCount ? `expected_episode_count=${mergedCoreFields.expectedEpisodeCount}` : "",
      parsedInteraction.feedback ? `step_feedback=${parsedInteraction.feedback}` : "",
    ].filter((line) => line.length > 0);
    return normalizeAgentSessionMessage(payloadLines.join("\n"));
  }, [getAgentSessionCoreFields, normalizeAgentSessionMessage]);

  const buildAgentSessionWebSocketUrl = useCallback((instanceId: string, agentId?: string) => {
    const apiBase = appConfig.controlApiBaseUrl;
    const query = [
      `instanceId=${encodeURIComponent(instanceId)}`,
      agentId ? `agentId=${encodeURIComponent(agentId)}` : "",
    ].filter((item) => item.length > 0).join("&");

    if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
      const wsBase = apiBase.replace(/^http/i, "ws").replace(/\/$/, "");
      return `${wsBase}/v1/agent-session/ws?${query}`;
    }

    const normalizedApiBase = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${normalizedApiBase}/v1/agent-session/ws?${query}`;
  }, []);

  const disconnectAgentSession = useCallback(() => {
    const socket = agentSessionSocketRef.current;
    agentSessionSocketRef.current = null;
    if (socket) {
      agentSessionSuppressCloseMessageRef.current = true;
      socket.close();
    }
    setAgentSessionConnecting(false);
    setAgentSessionConnected(false);
    setAgentComposerInteractionDraft(undefined);
    setAgentMessageInput("");
    setAgentSessionHasStarted(false);
    agentSessionHasStartedRef.current = false;
    setAgentSessionDisconnectNotice(undefined);
    setAgentSessionCoreFields(undefined);
    agentTurnQueueRef.current = [];
    finalizePendingAssistantMessage();
  }, [finalizePendingAssistantMessage]);

  const connectAgentSession = useCallback(() => {
    if (!selectedInstance) {
      return;
    }
    if (selectedInstance.status !== "RUNNING") {
      messageApi.warning(uiText.agentSessionNotRunning);
      return;
    }
    if (agentSessionRequiresDirectAgent && !agentSessionTargetAgentId) {
      messageApi.warning(agents.length === 0 ? uiText.agentSessionNoAgentsAvailable : uiText.agentSessionSelectAgentRequired);
      return;
    }

    disconnectAgentSession();
    setAgentSessionDisconnectNotice(undefined);
    setAgentSessionOutput("");
    setAgentChatMessages([]);
    setAgentSessionHasStarted(false);
    agentSessionHasStartedRef.current = false;
    setAgentComposerInteractionDraft(undefined);
    setAgentMessageInput("");
    setAgentSessionDebugVisible(false);
    setAgentSessionDebugEntries([]);
    agentSessionLineBufferRef.current = "";
    agentPendingAssistantMessageIdRef.current = null;
    agentTurnQueueRef.current = [];
    agentSessionDebugEntrySeqRef.current = 0;
    setAgentSessionConnecting(true);

    const socket = new WebSocket(buildAgentSessionWebSocketUrl(selectedInstance.id, agentSessionTargetAgentId));
    agentSessionSocketRef.current = socket;
    let connectionEstablished = false;

    socket.onopen = () => {
      connectionEstablished = true;
      setAgentSessionConnecting(false);
      setAgentSessionConnected(true);
      setAgentSessionDisconnectNotice(undefined);
      messageApi.success(uiText.agentSessionConnected);
      flushQueuedAgentMessage();
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        handleAgentSessionSocketMessage(event.data);
      }
    };

    socket.onerror = () => {
      messageApi.error(uiText.agentSessionConnectFailed);
    };

    socket.onclose = () => {
      if (agentSessionLineBufferRef.current.trim()) {
        processAgentSessionLine(agentSessionLineBufferRef.current);
        agentSessionLineBufferRef.current = "";
      }
      finalizePendingAssistantMessage();
      agentSessionSocketRef.current = null;
      agentTurnQueueRef.current = [];
      setAgentSessionConnecting(false);
      setAgentSessionConnected(false);
      const suppressCloseMessage = agentSessionSuppressCloseMessageRef.current;
      agentSessionSuppressCloseMessageRef.current = false;
      if (!suppressCloseMessage) {
        setAgentSessionDisconnectNotice({
          afterConnectionEstablished: connectionEstablished,
          hadConversation: agentSessionHasStartedRef.current,
        });
        appendAgentChatMessage(
          "system",
          connectionEstablished ? uiText.agentSessionDisconnectedSystemMessage : uiText.agentSessionConnectInterruptedDescription
        );
      }
    };
  }, [
    appendAgentChatMessage,
    buildAgentSessionWebSocketUrl,
    disconnectAgentSession,
    finalizePendingAssistantMessage,
    handleAgentSessionSocketMessage,
    messageApi,
    agentSessionRequiresDirectAgent,
    agentSessionTargetAgentId,
    agents.length,
    processAgentSessionLine,
    selectedInstance,
    flushQueuedAgentMessage,
  ]);

  const queueAgentMessageAndConnect = useCallback((
    normalizedMessage: string,
    options?: AgentMessageSendOptions
  ) => {
    if (!selectedInstance) {
      return false;
    }
    if (selectedInstance.status !== "RUNNING") {
      messageApi.warning(uiText.agentSessionNotRunning);
      return false;
    }
    if (agentSessionRequiresDirectAgent && !agentSessionTargetAgentId) {
      messageApi.warning(agents.length === 0 ? uiText.agentSessionNoAgentsAvailable : uiText.agentSessionSelectAgentRequired);
      return false;
    }
    agentQueuedMessageRef.current = { normalizedMessage, options };
    if (!agentSessionConnecting) {
      connectAgentSession();
    }
    return true;
  }, [
    agentSessionConnecting,
    agentSessionRequiresDirectAgent,
    agentSessionTargetAgentId,
    agents.length,
    connectAgentSession,
    messageApi,
    selectedInstance,
  ]);

  const sendAgentMessage = useCallback(() => {
    const trimmedInput = agentMessageInput.trim();
    if (!trimmedInput) {
      return;
    }

    let normalizedMessage = normalizeAgentSessionMessage(agentMessageInput);
    let displayText: string | undefined;
    let resolveInteractionMessageId: string | undefined;

    if (agentComposerInteractionDraft?.interactionAction === "revise") {
      const feedback = trimmedInput;
      const payloadLines = [
        `interaction_action=revise`,
        agentComposerInteractionDraft.stateId ? `stateId=${agentComposerInteractionDraft.stateId}` : "",
        `step_feedback=${feedback}`,
      ].filter((line) => line.length > 0);
      normalizedMessage = enrichAgentInteractionMessage(payloadLines.join("\n"));
      displayText = formatAgentInteractionPayloadForDisplay(normalizedMessage);
      resolveInteractionMessageId = agentComposerInteractionDraft.sourceMessageId;
    }

    if (!normalizedMessage) {
      return;
    }
    const sendOptions: AgentMessageSendOptions = {
      displayText,
      resolveInteractionMessageId,
    };
    const sent = agentSessionConnected
      ? sendNormalizedAgentMessage(normalizedMessage, sendOptions)
      : queueAgentMessageAndConnect(normalizedMessage, sendOptions);
    if (!sent) {
      return;
    }
    setAgentMessageInput("");
    setAgentComposerInteractionDraft(undefined);
  }, [
    agentComposerInteractionDraft,
    agentMessageInput,
    agentSessionConnected,
    normalizeAgentSessionMessage,
    enrichAgentInteractionMessage,
    queueAgentMessageAndConnect,
    sendNormalizedAgentMessage,
  ]);

  const handleAgentMessageInputKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    if (event.nativeEvent.isComposing || agentMessageComposingRef.current) {
      return;
    }
    event.preventDefault();
    if (disableSendAgentMessage || agentSessionInputLocked) {
      return;
    }
    sendAgentMessage();
  }, [agentSessionInputLocked, disableSendAgentMessage, sendAgentMessage]);

  const handleAgentMessageCompositionStart = useCallback(() => {
    agentMessageComposingRef.current = true;
  }, []);

  const handleAgentMessageCompositionEnd = useCallback(() => {
    agentMessageComposingRef.current = false;
  }, []);

  const runAgentInteractionAction = useCallback((messageId: string, action: AgentInteractionAction) => {
    if (action.kind === "send") {
      const normalizedPayload = enrichAgentInteractionMessage(action.payload);
      if (!normalizedPayload) {
        return;
      }
      const sendOptions: AgentMessageSendOptions = {
        resolveInteractionMessageId: messageId,
      };
      const sent = agentSessionConnected
        ? sendNormalizedAgentMessage(normalizedPayload, sendOptions)
        : queueAgentMessageAndConnect(normalizedPayload, sendOptions);
      if (sent) {
        setAgentComposerInteractionDraft(undefined);
      }
      return;
    }
    const parsedPayload = parseAgentInteractionPayload(action.payload);
    if (parsedPayload?.interactionAction === "revise") {
      setAgentComposerInteractionDraft({
        sourceMessageId: messageId,
        interactionAction: parsedPayload.interactionAction,
        stateId: parsedPayload.stateId,
      });
      setAgentMessageInput(parsedPayload.feedback ?? "");
      return;
    }
    if (action.payload.includes("interaction_action=")) {
      setAgentComposerInteractionDraft({
        sourceMessageId: messageId,
        interactionAction: parsedPayload?.interactionAction ?? "revise",
        stateId: parsedPayload?.stateId,
      });
      setAgentMessageInput(parsedPayload?.feedback ?? "");
      return;
    }
    setAgentComposerInteractionDraft(undefined);
    setAgentMessageInput(action.payload);
  }, [agentSessionConnected, enrichAgentInteractionMessage, queueAgentMessageAndConnect, sendNormalizedAgentMessage]);

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
    setInstanceDetailTab("claw");
  }, []);

  const openMenuView = useCallback((view: Exclude<ConsoleView, "instance-detail">) => {
    setActiveView(view);
    if (view === "instances") {
      setInstanceDetailTab("claw");
    }
  }, []);

  const mainAgentGuidanceSection = selectedInstance ? (
    <div className="main-prompt-section">
      <div className="main-prompt-header">
        <div className="main-prompt-header-title">
          <span className="main-prompt-header-icon"><FileText size={16} /></span>
          {uiText.mainAgentGuidanceTitle}
        </div>
        <Space>
          <Button
            size="small"
            loading={mainAgentGuidanceLoading}
            onClick={() => void loadMainAgentGuidance(selectedInstance.id)}
            icon={<RefreshCw size={12} />}
          >
            {uiText.mainAgentGuidanceRefresh}
          </Button>
          <Button
            size="small"
            disabled={mainAgentGuidanceEditing}
            onClick={() => setMainAgentGuidanceCollapsed((current) => !current)}
            icon={mainAgentGuidanceCollapsed ? <Eye size={12} /> : <ChevronLeft size={12} />}
          >
            {mainAgentGuidanceCollapsed ? uiText.mainAgentGuidanceExpand : uiText.mainAgentGuidanceCollapse}
          </Button>
          {!mainAgentGuidanceCollapsed && mainAgentGuidanceEditing ? (
            <>
              <Button
                type="primary"
                size="small"
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
                size="small"
                disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                onClick={cancelMainAgentGuidanceEdit}
              >
                {uiText.mainAgentGuidanceCancel}
              </Button>
            </>
          ) : null}
          {!mainAgentGuidanceCollapsed && !mainAgentGuidanceEditing ? (
            <>
              <Button
                size="small"
                disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || mainAgentGuidanceDeleting}
                onClick={() => setMainAgentGuidanceEditing(true)}
              >
                {uiText.mainAgentGuidanceEdit}
              </Button>
              <Button
                danger
                size="small"
                loading={mainAgentGuidanceDeleting}
                disabled={mainAgentGuidanceLoading || mainAgentGuidanceSaving || !mainAgentGuidance?.overrideExists}
                onClick={() => void removeMainAgentGuidanceOverride()}
              >
                {uiText.mainAgentGuidanceDelete}
              </Button>
            </>
          ) : null}
        </Space>
      </div>
      {mainAgentGuidanceCollapsed ? (
        <div className="main-prompt-collapsed">
          <FileText size={16} style={{ opacity: 0.4 }} />
          默认折叠，展开后可查看或编辑当前主 Agent 提示词。
        </div>
      ) : (
        <div className="main-prompt-body">
          {mainAgentGuidanceError ? <Alert type="error" showIcon message={mainAgentGuidanceError} style={{ marginBottom: 16 }} /> : null}
          <div className="main-prompt-meta-grid">
            <div className="main-prompt-meta-item">
              <span className="main-prompt-meta-label">{uiText.mainAgentGuidanceSource}</span>
              <span className="main-prompt-meta-value">{mainAgentGuidance?.source ?? "-"}</span>
            </div>
            <div className="main-prompt-meta-item">
              <span className="main-prompt-meta-label">{uiText.mainAgentGuidanceOverwriteOnStart}</span>
              <span className="main-prompt-meta-value">
                {typeof mainAgentGuidance?.overwriteOnStart === "boolean" ? String(mainAgentGuidance.overwriteOnStart) : "-"}
              </span>
            </div>
            <div className="main-prompt-meta-item">
              <span className="main-prompt-meta-label">{uiText.mainAgentGuidanceWorkspacePath}</span>
              <span className="main-prompt-meta-value">
                <Text code copyable={mainAgentGuidance?.workspacePath ? { text: mainAgentGuidance.workspacePath } : false} style={{ fontSize: 12 }}>
                  {mainAgentGuidance?.workspacePath ?? "-"}
                </Text>
              </span>
            </div>
            <div className="main-prompt-meta-item">
              <span className="main-prompt-meta-label">{uiText.mainAgentGuidanceGlobalPath}</span>
              <span className="main-prompt-meta-value">
                {mainAgentGuidance?.globalDefaultPath ? (
                  <Text code copyable={{ text: mainAgentGuidance.globalDefaultPath }} style={{ fontSize: 12 }}>
                    {mainAgentGuidance.globalDefaultPath}
                  </Text>
                ) : "-"}
              </span>
            </div>
          </div>
          {mainAgentGuidanceEditing ? (
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
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
            </Space>
          ) : (
            <>
              <Text strong style={{ display: "block", marginBottom: 8 }}>{uiText.mainAgentGuidanceEffectivePrompt}</Text>
              {mainAgentGuidance?.effectivePrompt ? (
                <div className="main-prompt-preview">
                  <pre>{mainAgentGuidance.effectivePrompt}</pre>
                </div>
              ) : (
                <Text type="secondary">{uiText.mainAgentGuidanceNoEffectivePrompt}</Text>
              )}
            </>
          )}
        </div>
      )}
    </div>
  ) : null;

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
                {!sidebarCollapsed ? <span className="sidebar-title"><span className="text-md-primary font-extrabold">fun</span>Claw</span> : null}
              </div>
              <nav className="sidebar-nav">
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "instances" ? "is-active" : ""}`}
                  onClick={() => openMenuView("instances")}
                  title={uiText.menuInstances}
                >
                  <span className="sidebar-icon-wrap"><Server size={16} /></span>
                  {!sidebarCollapsed ? <span>{uiText.menuInstances}</span> : null}
                </button>
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "agents" ? "is-active" : ""}`}
                  onClick={() => openMenuView("agents")}
                  title={uiText.menuAgents}
                >
                  <span className="sidebar-icon-wrap"><Bot size={16} /></span>
                  {!sidebarCollapsed ? <span>{uiText.menuAgents}</span> : null}
                </button>
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "skills" ? "is-active" : ""}`}
                  onClick={() => openMenuView("skills")}
                  title={uiText.menuSkills}
                >
                  <span className="sidebar-icon-wrap"><Wrench size={16} /></span>
                  {!sidebarCollapsed ? <span>{uiText.menuSkills}</span> : null}
                </button>
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "mcp" ? "is-active" : ""}`}
                  onClick={() => openMenuView("mcp")}
                  title={uiText.menuMcp}
                >
                  <span className="sidebar-icon-wrap"><Plug size={16} /></span>
                  {!sidebarCollapsed ? <span>{uiText.menuMcp}</span> : null}
                </button>
                <button
                  type="button"
                  className={`sidebar-item ${activeMenuView === "open-platform" ? "is-active" : ""}`}
                  onClick={() => openMenuView("open-platform")}
                  title={uiText.menuOpenPlatform}
                >
                  <span className="sidebar-icon-wrap"><Globe size={16} /></span>
                  {!sidebarCollapsed ? <span>{uiText.menuOpenPlatform}</span> : null}
                </button>
              </nav>
            </aside>
            <div className="console-main">
              <Layout className="ai-layout" style={{ minHeight: "100vh" }}>
            <Header className="console-header">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1.5">
                  <p className="console-kicker">AI Runtime Control</p>
                  <h2 className="m-0 text-2xl font-extrabold tracking-tight text-slate-900">
                    {uiText.pageTitle}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold tracking-wide text-emerald-800 border border-emerald-200/60">
                    <Activity size={14} />
                    <span>System Online</span>
                  </span>
                </div>
              </div>
              <p className="console-subtitle">funClaw 智能 Claw 实例管理平台</p>
            </Header>
            <Content className="console-content">
              <Space direction="vertical" style={{ width: "100%" }} size="large">
                {activeView === "instances" ? (
                  <>
                    <motion.div
                      className="kpi-grid"
                      initial="initial"
                      animate="animate"
                      variants={staggerContainer}
                    >
                      {[
                        { key: "total", icon: Layers, label: uiText.totalInstances, value: dashboardStats.total, color: "text-slate-900" },
                        { key: "running", icon: Activity, label: uiText.runningInstances, value: dashboardStats.running, color: "text-emerald-700" },
                        { key: "stopped", icon: Pause, label: uiText.stoppedInstances, value: dashboardStats.stopped, color: "text-slate-600" },
                        { key: "error", icon: AlertTriangle, label: uiText.errorInstances, value: dashboardStats.errorCount, color: "text-red-600" },
                      ].map((kpi) => (
                        <motion.div key={kpi.key} className={`kpi-card is-${kpi.key}`} variants={staggerItem}>
                          <div className="p-5">
                            <div className="kpi-icon-wrap">
                              <kpi.icon size={20} />
                            </div>
                            <p className="kpi-label">{kpi.label}</p>
                            <p className="kpi-value"><AnimatedNumber value={kpi.value} className={kpi.color} /></p>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
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
                        <motion.div className="instance-card-grid" initial="initial" animate="animate" variants={staggerContainer}>
                          {instances.map((instance) => {
                            const isSelected = selectedInstanceId === instance.id;
                            const gatewayUrl = resolveUiControllerUrl(instance) ?? uiText.gatewayUrlUnavailable;
                            return (
                              <motion.button
                                key={instance.id}
                                type="button"
                                className={`instance-card ${isSelected ? "is-selected" : ""}`}
                                onClick={() => openInstanceDetail(instance.id)}
                                variants={staggerItem}
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
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      )}
                    </Card>
                  </>
                ) : null}

                {activeView === "instance-detail" ? (
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <Button icon={<ArrowLeft size={14} />} className="back-button" onClick={() => openMenuView("instances")}>
                      {uiText.backToInstances}
                    </Button>
                    {selectedInstance ? (
                      <>
                    <motion.div
                      className="instance-detail-hero"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="instance-hero-header">
                        <div className="instance-hero-title-group">
                          <h2 className="instance-hero-name">{selectedInstance.name}</h2>
                          <div className="instance-hero-id">
                            <Copy size={11} style={{ opacity: 0.5 }} />
                            <Text
                              copyable={{
                                text: selectedInstance.id,
                                onCopy: () => messageApi.success(uiText.instanceIdCopied),
                              }}
                              style={{ fontSize: 12, fontFamily: "inherit", color: "inherit" }}
                            >
                              {selectedInstance.id}
                            </Text>
                          </div>
                        </div>
                        <div className="instance-hero-status">
                          <div className={`instance-status-badge is-${selectedInstance.status === "RUNNING" ? "running" : selectedInstance.status === "ERROR" ? "error" : selectedInstance.status === "CREATING" ? "creating" : "stopped"}`}>
                            <span className="instance-status-dot" />
                            {selectedInstance.status}
                          </div>
                        </div>
                      </div>

                      <div className="instance-info-grid">
                        <div className="instance-info-cell">
                          <span className="instance-info-label">{uiText.hostId}</span>
                          <span className="instance-info-value">{selectedInstance.hostId}</span>
                        </div>
                        <div className="instance-info-cell">
                          <span className="instance-info-label">{uiText.image}</span>
                          <span className="instance-info-value"><code>{selectedInstance.image}</code></span>
                        </div>
                        <div className="instance-info-cell">
                          <span className="instance-info-label">{uiText.gatewayHostPort}</span>
                          <span className="instance-info-value">{selectedInstance.gatewayHostPort ?? uiText.gatewayUrlUnavailable}</span>
                        </div>
                        <div className="instance-info-cell">
                          <span className="instance-info-label">{uiText.desiredState}</span>
                          <span className="instance-info-value">{selectedInstance.desiredState}</span>
                        </div>
                        <div className="instance-info-cell is-wide">
                          <span className="instance-info-label">{uiText.gatewayUrl}</span>
                          <span className="instance-info-value">{selectedGatewayUrl ?? uiText.gatewayUrlUnavailable}</span>
                        </div>
                        <div className="instance-info-cell">
                          <span className="instance-info-label">{uiText.createdAt}</span>
                          <span className="instance-info-value">{selectedInstance.createdAt}</span>
                        </div>
                        <div className="instance-info-cell">
                          <span className="instance-info-label">{uiText.updatedAt}</span>
                          <span className="instance-info-value">{selectedInstance.updatedAt}</span>
                        </div>
                      </div>

                      <div className="instance-action-bar">
                        <div className="instance-action-group">
                          <Button
                            className="instance-action-chip is-primary"
                            loading={submittingAction}
                            disabled={disableStart}
                            onClick={() => void handleAction("START")}
                            icon={<Play size={14} />}
                          >
                            {uiText.start}
                          </Button>
                          <Button
                            className="instance-action-chip is-ghost"
                            loading={submittingAction}
                            disabled={disableStop}
                            onClick={() => handleSensitiveAction("STOP")}
                            icon={<Square size={14} />}
                          >
                            {uiText.stop}
                          </Button>
                          <Button
                            className="instance-action-chip is-ghost"
                            loading={submittingAction}
                            disabled={disableRestartInstance}
                            onClick={() => handleSensitiveAction("RESTART")}
                            icon={<RotateCcw size={14} />}
                          >
                            {uiText.restartInstance}
                          </Button>
                        </div>
                        <div className="instance-action-group">
                          <Button
                            className="instance-action-chip is-danger"
                            loading={deletingInstance}
                            disabled={disableDelete}
                            onClick={openDeleteModal}
                            icon={<Trash2 size={14} />}
                          >
                            {uiText.delete}
                          </Button>
                        </div>
                        <div className="instance-action-divider" />
                        <Button
                          className="instance-action-chip is-accent"
                          disabled={disableRemoteConnect}
                          onClick={openRemoteModal}
                          icon={<Terminal size={14} />}
                        >
                          {uiText.remoteConnect}
                        </Button>
                        <Button
                          className="instance-action-chip is-primary"
                          onClick={openVisualUi}
                          disabled={!selectedGatewayUrl}
                          icon={<MonitorPlay size={14} />}
                        >
                          {uiText.openVisualUi}
                        </Button>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    >
                  <Tabs
                    className="instance-detail-tabs"
                    activeKey={instanceDetailTab}
                    onChange={(key) => setInstanceDetailTab(key as InstanceDetailTabKey)}
                    items={[
                        {
                          key: "claw",
                          label: uiText.tabClaw,
                          children: (
                            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                              <Card
                                className="sub-glass-card"
                                size="small"
                                title={uiText.agentChatTitle}
                              >
                                <Space direction="vertical" style={{ width: "100%" }} size="small">
                                  <Card size="small" className="agent-session-mode-card">
                                    <Space direction="vertical" style={{ width: "100%" }} size="small">
                                      <Text strong>{uiText.agentSessionRouteMode}</Text>
                                      <Segmented
                                        block
                                        className="agent-session-mode-switch"
                                        value={agentSessionMode}
                                        onChange={(value) => setAgentSessionMode(value as AgentSessionMode)}
                                        disabled={agentSessionConnected || agentSessionConnecting}
                                        options={[
                                          {
                                            label: (
                                              <div className="agent-session-mode-option">
                                                <div className="agent-session-mode-option-title">
                                                  <Server size={15} />
                                                  <span>{uiText.agentSessionRouteModeDirect}</span>
                                                </div>
                                               </div>
                                            ),
                                            value: "direct",
                                          },
                                          {
                                            label: (
                                              <div className="agent-session-mode-option">
                                                <div className="agent-session-mode-option-title">
                                                  <Bot size={15} />
                                                  <span>{uiText.agentSessionRouteModeAuto}</span>
                                                </div>
                                               </div>
                                            ),
                                            value: "auto",
                                          },
                                        ]}
                                      />
                                    </Space>
                                  </Card>
                                  <div className="agent-session-action-bar">
                                    <div className="agent-session-action-status">
                                      <Tag color={agentSessionStatusTagColor}>
                                        {agentSessionStatusLabel}
                                      </Tag>
                                      <Text type="secondary">
                                        {agentSessionStatusDescription}
                                      </Text>
                                    </div>
                                    <Button
                                      size="large"
                                      danger={agentSessionConnected}
                                      className="agent-session-control-button is-disconnect"
                                      disabled={!agentSessionConnected}
                                      onClick={disconnectAgentSession}
                                    >
                                      {uiText.agentSessionDisconnect}
                                    </Button>
                                  </div>
                                  {agentSessionDisconnectNotice ? (
                                    <Alert
                                      type={agentSessionDisconnectNotice.afterConnectionEstablished ? "warning" : "error"}
                                      showIcon
                                      message={agentSessionDisconnectAlertTitle}
                                      description={agentSessionDisconnectAlertDescription}
                                      action={(
                                        <Button
                                          type="primary"
                                          size="small"
                                          loading={agentSessionConnecting}
                                          disabled={disableConnectAgentSession}
                                          onClick={connectAgentSession}
                                        >
                                          {uiText.agentSessionReconnect}
                                        </Button>
                                      )}
                                      style={{ marginBottom: 12 }}
                                    />
                                  ) : null}
                                  {agentSessionRequiresDirectAgent ? (
                                    <Card size="small">
                                      <Space direction="vertical" style={{ width: "100%" }} size="small">
                                        <Text strong>{uiText.agentSessionCurrentAgent}</Text>
                                        <Select
                                          showSearch
                                          loading={agentsLoading}
                                          placeholder={uiText.selectAgent}
                                          value={selectedAgentId}
                                          onChange={setSelectedAgentId}
                                          disabled={agentSessionConnected || agentSessionConnecting}
                                          options={agents.map((item) => ({
                                            value: item.agentKey,
                                            label: item.displayName === item.agentKey
                                              ? item.agentKey
                                              : `${item.displayName} (${item.agentKey})`,
                                          }))}
                                        />
                                        {agentsError ? <Alert type="error" showIcon message={agentsError} /> : null}
                                        {selectedAgent ? (
                                          <Space size={[8, 8]} wrap>
                                            <Tag color="blue">{selectedAgent.agentKey}</Tag>
                                            <Tag>{selectedAgent.displayName || "-"}</Tag>
                                            <Tag>{selectedAgent.provider ?? "-"}</Tag>
                                            <Tag>{selectedAgent.model ?? "-"}</Tag>
                                          </Space>
                                        ) : null}
                                      </Space>
                                    </Card>
                                  ) : null}
                                  <div className="agent-session-section-head">
                                    <Text strong>{uiText.agentSessionActiveSession}</Text>
                                  </div>
                                  <div
                                    ref={agentSessionOutputRef}
                                    className="agent-chat-thread"
                                    style={{
                                      height: "clamp(520px, 60vh, 760px)",
                                      overflowY: "auto",
                                      background: "#fff",
                                    }}
                                  >
                                    {agentChatMessages.length > 0 ? agentChatMessages.map((item, index) => {
                                      const hasLaterAssistantContent = agentChatMessages.slice(index + 1).some((candidate) => (
                                        candidate.role === "assistant" && candidate.content.trim().length > 0
                                      ));
                                      const hasLaterAssistantThinking = agentChatMessages.slice(index + 1).some((candidate) => (
                                        candidate.role === "assistant"
                                        && candidate.pending
                                        && !candidate.content.trim()
                                        && Boolean(candidate.thinkingContent?.trim())
                                      ));
                                      if (
                                        item.role === "assistant"
                                        && item.pending
                                        && !item.content.trim()
                                        && (!item.thinkingContent?.trim() ? (hasLaterAssistantThinking || hasLaterAssistantContent) : hasLaterAssistantContent)
                                      ) {
                                        return null;
                                      }
                                      const thinkingVisible = item.role === "assistant"
                                        && item.pending
                                        && !item.content.trim()
                                        && Boolean(item.thinkingContent?.trim());
                                      const thinkingStateVisible = item.role === "assistant"
                                        && item.pending
                                        && !item.content.trim();
                                      const firstThinkingDurationLabel = formatAgentTimingDuration(item.timing?.firstThinkingDurationMs);
                                      const firstVisibleDurationLabel = formatAgentTimingDuration(item.timing?.firstVisibleDurationMs);
                                      const modelDurationLabel = formatAgentTimingDuration(item.timing?.modelDurationMs);
                                      const agentDurationLabel = formatAgentTimingDuration(item.timing?.agentDurationMs);
                                      const totalDurationLabel = formatAgentTimingDuration(item.timing?.totalDurationMs);
                                      const llmRequestCount = item.timing?.llmRequestCount ?? 0;
                                      const showTiming = item.role === "assistant" && (
                                        Boolean(firstThinkingDurationLabel)
                                        || Boolean(firstVisibleDurationLabel)
                                        || Boolean(modelDurationLabel)
                                        || Boolean(agentDurationLabel)
                                        || Boolean(totalDurationLabel)
                                        || llmRequestCount > 1
                                      );

                                      return (
                                        <div
                                          key={item.id}
                                          className={`agent-chat-item ${item.role === "user" ? "is-user" : item.role === "system" ? "is-system" : "is-assistant"}`}
                                        >
                                          <div className="agent-chat-bubble">
                                            <div className="agent-chat-head">
                                              <div className="agent-chat-role">
                                                {item.role === "user" ? "\u7528\u6237" : item.role === "system" ? "\u7cfb\u7edf" : "Agent"}
                                              </div>
                                              {item.role === "assistant" && item.content.trim() ? (
                                                <Button
                                                  type="text"
                                                  size="small"
                                                  className="agent-chat-copy-button"
                                                  onClick={() => void copyAgentChatContent(item.content)}
                                                >
                                                  {uiText.agentSessionCopyOutput}
                                                </Button>
                                              ) : null}
                                            </div>
                                            {thinkingStateVisible ? (
                                              <div className="agent-chat-thinking">
                                                <div className="agent-chat-thinking-head">
                                                  {"\u601d\u8003\u4e2d"}
                                                </div>
                                                <div className="agent-chat-thinking-content">
                                                  {thinkingVisible ? item.thinkingContent : "\u6b63\u5728\u6574\u7406\u601d\u8def..."}
                                                </div>
                                              </div>
                                            ) : null}
                                            {item.content.trim() ? (
                                              <div className="agent-chat-content">{item.content}</div>
                                            ) : null}
                                            {item.pending && !thinkingStateVisible ? <div className="agent-chat-pending">{uiText.agentSessionPendingReply}</div> : null}
                                            {showTiming ? (
                                              <div className="agent-chat-timing" title={formatAgentTimingTooltip(item.timing)}>
                                                {firstThinkingDurationLabel ? (
                                                  <span className="agent-chat-timing-pill">
                                                    <span className="agent-chat-timing-label">{"\u601d\u8003\u9996\u5b57"}</span>
                                                    <strong>{firstThinkingDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {firstVisibleDurationLabel ? (
                                                  <span className="agent-chat-timing-pill">
                                                    <span className="agent-chat-timing-label">{"\u6b63\u6587\u9996\u5b57"}</span>
                                                    <strong>{firstVisibleDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {modelDurationLabel ? (
                                                  <span className="agent-chat-timing-pill">
                                                    <span className="agent-chat-timing-label">{"\u6a21\u578b"}</span>
                                                    <strong>{modelDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {agentDurationLabel ? (
                                                  <span className="agent-chat-timing-pill">
                                                    <span className="agent-chat-timing-label">Agent</span>
                                                    <strong>{agentDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {totalDurationLabel ? (
                                                  <span className="agent-chat-timing-pill is-accent">
                                                    <span className="agent-chat-timing-label">{"\u603b\u8ba1"}</span>
                                                    <strong>{totalDurationLabel}</strong>
                                                  </span>
                                                ) : null}
                                                {llmRequestCount > 1 ? (
                                                  <span className="agent-chat-timing-pill is-muted">
                                                    {llmRequestCount}{"\u6b21\u6a21\u578b\u8c03\u7528"}
                                                  </span>
                                                ) : null}
                                              </div>
                                            ) : null}
                                            {item.id === pendingAgentApprovalMessageId && item.interaction?.actions.length ? (
                                              <div className="agent-chat-actions">
                                                {item.interaction.actions.map((action) => (
                                                  <Button
                                                    key={`${item.id}-${action.id}`}
                                                    type={action.kind === "send" ? "primary" : "default"}
                                                    onClick={() => runAgentInteractionAction(item.id, action)}
                                                    disabled={action.kind === "send" ? disableAgentInteractionSend : false}
                                                  >
                                                    {action.label}
                                                  </Button>
                                                ))}
                                              </div>
                                            ) : null}
                                            {item.role === "assistant" && item.interactionResolvedNote ? (
                                              <div className="agent-chat-resolution-hint">{item.interactionResolvedNote}</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      );
                                    }) : (
                                      <Text type="secondary">{uiText.agentSessionConversationEmpty}</Text>
                                    )}
                                  </div>
                                  <div className={`agent-sender${agentSessionInputLocked ? " is-disabled" : ""}`}>
                                    {agentComposerInteractionDraft?.interactionAction === "revise" ? (
                                      <div className="agent-composer-mode">
                                        <div className="agent-composer-mode-copy">
                                          <div className="agent-composer-mode-title">
                                            {uiText.agentSessionReviseModeTitle}：{agentComposerDraftStateLabel}
                                          </div>
                                          <div className="agent-composer-mode-hint">{uiText.agentSessionReviseModeHint}</div>
                                        </div>
                                        <Button type="text" size="small" onClick={clearAgentComposerInteractionDraft}>
                                          {uiText.agentSessionReviseModeCancel}
                                        </Button>
                                      </div>
                                    ) : null}
                                    <Input.TextArea
                                      disabled={agentSessionInputLocked}
                                      rows={4}
                                      value={agentMessageInput}
                                      onChange={(event) => setAgentMessageInput(event.target.value)}
                                      onKeyDown={handleAgentMessageInputKeyDown}
                                      onCompositionStart={handleAgentMessageCompositionStart}
                                      onCompositionEnd={handleAgentMessageCompositionEnd}
                                      placeholder={agentMessageComposerPlaceholder}
                                      />
                                    <div className="agent-sender-actions">
                                      <Text type="secondary">{uiText.agentSessionComposerShortcutHint}</Text>
                                      <Space>
                                        <Button
                                          type="text"
                                          disabled={agentSessionInputLocked}
                                          onClick={() => setAgentSessionDebugVisible((current) => !current)}
                                        >
                                          {agentSessionDebugVisible ? uiText.agentSessionHideDebug : uiText.agentSessionShowDebug}
                                        </Button>
                                        <Button
                                          type="primary"
                                          disabled={disableSendAgentMessage}
                                          onClick={sendAgentMessage}
                                        >
                                          {uiText.sendAgentMessage}
                                        </Button>
                                      </Space>
                                    </div>
                                  </div>
                                  {agentSessionDebugVisible ? (
                                    <>
                                      <Text>{uiText.agentSessionDebugTitle}</Text>
                                      <div className="agent-debug-thread">
                                        {agentSessionDebugEntries.length > 0 ? agentSessionDebugEntries.map((entry) => (
                                          <div
                                            key={entry.id}
                                            className={`agent-debug-entry is-${entry.eventType}${entry.role ? ` role-${entry.role}` : ""}`}
                                          >
                                            <div className="agent-debug-meta">
                                              <Space size={8} wrap>
                                                <Tag color={entry.eventType === "debug" ? "gold" : entry.eventType === "message" ? "cyan" : "default"}>
                                                  {entry.eventType}
                                                </Tag>
                                                {entry.role ? (
                                                  <Tag color={entry.role === "assistant" ? "blue" : entry.role === "system" ? "default" : "green"}>
                                                    {entry.role}
                                                  </Tag>
                                                ) : null}
                                                {entry.emittedAt ? (
                                                  <Text type="secondary">{formatAgentSessionDebugTimestamp(entry.emittedAt)}</Text>
                                                ) : null}
                                              </Space>
                                            </div>
                                            <div className="agent-debug-content">{entry.content}</div>
                                          </div>
                                        )) : hasAgentSessionDebugData ? agentSessionRenderedLines.map((line, index) => (
                                          <div key={`${index}-${line ?? ""}`} className="agent-debug-entry is-raw">
                                            <div className="agent-debug-content">{line}</div>
                                          </div>
                                        )) : (
                                          <Text type="secondary">{uiText.agentSessionOutputPlaceholder}</Text>
                                        )}
                                      </div>
                                    </>
                                  ) : null}
                                </Space>
                              </Card>
                            </Space>
                          ),
                        },
                        {
                          key: "config",
                          label: uiText.tabConfig,
                          children: (
                            <InstanceConfigPanel
                              instance={selectedInstance}
                              topSection={mainAgentGuidanceSection}
                              reloadToken={instanceConfigReloadToken}
                            />
                          ),
                        },
                        {
                          key: "channels",
                          label: uiText.tabChannel,
                          children: (
                            <InstanceChannelsConfigPanel
                              instanceId={selectedInstance.id}
                              onSaved={() => setInstanceConfigReloadToken((current) => current + 1)}
                            />
                          ),
                        },
                        {
                          key: "agents",
                          label: uiText.tabAgent,
                          children: (
                            <InstanceAgentPanel
                              instanceId={selectedInstance.id}
                              onInstalledAgentsChange={handleInstalledAgentsChange}
                            />
                          ),
                        },
                        {
                          key: "skills",
                          label: uiText.tabSkill,
                          children: (
                            <InstanceSkillPanel
                              instanceId={selectedInstance.id}
                            />
                          ),
                        },
                        {
                          key: "tasks",
                          label: uiText.tabTask,
                          children: (
                            <InstanceTaskPanel instanceId={selectedInstance.id} />
                          ),
                        },
                      ]}
                    />
                    </motion.div>
                      </>
                    ) : (
                      <div className="empty-panel">{uiText.selectInstanceFirst}</div>
                    )}
                  </Space>
                ) : null}
                {activeView === "agents" ? (
                  <AgentBaselinePanel />
                ) : null}
                {activeView === "skills" ? (
                  <SkillBaselinePanel />
                ) : null}
                {activeView === "mcp" ? (
                  <Card className="glass-card" title={uiText.menuMcp}>
                    <div className="empty-panel">MCP 服务管理即将上线，敬请期待。</div>
                  </Card>
                ) : null}
                {activeView === "open-platform" ? (
                  <Card className="glass-card" title={uiText.menuOpenPlatform}>
                    <OpenPlatformPanel />
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
            rules={[
              { required: true, message: uiText.requiredImage },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  const selectedPreset = images.find((item) => item.image === value);
                  if (selectedPreset && !isImagePresetAvailable(selectedPreset)) {
                    return Promise.reject(new Error(uiText.imagePresetUpgrading));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Select
              loading={loadingImages}
              options={images.map((item) => ({
                value: item.image,
                label: isImagePresetAvailable(item)
                  ? (item.recommended ? `${item.name} (recommended) - ${item.image}` : `${item.name} - ${item.image}`)
                  : `${item.name} - ${item.image} · ${uiText.imagePresetUpgrading}`,
                disabled: !isImagePresetAvailable(item),
              }))}
            />
          </Form.Item>
          {images.some((item) => !isImagePresetAvailable(item)) ? (
            <Alert type="warning" showIcon message={uiText.imagePresetShellOnlyHint} style={{ marginBottom: 16 }} />
          ) : null}
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
        title={uiText.actionProgressTitle}
        open={submittingAction && !!activeInstanceAction}
        footer={null}
        closable={false}
        maskClosable={false}
        keyboard={false}
        centered
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
            <Spin size="large" />
          </div>
          <Text type="secondary">{uiText.actionProgressHint}</Text>
          <Text strong>{`${uiText.instanceName}: ${activeInstanceAction?.instanceName ?? selectedInstance?.name ?? "-"}`}</Text>
          <Text strong>{`${uiText.actionProgressCurrent}: ${activeActionLabel || "-"}`}</Text>
          <Text type="secondary">{uiText.actionProgressWaiting}</Text>
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


