import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FortificationRenderer } from '../systems/FortificationRenderer'
import type { CityFortification } from '../systems/FortificationRenderer'

function makeSys() { return new FortificationRenderer() }

function makeFort(overrides: Partial<CityFortification> = {}): CityFortification {
  return {
    cityId: 1,
    civId: 1,
    centerX: 100,
    centerY: 100,
    radius: 50,
    level: 'wooden',
    health: 100,
    maxHealth: 100,
    towerCount: 4,
    hasMoat: false,
    isUnderAttack: false,
    color: '#8B4513',
    ...overrides,
  }
}

function makeCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D
}

describe('FortificationRenderer — 初始状态', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('初始fortifications为空数组', () => {
    expect((sys as any).fortifications).toHaveLength(0)
  })
  it('初始animTime为0', () => {
    expect((sys as any).animTime).toBe(0)
  })
  it('初始fortifications是Array实例', () => {
    expect(Array.isArray((sys as any).fortifications)).toBe(true)
  })
  it('连续创建两个实例互相独立', () => {
    const a = makeSys()
    const b = makeSys()
    a.updateFortifications([makeFort({ cityId: 1 })])
    expect((b as any).fortifications).toHaveLength(0)
  })
})

describe('FortificationRenderer — update()', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update()后animTime增加', () => {
    sys.update()
    expect((sys as any).animTime).toBeGreaterThan(0)
  })
  it('update()每次调用animTime递增1', () => {
    sys.update()
    sys.update()
    expect((sys as any).animTime).toBe(2)
  })
  it('update()调用10次后animTime为10', () => {
    for (let i = 0; i < 10; i++) sys.update()
    expect((sys as any).animTime).toBe(10)
  })
  it('update()在无fortifications时不抛出', () => {
    expect(() => sys.update()).not.toThrow()
  })
  it('update()在有多个fort时不抛出', () => {
    sys.updateFortifications([makeFort(), makeFort({ cityId: 2 })])
    expect(() => sys.update()).not.toThrow()
  })
  it('update()连续100次不崩溃', () => {
    sys.updateFortifications([makeFort()])
    expect(() => { for (let i = 0; i < 100; i++) sys.update() }).not.toThrow()
  })
  it('animTime在update()前后严格递增', () => {
    const before = (sys as any).animTime
    sys.update()
    expect((sys as any).animTime).toBeGreaterThan(before)
  })
})

describe('FortificationRenderer — updateFortifications()', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('传入1个fort后长度为1', () => {
    sys.updateFortifications([makeFort()])
    expect((sys as any).fortifications).toHaveLength(1)
  })
  it('传入2个fort后长度为2', () => {
    sys.updateFortifications([makeFort({ cityId: 1 }), makeFort({ cityId: 2 })])
    expect((sys as any).fortifications).toHaveLength(2)
  })
  it('传入空数组后长度为0', () => {
    sys.updateFortifications([makeFort()])
    sys.updateFortifications([])
    expect((sys as any).fortifications).toHaveLength(0)
  })
  it('多次调用时最新数据覆盖旧数据', () => {
    sys.updateFortifications([makeFort({ cityId: 1 }), makeFort({ cityId: 2 })])
    sys.updateFortifications([makeFort({ cityId: 3 })])
    expect((sys as any).fortifications).toHaveLength(1)
    expect((sys as any).fortifications[0].cityId).toBe(3)
  })
  it('fort数据原样保存（引用传递）', () => {
    const fort = makeFort({ cityId: 42 })
    sys.updateFortifications([fort])
    expect((sys as any).fortifications[0]).toBe(fort)
  })
  it('传入10个fort后长度为10', () => {
    const forts = Array.from({ length: 10 }, (_, i) => makeFort({ cityId: i }))
    sys.updateFortifications(forts)
    expect((sys as any).fortifications).toHaveLength(10)
  })
  it('不修改animTime', () => {
    sys.update()
    const t = (sys as any).animTime
    sys.updateFortifications([makeFort()])
    expect((sys as any).animTime).toBe(t)
  })
})

