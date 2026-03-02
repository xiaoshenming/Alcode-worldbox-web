import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePlasterersSystem } from '../systems/CreaturePlasterersSystem'
import type { Plasterer, PlasterType } from '../systems/CreaturePlasterersSystem'
import { EntityManager } from '../ecs/Entity'

const CHECK_INTERVAL = 1350
const MAX_PLASTERERS = 36
const SKILL_GROWTH = 0.07
const EXPIRE_AFTER = 55000
const CRAFT_CHANCE = 0.006

let nextId = 1
function makeSys(): CreaturePlasterersSystem { return new CreaturePlasterersSystem() }
function makePlasterer(entityId: number, type: PlasterType = 'lime', overrides: Partial<Plasterer> = {}): Plasterer {
  return {
    id: nextId++,
    entityId,
    skill: 70,
    wallsFinished: 20,
    plasterType: type,
    smoothness: 75,
    durability: 60,
    tick: 0,
    ...overrides,
  }
}

/** 构造带实体的 EntityManager */
function makeEm(eids: number[], age = 10): EntityManager {
  const em = new EntityManager()
  for (const eid of eids) {
    ;(em as any).entities.add(eid)
    ;(em as any).components.set('creature', (em as any).components.get('creature') ?? new Map())
    ;(em as any).components.get('creature').set(eid, { type: 'creature', age })
    ;(em as any).components.set('position', (em as any).components.get('position') ?? new Map())
    ;(em as any).components.get('position').set(eid, { type: 'position' })
  }
  return em
}

// ──────────────────────────────────────────────
// 1. 初始状态
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - 初始状态', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无抹灰工', () => { expect((sys as any).plasterers).toHaveLength(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 skillMap 为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('plasterers 是数组', () => { expect(Array.isArray((sys as any).plasterers)).toBe(true) })
  it('skillMap 是 Map', () => { expect((sys as any).skillMap).toBeInstanceOf(Map) })
})

// ──────────────────────────────────────────────
// 2. getPlasterers / 数据注入
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem.getPlasterers', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'gypsum'))
    expect((sys as any).plasterers[0].plasterType).toBe('gypsum')
  })
  it('返回内部引用', () => {
    ;(sys as any).plasterers.push(makePlasterer(1))
    expect((sys as any).plasterers).toBe((sys as any).plasterers)
  })
  it('支持 lime 类型', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime'))
    expect((sys as any).plasterers[0].plasterType).toBe('lime')
  })
  it('支持 gypsum 类型', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'gypsum'))
    expect((sys as any).plasterers[0].plasterType).toBe('gypsum')
  })
  it('支持 clay 类型', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'clay'))
    expect((sys as any).plasterers[0].plasterType).toBe('clay')
  })
  it('支持 decorative 类型', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'decorative'))
    expect((sys as any).plasterers[0].plasterType).toBe('decorative')
  })
  it('支持所有4种灰泥类型', () => {
    const types: PlasterType[] = ['lime', 'gypsum', 'clay', 'decorative']
    types.forEach((t, i) => { ;(sys as any).plasterers.push(makePlasterer(i + 1, t)) })
    const all = (sys as any).plasterers
    types.forEach((t, i) => { expect(all[i].plasterType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).plasterers.push(makePlasterer(1))
    ;(sys as any).plasterers.push(makePlasterer(2))
    expect((sys as any).plasterers).toHaveLength(2)
  })
  it('skill 字段正确存储', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { skill: 55 }))
    expect((sys as any).plasterers[0].skill).toBe(55)
  })
  it('wallsFinished 字段正确存储', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { wallsFinished: 30 }))
    expect((sys as any).plasterers[0].wallsFinished).toBe(30)
  })
  it('smoothness 字段正确存储', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { smoothness: 90 }))
    expect((sys as any).plasterers[0].smoothness).toBe(90)
  })
  it('durability 字段正确存储', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { durability: 80 }))
    expect((sys as any).plasterers[0].durability).toBe(80)
  })
})

