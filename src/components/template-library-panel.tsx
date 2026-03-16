"use client";

import { getDefaultInstanceTemplate, instanceTemplates } from "@/config/instance-templates";
import { resolveTemplateImagePreset } from "@/lib/instance-template";
import type { ImagePreset } from "@/types/contracts";
import { Alert, Button, Card, Empty, Space, Tag, Typography } from "antd";
import { Layers, PlayCircle, RefreshCw } from "lucide-react";

const { Paragraph, Text, Title } = Typography;

export function TemplateLibraryPanel({
  images,
  loadingImages,
  onRefreshImages,
  onUseTemplate,
}: {
  images: ImagePreset[];
  loadingImages?: boolean;
  onRefreshImages?: () => void;
  onUseTemplate?: (templateKey: string) => void;
}) {
  const defaultTemplate = getDefaultInstanceTemplate();

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="模板托管模式已启用"
        description="当前阶段实例将优先按模板创建。模板中心负责定义主 Agent、Skills 与运行时默认配置，实例详情页仅做只读查看。"
      />

      <Card
        className="glass-card"
        title="模板中心"
        extra={(
          <Button
            icon={<RefreshCw size={14} />}
            onClick={onRefreshImages}
            loading={loadingImages}
          >
            刷新镜像
          </Button>
        )}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {instanceTemplates.length === 0 ? (
            <Empty description="当前没有可用模板" />
          ) : instanceTemplates.map((template) => {
            const resolvedImage = resolveTemplateImagePreset(template, images);
            const isDefault = template.key === defaultTemplate.key;
            return (
              <Card
                key={template.key}
                type="inner"
                title={(
                  <Space size="small" wrap>
                    <span>{template.displayName}</span>
                    {isDefault ? <Tag color="blue">默认模板</Tag> : null}
                    {template.tags.map((tag) => (
                      <Tag key={tag} color="purple">{tag}</Tag>
                    ))}
                  </Space>
                )}
                extra={(
                  <Button
                    type="primary"
                    icon={<PlayCircle size={14} />}
                    onClick={() => onUseTemplate?.(template.key)}
                  >
                    使用模板创建实例
                  </Button>
                )}
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Paragraph style={{ marginBottom: 0 }}>{template.description}</Paragraph>
                  <Text type="secondary">{template.summary}</Text>

                  <div className="agent-detail-grid">
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">模板标识</span>
                      <span className="agent-detail-prop-value">{template.key}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">默认镜像</span>
                      <span className="agent-detail-prop-value">
                        {resolvedImage ? `${resolvedImage.name} · ${resolvedImage.image}` : `${template.imagePresetId}（当前未命中可用镜像）`}
                      </span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">主 Agent</span>
                      <span className="agent-detail-prop-value">{template.mainAgent.agentKey}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Skills 数量</span>
                      <span className="agent-detail-prop-value">{template.skillKeys.length}</span>
                    </div>
                  </div>

                  <div>
                    <Title level={5} style={{ marginBottom: 8 }}>
                      <Space size="small">
                        <Layers size={16} />
                        <span>锁定范围</span>
                      </Space>
                    </Title>
                    <Space size={[8, 8]} wrap>
                      {template.lockedScopes.map((scope) => (
                        <Tag key={scope} color="gold">{scope}</Tag>
                      ))}
                    </Space>
                  </div>

                  <div>
                    <Title level={5} style={{ marginBottom: 8 }}>预装 Skills</Title>
                    <Space size={[8, 8]} wrap>
                      {template.skillKeys.map((skillKey) => (
                        <Tag key={skillKey}>{skillKey}</Tag>
                      ))}
                    </Space>
                  </div>
                </Space>
              </Card>
            );
          })}
        </Space>
      </Card>
    </Space>
  );
}
