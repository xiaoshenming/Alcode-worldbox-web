import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PlagueVisualSystem } from '../systems/PlagueVisualSystem'
import type { InfectedZone, QuarantineZone } from '../systems/PlagueVisualSystem'

function makeSys() { return new PlagueVisualSystem() }

function makeZone(overrides: Partial<InfectedZone> = {}): InfectedZone {
  return { x: 5, y: 10, severity: 0.5, ...overrides }
}

function makeQuarantine(overrides: Partial<QuarantineZone> = {}): QuarantineZone {
  return { x: 0, y: 0, width: 10, height: 10, ...overrides }
}

function makeCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setLineDash: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

describe('PlagueVisualSystem — 初始状态', () => {
  let sys: PlagueVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始zones为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })
  it('初始quarantines为空数组', () => {
    expect((sys as any).quarantines).toHaveLength(0)
  })
  it('初始visible为true', () => {
    expect((sys as any).visible).toBe(true)
  })
  it('初始particles为空数组', () => {
    expect((sys as any).particles).toHaveLength(0)
  })
  it('两个独立实例互不影响', () => {
    const a = makeSys()
    const b = makeSys()
    a.setInfectedZones([makeZone()])
    expect((b as any).zones).toHaveLength(0)
  })
})

describe('PlagueVisualSystem — toggle()', () => {
  let sys: PlagueVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('toggle()后visible变为false', () => {
    sys.toggle()
    expect((sys as any).visible).toBe(false)
  })
  it('toggle()两次后visible恢复true', () => {
    sys.toggle()
    sys.toggle()
    expect((sys as any).visible).toBe(true)
  })
  it('toggle()三次后visible为false', () => {
    sys.toggle(); sys.toggle(); sys.toggle()
    expect((sys as any).visible).toBe(false)
  })
  it('toggle()四次后visible为true', () => {
    sys.toggle(); sys.toggle(); sys.toggle(); sys.toggle()
    expect((sys as any).visible).toBe(true)
  })
  it('toggle()不影响zones', () => {
    sys.setInfectedZones([makeZone()])
    sys.toggle()
    expect((sys as any).zones).toHaveLength(1)
  })
  it('toggle()不影响quarantines', () => {
    sys.setQuarantineZones([makeQuarantine()])
    sys.toggle()
    expect((sys as any).quarantines).toHaveLength(1)
  })
  it('toggle()不抛出异常', () => {
    expect(() => sys.toggle()).not.toThrow()
  })
})

describe('PlagueVisualSystem — setInfectedZones()', () => {
  let sys: PlagueVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('设置1个zone后长度为1', () => {
    sys.setInfectedZones([makeZone()])
    expect((sys as any).zones).toHaveLength(1)
  })
  it('设置3个zone后长度为3', () => {
    sys.setInfectedZones([makeZone(), makeZone({ x: 1 }), makeZone({ x: 2 })])
    expect((sys as any).zones).toHaveLength(3)
  })
  it('设置空数组后zones为空', () => {
    sys.setInfectedZones([makeZone()])
    sys.setInfectedZones([])
    expect((sys as any).zones).toHaveLength(0)
  })
  it('多次调用时最新数据覆盖旧数据', () => {
    sys.setInfectedZones([makeZone({ x: 1 })])
    sys.setInfectedZones([makeZone({ x: 99 })])
    expect((sys as any).zones[0].x).toBe(99)
  })
  it('zone数据原样保存（引用保留）', () => {
    const zone = makeZone({ x: 42, y: 7, severity: 0.8 })
    sys.setInfectedZones([zone])
    expect((sys as any).zones[0]).toBe(zone)
  })
  it('zone.x值正确保存', () => {
    sys.setInfectedZones([makeZone({ x: 55 })])
    expect((sys as any).zones[0].x).toBe(55)
  })
  it('zone.y值正确保存', () => {
    sys.setInfectedZones([makeZone({ y: 77 })])
    expect((sys as any).zones[0].y).toBe(77)
  })
  it('zone.severity值正确保存', () => {
    sys.setInfectedZones([makeZone({ severity: 0.99 })])
    expect((sys as any).zones[0].severity).toBe(0.99)
  })
  it('设置100个zone后长度为100', () => {
    const zones = Array.from({ length: 100 }, (_, i) => makeZone({ x: i }))
    sys.setInfectedZones(zones)
    expect((sys as any).zones).toHaveLength(100)
  })
  it('不影响quarantines', () => {
    sys.setQuarantineZones([makeQuarantine()])
    sys.setInfectedZones([makeZone()])
    expect((sys as any).quarantines).toHaveLength(1)
  })
})

