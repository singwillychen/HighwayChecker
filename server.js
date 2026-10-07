// 高速公路塞不塞：小型後端。提供靜態網頁，並代為呼叫 TDX（金鑰只放在伺服器環境變數）。
// 不需任何 npm 套件，需要 Node 18 以上。
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);
const ID = process.env.TDX_CLIENT_ID || '';
const SECRET = process.env.TDX_CLIENT_SECRET || '';
const BASE = process.env.TDX_BASE || 'https://tdx.transportdata.tw/api/basic';
const TOKEN_URL = process.env.TDX_TOKEN_URL || 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const PATH_SECTION = process.env.TDX_PATH_SECTION || '/v2/Road/Traffic/Section/Freeway';
const PATH_LIVE = process.env.TDX_PATH_LIVE || '/v2/Road/Traffic/Live/Freeway';
const CACHE_MS = 60 * 1000;
const WEB_ROOT = __dirname;
const STATIC = new Set(['/', '/index.html']);

let token = null, tokenExp = 0, cache = null, cacheAt = 0, sectionCache = null, sectionAt = 0;

async function getToken() {
  if (!ID || !SECRET) throw Object.assign(new Error('未設定 TDX_CLIENT_ID / TDX_CLIENT_SECRET'), { code: 'NO_KEY' });
  if (token && Date.now() < tokenExp - 30000) return token;
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: ID, client_secret: SECRET }),
  });
  if (!r.ok) throw Object.assign(new Error('取得 token 失敗，HTTP ' + r.status), { code: 'TOKEN', status: r.status });
  const j = await r.json();
  token = j.access_token; tokenExp = Date.now() + (j.expires_in || 86400) * 1000;
  return token;
}
async function tdx(p) {
  const url = BASE + p + (p.includes('?') ? '&' : '?') + '$format=JSON';
  const r = await fetch(url, { headers: { authorization: 'Bearer ' + (await getToken()), 'accept-encoding': 'gzip' } });
  if (!r.ok) throw Object.assign(new Error('TDX 回應 HTTP ' + r.status + '：' + url.replace(BASE, '')), { code: 'HTTP', status: r.status });
  return r.json();
}
// TDX 回傳可能是陣列，或 { SectionLives: [...] } 這種外包一層，統一取出陣列
const list = j => Array.isArray(j) ? j : (Object.values(j || {}).find(Array.isArray) || []);
const pick = (o, ...ks) => { for (const k of ks) { const v = k.split('.').reduce((a, b) => a == null ? a : a[b], o); if (v != null && v !== '') return v; } return null; };
const nameOf = x => x == null ? null : typeof x === 'string' ? x : pick(x, 'StationName', 'Name', 'RoadName', 'Zh_tw', 'ZH_TW');

function normalize(sections, lives) {
  const info = new Map();
  sections.forEach(s => {
    const id = pick(s, 'SectionID');
    const name = pick(s, 'SectionName.Zh_tw', 'SectionName') || '';
    info.set(id, {
      name: typeof name === 'string' ? name : '',
      road: nameOf(pick(s, 'RoadName', 'Road', 'RoadID')) || '',
      dir: String(pick(s, 'RoadDirection', 'Direction') || ''),
      from: nameOf(pick(s, 'SectionStart', 'Start')) || '',
      to: nameOf(pick(s, 'SectionEnd', 'End')) || '',
    });
  });
  return lives.map(l => {
    const id = pick(l, 'SectionID');
    const i = info.get(id) || {};
    return {
      id, road: i.road || String(pick(l, 'RoadName', 'RoadID') || ''), dir: i.dir || String(pick(l, 'RoadDirection') || ''),
      name: i.name || '', from: i.from || '', to: i.to || '',
      speed: Number(pick(l, 'TravelSpeed', 'AverageSpeed')) || null,
      level: pick(l, 'CongestionLevelID', 'CongestionLevel'),
      updated: pick(l, 'DataCollectTime', 'SrcUpdateTime', 'UpdateTime'),
    };
  }).filter(x => x.speed != null && x.speed > 0);
}
async function traffic() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  if (!sectionCache || Date.now() - sectionAt > 6 * 3600 * 1000) { sectionCache = list(await tdx(PATH_SECTION)); sectionAt = Date.now(); }
  const lives = list(await tdx(PATH_LIVE));
  const sections = normalize(sectionCache, lives);
  cache = { ok: true, source: 'tdx', fetchedAt: new Date().toISOString(), counts: { sectionDefs: sectionCache.length, live: lives.length, usable: sections.length }, sections };
  cacheAt = Date.now();
  return cache;
}

const json = (res, code, obj) => { const b = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(b); };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname === '/api/health') return json(res, 200, { ok: true, tdxKey: ID && SECRET ? 'configured' : 'missing' });
    if (u.pathname === '/api/traffic') {
      try { return json(res, 200, await traffic()); }
      catch (e) { return json(res, e.code === 'NO_KEY' ? 503 : 502, { ok: false, error: e.message, code: e.code || 'ERR' }); }
    }
    // 除錯用：看 TDX 原始資料的前幾筆欄位（不含金鑰），用來核對欄位名稱
    if (u.pathname === '/api/tdx/raw') {
      const kind = u.searchParams.get('kind') === 'section' ? PATH_SECTION : PATH_LIVE;
      try { const a = list(await tdx(kind)); return json(res, 200, { ok: true, total: a.length, sample: a.slice(0, 3) }); }
      catch (e) { return json(res, 502, { ok: false, error: e.message }); }
    }
    if (STATIC.has(u.pathname)) {
      const f = path.join(WEB_ROOT, 'index.html');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return fs.createReadStream(f).pipe(res);
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Not found');
  } catch (e) { json(res, 500, { ok: false, error: String(e.message || e) }); }
});
if (require.main === module) server.listen(PORT, () => console.log(`高速公路塞不塞 啟動：http://0.0.0.0:${PORT}　TDX 金鑰：${ID && SECRET ? '已設定' : '未設定（頁面會用示範資料）'}`));
module.exports = { getToken, tdx, list, normalize, PATH_SECTION, PATH_LIVE };
