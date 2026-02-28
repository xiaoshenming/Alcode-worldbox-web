/**
 * BattleReplaySystem - 战争回放系统
 * 记录大型战役并提供慢动作回放和战绩统计
 */

/** 单帧战斗快照 */
const _EMPTY_DASH: number[] = []
const _DASH_6_4: number[] = [6, 4]
export interface BattleFrame {
  tick: number
  units: Array<{id: number; x: number; y: number; hp: number; maxHp: number; side: number; alive: boolean}>
  attacks: Array<{fromX: number; fromY: number; toX: number; toY: number}>
}

/** 完整战役录像 */
export interface BattleRecord {
  id: number
  startTick: number
  endTick: number
  frames: BattleFrame[]
  sides: Array<{civId: number; name: string; color: string; startCount: number; endCount: number; kills: number}>
  winner: number
}

const MAX_FRAMES = 300;
const MAX_RECORDS = 5;
const SPEEDS = [0.25, 0.5, 1, 2];
const BAR_H = 48;
const STATS_W = 320;
const STATS_H = 220;

export class BattleReplaySystem {
  private records: BattleRecord[] = [];
  private recording: BattleRecord | null = null;
  private framePool: BattleFrame[] = [];
  private replaying = false;
  private replayIndex = -1;
  private replayFrame = 0;
  private replaySpeed = 1;
  private replayPlaying = false;
  private replayAccum = 0;
  private showStats = false;
  private _dmgMap: Map<number, number> = new Map();

  constructor() {
    for (let i = 0; i < MAX_FRAMES; i++) {
      this.framePool.push({ tick: 0, units: [], attacks: [] });
    }
  }

  // ── 录制 API ──

  startRecording(battleId: number, sides: Array<{civId: number; name: string; color: string}>): void {
    if (this.recording) return;
    this.recording = {
      id: battleId, startTick: 0, endTick: 0, frames: [],
      sides: sides.map(s => ({ ...s, startCount: 0, endCount: 0, kills: 0 })),
      winner: -1
    };
  }

  recordFrame(frame: BattleFrame): void {
    const rec = this.recording;
    if (!rec || rec.frames.length >= MAX_FRAMES) return;
    if (rec.frames.length === 0) {
      rec.startTick = frame.tick;
      for (const side of rec.sides) {
        let cnt = 0;
        for (const u of frame.units) { if (u.side === side.civId) cnt++ }
        side.startCount = cnt;
      }
    }
    rec.endTick = frame.tick;
    rec.frames.push({
      tick: frame.tick,
      units: frame.units.map(u => ({ ...u })),
      attacks: frame.attacks.map(a => ({ ...a }))
    });
  }

  stopRecording(winnerId: number): void {
    const rec = this.recording;
    if (!rec) return;
    rec.winner = winnerId;
    const last = rec.frames[rec.frames.length - 1];
    if (last) {
      for (const side of rec.sides) {
        let cnt = 0;
        for (const u of last.units) { if (u.side === side.civId && u.alive) cnt++ }
        side.endCount = cnt;
      }
      if (rec.sides.length >= 2) {
        rec.sides[0].kills = rec.sides[1].startCount - rec.sides[1].endCount;
        rec.sides[1].kills = rec.sides[0].startCount - rec.sides[0].endCount;
      }
    }
    if (this.records.length >= MAX_RECORDS) this.records.shift();
    this.records.push(rec);
    this.recording = null;
  }

  isRecording(): boolean { return this.recording !== null; }

  // ── 回放 API ──

  startReplay(recordIndex: number): void {
    if (recordIndex < 0 || recordIndex >= this.records.length) return;
    this.replaying = true;
    this.replayIndex = recordIndex;
    this.replayFrame = 0;
    this.replaySpeed = 1;
    this.replayPlaying = true;
    this.replayAccum = 0;
    this.showStats = false;
  }

  stopReplay(): void {
    this.replaying = false;
    this.replayIndex = -1;
    this.replayPlaying = false;
    this.showStats = false;
  }

  isReplaying(): boolean { return this.replaying; }
  setReplaySpeed(speed: number): void { this.replaySpeed = speed; }

  seekTo(frameIndex: number): void {
    const rec = this.currentRecord();
    if (rec) this.replayFrame = Math.max(0, Math.min(frameIndex, rec.frames.length - 1));
  }

  stepForward(): void {
    const rec = this.currentRecord();
    if (rec && this.replayFrame < rec.frames.length - 1) this.replayFrame++;
  }

  stepBackward(): void { if (this.replayFrame > 0) this.replayFrame--; }

  // ── 更新 ──

