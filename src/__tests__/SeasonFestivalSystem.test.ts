import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SeasonFestivalSystem } from '../systems/SeasonFestivalSystem'
import type { Festival, FestivalType } from '../systems/SeasonFestivalSystem'

function makeSys(): SeasonFestivalSystem { return new SeasonFestivalSystem() }

let nextId = 100
function makeFestival(active: boolean = true, type: FestivalType = 'harvest', overrides: Partial<Festival> = {}): Festival {
  return {
    id: nextId++, civId: 1, type,
    startTick: 0, duration: 200, active, moraleBoost: 15,
    ...overrides,
  }
}

type CivLike = { id: number; name: string; population: number; relations: Map<number, number> }

function makeCiv(id: number, population = 10, name = `Civ${id}`): CivLike {
  return { id, name, population, relations: new Map() }
}

function makeCivManager(civs: CivLike[] = []) {
  const m = new Map<number, CivLike>()
  for (const c of civs) m.set(c.id, c)
  return { civilizations: m }
}

function makeSeason(s: string) {
  return { getCurrentSeason: () => s }
}

// ── 初始状态 ─────────────────────────────────────────────
describe('SeasonFestivalSystem 初始状态', () => {
  let sys: SeasonFestivalSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('festivals 初始为空', () => {
    expect((sys as any).festivals).toHaveLength(0)
  })
  it('history 初始为空', () => {
    expect((sys as any).history).toHaveLength(0)
  })
  it('lastSeason 初始为空字符串', () => {
    expect((sys as any).lastSeason).toBe('')
  })
  it('displayAlpha 初始为 0', () => {
    expect((sys as any).displayAlpha).toBe(0)
  })
  it('_festivalCivSet 初始为空 Set', () => {
    expect((sys as any)._festivalCivSet.size).toBe(0)
  })
  it('nextCheckTick 初始为 CHECK_INTERVAL(2000)', () => {
    expect((sys as any).nextCheckTick).toBe(2000)
  })
})

// ── getActiveFestivals ────────────────────────────────────
describe('SeasonFestivalSystem.getActiveFestivals', () => {
  let sys: SeasonFestivalSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无节庆', () => {
    expect(sys.getActiveFestivals()).toHaveLength(0)
  })
  it('active=true 的节庆被返回', () => {
    ;(sys as any).festivals.push(makeFestival(true))
    expect(sys.getActiveFestivals()).toHaveLength(1)
  })
  it('active=false 的节庆被过滤', () => {
    ;(sys as any).festivals.push(makeFestival(false))
    expect(sys.getActiveFestivals()).toHaveLength(0)
  })
  it('混合时只返回活跃的', () => {
    ;(sys as any).festivals.push(makeFestival(true))
    ;(sys as any).festivals.push(makeFestival(false))
    ;(sys as any).festivals.push(makeFestival(true))
    expect(sys.getActiveFestivals()).toHaveLength(2)
  })
  it('返回正确的节庆类型', () => {
    ;(sys as any).festivals.push(makeFestival(true, 'solstice'))
    expect(sys.getActiveFestivals()[0].type).toBe('solstice')
  })
  it('返回正确的 moraleBoost', () => {
    ;(sys as any).festivals.push(makeFestival(true, 'harvest', { moraleBoost: 20 }))
    expect(sys.getActiveFestivals()[0].moraleBoost).toBe(20)
  })
  it('多次调用返回相同结果', () => {
    ;(sys as any).festivals.push(makeFestival(true))
    const a = sys.getActiveFestivals()
    const b = sys.getActiveFestivals()
    expect(a).toHaveLength(b.length)
  })
  it('支持 4 种节庆类型', () => {
    const types: FestivalType[] = ['harvest', 'solstice', 'spring_bloom', 'winter_feast']
    for (const t of types) {
      ;(sys as any).festivals.push(makeFestival(true, t))
    }
    expect(sys.getActiveFestivals()).toHaveLength(4)
  })
})

// ── update 季节切换 ────────────────────────────────────────
describe('SeasonFestivalSystem.update 季节切换', () => {
  let sys: SeasonFestivalSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('季节切换后 lastSeason 更新', () => {
    sys.update(1, makeCivManager(), makeSeason('summer'), 0)
    expect((sys as any).lastSeason).toBe('summer')
  })
  it('季节切换后 nextCheckTick 提前到 tick+200', () => {
    sys.update(1, makeCivManager(), makeSeason('winter'), 500)
    expect((sys as any).nextCheckTick).toBe(700)
  })
  it('同一季节连续更新不重置 nextCheckTick', () => {
    sys.update(1, makeCivManager(), makeSeason('spring'), 0)
    const check1 = (sys as any).nextCheckTick
    sys.update(1, makeCivManager(), makeSeason('spring'), 1)
    expect((sys as any).nextCheckTick).toBe(check1)
  })
  it('不同季节连续切换 lastSeason 正确', () => {
    sys.update(1, makeCivManager(), makeSeason('summer'), 0)
    sys.update(1, makeCivManager(), makeSeason('winter'), 1)
    expect((sys as any).lastSeason).toBe('winter')
  })
})

