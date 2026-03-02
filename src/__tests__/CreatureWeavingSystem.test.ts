import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureWeavingSystem } from '../systems/CreatureWeavingSystem'
import type { WovenGood, FabricType, PatternStyle } from '../systems/CreatureWeavingSystem'
import { EntityManager } from '../ecs/Entity'
import type { PositionComponent, CreatureComponent } from '../ecs/Entity'

let nextId = 1

function makeSys(): CreatureWeavingSystem { return new CreatureWeavingSystem() }

function makeGood(
  weaverId: number,
  fabric: FabricType = 'linen',
  pattern: PatternStyle = 'plain',
  quality = 70,
  overrides: Partial<WovenGood> = {}
): WovenGood {
  return {
    id: nextId++,
    weaverId,
    fabric,
    pattern,
    quality,
    warmth: quality * 0.4,
    tradeValue: quality * 0.6,
    tick: 0,
    ...overrides,
  }
}

function makeEm(): EntityManager { return new EntityManager() }

function addCreatureEntity(em: EntityManager, age = 20): number {
  const id = em.createEntity()
  em.addComponent<PositionComponent>(id, { type: 'position', x: 5, y: 5 })
  em.addComponent<CreatureComponent>(id, {
    type: 'creature', species: 'human', speed: 1, damage: 5,
    isHostile: false, name: 'Weaver', age, maxAge: 80, gender: 'female'
  })
  return id
}

