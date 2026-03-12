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
        messageApi.success("闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧湱鈧懓瀚崳纾嬨亹閹烘垹鍊炲銈嗗笒椤︿即寮查鍫熷仭婵犲﹤鍟版晥濠电姭鍋撳〒姘ｅ亾婵﹨娅ｇ槐鎺懳熼搹閫涚礃婵犵妲呴崑鍕偓姘煎枤閸掓帗绻濆顓炰汗缂傚倷鐒﹂…鍥储閻㈠憡鈷戠痪顓炴媼濞兼劙鏌涢弮鎾剁暤鐎规洟娼ч埢搴ㄥ箣閻樼绱查梻浣虹帛閿曘垹顭囪瀵鈽夊▎鎰伎婵犵數濮抽懗鍫曟儗濞嗘垟鍋撶憴鍕闁绘牕銈搁妴浣肝旈崨顓犲姦濡炪倖甯婄欢锟犲绩娴煎瓨鈷掗柛灞剧懅椤︼附绻濋埀顒佹綇閵婏附鐝峰┑掳鍊愰崑鎾淬亜椤撶偟浠㈤摶锝夋煠濞村娅囬柣鎺戙偢濮婃椽宕ㄦ繝鍌氼潊闂佸搫鍊搁崐鍦矉瀹ュ拋鐓ラ柛顐ゅ枔閸樻悂姊虹粙鎸庢拱婵ǜ鍔嶇粋鎺楀閵堝棛鍘靛銈嗘濡嫰鎮橀敃鈧彁闁搞儜宥呬紣濡炪倖鏌ㄧ换姗€銆佸▎鎾村亗閹兼惌鍠楁禍銈夋⒒閸屾瑧顦﹂柣銈呮喘閿濈偞寰勯幇顒€鐎梺绉嗗嫷娈旂紒鐘崇墬缁绘盯宕卞Ο璇茬缂備胶瀚忛崶銊у幍闁诲海鏁搁…鍫濈毈闂備胶鎳撻顓㈠礂濡警娼栫紓浣股戞刊鎾偡濞嗗繐顏╁ù鐘櫊濮婃椽宕ㄦ繝鍐弳闂備礁搴滅紞渚€鎮伴鐣岀瘈闁搞儜鍜佸晪闂備線娼荤€靛矂宕㈤搹鍦＞闁哄洨鍋愰弨浠嬫煟濡澧柛鐔风箻閺屾盯鎮╅幇浣圭杹婵犵绻濆褔鍩ユ径鎰潊闁绘顣槐閬嶆⒒娴ｇ儤鍤€濠⒀呮櫕閸掓帡顢涢悙鏉戜簵濠电偞鍨崹娲磹閸洘鐓熼柟閭﹀弾閸熷繘鏌ｉ幒鎾冲姢妞ゎ叀鍎婚ˇ鍫曟倶韫囨梻鎳囬柛鈹惧亾濡炪倖宸婚崑鎾绘煟韫囨棁澹樻い顓炵仢铻ｉ悘蹇旂墪娴滅偓鎱ㄥΟ鐓庡付鐎殿噮鍠楅〃銉╂倷閸欏妫﹂悗娈垮櫘閸ｏ絽鐣烽悡搴樻斀闁归偊鍘剧粔鍗炩攽閿涘嫬浜奸柛濞垮€濆畷鎴﹀箳濡も偓缁€鍌涙叏濡炶浜鹃悗瑙勬礃閸ㄥ潡鐛Ο灏栧亾闂堟稒鎲搁柣锕€鐗撳娲箹閻愭彃濮岄梺鍛婃煥椤︾敻鐛箛鎾佹椽顢旈崨顏呭闂備礁鎲＄粙鎴︽晝閿斿墽涓嶉柟鍓х帛閸婂灚鎱ㄥ鍡楀婵℃彃顭峰畷锟犳焼瀹ュ棛鍘遍棅顐㈡处缁嬫帡鏁嶉悢铏圭＜閻犲洤寮堕ˉ鐐烘煏閸パ冾伃妤犵偛娲崺鈩冩媴鏉炵増鍋呭┑锛勫亼閸婃洖霉濮樿泛鍌ㄥ┑鍌滎焾閻?Skill");
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
            <Tag color="green">闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧湱鈧懓瀚崳纾嬨亹閹烘垹鍊炲銈嗗笒椤︿即寮查鍫熷仭婵犲﹤鍟版晥闂佹寧绻勯崑娑㈠煘閹寸姭鍋撻敐搴′簼婵炲懎娲铏圭矙鐠恒劎鍔规繝纰樷偓铏窛缂侇喗鐟ㄧ粻娑㈠籍閸屾粎妲囬梻渚€娼ф蹇曞緤娴犲鍋傞柟鎵閻撴洟鏌￠崘锝呬壕闂佺粯顨堟慨鎾偩閻戣棄绠ｉ柨鏇楀亾閸ュ瓨绻濋姀锝嗙【妞ゆ垵娲畷銏ゅ箹娴ｅ厜鎷洪梺纭呭亹閸嬫盯宕濆Δ鍛厸闁告侗鍠氶埥澶愭煟椤垵澧存慨濠勭帛閹峰懘鎼归悷鎵偧闂佹眹鍩勯崹杈╂暜閿熺姴鏋侀柛鎰靛枛鍞梺瀹犳〃缁插ジ鏁冮崒娑氬幈闂佸搫娲㈤崝宀勫几閵堝鐓熼柕鍫濆€告禍楣冩⒒閸屾瑦绁版い顐㈩槸閻ｅ嘲螣鐞涒剝鐏冨┑鐐村灟閸ㄥ湱绮婚弽顓熷€甸柨婵嗛娴滅偟绱掗埦鈧崑鎾绘⒒娓氣偓濞佳勵殽韫囨洖绶ら柛鎾楀嫬鍘归梺缁樺姦閸忔瑦绂嶅鍫熺厵閻庢稒顭囩粻鏍偓鐟版啞缁诲嫰鍩€椤掍緡鍟忛柛鐕佸亰瀹曟儼顦撮柛鏃撶畱椤啴濡堕崱妤冪懆闁诲孩鍑归崣鍐春濞戙垹绠ｉ柨鏃傛櫕閸樺崬鈹戦悙鏉戠仸闁挎洦鍋勯蹇涘Ψ閵夈垺鏂€濡炪倖姊婚幊鎾寸妤ｅ啯鈷掗柛灞剧懅椤︼箓鏌熺喊鍗炰喊妤犵偛锕ㄧ粻娑樷槈濞嗗繐澹嗘俊鐐€栭悧婊堝磻閻愬搫鐤?{installedSkills.length}</Tag>
            <Tag color="blue">闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鎯у⒔閹虫捇鈥旈崘顏佸亾閿濆簼绨奸柟鐧哥秮閺岋綁顢橀悙鎼闂侀潧妫欑敮鎺楋綖濠靛鏅查柛娑卞墮椤ユ艾鈹戞幊閸婃鎱ㄩ悜钘夌；婵炴垟鎳為崶顒佸仺缂佸瀵ч悗顒勬⒑閻熸澘鈷旂紒顕呭灦瀹曟垿骞囬悧鍫㈠幈闂佸綊鍋婇崹鎵閿曞倹鐓熼柕蹇嬪灮鐢稑菐閸パ嶈含闁诡喗鐟╅、鏃堝礋閵娿儰澹曢梺鍝勭▉閸樹粙宕戠€ｎ偆绡€濠电姴鍊绘晶鏇犵棯閸撗呭笡缂佺粯鐩獮瀣枎韫囨洑鎮ｉ梻浣规偠閸斿矂宕愰崸妤€钃熸繛鎴烆焽閺嗗棝鏌嶈閸撶喎鐣烽幋锔藉€烽柛婵嗗閸橀亶姊洪悷閭﹀殶闁稿鍨剁粋宥咁煥閸喓鍘甸梺鍛婄箓鐎氼參藟濠婂厾鐟邦煥閸愩劉鎸冪紓浣介哺閹稿骞忛崨鏉戠闁告瑥锛嶈濮婃椽鎮烽悧鍫濇殘婵犵數鍋涢敃銈夘敋閿濆棛绡€婵﹩鍎甸埡鍛厓閺夌偞澹嗙€佃偐鎲搁弮鍫濊摕婵炴垶菤濡插牓鏌涘▎鎰电劷闁告垵缍婂娲传閸曨偀鍋撻悽绋跨；闁瑰墽绮埛鎺楁煕鐏炲墽鎳嗛柛蹇撶灱缁辨帡顢氶崨顓犱桓闂佽桨绀侀澶愬箖濡も偓閳绘捇宕归鐣屼邯闂備胶绮悧鏇㈠Χ閹间焦鍋樻い鏇楀亾鐎殿喕绮欓、姗€鎮欓悽鍨緫濠碉紕鍋戦崐鏍蓟閵婏附娅犲ù鐘差儐閺咁剚绻濇繝鍌滃闁?{candidateSkills.length}</Tag>
            <Tag color="gold">闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁惧墽鎳撻—鍐偓锝庝簼閹癸綁鏌ｉ鐐搭棞闁靛棙甯掗～婵嬫晲閸涱剙顥氬┑掳鍊楁慨鐑藉磻閻愮儤鍋嬮柣妯荤湽閳ь兛绶氬鏉戭潩鏉堚敩銏ゆ⒒娴ｈ鍋犻柛搴㈡そ瀹曟粓鏁冮崒姘€梺鍛婂姦閸犳鎮￠妷鈺傜厸闁搞儺鐓堝▓鏂棵瑰鍫㈢暫婵﹤鎼晥闁搞儜鈧崑鎾澄旈崨顓狅紱闂佽宕橀崺鏍х暦閸欏绡€闂傚牊绋掑婵堢磼閳锯偓閸嬫捇姊绘担渚劸闁哄牜鍓涢崚鎺戠暆閸曗斁鍋撻崒鐐存優闁革富鍘鹃敍婵囩箾鏉堝墽绋荤憸鏉垮暞缁傚秹鎮欓鍌滅槇闂侀潧楠忕徊鍓ф兜閻愵兙浜滈柟瀛樼箖椤ャ垻鈧娲╃紞鈧紒鐘崇洴瀵剟宕滆閻ｉ箖姊绘担铏瑰笡闁告梹鐟╄矾闁稿瞼鍋涢崥瑙勭箾閸℃璐╅柣鐔煎亰閻撱儵鏌涢鐘茬伄闁哄棭鍋勯埞鎴︻敊绾攱鏁惧┑锛勫仩濡嫯鐏嬮梺鍛婂姂閸斿危閸喓绠鹃柛鈩冦€為幋位澶愭偐閻㈢數锛濋梺绋挎湰閻燂妇绮婃导瀛樼厱闁冲搫鍊绘晶顏堟煟閿濆棛绠炴鐐寸墬閹峰懘鎮锋０浣洪挼濠碉紕鍋戦崐鏍涢崘顔兼瀬妞ゆ洍鍋撶€规洘鍨块獮妯肩磼濡粯鐝抽梺纭呭亹鐞涖儵宕滃┑瀣€剁€广儱顦伴埛鎴︽煕濠靛棗顏柛锝堟缁辨帞鎷犻懠顒€鈪甸悗娈垮枦椤曆囶敇婵傜閱囨い鎰剁秵閳ь剙娲缁樻媴閸涘﹤鏆堥梺鍦焾椤兘骞嗛崟顖ｆ晬闁绘劘灏欓悾鍝勵渻閵堝棙纾甸柛瀣尰椤ㄣ儵鎮欓崣澶樻％濡炪伇鍌滅獢闁哄本绋戦～婵嬵敆婢跺﹤澹堟俊鐐€ら崣鈧繛澶嬫礋楠炴垿宕熼鍌滄嚌濡炪倖鐗楅懝鐐珶閸績鏀介柣鎰▕閸ょ喎鈹戦锝呭籍鐎规洖婀遍幑鍕瑹椤栨稓绋佹繝鐢靛仜濡﹥绂嶅鍐惧晠婵犻潧妫岄弨浠嬫煟濡绲绘い蹇ｅ亰閺岋綁鏁愰崶銊︽瘓闂佸搫鐭夌徊楣冨箚閺冨牆顫呴柣妯哄级閻︽捇姊绘担鍛婂暈闁荤喆鍎靛畷顖炲箻椤旇棄浠掑銈嗘磵閸嬫挾鈧娲栧畷顒勫煡婢跺娼ㄩ柍褜鍓熷畷顒勫醇閺囩啿鎷洪梻鍌氱墛娓氭顬婅閳规垿鍨鹃搹顐㈡灎閻庤娲忛崹浠嬪蓟閸℃鍚嬮柛鈥崇箲鐎氬ジ姊婚崒姘偓鎼佹偋婵犲嫮鐭欓柟鎯х摠濞呯娀鏌￠崶鈺佹瀺缂佽妫欓妵鍕箛閸撲胶校濠电偛鐗婂Λ鍐ㄎ涙担鐟扮窞閻庯絻鍔嬬花濠氭⒑閸濆嫭澶勬い銊ユ噺缁傚秵銈ｉ崘鈹炬嫼闂佸憡绻傜€氼噣鎮炵捄銊х＜閺夊牄鍔嶇粈鍐磼閸屾稑娴柡浣稿暣瀹曟帒顫濇鏍ㄐら梺鑽ゅ枑缁矂鏌婇敐鍛殾婵﹩鍏樺Σ鍫ユ煏韫囧ň鍋撻弬銉ヤ壕闁割煈鍋嗙粻楣冩煕椤愶絿绠樺ù鐘灪缁绘盯宕ㄩ鍡氣偓鍧楁煛鐏炲墽娲撮柡浣瑰姌缁犳盯寮撮悙鑼帓闂傚倷妞掔槐顔惧緤閸ф绀傛慨妞诲亾闁绘侗鍣ｉ獮鎺懳旈埀顒傜不閻樼粯鐓犻柟闂寸劍濞懷呯磼濡や礁娴柡灞界Ф閹风娀寮婚妷銉ュ強婵°倗濮烽崑娑樜涘鍩跺洭宕ｆ径鍫滅盎濡炪倖鍔﹂崑鍌滆姳閻ｅ瞼纾?{runtimeSkills.length}</Tag>
            <Button
              size="small"
              loading={loading || runtimeLoading}
              onClick={() => {
                void loadData(true);
                void loadRuntimeSkills();
              }}
              icon={<RefreshCw size={12} />}
            >
              闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鎯у⒔閹虫捇鈥旈崘顏佸亾閿濆簼绨奸柟鐧哥秮閺岋綁顢橀悙鎼闂侀潧妫欑敮鎺楋綖濠靛鏅查柛娑卞墮椤ユ艾鈹戞幊閸婃鎱ㄩ悜钘夌；婵炴垟鎳為崶顒佸仺缂佸瀵ч悗顒勬倵楠炲灝鍔氭い锔诲灣缁牏鈧綆鍋佹禍婊堟煙閸濆嫮肖闁告柨绉甸妵鍕棘閹稿骸鏋犲┑顔硷功缁垶骞忛崨瀛樺殟闁靛／浣插亾婵犲洦鈷戦柛婵勫劚鏍￠梺鍦焾椤兘鐛崼銉ノ╃憸澶愬磻閹剧粯顥堟繛鎴炵懄閸犳劗绱掗悙顒€鍔ら柕鍫熸倐瀵顓兼径濠佺炊闂佸憡娲﹂崜娆忊枍閵堝鈷戦柟鎯板Г閺侀亶鏌涢妸銉у煟濠碉紕鏁诲畷鐔碱敍濮橀硸鍞洪梻浣虹《閸撴繈濡甸悙瀵哥彾闁哄洨濮风壕浠嬫煕鐏炲墽鎳呮い锔奸檮閵囧嫰鏁傞崹顔肩ギ濡ょ姷鍋為崝娆撶嵁鎼淬劍瀵犲璺虹焾閸?
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
                        闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁惧墽鎳撻—鍐偓锝庝簼閹癸綁鏌ｉ鐐搭棞闁靛棙甯掗～婵嬫晲閸涱剙顥氬┑掳鍊楁慨鐑藉磻濞戔懞鍥偨缁嬫寧鐎梺鐟板⒔缁垶宕戦幇顓滀簻闁哄啫鍊归崵鈧繛瀛樼矒缁犳牠寮诲☉銏犵疀闂傚牊绋掗悘鍫澪旈悩闈涗杭闁搞劏娅ｉ幑銏犫槈閵忕姷顓洪梺缁樺姇閻忔岸宕宠缁绘稓鈧數顭堥埢鍫澝瑰鍡樼【妞ゎ偄绻愮叅妞ゅ繐瀚槐鍫曟⒑閸涘﹥澶勯柛鎾寸懅缁絽鈽夊▎鎴狀啎?
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          !loading ? (
            <Empty description="闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧湱鈧懓瀚崳纾嬨亹閹烘垹鍊為悷婊冪箻瀵娊鏁冮崒娑氬幗闂侀潧绻堥崺鍕倿閸撗呯＜闁归偊鍙庡▓婊堟煛瀹€鈧崰鏍蓟閸ヮ剚鏅濋柍褜鍓熷绋库槈閵忥紕鍘遍梺闈涱煭婵″洨绮婚悙鎼闁绘劕顕晶顏堟嚕閹邦厹浜滈柟鍝勬娴滈箖姊虹拠鍙夌濞存粍绻勯幑銏犫槈閵忕姴绐涘銈嗙墬椤曟挳鏁愰崥鍐查叄瀹曟儼顧傞棅顒夊墮閳规垿鍨惧畷鍥х厽閻庤娲忛崝鎴︺€佸▎鎾崇缁炬澘褰夐崫妤冪磽閸屾艾鈧悂宕愰悜鑺ュ殑闁肩鐏氶崣蹇涙煙閹増顥夌痪顓涘亾闂備浇顫夐崕鐓幬涢崟顖涘珔闁绘柨鎽滅粻楣冩煙鐎电鈧垵顫濋鈺嬬秮瀹曞ジ鎮㈢粙鍨紟婵犲痉鏉库偓鎰板磻閹剧粯鐓熸俊銈傚亾闁挎洦浜滈锝夘敃閿曗偓缁犳氨鎲告径鎰哗濞寸姴顑嗛悡鐔兼煙闁箑澧紒鐙欏洦鐓曢柨婵嗙墛椤ュ鏌嶇憴鍕伌闁诡喗鐟╅崺鈩冩媴瀹勯偊妫滈梻鍌氬€搁崐椋庣矆娓氣偓楠炴牠顢曢敂钘夊壒婵犮垼娉涢懟顖滄閵堝鐓曞┑鐘插閺嬫柨霉濠婂懏娅曠紒杈ㄦ尰閹峰懘宕崟顏勵棜濠电姵顔栭崹鍨叏閵堝桅闁哄啫鍊婚惌娆撴煕閻斿嘲鏆為悽顖涘浮閹儳鈹戠€ｎ亞顦板銈嗗灱婵倗鈧俺鍋愮槐鎾诲磼濞嗘埈妲銈嗗灥濡繈銆侀弽褉鏋庨柟鎯х－閿涚喖姊虹憴鍕棆濠⒀勵殜閹€斥枎閹惧鍘介梺缁樻煥閹碱偊銆傛總鍛婄厵闁稿繒鍘ф慨宥夋煛瀹€瀣М闁轰焦鍔欏畷鎯邦槻妤犵偛顑夊铏规嫚閳ヨ櫕鐏嶇紓渚囧枛濞寸兘宕氶幒妤佸仺缁剧増锚娴滈箖鏌ㄥ┑鍡涱€楀ù婊勭箖缁绘盯宕ㄩ鐘樠勬叏婵犲嫮甯涢柟宄版嚇閹煎綊鎮烽幍顕呭仹闂傚倷绀侀幉鈥愁潖瑜版帗鍋嬫俊銈呭暟閸楁岸鏌ｉ弮鍌氬付妤犵偑鍨虹换娑㈠箣閻愬灚鍣梺鍛婄懃閸熸潙顫忛崫鍕懷囧炊瑜忔导鍕⒑鏉炴壆顦﹂柟鑺ョ矋缁旂喖寮撮悢渚祫闁诲函缍嗛崑鍡涘储闁秵鐓熼煫鍥ㄦ礀娴犳粌顭胯缁瑩鐛繝鍥х妞ゆ挾濮烽敍婊勭箾鏉堝墽鎮奸柟铏崌钘熼悗锝庡墰绾惧ジ寮堕崼娑樺鐎规洖鐬奸埀顒冾潐濞叉粓宕㈣閳ワ箓濡搁埡浣侯槰闂侀潧臎娴ｉ晲绮￠梻鍌欐祰椤曆冾潩閿曞偊缍栧璺衡姇閸濆嫀鐔哥附閼恒儲銇濋柟顔哄灲閹虫牠鍩℃担鎭掑亰闂傚倷娴囬～澶婄暦濮椻偓椤㈡俺顦寸紒顔碱煼閹煎綊顢曢妶鍥╂闂傚倸鍊搁悧濠勭矙閹惧瓨娅犻柡鍥╁亹閺€鑺ャ亜閺冨洤袚闁靛洦绻冮幈銊︾節閸愨斂浠㈤梺鍦劜缁绘繃淇婇崼鏇炲窛闁告侗鍋勯悘顏嗙磼缂佹銆掑ù鐙呯畵瀹曟帒顫濋敐鍛闂佸搫娲㈤崺鍕极鐎ｎ喗鐓ユ繝闈涙－濡牓鏌℃担鍛婎棦闁哄本鐩鎾Ω閵夈儺娼诲┑鐐茬摠缁秶鍒掗幘鎰佹綎闁惧繐婀遍惌娆撴偣閹帒濡挎い鏂匡躬濮婃椽宕ㄦ繝搴ｅ姸闂佸憡鍔х徊楣冩倶娓氣偓濮婃椽妫冨☉杈ㄐ㈤梺鍝勬噺缁捇宕哄☉銏犵闁挎棁袙閹峰姊洪崜鎻掍簽闁哥姵鎹囨俊鎾箳閹搭厾鍞甸悷婊冮鐓ゆ俊顖濆吹閳瑰秴鈹戦悩鍙夌ォ闁轰礁鍟撮弻鏇＄疀鐎ｎ亞浼勯梺鍛婃閸ㄦ媽鐏冮梺缁橈耿濞佳勭閿曞倹鐓曢柡鍐ｅ亾闁荤喆鍎甸幃楣冩倻閼恒儱浜滅紒鐐妞存悂寮查鈧埞鎴︽倷閺夋垹浠搁柣銏╁灡椤ㄥ牓鍩€椤掍椒浜㈡俊顐㈠閸╃偤骞嬮敂钘夆偓鐑芥煠閹间焦娑ф繛鎳峰懐纾藉ù锝堟缁憋妇绱掗鐣屾噰闁绘侗鍠楀鍕箛椤撶喐顏熼梻浣虹帛椤牏浜稿▎鎾村仼濡わ絽鍟埛鎴︽煕閹炬潙绲诲ù婊勭墵閺屾稒鎯旈姀銏犲绩闂佽鍣换婵嬪箖閵忋倖鈷愰柟閭﹀枤閻ｉ箖姊绘笟鈧褔鎮ч崱娑樼９闁告稑锕﹂々鏌ユ煙椤栧棌鍋撻柡鈧禒瀣厓闁芥ê顦伴ˉ婊兠瑰鍕畼缂佽鲸甯為幏鐘诲矗婢舵ɑ顥ｉ梺鎹愬吹閸嬨倝寮婚敐澶婃闁割煈鍠楅崐顖炴⒑閹惰姤鏁遍柛銊ョ秺閹偓妞ゅ繐鐗滈弫鍥煟閹邦厽缍戞繛鍛€楃槐鎺旂磼閵忕姴绠洪梺绋垮婵炲﹪鍨鹃敂鐐磯闁靛绠戦弸鍌炴⒑閸涘﹥澶勯柛妯圭矙瀹曟娊顢橀姀鈥斥偓鐢告煕椤垵浜濈紒鑸电叀閹顫濋悡搴㈢彎闂佺硶鏂侀崑鎾愁渻閵堝棗绗掗柨鏇缁棃鎮介崨濠勫幈闂佽鍎抽顓灻洪幘顔界厵妞ゆ牗鐟х粣鏃傗偓瑙勬礀閵堝憡淇婇悜鑺ユ櫆閻熸瑥瀚褰掓⒒閸屾瑧顦﹂柟璇х磿缁瑩骞嬮敂鑺ユ珖闂侀潧鐗嗗Λ娆撳矗韫囨稒鐓冪憸婊堝礈閻斿娼栨繛宸簻娴肩娀鏌涢弴銊ュ婵炲懌鍊濆娲倻閳哄倹鐝﹂梺鎼炲妼閻栫厧顕?Skill" />
          ) : null
        )}

        {candidateSkills.length > 0 ? (
          <div className="agent-prompt-card">
            <div className="agent-prompt-header">
              <span className="agent-prompt-header-title">Available</span>
              <Input
                placeholder="闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤缂嶅﹪寮婚敐澶婄闁挎繂鎲涢幘缁樼厱闁靛牆鎳庨顓㈡煛鐏炲墽娲存い銏℃礋閺佹劙宕卞▎妯恍氱紓鍌氬€烽懗鑸垫叏闁垮绠鹃柍褜鍓熼弻鈥崇暆閳ь剟宕伴弽顓犲祦闁硅揪绠戠粻娑㈡⒒閸喓鈯曟い鏂垮濮婃椽鎳￠妶鍛€鹃梺鑽ゅ枙娴滎剛鍒掓繝姘閻犲洩灏欓悾鍝勨攽鎺抽崐鏇㈠箠韫囨稑鐤鹃柡灞诲劚缁犲湱绱掗鐓庡辅闁稿鎹囬獮鍥ㄦ媴闁稒鍞夐梻鍌氬€搁崐鐑芥倿閿曞倸绠栭柛顐ｆ礀缁€澶屸偓骞垮劚濞诧箑鐣烽弻銉︾厱妞ゆ劗濮撮崝銈団偓瑙勬尫缁舵岸寮婚垾鎰佸悑閹艰揪绲肩划鎾绘煙閸忓吋鍎楅柣鎾崇墦瀵偊宕卞☉娆戝帗閻熸粍绮撳畷婊冾潩椤撶姭鏀虫繝鐢靛Т濞诧箓宕甸崘顔界厓闁告繂瀚弳鐐烘煥?Skill..."
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
                          Install
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty description={skillSearch ? "婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柛娑橈攻閸欏繘鏌ｉ幋锝嗩棄闁哄绶氶弻娑樷槈濮楀牊鏁鹃梺鍛婄懃缁绘﹢寮婚敐澶婄闁挎繂妫Λ鍕⒑閸濆嫷鍎庣紒鑸靛哺瀵鎮㈤崗灏栨嫽闁诲酣娼ф竟濠偽ｉ鍓х＜闁诡垎鍐ｆ寖缂備緡鍣崹鎶藉箲閵忕姭妲堥柕蹇曞Х椤撴椽姊虹紒妯哄闁诲繑宀稿畷瀹狀槾缂佽鲸鎸婚幏鍛矙濞嗙偓娈洪梻浣侯焾椤戝啴宕愬┑鍡╁殨閻犲洦绁村Σ鍫ユ煏韫囨洖顫嶉柕濠忚礋娴滄粓鏌￠崘銊モ偓鍝ユ暜閼哥偣浜滄い鎰枑濞呭洨绱掓潏銊﹀鞍闁瑰嘲鎳橀獮鎾诲箳瀹ュ拋妫滈梻鍌氬€风粈浣圭珶婵犲洤纾婚柛鈩冪☉缁愭鏌熼幑鎰【濠殿噮鍓熼弻宥堫檨闁告挾鍠庨～蹇旂節濮橆剛锛滃┑顔矫畷顒劼烽埀顒傜磽閸屾瑧顦︽い鎴濇閺侇噣鏁撻悩鍙夌€悗骞垮劚椤︻垳鐚惧澶嬬厱妞ゆ劑鍊曢弸鏃堟煕濮椻偓缁犳牕顫忓ú顏勪紶闁告洖鐏氭瓏婵犵數鍋涢ˇ鏉棵哄Ο鑲╃焿闁圭儤顨呴～鍛存煏閸繃顥犻柛姗嗕邯濮婅櫣鍖栭弴鐐测拤闂佹寧姘ㄧ槐鎺懳旀担鍝ョ懖闂侀潧娲ょ€氫即銆侀弴銏℃櫜闁搞儮鏅濋弶浠嬫⒒娴ｈ姤銆冮柣鎺炵畵瀹曟繂鈻庤箛鏇熸闂侀潧艌閺呪晠寮崱娑欑厓鐟滄粓宕滈悢缁橈紓婵犳鍠楅…鍫ュ春閺嶎厼鐓曢柟杈鹃檮閸嬶綁鏌涢妷鎴濆暟妤犲洭姊洪崫銉ヤ粶妞わ缚鍗虫俊鐢稿礋椤栵絾鏅濋梺闈涚箚閺呮粎鐟ч梻浣虹帛閹稿爼宕愰弽顐ｅ床婵犻潧娲ㄧ弧鈧梺绋挎湰閸戣绂掓ィ鍐┾拺闁告稑锕﹂幊鍐磼缂佹ê濮岄柣蹇撳暣濮婃椽骞愭惔锝囩暤闂佺懓鍟块柊锝咁嚕閸愭祴鏋庨煫鍥风稻缁傚棝姊洪崨濠勨槈闁宦板姂閸╂盯骞嬮敂鐣屽幈闂佹寧妫侀褔鐛弽銊ｄ簻闁挎繂鎳庨幃鎴犵磼缂佹绠炲┑顔瑰亾闂佸疇妫勫Λ娑㈠礉妞嬪海纾藉〒姘搐閺嬫稒銇勯鐘插幋闁绘侗鍠楅幆鏃堝Ω閿曗偓濞堢喖姊洪棃娑崇础闁告劑鍔庨濂告⒒閸屾瑦绁版い鏇嗗應鍋撳☉鎺撴珖缂侇喗鐟╅獮鎺戭渻閻戔晛浜鹃柨鏇炲€搁悙濠囨煃閸濆嫬鏆曠紒妤€顦埞鎴︻敊缁涘鍔告繛瀛樼矤閸撴稒绔熼弴銏″亗妤犵偟鍠庣紞濠囧极閹版澘閱囨い鎰剁悼缁夌兘姊虹拠鑼濡ょ姴绻樺浠嬪礋椤栨氨鐤?Skill" : "婵犵數濮烽弫鍛婃叏閻戣棄鏋侀柛娑橈攻閸欏繘鏌ｉ幋锝嗩棄闁哄绶氶弻娑樷槈濮楀牊鏁鹃梺鍛婄懃缁绘﹢寮婚敐澶婄闁挎繂妫Λ鍕⒑閸濆嫷鍎庣紒鑸靛哺瀵鎮㈤崗灏栨嫽闁诲酣娼ф竟濠偽ｉ鍓х＜闁诡垎鍐ｆ寖缂備緡鍣崹鎶藉箲閵忕姭妲堥柕蹇曞Х椤撴椽姊虹紒妯哄闁诲繑宀稿畷瀹狀槾缂佽鲸鎸婚幏鍛矙濞嗙偓娈洪梻浣侯焾椤戝啴宕愬┑鍡╁殨閻犲洦绁村Σ鍫ユ煏韫囨洖顫嶉柕濠忚礋娴滄粓鏌￠崘銊モ偓鍝ユ暜閼哥偣浜滄い鎰枑濞呭洨绱掓潏銊﹀鞍闁瑰嘲鎳橀獮鎾诲箳瀹ュ拋妫滈梻鍌氬€风粈浣圭珶婵犲洤纾婚柛鈩冪☉缁愭鏌熼幑鎰【濠殿噮鍓熼弻宥堫檨闁告挾鍠庨～蹇旂節濮橆剛锛滃┑顔矫畷顒劼烽埀顒傜磽閸屾瑧顦︽い鎴濇閺侇噣鏁撻悩鍙夌€悗骞垮劚椤︻垳鐚惧澶嬬厱妞ゆ劑鍊曢弸鏃堟煕濮椻偓缁犳牕顫忓ú顏勪紶闁告洖鐏氭瓏婵犵數鍋涢ˇ鏉棵哄Ο鑲╃焿闁圭儤顨呴～鍛存煏閸繃顥犻柛姗嗕邯濮婅櫣鍖栭弴鐐测拤闂佹寧姘ㄧ槐鎺懳旀担鍝ョ懖闂侀潧娲ょ€氫即銆侀弴銏℃櫜闁搞儮鏅濋弶浠嬫⒒娴ｈ姤銆冮柣鎺炵畵瀹曟繂鈻庤箛鏇熸闂侀潧艌閺呪晠寮崱娑欑厓鐟滄粓宕滈悢缁橈紓婵犳鍠楅…鍫ュ春閺嶎厼鐓曢柟杈鹃檮閸嬶綁鏌涢妷鎴濆暟妤犲洭姊洪崫銉ヤ粶妞わ缚鍗虫俊鐢稿礋椤栵絾鏅濋梺闈涚箚閺呮粎鐟ч梻浣虹帛閹稿爼宕愬┑瀣摕鐎广儱顦导鐘绘煕閺囥劌浜濇繛鍫濆缁辨挻鎷呴幓鎺嶅濠电姷鏁告慨鎾磹閸洖鐒垫い鎺嶇缁楁帗銇勯锝囩疄闁轰焦鍔欏畷銊╊敆閳ь剟藟濮樿埖鈷掗柛灞剧懅缁愭梹绻涙担鍐插悩濞戙垹绫嶉柛灞剧矌閻掑吋绻涢幘鏉戠劰闁稿鎹囬弻娑㈠煘閸喖濮曢悗鍨緲鐎氼厾鎹㈠☉銏狀潊闁靛繒濮甸悘鍫ユ⒑閸濆嫯顫﹂柛鏂块叄閸┾偓妞ゆ帒锕﹂崚浼存煟韫囨梹鐨戠紒杈╁仧娴狅妇鎲撮敐鍡樻澑闂備胶绮摫妞ゆ梹鐗犲鎶筋敍濞戞绠氶梺鍦帛鐢宕甸崶鈹惧亾鐟欏嫭绀€缂傚秴锕よ灋闁告劑鍔夊Σ鍫熸叏濮楀棗骞楁い鏃€娲熷缁樻媴閸︻厽鑿囬梺鎼炲妼椤嘲顕ｉ锕€绠瑰ù锝囨嚀閸撳綊姊虹憴鍕闁糕晜鐗犲畷浼村箛閻楀牏鍘藉┑掳鍊愰崑鎾绘煟濡も偓濡稓鍒掗鐑嗘僵闁煎摜鏁搁崢鎾绘⒒娴ｅ摜浠㈡い鎴濇噽缁參骞掑Δ渚囨⒖婵犮垼鍩栭崝鏍偂閵夛妇绡€闂傚牊绋掗ˉ鐐烘煕閿濆棙銇濋柡灞剧洴閹垽宕崟顏咁潟闂備礁鎼張顒勬儎椤栫偛绠栭柕蹇嬪€曟导鐘绘煕閺囥劋绨奸柛鏇炲暣濮婄粯绗熼埀顒勫焵椤掍胶銆掗柍瑙勫浮閺屾盯寮捄銊愩倝鏌熼獮鍨仼闁宠鍨归埀顒婄秵娴滅偤藝閺夋娓婚柕鍫濇鐏忕敻鏌涚€ｎ剙鏋涙い銏℃礃缁轰粙宕ㄦ繛鐐濠电偞鎸婚崺鍐磻閹剧粯鐓冪憸婊堝礈濮樿京鐭欓柟鎹愵嚙閻撴﹢鏌熼悜姗嗘畷闁绘挻娲熼弻锟犲磼濠靛洨銆婇梺缁樺笚閹倿寮婚悢纰辨晪闁逞屽墰缁寮介鐐寸€梺鐟板⒔缁垶宕戦幇鐗堢厾缁炬澘宕晶濠氭煕濮橆剦鍎旀慨濠勭帛閹峰懘鎮烽弶鍨戞繝鐢靛仜閻°劌鐣濈粙璺ㄦ殾闁硅揪绠戦獮銏′繆椤栨壕鎷℃繛?Skill"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                      Uninstall
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      loading={saving}
                      disabled={!selectedSkillDetail.enabled}
                      onClick={() => void handleInstall(selectedSkillDetail.skillKey)}
                    >
                      Install
                    </Button>
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
                    <Text type="secondary">Skill 闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳婀遍埀顒傛嚀鐎氼參宕崇壕瀣ㄤ汗闁圭儤鍨归崐鐐烘偡濠婂啰绠荤€殿喗濞婇弫鍐磼濞戞艾骞堟俊鐐€ら崢浠嬪垂閸偆顩叉繝闈涱儐閻撴洘绻涢崱妤冪缂佺姴顭烽弻锛勪沪缁嬪灝鈷夐悗鍨緲鐎氼噣鍩€椤掑﹦绉靛ù婊勭箞椤㈡瑩宕ㄧ€涙ê浠┑鐘诧工閹冲酣銆傛總鍛婂仺妞ゆ牗绋戠粭褏绱掗鑲╁ⅱ闁逞屽墾缂嶅棝宕戞担鍦洸婵犲﹤鐗婇悡娑氣偓骞垮劚閸燁偅淇婇崸妤佺厓缂備焦蓱瀹曞矂鏌″畝鈧崰鎾跺垝濞嗘挸鍨傛い鏃囧Г椤旀帗绻濆▓鍨灈闁挎洏鍎遍—鍐寠婢跺本娈鹃梺闈涱煭婵″洨寮ч埀顒勬⒑閸涘﹤濮﹂柣鎾崇墕鍗遍梺顒€绉甸埛鎺懨归敐鍫綈闁稿濞€閺屾盯寮捄銊愶絿绱掗弮鍌氭灈鐎规洖宕灒闁兼祴鏅涙鍕⒒娴ｅ憡鎯堟繛灞傚灲瀹曠銇愰幒鎾跺弳闂侀潧鐗嗗Λ鏃傛崲閸℃稒鐓忛柛顐ｇ箖閸ｅ綊鏌￠崱妯兼噮闁瑰弶鎮傚鍫曞垂椤曞懍绱旀繝娈垮枛閿曘儱顪冩禒瀣祦闁哄稁鍘介崐鐑芥煙缂佹ê绗掓い顐ｅ灴濮婄粯鎷呴崨濠傛殘闂佸搫琚崝鎴﹀蓟婵犲洦鏅插璺猴攻濡差剟姊洪棃娑辨缂佺姵鍨瑰▎銏ゆ倷绾版ê浜鹃柛蹇擃槸娴滈箖姊洪柅鐐茶嫰婢ф澘顭跨憴鍕缂佽桨绮欏畷銊︾節閸曨偄绗氶梺鑽ゅ枑缁秶鍒掗幘宕囨殾婵犲﹤鍠氬鈺傘亜閹烘埈妲告繛鍫亰濮婃椽宕ㄦ繝鍐槱闂佹悶鍔嶆竟鍡欏垝鐠囨祴妲堟繛鍡楃С缁ㄥ姊虹憴鍕婵炲绋戦悺顓熶繆閵堝洤啸闁稿鍋ら妴鍐幢濞嗘劕搴婂┑鐘绘涧閻楀棝寮搁崼鐔剁箚妞ゆ牗绋掗妵鐔哥箾閸忕厧鐏存慨濠冩そ楠炴牠鎮欓幓鎺濈€村┑鐘垫暩閸嬫盯鏁冮妶澶嬪仼闁绘垼妫勯～鍛存煥濠靛棗顒㈤柍璇茬焸閺岋絾鎯旈妶搴㈢秷濠电偛寮堕…鍥箲閵忋倕绀嬫い鏍ㄦ皑閸旓箑顪冮妶鍡楃瑨闁挎洩濡囩划鏃堟偨閸涘﹦鍘遍梺瑙勫劤椤曨參濡撮幒鎴唵閻熸瑥瀚粈瀣煙椤曞棛绡€闁绘侗鍣ｉ幃銏☆槹鎼达及銊╂⒑鏉炴壆鍔嶉柛鏃€鐟ラ悾閿嬬附閸撳弶鏅濋梺鎸庣箓濞层劌鏆╃紓鍌氬€搁崐鎼佸磹瀹勬噴褰掑炊椤掆偓閺勩儵鏌″搴″箺闁稿鍊块弻銊╂偄閸濆嫅銏ゆ煢?..</Text>
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
          !loading ? <Empty description="Select an uninstalled skill to view details" /> : null
        )}
      </Space>
    </>
  );
}
