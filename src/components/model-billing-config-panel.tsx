"use client";

import {
  createModelBillingConfig,
  deleteModelBillingConfig,
  listModelBillingConfigs,
  upsertModelBillingConfig,
} from "@/lib/control-api";
import type { ModelBillingConfig, ModelBillingConfigUpsertRequest } from "@/types/contracts";
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Space, Switch, Table, Typography, message } from "antd";
import { Calculator, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text, Paragraph } = Typography;
const DEFAULT_PREVIEW_INPUT_TOKENS = 1251;
const DEFAULT_PREVIEW_OUTPUT_TOKENS = 350;

type BillingFormValues = {
  displayName?: string;
  provider: string;
  model: string;
  basePricePer1m: number;
  modelMultiplier: number;
  cacheMultiplier: number;
  outputMultiplier: number;
  groupMultiplier: number;
  enabled: boolean;
  remark?: string;
  previewInputTokens: number;
  previewOutputTokens: number;
};

const DEFAULT_FORM_VALUES: BillingFormValues = {
  displayName: "",
  provider: "",
  model: "",
  basePricePer1m: 0,
  modelMultiplier: 1,
  cacheMultiplier: 1,
  outputMultiplier: 1,
  groupMultiplier: 1,
  enabled: true,
  remark: "",
  previewInputTokens: DEFAULT_PREVIEW_INPUT_TOKENS,
  previewOutputTokens: DEFAULT_PREVIEW_OUTPUT_TOKENS,
};

function toSafeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(value: number) {
  return `¥${value.toFixed(6)}`;
}

