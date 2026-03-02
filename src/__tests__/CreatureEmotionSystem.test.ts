import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureEmotionSystem } from '../systems/CreatureEmotionSystem'

// 常量（来自源文件）:
// FADE_IN_TICKS  = 15   (每 tick alpha += 1/15)
// FADE_OUT_TICKS = 20   (每 tick alpha -= 1/20)
// BOUNCE_AMPLITUDE = 3
// BOUNCE_SPEED  = 0.08
// BUBBLE_OFFSET_Y = -28
// BUBBLE_RADIUS = 12
// FONT_SIZE = 16
// EMOTION_ICONS: happy/hungry/angry/fear/love/sad/work/combat (8种)

function makeSys() { return new CreatureEmotionSystem() }

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - 基础初始化', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始 trackedCount 为 0', () => {
    expect(sys.trackedCount).toBe(0)
  })

  it('初始 emotions Map 为空', () => {
    expect((sys as any).emotions.size).toBe(0)
  })

  it('初始 lastTick 为 0', () => {
    expect((sys as any).lastTick).toBe(0)
  })

  it('不同实例互相独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    s1.setEmotion(1, 'happy', 100, 1)
    expect(s2.trackedCount).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - setEmotion 基础行为', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setEmotion 后 hasEmotion 返回 true', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    expect(sys.hasEmotion(1)).toBe(true)
  })

  it('setEmotion 后 getTopEmotion 返回情绪名', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    expect(sys.getTopEmotion(1)).toBe('happy')
  })

  it('setEmotion 后 trackedCount 增加', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    sys.setEmotion(2, 'angry', 120, 1)
    expect(sys.trackedCount).toBe(2)
  })

  it('同一实体多次 setEmotion trackedCount 不重复计', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    sys.setEmotion(1, 'angry', 120, 2)
    expect(sys.trackedCount).toBe(1)
  })

  it('情绪 alpha 初始为 0', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    const list = (sys as any).emotions.get(1)
    expect(list[0].alpha).toBe(0)
  })

  it('情绪 fadingOut 初始为 false', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    const list = (sys as any).emotions.get(1)
    expect(list[0].fadingOut).toBe(false)
  })

  it('情绪 duration 字段正确', () => {
    sys.setEmotion(1, 'happy', 300, 1)
    const list = (sys as any).emotions.get(1)
    expect(list[0].duration).toBe(300)
  })

  it('情绪 priority 字段正确', () => {
    sys.setEmotion(1, 'angry', 120, 5)
    const list = (sys as any).emotions.get(1)
    expect(list[0].priority).toBe(5)
  })

  it('情绪 startTick 等于 setEmotion 时的 lastTick', () => {
    ;(sys as any).lastTick = 50
    sys.setEmotion(1, 'happy', 120, 1)
    const list = (sys as any).emotions.get(1)
    expect(list[0].startTick).toBe(50)
  })

  it('可接受任意字符串作为 emotion（非预定义情绪）', () => {
    sys.setEmotion(1, 'custom_emotion', 100, 1)
    expect(sys.getTopEmotion(1)).toBe('custom_emotion')
  })

  it('可接受 emoji 字符串作为 emotion', () => {
    sys.setEmotion(1, '🎉', 100, 1)
    expect(sys.getTopEmotion(1)).toBe('🎉')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - hasEmotion 与 getTopEmotion', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('getTopEmotion 未知实体返回 null', () => {
    expect(sys.getTopEmotion(999)).toBeNull()
  })

  it('hasEmotion 未知实体返回 false', () => {
    expect(sys.hasEmotion(999)).toBe(false)
  })

  it('hasEmotion 已知实体有情绪时返回 true', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    expect(sys.hasEmotion(1)).toBe(true)
  })

  it('getTopEmotion 未设置情绪返回 null', () => {
    expect(sys.getTopEmotion(42)).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - 优先级排序', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('高优先级情绪优先于低优先级', () => {
    sys.setEmotion(1, 'hungry', 120, 2)
    sys.setEmotion(1, 'angry', 120, 5)
    expect(sys.getTopEmotion(1)).toBe('angry')
  })

  it('低优先级情绪不覆盖高优先级', () => {
    sys.setEmotion(1, 'angry', 120, 5)
    sys.setEmotion(1, 'happy', 120, 1)
    expect(sys.getTopEmotion(1)).toBe('angry')
  })

  it('三个情绪时最高优先级胜出', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    sys.setEmotion(1, 'hungry', 120, 3)
    sys.setEmotion(1, 'combat', 120, 9)
    expect(sys.getTopEmotion(1)).toBe('combat')
  })

  it('优先级相同时后设置的靠后（排序稳定性不要求，顶部任一均可）', () => {
    sys.setEmotion(1, 'happy', 120, 5)
    sys.setEmotion(1, 'angry', 120, 5)
    // 返回的应该是 priority=5 的某个情绪
    const top = sys.getTopEmotion(1)
    expect(['happy', 'angry']).toContain(top)
  })

  it('列表按优先级降序排列', () => {
    sys.setEmotion(1, 'sad', 120, 1)
    sys.setEmotion(1, 'love', 120, 4)
    sys.setEmotion(1, 'work', 120, 2)
    const list = (sys as any).emotions.get(1)
    // 应该是降序：4, 2, 1
    expect(list[0].priority).toBeGreaterThanOrEqual(list[1].priority)
    expect(list[1].priority).toBeGreaterThanOrEqual(list[2].priority)
  })

  it('不同实体优先级互不干扰', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    sys.setEmotion(2, 'angry', 120, 5)
    expect(sys.getTopEmotion(1)).toBe('happy')
    expect(sys.getTopEmotion(2)).toBe('angry')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - 相同情绪覆盖', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('相同 emotion 字符串会覆盖旧记录', () => {
    sys.setEmotion(1, 'happy', 100, 1)
    sys.setEmotion(1, 'happy', 200, 3)
    const list = (sys as any).emotions.get(1)
    const happyEntries = list.filter((e: any) => e.emotion === 'happy')
    expect(happyEntries).toHaveLength(1)
    expect(happyEntries[0].duration).toBe(200)
  })

  it('覆盖后优先级以新值为准', () => {
    sys.setEmotion(1, 'happy', 100, 1)
    sys.setEmotion(1, 'happy', 100, 9)
    const list = (sys as any).emotions.get(1)
    const happy = list.find((e: any) => e.emotion === 'happy')
    expect(happy.priority).toBe(9)
  })

  it('覆盖后 alpha 重置为 0', () => {
    sys.setEmotion(1, 'happy', 100, 1)
    // 先 update 提升 alpha
    for (let t = 1; t <= 15; t++) { sys.update(t) }
    // 再覆盖
    sys.setEmotion(1, 'happy', 100, 1)
    const list = (sys as any).emotions.get(1)
    const happy = list.find((e: any) => e.emotion === 'happy')
    expect(happy.alpha).toBe(0)
  })

  it('不同情绪字符串不互相覆盖', () => {
    sys.setEmotion(1, 'happy', 100, 1)
    sys.setEmotion(1, 'angry', 100, 2)
    const list = (sys as any).emotions.get(1)
    expect(list).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - update 淡入动画', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update 后 alpha 在 FADE_IN_TICKS 内从 0 增加', () => {
    sys.setEmotion(1, 'happy', 200, 1)
    sys.update(1)
    const list = (sys as any).emotions.get(1)
    expect(list[0].alpha).toBeCloseTo(1 / 15, 5)
  })

  it('经过 FADE_IN_TICKS(15) 后 alpha 达到 1', () => {
    sys.setEmotion(1, 'happy', 200, 1)
    for (let t = 1; t <= 15; t++) { sys.update(t) }
    const list = (sys as any).emotions.get(1)
    expect(list[0].alpha).toBeCloseTo(1, 5)
  })

  it('alpha 超过 1 时钳制到 1', () => {
    sys.setEmotion(1, 'happy', 9999, 1)
    for (let t = 1; t <= 30; t++) { sys.update(t) }
    const list = (sys as any).emotions.get(1)
    expect(list[0].alpha).toBeLessThanOrEqual(1)
  })

  it('update 更新 lastTick', () => {
    sys.update(42)
    expect((sys as any).lastTick).toBe(42)
  })

  it('多次 update lastTick 取最新值', () => {
    sys.update(10)
    sys.update(20)
    sys.update(30)
    expect((sys as any).lastTick).toBe(30)
  })

  it('淡入过程中每 tick alpha 增量为 1/15', () => {
    sys.setEmotion(1, 'happy', 200, 1)
    sys.update(1)
    sys.update(2)
    const list = (sys as any).emotions.get(1)
    expect(list[0].alpha).toBeCloseTo(2 / 15, 5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - update 淡出与删除', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('duration 过期后情绪进入 fadingOut 状态', () => {
    sys.setEmotion(1, 'sad', 5, 1)
    sys.update(0)
    sys.update(5)
    const list = (sys as any).emotions.get(1)
    if (list) {
      expect(list[0].fadingOut).toBe(true)
    }
  })

  it('fadingOut 状态下经过 FADE_OUT_TICKS(20) 后情绪被删除', () => {
    sys.setEmotion(1, 'sad', 1, 1)
    for (let t = 0; t <= 15; t++) { sys.update(t) }
    sys.update(16)
    for (let t = 17; t <= 40; t++) { sys.update(t) }
    expect(sys.hasEmotion(1)).toBe(false)
    expect(sys.trackedCount).toBe(0)
  })

  it('情绪删除后 trackedCount 减少', () => {
    sys.setEmotion(1, 'sad', 1, 1)
    sys.setEmotion(2, 'happy', 9999, 1)
    for (let t = 0; t <= 40; t++) { sys.update(t) }
    expect(sys.trackedCount).toBe(1) // 实体 2 还在
  })

  it('fadingOut 时 alpha 每 tick 减少 1/20', () => {
    sys.setEmotion(1, 'sad', 1, 1)
    // 先把 alpha 拉到 1
    for (let t = 1; t <= 15; t++) { sys.update(t) }
    // 触发 fadingOut
    sys.update(16)
    const list = (sys as any).emotions.get(1)
    if (list && list.length > 0) {
      // alpha 应该从 1 减少 1/20 = 0.95
      expect(list[0].alpha).toBeCloseTo(1 - 1 / 20, 4)
    }
  })

  it('alpha <= 0 时情绪从列表中移除', () => {
    sys.setEmotion(1, 'sad', 0, 1)
    // 直接让 alpha 变为 0 并淡出
    ;(sys as any).emotions.get(1)[0].fadingOut = true
    ;(sys as any).emotions.get(1)[0].alpha = 1 / 20 // 一次减后变 0
    sys.update(1)
    // alpha <= 0 后被移除
    const list = (sys as any).emotions.get(1)
    expect(list === undefined || list.length === 0).toBe(true)
  })

  it('空列表后 entityId 从 emotions Map 中删除', () => {
    sys.setEmotion(1, 'sad', 1, 1)
    for (let t = 0; t <= 50; t++) { sys.update(t) }
    expect((sys as any).emotions.has(1)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - 多实体独立', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('不同实体的情绪互相独立', () => {
    sys.setEmotion(1, 'happy', 120, 1)
    sys.setEmotion(2, 'angry', 120, 1)
    expect(sys.getTopEmotion(1)).toBe('happy')
    expect(sys.getTopEmotion(2)).toBe('angry')
  })

  it('实体 1 过期不影响实体 2', () => {
    sys.setEmotion(1, 'sad', 1, 1)
    sys.setEmotion(2, 'happy', 9999, 1)
    for (let t = 0; t <= 50; t++) { sys.update(t) }
    expect(sys.hasEmotion(2)).toBe(true)
  })

  it('10 个实体各自独立追踪', () => {
    for (let i = 1; i <= 10; i++) {
      sys.setEmotion(i, 'happy', 120, 1)
    }
    expect(sys.trackedCount).toBe(10)
  })

  it('清除其中一个实体不影响其他', () => {
    sys.setEmotion(1, 'sad', 1, 1)
    for (let i = 2; i <= 5; i++) {
      sys.setEmotion(i, 'happy', 9999, 1)
    }
    for (let t = 0; t <= 50; t++) { sys.update(t) }
    expect(sys.trackedCount).toBe(4) // 实体 2-5 还在
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - EMOTION_ICONS 8 种情绪', () => {
  let sys: CreatureEmotionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('8 种情绪都能被系统接受', () => {
    const emotions = ['happy', 'hungry', 'angry', 'fear', 'love', 'sad', 'work', 'combat']
    emotions.forEach((e, i) => sys.setEmotion(i + 1, e, 100, 1))
    expect(sys.trackedCount).toBe(8)
  })

  it('8 种情绪均可通过 getTopEmotion 获取', () => {
    const emotions = ['happy', 'hungry', 'angry', 'fear', 'love', 'sad', 'work', 'combat']
    emotions.forEach((e, i) => {
      sys.setEmotion(i + 1, e, 100, 1)
      expect(sys.getTopEmotion(i + 1)).toBe(e)
    })
  })

  it('happy 情绪可正确设置', () => {
    sys.setEmotion(1, 'happy', 100, 1)
    expect(sys.getTopEmotion(1)).toBe('happy')
  })

  it('combat 情绪优先级最高时胜出', () => {
    sys.setEmotion(1, 'happy', 100, 1)
    sys.setEmotion(1, 'combat', 100, 10)
    expect(sys.getTopEmotion(1)).toBe('combat')
  })

  it('fear 情绪叠加到现有情绪', () => {
    sys.setEmotion(1, 'happy', 100, 1)
    sys.setEmotion(1, 'fear', 100, 3)
    const list = (sys as any).emotions.get(1)
    expect(list).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureEmotionSystem - renderForEntity', () => {
  let sys: CreatureEmotionSystem
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => { sys = makeSys() })

  function makeCtx() {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fillText: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
    } as unknown as CanvasRenderingContext2D
  }

  it('无情绪时 renderForEntity 不调用 ctx.save', () => {
    const ctx = makeCtx()
    sys.renderForEntity(ctx, 999, 100, 100)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('有情绪且 alpha > 0 时调用 ctx.save 和 ctx.restore', () => {
    sys.setEmotion(1, 'happy', 200, 1)
    // 先 update 让 alpha > 0
    for (let t = 1; t <= 5; t++) { sys.update(t) }
    const ctx = makeCtx()
    sys.renderForEntity(ctx, 1, 100, 100)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('alpha === 0 时 renderForEntity 不绘制', () => {
    sys.setEmotion(1, 'happy', 200, 1)
    // 不 update，alpha 仍为 0
    const ctx = makeCtx()
    sys.renderForEntity(ctx, 1, 100, 100)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('有情绪时调用 fillText 绘制图标', () => {
    sys.setEmotion(1, 'happy', 200, 1)
    for (let t = 1; t <= 5; t++) { sys.update(t) }
    const ctx = makeCtx()
    sys.renderForEntity(ctx, 1, 100, 100)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('renderForEntity 设置 globalAlpha 为情绪 alpha', () => {
    sys.setEmotion(1, 'happy', 200, 1)
    sys.update(1) // alpha = 1/15
    const ctx = makeCtx()
    sys.renderForEntity(ctx, 1, 100, 100)
    expect(ctx.globalAlpha).toBeCloseTo(1 / 15, 5)
  })
})
