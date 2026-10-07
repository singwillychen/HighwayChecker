/* 存檔（20 格）與設定，存在瀏覽器 localStorage
 * 日後包成 Windows 安裝版（Electron／Tauri）時，只需把 read/write 換成檔案系統即可。
 */
(function (root) {
  const HP = (root.HP = root.HP || {});
  const SLOT_COUNT = 20;
  const SAVE_KEY = 'dreamPoker.saves.v1';
  const SET_KEY = 'dreamPoker.settings.v1';

  const DEFAULT_SETTINGS = {
    quality: 'high',        // low | mid | high：影響陰影、動畫、背景角色、粒子
    resolution: 'auto',     // auto | 960x540 | 1280x720 | 1600x900 | 1920x1080
    fullscreen: false,
    audioQuality: 'high',   // low | mid | high
    master: 0.8, music: 0.5, sfx: 0.8,
    speed: 'normal',        // slow | normal | fast
    hints: 'auto',          // auto（依難度）| on | off
    autoMuck: false,
  };

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }

  function loadSettings() { return { ...DEFAULT_SETTINGS, ...read(SET_KEY, {}) }; }
  function saveSettings(s) { return write(SET_KEY, s); }

  function allSlots() {
    const arr = read(SAVE_KEY, []);
    const out = [];
    for (let i = 0; i < SLOT_COUNT; i++) out.push(arr[i] || null);
    return out;
  }
  function saveSlot(i, data) {
    const arr = allSlots();
    arr[i] = { ...data, savedAt: Date.now() };
    return write(SAVE_KEY, arr);
  }
  function deleteSlot(i) { const arr = allSlots(); arr[i] = null; return write(SAVE_KEY, arr); }
  function firstEmpty() { const a = allSlots(); const i = a.findIndex((x) => !x); return i < 0 ? 0 : i; }

  HP.Storage = { SLOT_COUNT, DEFAULT_SETTINGS, loadSettings, saveSettings, allSlots, saveSlot, deleteSlot, firstEmpty };
})(typeof window !== 'undefined' ? window : globalThis);
