/* 德州撲克牌桌規則引擎（無限注 No-Limit Hold'em，依真實規則）
 * - 按鈕位輪轉、小盲／大盲（單挑時按鈕位為小盲且翻牌前先行動）
 * - 最小加注 = 上一次完整加注的增量（至少一個大盲）
 * - 不足額全下加注不重新開放已行動玩家的加注權
 * - 邊池（side pot）、平分底池、零頭籌碼給按鈕位左手第一位贏家
 * - 攤牌順序：最後一位主動下注者先亮牌，否則由按鈕左手起
 *
 * 狀態機 phase：'idle' → 'betting' ⇄ 'street_done' → 'hand_done'
 * 控制器（main.js）依 phase 推進，好讓畫面有節奏地播放動畫。
 */
(function (root) {
  const HP = (root.HP = root.HP || {});
  const C = HP.Cards;
  const STREETS = ['preflop', 'flop', 'turn', 'river'];
  const STREET_NAMES = { preflop: '翻牌前', flop: '翻牌', turn: '轉牌', river: '河牌' };

  class Table {
    constructor(opts) {
      this.players = opts.players.map((p, i) => ({
        id: p.id, name: p.name, isHuman: !!p.isHuman, seat: i,
        chips: p.chips, out: !!p.out || p.chips <= 0,
        hole: [], folded: false, allIn: false, bet: 0, total: 0, acted: false, lastAction: null,
      }));
      this.sb = opts.sb; this.bb = opts.bb; this.ante = opts.ante || 0;
      this.dealer = opts.dealer === undefined ? -1 : opts.dealer;
      this.handNo = opts.handNo || 0;
      this.rng = opts.rng || Math.random;
      this.phase = 'idle';
      this.board = []; this.deck = [];
      this.street = 'preflop';
      this.currentBet = 0; this.minRaise = this.bb;
      this.toAct = -1; this.lastAggressor = -1;
      this.result = null;
      this.log = opts.log || (() => {});
    }

    get n() { return this.players.length; }
    alive() { return this.players.filter((p) => !p.out); }
    inHand() { return this.players.filter((p) => !p.out && !p.folded); }
    canActCount() { return this.players.filter((p) => !p.out && !p.folded && !p.allIn).length; }
    potTotal() { return this.players.reduce((s, p) => s + p.total, 0); }
    // 已收進池中的（不含本輪桌前的下注）
    potCollected() { return this.players.reduce((s, p) => s + p.total - p.bet, 0); }

    nextSeat(from, pred) {
      for (let k = 1; k <= this.n; k++) {
        const i = (from + k + this.n) % this.n;
        if (pred(this.players[i], i)) return i;
      }
      return -1;
    }

    setBlinds(sb, bb, ante) { this.sb = sb; this.bb = bb; this.ante = ante || 0; }

    startHand() {
      if (this.alive().length < 2) return false;
      this.handNo++;
      this.result = null;
      this.board = [];
      for (const p of this.players) {
        p.hole = []; p.folded = p.out; p.allIn = false; p.bet = 0; p.total = 0; p.acted = false; p.lastAction = null;
      }
      this.dealer = this.nextSeat(this.dealer, (p) => !p.out);
      const headsUp = this.alive().length === 2;
      this.sbIdx = headsUp ? this.dealer : this.nextSeat(this.dealer, (p) => !p.out);
      this.bbIdx = this.nextSeat(this.sbIdx, (p) => !p.out);

      this.deck = C.shuffle(C.newDeck(), this.rng);
      if (this.ante > 0) for (const p of this.alive()) this._put(p, Math.min(this.ante, p.chips), true);
      this._put(this.players[this.sbIdx], Math.min(this.sb, this.players[this.sbIdx].chips));
      this._put(this.players[this.bbIdx], Math.min(this.bb, this.players[this.bbIdx].chips));
      this.currentBet = this.bb;
      this.minRaise = this.bb;
      this.lastAggressor = -1;

      // 從小盲開始逐張發牌（兩輪）
      for (let r = 0; r < 2; r++) {
        let i = this.sbIdx;
        for (let k = 0; k < this.alive().length; k++) {
          this.players[i].hole.push(this.deck.pop());
          i = this.nextSeat(i, (p) => !p.out);
        }
      }
      this.street = 'preflop';
      this.log({ type: 'hand', handNo: this.handNo, dealer: this.dealer, sb: this.sb, bb: this.bb });
      this._beginBetting(this.bbIdx);
      return true;
    }

    // ante 不算入本輪下注（直接進池）
    _put(p, amt, isAnte) {
      amt = Math.max(0, Math.min(amt, p.chips));
      p.chips -= amt;
      p.total += amt;
      if (!isAnte) p.bet += amt;
      if (p.chips === 0) p.allIn = true;
      return amt;
    }

    needsToAct(p) {
      if (p.out || p.folded || p.allIn) return false;
      if (p.bet < this.currentBet) return true;
      if (p.acted) return false;
      // 其他人都無法再行動（全下或棄牌），而且自己已跟齊 → 不必行動
      const others = this.players.some((q) => q !== p && !q.out && !q.folded && !q.allIn);
      return others;
    }

    _beginBetting(fromIdx) {
      const next = this.nextSeat(fromIdx, (p) => this.needsToAct(p));
      if (next < 0 || this.canActCount() < 1) {
        this.toAct = -1;
        this.phase = 'street_done';
      } else {
        this.toAct = next;
        this.phase = 'betting';
      }
    }

    legalActions(p) {
      p = p || this.players[this.toAct];
      const owe = Math.max(0, this.currentBet - p.bet);
      const toCall = Math.min(owe, p.chips);
      const maxTo = p.bet + p.chips;
      const othersCanRespond = this.players.some((q) => q !== p && !q.out && !q.folded && !q.allIn);
      // 已行動過且未遇到完整加注的玩家不能再加注
      const canRaise = !p.acted && othersCanRespond && p.chips > owe;
      let minTo = this.currentBet === 0 ? this.bb : this.currentBet + this.minRaise;
      if (minTo > maxTo) minTo = maxTo; // 只能全下
      return {
        toCall, canCheck: owe === 0, canCall: owe > 0, canRaise,
        minRaiseTo: minTo, maxRaiseTo: maxTo, isBet: this.currentBet === 0,
      };
    }

    act(action) {
      if (this.phase !== 'betting') throw new Error('not betting');
      const idx = this.toAct;
      const p = this.players[idx];
      const L = this.legalActions(p);
      let type = action.type;
      if (type === 'check' && !L.canCheck) type = 'call';
      if (type === 'call' && L.canCheck) type = 'check';
      if (type === 'allin') {
        if (L.canRaise && p.bet + p.chips > this.currentBet) { type = 'raise'; action = { type, amount: p.bet + p.chips }; }
        else type = L.canCheck ? 'check' : 'call';
      }
      if (type === 'raise' && !L.canRaise) type = L.canCheck ? 'check' : 'call';

      let info = { seat: idx, id: p.id, type, amount: 0 };
      if (type === 'fold') {
        p.folded = true;
      } else if (type === 'check') {
        // nothing
      } else if (type === 'call') {
        info.amount = this._put(p, L.toCall);
      } else if (type === 'raise') {
        let to = Math.round(action.amount);
        to = Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, to));
        const inc = to - this.currentBet;
        this._put(p, to - p.bet);
        if (inc >= this.minRaise) {
          this.minRaise = inc;
          for (const q of this.players) if (q !== p) q.acted = false;
        }
        info.isBet = this.currentBet === 0;
        this.currentBet = Math.max(this.currentBet, to);
        info.amount = to;
        this.lastAggressor = idx;
      }
      p.acted = true;
      info.allIn = p.allIn;
      p.lastAction = type === 'raise' ? (info.allIn ? 'allin' : info.isBet ? 'bet' : 'raise') : (p.allIn && type === 'call' ? 'allin' : type);
      info.label = p.lastAction;
      this.log({ type: 'action', street: this.street, ...info, name: p.name });

      if (this.inHand().length === 1) {
        this._finishUncontested();
        return info;
      }
      const next = this.nextSeat(idx, (q) => this.needsToAct(q));
      if (next < 0) { this.toAct = -1; this.phase = 'street_done'; }
      else this.toAct = next;
      return info;
    }

    // 收齊本輪下注、發下一條街，或進入攤牌
    advanceStreet() {
      if (this.phase !== 'street_done') return;
      for (const p of this.players) { p.bet = 0; p.acted = false; if (!p.folded) p.lastAction = p.allIn ? 'allin' : null; }
      this.currentBet = 0;
      this.minRaise = this.bb;
      const si = STREETS.indexOf(this.street);
      if (si === 3) { this._showdown(); return; }
      this.street = STREETS[si + 1];
      this.deck.pop(); // 燒牌
      const cnt = this.street === 'flop' ? 3 : 1;
      for (let i = 0; i < cnt; i++) this.board.push(this.deck.pop());
      this.log({ type: 'street', street: this.street, board: this.board.slice() });
      if (this.canActCount() < 2) { this.toAct = -1; this.phase = 'street_done'; return; }
      this._beginBetting(this.dealer);
    }

    // 依各玩家投入額切出主池與邊池
    buildPots() {
      const contrib = this.players.map((p) => p.total);
      const levels = [...new Set(this.players.filter((p) => !p.folded && p.total > 0).map((p) => p.total))].sort((a, b) => a - b);
      const pots = [];
      let prev = 0;
      for (const L of levels) {
        let amt = 0;
        for (let i = 0; i < this.n; i++) amt += Math.max(0, Math.min(contrib[i], L) - Math.min(contrib[i], prev));
        const eligible = this.players.filter((p) => !p.folded && p.total >= L).map((p) => p.seat);
        if (amt > 0) pots.push({ amount: amt, eligible });
        prev = L;
      }
      // 棄牌者超出最高層級的投入（死錢）併入最後一個池
      let extra = 0;
      for (let i = 0; i < this.n; i++) extra += Math.max(0, contrib[i] - prev);
      if (extra > 0 && pots.length) pots[pots.length - 1].amount += extra;
      // 合併資格相同的相鄰池
      const merged = [];
      for (const pot of pots) {
        const last = merged[merged.length - 1];
        if (last && last.eligible.join() === pot.eligible.join()) last.amount += pot.amount;
        else merged.push({ amount: pot.amount, eligible: pot.eligible.slice() });
      }
      return merged;
    }

    _finishUncontested() {
      const w = this.inHand()[0];
      const amount = this.potTotal();
      w.chips += amount;
      this.result = {
        uncontested: true, board: this.board.slice(),
        pots: [{ amount, eligible: [w.seat], winners: [w.seat], shares: { [w.seat]: amount } }],
        won: { [w.seat]: amount }, hands: {}, showOrder: [],
      };
      this._endHand();
    }

    _showdown() {
      const contenders = this.inHand();
      const hands = {};
      for (const p of contenders) {
        const best = C.bestFive(p.hole.concat(this.board));
        hands[p.seat] = { score: best.score, name: C.handName(best.score), best: best.cards };
      }
      const pots = this.buildPots();
      const won = {};
      // 零頭給按鈕位左手起第一位
      const orderFromDealer = [];
      for (let k = 1; k <= this.n; k++) orderFromDealer.push((this.dealer + k) % this.n);
      for (const pot of pots) {
        let best = -1;
        for (const s of pot.eligible) best = Math.max(best, hands[s].score);
        const winners = orderFromDealer.filter((s) => pot.eligible.includes(s) && hands[s].score === best);
        const share = Math.floor(pot.amount / winners.length);
        let rem = pot.amount - share * winners.length;
        pot.winners = winners;
        pot.shares = {};
        for (const s of winners) {
          const amt = share + (rem > 0 ? 1 : 0);
          if (rem > 0) rem--;
          pot.shares[s] = amt;
          won[s] = (won[s] || 0) + amt;
          this.players[s].chips += amt;
        }
      }
      // 攤牌順序
      const start = this.lastAggressor >= 0 && !this.players[this.lastAggressor].folded ? this.lastAggressor : this.nextSeat(this.dealer, (p) => !p.folded && !p.out);
      const showOrder = [];
      for (let k = 0; k < this.n; k++) {
        const s = (start + k) % this.n;
        if (hands[s]) showOrder.push(s);
      }
      this.result = { uncontested: false, board: this.board.slice(), pots, won, hands, showOrder };
      this._endHand();
    }

    _endHand() {
      this.phase = 'hand_done';
      this.toAct = -1;
      for (const p of this.players) { p.bet = 0; }
      for (const p of this.players) if (!p.out && p.chips <= 0) { p.out = true; p.bustedHand = this.handNo; }
      this.log({ type: 'result', result: this.result });
    }

    snapshot() {
      return {
        players: this.players.map((p) => ({ id: p.id, chips: p.chips, out: p.out })),
        dealer: this.dealer, handNo: this.handNo, sb: this.sb, bb: this.bb, ante: this.ante,
      };
    }
  }

  HP.Engine = { Table, STREETS, STREET_NAMES };
})(typeof window !== 'undefined' ? window : globalThis);
