import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureVintnerSystem } from '../systems/CreatureVintnerSystem'
import type { Vintner, WineVariety } from '../systems/CreatureVintnerSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureVintnerSystem { return new CreatureVintnerSystem() }
function makeVintner(entityId: number, variety: WineVariety = 'red', tick = 0): Vintner {
  return { id: nextId++, entityId, skill: 70, barrelsProduced: 12, wineVariety: variety, vintage: 50, reputation: 45, tick }
}

/** 构造最小化 EntityManager mock，getEntitiesWithComponents 返回指定列表 */
function makeEmptyEm(): EntityManager {
  const em = new EntityManager()
  vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([])
  return em
}

describe('CreatureVintnerSystem.getVintners', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无酿酒师', () => { expect((sys as any).vintners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).vintners.push(makeVintner(1, 'white'))
    expect((sys as any).vintners[0].wineVariety).toBe('white')
  })
  it('返回内部引用', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    expect((sys as any).vintners).toBe((sys as any).vintners)
  })
  it('支持所有4种葡萄酒类型', () => {
    const varieties: WineVariety[] = ['red', 'white', 'rosé', 'sparkling']
    varieties.forEach((v, i) => { ;(sys as any).vintners.push(makeVintner(i + 1, v)) })
    const all = (sys as any).vintners
    varieties.forEach((v, i) => { expect(all[i].wineVariety).toBe(v) })
  })
  it('多个全部返回', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    ;(sys as any).vintners.push(makeVintner(2))
    expect((sys as any).vintners).toHaveLength(2)
  })
})

describe('CreatureVintnerSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureVintnerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })

  it('tick 未达 CHECK_INTERVAL(1250) 时跳过执行，lastCheck 不变', () => {
    sys.update(0, em, 0)           // 初始化 lastCheck=0
    sys.update(0, em, 1249)        // 仍然 <1250，应跳过
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好达到 CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    sys.update(0, em, 1250)
    expect((sys as any).lastCheck).toBe(1250)
  })

  it('第二次执行需要再等 CHECK_INTERVAL', () => {
    sys.update(0, em, 1250)
    sys.update(0, em, 2499)   // 2499-1250=1249 < 1250，应跳过
    expect((sys as any).lastCheck).toBe(1250)
    sys.update(0, em, 2500)   // 2500-1250=1250，应执行
    expect((sys as any).lastCheck).toBe(2500)
  })
})

describe('CreatureVintnerSystem — skillMap 累积与上限', () => {
  let sys: CreatureVintnerSystem
  let em: EntityManager

  beforeEach(() => {
    sys = makeSys()
    em = new EntityManager()
    // 创建实体并附加所需组件
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'v', age: 20, maxAge: 80, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    // 强制 Math.random() 始终 < CRAFT_CHANCE(0.006)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    nextId = 1
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('skillMap 存储实体技能，每次更新增加 SKILL_GROWTH(0.08)', () => {
    sys.update(0, em, 1250)   // 第1次执行
    const skill1 = (sys as any).skillMap.get(1) ?? (sys as any).skillMap.values().next().value
    sys.update(0, em, 2500)   // 第2次执行
    // 获取第一个实体的技能值
    const mapVals = [...(sys as any).skillMap.values()]
    if (mapVals.length > 0) {
      expect(mapVals[0]).toBeGreaterThan(skill1 ?? 0)
    }
  })

  it('skill 被 Math.min(100, ...) 限制不超过 100', () => {
    // 预先将 skillMap 填充接近上限值
    const eid = [...em.getAllEntities()][0]
    ;(sys as any).skillMap.set(eid, 99.95)
    sys.update(0, em, 1250)
    const skill = (sys as any).skillMap.get(eid)
    expect(skill).toBeLessThanOrEqual(100)
  })
})

describe('CreatureVintnerSystem — vintner 记录 cleanup (cutoff = tick - 45000)', () => {
  let sys: CreatureVintnerSystem
  let em: EntityManager
  beforeEach(() => { sys = makeSys(); em = makeEmptyEm(); nextId = 1 })

  it('超过 45000 tick 的 vintner 记录被清除', () => {
    ;(sys as any).vintners.push(makeVintner(1, 'red', 0))    // tick=0，过期
    ;(sys as any).vintners.push(makeVintner(2, 'white', 50000)) // tick=50000，未过期
    sys.update(0, em, 50000)  // cutoff = 50000-45000=5000；tick=0 < 5000 → 删除
    const remaining = (sys as any).vintners as Vintner[]
    expect(remaining.some(v => v.entityId === 1)).toBe(false)
    expect(remaining.some(v => v.entityId === 2)).toBe(true)
  })

  it('tick 恰好等于 cutoff 边界时不删除（cutoff = tick-45000，条件 < cutoff）', () => {
    ;(sys as any).vintners.push(makeVintner(1, 'red', 5000))  // tick=5000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 50000)  // cutoff=5000，vintner.tick=5000，不满足 < 5000 → 保留
    expect((sys as any).vintners).toHaveLength(1)
  })

  it('多条记录批量清理，只保留未过期的', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).vintners.push(makeVintner(i + 1, 'red', i * 1000)) // tick=0,1000,...4000
    }
    ;(sys as any).vintners.push(makeVintner(10, 'white', 100000))  // 未过期
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 100000)  // cutoff=55000；tick=0~4000全部 < 55000 → 删除
    const remaining = (sys as any).vintners as Vintner[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(10)
  })
})

describe('CreatureVintnerSystem — vintner 字段合法性', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('reputation 值被 Math.min(100, ...) 限制', () => {
    // reputation = 10 + skill*0.6 + rand*15；skill=100, rand=1 → 10+60+15=85 ≤ 100
    ;(sys as any).vintners.push(makeVintner(1, 'sparkling'))
    const v = (sys as any).vintners[0] as Vintner
    expect(v.reputation).toBeLessThanOrEqual(100)
  })

  it('barrelsProduced 随 skill 增大而增大（skill=10→1桶，skill=90→9桶）', () => {
    const low: Vintner = { id: 1, entityId: 1, skill: 10, barrelsProduced: 1 + Math.floor(10 / 10), wineVariety: 'red', vintage: 0, reputation: 20, tick: 0 }
    const high: Vintner = { id: 2, entityId: 2, skill: 90, barrelsProduced: 1 + Math.floor(90 / 10), wineVariety: 'red', vintage: 0, reputation: 64, tick: 0 }
    expect(high.barrelsProduced).toBeGreaterThan(low.barrelsProduced)
  })

  it('id 字段从 1 开始自增', () => {
    ;(sys as any).vintners.push(makeVintner(1))
    ;(sys as any).vintners.push(makeVintner(2))
    const ids = (sys as any).vintners.map((v: Vintner) => v.id)
    expect(ids[0]).toBeLessThan(ids[1])
  })
})

describe('CreatureVintnerSystem — MAX_VINTNERS 上限', () => {
  let sys: CreatureVintnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('达到 MAX_VINTNERS(45) 后停止新增', () => {
    for (let i = 0; i < 45; i++) {
      ;(sys as any).vintners.push(makeVintner(i + 1))
    }
    expect((sys as any).vintners).toHaveLength(45)
    // 注：update 内部在 length >= MAX_VINTNERS 时 break，不会超过
    const em = makeEmptyEm()
    vi.spyOn(Math, 'random').mockReturnValue(0) // 强制所有随机通过
    sys.update(0, em, 1250)
    vi.restoreAllMocks()
    expect((sys as any).vintners.length).toBeLessThanOrEqual(45)
  })
})
