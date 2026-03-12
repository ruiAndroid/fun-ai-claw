"use client";

import {
  getAgentBaseline,
  listAgentBaselines,
  listInstanceAgentBindings,
  listInstanceSkillBindings,
  uninstallInstanceAgentBinding,
  upsertInstanceAgentBinding,
} from "@/lib/control-api";
import type {
  AgentBaseline,
  AgentBaselineSummary,
  InstanceAgentBinding,
  InstanceSkillBinding,
} from "@/types/contracts";
import { Alert, Button, Empty, Input, InputNumber, Select, Space, Switch, Tag, Typography, message } from "antd";
import { motion } from "framer-motion";
import { Bot, ChevronLeft, Download, Eye, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

type AgentDraft = {
  provider: string;
  model: string;
  temperature: number | null;
  agentic: boolean;
  systemPrompt: string;
  allowedTools: string[];
};

function toDraft(binding: InstanceAgentBinding): AgentDraft {
  return {
    provider: binding.provider ?? "",
    model: binding.model ?? "",
    temperature: binding.temperature ?? null,
    agentic: binding.agentic === true,
    systemPrompt: binding.systemPrompt ?? "",
    allowedTools: binding.allowedTools ?? [],
  };
}

function snapshotDraft(value: AgentDraft | undefined): string {
  if (!value) {
    return "";
  }
  return JSON.stringify({
    provider: value.provider,
    model: value.model,
    temperature: value.temperature,
    agentic: value.agentic,
    systemPrompt: value.systemPrompt,
    allowedTools: value.allowedTools,
  });
}

function formatTimestamp(value?: string | null): string {
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

type InstanceAgentPanelProps = {
  instanceId: string;
  onInstalledAgentsChange?: (bindings: InstanceAgentBinding[]) => void;
};

export function InstanceAgentPanel({ instanceId, onInstalledAgentsChange }: InstanceAgentPanelProps) {
  const [baselines, setBaselines] = useState<AgentBaselineSummary[]>([]);
  const [bindings, setBindings] = useState<InstanceAgentBinding[]>([]);
  const [skillBindings, setSkillBindings] = useState<InstanceSkillBinding[]>([]);
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>();
  const [agentSearch, setAgentSearch] = useState("");
  const [selectedBaselineDetail, setSelectedBaselineDetail] = useState<AgentBaseline>();
  const [draft, setDraft] = useState<AgentDraft>();
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [systemPromptCollapsed, setSystemPromptCollapsed] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  const loadAll = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const [baselineResponse, bindingResponse, skillBindingResponse] = await Promise.all([
        listAgentBaselines(),
        listInstanceAgentBindings(instanceId),
        listInstanceSkillBindings(instanceId),
      ]);
      const nextBaselines = baselineResponse.items;
      const nextBindings = bindingResponse.items;
      const nextSkillBindings = skillBindingResponse.items;
      const installedKeys = new Set(nextBindings.map((item) => item.agentKey));
      const nextCandidates = nextBaselines.filter((item) => item.enabled && !installedKeys.has(item.agentKey));

      setBaselines(nextBaselines);
      setBindings(nextBindings);
      setSkillBindings(nextSkillBindings);
      setSelectedAgentKey((current) => {
        if (current && (nextBindings.some((item) => item.agentKey === current) || nextCandidates.some((item) => item.agentKey === current))) {
          return current;
        }
        if (nextBindings.length > 0) {
          return nextBindings[0].agentKey;
        }
        return undefined;
      });
      if (showSuccess) {
        messageApi.success("闂傚倸鍊峰ù鍥敋瑜嶉湁闁绘垼妫勭粻鐘绘煙閹规劦鍤欑紒鐘靛枛濮婁粙宕堕鈧闂佸湱澧楀妯肩矆閸愨斂浜滈柡鍌氱仢閹垶淇婂顔煎闁宠鍨块幃娆撳级閹寸姳鎴烽梻浣规偠閸斿酣骞婇幘鍦罕婵犳鍠楅妵娑㈠磻閹剧粯鐓涢悘鐐殿焾婢ц尙鈧灚婢樼€氼參骞嗛弮鍫濐潊妞ゎ偒鍏橀崑鎾寸節閸ャ劉鎷洪梺鍛婄箓鐎氬嘲危閸忛棿绻嗘い鎰╁灩椤忣厼鈹?Agent");
      }
    } catch (apiError) {
      setBaselines([]);
      setBindings([]);
      setSkillBindings([]);
      setSelectedAgentKey(undefined);
      setSelectedBaselineDetail(undefined);
      setDraft(undefined);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [instanceId, messageApi]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    onInstalledAgentsChange?.(bindings);
  }, [bindings, onInstalledAgentsChange]);

  const bindingMap = useMemo(() => new Map(bindings.map((item) => [item.agentKey, item])), [bindings]);
  const selectedBinding = selectedAgentKey ? bindingMap.get(selectedAgentKey) : undefined;
  const installedAgents = useMemo(
    () => bindings.slice().sort((left, right) => left.agentKey.localeCompare(right.agentKey)),
    [bindings],
  );
  const candidateAgents = useMemo(() => {
    const installedKeys = new Set(bindings.map((item) => item.agentKey));
    return baselines
      .filter((item) => item.enabled && !installedKeys.has(item.agentKey))
      .sort((left, right) => left.agentKey.localeCompare(right.agentKey));
  }, [baselines, bindings]);
  const filteredCandidateAgents = useMemo(() => {
    if (!agentSearch.trim()) return candidateAgents;
    const keyword = agentSearch.trim().toLowerCase();
    return candidateAgents.filter(
      (item) =>
        item.agentKey.toLowerCase().includes(keyword) ||
        (item.displayName || "").toLowerCase().includes(keyword),
    );
  }, [candidateAgents, agentSearch]);

  useEffect(() => {
    if (selectedBinding) {
      setDraft(toDraft(selectedBinding));
      setSelectedBaselineDetail(undefined);
      setSystemPromptCollapsed(true);
      return;
    }
    setDraft(undefined);
    if (!selectedAgentKey) {
      setSelectedBaselineDetail(undefined);
      return;
    }
    setDetailLoading(true);
    void getAgentBaseline(selectedAgentKey)
      .then((response) => {
        setSelectedBaselineDetail(response);
        setSystemPromptCollapsed(true);
      })
      .catch(() => {
        setSelectedBaselineDetail(undefined);
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [selectedAgentKey, selectedBinding]);

  const skillOptions = useMemo(() => {
    const values = new Set<string>();
    skillBindings.forEach((item) => values.add(item.skillKey));
    (draft?.allowedTools ?? []).forEach((item) => values.add(item));
    return Array.from(values).sort((left, right) => left.localeCompare(right)).map((item) => ({
      value: item,
      label: item,
    }));
  }, [draft?.allowedTools, skillBindings]);

  const draftDirty = snapshotDraft(draft) !== snapshotDraft(selectedBinding ? toDraft(selectedBinding) : undefined);

  const handleInstall = useCallback(async (agentKey?: string) => {
    const targetAgentKey = agentKey ?? selectedAgentKey;
    if (!targetAgentKey) {
      return;
    }
    setSelectedAgentKey(targetAgentKey);
    setSaving(true);
    setError(undefined);
    try {
      await upsertInstanceAgentBinding(instanceId, targetAgentKey, { updatedBy: "ui-dashboard" });
      setSelectedAgentKey(targetAgentKey);
      await loadAll();
      messageApi.success("Agent installed to this instance");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to install agent");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadAll, messageApi, selectedAgentKey]);

  const handleSave = useCallback(async () => {
    if (!selectedBinding || !draft) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const saved = await upsertInstanceAgentBinding(instanceId, selectedBinding.agentKey, {
        provider: draft.provider || null,
        model: draft.model || null,
        temperature: draft.temperature,
        agentic: draft.agentic,
        systemPrompt: draft.systemPrompt,
        allowedTools: draft.allowedTools,
        updatedBy: "ui-dashboard",
      });
      setBindings((current) => current.map((item) => item.agentKey === saved.agentKey ? saved : item));
      setDraft(toDraft(saved));
      messageApi.success("Instance agent config saved");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to save agent config");
    } finally {
      setSaving(false);
    }
  }, [draft, instanceId, messageApi, selectedBinding]);

  const handleUninstall = useCallback(async (agentKey?: string) => {
    const targetAgentKey = agentKey ?? selectedBinding?.agentKey ?? selectedAgentKey;
    if (!targetAgentKey) {
      return;
    }
    setSelectedAgentKey(targetAgentKey);
    setSaving(true);
    setError(undefined);
    try {
      await uninstallInstanceAgentBinding(instanceId, targetAgentKey);
      await loadAll();
      messageApi.success("Agent removed from this instance");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to uninstall agent");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadAll, messageApi, selectedAgentKey, selectedBinding]);
  }, [instanceId, loadAll, messageApi, selectedAgentKey, selectedBinding]);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-agent"><Bot size={16} /></span>
            闂傚倸鍊搁崐宄懊归崶顒夋晪鐟滃酣銆冮妷褏鐭欓柛鏌倐鍋撻崸妤佲拺妞ゆ巻鍋撶紒澶婎嚟婢规洜绱掑Ο鍦畾濡炪倖鐗楅懝楣冨箖閹寸偑浜?Agent 闂傚倸鍊搁崐鎼佸磹閹间礁纾归柣鎴ｅГ閸婂潡鏌ㄩ弴妤€浜惧銈庡幖閻忔繆鐏掗梺鍏肩ゴ閺呮繈鎮＄€ｎ喗鈷戦柛鎾村絻娴滄繃绻涢崣澶涜€跨€?
          </div>
          <Space size="small">
            <Tag color="green">闂傚倸鍊峰ù鍥敋瑜嶉～婵嬫晝閸岋妇绋忔繝銏ｅ煐閸旀牠宕戦妶澶嬬厸闁搞儮鏅涘皬闂佺粯甯掗敃銉╁Φ閸曨喚鐤€闁规崘娉涢幃瀣節閵忥絾纭炬い鎴濇川瀵囧焵椤掑嫭鈷戦柛娑橈工婵偓闂佸搫鎳忛惄顖炴晲?{installedAgents.length}</Tag>
            <Tag color="blue">闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偛顦甸弫鎾绘偐閸愯弓鐢绘俊鐐€栭悧婊堝磻濞戙垹鍨傞柛宀€鍋為埛鎴炪亜閹哄棗浜剧紓浣割槹閹告娊寮婚妸鈺佄ч柛娑变簼閺傗偓闂備胶绮敋鐎殿喖鐖奸獮鏍箛椤斿墽锛滈梺?{candidateAgents.length}</Tag>
            <Tag color="gold">闂傚倸鍊峰ù鍥敋瑜嶉～婵嬫晝閸岋妇绋忔繝銏ｅ煐閸旀牠宕戦妶澶嬬厸闁搞儮鏅涘皬闂佺粯甯掗敃銉╁Φ閸曨喚鐤€闁规崘娉涢幃瀣節閵忥絾纭炬い鎴濇川瀵囧焵椤掑嫭鈷戦柛娑橈工婵偓闂佸搫鎳忛惄顖炴晲?Skill {skillBindings.length}</Tag>
            <Button
              size="small"
              loading={loading}
              onClick={() => {
                void loadAll(true);
              }}
              icon={<RefreshCw size={12} />}
            >
              闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偛顦甸弫宥夊礋椤掍焦顔囬梻浣芥硶閸犳挻鎱ㄧ€靛摜纾奸柍鍝勬噺閳锋垶銇勯幒鍡椾壕缂備礁顦伴幐鎶藉箯?
            </Button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {installedAgents.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">Installed</span>
            </div>
            <div className="agent-prompt-body">
              <div className="agent-selector-grid">
                {installedAgents.map((item) => {
                  const selected = selectedAgentKey === item.agentKey;
                  return (
                    <div key={item.agentKey} className="selector-card-shell">
                      <button
                        type="button"
                        className={`agent-selector-card ${selected ? "is-selected" : ""}`}
                        onClick={() => setSelectedAgentKey(item.agentKey)}
                      >
                        <div className={`agent-selector-card-icon ${item.agentic ? "is-agentic" : "is-standard"}`}>
                          <Bot size={18} />
                        </div>
                        <strong className="agent-selector-card-title">{item.displayName || item.agentKey}</strong>
                        <p className="agent-selector-card-path">{item.agentKey}</p>
                        <div className="agent-selector-card-meta">
                          <span className="agent-selector-card-chip is-neutral">{item.runtime}</span>
                          <span className={`agent-selector-card-chip ${item.enabled ? "is-agentic" : "is-neutral"}`}>
                            {item.enabled ? "Enabled" : "Disabled"}
                          </span>
                          {item.model ? <span className="agent-selector-card-chip is-model">{item.model}</span> : null}
                        </div>
                      </button>
                      <Button
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        className="selector-card-hover-action"
                        loading={saving && selectedAgentKey === item.agentKey}
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleUninstall(item.agentKey);
                        }}
                      >
                        闂傚倸鍊搁崐椋庣矆娓氣偓楠炲鏁撻悩顔瑰亾閸愵喖骞㈡繛鎴炵懃娴犻亶姊洪崫鍕窛濞?
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          !loading ? <Empty description="闂傚倸鍊峰ù鍥х暦閻㈢绐楅柟閭﹀枛閸ㄦ繈骞栧ǎ顒€鐏繛鍛У娣囧﹪濡堕崨顔兼缂備胶濮抽崡鎶藉蓟濞戞ǚ妲堟慨妤€鐗婇弫鎯р攽閻愬弶鍣藉┑鐐╁亾闂佸搫鐭夌徊鍊熺亽缂佺偓濯芥ご绋啃掑畝鍕拺缂佸顑欓崕鎰版煙閻熺増鎼愰柣锝囧厴閹粎绮电€ｎ偅娅嶉梻浣虹帛閸旀牗绔熼崱娑欑參闁汇垻鏁哥壕浠嬫煕鐏炲墽鎳勭紒浣瑰缁辨捇宕煎鍐ㄧギ閻庤娲樺ú鐔肩嵁閹捐绠虫繝闈涚墕婵椽姊洪懡銈呅㈡繛灞傚€曢锝夘敆閸曨剙浜滈梺绋跨箳閸樠冣枔閵夆晜鈷戦梻鍫熺〒婢ф洘淇婇銏㈢劯妤犵偞鍔欏畷鐔碱敍濞戞帗瀚藉┑鐐舵彧缁蹭粙骞夐敓鐘茬畾闁割偁鍎查悡鐔镐繆閵堝倸浜惧┑鈽嗗亝缁诲棗螞閻斿吋鈷戠痪顓炴噺绾儳顭跨憴鍕噭鐎垫澘瀚埀顒婄秵閸撴盯鎯侀崼銉︹拺闁告稑锕ゆ慨鈧梺鍝勬噺閻╊垶鏁?Agent" /> : null
        )}

        {candidateAgents.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">Available</span>
              <Input
                placeholder="闂傚倸鍊搁崐鎼佸磹閻戣姤鍤勯柛顐ｆ礀缁犵娀鏌熼幑鎰靛殭閻熸瑱绠撻幃妤呮晲鎼粹€愁潻闂佹悶鍔嶇换鍫ョ嵁閺嶎灔搴敆閳ь剚淇婇懖鈺冩／?Agent..."
                prefix={<Search size={14} style={{ opacity: 0.45 }} />}
                allowClear
                style={{ width: 240 }}
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
              />
            </div>
            <div className="agent-prompt-body">
              {filteredCandidateAgents.length > 0 ? (
                <div className="agent-selector-grid">
                  {filteredCandidateAgents.map((item) => {
                    const selected = selectedAgentKey === item.agentKey;
                    return (
                      <div key={item.agentKey} className="selector-card-shell">
                        <button
                          type="button"
                          className={`agent-selector-card ${selected ? "is-selected" : ""}`}
                          onClick={() => setSelectedAgentKey(item.agentKey)}
                        >
                          <div className="agent-selector-card-icon is-standard">
                            <Download size={18} />
                          </div>
                          <strong className="agent-selector-card-title">{item.displayName || item.agentKey}</strong>
                          <p className="agent-selector-card-path">{item.agentKey}</p>
                          <Tag color="blue">Not installed</Tag>
                        </button>
                        <Button
                          size="small"
                          type="primary"
                          icon={<Download size={14} />}
                          className="selector-card-hover-action"
                          loading={saving && selectedAgentKey === item.agentKey}
                          disabled={saving}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleInstall(item.agentKey);
                          }}
                        >
                          闂傚倸鍊峰ù鍥х暦閻㈢绐楃€广儱娲ㄩ惌鍡椼€掑锝呬壕濡ょ姷鍋涢敃顏堢嵁濡吋鎯?
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty description={agentSearch ? "婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柟闂寸绾剧粯绻涢幋鐐垫噧缂佸墎鍋ら弻娑㈠Ψ椤旂厧顫╃紓浣插亾闁割偆鍠撶弧鈧梻鍌氱墛缁嬫帡鏁嶉弮鍫熺厾闁哄娉曟禒銏ゆ煏閸℃ê绗掓い顐ｇ箞閺佹劙宕ㄩ鈧ˉ姘舵⒑鐠囧弶鍞夋い顐㈩槸鐓ゆ繝濠傚閸欏繐螖閿濆懎鏆欏鍛存⒑閸︻厼顣兼繝銏☆焽缁骞庨懞銉у幍闁诲孩绋掗…鍥╃不濮樿京纾煎ù锝堫潐鐏忥附鎱?Agent" : "婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柟闂寸绾剧粯绻涢幋鐐垫噧缂佸墎鍋ら弻娑㈠Ψ椤旂厧顫╃紓浣插亾闁割偆鍠撶弧鈧梻鍌氱墛缁嬫帡鏁嶉弮鍫熺厾闁哄娉曟禒銏ゆ煏閸℃ê绗掓い顐ｇ箞閺佹劙宕ㄩ鈧ˉ姘舵⒑鐠囧弶鍞夋い顐㈩槸鐓ら柍鍝勫暟缁€濠傘€掑锝呬壕闂侀潧妫旂粈渚€鍩ユ径濞㈢喖鏌ㄧ€ｅ灚缍屽┑鐘殿暯濡插懘宕归棃娑氭殾闁汇垻鏁搁惌鎾舵喐閻楀牆绗氶柍閿嬪笒闇夐柨婵嗘噺閸熺偤鏌涢悢鍝勪沪闁逛究鍔嶇换婵嬪礋椤撶偟顐奸梻渚€鈧稓鈹掗柛鏂跨焸閹箖鏁撻悩鑼吋闂佹儳娴氶崑鍡樼?Agent"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        ) : null}

        {selectedBinding ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="agent-prompt-card">
              <div className="agent-prompt-header">
                <span className="agent-prompt-header-title">{selectedBinding.displayName || selectedBinding.agentKey}</span>
                <Space size="small" wrap>
                  <Button
                    type="primary"
                    size="small"
                    icon={<Save size={12} />}
                    disabled={!draftDirty}
                    loading={saving}
                    onClick={() => void handleSave()}
                  >
                    濠电姷鏁告慨鐑藉极閹间礁纾块柟瀵稿Т缁躲倝鏌﹀Ο渚＆婵炲樊浜濋弲婊堟煟閹伴潧澧幖鏉戯躬濮婅櫣绮欑捄銊т紘闂佺顑囬崑銈呯暦?
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<Trash2 size={12} />}
                    loading={saving}
                    onClick={() => void handleUninstall()}
                  >
                    闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偛顦甸弫鎾绘偐椤旂懓浜鹃柛鎰靛枛楠炪垺绻涢幋鐐垫噧濞寸娀浜跺娲传閸曨剙绐涙繛?
                  </Button>
                </Space>
              </div>

              <div className="agent-prompt-body is-spacious">
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <div className="agent-detail-grid">
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Agent Key</span>
                      <span className="agent-detail-prop-value">{selectedBinding.agentKey}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Runtime</span>
                      <span className="agent-detail-prop-value">{selectedBinding.runtime}</span>
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Provider</span>
                      <Input
                        value={draft?.provider ?? ""}
                        onChange={(event) => setDraft((current) => current ? { ...current, provider: event.target.value } : current)}
                        placeholder="custom:https://api.example.com/v1"
                      />
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Model</span>
                      <Input
                        value={draft?.model ?? ""}
                        onChange={(event) => setDraft((current) => current ? { ...current, model: event.target.value } : current)}
                        placeholder="MiniMax-M2.5"
                      />
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Temperature</span>
                      <InputNumber
                        style={{ width: "100%" }}
                        value={draft?.temperature ?? null}
                        min={0}
                        max={2}
                        step={0.1}
                        onChange={(value) => setDraft((current) => current ? { ...current, temperature: typeof value === "number" ? value : null } : current)}
                      />
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Agentic</span>
                      <Switch
                        checked={draft?.agentic === true}
                        onChange={(checked) => setDraft((current) => current ? { ...current, agentic: checked } : current)}
                      />
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Allowed Tools</span>
                      <Select
                        mode="multiple"
                        value={draft?.allowedTools ?? []}
                        options={skillOptions}
                        onChange={(value) => setDraft((current) => current ? { ...current, allowedTools: value } : current)}
                        placeholder="闂傚倸鍊搁崐鎼佸磹閹间礁纾瑰瀣椤愪粙鏌ㄩ悢鍝勑㈢痪鎯ь煼閺屾盯寮撮妸銉р偓顒勬煕閵夘喖澧紒鐘劜閵囧嫰寮崒娑樻畬婵炲瓨绮庨崑鎾诲箞閵娿儙鐔虹矙閸喖顫撳┑鐘愁問閸犳帡宕戦幘缁樷拻濞撴埃鍋撴繛浣冲厾娲晝閸屾氨顦┑鐐叉閹告儳鐣垫担瑙勫弿婵＄偠顕ф禍楣冩倵鐟欏嫭绀冮柨姘亜閺傝法绠绘い銏＄懇閹墽浠︾粙澶稿濡炪倖鍔ч梽鍕煕閹达附鍋ｉ柛銉ｅ妿閸欌偓濡炪倕瀛╅〃鍡欐崲濠靛鐒垫い鎺戝閻掕偐鈧箍鍎遍幊鎰版晬濞戞ǚ鏀介柍钘夋閻忕娀鏌涘顒夊剶妞ゃ垺娲樼粋鎺斺偓锝庡亞閸橆亝绻濋姀锝嗙【闁绘妫濆畷婵嬪箻椤旂晫鍘遍梺缁樻閺€閬嶅吹閸ヮ剚鐓涢悘鐐额嚙閳ь剚鐗滅紓鎾寸鐎ｎ亞顦梺鍛婄懃椤︽壆娆㈤鐔虹瘈缁剧増蓱椤﹪鏌涚€ｎ亜顏鐐诧工铻ｅ〒姘煎灠濞堛劑姊洪崜鎻掍簼婵炲弶锕㈠畷鎰版倻閼恒儳鍘卞銈庡幗閸ㄥ灚绂嶅┑瀣厽婵犲灚鍔掔花濠氭煃?Skill"
                        optionFilterProp="label"
                        showSearch
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Updated At</span>
                      <span className="agent-detail-prop-value">{formatTimestamp(selectedBinding.updatedAt)}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Source Type</span>
                      <span className="agent-detail-prop-value">{selectedBinding.sourceType}</span>
                    </div>
                  </div>

                  <div className="agent-prompt-card">
                    <div className="agent-prompt-header">
                      <span className="agent-prompt-header-title">System Prompt</span>
                      <Button
                        size="small"
                        onClick={() => setSystemPromptCollapsed((current) => !current)}
                        icon={systemPromptCollapsed ? <Eye size={12} /> : <ChevronLeft size={12} />}
                      >
                        {systemPromptCollapsed ? "闂傚倸鍊搁崐宄懊归崶顒夋晪鐟滃繘骞戦姀銈呯婵°倐鍋撶痪鎯ь煼閺岋綁骞囬锝嗏挅濠电偛妯婃禍婊堝礃閳ь剙顪冮妶鍡楀Ё缂傚秴妫楅…? : "闂傚倸鍊搁崐鎼佸磹閻戣姤鍤勯柛顐ｆ磸閳ь兛鐒︾换婵嬪炊瑜庡Σ顒勬⒑閸濆嫮鈻夐柛妯圭矙瀵煡顢旈崼鐔哄幗?}
                      </Button>
                    </div>
                    <div className="agent-prompt-body">
                      {systemPromptCollapsed ? (
                        <Text type="secondary">濠电姷鏁告慨鐢割敊閺嶎厼绐楁俊銈呭暞閺嗘粍淇婇妶鍛殶闁活厽鐟╅弻鐔兼倻濡晲绮堕梺閫炲苯澧剧紒鐘虫尭閻ｉ攱绺界粙璇俱劍銇勯弮鍥撴繛鍛Т閳规垿鎮╅崹顐ｆ瘎婵犳鍠氶弫濠氬箠濠靛绀堢憸蹇旂▔瀹ュ棎浜滈柡鍐ｅ亾闁搞劍绻勯幑銏ゅ幢濡晲绨婚梺鍝勭Р閸斿酣銆傞弻銉︾厵妞ゆ牗姘ㄦ晶銏㈢磼鏉堛劍灏い鎾炽偢瀹曘劑顢涘鍐ㄐ熼梻鍌欑閹碱偆鎮锕€绀夌€光偓閸曨偆鍙€婵犮垼娉涜癌闁绘梻鍘ч崹鍌涖亜閺囩偞鍣哥紒杈ㄦ濮婂宕掑▎鎴濆濠碉紕鍋涘鈥崇暦閹达箑绀嬫い鎾跺Х閻撳姊洪崷顓℃闁革綆鍣ｅ顐も偓锝庡枟閻撱儲绻濋棃娑欙紞婵″弶鎮傞弻锝夊箳閹寸姳绮甸梺闈涙搐鐎氫即鐛幒妤€绠ｆ繝鍨姃閹綁姊洪懡銈呮瀾闁荤喕浜划濠氬箻閼姐倕绁﹂梺鍝勭▉閸嬪嫰宕瑰┑瀣厱闊洦鎼╁Σ绋棵瑰鍫㈢暫闁诡喗顨婂畷鐑筋敇閻戝棌鍋撳畝鍕厱闁绘劕寮剁拹锛勭磼鏉堛劍宕岀€规洘甯掗～婵嬵敄閽樺澹曢梺褰掓？缁€浣哄閸︻厽鍠愰柣妤€鐗嗙粭姘舵煕鐎ｎ亶鍎旈柡宀嬬秮楠炲洭顢楅崒娆戦┏婵＄偑鍊栭崝妯绘叏閵堝桅闁告洦鍨扮粻娑㈡煃鏉炴壆顦﹀┑顔兼湰缁绘稓鈧稒顭囬惌濠勭磽瀹ュ拑韬€殿喖顭烽幃銏ゆ偂鎼达絿鏆伴柣鐔哥矊缁夌懓顕ｉ搹顐ｇ秶闁靛绲肩花濠氭⒑闂堟稓澧曢柟鍐茬箻瀹曠敻宕堕浣哄幍濡炪倖姊婚悺鏂库枔濠婂應鍋撶憴鍕闁稿繑锕㈤妴浣割潨閳ь剟骞冨▎鎾崇妞ゆ洍鍋撻柟姝屽亹缁辨捇宕掑顑藉亾瀹勬噴褰掑炊閳哄啰顦╂繛鏉戝悑濞兼瑧澹曢崸妤佺厾缁炬澘宕晶浼存煟椤撶喓鎳冩い顓℃硶閹瑰嫰宕崟鍨ｉ梻浣侯焾椤戝棝骞戦崶顒€鏋侀柟閭﹀幗閸庣喖鏌嶉妷銉э紞妞ゆ梹甯炵槐鎾诲磼濞嗘帒鍘℃繝娈垮枤閸忔﹢鐛繝鍥х閻犲洩灏欓崣鈧?Agent 闂?system_prompt闂?/Text>
                      ) : (
                        <Input.TextArea
                          className="prompt-textarea prompt-textarea-agent"
                          rows={18}
                          value={draft?.systemPrompt ?? ""}
                          onChange={(event) => setDraft((current) => current ? { ...current, systemPrompt: event.target.value } : current)}
                        />
                      )}
                    </div>
                  </div>
                </Space>
              </div>
            </div>
          </motion.div>
        ) : selectedAgentKey ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="agent-prompt-card">
              <div className="agent-prompt-header">
                <span className="agent-prompt-header-title">{selectedBaselineDetail?.displayName || selectedAgentKey}</span>
                <Button
                  type="primary"
                  size="small"
                  loading={saving}
                  onClick={() => void handleInstall(selectedAgentKey)}
                >
                  闂傚倸鍊搁崐宄懊归崶褏鏆﹂柣銏㈩焾缁愭鈧箍鍎卞ú銊╂儗閸℃ぜ鈧帒顫濋敐鍛婵°倗濮烽崑娑㈡晝椤忓牏宓佹俊顖氬悑閹儱霉閿濆懏鎲哥紒澶庢閳ь剝顫夊ú鏍偉婵傛悶鈧礁螖閸涱厾鍔﹀銈嗗笒閸婂鎯岄崱娑欑厱闁斥晛鍟伴埊鏇㈡煟閹惧鈽夋い顓℃硶閹瑰嫰宕崟闈涘Ψ缂備胶铏庨崢鍏兼櫠鎼达絾顫曢柟鐑樻尭缁剁偛鈹戦悙鑼虎濞寸媭鍣ｅ娲传閸曨剚鎷遍梺鐑╂櫓閸ㄥ爼鎮伴鍢夌喖鎼圭憴鍕啎闂備焦鎮堕崕鍗炍涙惔銊ュ瀭濞寸姴顑呴拑鐔兼煥濠靛棭妲搁崶鎾⒑閸涘﹣绶遍柛娆忓缁傛帡宕滆绾?                </Button>
              </div>
              <div className="agent-prompt-body is-spacious">
                {detailLoading ? (
                  <Text type="secondary">Agent 闂傚倸鍊搁崐宄懊归崶褏鏆﹂柛顭戝亝閸欏繘鏌℃径瀣鐟滅増甯掔粈瀣亜閺嶃劎鈻撻柟绋垮暣濮婃椽宕ㄦ繝鍐槱闂佹悶鍔嶆竟鍡樼珶閺囥垹閿ゆ俊銈呭暙瑜板嫰姊洪幖鐐插姌闁告柨閰ｉ崺銉﹀緞瀹€鈧壕濂告煃瑜滈崜姘嚗閸曨垰绠涙い鎾跺Т楠炴绻濈喊妯活潑闁搞劍濞婂畷銏ｎ樄鐎规洘绻勯埀顒婄秵閸撴稓澹曢悡骞熷綊鏁愰崼顐ｇ秷缂備浇鍩栭悡锟犲蓟?..</Text>
                ) : selectedBaselineDetail ? (
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <div className="agent-detail-grid">
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Agent Key</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.agentKey}</span>
                      </div>
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Runtime</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.runtime}</span>
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Provider</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.provider || "-"}</span>
                      </div>
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Model</span>
                        <span className="agent-detail-prop-value">{selectedBaselineDetail.model || "-"}</span>
                      </div>
                    </div>
                    <Input.TextArea
                      className="prompt-textarea prompt-textarea-agent"
                      rows={18}
                      readOnly
                      value={selectedBaselineDetail.systemPrompt ?? ""}
                    />
                  </Space>
                ) : (
                  <Empty description="闂傚倸鍊搁崐鎼佸磹閹间礁纾瑰瀣椤愪粙鏌ㄩ悢鍝勑㈢痪鎯ь煼閺屾盯寮撮妸銉р偓顒勬煕閵夘喖澧紒鐘劜閵囧嫰寮崒娑樻畬婵炲瓨绮庨崑鎾诲箞閵娿儙鐔虹矙閸喖顫撳┑鐘殿暜缁辨洟寮查銈嗩潟闁圭儤鏌￠崑鎾绘晲鎼存繃鍠氬┑鈽嗗灙閸嬫捇姊绘担铏广€婇柡鍌欑窔瀹曟垿骞橀幇浣瑰瘜闂侀潧鐗嗗Λ妤冪箔閸岀偞鐓犻柛鎰皺閸╋綁鏌涢埞鍨伈鐎殿噮鍣ｉ崺鈧い鎺戝妗呴梺鍛婃处閸犳岸鎮块埀顒勬⒑閸︻厼浜炬繛鍏肩懃閳诲秹濡舵径瀣偓鍨箾閸繄浠㈤柡瀣枛閺岀喖鎮烽悧鍫濇灎濡ょ姷鍋涢崯鎾蓟閵娧€鍋撻敐搴′簻妞ゅ孩鎹囧娲川婵犲嫧妲堥梺鎸庢磸閸婃洟鍩㈤幘鏈垫勃閻熸瑱绲鹃弬鈧梻浣虹帛閸旀洟鎮洪妸褏绀婇柟瀵稿仧缁犲墽鈧懓澹婇崰鏍ь嚕椤旂瓔娈?Agent 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偞鐗犻、鏇㈠Χ閸℃ぞ绮℃俊鐐€栭崝褏绮婚幋鐘差棜闁秆勵殕閻撴洟鏌熼柇锕€鐏遍柛銈咁儔閺屻倝寮堕幐搴′淮闂佸搫鏈粙鎴﹀煡婢舵劕纭€闁绘劕鍚€閻㈠姊虹拠鎻掝劉缁炬澘绉撮悾婵嬪箹娴ｆ瓕鎽曢梺闈浥堥弲娑氱尵瀹ュ鐓曢柕澶樺枤閸樻稒淇婇銏狀伃婵? />
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </Space>
    </>
  );
}