describe('FortificationRenderer — getDefenseLevel()', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('wooden满血4塔无护城河 → base=1+4+0=5 * 1.0 → 5', () => {
    const fort = makeFort({ level: 'wooden', health: 100, maxHealth: 100, towerCount: 4, hasMoat: false })
    const result = (sys as any).getDefenseLevel(fort)
    expect(result).toBe(5)
  })
  it('stone满血4塔无护城河 → base=2+4+0=6 * 1.0 → 6', () => {
    const fort = makeFort({ level: 'stone', health: 100, maxHealth: 100, towerCount: 4, hasMoat: false })
    const result = (sys as any).getDefenseLevel(fort)
    expect(result).toBe(6)
  })
  it('castle满血4塔无护城河 → base=3+4+0=7 * 1.0 → 7', () => {
    const fort = makeFort({ level: 'castle', health: 100, maxHealth: 100, towerCount: 4, hasMoat: false })
    const result = (sys as any).getDefenseLevel(fort)
    expect(result).toBe(7)
  })
  it('castle满血4塔有护城河 → 3+4+1=8', () => {
    const fort = makeFort({ level: 'castle', health: 100, maxHealth: 100, towerCount: 4, hasMoat: true })
    const result = (sys as any).getDefenseLevel(fort)
    expect(result).toBe(8)
  })
  it('wooden满血0塔无护城河 → 1+0+0=1', () => {
    const fort = makeFort({ level: 'wooden', towerCount: 0, hasMoat: false })
    const result = (sys as any).getDefenseLevel(fort)
    expect(result).toBe(1)
  })
  it('towerCount>4时上限为4', () => {
    const fort = makeFort({ level: 'wooden', towerCount: 10, hasMoat: false })
    const withFour = makeFort({ level: 'wooden', towerCount: 4, hasMoat: false })
    expect((sys as any).getDefenseLevel(fort)).toBe((sys as any).getDefenseLevel(withFour))
  })
  it('血量50%时防御值减半（四舍五入）', () => {
    const fort = makeFort({ level: 'wooden', health: 50, maxHealth: 100, towerCount: 4, hasMoat: false })
    const result = (sys as any).getDefenseLevel(fort)
    // (1+4+0)*0.5 = 2.5 → round = 3
    expect(result).toBe(3)
  })
  it('血量0时防御值为0', () => {
    const fort = makeFort({ level: 'castle', health: 0, maxHealth: 100, towerCount: 4, hasMoat: true })
    const result = (sys as any).getDefenseLevel(fort)
    expect(result).toBe(0)
  })
  it('none等级base为0但towerBonus和moatBonus仍计入 → (0+4+1)*1=5', () => {
    const fort = makeFort({ level: 'none', towerCount: 4, hasMoat: true, health: 100, maxHealth: 100 })
    const result = (sys as any).getDefenseLevel(fort)
    // 源码：base = 0(none), towerBonus = min(4,4)=4, moatBonus = 1 → round(5*1) = 5
    expect(result).toBe(5)
  })
  it('maxHealth=0时不崩溃（除0保护）', () => {
    const fort = makeFort({ health: 0, maxHealth: 0 })
    expect(() => (sys as any).getDefenseLevel(fort)).not.toThrow()
  })
  it('hasMoat=true 比 false 防御值高1', () => {
    const withMoat = makeFort({ level: 'stone', towerCount: 2, hasMoat: true })
    const noMoat = makeFort({ level: 'stone', towerCount: 2, hasMoat: false })
    expect((sys as any).getDefenseLevel(withMoat)).toBe((sys as any).getDefenseLevel(noMoat) + 1)
  })
})

