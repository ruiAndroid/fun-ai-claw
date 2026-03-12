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
        messageApi.success("闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳婀遍埀顒傛嚀鐎氼參宕崇壕瀣ㄤ汗闁圭儤鍨归崐鐐差渻閵堝棗绗掓い锔垮嵆瀵煡顢旈崼鐔蜂画濠电姴锕ら崯鐗堟櫏婵犵數濮崑鎾炽€掑锝呬壕濠殿喖锕ㄥ▍锝囨閹烘嚦鐔兼惞闁稓绀冨┑鐘殿暯濡插懘宕戦崟顓涘亾濮樼厧鏋ら柛鎺撳笚缁绘繂顫濋鐐版睏缂傚倸鍊烽悞锕傗€﹂崶顒€鍌ㄩ柣銏犳啞閳锋垹鐥鐐村婵炲吋鍔欓弻娑㈠籍閹惧墎鏆ら悗瑙勬礋濞佳囧煝鎼淬劌绠ｉ柣妯碱暜缁辨煡姊绘担铏瑰笡闁挎洏鍨归…鍥樄鐎殿喚顭堥埥澶娾枎閹邦剙浼庡┑鐘垫暩婵娊鎳楅崼鏇熷剹婵炲棙鍨熼崑鎾舵喆閸曨剛顦ラ梺缁樼墪閵堟悂濡存担鑲濇棃宕ㄩ鐘插Е婵＄偑鍊栫敮濠勬閿熺姴缁╁ù鐓庣摠閳锋帡鏌涚仦鍓ф噮妞わ讣闄勭换婵嬪焵椤掍焦缍囬柕濠忛檮閻濆嘲鈹戞幊閸婃劙宕戦幘娣簻妞ゆ挾鍋熸禒銏ゆ懚閿濆鐓犳繛鏉戭儐濞呭洭鏌ｉ幒鎴欏仮婵﹥妞藉畷銊︾節閸屾凹娼婇梻浣告惈閸婃悂宕愰崷顓犵焿鐎广儱鎷嬮悡銉╂煕椤愩倕鏋旈柛妯绘倐濮婅櫣绮欓幐搴㈡嫳濠殿喗菧閸斿秶绮嬮幒妤€顫呴柕鍫濇閸橀潧顪冮妶鍡橆梿婵☆偄瀚伴幃姗€鏁冮埀顒冨絹闂佹悶鍎滃鍛矗婵＄偑鍊栭弻銊ф崲濮椻偓閵嗕礁鈻庨幘鏉戜簵闁瑰吋鎯岄崰妤佺閵堝鈷掗柛灞剧懅椤︼箓鏌ｉ妶鍛枠闁挎繄鍋炲鍕箛椤掆偓閻庮參姊虹粔鍡楀濞堟梻绱掗悩宕囧缂佺粯鐩畷鍗炍熺拠鑼暡缂傚倷鑳剁€氬繘宕堕妸褍骞嶉梺璇叉捣閺佹悂鈥﹂崼婵堟瘓闂傚倷鑳堕幊鎾活敋椤撱垹绀傛俊顖欒濞兼牜绱撴担鑲℃垶鍒婇幘顔藉仭婵炲棗绻愰鈺伱归悩顐ｆ珚婵﹥妞藉畷銊︾節閸愵亜寮抽梻鍌欑鎼存粎绱炴笟鈧幃浼搭敊閻ｅ瞼鐦堥梺鎼炲劀閸滀礁鏅梻鍌欑窔濞艰崵鈧潧鐭傚畷銏ゆ惞閸︻厾锛為梺鍝勬川閸嬫劙寮ㄦ禒瀣厽婵☆垵顕ф晶顖炴煕閻旈绠婚柡灞剧洴閹晠骞囨担鍦澒濠电姷顣换婵嗩焽瑜旈崺銉﹀緞閹邦剦娼婇梺缁橆焽椤ｎ喚妲愰柆宥嗏拻濞达絿鍎ら崵鈧繝鈷€鍛珪闁告帗甯￠、娑㈡倷閺夋垳绨垫繝鐢靛仦閸垶宕瑰ú顏勭９闁割偅娲橀悡鐔兼煙闁箑寮鹃柛鐔风箻閺岋綁骞掗幘鍐插Б濡炪値鍙€閸庡藝閸洘鍊堕煫鍥ㄦ⒒閹冲洭鏌涢埞鎯т壕婵＄偑鍊栧濠氬磻閹剧粯鐓熼煫鍥ㄦ婢规ɑ銇勯鐐典虎閾伙綁鎮樿箛鏃傚ⅹ濞存粎鍋撻幈銊ノ熼悡搴′粯閻庢鍣崰妤呫€冮妷鈺傚€烽柛娆忣樈濡箓鎮楀▓鍨珮闁革綇绲介悾鐑芥偂鎼存ɑ鏂€闂佸綊鍋婇崢鍓х矓閸楃偐鏀介柨娑樺娴滃ジ鏌涙繛鍨偓婵嗙暦閹达箑绠虫俊銈傚亾缂佲偓閸屾稒鍙忔俊鐐额嚙娴滈箖鎮楃憴鍕闁搞劌娼￠悰顔嘉熺亸鏍т壕闂傚牊绋掗幉鎼佹煟閿曗偓閻楁挸顫忓ú顏勭闁绘劖褰冩慨宀勬⒑閸涘﹥鐓ユい锔炬暬閻涱喛绠涢幘浣规そ椤㈡棃宕ㄩ鍛伖闂傚倷绀侀幉锛勭矙閹达附鏅濋柨鏂垮⒔娑撳秹鏌熼崜褏甯涢柛濠傜仛閹便劌顫滈崱妤€顫╁┑鈩冨絻椤嘲鐣烽敓鐘崇劶鐎广儱妫涢崢閬嶆椤愩垺澶勭紒瀣浮閺佸秹鎮㈤搹鍦紲闁荤姴娲ゅ鍫曀夐悙鐑樼厪闁搞儜鍐句純濡ょ姷鍋涘ú顓㈠春閳╁啯濯撮弶鐐靛閸嬪懎鈹戦敍鍕杭闁稿﹥娲栭湁婵娉涢崒銊モ攽閸屾粠鐒鹃柣?Agent");
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

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div className="tab-section-header">
          <div className="tab-section-title">
            <span className="tab-section-icon is-agent"><Bot size={16} /></span>
            闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤濠€閬嶅焵椤掑倹鍤€閻庢凹鍙冨畷宕囧鐎ｃ劋姹楅梺鍦劋閸ㄥ綊宕愰悙宸富闁靛牆妫楃粭鎺撱亜閿斿灝宓嗙€殿喗鐓￠、鏃堝醇閻旇渹鐢绘繝鐢靛Т閿曘倝宕幘顔肩煑闁告洦鍨遍悡蹇涙煕閳╁喚娈旈柡鍡到閳规垿鏁嶉崟顒傚姽濡炪倧闄勯幐鎶藉蓟閿濆鏁囬柣鏃傚劋閸ｄ即姊洪崫鍕拱闁烩晩鍨伴锝嗙節濮樺吋鏅ｅ┑鐘诧工閸熺娀宕戦幘璇茬疀闁哄娉曢敍娑㈡⒑鐟欏嫬绀冩い鏇嗗洦鐓ラ柕鍫濇缁诲棝鏌曢崼婵嗩伂妞ゆ柨顦甸弻鐔风暋閻楀牊鍎撳銈庝簻閸熷瓨淇婇崼鏇炲耿婵°倐鍋撴繛鍏煎灴濮婅櫣绮欏▎鎯у壉闂佸湱顭堟晶钘壩ｉ幇鏉跨闁规儳纾粣鐐寸節閻㈤潧孝濡ょ姷顭堥埢鎾绘嚋閻㈢數鐦堥梺闈涢獜缂嶅棗顭囬幇顓犵闁告瑥顦遍惌灞句繆閸欏濮嶆鐐村浮楠炲﹤鐣烽崶褎鐏堥悗瑙勬礈閸忔﹢銆佸鈧幃鈺呭垂椤愶絿妲ユ繝鐢靛Х椤ｎ喚妲愰弴銏犵；闁硅揪绠戠壕褰掓煛瀹ュ骸骞楅柛瀣儐娣囧﹪濡堕崨顔兼闂佹悶鍊曢懟顖濈亙闂佹寧绻傞幊搴ㄥ汲濞嗘垹纾奸柣妯虹－婢х敻鏌″畝鈧崰鎾诲焵椤掑倹鏆╂い顓炵墛缁傚秹鎮￠獮?Agent 闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤缂嶅﹪寮婚悢鍏尖拻閻庨潧澹婂Σ顔剧磼閻愵剙鍔ょ紓宥咃躬瀵鎮㈤崗灏栨嫽闁诲酣娼ф竟濠偽ｉ鍓х＜闁绘劦鍓欓崝銈囩磽瀹ュ拑韬€殿喖顭烽弫鎰緞婵犲嫷鍚呴梻浣瑰缁诲倿骞夊☉銏犵缂備焦顭囬崢杈ㄧ節閻㈤潧孝闁稿﹤缍婂畷鎴﹀Ψ閳哄倻鍘搁柣蹇曞仩椤曆勬叏閸屾壕鍋撳▓鍨灍婵炲吋鐟ㄩ悘鍐⒑闁偛鑻晶顖滅磼閸屾氨效妤犵偛妫滈¨浣圭箾閹炬剚鐓奸柡灞炬礋瀹曠厧鈹戠€ｇ鍋撳Δ渚囨闁绘劕顕晶鐢告煛瀹€瀣К缂佺姵鐩顕€宕掑鍛瘞闂傚倷娴囬褏鎹㈤幋鐘虫殰闁炽儲鍓氬鏍ㄧ箾瀹割喕绨荤紒鈧崒鐐寸厾婵炴潙顑嗛弶娲煕鐎ｎ剙浠辨慨濠冩そ瀹曨偊宕熼鈧▍銈囩磽娴ｇ瓔鍤欓柣妤佹崌閻涱噣宕橀鑺ユ珫闂佸憡娲忛崝灞剧妤ｅ啯鐓ユ繝闈涙椤庢鏌＄€ｎ剙鏋涢柡灞界Ч閺屻劎鈧綆浜炴导宀勬⒑閸濆嫭婀伴柣鈺婂灦閻涱喖顫滈埀顒€顕ｉ崼鏇炵闁绘鍋ｉ崑鈩冪節閻㈤潧浠滈柣掳鍔庨崚鎺戭吋閸ャ劌搴婇梺鍛婂姦娴滄繂鐣烽崣澶岀闁瑰瓨鐟ラ悘鈺呮煟椤撶噥娈旀い顓炴健閹虫粓鎮藉▓璺ㄤ紘闂備線鈧偛鑻晶鍙夌箾婢跺绀嬮柛鈹惧亾?
          </div>
          <Space size="small">
            <Tag color="green">闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳婀遍埀顒傛嚀鐎氼參宕崇壕瀣ㄤ汗闁圭儤鍨归崐鐐差渻閵堝棗绗掓い锔垮嵆瀵煡顢旈崼鐔蜂画濠电姴锕ら崯鐗堟櫏闂備焦瀵х换鍕磻濞戙垹鐓橀柟瀵稿Л閸嬫捇鏁愭惔鈥茬凹濠电偛鎳庡ú顓烆潖閾忓湱鐭欓悹鎭掑妿閸旇绻濈喊妯峰亾閾忣偄绐涚紓渚囧枟閻熴劎绮诲☉銏犵睄闁稿本绮庡Σ鍥⒒娓氣偓濞佳勵殽韫囨洖绶ゅù鐘差儐閸嬪倿鏌熼幍顔碱暭闁绘挻娲熼弻锟犲礃閿濆懍澹曢梻浣虹帛椤ㄥ牊鎱ㄩ幘顔藉仼闁绘垼妫勭粻锝夋煥閺囨浜鹃柛銉ョ摠缁绘繈濮€閿濆棛銆愬銈嗗灥濞差厼鐣烽姀銈呯濞达絽鍘滈幏娲⒑绾懎浜归柛瀣洴瀹曟繂螖閸涱喚鍘搁梺鍛婁緱閸犳岸鍩ユ径鎰厽妞ゎ厽鍨垫晶瀛樻叏婵犲嫮甯涢柟宄版嚇閹煎綊鎮烽幍顕呭仹闂備焦鐪归崺鍕垂鏉堚晜鏆滈柨鐔哄Т閺嬩線鏌涢幇闈涙灈閸烆垶姊虹€圭姵銆冪紒鎻掋偢閺佸啴宕掑☉姘箞闂備礁鎼ú銏ゅ礉瀹€鍕嚑闁靛牆顦伴悡鐔兼煏閸繂鈧憡绂嶆ィ鍐┾拻闁稿本鐟︾粊鐗堛亜椤愩埄妲搁柣锝呭槻铻ｉ悶娑掑墲閻忓啫鈹戦悙鏉戠仧闁搞劌婀辩划濠氬冀椤撶喎鈧敻鏌ㄥ┑鍡涱€楀ù婊呭仧缁辨帡鍩﹂埀顒勫磻閹剧粯鈷掑〒姘ｅ亾婵炰匠鍕垫闊洦娲栫欢銈夋煕閹炬瀚崢褰掓⒑缂佹ê濮﹂柛蹇旂懄缁傚秴顭ㄩ崼鐔哄幍闁诲孩绋掗…鍥╃不閺嶎偀鍋撻悷鐗堝暈缂佽瀚伴崺鈧い鎺嶇贰閸熷繘鏌涢悤浣镐喊鐎规洘鍎奸ˇ鎾煕閺冩挾鐣辨い顏勫暣婵″爼宕卞Δ鍐噯闂佽瀛╅崙褰掑矗閸愵喖鏄ユ繛鎴欏灩缁狅綁鏌ㄩ弮鍌涙珪闁告ê宕埞鎴︽倷閺夋垹浠搁梺鎸庢处閸嬪嫰顢欒箛娑樜ㄩ柕澶堝灪閺傗偓婵＄偑鍊栧濠氬箠閹惧顩插Δ锝呭暞閳锋帡鏌涚仦鍓ф噮妞わ讣绠撻弻鐔哄枈閸楃偘鍠婂Δ鐘靛仜閿曘劎绮诲☉妯锋婵炲棗绻愭竟鍡樹繆閻愵亜鈧牠鎮у鍫濈；闁绘劕鎼悿?{installedAgents.length}</Tag>
            <Tag color="blue">闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤缂嶅﹪寮婚悢鍏尖拻閻庨潧澹婂Σ顔剧磼閹冣挃闁硅櫕鎹囬垾鏃堝礃椤忎礁浜鹃柨婵嗙凹缁ㄥジ鏌熼惂鍝ョМ闁哄矉缍侀、姗€鎮欓幖顓燁棧闂備線娼уΛ娆戞暜閹烘缍栨繝闈涱儐閺呮煡鏌涘☉鍗炲妞ゃ儲鑹鹃埞鎴炲箠闁稿﹥顨嗛幈銊╂倻閽樺锛涘┑鐐村灍閹崇偤宕堕浣镐缓缂備礁顑嗙€笛囨倵椤掑嫭鈷戦柣鐔告緲閳锋梻绱掗鍛仸鐎规洘鍨块獮鍥偋閸垹骞堥梻浣哥秺閸嬪﹪宕归幍顔筋潟闁挎洖鍊归悡鐔兼煏韫囧鐏悽顖涚☉鑿愰柛銉戝秷鍚梺璇″枟閻熲晠銆侀弮鍫濈闁靛鍎版竟鏇㈡⒑閸濆嫮鈻夐柛妯圭矙瀹曟垹鈧綆鍋嗙弧鈧繝鐢靛Т閸婄粯鏅堕弴鐘垫／闁告挆鍛缂備胶绮惄顖炵嵁鐎ｎ亖鏋庨煫鍥ㄦ磻閹綁姊绘担瑙勫仩闁告柨鐭傚畷鎰板锤濡も偓閽冪喐绻涢幋鐑嗙劷闁哄棗妫濋弻宥堫檨闁告挾鍠庨悾鐑藉箣閿旇棄鈧兘鏌涘┑鍡楊伀闁告﹢浜跺娲偡闁箑娈堕梺绋款儐閸ㄥ墎绮嬪鍜佺叆闁割偆鍠撻崢鐢告⒑閸涘﹦绠撻悗姘煎弮钘熸繝濠傚幘閻熼偊鐓ラ柛鎰╁妷閹稿啰绱撴担浠嬪摵闁圭顭烽獮蹇涘川閺夋垹顦梺鍛婄懃閿涘秷顦规慨濠冩そ閹兘鎮ч崼婵囨畼濠电姷鏁搁崑娑㈡晝閵堝鏁嬮柨婵嗘缁♀偓濠殿喗锕╅崕鐢稿煛閸涱喚鍘撻柡澶屽仦婢瑰棛鈧絻鍋愰幉鎼佸籍閸繆鎽曞┑鐐村灦鑿ゆ俊鎻掔墦閺屾稑鈻庨幇鐢靛姺闂佸憡鍨电紞濠傤潖濞差亜浼犻柛鏇ㄥ亐閸嬫捇鎮界粙璺紱闂佺懓澧界划顖炲煕閹烘鐓曢悘鐐插⒔閹冲棝鏌涜箛鎾剁伇缂佽鲸甯￠、姘跺川椤撶姳妗撻梻浣芥〃缁€渚€顢栨径鎰畺婵°倐鍋撻柍缁樻崌瀹曞綊顢欓悾灞奸偗闂傚倷鑳剁划顖炴偋閺囥垹围闁归棿鐒﹂崑妯汇亜閺囨浜鹃悗娈垮枙缁瑩銆佸鈧幃娆撴偨閸偅绶繝纰夌磿閸嬫垿宕愰弽顓炶摕闁靛闄勫▍鐘裁归悩宸剱闁哄拋鍓氱换婵囩節閸屾粌顤€闂?{candidateAgents.length}</Tag>
            <Tag color="gold">闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳婀遍埀顒傛嚀鐎氼參宕崇壕瀣ㄤ汗闁圭儤鍨归崐鐐差渻閵堝棗绗掓い锔垮嵆瀵煡顢旈崼鐔蜂画濠电姴锕ら崯鐗堟櫏闂備焦瀵х换鍕磻濞戙垹鐓橀柟瀵稿Л閸嬫捇鏁愭惔鈥茬凹濠电偛鎳庡ú顓烆潖閾忓湱鐭欓悹鎭掑妿閸旇绻濈喊妯峰亾閾忣偄绐涚紓渚囧枟閻熴劎绮诲☉銏犵睄闁稿本绮庡Σ鍥⒒娓氣偓濞佳勵殽韫囨洖绶ゅù鐘差儐閸嬪倿鏌熼幍顔碱暭闁绘挻娲熼弻锟犲礃閿濆懍澹曢梻浣虹帛椤ㄥ牊鎱ㄩ幘顔藉仼闁绘垼妫勭粻锝夋煥閺囨浜鹃柛銉ョ摠缁绘繈濮€閿濆棛銆愬銈嗗灥濞差厼鐣烽姀銈呯濞达絽鍘滈幏娲⒑绾懎浜归柛瀣洴瀹曟繂螖閸涱喚鍘搁梺鍛婁緱閸犳岸鍩ユ径鎰厽妞ゎ厽鍨垫晶瀛樻叏婵犲嫮甯涢柟宄版嚇閹煎綊鎮烽幍顕呭仹闂備焦鐪归崺鍕垂鏉堚晜鏆滈柨鐔哄Т閺嬩線鏌涢幇闈涙灈閸烆垶姊虹€圭姵銆冪紒鎻掋偢閺佸啴宕掑☉姘箞闂備礁鎼ú銏ゅ礉瀹€鍕嚑闁靛牆顦伴悡鐔兼煏閸繂鈧憡绂嶆ィ鍐┾拻闁稿本鐟︾粊鐗堛亜椤愩埄妲搁柣锝呭槻铻ｉ悶娑掑墲閻忓啫鈹戦悙鏉戠仧闁搞劌婀辩划濠氬冀椤撶喎鈧敻鏌ㄥ┑鍡涱€楀ù婊呭仧缁辨帡鍩﹂埀顒勫磻閹剧粯鈷掑〒姘ｅ亾婵炰匠鍕垫闊洦娲栫欢銈夋煕閹炬瀚崢褰掓⒑缂佹ê濮﹂柛蹇旂懄缁傚秴顭ㄩ崼鐔哄幍闁诲孩绋掗…鍥╃不閺嶎偀鍋撻悷鐗堝暈缂佽瀚伴崺鈧い鎺嶇贰閸熷繘鏌涢悤浣镐喊鐎规洘鍎奸ˇ鎾煕閺冩挾鐣辨い顏勫暣婵″爼宕卞Δ鍐噯闂佽瀛╅崙褰掑矗閸愵喖鏄ユ繛鎴欏灩缁狅綁鏌ㄩ弮鍌涙珪闁告ê宕埞鎴︽倷閺夋垹浠搁梺鎸庢处閸嬪嫰顢欒箛娑樜ㄩ柕澶堝灪閺傗偓婵＄偑鍊栧濠氬箠閹惧顩插Δ锝呭暞閳锋帡鏌涚仦鍓ф噮妞わ讣绠撻弻鐔哄枈閸楃偘鍠婂Δ鐘靛仜閿曘劎绮诲☉妯锋婵炲棗绻愭竟鍡樹繆閻愵亜鈧牠鎮у鍫濈；闁绘劕鎼悿?Skill {skillBindings.length}</Tag>
            <Button
              size="small"
              loading={loading}
              onClick={() => {
                void loadAll(true);
              }}
              icon={<RefreshCw size={12} />}
            >
              闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤缂嶅﹪寮婚悢鍏尖拻閻庨潧澹婂Σ顔剧磼閹冣挃闁硅櫕鎹囬垾鏃堝礃椤忎礁浜鹃柨婵嗙凹缁ㄥジ鏌熼惂鍝ョМ闁哄矉缍侀、姗€鎮欓幖顓燁棧闂備線娼уΛ娆戞暜閹烘缍栨繝闈涱儐閺呮煡鏌涘☉鍗炲妞ゃ儲鑹鹃埞鎴炲箠闁稿﹥顨嗛幈銊╂倻閽樺锛涘┑鐐村灍閹崇偤宕堕浣镐缓缂備礁顑嗙€笛囨倵椤掑嫭鍊垫鐐茬仢閸旀碍銇勯敂璇茬仯缂侇喖鐗忛埀顒婄秵閸嬩焦绂嶅鍫熺厵闁告繂瀚倴闂佸憡鏌ㄧ粔鐢稿Φ閸曨垰妫橀柟绋块閺嬬姴鈹戦纭峰姛缂侇噮鍨堕獮蹇涘川鐎涙ê娈熼梺闈涳紡娴ｆ彃浜惧┑鐘叉处閳锋垿鏌涘┑鍕姎閺嶏繝姊洪崷顓х劸妞ゎ厾鍏橀悰顕€宕奸妷銉庘晝鎲告径鎰；闁瑰墽绮ˉ鍫熺箾閹寸偟鎳勯柛鐘冲姉缁辨帡鎮欓鈧崝銈夋煏閸喐鍊愮€殿喛顕ч鍏煎緞婵犱胶鐐婇梻浣告啞濞诧箓宕滃▎蹇婃瀺闁靛牆顦伴埛鎴︽煙閹澘袚闁轰線浜堕弻娑㈠Ω閵壯冪厽婵犵绱曢弫璇茬暦閻旂⒈鏁嶆慨姗€纭搁崬娲⒒娴ｈ櫣銆婇柛鎾寸箞婵＄敻鎮欑€靛摜褰鹃梺鍝勬川婵澹曟禒瀣厱閻忕偛澧介幊鍛亜閿斿ジ妾柕鍥у閺佸倿宕归鑲┿偖婵°倗濮烽崑鐐哄礉濞嗘挾宓侀幖娣妽鐎电姴顭跨捄铏圭劸闁?
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
                        Uninstall
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          !loading ? <Empty description="闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳婀遍埀顒傛嚀鐎氼參宕崇壕瀣ㄤ汗闁圭儤鍨归崐鐐烘偡濠婂啰绠荤€殿喗濞婇弫鍐磼濞戞艾骞楅梻渚€娼х换鍫ュ春閸曨垱鍊块柛鎾楀懐锛滈梺褰掑亰閸欏骸鈻撳鍫熺厸鐎光偓閳ь剟宕伴弽顓炶摕闁搞儺鍓氶弲婵嬫煃瑜滈崜鐔奉嚕缁嬪簱妲堥柕蹇ョ磿閸橀亶姊洪棃娑辩叚濠碘€虫川缁鎮欓幖顓燁啍闂佺粯鍔曢顓熸櫠椤忓牊鍤曢柟閭﹀幑娴滄粓鏌熼崫鍕棞濞存粓绠栧铏规嫚閸欏顩版繛瀛樼矋缁诲嫰骞戦姀鐘闁靛繒濮寸粣娑橆渻閵堝棛澧い鏇熸尦閺佹劙宕ラ崘鏌ュ弰鐎规洘鍎奸¨鍌炴椤掑澧柍瑙勫灴閸ㄦ儳鐣烽崶褏鍘介柣搴ゎ潐濞插繘宕濋幋锔衡偓浣糕枎閹惧磭顦х紒鐐緲瑜板宕Δ鍐＝闁稿本鑹鹃埀顒佹倐瀹曟劙鎮滈懞銉ユ畱闂佽偐顭堥悘姘跺矗韫囨稒鐓欓柟顖滃椤ュ鐥娑樹壕闂傚倷娴囬～澶愬磿閻撳宫娑㈠礋椤栨稑鐝旈梺缁樻煥閹芥粎绮绘ィ鍐╃厵閻庣數顭堥埀顒佸灥椤繈顢栭埡瀣М鐎规洖銈搁幃銏㈢矙閸喕绱熷┑鐘茬棄閺夊簱鍋撻幇鏉跨；闁瑰墽绮悡鐔镐繆閵堝倸浜鹃梺鎸庢处娴滄粓顢氶敐澶樻晝闁挎洍鍋撶紒鐘虫皑閹插憡寰勯幇顒傚摋婵炲濮撮鍡涙偂閻斿吋鐓欓梺顓ㄧ畱婢ь喚绱掗悪娆忔处閻撴洟鏌ㄥ┑鍡欏妞ゃ儱顦甸弻宥囨喆閸曨偆浼岄梺璇″枟閻熲晠宕洪埄鍐╁鐎瑰嫰鍋婂Λ婊堟⒒閸屾艾鈧悂宕愭搴ｇ焼濞撴埃鍋撴鐐寸墵椤㈡洟鏁傞挊澶婂濠电姰鍨煎▔娑㈡嚐椤栨粍顐介柕鍫濐槹閻撴洖鈹戦悩鎻掝仼闁哄鏌ㄩ湁婵犲﹤鎳忓▍鏇犵磼鏉堛劍灏伴柟宄版嚇瀹曨偊宕熼鍕垫婵犵數濮甸鏍垂閸偅鍙忛柕鍫濐槸妗呴梺鍝勫暙閸婂鎯屽▎鎾寸厱闁绘柨鍢查弳鐐烘偨椤栨稑娴柟顔藉劤閳规垹鈧綆浜為ˇ鏉款渻閵堝棗鐏卞┑顔哄€楅埀顒佷亢閸嬫劗妲愰幘璇茬＜婵炲棙鍩堝Σ顔碱渻閵堝棗鐏ユ俊顐ｇ箞閵嗕線寮借閺嬪酣鏌熼幆褏锛嶉柨娑氬枛濮婅櫣鎲撮崟顐婵犫拃鍕垫疁闁诡喒鈧枼鏋庨柟鎯ь嚟閸樹粙姊虹紒妯荤叆闁圭⒈鍋婇妴鍌涚附閸涘﹦鍘甸梺绋跨箳閸樠勬叏瀹ュ鐓涚€光偓鐎ｎ剛袦闂佽桨鐒﹂崝娆忕暦閹偊妲诲Δ鐘靛仜椤戝顫忛搹瑙勫珰闁炽儴娅曢悘宥囩磽娓氬洤鏋涙繛瀵稿厴瀹曟岸骞掑Δ浣镐缓缂佸墽澧楅敋濞存粓绠栭弻銊モ攽閸℃侗鈧霉濠婂嫮绠栫紒缁樼洴瀹曘劑顢橀悩妯犲嫭鍙忓┑鐘插鐢盯鏌熷畡鐗堝殗闁圭厧缍婇幃鐑藉箥椤曞懎浠归梻鍌氬€风粈渚€骞夐垾鎰佹綎鐟滅増甯楅崑瀣繆閵堝懎鏆熼柛妤佸哺閺岋綁寮崒姘粯濡ょ姷鍋戦崹铏规崲濞戙垹绠ｉ柣鎰仛閸ｎ噣姊洪崨濠勬噧闁哥喐娼欓～蹇涘传閸曟嚪鍥х倞鐟滃繑瀵奸崟顖涒拺閺夌偞澹嗛ˇ锕傛煙閼恒儳鐭嬬紒鏃傚枛瀵挳鎮㈡笟顖涚カ闂佽鍑界紞鍡涘磻閸℃稑鍌ㄩ梺顒€绉甸悡鐔肩叓閸ャ劍绀€濞寸姵绮岄…鑳槺缂侇喗鐟╅悰顔界節閸パ咁槹濡炪倖鎸炬慨鐑芥晬濠婂嫮绠鹃弶鍫濆⒔閹ジ鏌熼搹顐ｅ磳閽樼喖鎮楅敐搴″缁炬儳銈稿鍫曞醇濞戞ê顬夐悗瑙勬礀閻ジ鍩€椤掑喚娼愭繛鍙夌矒瀹曘垼顦归柍銉畵婵℃悂鍩℃担渚О闂備線娼ц噹濞达綁鏅茬划锟犳⒒閸屾瑦绁版い鏇嗗喚娼╅柨鏇炲亰缂嶆牕顭跨捄琛″闁告繂瀚€閻斿摜闄勯柤鎭掑劜閵囨繈鏌熼鍝勭伈闁硅櫕鐗犻崺鈩冩媴閹帒浜伴梻鍌氬€峰ù鍥綖婢跺﹦鏆︽慨妞诲亾妞ゃ垺淇洪ˇ瀵哥磼椤旂⒈鐓奸柟鐓庣秺椤㈡洟濡堕崶鈺傤潓闂傚倸鍊搁崐鎼佹偋婵犲嫮鐭欓柟鎯х摠濞呯娀鏌￠崶鈺佷汗闁衡偓閼恒儯浜滈柡鍐ㄦ搐琚氶梺闈涙处缁诲啴骞堥妸锔剧瘈闁告劏鏂傛禒銏ゆ⒑閸︻収鍔滅紒缁樼箖娣囧﹪宕奸弴鐐茬獩闂佸憡渚楅崑鍕倶椤忓棛纾肩紓浣诡焽閵嗘帒霉閻欏懐鐣电€规洘甯掗～婵嬫晲閸涱剙顥氶梻浣告惈濞层垽宕洪崟顖氭瀬閻庯綆鍠楅悡銉︾節闂堟稒锛嶆俊顖氱墦閺屸剝鎷呴崨濠庢＆闂佸搫鏈惄顖氼嚕閹绢喖惟闁靛鍎哄璇测攽閻愯尙鎽犵紒顔肩Ф閸掓帡骞橀幇浣圭稁闂佹儳绻愬﹢閬嶆儗濞嗘挻鍋ｉ柟顓熷笒婵℃寧銇勯弬鍖¤含婵﹥妞藉畷銊︾節鎼达絽濮搁梻浣告啞閸斞呭緤妤ｅ啯鍊跺〒姘ｅ亾婵﹥妞藉Λ鍐ㄢ槈鏉堛剱銏ゆ⒑閸濆嫭鍣虹紒顔芥崌瀹曞搫鈽夐姀鐘殿吅闂佹寧妫佽闁瑰嘲顭峰娲礈閹绘帊绨介梺鍝ュУ閹瑰洦淇婇幘顔肩闁规惌鍘鹃崬鐢告偡濠婂啴顎楅悡銈嗕繆椤栨繂鍚归柍鐟扮Т閳规垿鎮╅崣澶屻偐闂佽桨绀侀崯鎾蓟閺囷紕鐤€閻庯綆浜炴导鍕⒑閸涘﹥顥旈柛銊﹀閻忓啴姊虹紒姗堣€挎繛浣冲嫮顩烽柨鏇炲€归悡鏇㈡煛閸愶絽浜鹃梺鑽ゅ枂閸庣敻骞冩ィ鍐╁€婚柤鎭掑劚娴滄粎绱掗悙顒€顎滃瀛樻倐瀵煡顢楅埀顒勫煘閹达附鍊烽柡澶嬪灩娴犳悂鏌ｉ姀鈺佺仭妞ゃ劌鐗撻崺鈧い鎺嶆娴溿垺淇婇銏狀伃闁糕晝鍋ら獮瀣晜閽樺鍋撻悜鑺ョ厾闁归棿鐒﹀☉褎绻涢幊宄版噽绾捐棄霉閿濆牊顥夌紒鎲嬪缁辨帡顢欓悾灞惧櫚闂佺粯渚楅崰妤€顕ラ崟顖氱疀妞ゆ挾鍠愰鐔兼⒒娴ｈ櫣甯涙い顓炵墢娴滅鈻庨幘鏉戜患婵°倧绲介崯顖炲煕閹达附鐓曢柟鐐綑缁茶霉濠婂嫮澧甸柡灞剧⊕閹棃濮€閵忕姴缁╅梻浣筋嚃閸ｎ垳鎹㈠┑瀣畺闁靛繈鍊栭埛鎰版煙闁箑鏋ら柣锝夌畺濮婄粯绗熼埀顒€顭囪閹囧幢濞戞锛欓梺鍛婄☉閿曪箓銆呴弻銉︾厵妞ゆ牕妫岄崑鎾绘煛閳ь剚绂掔€ｎ偆鍘撻梺鑺ッˇ浼此夊鍏犵懓顭ㄩ崟顓犵暭缂備浇椴哥敮鐐哄箯閻樿鐭楀鑸瞪戦ˉ锝夋⒑閹规劕鍚归柛瀣ㄥ€濆濠氭晲婢跺﹥顥濋梺鍓茬厛閸犳宕愰鐐粹拺闁规儼濮ら弫閬嶆煕閵娿儳绉洪柟顖楀亾濡炪倕绻愰悧婊堝极閸ヮ剚鐓熼柟閭﹀幗缂嶆垶绻涢崨顐⑩偓妤冩閹烘梻纾奸柕蹇曞Т缁犳椽姊虹粙鍨劉濠电偛锕崹楣冩晜閻愵剙纾梺闈涱煭缁犳垿寮搁崒鐐粹拺闁告稑锕ユ径鍕煕濡湱鐭欑€规洘濞婇、姗€濮€閳ユ枼鍋撻悽鍛婄厱妞ゎ厽鍨垫禍婵堢磼閼哥數鍙€闁诡喗顨呴～婵嬫偂鎼淬垻褰庨梻浣虹《閺備線宕戦幘鎰佹富闁靛牆妫楃粭鎺楁煥閺囶亜顩紒顔芥閹粙宕ㄦ繝鍕箞闂備浇顫夐崕鎶筋敋椤撶伝娲箻椤旂晫鍘靛銈嗙墬閻熝呯玻閺冨倵鍋撶憴鍕闁靛牆鎲℃穱濠囨倻閼恒儲娅嗛柣鐔哥懃鐎氼剟顢旇ぐ鎺撯拻闁稿本鐟чˇ锕傛煙鐠囇呯？缂侇喗鐟╅獮瀣晜閼恒儲鐝栭梻渚€娼ч悧鍡椢涘▎鎾崇煑闊洦绋掗悡鍐喐濠婂牆绀堥柣鏂款殠濞兼牗绻涘顔荤盎濞磋偐濞€閺屾盯寮撮妸銉ヮ潻濠电偛鎳岄崐婵嗩潖濞差亝鍊婚柍鍝勫€归悵锕傛⒑閹肩偛濡奸柣鏍帶椤?Agent" /> : null
        )}

        {candidateAgents.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">Available</span>
              <Input
                placeholder="闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤缂嶅﹪寮婚悢鍏尖拻閻庨潧澹婂Σ顔剧磼閻愵剙鍔ょ紓宥咃躬瀵鏁愭径濠勵吅闂佹寧绻傞幉娑㈠箻缂佹鍘遍梺闈涚墕閹冲酣顢旈銏＄厸閻忕偛澧藉ú瀛樸亜閵忊剝绀嬮柡浣瑰姍瀹曞崬鈻庡Ο鎭嶆氨绱撻崒姘偓鐑芥嚄閼稿灚鍙忛梺鍨儑缁犻箖鏌嶈閸撶喖寮婚垾宕囨殕闁逞屽墴瀹曚即寮介鐘茬ウ闂佺鎻粻鎴犵不濞戙垺鈷掗柛顐ゅ枔閳洘銇勯弬鍨伃婵﹥妞介幊锟犲Χ閸涱喚鈧箖姊洪懡銈呮灆濞存粠鍓涢崚鎺撶節濮橆剛顔掗柣鐘叉穿鐏忔瑩鎮鹃崫鍕ㄦ斀閹烘娊宕愰弴銏犵疇闊洦绋戦悿楣冩煛鐏炶鍔氱紒鐘叉贡缁辨帡顢欓悡搴¤緟闂佺顑嗛幑鍥嵁閸ャ劍濯撮梺顐ｇ⊕閸炲姊婚崒姘偓鎼佸磹閻戣姤鍊块柨鏇炲€哥粻鏍煕椤愶絾绀€缂佲偓婢跺备鍋撻獮鍨姎婵炶绠戦悾鐑藉蓟閵夛妇鍘卞銈嗗姉婵挳宕濋妶鍥ｅ亾鐟欏嫭灏紒鑸靛哺瀵鍨鹃幇浣告倯闁硅壈鎻徊鑲╁垝閹剧粯鐓欓柛蹇撳悑閸庢鏌ｉ幘宕囧ⅵ鐎殿噮鍋婂畷鍗炩槈濞嗘垵甯楅柣鐔哥矋缁挸鐣峰鍐炬僵妞ゆ挾濮弨铏節閻㈤潧孝婵炶绠撳畷鐢稿礃椤旂晫鍘撻梺鍛婄箓鐎氼剟寮抽悙鐑樼叆?Agent..."
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
                          Install
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty description={agentSearch ? "濠电姷鏁告慨鐑藉极閸涘﹥鍙忛柣鎴ｆ閺嬩線鏌涘☉姗堟敾闁告瑥绻橀弻锝夊箣閿濆棭妫勯梺鍝勵儎缁舵岸寮诲☉妯锋婵鐗婇弫楣冩⒑閸涘﹦鎳冪紒缁橈耿瀵鏁愭径濠勵吅闂佹寧绻傚Λ顓炍涢崟顖涒拺闁告繂瀚烽崕搴ｇ磼閼搁潧鍝虹€殿喖顭烽幃銏ゅ礂鐏忔牗瀚介梺璇查叄濞佳勭珶婵犲伣锝夘敊閸撗咃紲闂佽鍨庨崘锝嗗瘱缂傚倷绶￠崳顕€宕归幎钘夌闁靛繒濮Σ鍫ユ煏韫囨洖啸妞ゆ挻妞藉铏圭磼濡搫顫岄梺璇茬箲瀹€绋跨暦鐎圭媭妲剧紓浣介哺閹稿骞忛崨顖滅煓婵炲棛鍋撳▓娲⒒娴ｄ警鐒炬い鎴濆暣瀹曟劕鈹戦崱鈺佹闁荤姴娲︾粊鏉懳ｉ崼銉︾厪闊洦娲栭～宥夋煏婵犲繗绀嬪ù婊勭矒閺岋繝宕橀妸銉㈠亾閸濄儲鏆滈柤鍝ュ仯娴滄粍銇勯幇顔兼瀾婵炲懎娲ㄧ槐鎺撴綇閵婏箑闉嶉梺鐟板槻閹虫﹢鐛幘璇茬鐎广儱鎷嬪Λ婊堟⒒閸屾艾鈧绮堟担鍦彾濠电姴娲ょ壕濠氭煕閳╁啰鈽夌紒鎰殜閺岀喖骞戦幇顓犮€愭繝娈垮櫘閸撶喖寮诲鍫闂佸憡鎸鹃崰搴綖韫囨梻绡€婵﹩鍓涢敍婊冣攽椤旂煫顏勭暦椤掑娂鐑藉焵椤掑倻纾介柛灞剧懅椤︼附銇勯幋婵囶棤闁轰緡鍣ｉ弫鎾绘偐閸欏鈧剟鎮楅獮鍨姎妞わ富鍨抽悮鎯ь吋婢跺鍘卞銈嗗姂閸婃洟寮搁弮鍫熺厱婵せ鍋撶紒鐘崇墪椤繐煤椤忓嫪绱堕梺鍛婃礀閻忔碍鐡忓┑鐘垫暩閸嬫盯藝閺夋５鍝勎熼懖鈺冪効闂佸湱鍎ら〃鍛达綖閸涘瓨鐓忛柛顐ｇ箖椤ョ娀鏌涘鍡曢偗婵﹨娅ｉ崠鏍即閻愭祴鎷ら梻浣瑰濮樸劎妲愰幒鎳虫梹鎷呴崫銉ф嚃闂備線娼уú銈団偓姘嵆閵嗕線寮撮姀鈩冩珳闂佹悶鍎弲婵嬪级娴犲鈷掑ù锝堝Г閵嗗啴鏌ｉ幒鐐电暤鐎规洘绻傞埢搴ょ疀閺囩喐顔曢梻渚€娼ц墝闁哄應鏅犲顐﹀幢濞戞瑧鍘撻悷婊勭矒瀹曟粓鎮㈢紒姗堢磽濠电姵顔栭崰妤呪€﹂崼銉ユ槬闁哄稁鍘奸悡鏇㈡煙鏉堥箖妾柛瀣剁秮閺屾盯濡烽幋婵嗘殶濡ょ姴娲娲传閵夈儰绮跺銈忕細閸楄櫕淇婇悽绋跨妞ゆ牭绲鹃弲婵嬫⒑闂堟稓绠氶柡鍛矌閻熝囨⒒娴ｈ櫣甯涢柟绋跨埣瀹曟劙寮介锝呭簥濠电娀娼уú銊у姬閳ь剟姊虹粙鎸庢拱闁告垼顫夌粋鎺撱偅閸愨斁鎷洪梺鍛婄☉閿曪箓骞婇崘顏嗙＜缂備焦锚婵矂鏌ｈ箛鎾虫殻婵﹥妞介獮鎰償閿濆洨鏆ら梻浣烘嚀閸熷潡鏌婇敐鍜佸殨闁告劖绁撮弸搴ㄧ叓閸ラ绋荤紒鍌氭濮婃椽宕ㄦ繝鍕ㄦ闂佸鏉垮闁糕晜鐩獮瀣晜閻ｅ苯骞堥梻浣瑰濡線顢氳閻涱噣寮介妸锝勭盎闂佹寧绻傞幊搴ㄥ箖閹寸姷纾肩紓浣诡焽缁犵偛鈹戦鐟颁壕闂備礁鐤囧Λ鍕涘☉銏犵濡炲娴风壕钘夈€掑顒佹悙闁哄绋掗妵鍕敇閻樻彃骞嬮梺缁樹緱閸犳骞嗛弮鍫澪╅柨鏇楀亾婵炲牏鍠栧娲濞戝磭纭€闂佸憡鍔戦崝搴敇婵傚憡鈷掗柛灞剧懄缁佺増銇勯弴鍡楁噳閸嬫挸鈽夐幒鎾寸彇缂備緡鍠楅悷鈺呯嵁閹烘埈娓婚柣鎴旀櫅娴滈箖鏌ㄩ弴鐐测偓鎼佹倷婵犲洦鐓冮柛婵嗗閺嗘洜绱掑Δ鈧ˇ顖炲煘閹达富鏁婄紒娑橆儑閸斿憡绻涚€涙鐭ら柛鎾寸⊕缁旂喖寮撮姀鈥充簵濡ょ姷鍋熼崰搴ｇ礊婵犲洤鏋侀柟鐗堟緲闁卞洦銇勯幇鍓佹偧缂佸鍏樺铏规嫚閼碱剛顔囨俊銈囧Т缁绘ê顫忔禒瀣妞ゆ牗姘ㄩ悿?Agent" : "濠电姷鏁告慨鐑藉极閸涘﹥鍙忛柣鎴ｆ閺嬩線鏌涘☉姗堟敾闁告瑥绻橀弻锝夊箣閿濆棭妫勯梺鍝勵儎缁舵岸寮诲☉妯锋婵鐗婇弫楣冩⒑閸涘﹦鎳冪紒缁橈耿瀵鏁愭径濠勵吅闂佹寧绻傚Λ顓炍涢崟顖涒拺闁告繂瀚烽崕搴ｇ磼閼搁潧鍝虹€殿喖顭烽幃銏ゅ礂鐏忔牗瀚介梺璇查叄濞佳勭珶婵犲伣锝夘敊閸撗咃紲闂佽鍨庨崘锝嗗瘱缂傚倷绶￠崳顕€宕归幎钘夌闁靛繒濮Σ鍫ユ煏韫囨洖啸妞ゆ挻妞藉铏圭磼濡搫顫岄梺璇茬箲瀹€绋跨暦鐎圭媭妲剧紓浣介哺閹稿骞忛崨顖滅煓婵炲棛鍋撳▓娲⒒娴ｄ警鐒炬い鎴濆暣瀹曟劕鈹戦崱鈺佹闁荤姴娲︾粊鏉懳ｉ崼銉︾厪闊洦娲栭～宥夋煏婵犲繗绀嬪ù婊勭矒閺岋繝宕橀妸銉㈠亾閸濄儲鏆滈柤鍝ュ仯娴滄粍銇勯幇顔兼瀾婵炲懎娲ㄧ槐鎺撴綇閵婏箑闉嶉梺鐟板槻閹虫﹢鐛幘璇茬鐎广儱鎷嬪Λ婊堟⒒閸屾艾鈧绮堟担鍦彾濠电姴娲ょ壕濠氭煕閳╁啰鈽夌紒鎰殜閺岀喖骞戦幇顓犮€愭繝娈垮櫘閸撶喖寮诲鍫闂佸憡鎸鹃崰搴綖韫囨梻绡€婵﹩鍓涢敍婊冣攽椤旂煫顏勭暦椤掑娂鐑藉焵椤掑倻纾介柛灞剧懅椤︼附銇勯幋婵囶棤闁轰緡鍣ｉ弫鎾绘偐閸欏鈧剟鎮楅獮鍨姎妞わ富鍨抽悮鎯ь吋婢跺鍘卞銈嗗姂閸婃洟寮搁弮鍫熺厱婵せ鍋撶紒鐘崇墪椤繐煤椤忓嫪绱堕梺鍛婃礀閻忔碍鐡忓┑鐘垫暩閸嬫盯藝閺夋５鍝勎熼懖鈺冪効闂佸湱鍎ら〃鍛达綖閸涘瓨鐓忛柛顐ｇ箖椤ョ娀鏌涘鍡曢偗婵﹨娅ｉ崠鏍即閻愭祴鎷ら梻浣瑰濮樸劎妲愰幒鎳虫梹鎷呴崫銉ф嚃闂備線娼уú銈団偓姘嵆閵嗕線寮撮姀鈩冩珳闂佹悶鍎弲婵嬪级娴犲鈷掑ù锝堝Г閵嗗啴鏌ｉ幒鐐电暤鐎规洘绻傞埢搴ょ疀閺囩喐顔曢梻渚€娼ц墝闁哄應鏅犲顐﹀幢濞戞瑧鍘撻悷婊勭矒瀹曟粓鎮㈢紒姗堢磽濠电姵顔栭崰妤呪€﹂崼銉ユ槬闁哄稁鍘奸悡鏇㈡煙鏉堥箖妾柛瀣剁秮閺屾盯濡烽幋婵嗘殶濡ょ姴娲娲传閵夈儰绮跺銈忕細閸楄櫕淇婇悽绋跨妞ゆ牭绲鹃弲婵嬫⒑闂堟稓绠氶柡鍛矌閻熝囨⒒娴ｈ櫣甯涢柟绋跨埣瀹曟劕鈹戠€ｎ亣鎽曢悗骞垮劚椤︻垱瀵奸悩缁樼厱闁哄洢鍔屾禍婵囩箾閸繂顣崇紒杈ㄦ尰閹峰懘骞撻幒宥咁棜婵犵數濮烽弫鍛婃叏閹绢喖纾归柛顐ｆ礀閻掑灚銇勯幒宥囶槮缂佹甯楅妵鍕敃閿濆洨鐤勯梺杞扮劍閸旀瑥鐣烽妸鈺婃晢闁逞屽墴钘熸慨妯垮煐閳锋帡鏌涚仦鍓ф噮缂佹劖姊圭换娑欐媴閸愭彃鎮╂繛鎴欏灩缁秹鏌涚仦鍓х煂闁绘帒鍚嬬换娑㈠箻閺夋垹鍔伴梺绋款儐閹瑰洭寮诲☉銏犵厴闁割煈鍠栨慨鏇㈡倵閸偅绶查悗姘煎幘閹广垹鈽夐姀鐙€娼婇梺闈涚箳婵敻鎮橀崼銉︹拺闁告繂瀚～锕傛煕閺傚潡鍙勯柛鈹惧亾濡炪倖甯掗敃锕傚礆娴煎瓨鐓熼煫鍥ㄦ⒐閻ㄦ垹绱掓潏鈺佷户濞寸媴濡囬幉鎾晲閸℃ɑ婢戦梻鍌欒兌缁垵鎽銈嗘⒐閻楃姴顕ｉ幎绛嬫晬婵炴垶顨堢粻姘舵⒑閸︻厾甯涢悽顖涱殜瀹曠敻宕堕埞鎯т壕閻熸瑥瀚粈鈧紓鍌氱Т閿曘倛鐏嬮梺鍛婂姂閸斿危閸喐鍙忔慨妤€妫楅獮妤併亜閺冣偓濞茬喎顫忕紒妯诲闁革富鍘介懣鍥⒑閹肩偛濡兼い顓炲槻椤曪綁顢曢敃鈧粻鐟懊归敐鍥ㄥ殌闁告挸缍婂铏规喆閸曨偆顦ㄩ梺绯曟櫆閻楃姴鐣锋导鏉戠疀闁绘鐗忛崢钘夆攽鎺抽崐鎰板磻閹剧粯鐓熸俊銈傚亾婵☆偅绋撻崚鎺楊敇閻戝棙鍍甸梺鐓庢憸閺佹悂宕㈤幘缁樷拻濞达絽鎽滄禒銏°亜閹存繃鍣界紒顕呭弮楠炴帒螖娓氬洦鈷栧┑鐘灱閸╂牠宕濋弽顓熷亗闁靛濡囩弧鈧梻鍌氱墛缁嬫帡藟閻愮儤鐓曢柨婵嗘閵囨繈鏌＄仦鍓ф创闁诡喓鍨藉畷顐﹀礋椤忓拋娼熼梻鍌欑閹碱偊寮甸鍕剮妞ゆ牜鍋涚粻鏍煏韫囧鈧洘瀵奸悩缁樼厱闁哄洢鍔嬬花濂告煕閺囩偛鏆ｆ慨濠勭帛缁楃喖鍩€椤掑嫬鐒垫い鎺嶈兌閵嗘帡鏌嶇憴鍕诞闁哄本鐩顒傛崉閵婃劑鍊濋弻鐔肩嵁閸喚浠奸梺瀹狀潐閸ㄥ綊鍩€椤掑﹦绉靛ù婊呭仱钘濋柡澶嬵儥濞撳鏌曢崼婵囶棡閻忓繒鏁婚弻娑氣偓锝庡墮閺嬫稒銇勯姀鈩冪缂佽桨绮欏畷銊︾箾閻愵剙顏烘繝鐢靛仦閹稿宕洪崘顔肩；闁瑰墽绮悡鍐喐濠婂牆绀堟慨妯夸含閻瑩鏌熼幑鎰靛殭闁绘挻锕㈤弻鐔兼倻濮楀棙鐣烽梺缁樻尰濞茬喖寮婚敓鐘茬＜婵犻潧娲ㄩ妴濠囨⒑缂佹ê绗氶柟顔煎€垮濠氭偄绾拌鲸鏅梺閫炲苯澧扮紒顔碱煼瀵粙顢橀悙瀵糕偓顒勬⒑閻熸澘鈷旂紒顕呭灦瀹曟垿骞囬悧鍫㈠幘缂佺偓婢樺畷顒佹櫠婵犳碍鐓曟慨姗嗗墻閸庢梹鎱ㄦ繝鍕笡闁瑰嘲鎳橀幃鐑藉级閸啩鎴炵節閻㈤潧浠滈柣掳鍔岄悾婵堢矙鐠恒劍娈鹃梺纭呮彧缁犳垿鐛姀鈥茬箚妞ゆ牗澹曢幏鈩冪箾?Agent"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                    婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柛娑橈攻閸欏繘鏌ｉ幋锝嗩棄闁哄绶氶弻娑樷槈濮楀牊鏁鹃梺鍛婄懃缁绘﹢寮婚敐澶婄闁挎繂妫Λ鍕⒑閸濆嫷鍎庣紒鑸靛哺瀵鎮㈤崗灏栨嫽闁诲酣娼ф竟濠偽ｉ鍓х＜闁绘劦鍓欓崝銈嗙箾绾绡€鐎殿喖顭烽幃銏㈡偘閳ュ厖澹曢梺姹囧灪椤旀牠鎮為崜褉鍋撳☉娆戠畼缂佽鲸鎸婚幏鍛存偩鐏炵晫澧梻浣侯焾閿曘儳鎹㈤崼婵愬殨濠电姵纰嶉弲婵嬫煃瑜滈崜婵嬫倶閹烘挾绠鹃柟鐐綑閸ゎ剟鏌涢妸鈺€鎲鹃柡浣哥Ч瀹曞崬顪冪紒妯绘澑闂備胶绮崝鏇烆嚕閸洖鐓濋柡鍥╀紳閻熼偊鐓ラ柛鏇ㄥ幘閻ゅ嫰鎮楀▓鍨灍鐟滄澘鍟撮垾锕傚Ω閳轰線鍞堕梺缁樻煥閹碱偊鐛Δ鍛拻濞撴埃鍋撻柍褜鍓氱粙鎴濈暤閸℃绠惧ù锝呭暱鐎氼厼鈻嶉悩鐐戒簻闁哄洦顨呮禍鎯旈悩闈涗沪闁绘濮撮锝夊醇閺囩偟顓哄銈嗙墬缁诲倿骞嗛崼鐔虹瘈婵炲牆鐏濋弸娑㈡煥閺囨ê濡奸柍璇茬Ч閺佹劙宕惰閻忓﹤鈹戦悙鍙夘棡闁搞劏娉涢悾閿嬪緞閹邦厾鍘繝鐢靛€崘銊㈠亾閼姐倗鐭嗛柛鎰靛枟閳锋帡鏌涚仦鍓ф噯闁稿繐鏈妵鍕敇閻愰潧鈪靛銈冨灪閻楃姴鐣烽崼鏇ㄦ晢闁逞屽墰婢规洘绻濆顓犲帾闂佸壊鍋呯换鍐闯娴犲鐓?
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<Trash2 size={12} />}
                    loading={saving}
                    onClick={() => void handleUninstall()}
                  >
                    Uninstall
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
                        placeholder="闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤缂嶅﹪寮婚悢鍏尖拻閻庨潧澹婂Σ顔剧磼閻愵剙鍔ょ紓宥咃躬瀵鎮㈤崗灏栨嫽闁诲酣娼ф竟濠偽ｉ鍓х＜闁诡垎鍐ｆ寖闂佺娅曢幑鍥灳閺冨牆绀冩い蹇庣娴滈箖鏌ㄥ┑鍡欏嚬缂併劎绮妵鍕箳鐎ｎ亞浠鹃梺闈涙搐鐎氫即鐛崶顒夋晜闁糕剝鐟ч崢顖炴⒒娴ｅ憡鎯堥悶姘煎亰瀹曟繈骞嬮敃鈧粻鏍煏韫囧鈧洘瀵奸悩缁樼厱闁哄洨鍠庨悘鐔兼煕閵娿儺鐓奸柟顖楀亾濡炪倕绻愰悧鍡欑不濮樿鲸鍠愭繝濠傜墛閸嬪倸鈹戦崒姘暈闁绘挻鐩幃姗€鎮欓幓鎺嗘寖濠电偞褰冮顓㈠焵椤掍緡鍟忛柛鐘愁殜楠炴劙鎼归锛勭畾闂佸綊妫跨粈浣告暜闁荤喐绮岄ˇ闈涚暦閹达箑绠绘繛鑼帛閺呫垽姊洪崨濠冨闁告挻鐩畷銏ゆ焼瀹ュ棌鎷洪梻鍌氱墛娓氭螣閸儲鐓曢柣妯虹－婢ь剟鏌￠崨顓犲煟妞ゃ垺鐟╁畷婊嗩槾闁挎稒绮撳铏圭磼濮楀牅绶甸梺鍝ュУ閻楃姴鐣峰┑鍡╃叆闁割偆鍠撻崢顏堟⒑閹肩偛鍔€闁告劕褰炵槐鏃堟煟鎼淬埄鍟忛柛锝庡櫍瀹曟娊鏁愰崨顖涙闂佸湱鍎ら崹鐔肺ｉ崼鐔剁箚妞ゆ牗绻傞崥褰掓煛閸℃顣茬紒缁樼箞閹粙妫冨☉妤冩崟闂備礁顓介弶鍨瀷闂佸憡甯楃敮妤呭箚閺冨牆惟闁靛／宥囧耿闂傚倷娴囬～澶婄暦濮椻偓椤㈡俺顦寸紒顔碱煼閹瑩鎮滃Ο鐓庡妇濠电姷鏁搁崑娑㈡倶濠靛绀堝┑鐘崇閻撶喖鏌￠崘銊﹀妞ゅ繒濞€閺岋綁顢橀悢鐑樺櫚闂佸搫鏈惄顖炲灳閿曞倸绠ｆ繝闈涙川娴滎亝淇婇悙顏勨偓銈夊磻閸涙潙绠伴柟闂寸閻撴﹢鏌熸潏楣冩闁稿鍔欓弻鐔革紣娴ｄ警妲梺鍝勬嚇娴滆泛顫忓ú顏勪紶闁靛鍎涢敐澶嬪仺妞ゆ牗銇涢崑鎾崇暦閸ャ劍顔曢梻浣侯攰閹活亞绮婚幋鐘典笉闁煎鍊楃壕钘壝归敐澶樷偓鍥ь潩鐠鸿櫣顔嗙紓鍌欑劍椤洨绮绘ィ鍐╃厵闁绘劦鍓氱紞鎴︽煟閹烘垹绉洪柡灞剧〒閳ь剨缍嗛崑鍛焊閹殿喚纾肩紓浣诡焽閳洟鏌熷畡鐗堝殗鐎规洘锕㈤獮鎾诲箳閹寸媭鍟嬪┑鐘垫暩閸嬫稑螣婵犲啰顩叉繝闈涱儏閻ょ偓绻濋棃娑卞剱闁绘挻娲熼幃姗€鎮欓棃娑楀闂佹眹鍔嶉崹鍫曞Φ閸曨垱鏅滈悹鍥у级閻忓牓姊虹€圭媭娼愰柛銊ユ健楠炲啫鈻庨幘宕囩厬婵犮垼鍩栬摫闁挎稐绶氬缁樻媴閻戞ê娈岄梺纭咁嚋缁绘繂鐣烽弴銏犵闁兼亽鍎辨禒濂告⒑閸撹尙鍘涢柛瀣噺閸掑﹪骞橀钘変画濠电偛妫楃换鎰邦敂閳哄啠鍋撳▓鍨灈闁诲繑绻堥崺鐐哄箣閿旇姤娅栭梺鍛婃处閸嬪倿宕Δ鈧—鍐Χ閸℃鍋侀梺鍛婃处閸欏骸煤閸涘﹣绻嗛柕鍫濈箳閸掍即鏌涢悤浣哥仸鐎规洘鍔欓幃浠嬪川婵犲倷鐢绘繝鐢靛仜濡鎹㈤幇閭︽晜妞ゅ繐妫涚壕濂告煃瑜滈崜鐔风暦濮椻偓椤㈡瑩鎮剧仦钘夋辈濠电姵顔栭崰妤呮晝閳哄懎鍌ㄩ悷娆忓椤╁弶绻濇繝鍌滃闁绘挻鐩弻娑氫沪閸撗呯暫缂佺虎鍘兼晶搴ｆ閹烘鍋愰柣銏ゆ涧缁楋繝姊洪棃娑欐悙閻庢氨澧楅幈銊╁焵椤掑嫭鐓ユ繛鎴灻顏堟煕閿濆嫬宓嗘慨濠呮閹风娀鍨鹃搹顐や邯濠电姭鎷冮崱妞ユ挾绱掗崒娑樻诞闁轰礁鍊垮畷婊嗩槾闁绘挻鎸荤换婵嬪閻樺樊鏆㈠銈庡幖閻楁捁妫㈠┑顔斤供閸樿櫣鎹㈤崱娑欑厽闁规澘鍚€缁ㄥ鏌嶈閸撴岸鎮ч悩鑼殾婵犻潧顭Ο鍕攽椤旂》姊楃紒顔界懃閻ｇ兘鎮㈢喊杈ㄦ櫖濠殿喗锚瀹曨剟鐛崼銉︹拻濞达絼璀﹂弨浼存煙濞茶閭慨濠佺矙瀹曠喖顢涘鎲嬬幢闂備焦瀵х换鍌炈囨导瀛樺亗闁哄洢鍨洪悡蹇擃熆閼哥數銆掗柛鎺撴緲閳规垿鍨鹃搹顐淮闂佸搫鏈粙鎴﹀煝鎼达絼娌柟瀛樺笒椤ユ艾鈹戦悩娈挎殰缂佽鲸娲熷畷鎴﹀箣閿曗偓绾惧綊鏌￠崶鈺佇涢柛瀣尭閳藉骞掗幘瀵稿綃闂備線娼уΛ妤呭疮閺夋垹鏆﹂柛妤冨亹閺嬪酣鏌熼柇锕€澧紒銊ｅ劜缁绘繈鎮介棃娑掓瀰濠电偘鍖犻崶鑸垫櫈闂佸憡绋戦悺銊╁磹閸ф鐓曟い顓熷灥娴滄牕霉濠婂嫮鐭掗柡宀€鍠栭幃婊兾熼搹閫涙樊婵＄偑鍊曞ù姘椤忓牆钃熼柨婵嗩槸缁犳娊鏌￠崶鈺佷粧婵顨婂娲焻閻愯尪瀚板褜鍠氱槐鎺楁偐閼碱儷褏鈧娲樺ú鐔煎蓟閸℃鍚嬮柛娑卞灣閺嬪啴姊绘担绛嬫綈濠㈢懓妫欓弲璺何旈崨顓犳煣濡炪倖甯婇懗鍓佺不妤ｅ啯鐓欓悗鐢殿焾閳ь剚鍨甸～婵堟崉閾忕懓鎽嬪┑鐐差嚟婵挳顢栭崱娑欏亗闁告劦鍠楅悡銏′繆椤栨瑨顒熸俊鑼额潐閵囧嫰濡烽敂鍓х厜闂佸搫鐭夌紞鈧紒鐘崇洴瀵挳鎮欓埡鍌溾偓浼存⒒娴ｅ憡鎯堥柡鍫墰缁瑩骞嬮敂鑲╃◤濠电娀娼ч鎰板极閸℃鐔嗛悹铏瑰皑瀹搞儱顭块悷鏉款劉濞ｅ洤锕幃娆擃敂閸曘劌浜鹃柟杈剧畱閸ㄥ倿鏌涘┑鍡椻枙闁告繂瀚€閻斿吋鍤冮柍鍝勫暟閸斿綊姊绘担鍛婅础闁稿簺鍊濆濠氭晸閻樿尙锛涢梺鐟板⒔缁垶寮查弻銉ョ缂侇喖鍘滈崑鎾绘嚑椤掍焦娅﹂梻鍌氬€风粈渚€骞夐敓鐘虫櫇闁冲搫鍊婚々鍙夌節闂堟稓澧涚€规洖寮剁换婵嬫濞戝崬鍓板銈庡亜閹虫﹢寮婚妸銉㈡斀闁糕剝锕╁Λ銈夋⒑闂堟稒顥為柛鏃€鐟ラ～蹇涙惞閸︻厾锛滃┑顔筋殔濡瑩鎮剧捄琛℃斀闁宠棄妫楁禍婵堢磼鐠囨彃鈧潡骞冮幆褏鏆嬮柟浣冩珪閺傗偓闂佽鍑界紞鍡樼閻愪警鏁婇柟鐑樺焾濞撳鏌曢崼婵囶棡闁抽攱甯￠弻锟犲椽娴ｉ晲鍠婇悗瑙勬磸閸ㄤ粙寮婚崱妤婂悑闁糕€崇箲鐎氳偐绱撻崒姘偓鐑芥倿閿曚焦鎳屾俊鐐€戦崕閬嶆偋閹捐钃熼柨鐔哄Т閻掑灚銇勯幒鎴濐仾闁绘帟鍋愰埀顒€绠嶉崕閬嶅箠鎼淬劌绠氶柣鎰劋閳锋垿鏌熼懖鈺佷粶闁告梹鎸抽弻娑㈠箻閺夋垵鎽甸梺璇″枓閳ь剚鏋煎Σ鍫ユ煏韫囧ň鍋撻弬銉ヤ壕闁割偅娲橀悡鐔兼煙娴兼潙浜伴柡澶嬫そ閺屾盯濡堕崱娆愬櫚闂佸搫鑻粔鐑铰ㄦ笟鈧弻娑㈠箻閺夋垵鎽甸梺璇″暙閸愬墽鍙嗛梺鍛婁緱閸ㄦ娊鏁嶅┑瀣拺閻熸瑥瀚崝銈嗐亜閺囥劌寮柕鍡楁嚇閹粓鎳為妷銉㈠亾閻㈠憡鐓ユ繝闈涙閸戝湱绱掗妸銊バ撻柕鍥у閺佸倻鎷犻幓鎺旂潉婵犳鍠栭敃銉ヮ渻閽樺鏆﹂柕濠忓缁♀偓闂佸憡娲﹂崜娆忊枍閹寸偘绻嗛柣鎰典簻閳ь儸鍥ㄢ挃闁告洦鍓涢悵鍫曟煕閳╁啨浠滈柡瀣叄閺屾洝绠涚€ｎ亖鍋撻妶澶婃瀬闁搞儺鍓氶悡鐔兼煛閸愩劍澶勬い蹇曞█閺岋綁鏁冮埀顒勬偋韫囨洘顫曢柟鐑橆殔缁€鍫㈡喐瀹ュ鈧倹绺介崨濠傜彅闁哄鐗勯崝濠冪濠婂嫨浜滈柟鏉跨仛缁舵盯妫呴澶婂⒋闁哄矉绱曟禒锕傚礈瑜嬮埀顒佸浮閺屽秷顧侀柛鎾卞妿缁辩偤宕卞Ο纰辨锤濠电姴锕ら悧婊堝极閸屾稏浜滈柟鎹愭硾濞呭繑绻涢崼婊呯煓闁哄矉缍侀獮鍥敍閿濆懏鐤傞柣搴ゎ潐閹爼宕曢悽绋跨闁割偅娲橀弲鏌ユ煕濞戝崬浜愰柛瀣崌楠炴帡骞嬮鐔峰厞闂備胶绮幐绋棵归柨瀣浄闁宠桨璁查弨浠嬫煟閹邦垰鐨哄褎鍨块弻娑㈠籍閳ь剟宕归悽闈╃稏闊洦鎷嬪ú顏嶆晜闁告洦鍙庡Σ鍫曟⒒娴ｅ憡璐＄紒顕呭灣閺侇喗绻濋崟顔夹￠梺缁樻尭缁ㄥ爼寮ㄦ禒瀣厽闁归偊鍘肩徊鑽ょ磼閻欐瑥娲﹂悡銉╂煛閸ヮ煁顏堟倶閳哄懏鐓熼柨婵嗘搐閸樺瓨顨ラ悙鍙夊枠闁诡啫鍥ч唶婵犻潧鍟禍鎯р攽閻樺磭顣查柣鎾跺█閺岀喖顢橀悢椋庣懆闂佸憡鏌ｉ崐婵嬪蓟濞戞鐔煎传閸曨喖鐓樻俊鐐€ゆ禍婊堝疮鐎涙ü绻嗛柤绋跨仛閸庣喖鏌嶉妷銉э紞妞ゆ梹鍨垮缁樻媴鐟欏嫬浠╅梺鍛婃煥閻倿骞冨Ο渚僵閺夊牃鏅濋悞鍧楁倵楠炲灝鍔氶柟鍐差樀瀵劍绂掔€ｎ偄鈧敻鏌ㄥ┑鍡涱€楀ù婊呭仱閺屾稑螣閹稿寒妫勯梺瀹狀潐閸ㄥ潡骞冮埡鍛殤妞ゆ垼娉曟す鎶芥⒒娴ｅ憡鍟炴慨濠傛贡閺侇噣鎮欓悜妯烘疅闁哄鐗勯崝搴ｅ姬閳ь剙鈹戦鏂や緵闁告﹢绠栧畷?Skill"
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
                        {systemPromptCollapsed ? "Show prompt" : "Hide prompt"}
                      </Button>
                    </div>
                    <div className="agent-prompt-body">
                      {systemPromptCollapsed ? (
                        <Text type="secondary">The current system prompt is collapsed. Click the toggle button to view the full prompt.</Text>
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
                  Install
                </Button>
              </div>
              <div className="agent-prompt-body is-spacious">
                {detailLoading ? (
                  <Text type="secondary">Agent 闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤濠€閬嶅焵椤掑倹鍤€閻庢凹鍙冨畷宕囧鐎ｃ劋姹楅梺鍦劋閸ㄥ綊宕愰悙鐑樺仭婵犲﹤鍟扮粻鑽も偓娈垮枟婵炲﹪寮崘顔肩＜婵炴垶鑹鹃獮鍫熶繆閻愵亜鈧倝宕㈡禒瀣瀭闁割煈鍋嗛々鍙夌節闂堟侗鍎愰柣鎾存礃缁绘盯宕卞Δ鍐唺缂備胶濮撮…鐑藉蓟閿涘嫪娌紒瀣仢閳峰鎮楅崹顐ｇ凡閻庢凹鍣ｉ崺鈧い鎺戯功缁夐潧霉濠婂嫮绠炴い銏＄懇瀹曘劎鈧稒锚娴狀厼鈹戦悩璇у伐闁瑰啿閰ｉ妴鍌涚附閸涘﹤浠哄銈嗙墬缁嬫垹绮缁辨帡顢欓懖鈺佲叡闂侀€炲苯澧剧紓宥呮瀹曟垶鎷呴崷顓ф锤濠电姴锕ら悧濠囨偂濞戞埃鍋撻獮鍨姎闁哥噥鍋呮穱濠囧锤濡や胶鍘撶紓鍌欑劍钃辩€规洖鐭傞弻鈥崇暆閳ь剟宕伴幘璺哄灊婵炲棙鎸搁崹鍌涖亜閺冨洤袚妞ゆ梹甯楃换婵嗏枔閸喗鐏堥梺鎸庢磸閸庨亶鈥旈崘顔藉癄濠㈣泛鏈▓楣冩⒑闂堟侗鐓┑鈥虫川瀵囧焵椤掑嫭鈷戦柛娑橈工婵箓鏌ｉ幘宕囧閸楅亶姊洪鈧粔鐢稿煕閹烘嚚褰掓晲閸偅缍堥梺绋款儑婵炩偓闁哄本鐩顒傛崉閵婃劧绲跨槐鎺楀籍閸屾碍鐏堥悗瑙勬礀瀹曨剝鐏掗梺鍏肩ゴ閺呮稒顨ラ崟顖涒拻濞达絽鎲￠幆鍫熺箾鐏炲倸鐏茬€规洜顢婇妵鎰板箳閹捐泛寮抽梻渚€娼ч悧鍡椢涢弮鍌涘床闁糕剝绋掗悡蹇涙煕椤愶絿绠栭柛锝呯秺閺岋繝宕卞Ο鍏煎櫘闂佺懓寮堕幃鍌氼嚕閸洖鍨傛い鏇炴噸缁辨梹绻濆▓鍨灈闁挎洏鍎遍—鍐╃鐎ｎ剙绁﹂梺鍝勭▉閸樹粙宕愰悜鑺ョ厵缂備焦锚缁楁帗銇勯锝呯伌婵﹦绮幏鍛村川婵犲倹娈橀梻浣告惈鐞氼偊宕濋幋锕€钃熷┑鐘叉处閺呮彃顭跨捄鐚存敾婵″樊鍓熷娲濞戣鲸顎嗙紓浣哄У閸ㄧ懓鈻庨姀銈嗗€风痪鐗埫禍楣冩煕韫囨搩妲稿ù婊堢畺濮婃椽鏌呴悙鑼跺濠⒀勬緲椤法鎲撮崟顒傤槰缂備浇妗ㄧ划娆忕暦閵婏妇绡€闁告洦鍋勭粭姘舵⒑閼姐倕鏋戠紒顔肩Ф閸掓帡骞樺畷鍥ㄦ濠电姴锕ら崰姘焽閳哄倶浜滈柟鐑樺焾濡插憡绻涢崼顐喊婵﹥妞藉畷銊︾節閸愵煈妲遍梻浣规偠閸斿秵绔熼崱娆忓灊閻犲洦绁村Σ鍫熺箾閸℃小缂併劌顭峰铏规喆閸曨偆顦ㄥ┑鐐差槹缁嬫垿鎮洪鐔剁箚闁靛牆娲ゅ暩闂佺顑囬崑銈夊Υ閸愵喖骞㈡繛鍡樺姇鎼村﹤鈹戦悩缁樻锭闁绘妫濆鎼佸醇閻斿墎绠氬銈嗙墬缁嬫帡濡甸悢鍝ョ闁稿繒鍘ч悘瀛樻叏婵犲啯銇濇鐐寸墵閹瑩骞撻幒婵堚偓鏉戔攽閻樺灚鏆╅柛瀣洴閺佸啴濡舵径瀣患闂佺粯鍨煎Λ鍕綖閸涘瓨鐓ユ繝闈涙椤掋垽鏌嶇拠鑼劯闁哄矉绲鹃幆鏃堝Χ鎼淬垻绉锋繝鐢靛仜瀵爼鈥﹂崶顒€绠查柕蹇嬪€曠粈瀣亜閺嶃劍鐨戦柛鏃撶畱椤啴濡堕崱妤冪懆闂佹寧娲╂俊鍥╁垝閺冨牊鍋ㄩ柛娑橈功閸橀亶姊虹憴鍕姢妞ゆ洦鍙冩俊鎾箳閹搭厾鍞甸柣鐔哥懃鐎氼厾绮堢€ｎ喗鐓欐い鏇炴缁♀偓闂佺粯渚楅崳锝夊箖閵忊槅妲归幖杈惧強閵娾晜鈷戦弶鐐村閸斿秹鏌涢弮鈧悷銉╂偩闁垮闄勯柛鎾冲级閺呮繈姊洪幐搴ｇ畵婵炲眰鍔岄弳鈺冪磽閸屾艾鈧悂宕愰幖浣哥９鐎瑰嫭鍣磋ぐ鎺戠倞妞ゆ巻鍋撻柡鍕╁劦閺屸€愁吋鎼粹€崇闂佺顑呴崐鍧楀蓟閵娾晜鍋勯柛婵嗗珔閵忋倖鐓?..</Text>
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
                  <Empty description="Select an uninstalled agent to view details" />
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </Space>
    </>
  );
}
