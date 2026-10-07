/* AI 決策
 * skill（0～1）由「難度 × 關卡進度 × 角色本身」決定，影響：
 *   - 勝率模擬次數與估算誤差（低手常看錯牌力）
 *   - 隨機失誤機率
 *   - 是否懂得看底池賠率、位置、對手範圍（面對大注時折扣自己的勝率）
 *   - 是否會依玩家習慣調整（玩家常詐唬 → 跟得更寬）
 *   - 撲克臉：低手的表情會洩漏牌力（tell），高手會反向演戲
 * style 決定玩法個性：緊／鬆、被動／積極、詐唬頻率、慢打、跟注站。
 */
(function (root) {
  const HP = (root.HP = root.HP || {});
  const C = HP.Cards;

  const STYLES = {
    rock:    { name: '石頭型（超緊）',     tight: 0.16, aggr: 0.35, bluff: 0.03, station: 0.00, slow: 0.10 },
    tag:     { name: '緊兇型',             tight: 0.08, aggr: 0.75, bluff: 0.10, station: 0.00, slow: 0.15 },
    lag:     { name: '鬆兇型',             tight: -0.04, aggr: 0.85, bluff: 0.22, station: 0.05, slow: 0.10 },
    station: { name: '跟注站',             tight: -0.06, aggr: 0.20, bluff: 0.03, station: 0.40, slow: 0.05 },
    maniac:  { name: '瘋子型',             tight: -0.14, aggr: 0.97, bluff: 0.38, station: 0.10, slow: 0.00 },
    tricky:  { name: '狡猾慢打型',         tight: 0.03, aggr: 0.60, bluff: 0.16, station: 0.00, slow: 0.40 },
    kid:     { name: '亂打型（天真）',     tight: -0.10, aggr: 0.45, bluff: 0.12, station: 0.30, slow: 0.00 },
    gto:     { name: '均衡型（神）',       tight: 0.05, aggr: 0.70, bluff: 0.16, station: 0.00, slow: 0.20 },
  };

  const DIFFICULTIES = [
    { id: 'baby',   name: '小嫩嫩',   skill: 0.05, desc: '對手幾乎亂打，表情全寫在臉上；顯示勝率提示。' },
    { id: 'rookie', name: '新手',     skill: 0.25, desc: '對手常犯錯、容易被看穿；顯示勝率提示。' },
    { id: 'normal', name: '普通玩家', skill: 0.50, desc: '對手懂基本賠率，偶爾詐唬。' },
    { id: 'pro',    name: '老手',     skill: 0.72, desc: '對手會讀你的習慣、懂位置、表情難以看穿。' },
    { id: 'god',    name: '賭神',     skill: 0.92, desc: '對手幾乎不犯錯，會反向演戲，請謹慎。' },
  ];

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // 玩家行為模型（供 AI 調整）
  function newModel() {
    return { hands: 0, vpip: 0, pfr: 0, aggr: 0, passive: 0, folds: 0, bluffsShown: 0, showdowns: 0 };
  }
  function modelAggression(m) {
    const tot = m.aggr + m.passive;
    if (tot < 6) return 0.5;
    const af = m.aggr / tot;
    const bluffRate = m.showdowns ? m.bluffsShown / m.showdowns : 0;
    return clamp(af * 0.8 + bluffRate * 0.6, 0, 1);
  }

  function computeSkill(diffId, levelIdx, charSkill) {
    const d = DIFFICULTIES.find((x) => x.id === diffId) || DIFFICULTIES[2];
    // 關卡越後面越強；角色本身 ±0.15
    return clamp(d.skill + levelIdx * 0.025 + (charSkill || 0), 0.01, 0.99);
  }

  function estimate(t, p, skill, rng) {
    const nOpp = t.inHand().length - 1;
    const iters = Math.round(60 + skill * 440);
    let eq = C.equity(p.hole, t.board, Math.max(1, nOpp), iters, rng);
    eq += (rng() * 2 - 1) * (1 - skill) * 0.2;
    return clamp(eq, 0, 1);
  }

  function decide(t, p, ctx) {
    const rng = ctx.rng || Math.random;
    const s = ctx.skill;
    const st = STYLES[ctx.style] || STYLES.tag;
    const L = t.legalActions(p);
    const nOpp = Math.max(1, t.inHand().length - 1);
    const pot = t.potTotal();
    const bb = t.bb;
    let eq = estimate(t, p, s, rng);
    const rawEq = eq;
    const rel = eq * (nOpp + 1); // 1 = 平均牌力

    // 面對下注：高手會考慮「對手範圍變強」而折扣
    if (L.toCall > 0) {
      const pressure = clamp(L.toCall / Math.max(pot - L.toCall, bb), 0, 2);
      const aggressor = t.players[t.lastAggressor];
      const bettorBluffy = aggressor && aggressor.isHuman ? modelAggression(ctx.model) : st.bluff + 0.3;
      eq -= s * pressure * 0.12 * (1.2 - bettorBluffy);
    }

    const potOdds = L.toCall / (pot + L.toCall);
    const stackBB = p.chips / bb;
    const preflop = t.street === 'preflop';

    // 位置：越晚行動越好（高手才懂）
    const posBonus = s * 0.04 * positionFactor(t, p);

    // 新手隨機失誤
    if (rng() < (1 - s) * 0.2) return randomAction(t, p, L, rng, rawEq);

    const raiseT = 1.42 + st.tight - st.aggr * 0.18 - posBonus * 3;
    const monster = rawEq > 0.8 || rel > 2.1;
    const strong = rel + posBonus > raiseT;
    const playable = rel + posBonus > 0.92 + st.tight * 1.4;

    const betSize = (frac) => {
      let f = frac;
      if (s < 0.4) f *= 0.5 + rng() * 1.3; // 低手下注尺寸亂七八糟
      let to;
      if (preflop) {
        const limpers = t.players.filter((q) => !q.folded && q !== p && q.bet >= t.currentBet).length - 1;
        to = t.currentBet === bb ? bb * (2.5 + st.aggr + Math.max(0, limpers)) : t.currentBet * (2.6 + st.aggr * 0.6);
      } else {
        to = t.currentBet + (pot + L.toCall) * f;
      }
      to = Math.max(L.minRaiseTo, Math.round(to / Math.max(1, roundUnit(bb))) * roundUnit(bb));
      // 投入過半籌碼就乾脆全下（承諾）
      if (to > p.bet + p.chips * 0.6) to = L.maxRaiseTo;
      return { type: 'raise', amount: Math.min(to, L.maxRaiseTo) };
    };

    // 短碼推或棄（懂的人才會）
    if (preflop && stackBB < 11 && s > 0.35) {
      if (rel > 1.18 + st.tight) return { type: 'allin' };
      if (L.canCheck) return { type: 'check' };
      return eq > potOdds + 0.05 && L.toCall < p.chips * 0.35 ? { type: 'call' } : { type: 'fold' };
    }

    if (L.toCall === 0) {
      if (strong && L.canRaise) {
        if (monster && rng() < st.slow) return { type: 'check', note: 'slowplay' };
        return betSize(0.5 + st.aggr * 0.35 + (monster ? 0.15 : 0));
      }
      // 詐唬／半詐唬
      const drawy = !preflop && t.street !== 'river' && rawEq > 0.28 && rawEq < 0.5;
      const bluffP = st.bluff * (nOpp === 1 ? 1.3 : 0.55) * (1 + positionFactor(t, p) * s) + (drawy ? s * 0.12 : 0);
      if (L.canRaise && rng() < bluffP) return { ...betSize(0.45 + rng() * 0.3), bluff: true };
      return { type: 'check' };
    }

    // 面對下注
    const heroAggr = modelAggression(ctx.model);
    const callMargin = st.tight * 0.6 - s * 0.08 * (heroAggr - 0.5) * 2;
    if (strong && L.canRaise) {
      if (monster && rng() < st.slow * 0.6) return { type: 'call', note: 'slowplay' };
      if (rng() < 0.35 + st.aggr * 0.6) return betSize(0.65 + st.aggr * 0.3);
      return { type: 'call' };
    }
    if (eq >= potOdds + callMargin && (playable || !preflop || L.toCall <= bb)) return { type: 'call' };
    // 半詐唬加注
    if (L.canRaise && !preflop && t.street !== 'river' && rawEq > 0.3 && rng() < st.bluff * s) return { ...betSize(0.7), bluff: true };
    // 跟注站：便宜就跟
    if (rng() < st.station && L.toCall < p.chips * 0.25) return { type: 'call' };
    return { type: 'fold' };
  }

  function roundUnit(bb) {
    if (bb >= 1000) return bb / 4;
    if (bb >= 100) return bb / 10;
    if (bb >= 20) return 5;
    return 1;
  }

  // 0（最早）～1（按鈕位）
  function positionFactor(t, p) {
    const order = [];
    let i = t.dealer;
    for (let k = 0; k < t.n; k++) {
      i = (i + 1) % t.n;
      if (!t.players[i].out) order.push(i);
    }
    const idx = order.indexOf(p.seat);
    return order.length > 1 ? idx / (order.length - 1) : 0;
  }

  function randomAction(t, p, L, rng, eq) {
    const r = rng();
    if (L.canCheck) {
      if (r < 0.75 || !L.canRaise) return { type: 'check' };
      return { type: 'raise', amount: L.minRaiseTo + Math.floor(rng() * 3) * t.bb };
    }
    if (r < 0.3 + (1 - eq) * 0.3) return { type: 'fold' };
    if (r < 0.9 || !L.canRaise) return { type: 'call' };
    return { type: 'raise', amount: L.minRaiseTo };
  }

  // 表情：依牌力與撲克臉功力決定是否洩漏
  function expressionFor(eq, nOpp, skill, rng, bluffing) {
    const rel = eq * (nOpp + 1);
    const leak = rng() > skill * 0.95;
    if (!leak) {
      if (skill > 0.7 && rng() < 0.35) return bluffing || rel < 0.8 ? 'smug' : 'think'; // 反向演戲
      return 'neutral';
    }
    if (rel > 1.9) return rng() < 0.5 ? 'happy' : 'smug';
    if (rel > 1.3) return 'smug';
    if (rel < 0.6) return rng() < 0.5 ? 'worried' : 'sad';
    if (rel < 0.85) return 'think';
    return 'neutral';
  }

  HP.AI = { STYLES, DIFFICULTIES, decide, estimate, computeSkill, newModel, modelAggression, expressionFor };
})(typeof window !== 'undefined' ? window : globalThis);
