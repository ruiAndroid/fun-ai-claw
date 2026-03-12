"use client";

import {
  createInstanceCronJob,
  deleteInstanceCronJob,
  listInstanceCronJobs,
} from "@/lib/control-api";
import type { CronJob } from "@/lib/control-api";
import { uiText } from "@/constants/ui-text";
import { Alert, Button, Empty, Input, Modal, Space, Tag, message } from "antd";
import { motion } from "framer-motion";
import { CalendarClock, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function formatTimestamp(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function InstanceTaskPanel({ instanceId }: { instanceId: string }) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

  // create form
  const [formName, setFormName] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formCommand, setFormCommand] = useState("");

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const loadJobs = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await listInstanceCronJobs(instanceId);
      setJobs(response.jobs);
      setSelectedJobId((current) => {
        if (current && response.jobs.some((j) => j.id === current)) return current;
        return response.jobs.length > 0 ? response.jobs[0].id : undefined;
      });
      if (showSuccess) messageApi.success("已刷新任务列表");
    } catch (apiError) {
      setJobs([]);
      setSelectedJobId(undefined);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [instanceId, messageApi]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const handleCreate = useCallback(async () => {
    if (!formSchedule.trim()) {
      messageApi.warning(uiText.taskScheduleRequired);
      return;
    }
    if (!formCommand.trim()) {
      messageApi.warning(uiText.taskCommandRequired);
      return;
    }
    setCreating(true);
    setError(undefined);
    try {
      const result = await createInstanceCronJob(instanceId, {
        name: formName.trim() || undefined,
        schedule: formSchedule.trim(),
        command: formCommand.trim(),
      });
      setFormName("");
      setFormSchedule("");
      setFormCommand("");
      setSelectedJobId(result.job.id);
      await loadJobs();
      messageApi.success(uiText.taskCreated);
    } catch (apiError) {
      const msg = apiError instanceof Error ? apiError.message : String(apiError);
      setError(msg);
      messageApi.error(uiText.taskCreateFailed);
    } finally {
      setCreating(false);
    }
  }, [instanceId, formName, formSchedule, formCommand, loadJobs, messageApi]);

  const handleDelete = useCallback(async (jobId: string) => {
    modal.confirm({
      title: uiText.confirmDeleteTask,
      okText: "确定",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        setDeleting(true);
        setError(undefined);
        try {
          await deleteInstanceCronJob(instanceId, jobId);
          if (selectedJobId === jobId) setSelectedJobId(undefined);
          await loadJobs();
          messageApi.success(uiText.taskDeleted);
        } catch (apiError) {
          const msg = apiError instanceof Error ? apiError.message : String(apiError);
          setError(msg);
          messageApi.error(uiText.taskDeleteFailed);
        } finally {
          setDeleting(false);
        }
      },
    });
  }, [instanceId, selectedJobId, loadJobs, messageApi, modal]);

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {/* header */}
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-task"><CalendarClock size={16} /></span>
            {uiText.tabTask}
          </div>
          <Space size="small">
            <Tag color="purple">{jobs.length} 个任务</Tag>
            <Button
              size="small"
              loading={loading}
              onClick={() => void loadJobs(true)}
              icon={<RefreshCw size={12} />}
            >
              刷新
            </Button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {/* job cards */}
        {jobs.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">{uiText.taskCreatedJobs}</span>
            </div>
            <div className="agent-prompt-body">
              <div className="skill-card-grid-v2">
                {jobs.map((job) => {
                  const selected = selectedJobId === job.id;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      className={`skill-card-v2 ${selected ? "is-selected" : ""}`}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <div className="skill-card-v2-icon is-allowed">
                        <CalendarClock size={18} />
                      </div>
                      <strong className="skill-card-v2-title">{job.name || job.command}</strong>
                      <p className="skill-card-v2-path" title={job.command}>{job.command}</p>
                      <Space size={4} wrap>
                        {job.enabled ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>}
                        {job.last_status ? (
                          <Tag color={job.last_status === "ok" ? "green" : "red"}>{job.last_status}</Tag>
                        ) : (
                          <Tag>未执行</Tag>
                        )}
                      </Space>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          !loading ? <Empty description={uiText.noTasks} /> : null
        )}

        {/* create form */}
        <div className="agent-prompt-card">
          <div className="agent-prompt-header">
            <span className="agent-prompt-header-title">{uiText.taskCreateNew}</span>
          </div>
          <div className="agent-prompt-body is-spacious">
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Input
                placeholder={uiText.taskNamePlaceholder}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              <Input
                placeholder={uiText.taskSchedulePlaceholder}
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value)}
              />
              <Input.TextArea
                placeholder={uiText.taskCommandPlaceholder}
                rows={3}
                value={formCommand}
                onChange={(e) => setFormCommand(e.target.value)}
              />
              <Button
                type="primary"
                icon={<Plus size={14} />}
                loading={creating}
                onClick={() => void handleCreate()}
              >
                {uiText.createTask}
              </Button>
            </Space>
          </div>
        </div>

        {/* detail panel */}
        {selectedJob ? (
          <motion.div
            key={selectedJob.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="agent-prompt-card">
              <div className="agent-prompt-header">
                <span className="agent-prompt-header-title">
                  {selectedJob.name || selectedJob.command}
                </span>
                <Button
                  danger
                  size="small"
                  icon={<Trash2 size={12} />}
                  loading={deleting}
                  onClick={() => void handleDelete(selectedJob.id)}
                >
                  {uiText.deleteTask}
                </Button>
              </div>
              <div className="agent-prompt-body is-spacious">
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <div className="agent-detail-props">
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">ID</span>
                      <span className="agent-detail-prop-value">{selectedJob.id}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Name</span>
                      <span className="agent-detail-prop-value">{selectedJob.name || "-"}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Enabled</span>
                      <span className="agent-detail-prop-value">{selectedJob.enabled ? "true" : "false"}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Next Run</span>
                      <span className="agent-detail-prop-value">{formatTimestamp(selectedJob.next_run)}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Last Run</span>
                      <span className="agent-detail-prop-value">{formatTimestamp(selectedJob.last_run)}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Last Status</span>
                      <span className="agent-detail-prop-value">{selectedJob.last_status || "-"}</span>
                    </div>
                  </div>

                  <div className="agent-detail-prop is-wide" style={{ marginTop: 4 }}>
                    <span className="agent-detail-prop-label">Command</span>
                    <Input.TextArea
                      className="prompt-textarea"
                      rows={4}
                      readOnly
                      value={selectedJob.command}
                    />
                  </div>
                </Space>
              </div>
            </div>
          </motion.div>
        ) : null}
      </Space>
    </>
  );
}