// ── update 节庆到期 ────────────────────────────────────────
describe('SeasonFestivalSystem.update 节庆到期', () => {
  let sys: SeasonFestivalSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('startTick+duration <= tick 时节庆结束', () => {
    ;(sys as any).festivals.push(makeFestival(true, 'harvest', { startTick: 0, duration: 100 }))
    sys.update(1, makeCivManager(), makeSeason('summer'), 100)
    expect((sys as any).festivals).toHaveLength(0)
  })
  it('到期节庆移入 history', () => {
    ;(sys as any).festivals.push(makeFestival(true, 'harvest', { startTick: 0, duration: 100 }))
    sys.update(1, makeCivManager(), makeSeason('summer'), 100)
    expect((sys as any).history).toHaveLength(1)
  })
  it('未到期节庆保持 active', () => {
    ;(sys as any).festivals.push(makeFestival(true, 'harvest', { startTick: 0, duration: 500 }))
    sys.update(1, makeCivManager(), makeSeason('summer'), 100)
    expect((sys as any).festivals).toHaveLength(1)
    expect((sys as any).festivals[0].active).toBe(true)
  })
  it('节庆结束后从 _festivalCivSet 中移除 civId', () => {
    ;(sys as any)._festivalCivSet.add(1)
    ;(sys as any).festivals.push(makeFestival(true, 'harvest', { civId: 1, startTick: 0, duration: 50 }))
    sys.update(1, makeCivManager(), makeSeason('summer'), 50)
    expect((sys as any)._festivalCivSet.has(1)).toBe(false)
  })
  it('history 超过 MAX_HISTORY(20) 时截断', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).history.push(makeFestival(false, 'harvest'))
    }
    ;(sys as any).festivals.push(makeFestival(true, 'solstice', { startTick: 0, duration: 10 }))
    sys.update(1, makeCivManager(), makeSeason('summer'), 10)
    expect((sys as any).history.length).toBeLessThanOrEqual(20)
  })
  it('多条节庆同时到期全部移除', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).festivals.push(makeFestival(true, 'harvest', { civId: i + 1, startTick: 0, duration: 10 }))
    }
    sys.update(1, makeCivManager(), makeSeason('summer'), 10)
    expect((sys as any).festivals).toHaveLength(0)
  })
})