  update(_tick: number): void {
    if (!this.replaying || !this.replayPlaying) return;
    const rec = this.currentRecord();
    if (!rec) return;
    this.replayAccum += this.replaySpeed;
    while (this.replayAccum >= 1) {
      this.replayAccum -= 1;
      if (this.replayFrame < rec.frames.length - 1) {
        this.replayFrame++;
      } else {
        this.replayPlaying = false;
        this.showStats = true;
        break;
      }
    }
  }

  // ── 地图叠加渲染 ──

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    const rec = this.currentRecord();
    if (!rec || !this.replaying) return;
    const frame = rec.frames[this.replayFrame];
    if (!frame) return;
    ctx.save();
    // 战场范围虚线圈
    let aliveCount = 0, cxSum = 0, cySum = 0;
    for (const u of frame.units) { if (u.alive) { cxSum += u.x; cySum += u.y; aliveCount++ } }
    if (aliveCount >= 2) {
      let cx = cxSum / aliveCount, cy = cySum / aliveCount;
      let maxDist = 0;
      for (const u of frame.units) {
        if (!u.alive) continue;
        const d = Math.sqrt((u.x - cx) ** 2 + (u.y - cy) ** 2);
        if (d > maxDist) maxDist = d;
      }
      ctx.setLineDash(_DASH_6_4);
      ctx.strokeStyle = 'rgba(255,200,0,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((cx - camX) * zoom, (cy - camY) * zoom, (maxDist + 5) * zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash(_EMPTY_DASH);
    }
    // 攻击连线
    if (frame.attacks.length > 0) {
      ctx.strokeStyle = 'rgba(255,60,60,0.6)';
      ctx.lineWidth = 1.5;
      for (const a of frame.attacks) {
        ctx.beginPath();
        ctx.moveTo((a.fromX - camX) * zoom, (a.fromY - camY) * zoom);
        ctx.lineTo((a.toX - camX) * zoom, (a.toY - camY) * zoom);
        ctx.stroke();
      }
    }
    // 单位圆点 / 阵亡X标记
    for (const u of frame.units) {
      const sx = (u.x - camX) * zoom, sy = (u.y - camY) * zoom;
      const r = Math.max(3, 4 * zoom);
      const sideData = rec.sides.find(s => s.civId === u.side);
      if (u.alive) {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = sideData ? sideData.color : '#fff';
        ctx.globalAlpha = 0.5 + 0.5 * (u.hp / u.maxHp);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        const s = r * 0.7;
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - s, sy - s); ctx.lineTo(sx + s, sy + s);
        ctx.moveTo(sx + s, sy - s); ctx.lineTo(sx - s, sy + s);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── 控制条渲染 ──

  renderControls(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.replaying) return;
    const rec = this.currentRecord();
    if (!rec) return;
    const y = screenHeight - BAR_H - 10, barW = screenWidth - 40;
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(10, y, barW + 20, BAR_H, 8);
    ctx.fill();
    // 播放/暂停
    const bx = 24, by = y + 8;
    ctx.fillStyle = '#fff';
    if (this.replayPlaying) {
      ctx.fillRect(bx, by, 5, 16);
      ctx.fillRect(bx + 9, by, 5, 16);
    } else {
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + 14, by + 8); ctx.lineTo(bx, by + 16);
      ctx.closePath(); ctx.fill();
    }
    // 步退 / 步进
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText('|<', 50, y + 22);
    ctx.fillText('>|', 76, y + 22);
    // 进度条
    const progX = 110, progW = barW - 220, progY = y + 14;
    ctx.fillStyle = '#444';
    ctx.fillRect(progX, progY, progW, 6);
    const pct = rec.frames.length > 1 ? this.replayFrame / (rec.frames.length - 1) : 0;
    ctx.fillStyle = '#4af';
    ctx.fillRect(progX, progY, progW * pct, 6);
    ctx.beginPath();
    ctx.arc(progX + progW * pct, progY + 3, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    // 帧号
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(`${this.replayFrame + 1}/${rec.frames.length}`, progX + progW + 8, y + 20);
    // 当前速度
    ctx.fillStyle = '#ff0';
    ctx.fillText(`${this.replaySpeed}x`, barW - 30, y + 20);
    // 关闭
    ctx.fillStyle = '#f55';
    ctx.font = '16px monospace';
    ctx.fillText('X', barW + 4, y + 22);
    // 速度切换
    ctx.font = '10px monospace';
    for (let i = 0; i < SPEEDS.length; i++) {
      const sx = barW - 100 + i * 22;
      ctx.fillStyle = this.replaySpeed === SPEEDS[i] ? '#ff0' : '#666';
      ctx.fillText(SPEEDS[i] + 'x', sx, y + 40);
    }
  }

  // ── 战绩统计面板 ──

