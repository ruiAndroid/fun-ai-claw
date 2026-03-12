"use client";

import {
  getSkillBaseline,
  installInstanceSkill,
  listInstanceSkillBindings,
  listInstanceSkills,
  listSkillBaselines,
  uninstallInstanceSkill,
} from "@/lib/control-api";
import type {
  InstanceSkillBinding,
  SkillBaseline,
  SkillBaselineSummary,
  SkillDescriptor,
} from "@/types/contracts";
import { Alert, Button, Empty, Input, Space, Tag, Typography, message } from "antd";
import { motion } from "framer-motion";
import { Download, RefreshCw, Search, Trash2, Wrench, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text } = Typography;

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

export function InstanceSkillPanel({
  instanceId,
}: {
  instanceId: string;
}) {
  const [availableSkills, setAvailableSkills] = useState<SkillBaselineSummary[]>([]);
  const [bindings, setBindings] = useState<InstanceSkillBinding[]>([]);
  const [runtimeSkills, setRuntimeSkills] = useState<SkillDescriptor[]>([]);
  const [selectedSkillKey, setSelectedSkillKey] = useState<string>();
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<SkillBaseline>();
  const [skillSearch, setSkillSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [runtimeError, setRuntimeError] = useState<string>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadRuntimeSkills = useCallback(async () => {
    setRuntimeLoading(true);
    setRuntimeError(undefined);
    try {
      const response = await listInstanceSkills(instanceId);
      setRuntimeSkills(response.items);
    } catch (apiError) {
      setRuntimeSkills([]);
      setRuntimeError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setRuntimeLoading(false);
    }
  }, [instanceId]);

  const loadData = useCallback(async (showSuccess?: boolean) => {
    setLoading(true);
    setError(undefined);
    try {
      const [baselineResponse, bindingResponse] = await Promise.all([
        listSkillBaselines(),
        listInstanceSkillBindings(instanceId),
      ]);
      const allSkills = baselineResponse.items;
      const currentBindings = bindingResponse.items;
      const installedSkillKeySet = new Set(currentBindings.map((item) => item.skillKey));
      const installedSkills = allSkills.filter((item) => installedSkillKeySet.has(item.skillKey));

      setAvailableSkills(allSkills);
      setBindings(currentBindings);
      setSelectedSkillKey((current) => {
        if (current && allSkills.some((item) => item.skillKey === current)) {
          return current;
        }
        if (installedSkills.length > 0) {
          return installedSkills[0].skillKey;
        }
        return undefined;
      });
      if (showSuccess) {
        messageApi.success("闂傚倸鍊峰ù鍥敋瑜嶉湁闁绘垼妫勭粻鐘绘煙閹规劦鍤欑紒鐘靛枛濮婁粙宕堕鈧闂佸湱澧楀妯肩矆閸愨斂浜滈柡鍌氱仢閹垶淇婂顔煎闁宠鍨块幃娆撳级閹寸姳鎴烽梻浣规偠閸斿酣骞婇幘鍦罕婵犳鍠楅妵娑㈠磻閹剧粯鐓涢悘鐐殿焾婢ц尙鈧灚婢樼€氼參骞嗛弮鍫濐潊妞ゎ偒鍏橀崑鎾寸節閸ャ劉鎷洪梺鍛婄箓鐎氬嘲危閸忛棿绻嗘い鎰╁灩椤忣厼鈹?Skill");
      }
    } catch (apiError) {
      setAvailableSkills([]);
      setBindings([]);
      setSelectedSkillKey(undefined);
      setSelectedSkillDetail(undefined);
      setError(apiError instanceof Error ? apiError.message : String(apiError));
    } finally {
      setLoading(false);
    }
  }, [instanceId, messageApi]);

  const loadSelectedSkillDetail = useCallback(async (skillKey?: string) => {
    if (!skillKey) {
      setSelectedSkillDetail(undefined);
      return;
    }
    setDetailLoading(true);
    try {
      const response = await getSkillBaseline(skillKey);
      setSelectedSkillDetail(response);
    } catch {
      setSelectedSkillDetail(undefined);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadRuntimeSkills();
  }, [loadData, loadRuntimeSkills]);

  useEffect(() => {
    void loadSelectedSkillDetail(selectedSkillKey);
  }, [loadSelectedSkillDetail, selectedSkillKey]);

  const bindingMap = useMemo(() => new Map(bindings.map((item) => [item.skillKey, item])), [bindings]);
  const runtimeSkillMap = useMemo(() => new Map(runtimeSkills.map((item) => [item.id, item])), [runtimeSkills]);

  const installedSkills = useMemo(
    () => availableSkills.filter((item) => bindingMap.has(item.skillKey)),
    [availableSkills, bindingMap],
  );
  const candidateSkills = useMemo(
    () => availableSkills.filter((item) => !bindingMap.has(item.skillKey) && item.enabled),
    [availableSkills, bindingMap],
  );
  const filteredCandidateSkills = useMemo(() => {
    if (!skillSearch.trim()) return candidateSkills;
    const keyword = skillSearch.trim().toLowerCase();
    return candidateSkills.filter(
      (item) =>
        item.skillKey.toLowerCase().includes(keyword) ||
        (item.displayName || "").toLowerCase().includes(keyword),
    );
  }, [candidateSkills, skillSearch]);

  const selectedBinding = selectedSkillKey ? bindingMap.get(selectedSkillKey) : undefined;
  const selectedRuntimeSkill = selectedSkillKey ? runtimeSkillMap.get(selectedSkillKey) : undefined;

  const handleInstall = useCallback(async (skillKey?: string) => {
    const targetSkillKey = skillKey ?? selectedSkillKey;
    if (!targetSkillKey) {
      return;
    }
    setSelectedSkillKey(targetSkillKey);
    setSaving(true);
    setError(undefined);
    try {
      await installInstanceSkill(instanceId, targetSkillKey);
      setSelectedSkillKey(targetSkillKey);
      await Promise.all([
        loadData(),
        loadRuntimeSkills(),
        loadSelectedSkillDetail(targetSkillKey),
      ]);
      messageApi.success("Skill installed to this instance");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to install skill");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadData, loadRuntimeSkills, loadSelectedSkillDetail, messageApi, selectedSkillKey]);

  const handleUninstall = useCallback(async (skillKey?: string) => {
    const targetSkillKey = skillKey ?? selectedSkillKey;
    if (!targetSkillKey) {
      return;
    }
    setSelectedSkillKey(targetSkillKey);
    setSaving(true);
    setError(undefined);
    try {
      await uninstallInstanceSkill(instanceId, targetSkillKey);
      await Promise.all([
        loadData(),
        loadRuntimeSkills(),
      ]);
      messageApi.success("Skill removed from this instance");
    } catch (apiError) {
      const messageText = apiError instanceof Error ? apiError.message : String(apiError);
      setError(messageText);
      messageApi.error("Failed to uninstall skill");
    } finally {
      setSaving(false);
    }
  }, [instanceId, loadData, loadRuntimeSkills, messageApi, selectedSkillKey]);
    }
  }, [instanceId, loadData, loadRuntimeSkills, messageApi, selectedSkillKey]);

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-skill"><Wrench size={16} /></span>
            Skill
          </div>
          <Space size="small">
            <Tag color="green">闂傚倸鍊峰ù鍥敋瑜嶉～婵嬫晝閸岋妇绋忔繝銏ｅ煐閸旀牠宕戦妶澶嬬厸闁搞儮鏅涘皬闂佺粯甯掗敃銉╁Φ閸曨喚鐤€闁规崘娉涢幃瀣節閵忥絾纭炬い鎴濇川瀵囧焵椤掑嫭鈷戦柛娑橈工婵偓闂佸搫鎳忛惄顖炴晲?{installedSkills.length}</Tag>
            <Tag color="blue">闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偛顦甸弫鎾绘偐閸愯弓鐢绘俊鐐€栭悧婊堝磻濞戙垹鍨傞柛宀€鍋為埛鎴炪亜閹哄棗浜剧紓浣割槹閹告娊寮婚妸鈺佄ч柛娑变簼閺傗偓闂備胶绮敋鐎殿喖鐖奸獮鏍箛椤斿墽锛滈梺?{candidateSkills.length}</Tag>
            <Tag color="gold">闂傚倸鍊搁崐椋庣矆娓氣偓楠炴牠顢曚綅閸ヮ剦鏁冮柨鏇楀亾闁汇倗鍋撶换婵囩節閸屾粌顣虹紓浣插亾濠㈣泛顑嗛崣蹇斾繆閻愰鍤欏ù婊堢畺濮婃椽妫冨☉娆樻缂備浇鍩栧畝鎼佹偘椤旈敮鍋撻敐搴℃灍闁哄懏绻堥弻宥堫檨闁告挻鐩幃顕€骞嗚閸氬顭跨捄渚剰濞寸媭鍨跺娲川婵犲嫮鐣甸柣搴㈠嚬閸欏啴鐛崱娑橀唶闁靛濡囬崢閬嶆⒑闂堟稓澧曟俊顐ｎ殔闇夋い鏇楀亾闁哄矉绱曟禒锕傚礈瑜庨崚娑㈡倵濞堝灝娅橀柛锝忕到閻ｇ兘骞掗幊鑸靛笒閳诲酣骞嗚椤亞绱?{runtimeSkills.length}</Tag>
            <Button
              size="small"
              loading={loading || runtimeLoading}
              onClick={() => {
                void loadData(true);
                void loadRuntimeSkills();
              }}
              icon={<RefreshCw size={12} />}
            >
              闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偛顦甸弫宥夊礋椤掍焦顔囬梻浣芥硶閸犳挻鎱ㄧ€靛摜纾奸柍鍝勬噺閳锋垶銇勯幒鍡椾壕缂備礁顦伴幐鎶藉箯?
            </Button>
          </Space>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}
        {runtimeError ? (
          <Alert
            type="warning"
            showIcon
            message="Runtime skill status is temporarily unavailable"
            description={runtimeError}
          />
        ) : null}

        {installedSkills.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">Installed</span>
            </div>
            <div className="agent-prompt-body">
              <div className="skill-card-grid-v2">
                {installedSkills.map((item) => {
                  const selected = selectedSkillKey === item.skillKey;
                  const loaded = runtimeSkillMap.has(item.skillKey);
                  return (
                    <div key={item.skillKey} className="selector-card-shell">
                      <button
                        type="button"
                        className={`skill-card-v2 ${selected ? "is-selected" : ""}`}
                        onClick={() => setSelectedSkillKey(item.skillKey)}
                      >
                        <div className="skill-card-v2-icon is-allowed">
                          <Zap size={18} />
                        </div>
                        <strong className="skill-card-v2-title">{item.displayName || item.skillKey}</strong>
                        <p className="skill-card-v2-path">{item.skillKey}</p>
                        <Space size={4} wrap>
                          <Tag color="green">Installed</Tag>
                          {loaded ? <Tag color="gold">Loaded in runtime</Tag> : <Tag>Pending runtime sync</Tag>}
                          {!item.enabled ? <Tag color="red">Globally disabled</Tag> : null}
                        </Space>
                      </button>
                      <Button
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        className="selector-card-hover-action"
                        loading={saving && selectedSkillKey === item.skillKey}
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleUninstall(item.skillKey);
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
          !loading ? (
            <Empty description="闂傚倸鍊峰ù鍥х暦閻㈢绐楅柟閭﹀枛閸ㄦ繈骞栧ǎ顒€鐏繛鍛У娣囧﹪濡堕崨顔兼缂備胶濮抽崡鎶藉蓟濞戞ǚ妲堟慨妤€鐗婇弫鎯р攽閻愬弶鍣藉┑鐐╁亾闂佸搫鐭夌徊鍊熺亽缂佺偓濯芥ご绋啃掑畝鍕拺缂佸顑欓崕鎰版煙閻熺増鎼愰柣锝囧厴閹粎绮电€ｎ偅娅嶉梻浣虹帛閸旀牗绔熼崱娑欑參闁汇垻鏁哥壕浠嬫煕鐏炲墽鎳勭紒浣瑰缁辨捇宕煎鍐ㄧギ閻庤娲樺ú鐔肩嵁閹捐绠虫繝闈涚墕婵椽姊洪懡銈呅㈡繛灞傚€曢锝夘敆閸曨剙浜滈梺绋跨箳閸樠冣枔閵夆晜鈷戦梻鍫熺〒婢ф洘淇婇銏㈢劯妤犵偞鍔欏畷鐔碱敍濞戞帗瀚藉┑鐐舵彧缁蹭粙骞夐敓鐘茬畾闁割偁鍎查悡鐔镐繆閵堝倸浜惧┑鈽嗗亝缁诲棗螞閻斿吋鈷戠痪顓炴噺绾儳顭跨憴鍕噭鐎垫澘瀚埀顒婄秵閸撴盯鎯侀崼銉︹拺闁告稑锕ゆ慨鈧梺鍝勬噺閻╊垶鏁?Skill" />
          ) : null
        )}

        {candidateSkills.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">Available</span>
              <Input
                placeholder="闂傚倸鍊搁崐鎼佸磹閻戣姤鍤勯柛顐ｆ礀缁犵娀鏌熼幑鎰靛殭閻熸瑱绠撻幃妤呮晲鎼粹€愁潻闂佹悶鍔嶇换鍫ョ嵁閺嶎灔搴敆閳ь剚淇婇懖鈺冩／?Skill..."
                prefix={<Search size={14} style={{ opacity: 0.45 }} />}
                allowClear
                style={{ width: 240 }}
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />
            </div>
            <div className="agent-prompt-body">
              {filteredCandidateSkills.length > 0 ? (
                <div className="skill-card-grid-v2">
                  {filteredCandidateSkills.map((item) => {
                    const selected = selectedSkillKey === item.skillKey;
                    return (
                      <div key={item.skillKey} className="selector-card-shell">
                        <button
                          type="button"
                          className={`skill-card-v2 ${selected ? "is-selected" : ""}`}
                          onClick={() => setSelectedSkillKey(item.skillKey)}
                        >
                          <div className="skill-card-v2-icon">
                            <Download size={18} />
                          </div>
                          <strong className="skill-card-v2-title">{item.displayName || item.skillKey}</strong>
                          <p className="skill-card-v2-path">{item.skillKey}</p>
                          <Tag color="blue">Not installed</Tag>
                        </button>
                        <Button
                          size="small"
                          type="primary"
                          icon={<Download size={14} />}
                          className="selector-card-hover-action"
                          loading={saving && selectedSkillKey === item.skillKey}
                          disabled={saving}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleInstall(item.skillKey);
                          }}
                        >
                          闂傚倸鍊峰ù鍥х暦閻㈢绐楃€广儱娲ㄩ惌鍡椼€掑锝呬壕濡ょ姷鍋涢敃顏堢嵁濡吋鎯?
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty description={skillSearch ? "婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柟闂寸绾剧粯绻涢幋鐐垫噧缂佸墎鍋ら弻娑㈠Ψ椤旂厧顫╃紓浣插亾闁割偆鍠撶弧鈧梻鍌氱墛缁嬫帡鏁嶉弮鍫熺厾闁哄娉曟禒銏ゆ煏閸℃ê绗掓い顐ｇ箞閺佹劙宕ㄩ鈧ˉ姘舵⒑鐠囧弶鍞夋い顐㈩槸鐓ゆ繝濠傚閸欏繐螖閿濆懎鏆欏鍛存⒑閸︻厼顣兼繝銏☆焽缁骞庨懞銉у幍闁诲孩绋掗…鍥╃不濮樿京纾煎ù锝堫潐鐏忥附鎱?Skill" : "婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柟闂寸绾剧粯绻涢幋鐐垫噧缂佸墎鍋ら弻娑㈠Ψ椤旂厧顫╃紓浣插亾闁割偆鍠撶弧鈧梻鍌氱墛缁嬫帡鏁嶉弮鍫熺厾闁哄娉曟禒銏ゆ煏閸℃ê绗掓い顐ｇ箞閺佹劙宕ㄩ鈧ˉ姘舵⒑鐠囧弶鍞夋い顐㈩槸鐓ら柍鍝勫暟缁€濠傘€掑锝呬壕闂侀潧妫旂粈渚€鍩ユ径濞㈢喖鏌ㄧ€ｅ灚缍屽┑鐘殿暯濡插懘宕归棃娑氭殾闁汇垻鏁搁惌鎾舵喐閻楀牆绗氶柍閿嬪笒闇夐柨婵嗘噺閸熺偤鏌涢悢鍝勪沪闁逛究鍔嶇换婵嬪礋椤撶偟顐奸梻渚€鈧稓鈹掗柛鏂跨焸閹箖鏁撻悩鑼吋闂佹儳娴氶崑鍡樼?Skill"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        ) : null}

        {selectedSkillDetail ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="agent-prompt-card">
              <div className="agent-prompt-header">
                <span className="agent-prompt-header-title">
                  {selectedSkillDetail.displayName || selectedSkillDetail.skillKey}
                </span>
                <Space size="small" wrap>
                  {selectedBinding ? (
                    <Button danger size="small" loading={saving} onClick={() => void handleUninstall()}>
                      闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偛顦甸弫鎾绘偐椤旂懓浜鹃柛鎰靛枛楠炪垺绻涢幋鐐垫噧濞寸娀浜跺娲传閸曨剙绐涙繛?
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      loading={saving}
                      disabled={!selectedSkillDetail.enabled}
                      onClick={() => void handleInstall(selectedSkillDetail.skillKey)}
                    >
                      闂傚倸鍊搁崐宄懊归崶褏鏆﹂柣銏㈩焾缁愭鈧箍鍎卞ú銊╂儗閸℃ぜ鈧帒顫濋敐鍛婵°倗濮烽崑娑㈡晝椤忓牏宓佹俊顖氬悑閹儱霉閿濆懏鎲哥紒澶庢閳ь剝顫夊ú鏍偉婵傛悶鈧礁螖閸涱厾鍔﹀銈嗗笒閸婂鎯岄崱娑欑厱闁斥晛鍟伴埊鏇㈡煟閹惧鈽夋い顓℃硶閹瑰嫰宕崟闈涘Ψ缂備胶铏庨崢鍏兼櫠鎼达絾顫曢柟鐑樻尭缁剁偛鈹戦悙鑼虎濞寸媭鍣ｅ娲传閸曨剚鎷遍梺鐑╂櫓閸ㄥ爼鎮伴鍢夌喖鎼圭憴鍕啎闂備焦鎮堕崕鍗炍涙惔銊ュ瀭濞寸姴顑呴拑鐔兼煥濠靛棭妲搁崶鎾⒑閸涘﹣绶遍柛娆忓缁傛帡宕滆绾?                    </Button>
                  )}
                </Space>
              </div>

              <div className="agent-prompt-body is-spacious">
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <div className="agent-detail-grid">
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Skill Key</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.skillKey}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Status</span>
                      <span className="agent-detail-prop-value">{selectedBinding ? "Installed" : "Not installed"}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Runtime Loaded</span>
                      <span className="agent-detail-prop-value">{selectedRuntimeSkill ? "Loaded" : "Pending until next runtime sync"}</span>
                    </div>
                    <div className="agent-detail-prop">
                      <span className="agent-detail-prop-label">Enabled</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.enabled ? "true" : "false"}</span>
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Description</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.description || "-"}</span>
                    </div>
                    <div className="agent-detail-prop is-wide">
                      <span className="agent-detail-prop-label">Source Ref</span>
                      <span className="agent-detail-prop-value">{selectedSkillDetail.sourceRef || "-"}</span>
                    </div>
                    {selectedBinding ? (
                      <div className="agent-detail-prop">
                        <span className="agent-detail-prop-label">Installed At</span>
                        <span className="agent-detail-prop-value">{formatTimestamp(selectedBinding.updatedAt)}</span>
                      </div>
                    ) : null}
                    {selectedRuntimeSkill ? (
                      <div className="agent-detail-prop is-wide">
                        <span className="agent-detail-prop-label">Runtime Path</span>
                        <span className="agent-detail-prop-value">{selectedRuntimeSkill.path}</span>
                      </div>
                    ) : null}
                  </div>

                  {detailLoading ? (
                    <Text type="secondary">Skill 闂傚倸鍊搁崐宄懊归崶褏鏆﹂柛顭戝亝閸欏繘鏌℃径瀣鐟滅増甯掔粈瀣亜閺嶃劎鈻撻柟绋垮暣濮婃椽宕ㄦ繝鍐槱闂佹悶鍔嶆竟鍡樼珶閺囥垹閿ゆ俊銈呭暙瑜板嫰姊洪幖鐐插姌闁告柨閰ｉ崺銉﹀緞瀹€鈧壕濂告煃瑜滈崜姘嚗閸曨垰绠涙い鎾跺Т楠炴绻濈喊妯活潑闁搞劍濞婂畷銏ｎ樄鐎规洘绻勯埀顒婄秵閸撴稓澹曢悡骞熷綊鏁愰崼顐ｇ秷缂備浇鍩栭悡锟犲蓟?..</Text>
                  ) : (
                    <Input.TextArea
                      className="prompt-textarea prompt-textarea-skill"
                      rows={20}
                      readOnly
                      value={selectedSkillDetail.skillMd}
                    />
                  )}
                </Space>
              </div>
            </div>
          </motion.div>
        ) : (
          !loading ? <Empty description="闂傚倸鍊搁崐鎼佸磹閹间礁纾瑰瀣椤愪粙鏌ㄩ悢鍝勑㈢痪鎯ь煼閺屾盯寮撮妸銉р偓顒勬煕閵夘喖澧紒鐘劜閵囧嫰寮崒娑樻畬婵炲瓨绮庨崑鎾诲箞閵娿儙鐔虹矙閸喖顫撳┑鐘殿暜缁辨洟寮查銈嗩潟闁圭儤鏌￠崑鎾绘晲鎼存繃鍠氬┑鈽嗗灙閸嬫捇姊绘担铏广€婇柡鍌欑窔瀹曟垿骞橀幇浣瑰瘜闂侀潧鐗嗗Λ妤冪箔閸岀偞鐓犻柛鎰皺閸╋綁鏌?Skill 闂傚倸鍊搁崐鎼佸磹妞嬪海鐭嗗〒姘ｅ亾妤犵偞鐗犻、鏇㈠Χ閸℃ぞ绮℃俊鐐€栭崝褏绮婚幋鐘差棜闁秆勵殕閻撴洟鏌熼柇锕€鐏遍柛銈咁儔閺屻倝寮堕幐搴′淮闂佸搫鏈粙鎴﹀煡婢舵劕纭€闁绘劕鍚€閻㈠姊虹拠鎻掝劉缁炬澘绉撮悾婵嬪箹娴ｆ瓕鎽曢梺闈浥堥弲娑氱尵瀹ュ鐓曢柕澶樺枤閸樻稒淇婇銏狀伃婵? /> : null
        )}
      </Space>
    </>
  );
}