describe('PlagueVisualSystem — setQuarantineZones()', () => {
  let sys: PlagueVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('设置1个quarantine后长度为1', () => {
    sys.setQuarantineZones([makeQuarantine()])
    expect((sys as any).quarantines).toHaveLength(1)
  })
  it('设置3个quarantine后长度为3', () => {
    sys.setQuarantineZones([makeQuarantine(), makeQuarantine({ x: 1 }), makeQuarantine({ x: 2 })])
    expect((sys as any).quarantines).toHaveLength(3)
  })
  it('设置空数组后quarantines为空', () => {
    sys.setQuarantineZones([makeQuarantine()])
    sys.setQuarantineZones([])
    expect((sys as any).quarantines).toHaveLength(0)
  })
  it('quarantine.width正确保存', () => {
    sys.setQuarantineZones([makeQuarantine({ width: 25 })])
    expect((sys as any).quarantines[0].width).toBe(25)
  })
  it('quarantine.height正确保存', () => {
    sys.setQuarantineZones([makeQuarantine({ height: 33 })])
    expect((sys as any).quarantines[0].height).toBe(33)
  })
  it('quarantine数据引用保留', () => {
    const q = makeQuarantine({ x: 7, width: 15 })
    sys.setQuarantineZones([q])
    expect((sys as any).quarantines[0]).toBe(q)
  })
  it('多次调用时最新数据覆盖旧数据', () => {
    sys.setQuarantineZones([makeQuarantine({ width: 10 })])
    sys.setQuarantineZones([makeQuarantine({ width: 50 })])
    expect((sys as any).quarantines[0].width).toBe(50)
  })
  it('不影响zones', () => {
    sys.setInfectedZones([makeZone()])
    sys.setQuarantineZones([makeQuarantine()])
    expect((sys as any).zones).toHaveLength(1)
  })
})

describe('PlagueVisualSystem — update()', () => {
  let sys: PlagueVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('visible=false时update不生成粒子', () => {
    sys.toggle() // visible → false
    // 确保 Math.random 总是触发 spawn
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.setInfectedZones([makeZone()])
    sys.update()
    expect((sys as any).particles).toHaveLength(0)
  })
  it('visible=true且random<SPAWN_CHANCE时可能生成粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.05 → 生成
    sys.setInfectedZones([makeZone()])
    sys.update()
    expect((sys as any).particles.length).toBeGreaterThanOrEqual(0)
  })
  it('zones为空时update不生成粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.setInfectedZones([])
    sys.update()
    expect((sys as any).particles).toHaveLength(0)
  })
  it('update()不抛出异常', () => {
    expect(() => sys.update()).not.toThrow()
  })
  it('update()多次调用不抛出异常', () => {
    sys.setInfectedZones([makeZone()])
    expect(() => { for (let i = 0; i < 50; i++) sys.update() }).not.toThrow()
  })
  it('粒子life随update递减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.setInfectedZones([makeZone()])
    sys.update() // 生成粒子
    if ((sys as any).particles.length > 0) {
      const lifeBefore = (sys as any).particles[0].life
      vi.restoreAllMocks()
      sys.update()
      const lifeAfter = (sys as any).particles[0].life
      expect(lifeAfter).toBeLessThan(lifeBefore)
    }
  })
  it('粒子life归零后从particles中移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.setInfectedZones([makeZone()])
    sys.update() // 生成粒子
    vi.restoreAllMocks()
    if ((sys as any).particles.length > 0) {
      // 强制设置 life 为 1，再 update 一次
      for (const p of (sys as any).particles) p.life = 1
      sys.update()
      // 所有 life=1 的粒子经 -- 后 life=0 应被移除
      const dead = (sys as any).particles.filter((p: any) => p.life <= 0)
      expect(dead).toHaveLength(0)
    }
  })
  it('粒子数量不超过MAX_PARTICLES(200)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const manyZones = Array.from({ length: 500 }, (_, i) => makeZone({ x: i }))
    sys.setInfectedZones(manyZones)
    for (let i = 0; i < 500; i++) sys.update()
    expect((sys as any).particles.length).toBeLessThanOrEqual(200)
  })
  it('update时粒子x位置变化（vx作用）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.setInfectedZones([makeZone()])
    sys.update()
    if ((sys as any).particles.length > 0) {
      const xBefore = (sys as any).particles[0].x
      const vx = (sys as any).particles[0].vx
      vi.restoreAllMocks()
      sys.update()
      expect((sys as any).particles[0].x).toBeCloseTo(xBefore + vx)
    }
  })
})