export function ModelBillingConfigPanel() {
  const [form] = Form.useForm<BillingFormValues>();
  const [items, setItems] = useState<ModelBillingConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModelBillingConfig | null>(null);
  const [error, setError] = useState<string>();
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

  const watchedBasePricePer1m = Form.useWatch("basePricePer1m", form);
  const watchedModelMultiplier = Form.useWatch("modelMultiplier", form);
  const watchedCacheMultiplier = Form.useWatch("cacheMultiplier", form);
  const watchedOutputMultiplier = Form.useWatch("outputMultiplier", form);
  const watchedGroupMultiplier = Form.useWatch("groupMultiplier", form);
  const watchedPreviewInputTokens = Form.useWatch("previewInputTokens", form);
  const watchedPreviewOutputTokens = Form.useWatch("previewOutputTokens", form);

  const preview = useMemo(() => {
    const basePricePer1m = toSafeNumber(watchedBasePricePer1m, 0);
    const modelMultiplier = toSafeNumber(watchedModelMultiplier, 1);
    const cacheMultiplier = toSafeNumber(watchedCacheMultiplier, 1);
    const outputMultiplier = toSafeNumber(watchedOutputMultiplier, 1);
    const groupMultiplier = toSafeNumber(watchedGroupMultiplier, 1);
    const previewInputTokens = toSafeNumber(watchedPreviewInputTokens, DEFAULT_PREVIEW_INPUT_TOKENS);
    const previewOutputTokens = toSafeNumber(watchedPreviewOutputTokens, DEFAULT_PREVIEW_OUTPUT_TOKENS);

    const inputPricePer1m = basePricePer1m * modelMultiplier * cacheMultiplier;
    const outputPricePer1m = inputPricePer1m * outputMultiplier;
    const estimatedCost = (
      ((previewInputTokens / 1_000_000) * inputPricePer1m) +
      ((previewOutputTokens / 1_000_000) * outputPricePer1m)
    ) * groupMultiplier;

    return {
      inputPricePer1m,
      outputPricePer1m,
      estimatedCost,
      previewInputTokens,
      previewOutputTokens,
      groupMultiplier,
    };
  }, [
    watchedBasePricePer1m,
    watchedCacheMultiplier,
    watchedGroupMultiplier,
    watchedModelMultiplier,
    watchedOutputMultiplier,
    watchedPreviewInputTokens,
    watchedPreviewOutputTokens,
  ]);

  const applyEditValues = useCallback((item?: ModelBillingConfig | null) => {
    if (!item) {
      form.setFieldsValue(DEFAULT_FORM_VALUES);
      return;
    }
    form.setFieldsValue({
      displayName: item.displayName,
      provider: item.provider,
      model: item.model,
      basePricePer1m: item.basePricePer1m,
      modelMultiplier: item.modelMultiplier,
      cacheMultiplier: item.cacheMultiplier,
      outputMultiplier: item.outputMultiplier,
      groupMultiplier: item.groupMultiplier,
      enabled: item.enabled,
      remark: item.remark || "",
      previewInputTokens: DEFAULT_PREVIEW_INPUT_TOKENS,
      previewOutputTokens: DEFAULT_PREVIEW_OUTPUT_TOKENS,
    });
  }, [form]);

  const loadItems = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await listModelBillingConfigs();
      setItems(response.items);
      if (showSuccess) {
        messageApi.success("已刷新模型计费配置");
      }
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const openCreateModal = useCallback(() => {
    setEditingItem(null);
    form.resetFields();
    applyEditValues(null);
    setModalOpen(true);
  }, [applyEditValues, form]);

  const openEditModal = useCallback((item: ModelBillingConfig) => {
    setEditingItem(item);
    form.resetFields();
    applyEditValues(item);
    setModalOpen(true);
  }, [applyEditValues, form]);

  const handleDelete = useCallback((item: ModelBillingConfig) => {
    modal.confirm({
      title: "删除模型计费配置",
      content: `确定删除 ${item.displayName || item.model} 的计费配置吗？此操作不可恢复。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteModelBillingConfig(item.id);
          messageApi.success("模型计费配置已删除");
          await loadItems();
        } catch (apiError) {
          messageApi.error(`删除失败：${apiError instanceof Error ? apiError.message : String(apiError)}`);
        }
      },
    });
  }, [loadItems, messageApi, modal]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const request: ModelBillingConfigUpsertRequest = {
        displayName: values.displayName?.trim() || null,
        provider: values.provider.trim(),
        model: values.model.trim(),
        currency: "CNY",
        basePricePer1m: values.basePricePer1m,
        modelMultiplier: values.modelMultiplier,
        cacheMultiplier: values.cacheMultiplier,
        outputMultiplier: values.outputMultiplier,
        groupMultiplier: values.groupMultiplier,
        enabled: values.enabled,
        remark: values.remark?.trim() || null,
        updatedBy: "console",
      };

      setSaving(true);
      setError(undefined);
      if (editingItem) {
        await upsertModelBillingConfig(editingItem.id, request);
        messageApi.success("模型计费配置已更新");
      } else {
        await createModelBillingConfig(request);
        messageApi.success("模型计费配置已创建");
      }
      setModalOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (apiError) {
      if (apiError && typeof apiError === "object" && "errorFields" in apiError) {
        return;
      }
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error(editingItem ? "更新模型计费配置失败" : "创建模型计费配置失败");
    } finally {
      setSaving(false);
    }
  }, [editingItem, form, loadItems, messageApi]);

  const columns = [
    {
      title: "模型",
      key: "modelInfo",
      render: (_: unknown, item: ModelBillingConfig) => (
        <Space direction="vertical" size={2}>
          <Text strong>{item.displayName}</Text>
          <Text code>{item.model}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{item.provider}</Text>
        </Space>
      ),
    },
    {
      title: "输入单价 / 1M",
      dataIndex: "inputPricePer1m",
      key: "inputPricePer1m",
      width: 180,
      render: (value: number) => formatPrice(toSafeNumber(value)),
    },
    {
      title: "输出单价 / 1M",
      dataIndex: "outputPricePer1m",
      key: "outputPricePer1m",
      width: 180,
      render: (value: number) => formatPrice(toSafeNumber(value)),
    },
    {
      title: "倍率",
      key: "multipliers",
      width: 240,
      render: (_: unknown, item: ModelBillingConfig) => (
        <Space direction="vertical" size={2}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            模型 {toSafeNumber(item.modelMultiplier, 1).toFixed(6)} / 缓存 {toSafeNumber(item.cacheMultiplier, 1).toFixed(6)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            输出 {toSafeNumber(item.outputMultiplier, 1).toFixed(6)} / 分组 {toSafeNumber(item.groupMultiplier, 1).toFixed(6)}
          </Text>
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "enabled",
      key: "enabled",
      width: 90,
      render: (enabled: boolean) => enabled ? <Text style={{ color: "#16a34a" }}>启用</Text> : <Text type="secondary">停用</Text>,
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => formatTimestamp(value),
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      render: (_: unknown, item: ModelBillingConfig) => (
        <Space size="small">
          <Button type="text" size="small" icon={<Pencil size={14} />} onClick={() => openEditModal(item)} />
          <Button type="text" size="small" danger icon={<Trash2 size={14} />} onClick={() => handleDelete(item)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="模型计费配置"
          description="这里统一维护人民币口径的模型单价和倍率；后续如果要换算成虾米，建议在实际扣费程序里转换。"
        />

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <Card
          className="sub-glass-card"
          title="计费配置列表"
          extra={(
            <Space>
              <Button icon={<RefreshCw size={14} />} loading={loading} onClick={() => void loadItems(true)}>
                刷新
              </Button>
              <Button type="primary" icon={<Plus size={14} />} onClick={openCreateModal}>
                新建配置
              </Button>
            </Space>
          )}
        >
          <Table<ModelBillingConfig>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={items}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1080 }}
          />
        </Card>
      </Space>

      <Modal
        title={editingItem ? "编辑模型计费配置" : "新建模型计费配置"}
        open={modalOpen}
        onCancel={() => {
          if (!saving) {
            setModalOpen(false);
            setEditingItem(null);
          }
        }}
        onOk={() => void handleSave()}
        okText={editingItem ? "保存" : "创建"}
        confirmLoading={saving}
        width={840}
        destroyOnClose
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Alert
            type="warning"
            showIcon
            message="填写说明"
            description="基础输入单价填写倍率前价格；实际输入单价 = 基础输入单价 × 模型倍率 × 缓存倍率。当前配置统一按人民币填写。"
          />

          <Form<BillingFormValues>
            form={form}
            layout="vertical"
            initialValues={DEFAULT_FORM_VALUES}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Form.Item name="displayName" label="显示名称">
                <Input placeholder="例如：MiniMax M2.5" />
              </Form.Item>
              <Form.Item label="计费币种">
                <Input value="人民币（CNY）" disabled />
              </Form.Item>
              <Form.Item
                name="provider"
                label="Provider"
                rules={[{ required: true, message: "请输入 provider" }]}
              >
                <Input placeholder="例如：custom:https://api.ai.fun.tv/v1" />
              </Form.Item>
              <Form.Item
                name="model"
                label="Model"
                rules={[{ required: true, message: "请输入 model" }]}
              >
                <Input placeholder="例如：MiniMax-M2.5" />
              </Form.Item>
              <Form.Item
                name="basePricePer1m"
                label="基础输入单价 / 1M"
                rules={[{ required: true, message: "请输入基础输入单价" }]}
              >
                <InputNumber min={0} step={0.000001} precision={6} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="modelMultiplier"
                label="模型倍率"
                rules={[{ required: true, message: "请输入模型倍率" }]}
              >
                <InputNumber min={0} step={0.000001} precision={6} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="cacheMultiplier"
                label="缓存倍率"
                rules={[{ required: true, message: "请输入缓存倍率" }]}
              >
                <InputNumber min={0} step={0.000001} precision={6} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="outputMultiplier"
                label="输出倍率"
                rules={[{ required: true, message: "请输入输出倍率" }]}
              >
                <InputNumber min={0} step={0.000001} precision={6} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="groupMultiplier"
                label="分组倍率"
                rules={[{ required: true, message: "请输入分组倍率" }]}
              >
                <InputNumber min={0} step={0.000001} precision={6} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="enabled"
                label="启用"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </div>

            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={3} placeholder="可填写供应商说明、倍率来源、结算备注等" />
            </Form.Item>

            <Card
              size="small"
              className="sub-glass-card"
              title={(
                <Space>
                  <Calculator size={16} />
                  <span>计费预览</span>
                </Space>
              )}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Form.Item name="previewInputTokens" label="示例输入 Tokens">
                  <InputNumber min={0} precision={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="previewOutputTokens" label="示例输出 Tokens">
                  <InputNumber min={0} precision={0} style={{ width: "100%" }} />
                </Form.Item>
              </div>

              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Text>
                  输入单价：<Text strong>{formatPrice(preview.inputPricePer1m)}</Text> / 1M tokens
                </Text>
                <Text>
                  输出单价：<Text strong>{formatPrice(preview.outputPricePer1m)}</Text> / 1M tokens
                </Text>
                <Text>
                  示例费用：<Text strong>{formatPrice(preview.estimatedCost)}</Text>
                </Text>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  ({preview.previewInputTokens.toLocaleString("zh-CN")} 输入 tokens / 1M × {formatPrice(preview.inputPricePer1m)}
                  {" "}+ {preview.previewOutputTokens.toLocaleString("zh-CN")} 输出 tokens / 1M × {formatPrice(preview.outputPricePer1m)})
                  × {preview.groupMultiplier.toFixed(6)}，仅供参考，以实际扣费为准。
                </Paragraph>
              </Space>
            </Card>
          </Form>
        </Space>
      </Modal>
    </>
  );
}
