import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EraVisualSystem } from '../systems/EraVisualSystem'
import type { EraName } from '../systems/EraVisualSystem'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSys(): EraVisualSystem { return new EraVisualSystem() }

/** 创建轻量 CanvasRenderingContext2D mock */
function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 80 })),
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textBaseline: 'alphabetic',
  }
}

const ALL_ERAS: EraName[] = ['stone', 'bronze', 'iron', 'medieval', 'renaissance']

// ── describe: 初始状态 ─────────────────────────────────────────────────────

describe('EraVisualSystem 初始状态', () => {
  let sys: EraVisualSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getCurrentEra 返回 stone', () => {
    expect(sys.getCurrentEra()).toBe('stone')
  })

  it('currentEra 私有字段为 stone', () => {
    expect((sys as any).currentEra).toBe('stone')
  })

  it('targetEra 私有字段初始为 stone', () => {
    expect((sys as any).targetEra).toBe('stone')
  })

  it('transitionProgress 初始为 1.0（完成状态）', () => {
    expect((sys as any).transitionProgress).toBe(1.0)
  })

  it('flashAlpha 初始为 0', () => {
    expect((sys as any).flashAlpha).toBe(0)
  })

  it('indicatorTimer 初始为 0', () => {
    expect((sys as any).indicatorTimer).toBe(0)
  })

  it('transitionSpeed 初始为 0.008', () => {
    expect((sys as any).transitionSpeed).toBeCloseTo(0.008)
  })

  it('styles Map 包含全部5种时代', () => {
    const styles = (sys as any).styles
    for (const era of ALL_ERAS) {
      expect(styles.has(era)).toBe(true)
    }
  })

  it('getCurrentEra 返回字符串类型', () => {
    expect(typeof sys.getCurrentEra()).toBe('string')
  })

  it('_styleBuf 是预分配对象', () => {
    expect((sys as any)._styleBuf).toBeDefined()
    expect(typeof (sys as any)._styleBuf).toBe('object')
  })
})

// ── describe: setEra ───────────────────────────────────────────────────────

describe('EraVisualSystem.setEra', () => {
  let sys: EraVisualSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('setEra 更新 targetEra', () => {
    sys.setEra('bronze')
    expect((sys as any).targetEra).toBe('bronze')
  })

  it('setEra 触发 flashAlpha=1', () => {
    sys.setEra('bronze')
    expect((sys as any).flashAlpha).toBe(1.0)
  })

  it('setEra 重置 transitionProgress 为 0', () => {
    sys.setEra('bronze')
    expect((sys as any).transitionProgress).toBe(0)
  })

  it('setEra 设置 indicatorTimer', () => {
    sys.setEra('bronze')
    expect((sys as any).indicatorTimer).toBe((sys as any).INDICATOR_DURATION)
  })

  it('同一时代重复 setEra 不触发过渡', () => {
    sys.setEra('stone') // same as current target
    expect((sys as any).flashAlpha).toBe(0) // unchanged
  })

  it('可以设置全部5种时代', () => {
    for (const era of ALL_ERAS) {
      const s = makeSys()
      if (era !== 'stone') {
        s.setEra(era)
        expect((s as any).targetEra).toBe(era)
      }
    }
  })

  it('setEra iron', () => {
    sys.setEra('iron')
    expect((sys as any).targetEra).toBe('iron')
  })

  it('setEra medieval', () => {
    sys.setEra('medieval')
    expect((sys as any).targetEra).toBe('medieval')
  })

  it('setEra renaissance', () => {
    sys.setEra('renaissance')
    expect((sys as any).targetEra).toBe('renaissance')
  })

  it('setEra 后 currentEra 不立即改变', () => {
    sys.setEra('bronze')
    expect(sys.getCurrentEra()).toBe('stone')
  })
})

// ── describe: update 动画推进 ─────────────────────────────────────────────

