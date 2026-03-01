/**
 * MiniGameSystem - 随机世界事件挑战系统
 *
 * 周期性触发随机事件（陨石雨、瘟疫爆发、外交危机、资源短缺），
 * 以弹窗形式展示选项，记录玩家选择历史。
 */
import { roundRect } from '../utils/CanvasUtils'


/** 事件选项 */
interface EventOption {
  id: string;
  label: string;
  resultText: string;
}

/** 事件模板 */
interface EventTemplate {
  type: string;
  title: string;
  description: string;
  options: EventOption[];
}

/** 历史记录条目 */
interface HistoryEntry {
  tick: number;
  eventType: string;
  choice: string;
}

/** 当前活跃事件状态 */
interface ActiveEvent {
  template: EventTemplate;
  triggeredAt: number;
  chosenOption: EventOption | null;
  resultShownAt: number;
  /** Cached wrapped lines for description — computed on first render */
  descLines: string[] | null;
  /** Cached wrapped lines for result text — computed on first render after chosenOption is set */
  resultLines: string[] | null;
}

/** 所有事件模板定义 */
const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: 'meteor_shower',
    title: '☄️ 陨石雨来袭！',
    description: '大量陨石正朝世界坠落，你要如何应对？',
    options: [
      { id: 'shield', label: '启动护盾', resultText: '护盾成功抵挡了大部分陨石，少量建筑受损。' },
      { id: 'evacuate', label: '紧急疏散', resultText: '居民及时撤离，但城镇遭到严重破坏。' },
      { id: 'pray', label: '祈祷奇迹', resultText: '奇迹降临！陨石在空中碎裂化为流星雨，无人伤亡。' },
    ],
  },
  {
    type: 'plague',
    title: '🦠 瘟疫爆发！',
    description: '一种未知疾病在村庄间蔓延，如何处置？',
    options: [
      { id: 'quarantine', label: '全面隔离', resultText: '隔离有效遏制了传播，但经济遭受重创。' },
      { id: 'medicine', label: '研发药物', resultText: '药物研发成功，疫情逐步得到控制。' },
      { id: 'ignore', label: '顺其自然', resultText: '瘟疫肆虐，大量人口死亡，幸存者获得了免疫力。' },
    ],
  },
  {
    type: 'diplomacy_crisis',
    title: '⚔️ 外交危机！',
    description: '两个种族在边境发生冲突，局势一触即发。',
    options: [
      { id: 'peace', label: '调停和平', resultText: '双方达成停火协议，关系有所缓和。' },
      { id: 'war', label: '支持开战', resultText: '战争爆发！胜者扩张了领土，败者损失惨重。' },
    ],
  },
  {
    type: 'resource_shortage',
    title: '📦 资源短缺！',
    description: '世界资源告急，多个村庄面临饥荒。',
    options: [
      { id: 'ration', label: '平均分配', resultText: '所有村庄勉强度过难关，但发展停滞。' },
      { id: 'prioritize', label: '优先大城', resultText: '大城市繁荣发展，小村庄逐渐衰落。' },
      { id: 'trade', label: '开放贸易', resultText: '贸易路线建立，资源流通加速，经济复苏。' },
    ],
  },
];

/** 弹窗布局常量 */
const POPUP_W = 420;
const POPUP_H = 300;
const BTN_H = 36;
const BTN_GAP = 10;
const BTN_MARGIN_BOTTOM = 20;
const RESULT_DISPLAY_MS = 3000;
const MIN_INTERVAL = 3000;
const MAX_INTERVAL = 5000;

/**
 * 小游戏/随机事件系统
 *
 * 每 3000-5000 tick 随机触发一次世界事件，玩家通过弹窗选项做出决策，
 * 选择结果展示 3 秒后自动关闭。所有事件和选择记录在历史中。
 */
export class MiniGameSystem {
  private active: ActiveEvent | null = null;
  private history: HistoryEntry[] = [];
  private nextTriggerTick: number;

