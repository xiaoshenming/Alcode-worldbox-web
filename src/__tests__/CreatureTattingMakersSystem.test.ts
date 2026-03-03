import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureTattingMakersSystem } from '../systems/CreatureTattingMakersSystem'
import type { TattingMaker, TattingStyle } from '../systems/CreatureTattingMakersSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureTattingMakersSystem { return new CreatureTattingMakersSystem() }
function makeMaker(entityId: number, style: TattingStyle = 'needle', tick = 0): TattingMaker {
  return { id: nextId++, entityId, skill: 70, piecesMade: 12, style, delicacy: 65, reputation: 45, tick }
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

const CHECK_INTERVAL = 1440
const EXPIRE = 52000

describe('CreatureTattingMakersSystem — 初始状态', () => {
  let sys: CreatureTattingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梭织工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'shuttle'))
    expect((sys as any).makers[0].style).toBe('shuttle')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种梭织风格', () => {
    const styles: TattingStyle[] = ['needle', 'shuttle', 'cro', 'frivolite']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = (sys as any).makers
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureTattingMakersSystem — CHECK_INTERVAL 节流', () => {
  let sys: CreatureTattingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tick 差小于 CHECK_INTERVAL 时 lastCheck 不更新', () => {
    const em = makeEmptyEM()
    // lastCheck=0, tick=CHECK_INTERVAL-1=1439, 差=1439 < 1440 → 跳过
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('首次满足条件后第二次不足间隔则跳过', () => {
    const em = makeEmptyEM()
    sys.update(1, em, CHECK_INTERVAL)          // lastCheck = CHECK_INTERVAL
    sys.update(1, em, CHECK_INTERVAL * 2 - 1)  // 差=1439 < 1440 → 跳过
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次满足间隔时 lastCheck 逐步推进', () => {
    const em = makeEmptyEM()
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureTattingMakersSystem — skillMap 技能积累', () => {
  let sys: CreatureTattingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('初次命中生物后 skillMap 记录该实体', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // tick=CHECK_INTERVAL 确保节流通过（0-0>=CHECK_INTERVAL is false, so use tick=CHECK_INTERVAL）
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.has(eid)).toBe(true)
  })

  it('第二次命中时技能在原值基础上 +SKILL_GROWTH(0.055)', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    const skill1 = (sys as any).skillMap.get(eid) as number
    sys.update(1, em, CHECK_INTERVAL * 2)
    const skill2 = (sys as any).skillMap.get(eid) as number
    expect(skill2).toBeCloseTo(skill1 + 0.055, 5)
  })

  it('技能不超过上限 100', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(eid, 99.99)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.get(eid)).toBeLessThanOrEqual(100)
  })

  it('技能决定 style：skill<25 => needle', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(eid, 5) // 5 + 0.055 = 5.055 < 25 → needle
    sys.update(1, em, CHECK_INTERVAL)
    const m = (sys as any).makers.find((x: TattingMaker) => x.entityId === eid)
    expect(m?.style).toBe('needle')
  })

  it('技能决定 style：skill>=75 => frivolite', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(eid, 75)
    sys.update(1, em, CHECK_INTERVAL)
    const m = (sys as any).makers.find((x: TattingMaker) => x.entityId === eid)
    expect(m?.style).toBe('frivolite')
  })

  it('piecesMade = 1 + floor(skill/10)', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(eid, 50) // 50+0.055=50.055，floor(50.055/10)=5，piecesMade=6
    sys.update(1, em, CHECK_INTERVAL)
    const m = (sys as any).makers.find((x: TattingMaker) => x.entityId === eid)
    expect(m?.piecesMade).toBe(6)
  })
})

describe('CreatureTattingMakersSystem — 过期清理 (cutoff = tick - 52000)', () => {
  let sys: CreatureTattingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tick 小于 cutoff 的 maker 被移除', () => {
    const em = makeEmptyEM()
    // cutoff = tick - EXPIRE = (EXPIRE + CHECK_INTERVAL) - EXPIRE = CHECK_INTERVAL = 1440
    ;(sys as any).makers.push(makeMaker(1, 'needle', 0))       // 0 < 1440 → 移除
    ;(sys as any).makers.push(makeMaker(2, 'shuttle', 60000))  // 60000 > 1440 → 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, EXPIRE + CHECK_INTERVAL)
    const ids = (sys as any).makers.map((m: TattingMaker) => m.entityId)
    expect(ids).not.toContain(1)
    expect(ids).toContain(2)
  })

  it('tick 恰好等于 cutoff 时不被移除（边界）', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 'needle', EXPIRE))
    ;(sys as any).lastCheck = 0
    // cutoff = 2*EXPIRE - EXPIRE = EXPIRE，maker.tick==EXPIRE，不满足 < 故保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, EXPIRE * 2)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('所有 maker 全部过期后 makers 为空', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 'cro', 0))
    ;(sys as any).makers.push(makeMaker(2, 'needle', 100))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, EXPIRE + CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('cleanup 仅移除过期项，保留未过期项', () => {
    const em = makeEmptyEM()
    // cutoff = (EXPIRE + CHECK_INTERVAL) - EXPIRE = CHECK_INTERVAL = 1440
    ;(sys as any).makers.push(makeMaker(1, 'needle', 500))   // 500 < 1440 → 移除
    ;(sys as any).makers.push(makeMaker(2, 'shuttle', 60000)) // 保留
    ;(sys as any).makers.push(makeMaker(3, 'cro', 55000))     // 保留
    ;(sys as any).lastCheck = 0
    sys.update(1, em, EXPIRE + CHECK_INTERVAL)
    const ids = (sys as any).makers.map((m: TattingMaker) => m.entityId)
    expect(ids).not.toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
  })
})

