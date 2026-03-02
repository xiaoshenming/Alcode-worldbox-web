import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePlasterersSystem } from '../systems/CreaturePlasterersSystem'
import type { Plasterer, PlasterType } from '../systems/CreaturePlasterersSystem'
import { EntityManager } from '../ecs/Entity'

const CHECK_INTERVAL = 1350
const MAX_PLASTERERS = 36
const SKILL_GROWTH = 0.07
const EXPIRE_AFTER = 55000

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
    // 直接 addComponent 到指定 entityId —— EntityManager.createEntity() 自增
    // 这里绕过 createEntity，直接操作：
    ;(em as any).entities.add(eid)
    ;(em as any).components.set('creature', (em as any).components.get('creature') ?? new Map())
    ;(em as any).components.get('creature').set(eid, { type: 'creature', age })
    ;(em as any).components.set('position', (em as any).components.get('position') ?? new Map())
    ;(em as any).components.get('position').set(eid, { type: 'position' })
  }
  return em
}

describe('CreaturePlasterersSystem.getPlasterers', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无抹灰工', () => { expect((sys as any).plasterers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plasterers.push(makePlasterer(1, 'gypsum'))
    expect((sys as any).plasterers[0].plasterType).toBe('gypsum')
  })
  it('返回内部引用', () => {
    ;(sys as any).plasterers.push(makePlasterer(1))
    expect((sys as any).plasterers).toBe((sys as any).plasterers)
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
})

describe('CreaturePlasterersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

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
})

describe('CreaturePlasterersSystem - skillMap 技能累积', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('首次进入 skillMap 后记录大于等于 2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // CRAFT_CHANCE 判断 Math.random() > 0.006，0 <= 0.006 通过
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeGreaterThanOrEqual(2)
    vi.restoreAllMocks()
  })

  it('已存在 skillMap 时技能叠加 SKILL_GROWTH', () => {
    ;(sys as any).skillMap.set(1, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(1)
    expect(skill).toBeCloseTo(50 + SKILL_GROWTH)
    vi.restoreAllMocks()
  })

  it('skillMap 技能不超过 100', () => {
    ;(sys as any).skillMap.set(1, 99.97)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.get(1)).toBe(100)
    vi.restoreAllMocks()
  })
})

describe('CreaturePlasterersSystem - plasterType 由技能决定', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('技能 < 25 -> lime', () => {
    ;(sys as any).skillMap.set(1, 10)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.plasterType).toBe('lime')
    vi.restoreAllMocks()
  })

  it('技能 >= 75 -> decorative', () => {
    ;(sys as any).skillMap.set(1, 99)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([1])
    sys.update(1, em, CHECK_INTERVAL)
    const p = (sys as any).plasterers[(sys as any).plasterers.length - 1]
    expect(p.plasterType).toBe('decorative')
    vi.restoreAllMocks()
  })
})

describe('CreaturePlasterersSystem - time-based cleanup（cutoff = tick - 55000）', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 字段新于 cutoff 的记录不被清除', () => {
    const tick = 100000
    ;(sys as any).plasterers.push(makePlasterer(1, 'lime', { tick: tick - EXPIRE_AFTER + 1 }))
    const em = makeEm([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, tick)
    expect((sys as any).plasterers).toHaveLength(1)
  })

  it('tick 字段等于 cutoff 的记录被清除', () => {
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
})

describe('CreaturePlasterersSystem - MAX_PLASTERERS 上限', () => {
  let sys: CreaturePlasterersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已达 MAX_PLASTERERS 时不再增加', () => {
    for (let i = 0; i < MAX_PLASTERERS; i++) {
      ;(sys as any).plasterers.push(makePlasterer(i + 1, 'lime', { tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm(Array.from({ length: 5 }, (_, i) => i + 100))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).plasterers.length).toBeLessThanOrEqual(MAX_PLASTERERS)
    vi.restoreAllMocks()
  })

  it('初始 skillMap 为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })
})
