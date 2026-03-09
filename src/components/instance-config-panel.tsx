"use client";

import type { ClawInstance } from "@/types/contracts";
import { Alert, Button, Card, Input, InputNumber, Modal, Space, Switch, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";

const { Text } = Typography;

const MANAGED_AGENT_ID = "mgc-novel-to-script";
const DEFAULT_PROVIDER = "custom:https://api.ai.fun.tv/v1";
const DEFAULT_MODEL = "MiniMax-M2.5";
const DEFAULT_SKILLS_DIR = "/workspace/agent-mgc-novel-script/skills";
const DEFAULT_QUERY_KEYWORDS = ["小说转剧本", "一句话剧本", "剧本", "分集大纲", "故事梗概", "角色设定"];
const DEFAULT_QUERY_LITERALS = ["script_type=", "expected_episode_count", "target_audience"];

type QueryRuleDraft = {
  id: string;
  hint: string;
  keywords: string[];
  literals: string[];
  priority: number;
  minLength: number;
  maxLength: number;
};

type ConfigDraft = {
  apiKey: string;
  defaultProvider: string;
  defaultModel: string;
  defaultTemperature: number;
  routeProvider: string;
  routeModel: string;
  routeTemperature: number;
  skillsPromptInjectionMode: string;
  skillsOpenEnabled: boolean;
  skillsDir: string;
  classificationEnabled: boolean;
  rules: QueryRuleDraft[];
  agentProvider: string;
  agentModel: string;
  agentMaxIterations: number;
  agentMaxDepth: number;
  agentSystemPrompt: string;
};

type RuleModalDraft = {
  id?: string;
  hint: string;
  keywords: string;
  literals: string;
  priority: number;
  minLength: number;
  maxLength: number;
};

type RuleModalState = {
  open: boolean;
  mode: "create" | "edit";
  draft: RuleModalDraft;
};

const createRuleId = () => globalThis.crypto?.randomUUID?.() ?? `rule-${Date.now()}`;

const createDefaultRule = (): QueryRuleDraft => ({
  id: createRuleId(),
  hint: MANAGED_AGENT_ID,
  keywords: [...DEFAULT_QUERY_KEYWORDS],
  literals: [...DEFAULT_QUERY_LITERALS],
  priority: 100,
  minLength: 6,
  maxLength: 4000,
});

const createDefaultRuleModalDraft = (rule?: QueryRuleDraft): RuleModalDraft => ({
  id: rule?.id,
  hint: rule?.hint ?? MANAGED_AGENT_ID,
  keywords: rule?.keywords.join(", ") ?? DEFAULT_QUERY_KEYWORDS.join(", "),
  literals: rule?.literals.join(", ") ?? DEFAULT_QUERY_LITERALS.join(", "),
  priority: rule?.priority ?? 100,
  minLength: rule?.minLength ?? 6,
  maxLength: rule?.maxLength ?? 4000,
});

const createDefaultDraft = (): ConfigDraft => ({
  apiKey: "",
  defaultProvider: DEFAULT_PROVIDER,
  defaultModel: DEFAULT_MODEL,
  defaultTemperature: 0.7,
  routeProvider: DEFAULT_PROVIDER,
  routeModel: DEFAULT_MODEL,
  routeTemperature: 0.3,
  skillsPromptInjectionMode: "compact",
  skillsOpenEnabled: true,
  skillsDir: DEFAULT_SKILLS_DIR,
  classificationEnabled: true,
  rules: [createDefaultRule()],
  agentProvider: DEFAULT_PROVIDER,
  agentModel: DEFAULT_MODEL,
  agentMaxIterations: 30,
  agentMaxDepth: 1,
  agentSystemPrompt: "",
});

const splitCsvInput = (value: string) =>
  value
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

const escapeTomlString = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const toTomlArray = (items: string[]) => `[${items.map((item) => escapeTomlString(item)).join(", ")}]`;

const toTomlMultiline = (value: string) => {
  if (!value.trim()) {
    return "\"\"";
  }

  const normalized = value.replace(/\r\n/g, "\n").replace(/"""/g, '\\"\\"\\"');
  return `"""\n${normalized}\n"""`;
};

const buildManagedConfigPreview = (draft: ConfigDraft) => {
  const ruleBlocks = draft.rules.flatMap((rule) => [
    "",
    "[[query_classification.rules]]",
    `hint = ${escapeTomlString(rule.hint)}`,
    `keywords = ${toTomlArray(rule.keywords)}`,
    `literals = ${toTomlArray(rule.literals)}`,
    `priority = ${rule.priority}`,
    `min_length = ${rule.minLength}`,
    `max_length = ${rule.maxLength}`,
  ]);

  return [
    "# managed instance config preview",
    "# 当前前端只开放常用配置项，其余 runtime / security / memory 仍由平台模板托管",
    `api_key = ${escapeTomlString(draft.apiKey)}`,
    `default_provider = ${escapeTomlString(draft.defaultProvider)}`,
    `default_model = ${escapeTomlString(draft.defaultModel)}`,
    `default_temperature = ${draft.defaultTemperature}`,
    "",
    "[[model_routes]]",
    `hint = ${escapeTomlString(MANAGED_AGENT_ID)}`,
    `provider = ${escapeTomlString(draft.routeProvider)}`,
    `model = ${escapeTomlString(draft.routeModel)}`,
    `temperature = ${draft.routeTemperature}`,
    "",
    "[skills]",
    `prompt_injection_mode = ${escapeTomlString(draft.skillsPromptInjectionMode)}`,
    `open_skills_enabled = ${draft.skillsOpenEnabled}`,
    `open_skills_dir = ${escapeTomlString(draft.skillsDir)}`,
    "",
    "[query_classification]",
    `enabled = ${draft.classificationEnabled}`,
    ...ruleBlocks,
    "",
    `[agents.${escapeTomlString(MANAGED_AGENT_ID)}]`,
    `provider = ${escapeTomlString(draft.agentProvider)}`,
    `model = ${escapeTomlString(draft.agentModel)}`,
    "agentic = true",
    `max_iterations = ${draft.agentMaxIterations}`,
    `max_depth = ${draft.agentMaxDepth}`,
    `system_prompt = ${toTomlMultiline(draft.agentSystemPrompt)}`,
  ].join("\n");
};

export function InstanceConfigPanel({ instance }: { instance: ClawInstance }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [draft, setDraft] = useState<ConfigDraft>(() => createDefaultDraft());
  const [ruleModal, setRuleModal] = useState<RuleModalState>({
    open: false,
    mode: "create",
    draft: createDefaultRuleModalDraft(),
  });

  useEffect(() => {
    setDraft(createDefaultDraft());
    setRuleModal({
      open: false,
      mode: "create",
      draft: createDefaultRuleModalDraft(),
    });
  }, [instance.id]);

  const preview = useMemo(() => buildManagedConfigPreview(draft), [draft]);

  const updateDraft = <K extends keyof ConfigDraft>(key: K, value: ConfigDraft[K]) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openCreateRuleModal = () => {
    setRuleModal({
      open: true,
      mode: "create",
      draft: createDefaultRuleModalDraft(),
    });
  };

  const openEditRuleModal = (rule: QueryRuleDraft) => {
    setRuleModal({
      open: true,
      mode: "edit",
      draft: createDefaultRuleModalDraft(rule),
    });
  };

  const closeRuleModal = () => {
    setRuleModal((current) => ({
      ...current,
      open: false,
    }));
  };

  const saveRuleModal = () => {
    const keywords = splitCsvInput(ruleModal.draft.keywords);
    const literals = splitCsvInput(ruleModal.draft.literals);

    if (!ruleModal.draft.hint.trim()) {
      void messageApi.error("规则 hint 不能为空");
      return;
    }
    if (keywords.length === 0) {
      void messageApi.error("请至少填写一个关键词");
      return;
    }

    const nextRule: QueryRuleDraft = {
      id: ruleModal.draft.id ?? createRuleId(),
      hint: ruleModal.draft.hint.trim(),
      keywords,
      literals,
      priority: ruleModal.draft.priority,
      minLength: ruleModal.draft.minLength,
      maxLength: ruleModal.draft.maxLength,
    };

    setDraft((current) => ({
      ...current,
      rules: ruleModal.mode === "edit"
        ? current.rules.map((rule) => (rule.id === nextRule.id ? nextRule : rule))
        : [...current.rules, nextRule],
    }));
    closeRuleModal();
  };

  const removeRule = (ruleId: string) => {
    setDraft((current) => ({
      ...current,
      rules: current.rules.filter((rule) => rule.id !== ruleId),
    }));
  };

  const resetToDefaultTemplate = () => {
    setDraft(createDefaultDraft());
    void messageApi.success("已恢复为默认配置模板");
  };

  const showPendingMessage = (actionLabel: string) => {
    void messageApi.info(`${actionLabel} 暂未接入后端实例配置接口，当前仅保留前端草稿。`);
  };

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Alert
          type="info"
          showIcon
          message="实例 Config 前端骨架已就位"
          description={(
            <Space direction="vertical" size={4}>
              <Text>当前先开放常用配置编辑与 TOML 预览，保存 / 重启还未接入后端实例配置接口。</Text>
              <Text type="secondary">实例：{instance.name}（{instance.id}）</Text>
            </Space>
          )}
        />
        <Alert
          type="warning"
          showIcon
          message="Raw TOML 预览可能包含明文密钥"
          description="建议在后端保存接口接入前，仅用于结构确认，不要把敏感配置截屏或外传。"
        />

        <Card
          className="sub-glass-card"
          size="small"
          title="配置操作"
          extra={<Tag color="gold">MVP</Tag>}
        >
          <Space wrap>
            <Button onClick={resetToDefaultTemplate}>恢复默认模板</Button>
            <Button onClick={() => showPendingMessage("保存")}>保存（待后端）</Button>
            <Button type="primary" onClick={() => showPendingMessage("保存并重启")}>保存并重启（待后端）</Button>
          </Space>
        </Card>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            width: "100%",
          }}
        >
          <Card className="sub-glass-card" size="small" title="基础模型">
            <Space direction="vertical" style={{ width: "100%" }} size="small">
              <Text strong>API Key</Text>
              <Input.Password
                value={draft.apiKey}
                placeholder="请输入实例专属 API Key"
                onChange={(event) => updateDraft("apiKey", event.target.value)}
              />
              <Text strong>default_provider</Text>
              <Input
                value={draft.defaultProvider}
                onChange={(event) => updateDraft("defaultProvider", event.target.value)}
              />
              <Text strong>default_model</Text>
              <Input
                value={draft.defaultModel}
                onChange={(event) => updateDraft("defaultModel", event.target.value)}
              />
              <Text strong>default_temperature</Text>
              <InputNumber
                min={0}
                max={2}
                step={0.1}
                style={{ width: "100%" }}
                value={draft.defaultTemperature}
                onChange={(value) => updateDraft("defaultTemperature", Number(value ?? 0))}
              />
            </Space>
          </Card>

          <Card className="sub-glass-card" size="small" title="模型路由">
            <Space direction="vertical" style={{ width: "100%" }} size="small">
              <Text strong>hint</Text>
              <Input value={MANAGED_AGENT_ID} readOnly />
              <Text strong>provider</Text>
              <Input
                value={draft.routeProvider}
                onChange={(event) => updateDraft("routeProvider", event.target.value)}
              />
              <Text strong>model</Text>
              <Input
                value={draft.routeModel}
                onChange={(event) => updateDraft("routeModel", event.target.value)}
              />
              <Text strong>temperature</Text>
              <InputNumber
                min={0}
                max={2}
                step={0.1}
                style={{ width: "100%" }}
                value={draft.routeTemperature}
                onChange={(value) => updateDraft("routeTemperature", Number(value ?? 0))}
              />
            </Space>
          </Card>

          <Card className="sub-glass-card" size="small" title="Skills">
            <Space direction="vertical" style={{ width: "100%" }} size="small">
              <Text strong>prompt_injection_mode</Text>
              <Input
                value={draft.skillsPromptInjectionMode}
                onChange={(event) => updateDraft("skillsPromptInjectionMode", event.target.value)}
              />
              <Space align="center">
                <Text strong style={{ marginBottom: 0 }}>open_skills_enabled</Text>
                <Switch
                  checked={draft.skillsOpenEnabled}
                  onChange={(checked) => updateDraft("skillsOpenEnabled", checked)}
                />
              </Space>
              <Text strong>open_skills_dir</Text>
              <Input
                value={draft.skillsDir}
                onChange={(event) => updateDraft("skillsDir", event.target.value)}
              />
            </Space>
          </Card>

          <Card className="sub-glass-card" size="small" title="Agent Profile">
            <Space direction="vertical" style={{ width: "100%" }} size="small">
              <Text strong>agent id</Text>
              <Input value={MANAGED_AGENT_ID} readOnly />
              <Text strong>provider</Text>
              <Input
                value={draft.agentProvider}
                onChange={(event) => updateDraft("agentProvider", event.target.value)}
              />
              <Text strong>model</Text>
              <Input
                value={draft.agentModel}
                onChange={(event) => updateDraft("agentModel", event.target.value)}
              />
              <Text strong>max_iterations</Text>
              <InputNumber
                min={1}
                max={200}
                style={{ width: "100%" }}
                value={draft.agentMaxIterations}
                onChange={(value) => updateDraft("agentMaxIterations", Number(value ?? 1))}
              />
              <Text strong>max_depth</Text>
              <InputNumber
                min={0}
                max={10}
                style={{ width: "100%" }}
                value={draft.agentMaxDepth}
                onChange={(value) => updateDraft("agentMaxDepth", Number(value ?? 0))}
              />
            </Space>
          </Card>
        </div>

        <Card
          className="sub-glass-card"
          size="small"
          title="Query Classification"
          extra={(
            <Space>
              <Space align="center">
                <Text strong style={{ marginBottom: 0 }}>enabled</Text>
                <Switch
                  checked={draft.classificationEnabled}
                  onChange={(checked) => updateDraft("classificationEnabled", checked)}
                />
              </Space>
              <Button onClick={openCreateRuleModal}>新增规则</Button>
            </Space>
          )}
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {draft.rules.length === 0 ? (
              <Alert
                type="warning"
                showIcon
                message="当前没有分类规则"
                description="建议至少保留一条与主 Agent 对应的 hint 规则。"
              />
            ) : null}
            {draft.rules.map((rule, index) => (
              <Card
                key={rule.id}
                size="small"
                title={`规则 ${index + 1}`}
                extra={(
                  <Space>
                    <Button size="small" onClick={() => openEditRuleModal(rule)}>编辑</Button>
                    <Button size="small" danger onClick={() => removeRule(rule.id)}>删除</Button>
                  </Space>
                )}
              >
                <Space direction="vertical" style={{ width: "100%" }} size={4}>
                  <Text strong>hint</Text>
                  <Text code>{rule.hint}</Text>
                  <Text strong>keywords</Text>
                  <Space wrap>
                    {rule.keywords.map((keyword) => (
                      <Tag key={keyword}>{keyword}</Tag>
                    ))}
                  </Space>
                  <Text strong>literals</Text>
                  <Space wrap>
                    {rule.literals.length > 0 ? rule.literals.map((literal) => (
                      <Tag key={literal} color="processing">{literal}</Tag>
                    )) : <Text type="secondary">未配置</Text>}
                  </Space>
                  <Text type="secondary">
                    priority={rule.priority}，min_length={rule.minLength}，max_length={rule.maxLength}
                  </Text>
                </Space>
              </Card>
            ))}
          </Space>
        </Card>

        <Card className="sub-glass-card" size="small" title="System Prompt">
          <Input.TextArea
            rows={14}
            value={draft.agentSystemPrompt}
            placeholder="这里先维护 mgc-novel-to-script 的 system_prompt；后端接入后可保存为实例专属配置。"
            onChange={(event) => updateDraft("agentSystemPrompt", event.target.value)}
          />
        </Card>

        <Card className="sub-glass-card" size="small" title="Raw TOML 预览">
          <Input.TextArea
            rows={24}
            value={preview}
            readOnly
          />
        </Card>
      </Space>

      <Modal
        title={ruleModal.mode === "edit" ? "编辑分类规则" : "新增分类规则"}
        open={ruleModal.open}
        onOk={saveRuleModal}
        onCancel={closeRuleModal}
        okText="确认"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: "100%" }} size="small">
          <Text strong>hint</Text>
          <Input
            value={ruleModal.draft.hint}
            onChange={(event) => setRuleModal((current) => ({
              ...current,
              draft: {
                ...current.draft,
                hint: event.target.value,
              },
            }))}
          />
          <Text strong>keywords（逗号或换行分隔）</Text>
          <Input.TextArea
            rows={4}
            value={ruleModal.draft.keywords}
            onChange={(event) => setRuleModal((current) => ({
              ...current,
              draft: {
                ...current.draft,
                keywords: event.target.value,
              },
            }))}
          />
          <Text strong>literals（逗号或换行分隔）</Text>
          <Input.TextArea
            rows={3}
            value={ruleModal.draft.literals}
            onChange={(event) => setRuleModal((current) => ({
              ...current,
              draft: {
                ...current.draft,
                literals: event.target.value,
              },
            }))}
          />
          <Text strong>priority</Text>
          <InputNumber
            min={0}
            max={1000}
            style={{ width: "100%" }}
            value={ruleModal.draft.priority}
            onChange={(value) => setRuleModal((current) => ({
              ...current,
              draft: {
                ...current.draft,
                priority: Number(value ?? 0),
              },
            }))}
          />
          <Text strong>min_length</Text>
          <InputNumber
            min={0}
            max={10000}
            style={{ width: "100%" }}
            value={ruleModal.draft.minLength}
            onChange={(value) => setRuleModal((current) => ({
              ...current,
              draft: {
                ...current.draft,
                minLength: Number(value ?? 0),
              },
            }))}
          />
          <Text strong>max_length</Text>
          <InputNumber
            min={0}
            max={10000}
            style={{ width: "100%" }}
            value={ruleModal.draft.maxLength}
            onChange={(value) => setRuleModal((current) => ({
              ...current,
              draft: {
                ...current.draft,
                maxLength: Number(value ?? 0),
              },
            }))}
          />
        </Space>
      </Modal>
    </>
  );
}
