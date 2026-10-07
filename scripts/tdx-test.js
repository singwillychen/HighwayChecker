// TDX 介接測試：node scripts/tdx-test.js   （需要 .env 或環境變數裡的 TDX_CLIENT_ID / TDX_CLIENT_SECRET）
'use strict';
const fs = require('fs'), path = require('path');
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); });
const t = require('../server.js');
const step = (ok, msg) => console.log((ok ? '✔ ' : '✘ ') + msg);
(async () => {
  let fail = 0;
  try { await t.getToken(); step(true, '取得 TDX token 成功'); } catch (e) { step(false, e.message); process.exit(1); }
  let sections = [], lives = [];
  try { sections = t.list(await t.tdx(t.PATH_SECTION)); step(sections.length > 0, `路段定義 ${t.PATH_SECTION}：${sections.length} 筆`); if (!sections.length) fail++; } catch (e) { step(false, e.message); fail++; }
  try { lives = t.list(await t.tdx(t.PATH_LIVE)); step(lives.length > 0, `即時路況 ${t.PATH_LIVE}：${lives.length} 筆`); if (!lives.length) fail++; } catch (e) { step(false, e.message); fail++; }
  if (sections.length && lives.length) {
    const n = t.normalize(sections, lives);
    step(n.length > 0, `合併後可用路段：${n.length} 筆（有時速）`);
    console.log('\n欄位抽樣（原始路段）：', Object.keys(sections[0]).join(', '));
    console.log('欄位抽樣（原始路況）：', Object.keys(lives[0]).join(', '));
    console.log('\n合併後前 5 筆：'); console.table(n.slice(0, 5));
    const roads = {}; n.forEach(x => roads[x.road || '(空)'] = (roads[x.road || '(空)'] || 0) + 1);
    console.log('各公路筆數：', roads);
  }
  console.log(fail ? '\n結果：部分失敗，請把上面輸出（不含金鑰）貼給我核對欄位。' : '\n結果：TDX 介接成功。');
  process.exit(fail ? 1 : 0);
})();