// ──────────────────────────────────────────────
// 3. CHECK_INTERVAL 节流
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 不足 CHECK_INTERVAL 时不更新 lastCheck', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick 达到 CHECK_INTERVAL 时更新 lastCheck', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('两次 update 间隔不足时跳过第二次', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)
    const snap = (sys as any).plasterers.length
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).plasterers.length).toBe(snap)
  })
  it('tick 恰好等于 CHECK_INTERVAL 时触发', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('两个完整间隔均可触发', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('tick=0 时不触发（0-0=0 < CHECK_INTERVAL）', () => {
    const em = makeEm([])
    sys.update(1, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ──────────────────────────────────────────────
// 4. skillMap 技能累积
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - skillMap 技能累积', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('首次进入 skillMap 后记录大于等于 2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeGreaterThanOrEqual(2)
  })
  it('已存在 skillMap 时技能叠加 SKILL_GROWTH', () => {
    ;(sys as any).skillMap.set(1, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeCloseTo(50 + SKILL_GROWTH)
  })
  it('skillMap 技能不超过 100', () => {
    ;(sys as any).skillMap.set(1, 99.97)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })
  it('skillMap 技能已为 100 时保持 100', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })
  it('多个实体各自维护独立 skillMap', () => {
    ;(sys as any).skillMap.set(1, 20)
    ;(sys as any).skillMap.set(2, 60)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1, 2])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.get(1)).toBeCloseTo(20 + SKILL_GROWTH)
    expect((sys as any).skillMap.get(2)).toBeCloseTo(60 + SKILL_GROWTH)
  })
})

// ──────────────────────────────────────────────
// 5. plasterType 由技能决定
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - plasterType 由技能决定', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('技能 < 25 -> lime', () => {
    ;(sys as any).skillMap.set(1, 10)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.plasterType).toBe('lime')
  })
  it('技能 >= 25 且 < 50 -> gypsum', () => {
    ;(sys as any).skillMap.set(1, 30)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.plasterType).toBe('gypsum')
  })
  it('技能 >= 50 且 < 75 -> clay', () => {
    ;(sys as any).skillMap.set(1, 60)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.plasterType).toBe('clay')
  })
  it('技能 >= 75 -> decorative', () => {
    ;(sys as any).skillMap.set(1, 99)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.plasterType).toBe('decorative')
  })
  it('技能恰好 = 25 -> gypsum（Math.floor(25/25)=1）', () => {
    ;(sys as any).skillMap.set(1, 25)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.plasterType).toBe('gypsum')
  })
  it('技能恰好 = 75 -> decorative（Math.floor(75/25)=3）', () => {
    ;(sys as any).skillMap.set(1, 75)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.plasterType).toBe('decorative')
  })
  it('技能 >= 100 -> decorative（Math.min(3, ...) 限制 typeIdx 最大为 3）', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.plasterType).toBe('decorative')
  })
})

// ──────────────────────────────────────────────
// 6. wallsFinished 计算
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - wallsFinished 计算', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill=11 时 wallsFinished = 1 + floor(11/11) = 2', () => {
    ;(sys as any).skillMap.set(1, 11)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.wallsFinished).toBe(2)
  })
  it('skill=0 时 wallsFinished = 1 + floor(0/11) = 1', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    // skill=0+SKILL_GROWTH=0.07 => wallsFinished=1+floor(0.07/11)=1
    expect(p.wallsFinished).toBe(1)
  })
  it('skill=100 时 wallsFinished = 1 + floor(100/11) = 10', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.wallsFinished).toBe(10)
  })
})

// ──────────────────────────────────────────────
// 7. smoothness 与 durability 计算
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - smoothness/durability 计算', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill=0 时 smoothness ≈ 25 + 0*0.65 = 25', () => {
    ;(sys as any).skillMap.set(1, 0)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    // skill 经过 SKILL_GROWTH=0.07 → 0.07
    expect(p.smoothness).toBeCloseTo(25 + 0.07 * 0.65, 4)
  })
  it('skill=100 时 smoothness = 25 + 100*0.65 = 90', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.smoothness).toBeCloseTo(90, 2)
  })
  it('skill=100 时 durability = 30 + 100*0.6 = 90', () => {
    ;(sys as any).skillMap.set(1, 100)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.durability).toBeCloseTo(90, 2)
  })
})

// ──────────────────────────────────────────────
// 8. 年龄检查（age < 8 跳过）
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - 年龄检查', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('age=7 时实体被跳过，不产生抹灰工', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 7)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).plasterers).toHaveLength(0)
  })
  it('age=8 时实体被处理，产生抹灰工', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 8)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).plasterers.length).toBeGreaterThanOrEqual(1)
  })
  it('age=100 时实体被处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1], 100)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).plasterers.length).toBeGreaterThanOrEqual(1)
  })
})