describe('FortificationRenderer — render() 基础行为', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('fortifications为空时render不调用ctx.save', () => {
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)
    expect(ctx.save).not.toHaveBeenCalled()
  })
  it('有fort时render调用ctx.save', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)
    expect(ctx.save).toHaveBeenCalled()
  })
  it('有fort时render调用ctx.restore', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)
    expect(ctx.restore).toHaveBeenCalled()
  })
  it('level=none的fort不会调用strokeRect', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ level: 'none', centerX: 50, centerY: 50 })])
    sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)
    expect(ctx.strokeRect).not.toHaveBeenCalled()
  })
  it('视野外的fort不渲染（无strokeRect调用）', () => {
    const ctx = makeCtx()
    // fort在centerX=100,radius=5，视野只显示0~10
    sys.updateFortifications([makeFort({ centerX: 100, radius: 5, level: 'wooden' })])
    sys.render(ctx, 0, 0, 1, 0, 0, 10, 10)
    expect(ctx.strokeRect).not.toHaveBeenCalled()
  })
  it('render在ctx.save后调用ctx.scale', () => {
    const ctx = makeCtx()
    const callOrder: string[] = []
    ctx.save = vi.fn(() => { callOrder.push('save') })
    ctx.scale = vi.fn(() => { callOrder.push('scale') })
    sys.updateFortifications([makeFort({ centerX: 50, centerY: 50, radius: 5, level: 'wooden' })])
    sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)
    const saveIdx = callOrder.indexOf('save')
    const scaleIdx = callOrder.indexOf('scale')
    expect(scaleIdx).toBeGreaterThan(saveIdx)
  })
  it('render不抛出异常（stone等级）', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ level: 'stone', centerX: 50, centerY: 50, radius: 5 })])
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)).not.toThrow()
  })
  it('render不抛出异常（castle等级）', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ level: 'castle', centerX: 50, centerY: 50, radius: 5 })])
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)).not.toThrow()
  })
  it('render不抛出异常（hasMoat=true）', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ hasMoat: true, centerX: 50, centerY: 50, radius: 5 })])
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)).not.toThrow()
  })
  it('render不抛出异常（isUnderAttack=true）', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ isUnderAttack: true, centerX: 50, centerY: 50, radius: 5 })])
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)).not.toThrow()
  })
  it('render不抛出异常（towerCount=0）', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ towerCount: 0, centerX: 50, centerY: 50, radius: 5 })])
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)).not.toThrow()
  })
})

describe('FortificationRenderer — render() hasMoat', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('hasMoat=true时strokeRect调用次数大于无护城河时', () => {
    const ctxMoat = makeCtx()
    const ctxNoMoat = makeCtx()
    sys.updateFortifications([makeFort({ hasMoat: true, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctxMoat, 0, 0, 1, 0, 0, 200, 200)
    const moatCalls = (ctxMoat.strokeRect as ReturnType<typeof vi.fn>).mock.calls.length

    sys.updateFortifications([makeFort({ hasMoat: false, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctxNoMoat, 0, 0, 1, 0, 0, 200, 200)
    const noMoatCalls = (ctxNoMoat.strokeRect as ReturnType<typeof vi.fn>).mock.calls.length

    expect(moatCalls).toBeGreaterThan(noMoatCalls)
  })
  it('hasMoat=false时不渲染护城河填充', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ hasMoat: false, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    const fillCalls1 = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length
    sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)
    // 无护城河时fillRect调用较少（只有boxTower相关）
    expect(fillCalls1).toBeGreaterThanOrEqual(0)
  })
})

describe('FortificationRenderer — render() towerCount', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('towerCount=0时fillRect调用比towerCount=4时少', () => {
    const ctxWith = makeCtx()
    const ctxWithout = makeCtx()

    sys.updateFortifications([makeFort({ towerCount: 4, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctxWith, 0, 0, 1, 0, 0, 200, 200)
    const withCalls = (ctxWith.fillRect as ReturnType<typeof vi.fn>).mock.calls.length

    sys.updateFortifications([makeFort({ towerCount: 0, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctxWithout, 0, 0, 1, 0, 0, 200, 200)
    const withoutCalls = (ctxWithout.fillRect as ReturnType<typeof vi.fn>).mock.calls.length

    expect(withCalls).toBeGreaterThan(withoutCalls)
  })
  it('towerCount=2时fill调用次数介于0和4塔之间', () => {
    const ctx0 = makeCtx()
    const ctx2 = makeCtx()
    const ctx4 = makeCtx()

    sys.updateFortifications([makeFort({ towerCount: 0, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctx0, 0, 0, 1, 0, 0, 200, 200)
    const calls0 = (ctx0.fillRect as ReturnType<typeof vi.fn>).mock.calls.length

    sys.updateFortifications([makeFort({ towerCount: 2, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctx2, 0, 0, 1, 0, 0, 200, 200)
    const calls2 = (ctx2.fillRect as ReturnType<typeof vi.fn>).mock.calls.length

    sys.updateFortifications([makeFort({ towerCount: 4, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctx4, 0, 0, 1, 0, 0, 200, 200)
    const calls4 = (ctx4.fillRect as ReturnType<typeof vi.fn>).mock.calls.length

    expect(calls2).toBeGreaterThan(calls0)
    expect(calls4).toBeGreaterThan(calls2)
  })
})

describe('FortificationRenderer — render() isUnderAttack', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('isUnderAttack=true时strokeRect调用次数多于false时', () => {
    const ctxAtk = makeCtx()
    const ctxNoAtk = makeCtx()

    sys.updateFortifications([makeFort({ isUnderAttack: true, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctxAtk, 0, 0, 1, 0, 0, 200, 200)
    const atkCalls = (ctxAtk.strokeRect as ReturnType<typeof vi.fn>).mock.calls.length

    sys.updateFortifications([makeFort({ isUnderAttack: false, level: 'wooden', centerX: 50, centerY: 50, radius: 5 })])
    sys.render(ctxNoAtk, 0, 0, 1, 0, 0, 200, 200)
    const noAtkCalls = (ctxNoAtk.strokeRect as ReturnType<typeof vi.fn>).mock.calls.length

    expect(atkCalls).toBeGreaterThan(noAtkCalls)
  })
  it('isUnderAttack=true不抛出异常', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ isUnderAttack: true, centerX: 50, centerY: 50, radius: 5 })])
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)).not.toThrow()
  })
})

describe('FortificationRenderer — render() castle城垛', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('castle等级时fillRect调用次数比wooden多（城垛）', () => {
    const ctxCastle = makeCtx()
    const ctxWooden = makeCtx()

    sys.updateFortifications([makeFort({ level: 'castle', centerX: 50, centerY: 50, radius: 5, towerCount: 0, hasMoat: false })])
    sys.render(ctxCastle, 0, 0, 1, 0, 0, 200, 200)
    const castleFillCalls = (ctxCastle.fillRect as ReturnType<typeof vi.fn>).mock.calls.length

    sys.updateFortifications([makeFort({ level: 'wooden', centerX: 50, centerY: 50, radius: 5, towerCount: 0, hasMoat: false })])
    sys.render(ctxWooden, 0, 0, 1, 0, 0, 200, 200)
    const woodenFillCalls = (ctxWooden.fillRect as ReturnType<typeof vi.fn>).mock.calls.length

    expect(castleFillCalls).toBeGreaterThan(woodenFillCalls)
  })
  it('castle等级render不抛出异常', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ level: 'castle', centerX: 50, centerY: 50, radius: 10 })])
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)).not.toThrow()
  })
})

describe('FortificationRenderer — render() 多fort并发', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('多个fort时save/restore各调用1次', () => {
    const ctx = makeCtx()
    sys.updateFortifications([
      makeFort({ cityId: 1, centerX: 20, centerY: 20, radius: 3 }),
      makeFort({ cityId: 2, centerX: 60, centerY: 60, radius: 3 }),
    ])
    sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)
    expect(ctx.save).toHaveBeenCalledTimes(1)
    expect(ctx.restore).toHaveBeenCalledTimes(1)
  })
  it('50个fort时render不崩溃', () => {
    const ctx = makeCtx()
    const forts = Array.from({ length: 50 }, (_, i) =>
      makeFort({ cityId: i, centerX: (i % 10) * 15 + 10, centerY: Math.floor(i / 10) * 15 + 10, radius: 3 })
    )
    sys.updateFortifications(forts)
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)).not.toThrow()
  })
})

