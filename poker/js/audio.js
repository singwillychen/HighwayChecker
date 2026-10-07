/* 音效與背景音樂（Web Audio 即時合成，不需音檔，離線可用）
 * 音質設定：low 22.05kHz／mid 44.1kHz／high 48kHz + 混響
 */
(function (root) {
  const HP = (root.HP = root.HP || {});
  let ctx = null, master, musicBus, sfxBus, reverb;
  let settings = { master: 0.8, music: 0.5, sfx: 0.8, quality: 'high' };
  let musicTimer = null, currentTrack = null, step = 0, nextTime = 0;

  const RATES = { low: 22050, mid: 44100, high: 48000 };

  function ensure() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC({ sampleRate: RATES[settings.quality] || 44100 }); } catch (e) { ctx = new AC(); }
    master = ctx.createGain(); master.connect(ctx.destination);
    musicBus = ctx.createGain(); sfxBus = ctx.createGain();
    if (settings.quality === 'high') {
      reverb = ctx.createConvolver();
      const len = ctx.sampleRate * 1.6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      reverb.buffer = buf;
      const wet = ctx.createGain(); wet.gain.value = 0.18;
      musicBus.connect(reverb); sfxBus.connect(reverb); reverb.connect(wet); wet.connect(master);
    }
    musicBus.connect(master); sfxBus.connect(master);
    apply();
    return ctx;
  }

  function apply() {
    if (!ctx) return;
    master.gain.value = settings.master;
    musicBus.gain.value = settings.music * 0.35;
    sfxBus.gain.value = settings.sfx;
  }

  function configure(s) {
    const qualityChanged = s.quality && s.quality !== settings.quality;
    settings = { ...settings, ...s };
    if (qualityChanged && ctx) {
      const track = currentTrack;
      stopMusic(); ctx.close(); ctx = null;
      if (track) { ensure(); playMusic(track); }
    }
    apply();
  }

  function resume() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(freq, t, dur, type = 'sine', vol = 0.3, bus = sfxBus, attack = 0.005) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  function noise(t, dur, vol = 0.3, freq = 3000, q = 1, type = 'bandpass') {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t);
  }

  const SFX = {
    click() { const t = ctx.currentTime; tone(880, t, 0.06, 'square', 0.08); },
    card() { const t = ctx.currentTime; noise(t, 0.09, 0.35, 2500, 0.8); },
    flip() { const t = ctx.currentTime; noise(t, 0.05, 0.3, 4000, 1.5); tone(600, t, 0.05, 'triangle', 0.05); },
    chip() {
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) { noise(t + i * 0.035, 0.03, 0.4, 5000 + Math.random() * 2000, 4); tone(3200 + Math.random() * 800, t + i * 0.035, 0.04, 'sine', 0.06); }
    },
    check() { const t = ctx.currentTime; noise(t, 0.04, 0.5, 300, 2, 'lowpass'); noise(t + 0.12, 0.04, 0.5, 300, 2, 'lowpass'); },
    fold() { const t = ctx.currentTime; noise(t, 0.18, 0.25, 1200, 0.6); },
    allin() { const t = ctx.currentTime; [262, 330, 392, 523].forEach((f, i) => tone(f, t + i * 0.06, 0.35, 'sawtooth', 0.08)); SFX.chip(); },
    win() { const t = ctx.currentTime; [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.3, 'triangle', 0.15)); },
    lose() { const t = ctx.currentTime; [392, 349, 311, 262].forEach((f, i) => tone(f, t + i * 0.14, 0.35, 'triangle', 0.13)); },
    turn() { const t = ctx.currentTime; tone(1046, t, 0.12, 'sine', 0.12); tone(1318, t + 0.08, 0.15, 'sine', 0.1); },
    fanfare() { const t = ctx.currentTime; [392, 392, 392, 523, 659, 784].forEach((f, i) => tone(f, t + [0, .12, .24, .4, .62, .84][i], i === 5 ? 0.8 : 0.2, 'square', 0.1)); },
  };

  function sfx(name) {
    if (!ensure() || !SFX[name]) return;
    if (ctx.state === 'suspended') return;
    SFX[name]();
  }

  // ── 背景音樂：每關一組調式／和弦／節奏 ──
  const N = (s) => 440 * Math.pow(2, (s - 69) / 12);
  const TRACKS = {
    menu:   { bpm: 108, wave: 'triangle', chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]], lead: [69, 72, 76, 74, 72, 69, 67, 69], swing: true },
    kinder: { bpm: 120, wave: 'sine', chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], lead: [72, 74, 76, 79, 76, 74, 72, 0], bell: true },
    formal: { bpm: 92, wave: 'triangle', chords: [[55, 59, 62], [60, 64, 67], [62, 66, 69], [55, 59, 62]], lead: [74, 0, 71, 72, 74, 0, 79, 78] },
    office: { bpm: 100, wave: 'square', chords: [[60, 64, 67], [57, 60, 64], [62, 65, 69], [55, 59, 62]], lead: [72, 0, 72, 74, 76, 0, 74, 72], soft: true },
    road:   { bpm: 116, wave: 'sawtooth', chords: [[52, 56, 59], [57, 61, 64], [59, 63, 66], [57, 61, 64]], lead: [76, 76, 79, 76, 74, 71, 74, 76], soft: true },
    jazz:   { bpm: 96, wave: 'triangle', chords: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [57, 61, 64, 67]], lead: [69, 72, 74, 0, 72, 69, 67, 0], swing: true },
    town:   { bpm: 126, wave: 'square', chords: [[60, 64, 67], [60, 64, 67], [65, 69, 72], [67, 71, 74]], lead: [72, 76, 79, 76, 81, 79, 76, 72], soft: true },
    heaven: { bpm: 72, wave: 'sine', chords: [[60, 64, 67, 71], [65, 69, 72, 76], [57, 60, 64, 67], [67, 71, 74, 77]], lead: [79, 0, 76, 0, 84, 0, 83, 0], bell: true, pad: true },
    zen:    { bpm: 66, wave: 'sine', chords: [[50, 57, 62], [48, 55, 60], [45, 52, 57], [48, 55, 62]], lead: [74, 0, 76, 0, 79, 0, 81, 0], bell: true, pent: true },
    space:  { bpm: 112, wave: 'sawtooth', chords: [[45, 52, 57], [41, 48, 53], [43, 50, 55], [40, 47, 52]], lead: [69, 72, 76, 81, 76, 72, 69, 64], arp: true, soft: true },
  };

  function schedule() {
    if (!ctx || !currentTrack) return;
    const tr = TRACKS[currentTrack];
    const spb = 60 / tr.bpm / 2; // 八分音符
    while (nextTime < ctx.currentTime + 0.3) {
      const bar = Math.floor(step / 8) % tr.chords.length;
      const chord = tr.chords[bar];
      const i = step % 8;
      const vol = tr.soft ? 0.05 : 0.08;
      let t = nextTime + (tr.swing && i % 2 ? spb * 0.25 : 0);
      if (i === 0) chord.forEach((n) => tone(N(n), t, spb * (tr.pad ? 8 : 6), tr.pad ? 'sine' : tr.wave, vol * 0.6, musicBus, tr.pad ? 0.4 : 0.01));
      if (i % 2 === 0) tone(N(chord[0] - 12), t, spb * 1.6, 'triangle', 0.12, musicBus);
      if (tr.arp) tone(N(chord[i % chord.length] + 12), t, spb * 0.9, 'square', 0.03, musicBus);
      const ln = tr.lead[i];
      if (ln && (step / 8) % 2 >= 1) tone(N(ln), t, spb * 1.8, tr.bell ? 'sine' : tr.wave, tr.bell ? 0.07 : vol * 0.8, musicBus);
      if (!tr.pad && i % 4 === 2) noise(t, 0.04, 0.05, 8000, 1, 'highpass');
      nextTime += spb; step++;
    }
  }

  function playMusic(name) {
    if (!ensure()) return;
    if (currentTrack === name && musicTimer) return;
    stopMusic();
    currentTrack = TRACKS[name] ? name : 'menu';
    step = 0; nextTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(schedule, 100);
  }
  function stopMusic() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; currentTrack = null; }

  HP.Audio = { configure, resume, sfx, playMusic, stopMusic };
})(typeof window !== 'undefined' ? window : globalThis);