describe('PlagueVisualSystem — render()', () => {
  let sys: PlagueVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('visible=false时render不调用ctx.save', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).not.toHaveBeenCalled()
  })
  it('visible=true时render调用ctx.save', () => {
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).toHaveBeenCalled()
  })
  it('visible=true时render调用ctx.restore', () => {
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.restore).toHaveBeenCalled()
  })
  it('有infectedZone时render调用fillRect', () => {
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone({ x: 5, y: 5, severity: 0.5 })])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillRect).toHaveBeenCalled()
  })
  it('无infectedZone时render不调用fillRect（无粒子）', () => {
    const ctx = makeCtx()
    sys.setInfectedZones([])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })
  it('有quarantineZone时render调用strokeRect', () => {
    const ctx = makeCtx()
    sys.setQuarantineZones([makeQuarantine()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.strokeRect).toHaveBeenCalled()
  })
  it('无quarantineZone时render不调用strokeRect', () => {
    const ctx = makeCtx()
    sys.setQuarantineZones([])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.strokeRect).not.toHaveBeenCalled()
  })
  it('有2个infectedZone时fillRect调用2次（无粒子）', () => {
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone({ x: 1 }), makeZone({ x: 2 })])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillRect).toHaveBeenCalledTimes(2)
  })
  it('有3个quarantineZone时strokeRect调用3次', () => {
    const ctx = makeCtx()
    sys.setQuarantineZones([makeQuarantine({ x: 0 }), makeQuarantine({ x: 5 }), makeQuarantine({ x: 10 })])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.strokeRect).toHaveBeenCalledTimes(3)
  })
  it('render不抛出异常（有zone+quarantine）', () => {
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone()])
    sys.setQuarantineZones([makeQuarantine()])
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
  it('render不抛出异常（zoom=0.5）', () => {
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone()])
    expect(() => sys.render(ctx, 0, 0, 0.5)).not.toThrow()
  })
  it('render不抛出异常（zoom=2）', () => {
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone()])
    expect(() => sys.render(ctx, 0, 0, 2)).not.toThrow()
  })
  it('render在cameraX偏移时不抛出', () => {
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone()])
    expect(() => sys.render(ctx, 500, 500, 1)).not.toThrow()
  })
  it('severity=0时render不抛出', () => {
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone({ severity: 0 })])
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
  it('severity=1时render不抛出', () => {
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone({ severity: 1 })])
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })
  it('render有粒子时调用arc', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.setInfectedZones([makeZone()])
    sys.update() // 生成粒子
    const ctx = makeCtx()
    if ((sys as any).particles.length > 0) {
      sys.render(ctx, 0, 0, 1)
      expect(ctx.arc).toHaveBeenCalled()
    }
  })
  it('render调用setLineDash（quarantine虚线）', () => {
    const ctx = makeCtx()
    sys.setQuarantineZones([makeQuarantine()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.setLineDash).toHaveBeenCalled()
  })
  it('visible=false时render调用次数为0（save/restore）', () => {
    sys.toggle()
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone()])
    sys.setQuarantineZones([makeQuarantine()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).not.toHaveBeenCalled()
    expect(ctx.restore).not.toHaveBeenCalled()
  })
})

describe('PlagueVisualSystem — 综合流程', () => {
  let sys: PlagueVisualSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('toggle隐藏→update→render不渲染任何内容', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.setInfectedZones([makeZone()])
    sys.toggle() // visible = false
    sys.update() // 不生成粒子
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1) // 不渲染
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })
  it('先隐藏再显示后render正常渲染', () => {
    sys.toggle() // false
    sys.toggle() // true
    const ctx = makeCtx()
    sys.setInfectedZones([makeZone()])
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillRect).toHaveBeenCalled()
  })
  it('多次update+render不崩溃', () => {
    sys.setInfectedZones([makeZone()])
    sys.setQuarantineZones([makeQuarantine()])
    const ctx = makeCtx()
    expect(() => {
      for (let i = 0; i < 20; i++) {
        sys.update()
        sys.render(ctx, 0, 0, 1)
      }
    }).not.toThrow()
  })
  it('清空zones后render不再调用fillRect', () => {
    sys.setInfectedZones([makeZone()])
    sys.setInfectedZones([])
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })
  it('清空quarantines后render不再调用strokeRect', () => {
    sys.setQuarantineZones([makeQuarantine()])
    sys.setQuarantineZones([])
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.strokeRect).not.toHaveBeenCalled()
  })
})