  constructor() {
    this.nextTriggerTick = MIN_INTERVAL + Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL));
  }

  /**
   * 每帧更新，检查是否触发新事件或关闭结果弹窗
   * @param tick - 当前世界 tick
   */
  update(tick: number): void {
    if (this.active) {
      if (this.active.chosenOption && this.active.resultShownAt > 0) {
        const now = performance.now();
        if (now - this.active.resultShownAt >= RESULT_DISPLAY_MS) {
          this.active = null;
        }
      }
      return;
    }
    if (tick >= this.nextTriggerTick) {
      this.triggerRandomEvent(tick);
      this.nextTriggerTick = tick + MIN_INTERVAL + Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL));
    }
  }

  /**
   * 渲染事件弹窗
   * @param ctx - Canvas 2D 渲染上下文
   * @param screenW - 屏幕宽度
   * @param screenH - 屏幕高度
   */
  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.active) return;

    const px = (screenW - POPUP_W) / 2;
    const py = (screenH - POPUP_H) / 2;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, screenW, screenH);

    // 弹窗背景
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#e0a030';
    ctx.lineWidth = 2;
    roundRect(ctx, px, py, POPUP_W, POPUP_H, 12);
    ctx.fill();
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#f0c040';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.active.template.title, screenW / 2, py + 40);

    if (this.active.chosenOption) {
      // 显示结果
      ctx.fillStyle = '#d0d0d0';
      ctx.font = '15px sans-serif';
      if (!this.active.resultLines) {
        this.active.resultLines = this.computeWrappedLines(ctx, this.active.chosenOption.resultText, POPUP_W - 60);
      }
      const rLines = this.active.resultLines;
      for (let li = 0; li < rLines.length; li++) ctx.fillText(rLines[li], screenW / 2, py + 90 + li * 22);
    } else {
      // 描述
      ctx.fillStyle = '#b0b0c0';
      ctx.font = '14px sans-serif';
      if (!this.active.descLines) {
        this.active.descLines = this.computeWrappedLines(ctx, this.active.template.description, POPUP_W - 60);
      }
      const dLines = this.active.descLines;
      for (let li = 0; li < dLines.length; li++) ctx.fillText(dLines[li], screenW / 2, py + 80 + li * 20);

      // 选项按钮
      const opts = this.active.template.options;
      const totalBtnW = POPUP_W - 40;
      const btnW = (totalBtnW - BTN_GAP * (opts.length - 1)) / opts.length;
      const btnY = py + POPUP_H - BTN_MARGIN_BOTTOM - BTN_H;

      for (let i = 0; i < opts.length; i++) {
        const btnX = px + 20 + i * (btnW + BTN_GAP);
        ctx.fillStyle = '#2a4a7f';
        ctx.strokeStyle = '#5090e0';
        ctx.lineWidth = 1;
        roundRect(ctx, btnX, btnY, btnW, BTN_H, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e0e8ff';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(opts[i].label, btnX + btnW / 2, btnY + BTN_H / 2 + 5);
      }
    }
  }

  /**
   * 获取事件历史记录
   * @returns 所有已完成事件的历史数组
   */
  getHistory(): HistoryEntry[] {
    return this.history.slice();
  }

  /**
   * 当前是否有活跃事件弹窗
   * @returns true 表示有事件正在展示
   */
  isActive(): boolean {
    return this.active !== null;
  }

  // --- 私有方法 ---

  /** 随机触发一个事件 */
  private triggerRandomEvent(tick: number): void {
    const idx = Math.floor(Math.random() * EVENT_TEMPLATES.length);
    this.active = {
      template: EVENT_TEMPLATES[idx],
      triggeredAt: tick,
      chosenOption: null,
      resultShownAt: 0,
      descLines: null,
      resultLines: null,
    };
  }

  /** 绘制圆角矩形路径 */

  /** 自动换行绘制文字 */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string, cx: number, startY: number, maxW: number, lineH: number
  ): void {
    const lines = this.computeWrappedLines(ctx, text, maxW);
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], cx, startY + i * lineH);
  }

  /** Compute character-wrapped lines for text within maxW pixels */
  private computeWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const chars = text.split('');
    const lines: string[] = [];
    let line = '';
    for (const ch of chars) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line.length > 0) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
}