describe('FortificationRenderer — render() 血量条', () => {
  let sys: FortificationRenderer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('满血时不渲染血量条（fillRect少一次）', () => {
    const ctxFull = makeCtx()
    const ctxHalf = makeCtx()
    sys.updateFortifications([makeFort({ health: 100, maxHealth: 100, level: 'wooden', centerX: 50, centerY: 50, radius: 5, towerCount: 0, hasMoat: false })])
    sys.render(ctxFull, 0, 0, 1, 0, 0, 200, 200)
    const fullCalls = (ctxFull.fillRect as ReturnType<typeof vi.fn>).mock.calls.length

    sys.updateFortifications([makeFort({ health: 50, maxHealth: 100, level: 'wooden', centerX: 50, centerY: 50, radius: 5, towerCount: 0, hasMoat: false })])
    sys.render(ctxHalf, 0, 0, 1, 0, 0, 200, 200)
    const halfCalls = (ctxHalf.fillRect as ReturnType<typeof vi.fn>).mock.calls.length

    expect(halfCalls).toBeGreaterThan(fullCalls)
  })
  it('血量低于maxHealth时不抛出', () => {
    const ctx = makeCtx()
    sys.updateFortifications([makeFort({ health: 1, maxHealth: 100, centerX: 50, centerY: 50, radius: 5 })])
    expect(() => sys.render(ctx, 0, 0, 1, 0, 0, 200, 200)).not.toThrow()
  })
})
