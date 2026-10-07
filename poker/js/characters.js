/* 角色資料：外觀（給 avatar.js 畫）、玩法個性、技巧加成、簡介
 * look 欄位：
 *   head: round | tall | kid | alien | robot | chubby | octo
 *   skin: 膚色；hair: { style, color }；shirt: { type, color, color2 }
 *   acc: 配件陣列（見 avatar.js）；stubble: 鬍渣
 * 真實人物皆為「惡搞諷刺版」卡通角色，名稱與台詞可在此檔與 dialogue.js 自由修改。
 */
(function (root) {
  const HP = (root.HP = root.HP || {});
  const Y = '#FFD521'; // 經典卡通黃皮膚

  const CHARS = {
    // ── 主角 ──
    hero_a: { name: '你', title: '夢中的主角', look: { head: 'tall', skin: Y, hair: { style: 'short', color: '#3b2a1a' }, shirt: { type: 'casino', color: '#1f6feb', color2: '#ffd700' }, stubble: true } },
    hero_b: { name: '你', title: '夢中的主角', look: { head: 'round', skin: Y, hair: { style: 'bob', color: '#7a3b12' }, shirt: { type: 'casino', color: '#d6336c', color2: '#ffd700' }, acc: ['earrings'] } },
    hero_c: { name: '你', title: '夢中的主角', look: { head: 'round', skin: Y, hair: { style: 'mohawk', color: '#2b8a3e' }, shirt: { type: 'tshirt', color: '#212529' }, acc: ['sunglasses'] } },

    // ── 第 1 關 幼稚園 ──
    k_sakura: { name: '小櫻', title: '害羞的蘋果臉', style: 'rock', skill: -0.05, bio: '最喜歡畫小花，拿到好牌會偷偷臉紅。', look: { head: 'round', skin: Y, hair: { style: 'pigtails', color: '#4a2c1a' }, shirt: { type: 'smock', color: '#74c0fc' }, acc: ['kinder_hat', 'blush'] } },
    k_ryu:    { name: '阿龍', title: '調皮搗蛋王', style: 'maniac', skill: -0.08, bio: '每一手都想全下，因為「全下聽起來很帥」。', look: { head: 'kid', skin: Y, hair: { style: 'none', color: Y }, shirt: { type: 'smock', color: '#74c0fc' }, acc: ['bandaid'] } },
    k_buta:   { name: '阿肥', title: '點心守護者', style: 'station', skill: -0.06, bio: '只要有餅乾就會一直跟注。', look: { head: 'chubby', skin: Y, hair: { style: 'short', color: '#222' }, shirt: { type: 'smock', color: '#74c0fc' }, acc: ['kinder_hat', 'crumbs'] } },
    k_mimi:   { name: '美美', title: '小公主班長', style: 'tag', skill: 0.0, bio: '班長大人，規則背得比老師還熟。', look: { head: 'round', skin: Y, hair: { style: 'bun', color: '#e8590c' }, shirt: { type: 'smock', color: '#f783ac' }, acc: ['bow', 'tiara'] } },

    // ── 第 2 關 總統府 ──
    tw_pres:  { name: '總統', title: '府裡的大老闆', style: 'tag', skill: 0.05, bio: '說話四平八穩，下注卻毫不手軟。', look: { head: 'tall', skin: Y, hair: { style: 'short', color: '#222' }, shirt: { type: 'suit', color: '#1c2b4a', color2: '#c92a2a' }, acc: ['glasses', 'flag_pin'] } },
    tw_vp:    { name: '副總統', title: '永遠的二把手', style: 'tricky', skill: 0.02, bio: '笑容可掬，但慢打功力一流。', look: { head: 'round', skin: Y, hair: { style: 'bob', color: '#333' }, shirt: { type: 'suit', color: '#5f3dc4', color2: '#fff' }, acc: ['pearl', 'flag_pin'] } },
    tw_prem:  { name: '行政院長', title: '預算大總管', style: 'rock', skill: 0.04, bio: '每一分籌碼都要編列預算。', look: { head: 'tall', skin: Y, hair: { style: 'combover', color: '#888' }, shirt: { type: 'suit', color: '#343a40', color2: '#1971c2' }, acc: ['glasses'] } },
    tw_opp:   { name: '在野黨主席', title: '質詢魔人', style: 'lag', skill: 0.03, bio: '你的每一注他都要質詢到底。', look: { head: 'tall', skin: Y, hair: { style: 'slick', color: '#111' }, shirt: { type: 'suit', color: '#0b7285', color2: '#ffd43b' }, acc: ['mustache:#111'], stubble: true } },

    // ── 第 3 關 午餐桌 ──
    o_kevin:  { name: 'Kevin', title: '會計部的 Kevin', style: 'station', skill: 0.0, bio: '算帳很慢，算牌更慢，但他有辣椒醬。', look: { head: 'chubby', skin: Y, hair: { style: 'bald2', color: '#5c3d1e' }, shirt: { type: 'shirt', color: '#e9ecef', color2: '#495057' }, acc: [], stubble: true } },
    o_karen:  { name: 'Karen 經理', title: '要找你主管', style: 'tag', skill: 0.06, bio: '下注前一定要先問「你們的規則是誰定的？」', look: { head: 'round', skin: Y, hair: { style: 'asym', color: '#f2c94c' }, shirt: { type: 'suit', color: '#c2255c', color2: '#fff' }, acc: ['earrings'] } },
    o_bob:    { name: 'IT 阿伯', title: '你重開機了嗎', style: 'tricky', skill: 0.05, bio: '修電腦三十年，修理對手更快。', look: { head: 'tall', skin: Y, hair: { style: 'bald2', color: '#777' }, shirt: { type: 'shirt', color: '#868e96', color2: '#212529' }, acc: ['glasses', 'beard:#888', 'lanyard'] } },
    o_amy:    { name: '實習生 Amy', title: '社群小編', style: 'lag', skill: -0.02, bio: '一邊打牌一邊直播，籌碼跟流量都要。', look: { head: 'round', skin: Y, hair: { style: 'ponytail', color: '#212529' }, shirt: { type: 'tshirt', color: '#ae3ec9' }, acc: ['glasses', 'lanyard'] } },

    // ── 第 4 關 公路之旅（三站） ──
    r_earl:   { name: '大個子 Earl', title: '卡車司機', style: 'station', skill: 0.04, bio: '開了 40 年 66 號公路，最愛加油站咖啡。', look: { head: 'chubby', skin: Y, hair: { style: 'short', color: '#6b4f2a' }, shirt: { type: 'flannel', color: '#c92a2a', color2: '#5c0f0f' }, acc: ['trucker_cap', 'beard:#6b4f2a'] } },
    r_dolly:  { name: 'Dolly 老闆娘', title: '加油站兼賭場老闆', style: 'tag', skill: 0.06, bio: '油價和底池她都算得一清二楚。', look: { head: 'round', skin: Y, hair: { style: 'big', color: '#ffe066' }, shirt: { type: 'shirt', color: '#f06595', color2: '#fff' }, acc: ['earrings', 'lipstick'] } },
    r_tex:    { name: '牛仔 Tex', title: '小鎮快槍手', style: 'lag', skill: 0.06, bio: '拔槍很快、全下更快。', look: { head: 'tall', skin: Y, hair: { style: 'short', color: '#4d3319' }, shirt: { type: 'vest', color: '#8d5524', color2: '#f1f3f5' }, acc: ['hat_cowboy', 'mustache:#4d3319'], stubble: true } },
    r_granny: { name: 'Mae 奶奶', title: '退休賓果女王', style: 'tricky', skill: 0.10, bio: '看起來慈祥，其實是鎮上最會算牌的人。', look: { head: 'round', skin: Y, hair: { style: 'bun', color: '#dee2e6' }, shirt: { type: 'cardigan', color: '#9775fa', color2: '#fff' }, acc: ['glasses'] } },
    r_mike:   { name: '神秘麥克', title: '水壩邊的魔術師', style: 'tricky', skill: 0.10, bio: '牌會不會從袖子裡跑出來？你自己看。', look: { head: 'tall', skin: Y, hair: { style: 'slick', color: '#111' }, shirt: { type: 'tux', color: '#212529', color2: '#c92a2a' }, acc: ['tophat', 'mustache:#111'] } },
    r_vinnie: { name: '經理 Vinnie', title: '賭場樓層經理', style: 'tag', skill: 0.12, bio: '他看過的老千比你看過的牌還多。', look: { head: 'tall', skin: Y, hair: { style: 'slick', color: '#495057' }, shirt: { type: 'suit', color: '#343a40', color2: '#ffd43b' }, acc: ['earpiece'], stubble: true } },

    // ── 第 5 關 紐約地下聯盟（章節制） ──
    n_joey:   { name: '兩毛錢 Joey', title: '街頭小混混', style: 'maniac', skill: 0.04, bio: '第一章：布魯克林街角，他用牛奶箱當牌桌。', look: { head: 'kid', skin: Y, hair: { style: 'beanie', color: '#e03131' }, shirt: { type: 'hoodie', color: '#495057' }, acc: ['toothpick'] } },
    n_lola:   { name: '酒保 Lola', title: '地下酒吧的耳目', style: 'tricky', skill: 0.10, bio: '第二章：她倒酒時聽見所有秘密，包括你的底牌。', look: { head: 'round', skin: Y, hair: { style: 'bob', color: '#212529' }, shirt: { type: 'vest', color: '#212529', color2: '#fff' }, acc: ['earrings', 'lipstick'] } },
    n_sal:    { name: '胖子 Sal', title: '地下錢莊老闆', style: 'rock', skill: 0.13, bio: '第三章：輸給他的人，利息會一直滾。', look: { head: 'chubby', skin: Y, hair: { style: 'bald2', color: '#333' }, shirt: { type: 'suit', color: '#5c940d', color2: '#fff' }, acc: ['cigar', 'gold_chain'], stubble: true } },
    n_don:    { name: 'Don Vittorio', title: '黑幫老大', style: 'gto', skill: 0.18, bio: '最終章：他從不提高音量，因為他不需要。', look: { head: 'tall', skin: Y, hair: { style: 'slick', color: '#adb5bd' }, shirt: { type: 'tux', color: '#111', color2: '#fff' }, acc: ['fedora', 'rose'], stubble: true } },

    // ── 第 6 關 沙漠小鎮賭場（惡搞致敬，非官方角色） ──
    s_homie:  { name: 'Homie', title: '甜甜圈大叔', style: 'station', skill: 0.06, bio: '「嗯～籌碼…」他把籌碼當甜甜圈看。', look: { head: 'tall', skin: Y, hair: { style: 'bald2', color: '#333' }, shirt: { type: 'shirt', color: '#fff', color2: '#fff' }, stubble: true, acc: ['donut'] } },
    s_bartie: { name: 'Bartie', title: '滑板小惡魔', style: 'maniac', skill: 0.06, bio: '把對手的椅子塗上膠水是他的熱身。', look: { head: 'kid', skin: Y, hair: { style: 'none', color: Y }, shirt: { type: 'tshirt', color: '#f76707' }, acc: ['slingshot'] } },
    s_margie: { name: 'Margie', title: '藍色高塔髮型媽媽', style: 'rock', skill: 0.10, bio: '溫柔但精明，會發出「嗯～～」的不滿聲。', look: { head: 'round', skin: Y, hair: { style: 'tower', color: '#3b5bdb' }, shirt: { type: 'dress', color: '#69db7c' }, acc: ['pearl'] } },
    s_moey:   { name: 'Moey', title: '小鎮酒館老闆', style: 'lag', skill: 0.12, bio: '脾氣很差，但他的酒館是唯一的牌室。', look: { head: 'tall', skin: Y, hair: { style: 'combover', color: '#868e96' }, shirt: { type: 'apron', color: '#adb5bd', color2: '#fff' }, stubble: true } },

    // ── 第 7 關 白宮橢圓辦公室（政治諷刺版） ──
    w_trump:  { name: '川普', title: '交易的藝術', style: 'lag', skill: 0.14, bio: '「這是史上最棒的牌局，大家都這麼說。」', look: { head: 'tall', skin: '#ffb347', hair: { style: 'swoop', color: '#ffd43b' }, shirt: { type: 'suit', color: '#1c2b4a', color2: '#e03131' }, acc: ['flag_pin', 'long_tie:#e03131'] } },
    w_hegseth:{ name: '赫格賽斯', title: '國防（戰爭）部長', style: 'tag', skill: 0.14, bio: '把每一手牌都當成軍事行動。', look: { head: 'tall', skin: Y, hair: { style: 'slick', color: '#6b4f2a' }, shirt: { type: 'suit', color: '#2b3a2e', color2: '#1971c2' }, acc: ['flag_pin', 'tattoo'], stubble: true } },
    w_agent:  { name: '特勤探員 K', title: '永遠戴墨鏡', style: 'rock', skill: 0.15, bio: '面無表情，連撲克臉都戴墨鏡。', look: { head: 'tall', skin: Y, hair: { style: 'short', color: '#111' }, shirt: { type: 'suit', color: '#111', color2: '#111' }, acc: ['sunglasses', 'earpiece'] } },
    w_press:  { name: '新聞秘書', title: '「下一題」', style: 'tricky', skill: 0.13, bio: '任何問題她都能轉移話題，包括你的加注。', look: { head: 'round', skin: Y, hair: { style: 'long', color: '#f2c94c' }, shirt: { type: 'suit', color: '#c92a2a', color2: '#fff' }, acc: ['cross_necklace', 'earrings'] } },

    // ── 第 8 關 天堂 ──
    h_jesus:  { name: '耶穌', title: '和平之子', style: 'gto', skill: 0.18, bio: '他總是原諒你的詐唬，但不會因此跟注。', look: { head: 'tall', skin: Y, hair: { style: 'long', color: '#7a4b22' }, shirt: { type: 'robe', color: '#fff', color2: '#c92a2a' }, acc: ['halo', 'beard:#7a4b22'] } },
    h_moses:  { name: '摩西', title: '十誡傳遞者', style: 'rock', skill: 0.16, bio: '帶著石板來牌桌，上面寫著第十一誡：不可偷看。', look: { head: 'tall', skin: Y, hair: { style: 'wild', color: '#f1f3f5' }, shirt: { type: 'robe', color: '#c9a66b', color2: '#7a4b22' }, acc: ['longbeard:#f1f3f5', 'staff'] } },
    h_noah:   { name: '挪亞', title: '方舟船長', style: 'tricky', skill: 0.15, bio: '凡事兩兩成對，所以他特別喜歡口袋對子。', look: { head: 'chubby', skin: Y, hair: { style: 'bald2', color: '#ced4da' }, shirt: { type: 'robe', color: '#4dabf7', color2: '#1864ab' }, acc: ['longbeard:#ced4da'] } },
    h_peter:  { name: '聖彼得', title: '天國守門人', style: 'tag', skill: 0.17, bio: '握有天國鑰匙，也握有堅果牌（nuts）。', look: { head: 'round', skin: Y, hair: { style: 'bald2', color: '#adb5bd' }, shirt: { type: 'robe', color: '#ffe8cc', color2: '#d9480f' }, acc: ['halo', 'beard:#adb5bd', 'keys'] } },

    // ── 第 9 關 佛國淨土 ──
    b_buddha: { name: '釋迦牟尼佛', title: '覺者', style: 'gto', skill: 0.19, bio: '心如止水，表情永遠平靜——你讀不到任何訊息。', look: { head: 'round', skin: '#ffd43b', hair: { style: 'ushnisha', color: '#1c3d7a' }, shirt: { type: 'kasaya', color: '#e8590c', color2: '#c92a2a' }, acc: ['aura', 'urna', 'long_ears'] } },
    b_guanyin:{ name: '觀世音菩薩', title: '聞聲救苦', style: 'tag', skill: 0.17, bio: '能聽見世間一切聲音，包括你心跳加速的聲音。', look: { head: 'round', skin: '#ffe3a3', hair: { style: 'veil', color: '#fff' }, shirt: { type: 'robe', color: '#fff', color2: '#74c0fc' }, acc: ['aura', 'urna', 'vase'] } },
    b_maitreya:{ name: '彌勒佛', title: '大肚能容', style: 'station', skill: 0.15, bio: '笑口常開，輸贏都笑，所以你永遠猜不透。', look: { head: 'chubby', skin: Y, hair: { style: 'none', color: Y }, shirt: { type: 'open_robe', color: '#f08c00', color2: '#ffd43b' }, acc: ['long_ears', 'beads'] } },
    b_jigong: { name: '濟公', title: '瘋癲活佛', style: 'maniac', skill: 0.16, bio: '鞋兒破、帽兒破，出牌路數更是破天荒。', look: { head: 'tall', skin: Y, hair: { style: 'none', color: Y }, shirt: { type: 'patched', color: '#a9a9a9', color2: '#6b4f2a' }, acc: ['jigong_hat', 'fan', 'gourd'], stubble: true } },

    // ── 第 10 關 宇宙 ──
    a_zorg:   { name: 'Zorg', title: '綠色大頭星人', style: 'tag', skill: 0.19, bio: '他的大腦比你的籌碼還大。', look: { head: 'alien', skin: '#69db7c', hair: { style: 'none' }, shirt: { type: 'spacesuit', color: '#ced4da', color2: '#1971c2' }, acc: ['antenna'] } },
    a_octa:   { name: 'Octavia', title: '八爪星人', style: 'lag', skill: 0.19, bio: '八隻手可以同時玩八桌，今天只專心對付你。', look: { head: 'octo', skin: '#da77f2', hair: { style: 'none' }, shirt: { type: 'none', color: '#da77f2' }, acc: ['monocle'] } },
    a_unit9:  { name: 'Unit-9', title: '計算型機器人', style: 'gto', skill: 0.21, bio: '每秒模擬一億手牌。嗶嗶。', look: { head: 'robot', skin: '#adb5bd', hair: { style: 'none' }, shirt: { type: 'robot', color: '#868e96', color2: '#4dabf7' }, acc: ['antenna_bulb'] } },
    a_xenon:  { name: '宇宙大帝 Xenon', title: '銀河賭場之主', style: 'gto', skill: 0.24, bio: '贏過他，你就能從夢中醒來。', look: { head: 'alien', skin: '#748ffc', hair: { style: 'none' }, shirt: { type: 'cape', color: '#5f3dc4', color2: '#ffd43b' }, acc: ['crown', 'third_eye'] } },
  };

  // 背景中跑龍套的角色（不參與牌局）
  const EXTRAS = {
    teacher: { name: '老師', look: { head: 'round', skin: Y, hair: { style: 'bun', color: '#222' }, shirt: { type: 'apron', color: '#ffd8a8', color2: '#fff' }, acc: ['glasses'] } },
    guard_tw: { name: '憲兵', look: { head: 'tall', skin: Y, hair: { style: 'short', color: '#111' }, shirt: { type: 'suit', color: '#e9ecef', color2: '#111' }, acc: ['helmet_white'] } },
    janitor: { name: '清潔阿姨', look: { head: 'round', skin: Y, hair: { style: 'perm', color: '#555' }, shirt: { type: 'apron', color: '#4dabf7', color2: '#fff' } } },
    wife: { name: '老婆', look: { head: 'round', skin: Y, hair: { style: 'ponytail', color: '#7a3b12' }, shirt: { type: 'tshirt', color: '#20c997' }, acc: ['sunglasses_top'] } },
    kid: { name: '小孩', look: { head: 'kid', skin: Y, hair: { style: 'none', color: Y }, shirt: { type: 'tshirt', color: '#fab005' } } },
    dog: { name: '小狗 旺財', look: { head: 'dog', skin: '#c08552' } },
    cat: { name: '小貓 咪咪', look: { head: 'cat', skin: '#ff922b' } },
    thug: { name: '保鑣', look: { head: 'tall', skin: Y, hair: { style: 'short', color: '#111' }, shirt: { type: 'suit', color: '#212529', color2: '#111' }, acc: ['sunglasses'], stubble: true } },
    angel: { name: '小天使', look: { head: 'round', skin: Y, hair: { style: 'curly', color: '#ffe066' }, shirt: { type: 'robe', color: '#fff', color2: '#fff' }, acc: ['halo', 'wings'] } },
    sheep: { name: '迷途小羊', look: { head: 'sheep', skin: '#f8f9fa' } },
    wukong: { name: '孫悟空', look: { head: 'monkey', skin: '#c08552' } },
    bajie: { name: '豬八戒', look: { head: 'pig', skin: '#ffc9c9' } },
    novice: { name: '小沙彌', look: { head: 'round', skin: Y, hair: { style: 'none', color: Y }, shirt: { type: 'robe', color: '#ffa94d', color2: '#e8590c' }, acc: ['monk_dots'] } },
    ufo: { name: '小飛碟', look: { head: 'ufo', skin: '#69db7c' } },
    astronaut: { name: '迷路的太空人', look: { head: 'round', skin: Y, hair: { style: 'none' }, shirt: { type: 'spacesuit', color: '#f1f3f5', color2: '#e03131' }, acc: ['helmet_glass'] } },
  };

  HP.Characters = { CHARS, EXTRAS };
})(typeof window !== 'undefined' ? window : globalThis);
