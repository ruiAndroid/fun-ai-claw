"use client";

import { createOpenApp, deleteOpenApp, listOpenApps, updateOpenApp, listInstances } from "@/lib/control-api";
import { OpenClientApp, OpenClientAppCreateResponse, ClawInstance } from "@/types/contracts";
import { Button, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography, message } from "antd";
import { Copy, Eye, EyeOff, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const { Text, Paragraph } = Typography;

function copyText(text: string): boolean {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
    return true;
  }
  // fallback for HTTP (non-secure context)
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

function maskText(text: string, showStart: number, showEnd: number): string {
  if (text.length <= showStart + showEnd) return text;
  return text.slice(0, showStart) + "••••••" + text.slice(-showEnd);
}

interface SecretDisplayProps {
  appId: string;
  plainSecret: string;
  onClose: () => void;
}

function SecretDisplayModal({ appId, plainSecret, onClose }: SecretDisplayProps) {
  const [appIdVisible, setAppIdVisible] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const copyToClipboard = useCallback((text: string, label: string) => {
    if (copyText(text)) {
      messageApi.success(`${label} 已复制到剪贴板`);
    } else {
      messageApi.error("复制失败，请手动复制");
    }
  }, [messageApi]);

  return (
    <Modal
      title="应用创建成功"
      open
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          我已保存，关闭
        </Button>,
      ]}
      closable={false}
      maskClosable={false}
      width={560}
    >
      {contextHolder}
      <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fff7e6", border: "1px solid #ffd591", borderRadius: 8 }}>
        <Space align="start">
          <AlertTriangle size={18} style={{ color: "#fa8c16", marginTop: 2 }} />
          <Text strong style={{ color: "#ad6800" }}>
            请妥善保存以下凭证，关闭后 Secret 将不再可见！
          </Text>
        </Space>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>App ID</Text>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <code style={{ flex: 1, padding: "8px 12px", background: "#f5f5f5", borderRadius: 6, fontSize: 13 }}>
            {appIdVisible ? appId : maskText(appId, 6, 4)}
          </code>
          <Button
            type="text"
            size="small"
            icon={appIdVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            onClick={() => setAppIdVisible(!appIdVisible)}
          />
          <Button
            type="text"
            size="small"
            icon={<Copy size={14} />}
            onClick={() => copyToClipboard(appId, "App ID")}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>App Secret</Text>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <code style={{ flex: 1, padding: "8px 12px", background: "#f5f5f5", borderRadius: 6, fontSize: 13, wordBreak: "break-all" }}>
            {secretVisible ? plainSecret : maskText(plainSecret, 8, 4)}
          </code>
          <Button
            type="text"
            size="small"
            icon={secretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            onClick={() => setSecretVisible(!secretVisible)}
          />
          <Button
            type="text"
            size="small"
            icon={<Copy size={14} />}
            onClick={() => copyToClipboard(plainSecret, "Secret")}
          />
        </div>
      </div>

      <Button
        block
        onClick={() => copyToClipboard(`App ID: ${appId}\nApp Secret: ${plainSecret}`, "全部凭证")}
        icon={<Copy size={14} />}
      >
        复制全部凭证
      </Button>
    </Modal>
  );
}

interface CreateAppFormValues {
  name: string;
  defaultInstanceId?: string;
  defaultAgentId?: string;
}

export function OpenPlatformPanel() {
  const [apps, setApps] = useState<OpenClientApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<ClawInstance[]>([]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<CreateAppFormValues>();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<OpenClientApp | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm] = Form.useForm();

  const [createdResult, setCreatedResult] = useState<OpenClientAppCreateResponse | null>(null);

  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await listOpenApps();
      setApps(resp.items);
    } catch (err) {
      messageApi.error(`加载应用列表失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  const fetchInstances = useCallback(async () => {
    try {
      const resp = await listInstances();
      setInstances(resp.items);
    } catch {
      // silent - instances are optional for the dropdown
    }
  }, []);

  useEffect(() => {
    void fetchApps();
    void fetchInstances();
  }, [fetchApps, fetchInstances]);

  const handleCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      const result = await createOpenApp({
        name: values.name,
        defaultInstanceId: values.defaultInstanceId || null,
        defaultAgentId: values.defaultAgentId || null,
      });
      setCreatedResult(result);
      setCreateModalOpen(false);
      createForm.resetFields();
      void fetchApps();
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      messageApi.error(`创建失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCreating(false);
    }
  }, [createForm, messageApi, fetchApps]);

  const handleEdit = useCallback((app: OpenClientApp) => {
    setEditingApp(app);
    editForm.setFieldsValue({
      name: app.name,
      enabled: app.enabled,
      defaultInstanceId: app.defaultInstanceId || undefined,
      defaultAgentId: app.defaultAgentId || undefined,
    });
    setEditModalOpen(true);
  }, [editForm]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingApp) return;
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      await updateOpenApp(editingApp.appId, {
        name: values.name,
        enabled: values.enabled,
        defaultInstanceId: values.defaultInstanceId || null,
        defaultAgentId: values.defaultAgentId || null,
      });
      messageApi.success("更新成功");
      setEditModalOpen(false);
      setEditingApp(null);
      void fetchApps();
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      messageApi.error(`更新失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [editingApp, editForm, messageApi, fetchApps]);

  const handleDelete = useCallback((app: OpenClientApp) => {
    modal.confirm({
      title: "确认删除",
      content: (
        <div>
          <p>确定要删除应用 <strong>{app.name}</strong>（{app.appId}）吗？</p>
          <p style={{ color: "#ff4d4f", marginTop: 8 }}>
            此操作将级联删除该应用下的所有会话和消息记录，不可撤销。
          </p>
        </div>
      ),
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteOpenApp(app.appId);
          messageApi.success("删除成功");
          void fetchApps();
        } catch (err) {
          messageApi.error(`删除失败: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    });
  }, [modal, messageApi, fetchApps]);

  const columns = [
    {
      title: "App ID",
      dataIndex: "appId",
      key: "appId",
      width: 220,
      render: (appId: string) => (
        <Space size={4}>
          <code style={{ fontSize: 12 }}>{appId}</code>
          <Button
            type="text"
            size="small"
            icon={<Copy size={12} />}
            onClick={() => { copyText(appId); messageApi.success("App ID 已复制"); }}
            style={{ color: "#999" }}
          />
        </Space>
      ),
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 160,
    },
    {
      title: "Secret",
      dataIndex: "appSecret",
      key: "appSecret",
      width: 240,
      render: (secret: string) => (
        <Space size={4}>
          <code style={{ fontSize: 12 }}>{maskText(secret, 8, 4)}</code>
          <Button
            type="text"
            size="small"
            icon={<Copy size={12} />}
            onClick={() => { copyText(secret); messageApi.success("Secret 已复制"); }}
            style={{ color: "#999" }}
          />
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "enabled",
      key: "enabled",
      width: 80,
      render: (enabled: boolean) =>
        enabled ? <Tag color="green">启用</Tag> : <Tag color="default">禁用</Tag>,
    },
    {
      title: "默认实例",
      dataIndex: "defaultInstanceId",
      key: "defaultInstanceId",
      width: 180,
      render: (id: string | null) => {
        if (!id) return <Text type="secondary">-</Text>;
        const inst = instances.find((i) => i.id === id);
        return inst ? <Text>{inst.name}</Text> : <code style={{ fontSize: 11 }}>{id.substring(0, 8)}...</code>;
      },
    },
    {
      title: "默认 Agent",
      dataIndex: "defaultAgentId",
      key: "defaultAgentId",
      width: 160,
      render: (id: string | null) =>
        id ? <code style={{ fontSize: 12 }}>{id}</code> : <Text type="secondary">-</Text>,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (v: string) => new Date(v).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      render: (_: unknown, record: OpenClientApp) => (
        <Space size="small">
          <Button type="text" size="small" icon={<Pencil size={14} />} onClick={() => handleEdit(record)} />
          <Button type="text" size="small" danger icon={<Trash2 size={14} />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  const instanceOptions = instances.map((inst) => ({
    value: inst.id,
    label: `${inst.name} (${inst.id.substring(0, 8)}...)`,
  }));

  return (
    <>
      {contextHolder}
      {modalContextHolder}

      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            管理接入 Open API 的外部应用，分配 App ID 和 Secret 凭证。
          </Paragraph>
        </div>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateModalOpen(true)}>
          创建应用
        </Button>
      </div>

      <Table
        dataSource={apps}
        columns={columns}
        rowKey="appId"
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 1000 }}
        locale={{ emptyText: "暂无开放应用，点击「创建应用」开始接入" }}
      />

      {/* Create Modal */}
      <Modal
        title="创建开放应用"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={() => void handleCreate()}
        okText="创建"
        confirmLoading={creating}
      >
        <Form<CreateAppFormValues> form={createForm} layout="vertical">
          <Form.Item
            name="name"
            label="应用名称"
            rules={[{ required: true, message: "请输入应用名称" }]}
          >
            <Input placeholder="例如：Partner Web" />
          </Form.Item>
          <Form.Item name="defaultInstanceId" label="默认绑定实例">
            <Select
              allowClear
              placeholder="可选，外部调用时的默认实例"
              options={instanceOptions}
            />
          </Form.Item>
          <Form.Item name="defaultAgentId" label="默认 Agent ID">
            <Input placeholder="可选，例如 mgc-novel-to-script" />
          </Form.Item>
        </Form>
        <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
          App ID 将自动生成（格式 fun-xxxxxxxxxx），Secret 仅在创建时显示一次。
        </Paragraph>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="编辑开放应用"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingApp(null); }}
        onOk={() => void handleSaveEdit()}
        okText="保存"
        confirmLoading={saving}
      >
        {editingApp && (
          <div style={{ marginBottom: 16, padding: "8px 12px", background: "#f5f5f5", borderRadius: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>App ID: </Text>
            <code style={{ fontSize: 12 }}>{editingApp.appId}</code>
          </div>
        )}
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="应用名称"
            rules={[{ required: true, message: "请输入应用名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item name="defaultInstanceId" label="默认绑定实例">
            <Select
              allowClear
              placeholder="可选"
              options={instanceOptions}
            />
          </Form.Item>
          <Form.Item name="defaultAgentId" label="默认 Agent ID">
            <Input placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Secret Display Modal */}
      {createdResult && (
        <SecretDisplayModal
          appId={createdResult.appId}
          plainSecret={createdResult.plainSecret}
          onClose={() => setCreatedResult(null)}
        />
      )}
    </>
  );
}