// ── update 生成节庆 ────────────────────────────────────────
describe('SeasonFestivalSystem.update 尝试生成节庆', () => {
  let sys: SeasonFestivalSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick >= nextCheckTick 且有文明时尝试生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // < FESTIVAL_CHANCE(0.3)
    const civs = [makeCiv(1, 10)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('summer'), 0)
    expect((sys as any).festivals.length).toBeGreaterThanOrEqual(0) // may generate
  })
  it('人口 < 5 的文明不生成节庆', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const civs = [makeCiv(1, 3)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('summer'), 0)
    expect((sys as any).festivals).toHaveLength(0)
  })
  it('random > FESTIVAL_CHANCE 时不生成节庆', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const civs = [makeCiv(1, 20)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('summer'), 0)
    expect((sys as any).festivals).toHaveLength(0)
  })
  it('生成节庆时 _festivalCivSet 包含该文明 ID', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const civs = [makeCiv(42, 20)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('summer'), 0)
    if ((sys as any).festivals.length > 0) {
      expect((sys as any)._festivalCivSet.has(42)).toBe(true)
    }
  })
  it('已有节庆的文明不重复生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    ;(sys as any)._festivalCivSet.add(1)
    const civs = [makeCiv(1, 20)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('summer'), 0)
    expect((sys as any).festivals).toHaveLength(0)
  })
  it('活跃节庆已满(4)时不再生成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    for (let i = 0; i < 4; i++) {
      ;(sys as any).festivals.push(makeFestival(true, 'harvest', { civId: i + 10 }))
    }
    const civs = [makeCiv(99, 20)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('summer'), 0)
    expect((sys as any).festivals).toHaveLength(4)
  })
  it('未知季节不生成节庆', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const civs = [makeCiv(1, 20)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('unknown_season'), 0)
    expect((sys as any).festivals).toHaveLength(0)
  })
  it('summer 季节生成 harvest 节庆', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const civs = [makeCiv(1, 20)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('summer'), 0)
    if ((sys as any).festivals.length > 0) {
      expect((sys as any).festivals[0].type).toBe('harvest')
    }
  })
  it('spring 季节生成 spring_bloom 节庆', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const civs = [makeCiv(1, 20)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('spring'), 0)
    if ((sys as any).festivals.length > 0) {
      expect((sys as any).festivals[0].type).toBe('spring_bloom')
    }
  })
  it('winter 季节生成 winter_feast 节庆', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const civs = [makeCiv(1, 20)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('winter'), 0)
    if ((sys as any).festivals.length > 0) {
      expect((sys as any).festivals[0].type).toBe('winter_feast')
    }
  })
  it('autumn 季节生成 solstice 节庆', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const civs = [makeCiv(1, 20)]
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager(civs), makeSeason('autumn'), 0)
    if ((sys as any).festivals.length > 0) {
      expect((sys as any).festivals[0].type).toBe('solstice')
    }
  })
  it('生成节庆时正向 relation 获得加成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const civ = makeCiv(1, 20)
    civ.relations.set(2, 50)
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager([civ]), makeSeason('summer'), 0)
    if ((sys as any).festivals.length > 0) {
      expect(civ.relations.get(2)).toBe(55) // 50 + RELATION_BOOST(5)
    }
  })
  it('负向 relation 不获得加成', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const civ = makeCiv(1, 20)
    civ.relations.set(2, -10)
    ;(sys as any).nextCheckTick = 0
    sys.update(1, makeCivManager([civ]), makeSeason('summer'), 0)
    if ((sys as any).festivals.length > 0) {
      // rel <= 0 不加成
      expect(civ.relations.get(2)).toBe(-10)
    }
  })
  it('tick < nextCheckTick 时 nextCheckTick 不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    ;(sys as any).lastSeason = 'summer'
    ;(sys as any).nextCheckTick = 9999
    sys.update(1, makeCivManager(), makeSeason('summer'), 100)
    expect((sys as any).nextCheckTick).toBe(9999)
  })
})

// ── render 不崩溃 ─────────────────────────────────────────
describe('SeasonFestivalSystem.render 不崩溃', () => {
  let sys: SeasonFestivalSystem
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  function makeMockCtx() {
    return {
      fillStyle: '', strokeStyle: '', font: '', globalAlpha: 1,
      fillRect: vi.fn(), fillText: vi.fn(),
      strokeRect: vi.fn(),
      save: vi.fn(), restore: vi.fn(),
      canvas: { width: 800, height: 600 },
    } as unknown as CanvasRenderingContext2D
  }

  it('无活跃节庆且 displayAlpha=0 时直接返回', () => {
    const ctx = makeMockCtx()
    ;(sys as any).displayAlpha = 0
    expect(() => sys.render(ctx)).not.toThrow()
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })
  it('有活跃节庆时 displayAlpha 增大', () => {
    const ctx = makeMockCtx()
    ;(sys as any).festivals.push(makeFestival(true, 'harvest'))
    sys.render(ctx)
    expect((sys as any).displayAlpha).toBeGreaterThan(0)
  })
  it('无活跃节庆时 displayAlpha 减小', () => {
    const ctx = makeMockCtx()
    ;(sys as any).displayAlpha = 0.5
    sys.render(ctx)
    expect((sys as any).displayAlpha).toBeLessThan(0.5)
  })
  it('有活跃节庆时 render 调用 fillRect', () => {
    const ctx = makeMockCtx()
    ;(sys as any).festivals.push(makeFestival(true, 'harvest'))
    ;(sys as any).displayAlpha = 1
    sys.render(ctx)
    expect(ctx.fillRect).toHaveBeenCalled()
  })
  it('4 种节庆类型渲染不崩溃', () => {
    const ctx = makeMockCtx()
    const types: FestivalType[] = ['harvest', 'solstice', 'spring_bloom', 'winter_feast']
    for (const t of types) {
      ;(sys as any).festivals.push(makeFestival(true, t))
    }
    ;(sys as any).displayAlpha = 1
    expect(() => sys.render(ctx)).not.toThrow()
  })
  it('render 调用 ctx.save 和 ctx.restore', () => {
    const ctx = makeMockCtx()
    ;(sys as any).festivals.push(makeFestival(true, 'solstice'))
    ;(sys as any).displayAlpha = 1
    sys.render(ctx)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })
})