  renderStats(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.showStats || !this.replaying) return;
    const rec = this.currentRecord();
    if (!rec) return;
    const x = (screenWidth - STATS_W) / 2, y = (screenHeight - STATS_H) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, STATS_W, STATS_H, 10);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Battle Report', x + STATS_W / 2, y + 28);
    // 胜者
    const winSide = rec.sides.find(s => s.civId === rec.winner);
    if (winSide) {
      ctx.fillStyle = winSide.color;
      ctx.font = '13px monospace';
      ctx.fillText(`Winner: ${winSide.name}`, x + STATS_W / 2, y + 50);
    }
    // 双方统计
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    let row = y + 75;
    for (const side of rec.sides) {
      ctx.fillStyle = side.color;
      ctx.fillText(side.name, x + 16, row);
      ctx.fillStyle = '#ccc';
      ctx.fillText(`Deployed: ${side.startCount}  Survived: ${side.endCount}  Kills: ${side.kills}`, x + 16, row + 16);
      row += 42;
    }
    // 持续时间 + MVP
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Duration: ${rec.endTick - rec.startTick} ticks`, x + 16, row);
    const mvp = this.findMVP(rec);
    if (mvp) ctx.fillText(`MVP: Unit #${mvp.id} (${mvp.dmg} dmg dealt)`, x + 16, row + 18);
    // 关闭提示
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.font = '11px monospace';
    ctx.fillText('Click to close', x + STATS_W / 2, y + STATS_H - 12);
    ctx.textAlign = 'left';
  }

  private findMVP(rec: BattleRecord): {id: number; dmg: number} | null {
    const dmg = this._dmgMap; dmg.clear();
    for (let i = 1; i < rec.frames.length; i++) {
      const prev = rec.frames[i - 1], curr = rec.frames[i];
      for (const cu of curr.units) {
        const pu = prev.units.find(u => u.id === cu.id);
        if (!pu || pu.hp <= cu.hp) continue;
        const loss = pu.hp - cu.hp;
        for (const atk of curr.attacks) {
          if ((atk.toX - cu.x) ** 2 + (atk.toY - cu.y) ** 2 >= 9) continue;
          for (const au of curr.units) {
            if (au.side === cu.side) continue;
            if ((atk.fromX - au.x) ** 2 + (atk.fromY - au.y) ** 2 < 9) {
              dmg.set(au.id, (dmg.get(au.id) || 0) + loss);
              break;
            }
          }
          break;
        }
      }
    }
    let bestId = -1, bestDmg = 0;
    for (const [id, d] of dmg) { if (d > bestDmg) { bestId = id; bestDmg = d; } }
    return bestId >= 0 ? { id: bestId, dmg: bestDmg } : null;
  }

  // ── 点击处理 ──

  handleClick(x: number, y: number, screenWidth: number, screenHeight: number): boolean {
    if (!this.replaying) return false;
    const rec = this.currentRecord();
    if (!rec) return false;
    // 统计面板关闭
    if (this.showStats) {
      const sx = (screenWidth - STATS_W) / 2, sy = (screenHeight - STATS_H) / 2;
      if (x >= sx && x <= sx + STATS_W && y >= sy && y <= sy + STATS_H) {
        this.showStats = false;
        return true;
      }
    }
    const barY = screenHeight - BAR_H - 10, barW = screenWidth - 40;
    if (y < barY || y > barY + BAR_H) return false;
    // 播放/暂停
    if (x >= 18 && x <= 42) { this.replayPlaying = !this.replayPlaying; return true; }
    // 步退
    if (x >= 46 && x <= 68) { this.replayPlaying = false; this.stepBackward(); return true; }
    // 步进
    if (x >= 72 && x <= 94) { this.replayPlaying = false; this.stepForward(); return true; }
    // 进度条
    const progX = 110, progW = barW - 220;
    if (x >= progX && x <= progX + progW) {
      this.seekTo(Math.round(((x - progX) / progW) * (rec.frames.length - 1)));
      return true;
    }
    // 关闭
    if (x >= barW && x <= barW + 20) { this.stopReplay(); return true; }
    // 速度切换
    for (let i = 0; i < SPEEDS.length; i++) {
      const sx = barW - 100 + i * 22;
      if (x >= sx && x <= sx + 20 && y >= barY + 28) { this.replaySpeed = SPEEDS[i]; return true; }
    }
    return true;
  }

  // ── 查询 ──

  getRecordCount(): number { return this.records.length; }
  getRecords(): BattleRecord[] { return this.records; }

  private currentRecord(): BattleRecord | null {
    if (this.replayIndex < 0 || this.replayIndex >= this.records.length) return null;
    return this.records[this.replayIndex];
  }
}
