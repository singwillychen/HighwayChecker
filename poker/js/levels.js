/* 關卡設定
 * stages：一關可分多個「站／章節」，每站需把該站對手全部贏下桌才算過。
 * chips：每位玩家起始籌碼；blinds：盲注表；every：每幾手升盲。
 * extras：背景跑龍套角色（高畫質才會出現）。
 */
(function (root) {
  const HP = (root.HP = root.HP || {});

  const schedule = (base) => [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30, 40, 60, 80, 100].map((m) => {
    const bb = Math.round(base * m);
    return [Math.floor(bb / 2), bb];
  });

  const PROLOGUE = [
    '某個平凡的夜晚，你在沙發上滑著手機，一邊看撲克比賽重播……',
    '眼皮越來越重，電視裡發牌員的聲音越來越遠。',
    '「先生，輪到你了。」一張黃澄澄的卡通臉在你面前眨眼。',
    '你低頭一看——自己也變成了卡通人物，手上還握著兩張底牌！',
    '一位穿著亮片西裝的神秘發牌員宣布：「想醒來？就把夢裡每一張牌桌的對手全部贏下桌。」',
    '「一共十桌。從……幼稚園開始。」',
  ];

  const EPILOGUE = [
    '宇宙大帝 Xenon 推出最後一枚籌碼，三隻眼睛同時眨了一下。',
    '「了不起的地球人。夢境賭場……承認你是真正的賭神。」',
    '整個宇宙開始旋轉，籌碼化成星光散落——',
    '你猛然驚醒，電視還在播撲克比賽，手機顯示凌晨三點。',
    '你鬆了口氣……直到發現手裡握著一枚印著「Xenon」的金色籌碼。',
    '— 全劇終（？）—',
  ];

  const LEVELS = [
    {
      id: 1, title: '第 1 關　森林幼稚園', sub: '向日葵班的點心時間',
      scene: 'kinder', felt: '#5aa469', music: 'kinder',
      chips: 500, blindBase: 10, every: 10,
      story: ['你變成了五歲的自己，坐在小小的木頭椅子上。', '窗外是一片綠油油的山丘，老師說：「今天的點心時間，我們來玩撲克牌！」', '同學們把餅乾當籌碼……等等，這些籌碼好像是真的？'],
      stages: [{ title: '向日葵班', opponents: ['k_sakura', 'k_ryu', 'k_buta', 'k_mimi'] }],
      extras: ['teacher'],
    },
    {
      id: 2, title: '第 2 關　總統府牌局', sub: '府內最高機密會議',
      scene: 'presidential', felt: '#2f6b4f', music: 'formal',
      chips: 1000, blindBase: 20, every: 10,
      story: ['一眨眼，你穿著西裝站在紅磚建築的長廊上，憲兵向你敬禮。', '會議室的大門打開，幾位大咖已經圍著牌桌坐好。', '「國家大事等一下再說，」總統推了推眼鏡，「先打一圈。」'],
      stages: [{ title: '府內會議室', opponents: ['tw_pres', 'tw_vp', 'tw_prem', 'tw_opp'] }],
      extras: ['guard_tw'],
    },
    {
      id: 3, title: '第 3 關　午餐桌風雲', sub: 'Kevin from Accounting',
      scene: 'office', felt: '#3d7a5d', music: 'office',
      chips: 1500, blindBase: 25, every: 9,
      story: ['你醒來發現自己在辦公室的茶水間，胸前掛著員工識別證。', '會計部的 Kevin 端著一大鍋辣椒醬走過來：「午休還有一小時，來一局？」', '贏的人可以決定下週的團購便當。這是職場上最殘酷的戰爭。'],
      stages: [{ title: '員工餐廳', opponents: ['o_kevin', 'o_karen', 'o_bob', 'o_amy'] }],
      extras: ['janitor'],
    },
    {
      id: 4, title: '第 4 關　公路之旅', sub: '一家人開往拉斯維加斯',
      scene: 'roadtrip', felt: '#7a5230', music: 'road',
      chips: 2500, blindBase: 50, every: 8,
      story: ['老婆、小孩、小狗旺財和小貓咪咪擠在老休旅車裡，目的地：拉斯維加斯！', '「爸爸／媽媽，我們到了沒？」——這句話你已經聽了 47 次。', '沿路每個小鎮都有一間小賭場，旅費就靠你了。'],
      stages: [
        { title: '第一站：66 號公路加油站', story: '油箱見底，加油站後面居然有一張牌桌。卡車司機和老闆娘正等著。', opponents: ['r_earl', 'r_dolly'] },
        { title: '第二站：亞利桑那小鎮', story: '風滾草滾過酒館門口。鎮上的牛仔和賓果女王奶奶聽說來了個外地人。', opponents: ['r_tex', 'r_granny'] },
        { title: '第三站：水壩邊的賭場', story: '拉斯維加斯就在眼前！但最後一間賭場的魔術師和經理不打算讓你輕鬆通過。', opponents: ['r_mike', 'r_vinnie'] },
      ],
      extras: ['wife', 'kid', 'dog', 'cat'],
    },
    {
      id: 5, title: '第 5 關　地下德州撲克聯盟', sub: '紐約的私酒吧',
      scene: 'speakeasy', felt: '#1f4d3a', music: 'jazz',
      chips: 4000, blindBase: 80, every: 8,
      story: ['大雨中的紐約。一張寫著暗號的紙條塞進你的口袋：「拿著撲克牌敲三下。」', '樓梯通往地下，薩克斯風的聲音從門縫流出來。', '這裡的規矩很簡單：一路從街頭打到老大面前，或者永遠別出去。'],
      stages: [
        { title: '第一章　街頭', story: '布魯克林的街角，Joey 用牛奶箱當牌桌，嘴裡叼著牙籤。「外地人？先過我這關。」', opponents: ['n_joey'] },
        { title: '第二章　吧台', story: '你推開暗門。酒保 Lola 擦著杯子：「Joey 說你有兩下子。不過在這裡，連空氣都在偷看你的牌。」', opponents: ['n_lola'] },
        { title: '第三章　錢莊', story: '後面的包廂煙霧瀰漫，胖子 Sal 數著鈔票：「借錢的利息是 30%，輸給我的利息是……全部。」', opponents: ['n_sal'] },
        { title: '最終章　老大', story: '保鑣替你拉開椅子。Don Vittorio 慢慢轉動手上的戒指：「年輕人，坐。我們談談你的未來。」', opponents: ['n_don'] },
      ],
      extras: ['thug'],
    },
    {
      id: 6, title: '第 6 關　沙漠新開幕賭場', sub: '你是老闆，但他們是常客',
      scene: 'simpsontown', felt: '#2b8a3e', music: 'town',
      chips: 6000, blindBase: 100, every: 8,
      story: ['你用前面贏來的錢，在內華達沙漠開了一間小鎮風格的賭場。', '開幕第一天，鎮上最有名的一家人和酒館老闆就來了。', '「嗯～免費甜甜圈……」——如果你輸了，賭場就要改成甜甜圈店。'],
      stages: [{ title: '開幕之夜', opponents: ['s_homie', 's_bartie', 's_margie', 's_moey'] }],
      extras: ['dog'],
    },
    {
      id: 7, title: '第 7 關　橢圓辦公室', sub: '白宮的祕密牌局',
      scene: 'oval', felt: '#1d3c6e', music: 'formal',
      chips: 10000, blindBase: 150, every: 7,
      story: ['一架直升機把你載到華盛頓。特勤局探員替你打開門。', '橢圓辦公室裡，堅毅桌被推到一旁，換成一張鋪著藍色絨布的牌桌。', '「聽說你很會打牌，」一頭金髮的男人說，「我打得更好，非常好，大家都這麼說。」'],
      stages: [{ title: '橢圓辦公室', opponents: ['w_trump', 'w_hegseth', 'w_agent', 'w_press'] }],
      extras: ['thug'],
    },
    {
      id: 8, title: '第 8 關　天堂', sub: '雲端上的珍珠門',
      scene: 'heaven', felt: '#e9e3c9', feltDark: true, music: 'heaven',
      chips: 15000, blindBase: 200, every: 7,
      story: ['一道光把你吸上雲端。珍珠門前，聖彼得翻著一本厚厚的名冊。', '「你的名字……嗯，暫時還沒在這裡。不過既然來了，就坐下打一局吧。」', '天使們彈著豎琴當背景音樂。這大概是全宇宙最和平的牌桌——直到有人全下。'],
      stages: [{ title: '珍珠門前', opponents: ['h_jesus', 'h_moses', 'h_noah', 'h_peter'] }],
      extras: ['angel', 'sheep', 'angel'],
    },
    {
      id: 9, title: '第 9 關　西方極樂淨土', sub: '蓮花池畔的禪意牌局',
      scene: 'pureland', felt: '#c9a227', feltDark: true, music: 'zen',
      chips: 20000, blindBase: 300, every: 7,
      story: ['蓮花一朵朵在你腳下綻放，遠方傳來悠遠的鐘聲。', '一隻猴子駕著筋斗雲呼嘯而過，後面跟著一頭追不上的豬。', '「施主，」彌勒佛笑呵呵地說，「輸贏皆是緣。不過今天的緣，在牌桌上見分曉。」'],
      stages: [{ title: '蓮花池畔', opponents: ['b_buddha', 'b_guanyin', 'b_maitreya', 'b_jigong'] }],
      extras: ['wukong', 'bajie', 'novice'],
    },
    {
      id: 10, title: '第 10 關　銀河賭場', sub: '宇宙最終決戰',
      scene: 'space', felt: '#3b2a6b', music: 'space',
      chips: 30000, blindBase: 500, every: 6,
      story: ['蓮花台化成火箭，把你射向外太空。', '一座漂浮在土星環上的賭場閃著霓虹燈：「銀河賭場——地球人禁止入內（除非他很會打牌）」。', '宇宙大帝 Xenon 張開三隻眼睛：「贏了我，你就能醒來。輸了……就永遠留在夢裡吧。」'],
      stages: [{ title: '土星環上', opponents: ['a_zorg', 'a_octa', 'a_unit9', 'a_xenon'] }],
      extras: ['ufo', 'astronaut'],
    },
  ];

  for (const L of LEVELS) L.blinds = schedule(L.blindBase);

  HP.Levels = { LEVELS, PROLOGUE, EPILOGUE, schedule };
})(typeof window !== 'undefined' ? window : globalThis);
