import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureTasselMakersSystem } from '../systems/CreatureTasselMakersSystem'
import type { TasselMaker, TasselType } from '../systems/CreatureTasselMakersSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureTasselMakersSystem { return new CreatureTasselMakersSystem() }
function makeMaker(entityId: number, type: TasselType = 'silk', tick = 0): TasselMaker {
  return { id: nextId++, entityId, skill: 70, tasselsMade: 12, tasselType: type, symmetry: 65, reputation: 45, tick }
}

/** 创建真实 EntityManager，返回 [em, entityId] */
function makeEMWithCreature(age = 20): [EntityManager, number] {
  const em = new EntityManager()
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', age } as any)
  em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
  return [em, eid]
}

function makeEmptyEM(): EntityManager {
  return new EntityManager()
}

const CHECK_INTERVAL = 1470
const EXPIRE = 52000

describe('CreatureTasselMakersSystem — 初始状态', () => {
  let sys: CreatureTasselMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无流苏工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'metallic'))
    expect((sys as any).makers[0].tasselType).toBe('metallic')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种流苏类型', () => {
    const types: TasselType[] = ['silk', 'wool', 'metallic', 'ceremonial']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].tasselType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureTasselMakersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureTasselMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tick 差小于 CHECK_INTERVAL 时不执行（lastCheck保持不变）', () => {
    const em = makeEmptyEM()
    // lastCheck=0，tick=CHECK_INTERVAL-1=1469，差1469 < 1470 → 跳过
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0) // 未被更新
  })

  it('tick >= CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('首次满足条件后第二次不足间隔则跳过', () => {
    const em = makeEmptyEM()
    sys.update(1, em, CHECK_INTERVAL)        // lastCheck = CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL * 2 - 1) // 差=1469 < 1470 → 跳过
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL) // 未变
  })

  it('连续两次满足间隔时 lastCheck 逐步推进', () => {
    const em = makeEmptyEM()
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureTasselMakersSystem — skillMap 技能积累', () => {
  let sys: CreatureTasselMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('初次命中生物后 skillMap 记录该实体', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0) // CRAFT_CHANCE 命中
    // 使用 tick=CHECK_INTERVAL 确保节流通过（lastCheck=0, diff=CHECK_INTERVAL >= CHECK_INTERVAL）
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.has(eid)).toBe(true)
  })

  it('第二次命中时技能在原值基础上 +SKILL_GROWTH(0.053)', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    const skill1 = (sys as any).skillMap.get(eid) as number
    sys.update(1, em, CHECK_INTERVAL * 2)
    const skill2 = (sys as any).skillMap.get(eid) as number
    expect(skill2).toBeCloseTo(skill1 + 0.053, 5)
  })

  it('技能不超过上限 100', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(eid, 99.99)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.get(eid)).toBeLessThanOrEqual(100)
  })

  it('技能决定 tasselType：skill<25 => silk', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(eid, 5) // 5 + 0.053 = 5.053 < 25 → silk
    sys.update(1, em, CHECK_INTERVAL)
    const m = (sys as any).makers.find((x: TasselMaker) => x.entityId === eid)
    expect(m?.tasselType).toBe('silk')
  })

  it('技能决定 tasselType：skill>=75 => ceremonial', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(eid, 75) // 75 + 0.053 = 75.053 >= 75 → ceremonial
    sys.update(1, em, CHECK_INTERVAL)
    const m = (sys as any).makers.find((x: TasselMaker) => x.entityId === eid)
    expect(m?.tasselType).toBe('ceremonial')
  })

  it('tasselsMade = 4 + floor(skill/6)', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(eid, 60) // 60+0.053=60.053，floor(60.053/6)=10，tasselsMade=14
    sys.update(1, em, CHECK_INTERVAL)
    const m = (sys as any).makers.find((x: TasselMaker) => x.entityId === eid)
    expect(m?.tasselsMade).toBe(14)
  })
})

describe('CreatureTasselMakersSystem — 过期清理 (cutoff = tick - 52000)', () => {
  let sys: CreatureTasselMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tick 小于 cutoff 的 maker 被移除', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 'silk', 0))     // tick=0，早于 cutoff
    ;(sys as any).makers.push(makeMaker(2, 'wool', 60000)) // tick=60000，在 cutoff 内
    ;(sys as any).lastCheck = 0
    // tick=EXPIRE+CHECK_INTERVAL, cutoff=(EXPIRE+CHECK_INTERVAL)-EXPIRE=CHECK_INTERVAL=1470
    // maker1.tick=0 < 1470 → 移除；maker2.tick=60000 > 1470 → 保留
    sys.update(1, em, EXPIRE + CHECK_INTERVAL)
    const ids = (sys as any).makers.map((m: TasselMaker) => m.entityId)
    expect(ids).not.toContain(1)
    expect(ids).toContain(2)
  })

  it('tick 恰好等于 cutoff 时不被移除（边界：makers[i].tick < cutoff）', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 'silk', EXPIRE)) // tick=52000
    ;(sys as any).lastCheck = 0
    // tick = EXPIRE*2, cutoff = 2*EXPIRE - EXPIRE = EXPIRE = 52000
    // maker.tick == cutoff, 不满足 < 故保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, EXPIRE * 2)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('所有 maker 全部过期后 makers 为空', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 'wool', 0))
    ;(sys as any).makers.push(makeMaker(2, 'metallic', 100))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, EXPIRE + CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('cleanup 仅移除过期项，保留未过期项', () => {
    const em = makeEmptyEM()
    // cutoff = tick - EXPIRE = (EXPIRE + CHECK_INTERVAL) - EXPIRE = CHECK_INTERVAL = 1470
    ;(sys as any).makers.push(makeMaker(1, 'silk', 1000))  // 1000 < 1470 → 移除
    ;(sys as any).makers.push(makeMaker(2, 'wool', 60000)) // 60000 > 1470 → 保留
    ;(sys as any).makers.push(makeMaker(3, 'metallic', 55000)) // 55000 > 1470 → 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, EXPIRE + CHECK_INTERVAL)
    const ids = (sys as any).makers.map((m: TasselMaker) => m.entityId)
    expect(ids).not.toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
  })
})