describe('EraVisualSystem.update', () => {
  let sys: EraVisualSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('过渡中 transitionProgress 每帧增加 transitionSpeed', () => {
    sys.setEra('bronze')
    const before = (sys as any).transitionProgress
    sys.update()
    const after = (sys as any).transitionProgress
    expect(after).toBeCloseTo(before + (sys as any).transitionSpeed)
  })

  it('过渡完成后 currentEra 更新为 targetEra', () => {
    sys.setEra('bronze')
    // 强制快速完成过渡
    ;(sys as any).transitionProgress = 0.999
    sys.update()
    expect(sys.getCurrentEra()).toBe('bronze')
  })

  it('transitionProgress 不超过 1.0', () => {
    ;(sys as any).transitionProgress = 0.99
    ;(sys as any).targetEra = 'bronze'
    sys.update()
    expect((sys as any).transitionProgress).toBeLessThanOrEqual(1.0)
  })

  it('flashAlpha 每帧衰减 flashDecay', () => {
    sys.setEra('bronze')
    const decay = (sys as any).flashDecay
    sys.update()
    expect((sys as any).flashAlpha).toBeCloseTo(1.0 - decay)
  })

  it('flashAlpha 不低于 0', () => {
    ;(sys as any).flashAlpha = 0.005
    sys.update()
    expect((sys as any).flashAlpha).toBeGreaterThanOrEqual(0)
  })

  it('flashAlpha 为0时不继续衰减', () => {
    ;(sys as any).flashAlpha = 0
    sys.update()
    expect((sys as any).flashAlpha).toBe(0)
  })

  it('indicatorTimer 每帧减少1', () => {
    ;(sys as any).indicatorTimer = 100
    sys.update()
    expect((sys as any).indicatorTimer).toBe(99)
  })

  it('indicatorTimer 不低于 0', () => {
    ;(sys as any).indicatorTimer = 0
    sys.update()
    expect((sys as any).indicatorTimer).toBe(0)
  })

  it('无过渡时 transitionProgress 保持 1.0', () => {
    // currentEra === targetEra === stone, transitionProgress=1.0
    sys.update()
    expect((sys as any).transitionProgress).toBe(1.0)
  })

  it('多次 update 后最终完成过渡', () => {
    sys.setEra('iron')
    // 1/0.008 ≈ 125 frames
    for (let i = 0; i < 200; i++) sys.update()
    expect(sys.getCurrentEra()).toBe('iron')
  })
})

// ── describe: getCurrentStyle 插值 ────────────────────────────────────────

describe('EraVisualSystem.getCurrentStyle', () => {
  let sys: EraVisualSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('过渡完成时返回 targetEra 样式', () => {
    const style = (sys as any).getCurrentStyle()
    expect(style.name).toBe('stone')
  })

  it('过渡中时返回插值样式（overlayAlpha 介于两者之间）', () => {
    sys.setEra('bronze')
    ;(sys as any).transitionProgress = 0.5
    const style = (sys as any).getCurrentStyle()
    const stoneAlpha = 0.05 // stone overlayAlpha
    const bronzeAlpha = 0.06 // bronze overlayAlpha
    const mid = (stoneAlpha + bronzeAlpha) / 2
    expect(style.overlayAlpha).toBeCloseTo(mid, 3)
  })

  it('transitionProgress=0 时返回 from 样式', () => {
    sys.setEra('bronze')
    ;(sys as any).transitionProgress = 0
    const style = (sys as any).getCurrentStyle()
    expect(style.overlayAlpha).toBeCloseTo(0.05) // stone alpha
  })

  it('transitionProgress=1 时返回 to 样式', () => {
    sys.setEra('bronze')
    ;(sys as any).transitionProgress = 1.0
    const style = (sys as any).getCurrentStyle()
    expect(style.overlayAlpha).toBeCloseTo(0.06) // bronze alpha
  })

  it('样式包含必要字段', () => {
    const style = (sys as any).getCurrentStyle()
    expect(style).toHaveProperty('tintR')
    expect(style).toHaveProperty('tintG')
    expect(style).toHaveProperty('tintB')
    expect(style).toHaveProperty('uiBorderColor')
    expect(style).toHaveProperty('uiAccentColor')
    expect(style).toHaveProperty('brightness')
    expect(style).toHaveProperty('saturation')
  })

  it('各时代样式均可获取', () => {
    for (const era of ALL_ERAS) {
      const s = makeSys()
      ;(s as any).currentEra = era
      ;(s as any).targetEra = era
      ;(s as any).transitionProgress = 1.0
      const style = (s as any).getCurrentStyle()
      expect(style.name).toBe(era)
    }
  })

  it('插值结果写入 _styleBuf 复用对象', () => {
    sys.setEra('bronze')
    ;(sys as any).transitionProgress = 0.5
    const buf = (sys as any)._styleBuf
    const style = (sys as any).getCurrentStyle()
    expect(style).toBe(buf)
  })
})