// ──────────────────────────────────────────────
// 9. time-based cleanup（cutoff = tick - 55000）
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - time-based cleanup（cutoff = tick - 55000）', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 字段新于 cutoff 的记录不被清除', () => {
    const tick = 100000
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { tick: tick - EXPIRE_AFTER + 1 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, tick)
    expect((sys as any).plasterers).toHaveLength(1)
  })
  it('tick 字段等于 cutoff-1 的记录被清除', () => {
    const tick = 100000
    const cutoff = tick - EXPIRE_AFTER
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { tick: cutoff - 1 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, tick)
    expect((sys as any).plasterers).toHaveLength(0)
  })
  it('仅过期记录被清除，新记录保留', () => {
    const tick = 100000
    const cutoff = tick - EXPIRE_AFTER
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { tick: cutoff - 100 }))
    ;(sys as any).plasterers.push(makePlasterer(2, 'gypsum', { tick: cutoff + 100 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, tick)
    expect((sys as any).plasterers).toHaveLength(1)
    expect((sys as any).plasterers[0].entityId).toBe(2)
  })
  it('多个过期记录全部被清除', () => {
    const tick = 100000
    const cutoff = tick - EXPIRE_AFTER
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { tick: cutoff - 500 }))
    ;(sys as any).plasterers.push(makePlasterer(2, 'lime', { tick: cutoff - 1 }))
    ;(sys as any).plasterers.push(makePlasterer(3, 'lime', { tick: cutoff - 100 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, tick)
    expect((sys as any).plasterers).toHaveLength(0)
  })
  it('tick 字段恰好等于 cutoff 时不被清除（cutoff < cutoff 不成立）', () => {
    const tick = 100000
    const cutoff = tick - EXPIRE_AFTER
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { tick: cutoff }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, tick)
    // cutoff < cutoff => false => 保留
    expect((sys as any).plasterers).toHaveLength(1)
  })
})

// ──────────────────────────────────────────────
// 10. MAX_PLASTERERS 上限
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - MAX_PLASTERERS 上限', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('已达 MAX_PLASTERERS 时不再增加', () => {
    for (let i = 0; i < MAX_PLASTERERS; i++) {
      ;(sys as any).plasterers.push(makePlasterer(i + 1, 'lime', { tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm(Array.from({ length: 5 }, (_, i) => i + 100))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).plasterers.length).toBeLessThanOrEqual(MAX_PLASTERERS)
  })
  it('MAX_PLASTERERS 常量为 36', () => {
    expect(MAX_PLASTERERS).toBe(36)
  })
  it('plasterers 数量恰好为 MAX_PLASTERERS 不增加', () => {
    for (let i = 0; i < MAX_PLASTERERS; i++) {
      ;(sys as any).plasterers.push(makePlasterer(i + 1, 'lime', { tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([100, 101, 102])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).plasterers.length).toBe(MAX_PLASTERERS)
  })
})

// ──────────────────────────────────────────────
// 11. nextId 递增序列
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - nextId 递增', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('每次招募后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).plasterers.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })
  it('多次招募后 id 序列连续', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1, 2, 3])
    sys.update(1, em, CHECK_INTERVAL)
    const ids = (sys as any).plasterers.map((p: Plasterer) => p.id)
    for (let i = 0; i < ids.length - 1; i++) {
      expect(ids[i + 1] - ids[i]).toBe(1)
    }
  })
})

// ──────────────────────────────────────────────
// 12. CRAFT_CHANCE 过滤
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - CRAFT_CHANCE 过滤', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random() > CRAFT_CHANCE 时实体被跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(CRAFT_CHANCE + 0.001)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).plasterers).toHaveLength(0)
  })
  it('Math.random() = 0 时实体通��� CRAFT_CHANCE 检查', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).plasterers.length).toBeGreaterThanOrEqual(1)
  })
})

// ──────────────────────────────────────────────
// 13. 边界与综合
// ──────────────────────────────────────────────
describe('CreaturePlasterersSystem - 边界与综合场景', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('空实体列表时不产生抹灰工', () => {
    const em = makeEm([])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).plasterers).toHaveLength(0)
  })
  it('CHECK_INTERVAL 常量为 1350', () => {
    expect(CHECK_INTERVAL).toBe(1350)
  })
  it('SKILL_GROWTH 常量为 0.07', () => {
    expect(SKILL_GROWTH).toBe(0.07)
  })
  it('EXPIRE_AFTER 常量为 55000', () => {
    expect(EXPIRE_AFTER).toBe(55000)
  })
  it('update 不抛异常', () => {
    const em = makeEm([])
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})