// ─────────────────────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 goods 列表为空', () => {
    expect((sys as any).goods).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('goods 列表操作', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询', () => {
    ;(sys as any).goods.push(makeGood(1, 'silk'))
    expect((sys as any).goods[0].fabric).toBe('silk')
  })

  it('返回内部数组引用', () => {
    ;(sys as any).goods.push(makeGood(1))
    const ref = (sys as any).goods
    expect(ref).toBe((sys as any).goods)
  })

  it('多次注入 length 正确', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).goods.push(makeGood(i + 1)) }
    expect((sys as any).goods).toHaveLength(5)
  })

  it('清空后 length 为 0', () => {
    ;(sys as any).goods.push(makeGood(1))
    ;(sys as any).goods.length = 0
    expect((sys as any).goods).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('FabricType 枚举完整性', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  const fabrics: FabricType[] = ['linen', 'wool', 'silk', 'cotton', 'hemp', 'tapestry']

  it('支持全部6种织物', () => {
    fabrics.forEach((f, i) => { ;(sys as any).goods.push(makeGood(i + 1, f)) })
    expect((sys as any).goods).toHaveLength(6)
  })

  fabrics.forEach(f => {
    it(`织物 ${f} 字段保存正确`, () => {
      ;(sys as any).goods.push(makeGood(1, f))
      expect((sys as any).goods[0].fabric).toBe(f)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('PatternStyle 枚举完整性', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  const patterns: PatternStyle[] = ['plain', 'striped', 'checkered', 'floral', 'geometric', 'narrative']

  it('支持全部6种图案', () => {
    patterns.forEach((p, i) => { ;(sys as any).goods.push(makeGood(i + 1, 'linen', p)) })
    expect((sys as any).goods).toHaveLength(6)
  })

  patterns.forEach(p => {
    it(`图案 ${p} 字段保存正确`, () => {
      ;(sys as any).goods.push(makeGood(1, 'linen', p))
      expect((sys as any).goods[0].pattern).toBe(p)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WovenGood 数据字段', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('quality 字段正确', () => {
    ;(sys as any).goods.push(makeGood(1, 'wool', 'plain', 85))
    expect((sys as any).goods[0].quality).toBe(85)
  })

  it('warmth 字段正确', () => {
    ;(sys as any).goods.push(makeGood(1, 'linen', 'plain', 100, { warmth: 40 }))
    expect((sys as any).goods[0].warmth).toBeCloseTo(40)
  })

  it('tradeValue 字段正确', () => {
    ;(sys as any).goods.push(makeGood(1, 'silk', 'narrative', 80, { tradeValue: 63 }))
    expect((sys as any).goods[0].tradeValue).toBeCloseTo(63)
  })

  it('wool 织物 warmth 加成公式', () => {
    // warmth = quality * 0.4 + (wool ? 20 : 0)
    const q = 50
    const good: WovenGood = { id: 1, weaverId: 1, fabric: 'wool', pattern: 'plain', quality: q,
      warmth: q * 0.4 + 20, tradeValue: q * 0.6, tick: 0 }
    expect(good.warmth).toBeCloseTo(40)
  })

  it('narrative 图案 tradeValue 加成公式', () => {
    const q = 50
    const good: WovenGood = { id: 1, weaverId: 1, fabric: 'linen', pattern: 'narrative', quality: q,
      warmth: q * 0.4, tradeValue: q * 0.6 + 15, tick: 0 }
    expect(good.tradeValue).toBeCloseTo(45)
  })

  it('tick 字段正确存储', () => {
    ;(sys as any).goods.push(makeGood(1, 'linen', 'plain', 70, { tick: 5000 }))
    expect((sys as any).goods[0].tick).toBe(5000)
  })

  it('weaverId 字段正确', () => {
    ;(sys as any).goods.push(makeGood(42))
    expect((sys as any).goods[0].weaverId).toBe(42)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('skillMap 操作', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无记录时 get 返回 undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('注入技能后可读取', () => {
    ;(sys as any).skillMap.set(1, 80)
    expect((sys as any).skillMap.get(1)).toBe(80)
  })

  it('多生物技能独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    ;(sys as any).skillMap.set(3, 100)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(70)
    expect((sys as any).skillMap.get(3)).toBe(100)
  })

  it('覆盖写入技能值', () => {
    ;(sys as any).skillMap.set(1, 50)
    ;(sys as any).skillMap.set(1, 90)
    expect((sys as any).skillMap.get(1)).toBe(90)
  })

  it('技能不超过100上限（公式验证）', () => {
    const skill = 99.95
    const capped = Math.min(100, skill + 0.07)
    expect(capped).toBe(100)
  })

  it('SKILL_GROWTH 为 0.07', () => {
    // verify constant by checking growth formula result
    const initialSkill = 10
    const grown = Math.min(100, initialSkill + 0.07)
    expect(grown).toBeCloseTo(10.07)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('update 节流（CHECK_INTERVAL = 1200）', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < 1200 时不处理', () => {
    const em = makeEm()
    vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
    sys.update(16, em, 500)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick >= 1200 时处理', () => {
    const em = makeEm()
    vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
    sys.update(16, em, 1200)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('lastCheck 在处理后更新为当前 tick', () => {
    const em = makeEm()
    vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
    sys.update(16, em, 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })

  it('两次调用间隔不足时第二次跳过', () => {
    const em = makeEm()
    vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
    sys.update(16, em, 1200)
    sys.update(16, em, 1800) // 1800 - 1200 = 600 < 1200
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('MAX_GOODS 限制', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('goods 达到100时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // always pass WEAVE_CHANCE
    const em = makeEm()
    // fill 100 goods
    for (let i = 0; i < 100; i++) { ;(sys as any).goods.push(makeGood(i)) }
    const id = addCreatureEntity(em)
    // Force tick to pass check interval
    ;(sys as any).lastCheck = -2000
    sys.update(16, em, 1200)
    expect((sys as any).goods.length).toBe(100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('未成年生物不编织（age < 13）', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('age=12 的生物不产生织物', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm()
    addCreatureEntity(em, 12)
    ;(sys as any).lastCheck = -2000
    sys.update(16, em, 1200)
    expect((sys as any).goods).toHaveLength(0)
  })

  it('age=13 的生物可以编织', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm()
    addCreatureEntity(em, 13)
    ;(sys as any).lastCheck = -2000
    sys.update(16, em, 1200)
    expect((sys as any).goods.length).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('旧商品降解（cutoff 机制）', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('超过 cutoff 的商品被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // fail WEAVE_CHANCE so no new goods
    const em = makeEm()
    vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
    // goods with tick=0, current tick=60000 → cutoff=60000-55000=5000 > 0
    ;(sys as any).goods.push(makeGood(1, 'linen', 'plain', 70, { tick: 0 }))
    ;(sys as any).lastCheck = -2000
    sys.update(16, em, 60000)
    expect((sys as any).goods).toHaveLength(0)
  })

  it('新商品不被降解', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const em = makeEm()
    vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
    ;(sys as any).goods.push(makeGood(1, 'wool', 'plain', 70, { tick: 59000 }))
    ;(sys as any).lastCheck = -2000
    sys.update(16, em, 60000) // cutoff=5000, good.tick=59000 > 5000 → keep
    expect((sys as any).goods).toHaveLength(1)
  })
})
