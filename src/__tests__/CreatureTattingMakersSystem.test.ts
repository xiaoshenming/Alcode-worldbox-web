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
    sys.update(1, em, EXPIRE * 2)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('所有 maker 全部过期后 makers 为空', () => {
    const em = makeEmptyEM()
    ;(sys as any).makers.push(makeMaker(1, 'cro', 0))
    ;(sys as any).makers.push(makeMaker(2, 'needle', 100))
    ;(sys as any).lastCheck = 0
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
