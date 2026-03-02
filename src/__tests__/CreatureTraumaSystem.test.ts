import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureTraumaSystem } from '../systems/CreatureTraumaSystem'
import type { Trauma, TraumaSource, TraumaEffect } from '../systems/CreatureTraumaSystem'
import { EntityManager } from '../ecs/Entity'
import type { PositionComponent, CreatureComponent } from '../ecs/Entity'

let nextId = 1

function makeSys(): CreatureTraumaSystem { return new CreatureTraumaSystem() }

function makeTrauma(
  creatureId: number,
  source: TraumaSource = 'combat',
  effect: TraumaEffect = 'avoidance',
  severity = 60,
  overrides: Partial<Trauma> = {}
): Trauma {
  return {
    id: nextId++,
    creatureId,
    source,
    effect,
    severity,
    locationX: 10,
    locationY: 20,
    formedTick: 0,
    healingRate: 0.1,
    ...overrides,
  }
}

function makeEm(): EntityManager { return new EntityManager() }

function addCreatureEntity(em: EntityManager, x = 5, y = 5, age = 20): number {
  const id = em.createEntity()
  em.addComponent<PositionComponent>(id, { type: 'position', x, y })
  em.addComponent<CreatureComponent>(id, {
    type: 'creature', species: 'human', speed: 1, damage: 5,
    isHostile: false, name: 'Test', age, maxAge: 80, gender: 'male'
  })
  return id
}