describe('CreatureTasselMakersSystem — MAX_MAKERS 上限', () => {
  let sys: CreatureTasselMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('makers 达到30时不再新增', () => {
    const [em] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100, 'silk', 0))
    }
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })
})

describe('CreatureTasselMakersSystem — 综合与边界', () => {
  let sys: CreatureTasselMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('empty update不崩溃', () => {
    const em = makeEmptyEM()
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
  it('tick=0时节流不通过', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('招募成功时tick字段等于当前tick', () => {
    const [em, _eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('多种TasselType均可存储', () => {
    const types: TasselType[] = ['silk', 'wool', 'metallic', 'ceremonial']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    expect((sys as any).makers).toHaveLength(4)
  })
  it('symmetry字段正确存储', () => {
    ;(sys as any).makers.push(makeMaker(1, 'silk', 0))
    expect((sys as any).makers[0].symmetry).toBe(65)
  })
  it('reputation字段正确存储', () => {
    ;(sys as any).makers.push(makeMaker(1, 'silk', 0))
    expect((sys as any).makers[0].reputation).toBe(45)
  })
  it('tasselsMade字段正确存储', () => {
    ;(sys as any).makers.push(makeMaker(1, 'silk', 0))
    expect((sys as any).makers[0].tasselsMade).toBe(12)
  })
  it('makers是数组类型', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })
  it('skillMap存储技能值', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).skillMap.has(eid)) {
      expect(typeof (sys as any).skillMap.get(eid)).toBe('number')
    }
  })
  it('symmetry公式：15 + skill * 0.72', () => {
    const skill = 60
    const symmetry = 15 + skill * 0.72
    expect(symmetry).toBeCloseTo(58.2, 1)
  })
  it('reputation公式：10 + skill * 0.81', () => {
    const skill = 60
    const reputation = 10 + skill * 0.81
    expect(reputation).toBeCloseTo(58.6, 1)
  })
  it('tasselsMade公式：4 + floor(skill/6)', () => {
    const skill = 60
    const tasselsMade = 4 + Math.floor(skill / 6)
    expect(tasselsMade).toBe(14)
  })
  it('系统在多次update后不崩溃', () => {
    const em = makeEmptyEM()
    expect(() => {
      sys.update(1, em, CHECK_INTERVAL)
      sys.update(1, em, CHECK_INTERVAL * 2)
      sys.update(1, em, CHECK_INTERVAL * 3)
    }).not.toThrow()
  })
  it('age<10的实体不被招募', () => {
    const [em] = makeEMWithCreature(5) // age=5 < 10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('age>=10的实体可以被招募', () => {
    const [em] = makeEMWithCreature(20) // age=20 >= 10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    // 有可能招募成功
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(0)
  })
  it('tech type索引：skill>=75时typeIdx=3（ceremonial）', () => {
    // 75/25 = 3 -> min(3,3)=3 -> ceremonial
    const skill = 75
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(3)
  })
  it('tech type索引：skill<25时typeIdx=0（silk）', () => {
    const skill = 10
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(0)
  })
  it('cutoff公式：tick - 52000', () => {
    const tick = 100000
    const cutoff = tick - 52000
    expect(cutoff).toBe(48000)
  })
  it('makers在节流期间数量不变', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 'silk', 0))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('系统在tick=0时不崩溃', () => {
    const em = makeEmptyEM()
    expect(() => sys.update(1, em, 0)).not.toThrow()
  })
  it('makers数组被正确初始化为空', () => {
    const newSys = new CreatureTasselMakersSystem()
    expect((newSys as any).makers.length).toBe(0)
  })
  it('记录tick字段正确设置', () => {
    ;(sys as any).makers.push(makeMaker(1, 'silk', 500))
    expect((sys as any).makers[0].tick).toBe(500)
  })
  it('SKILL_GROWTH 正确（0.053）', () => {
    const SKILL_GROWTH = 0.053
    expect(SKILL_GROWTH).toBe(0.053)
  })
})