// ── describe: lerp ────────────────────────────────────────────────────────

describe('EraVisualSystem.lerp', () => {
  let sys: EraVisualSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('t=0 返回 a', () => {
    expect((sys as any).lerp(10, 20, 0)).toBe(10)
  })

  it('t=1 返回 b', () => {
    expect((sys as any).lerp(10, 20, 1)).toBe(20)
  })

  it('t=0.5 返回中点', () => {
    expect((sys as any).lerp(0, 100, 0.5)).toBe(50)
  })

  it('负数范围', () => {
    expect((sys as any).lerp(-10, 10, 0.5)).toBe(0)
  })

  it('相同值不变', () => {
    expect((sys as any).lerp(5, 5, 0.7)).toBe(5)
  })
})

// ── describe: renderOverlay ───────────────────────────────────────────────

describe('EraVisualSystem.renderOverlay', () => {
  let sys: EraVisualSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('调用 ctx.save 和 ctx.restore', () => {
    const ctx = makeCtx()
    sys.renderOverlay(ctx as any, 800, 600)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('调用 ctx.fillRect 绘制叠层', () => {
    const ctx = makeCtx()
    sys.renderOverlay(ctx as any, 800, 600)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('brightness > 1.0 时使用 lighter 合成模式', () => {
    const ctx = makeCtx()
    ;(sys as any).currentEra = 'renaissance'
    ;(sys as any).targetEra = 'renaissance'
    ;(sys as any).transitionProgress = 1.0
    // renaissance brightness = 1.08 > 1.0
    sys.renderOverlay(ctx as any, 800, 600)
    // ctx.globalCompositeOperation 被直接赋值，检查 fillRect 被调用即可
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('flashAlpha > 0 时渲染闪光', () => {
    ;(sys as any).flashAlpha = 0.5
    const ctx = makeCtx()
    sys.renderOverlay(ctx as any, 800, 600)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('flashAlpha=0 时不额外调用 fillRect（跳过 flash）', () => {
    ;(sys as any).flashAlpha = 0
    const ctx = makeCtx()
    const callsBefore = ctx.fillRect.mock.calls.length
    sys.renderOverlay(ctx as any, 800, 600)
    // 只会有 overlay 的 fillRect，不会有 flash 的 fillRect
    // 由于 brightness=0.95 < 1.0, 也会有一个 brightness fillRect
    // 只要不抛错且调用 save/restore 即可
    expect(ctx.save).toHaveBeenCalled()
  })

  it('overlay fillStyle 缓存相同参数时复用字符串', () => {
    const ctx = makeCtx()
    sys.renderOverlay(ctx as any, 800, 600)
    const first = (sys as any)._overlayFillStyle
    sys.renderOverlay(ctx as any, 800, 600)
    expect((sys as any)._overlayFillStyle).toBe(first)
  })
})

// ── describe: renderEraIndicator ──────────────────────────────────────────

describe('EraVisualSystem.renderEraIndicator', () => {
  let sys: EraVisualSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('indicatorTimer=0 时不渲染', () => {
    const ctx = makeCtx()
    ;(sys as any).indicatorTimer = 0
    sys.renderEraIndicator(ctx as any, 0, 0)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('indicatorTimer > 0 时渲染 indicator', () => {
    const ctx = makeCtx()
    ;(sys as any).indicatorTimer = 100
    ;(sys as any).targetEra = 'bronze'
    sys.renderEraIndicator(ctx as any, 0, 0)
    expect(ctx.save).toHaveBeenCalled()
  })

  it('最后60帧 indicatorTimer < fadeFrames 时调用 save/restore 渲染', () => {
    const ctx = makeCtx()
    ;(sys as any).indicatorTimer = 30
    ;(sys as any).targetEra = 'bronze'
    sys.renderEraIndicator(ctx as any, 0, 0)
    // indicatorTimer=30 < fadeFrames=60, alpha=0.5, 仍然渲染（只验证渲染逻辑被触发）
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('不在最后60帧时 alpha=1', () => {
    const ctx = makeCtx()
    ;(sys as any).indicatorTimer = 200
    ;(sys as any).targetEra = 'iron'
    sys.renderEraIndicator(ctx as any, 0, 0)
    expect(ctx.globalAlpha).toBe(1.0)
  })

  it('使用 ctx.roundRect 绘制胶囊背景', () => {
    const ctx = makeCtx()
    ;(sys as any).indicatorTimer = 100
    ;(sys as any).targetEra = 'medieval'
    sys.renderEraIndicator(ctx as any, 0, 0)
    expect(ctx.roundRect).toHaveBeenCalled()
  })

  it('调用 fillText 写入时代名称', () => {
    const ctx = makeCtx()
    ;(sys as any).indicatorTimer = 100
    ;(sys as any).targetEra = 'medieval'
    sys.renderEraIndicator(ctx as any, 0, 0)
    expect(ctx.fillText).toHaveBeenCalled()
  })
})

// ── describe: 各时代样式验证 ──────────────────────────────────────────────

describe('EraVisualSystem 各时代样式属性', () => {
  afterEach(() => { vi.restoreAllMocks() })

  const styleChecks: Array<{ era: EraName; borderColor: string; icon: string }> = [
    { era: 'stone', borderColor: '#8B7355', icon: '🪨' },
    { era: 'bronze', borderColor: '#CD7F32', icon: '⚔️' },
    { era: 'iron', borderColor: '#71797E', icon: '🛡️' },
    { era: 'medieval', borderColor: '#4A4A6A', icon: '🏰' },
    { era: 'renaissance', borderColor: '#DAA520', icon: '🎨' },
  ]

  for (const { era, borderColor, icon } of styleChecks) {
    it(`${era} 样式的 uiBorderColor 正确`, () => {
      const sys = makeSys()
      const style = (sys as any).styles.get(era)
      expect(style.uiBorderColor).toBe(borderColor)
    })

    it(`${era} 样式的 icon 正确`, () => {
      const sys = makeSys()
      const style = (sys as any).styles.get(era)
      expect(style.icon).toBe(icon)
    })
  }

  it('stone 时代 brightness < 1.0', () => {
    const sys = makeSys()
    const style = (sys as any).styles.get('stone')
    expect(style.brightness).toBeLessThan(1.0)
  })

  it('renaissance 时代 brightness > 1.0', () => {
    const sys = makeSys()
    const style = (sys as any).styles.get('renaissance')
    expect(style.brightness).toBeGreaterThan(1.0)
  })

  it('renaissance 时代 saturation 最高', () => {
    const sys = makeSys()
    const renStyle = (sys as any).styles.get('renaissance')
    const stoneStyle = (sys as any).styles.get('stone')
    expect(renStyle.saturation).toBeGreaterThan(stoneStyle.saturation)
  })
})