// ─────────────────────────────────────────────────────────────────────────────
describe('初始状态', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始创伤列表为空', () => {
    expect((sys as any).traumas).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('_traumasBuf 初始为空数组', () => {
    expect((sys as any)._traumasBuf).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('getCreatureTraumas 查询', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('无创伤时返回空结果', () => {
    expect(sys.getCreatureTraumas(1)).toHaveLength(0)
  })

  it('按 creatureId 精确过滤', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'combat'))
    ;(sys as any).traumas.push(makeTrauma(2, 'loss'))
    ;(sys as any).traumas.push(makeTrauma(1, 'starvation'))
    const result = sys.getCreatureTraumas(1)
    expect(result).toHaveLength(2)
    result.forEach(t => expect(t.creatureId).toBe(1))
  })

  it('查询不存在的 creatureId 返回空', () => {
    ;(sys as any).traumas.push(makeTrauma(1))
    expect(sys.getCreatureTraumas(999)).toHaveLength(0)
  })

  it('复用 _traumasBuf 缓冲区（引用稳定）', () => {
    ;(sys as any).traumas.push(makeTrauma(1))
    const ref1 = sys.getCreatureTraumas(1)
    const ref2 = sys.getCreatureTraumas(1)
    expect(ref1).toBe(ref2)
  })

  it('每次调用前清空 buf', () => {
    ;(sys as any).traumas.push(makeTrauma(1))
    sys.getCreatureTraumas(1)
    ;(sys as any).traumas.length = 0
    const result = sys.getCreatureTraumas(1)
    expect(result).toHaveLength(0)
  })

  it('多生物混合时各自过滤正确', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).traumas.push(makeTrauma(i, 'exile'))
    }
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).traumas.push(makeTrauma(i, 'betrayal'))
    }
    expect(sys.getCreatureTraumas(1)).toHaveLength(2)
    expect(sys.getCreatureTraumas(4)).toHaveLength(1)
    expect(sys.getCreatureTraumas(5)).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('TraumaSource 枚举完整性', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  const sources: TraumaSource[] = ['combat', 'disaster', 'loss', 'starvation', 'exile', 'betrayal']

  it('支持全部6种来源', () => {
    sources.forEach((s, i) => { ;(sys as any).traumas.push(makeTrauma(i + 1, s)) })
    expect((sys as any).traumas).toHaveLength(6)
  })

  sources.forEach(src => {
    it(`来源 ${src} 字段保存正确`, () => {
      ;(sys as any).traumas.push(makeTrauma(1, src))
      expect((sys as any).traumas[0].source).toBe(src)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('TraumaEffect 枚举完整性', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  const effects: TraumaEffect[] = ['avoidance', 'aggression', 'withdrawal', 'hypervigilance', 'numbness']

  it('支持全部5种效果', () => {
    effects.forEach((e, i) => { ;(sys as any).traumas.push(makeTrauma(i + 1, 'combat', e)) })
    expect((sys as any).traumas).toHaveLength(5)
  })

  effects.forEach(eff => {
    it(`效果 ${eff} 字段保存正确`, () => {
      ;(sys as any).traumas.push(makeTrauma(1, 'combat', eff))
      expect((sys as any).traumas[0].effect).toBe(eff)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Trauma 数据字段', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('severity 字段正确存储', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'combat', 'avoidance', 75))
    expect((sys as any).traumas[0].severity).toBe(75)
  })

  it('locationX / locationY 正确存储', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'disaster', 'numbness', 50, { locationX: 30, locationY: 40 }))
    const t = (sys as any).traumas[0]
    expect(t.locationX).toBe(30)
    expect(t.locationY).toBe(40)
  })

  it('formedTick 正确存储', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'loss', 'withdrawal', 50, { formedTick: 9999 }))
    expect((sys as any).traumas[0].formedTick).toBe(9999)
  })

  it('healingRate 正确存储', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'betrayal', 'aggression', 50, { healingRate: 0.35 }))
    expect((sys as any).traumas[0].healingRate).toBeCloseTo(0.35)
  })

  it('id 字段唯一递增', () => {
    const t1 = makeTrauma(1)
    const t2 = makeTrauma(1)
    expect(t2.id).toBeGreaterThan(t1.id)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('healTraumas（私有方法）', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次调用 severity 减少 healingRate', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'combat', 'avoidance', 50, { healingRate: 5 }))
    ;(sys as any).healTraumas()
    expect((sys as any).traumas[0].severity).toBeCloseTo(45)
  })

  it('severity 降至阈值以下时创伤被移除', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'combat', 'avoidance', 11, { healingRate: 5 }))
    ;(sys as any).healTraumas()
    expect((sys as any).traumas).toHaveLength(0)
  })

  it('severity 恰好等于阈值10时不被移除', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'combat', 'avoidance', 15, { healingRate: 5 }))
    ;(sys as any).healTraumas()
    // severity becomes 10, which is NOT < 10, so kept
    expect((sys as any).traumas).toHaveLength(1)
  })

  it('多次 heal 后最终移除', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'combat', 'avoidance', 30, { healingRate: 10 }))
    for (let i = 0; i < 5; i++) { ;(sys as any).healTraumas() }
    expect((sys as any).traumas).toHaveLength(0)
  })

  it('高 severity 创伤存活多次heal', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'combat', 'avoidance', 100, { healingRate: 1 }))
    for (let i = 0; i < 10; i++) { ;(sys as any).healTraumas() }
    expect((sys as any).traumas).toHaveLength(1)
    expect((sys as any).traumas[0].severity).toBeCloseTo(90)
  })

  it('从后往前删除，避免索引错位', () => {
    ;(sys as any).traumas.push(makeTrauma(1, 'combat', 'avoidance', 11, { healingRate: 5 }))
    ;(sys as any).traumas.push(makeTrauma(2, 'loss', 'withdrawal', 60, { healingRate: 1 }))
    ;(sys as any).traumas.push(makeTrauma(3, 'exile', 'numbness', 12, { healingRate: 5 }))
    ;(sys as any).healTraumas()
    // ids 1 and 3 should be removed (severity < 10), id 2 stays
    expect((sys as any).traumas).toHaveLength(1)
    expect((sys as any).traumas[0].creatureId).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('applyEffects（avoidance 推离逻辑）', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('severity < 30 不触发 avoidance 推离', () => {
    const em = makeEm()
    const id = addCreatureEntity(em, 10, 20)
    ;(sys as any).traumas.push(makeTrauma(id, 'combat', 'avoidance', 29, { locationX: 10, locationY: 20 }))
    ;(sys as any).applyEffects(em)
    const pos = em.getComponent<PositionComponent>(id, 'position')!
    expect(pos.x).toBeCloseTo(10)
    expect(pos.y).toBeCloseTo(20)
  })

  it('在创伤地点附近 avoidance 推开生物', () => {
    const em = makeEm()
    const id = addCreatureEntity(em, 11, 21)  // 距离 √2 ≈ 1.41 < PROXIMITY_TRIGGER=5
    ;(sys as any).traumas.push(makeTrauma(id, 'combat', 'avoidance', 60, { locationX: 10, locationY: 20 }))
    ;(sys as any).applyEffects(em)
    const pos = em.getComponent<PositionComponent>(id, 'position')!
    expect(pos.x).toBeGreaterThan(11)
    expect(pos.y).toBeGreaterThan(21)
  })

  it('非 avoidance 效果不改变位置', () => {
    const em = makeEm()
    const id = addCreatureEntity(em, 11, 21)
    ;(sys as any).traumas.push(makeTrauma(id, 'combat', 'aggression', 60, { locationX: 10, locationY: 20 }))
    const before = { x: 11, y: 21 }
    ;(sys as any).applyEffects(em)
    const pos = em.getComponent<PositionComponent>(id, 'position')!
    expect(pos.x).toBeCloseTo(before.x)
    expect(pos.y).toBeCloseTo(before.y)
  })

  it('距离超出 PROXIMITY_TRIGGER 不触发推离', () => {
    const em = makeEm()
    const id = addCreatureEntity(em, 20, 30) // 距离 ≈14.1 > 5
    ;(sys as any).traumas.push(makeTrauma(id, 'combat', 'avoidance', 60, { locationX: 10, locationY: 20 }))
    ;(sys as any).applyEffects(em)
    const pos = em.getComponent<PositionComponent>(id, 'position')!
    expect(pos.x).toBeCloseTo(20)
    expect(pos.y).toBeCloseTo(30)
  })

  it('实体无 position 组件时跳过', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<CreatureComponent>(id, {
      type: 'creature', species: 'human', speed: 1, damage: 5,
      isHostile: false, name: 'T', age: 20, maxAge: 80, gender: 'male'
    })
    ;(sys as any).traumas.push(makeTrauma(id, 'combat', 'avoidance', 60, { locationX: 10, locationY: 20 }))
    expect(() => { ;(sys as any).applyEffects(em) }).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('update 节流（CHECK_INTERVAL）', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 未达 CHECK_INTERVAL 时不执行逻辑', () => {
    const em = makeEm()
    const formSpy = vi.spyOn(sys as any, 'formTraumas')
    sys.update(16, em, 100) // lastCheck=0, tick=100 < 750
    expect(formSpy).not.toHaveBeenCalled()
  })

  it('tick 达到 CHECK_INTERVAL 时执行逻辑', () => {
    const em = makeEm()
    const formSpy = vi.spyOn(sys as any, 'formTraumas')
    sys.update(16, em, 800) // 800 - 0 >= 750
    expect(formSpy).toHaveBeenCalledOnce()
  })

  it('lastCheck 在执行后更新', () => {
    const em = makeEm()
    sys.update(16, em, 800)
    expect((sys as any).lastCheck).toBe(800)
  })

  it('两次调用间隔不足时第二次不触发', () => {
    const em = makeEm()
    const formSpy = vi.spyOn(sys as any, 'formTraumas')
    sys.update(16, em, 800)
    sys.update(16, em, 1000) // 1000 - 800 = 200 < 750
    expect(formSpy).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('formTraumas MAX_TRAUMAS 限制', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('创伤数达到 MAX_TRAUMAS=50 时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // always < FORM_CHANCE → would always form
    const em = makeEm()
    // Pre-fill 50 traumas
    for (let i = 0; i < 50; i++) {
      ;(sys as any).traumas.push(makeTrauma(i + 1))
    }
    addCreatureEntity(em, 5, 5)
    ;(sys as any).formTraumas(em, 1000)
    expect((sys as any).traumas).toHaveLength(50)
  })

  it('创伤未满时可继续新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm()
    for (let i = 0; i < 49; i++) {
      ;(sys as any).traumas.push(makeTrauma(999)) // different creature
    }
    addCreatureEntity(em, 5, 5)
    ;(sys as any).formTraumas(em, 1000)
    expect((sys as any).traumas.length).toBeGreaterThan(49)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('per-creature 创伤上限 (3)', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('同一生物最多3条创伤', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm()
    const id = addCreatureEntity(em, 5, 5)
    // Pre-fill 3 traumas for same creature
    for (let i = 0; i < 3; i++) {
      ;(sys as any).traumas.push(makeTrauma(id))
    }
    ;(sys as any).formTraumas(em, 1000)
    const count = (sys as any).traumas.filter((t: Trauma) => t.creatureId === id).length
    expect(count).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('pickSource', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('返回合法的 TraumaSource', () => {
    const validSources: TraumaSource[] = ['combat', 'disaster', 'loss', 'starvation', 'exile', 'betrayal']
    const creature: CreatureComponent = {
      type: 'creature', species: 'elf', speed: 1, damage: 3,
      isHostile: false, name: 'E', age: 25, maxAge: 200, gender: 'female'
    }
    for (let i = 0; i < 20; i++) {
      const src = (sys as any).pickSource(creature) as TraumaSource
      expect(validSources).toContain(src)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('nextId 自增', () => {
  let sys: CreatureTraumaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次 formTraumas 新增创伤时 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm()
    addCreatureEntity(em, 5, 5)
    const before = (sys as any).nextId as number
    ;(sys as any).formTraumas(em, 1000)
    expect((sys as any).nextId).toBeGreaterThan(before)
  })
})
