/**
 * CreatureEmotionSystem - 生物情绪气泡系统
 *
 * 管理生物头顶的情绪图标气泡，支持淡入淡出动画、浮动弹跳效果，
 * 按优先级显示最重要的情绪状态。
 *
 * 情绪类型：开心😊、饥饿🍖、愤怒😡、恐惧😨、恋爱❤️、悲伤😢、工作⚒️、战斗⚔️
 */

/** 单条情绪记录 */
interface EmotionEntry {
  emotion: string;
  priority: number;
  /** 情绪开始的 tick */
  startTick: number;
  /** 情绪持续 tick 数 */
  duration: number;
  /** 当前透明度 0-1 */
  alpha: number;
  /** 是否正在淡出 */
  fadingOut: boolean;
}

/** 情绪图标映射 */
const EMOTION_ICONS: Record<string, string> = {
  happy: '\u{1F60A}',
  hungry: '\u{1F356}',
  angry: '\u{1F621}',
  fear: '\u{1F628}',
  love: '\u{2764}\u{FE0F}',
  sad: '\u{1F622}',
  work: '\u{2692}\u{FE0F}',
  combat: '\u{2694}\u{FE0F}',
};

/** 淡入持续 tick 数 */
const FADE_IN_TICKS = 15;
/** 淡出持续 tick 数 */
const FADE_OUT_TICKS = 20;
/** 弹跳幅度（像素） */
const BOUNCE_AMPLITUDE = 3;
/** 弹跳速度因子 */
const BOUNCE_SPEED = 0.08;
/** 气泡距离实体头顶的偏移（像素） */
const BUBBLE_OFFSET_Y = -28;
/** 气泡背景圆角半径 */
const BUBBLE_RADIUS = 12;
/** 气泡字体大小 */
const FONT_SIZE = 16;
const EMOTION_FONT = `${FONT_SIZE}px serif`;

/**
 * 生物情绪气泡系统
 *
 * 自包含系统，不依赖项目内其他模块。通过 setEmotion / clearEmotion
 * 控制实体情绪，update 驱动动画，renderForEntity 绘制气泡。
 *
 * @example
 * ```ts
 * const emotionSys = new CreatureEmotionSystem();
 * emotionSys.setEmotion(entityId, 'happy', 120, 1);
 * // 在游戏循环中
 * emotionSys.update(currentTick);
 * emotionSys.renderForEntity(ctx, entityId, screenX, screenY);
 * ```
 */
export class CreatureEmotionSystem {
  /** entityId -> 当前活跃情绪列表（按优先级排序） */
  private readonly emotions: Map<number, EmotionEntry[]> = new Map();
  /** 上一次 update 的 tick，用于计算 delta */
  private lastTick = 0;

  /**
   * 为实体设置一个情绪。同一实体可叠加多个情绪，显示时取最高优先级。
   * 相同 emotion 字符串会覆盖旧记录。
   *
   * @param entityId - 实体 ID
   * @param emotion  - 情绪标识（如 'happy', 'angry'），也可直接传 emoji
   * @param duration - 持续 tick 数
   * @param priority - 优先级，数值越大越优先显示
   */
  setEmotion(entityId: number, emotion: string, duration: number, priority: number): void {
    let list = this.emotions.get(entityId);
    if (!list) {
      list = [];
      this.emotions.set(entityId, list);
    }

    // 查找是否已有同类情绪，有则覆盖
    const idx = list.findIndex(e => e.emotion === emotion);
    const entry: EmotionEntry = {
      emotion,
      priority,
      startTick: this.lastTick,
      duration,
      alpha: 0,
      fadingOut: false,
    };

    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }

    // 按优先级降序排列
    list.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 每 tick 更新所有情绪的动画状态（透明度、过期检测）
   *
   * @param tick - 当前游戏 tick
   */
  update(tick: number): void {
    this.lastTick = tick;

    for (const [entityId, list] of this.emotions) {
      let i = list.length;
      while (i-- > 0) {
        const entry = list[i];
        const elapsed = tick - entry.startTick;

        // 检查是否到期，开始淡出
        if (!entry.fadingOut && elapsed >= entry.duration) {
          entry.fadingOut = true;
        }

        if (entry.fadingOut) {
          // 淡出
          entry.alpha -= 1 / FADE_OUT_TICKS;
          if (entry.alpha <= 0) {
            entry.alpha = 0;
            list.splice(i, 1);
            continue;
          }
        } else {
          // 淡入
          if (entry.alpha < 1) {
            entry.alpha += 1 / FADE_IN_TICKS;
            if (entry.alpha > 1) entry.alpha = 1;
          }
        }
      }

      // 清理空列表
      if (list.length === 0) {
        this.emotions.delete(entityId);
      }
    }
  }

  /**
   * 为指定实体渲染情绪气泡（仅渲染最高优先级的情绪）
   *
   * @param ctx      - Canvas 2D 渲染上下文
   * @param entityId - 实体 ID
   * @param screenX  - 实体在屏幕上的 X 坐标（中心）
   * @param screenY  - 实体在屏幕上的 Y 坐标（顶部）
   */
  renderForEntity(
    ctx: CanvasRenderingContext2D,
    entityId: number,
    screenX: number,
    screenY: number
  ): void {
    const list = this.emotions.get(entityId);
    if (!list || list.length === 0) return;

    // 取最高优先级（列表已排序）
    const top = list[0];
    if (top.alpha <= 0) return;

    const icon = EMOTION_ICONS[top.emotion] ?? top.emotion;

    // 弹跳偏移
    const bounce = Math.sin(this.lastTick * BOUNCE_SPEED) * BOUNCE_AMPLITUDE;
    const bubbleX = screenX;
    const bubbleY = screenY + BUBBLE_OFFSET_Y + bounce;

    ctx.save();
    ctx.globalAlpha = top.alpha;

    // 绘制气泡背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.arc(bubbleX, bubbleY, BUBBLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // 绘制气泡边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bubbleX, bubbleY, BUBBLE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制小三角指向实体
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.moveTo(bubbleX - 4, bubbleY + BUBBLE_RADIUS - 2);
    ctx.lineTo(bubbleX + 4, bubbleY + BUBBLE_RADIUS - 2);
    ctx.lineTo(bubbleX, bubbleY + BUBBLE_RADIUS + 5);
    ctx.closePath();
    ctx.fill();

    // 绘制情绪图标
    ctx.font = EMOTION_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon, bubbleX, bubbleY);

    ctx.restore();
  }

  /**
   * 查询实体当前是否有活跃情绪
   *
   * @param entityId - 实体 ID
   * @returns 是否有活跃情绪
   */
  hasEmotion(entityId: number): boolean {
    const list = this.emotions.get(entityId);
    return list !== undefined && list.length > 0;
  }

  /**
   * 获取实体当前最高优先级的情绪标识
   *
   * @param entityId - 实体 ID
   * @returns 情绪字符串，无情绪时返回 null
   */
  getTopEmotion(entityId: number): string | null {
    const list = this.emotions.get(entityId);
    if (!list || list.length === 0) return null;
    return list[0].emotion;
  }

  /**
   * 获取当前被追踪的实体数量（调试用）
   */
  get trackedCount(): number {
    return this.emotions.size;
  }
}