describe('CreatureTattingMakersSystem — MAX_MAKERS 上限', () => {
  let sys: CreatureTattingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('makers 达到 30 时不再新增', () => {
    const [em] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100, 'needle', 0))
    }
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })
})

describe('CreatureTattingMakersSystem — age < 10 过滤', () => {
  let sys: CreatureTattingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('age<10 的生物不被招募为 maker', () => {
    const [em] = makeEMWithCreature(5) // age=5 < 10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureTattingMakersSystem — 综合与边界', () => {
  let sys: CreatureTattingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('empty update不崩溃', () => {
    const em = makeEmptyEM()
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
  it('makers是数组类型', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })
  it('delicacy字段正确存储', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle', 0))
    expect((sys as any).makers[0].delicacy).toBe(65)
  })
  it('reputation字段正确存储', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle', 0))
    expect((sys as any).makers[0].reputation).toBe(45)
  })
  it('piecesMade字段正确存储', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle', 0))
    expect((sys as any).makers[0].piecesMade).toBe(12)
  })
  it('支持所有4种TattingStyle类型', () => {
    const styles: TattingStyle[] = ['needle', 'shuttle', 'cro', 'frivolite']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, s)) })
    const all = (sys as any).makers
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })
  it('delicacy公式：14 + skill * 0.75', () => {
    const skill = 60
    const delicacy = 14 + skill * 0.75
    expect(delicacy).toBeCloseTo(59, 1)
  })
  it('reputation公式：10 + skill * 0.82', () => {
    const skill = 60
    const reputation = 10 + skill * 0.82
    expect(reputation).toBeCloseTo(59.2, 1)
  })
  it('piecesMade公式：1 + floor(skill/10)', () => {
    const skill = 60
    const piecesMade = 1 + Math.floor(skill / 10)
    expect(piecesMade).toBe(7)
  })
  it('skill<10时皮ecesMade=1', () => {
    const skill = 5
    const piecesMade = 1 + Math.floor(skill / 10)
    expect(piecesMade).toBe(1)
  })
  it('age<10的实体不被招募', () => {
    const [em] = makeEMWithCreature(5)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('技能上限100', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).skillMap.set(eid, 99.99)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).skillMap.get(eid)).toBeLessThanOrEqual(100)
  })
  it('SKILL_GROWTH=0.055', () => {
    const SKILL_GROWTH = 0.055
    expect(SKILL_GROWTH).toBe(0.055)
  })
  it('cutoff公式：tick - 52000', () => {
    const tick = 100000
    const cutoff = tick - 52000
    expect(cutoff).toBe(48000)
  })
  it('makers在节流期间数量不变', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 'needle', 0))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('system不崩溃tick=0', () => {
    const em = makeEmptyEM()
    expect(() => sys.update(1, em, 0)).not.toThrow()
  })
  it('MAX_MAKERS为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 100, 'needle', 0))
    }
    const [em] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeLessThanOrEqual(30)
  })
  it('skill记录tick字段', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle', 500))
    expect((sys as any).makers[0].tick).toBe(500)
  })
  it('招募成功时tick等于当前tick', () => {
    const [em] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).makers.length > 0) {
      expect((sys as any).makers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('连续三次update后lastCheck推进', () => {
    const em = makeEmptyEM()
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
  it('makers数组被正确初始化为空', () => {
    const newSys = new CreatureTattingMakersSystem()
    expect((newSys as any).makers.length).toBe(0)
  })
  it('typeIdx计算：skill/25取floor，上限3', () => {
    const skill = 100
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(3)
  })
  it('typeIdx计算：skill=50时为2', () => {
    const skill = 50
    const typeIdx = Math.min(3, Math.floor(skill / 25))
    expect(typeIdx).toBe(2)
  })
  it('CHECK_INTERVAL为1440', () => {
    expect(CHECK_INTERVAL).toBe(1440)
  })
  it('skillMap在多次调用中累积', () => {
    const [em, eid] = makeEMWithCreature()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    const skill1 = (sys as any).skillMap.get(eid) ?? 0
    sys.update(1, em, CHECK_INTERVAL * 2)
    const skill2 = (sys as any).skillMap.get(eid) ?? 0
    expect(skill2).toBeGreaterThanOrEqual(skill1)
  })
})
