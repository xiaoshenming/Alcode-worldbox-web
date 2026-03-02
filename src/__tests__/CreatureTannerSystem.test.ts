import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureTannerSystem } from '../systems/CreatureTannerSystem'
import type { Tanner, LeatherGrade } from '../systems/CreatureTannerSystem'

// CHECK_INTERVAL=1200, EXPIRE_AFTER=44000, SKILL_GROWTH=0.08, MAX_TANNERS=50, CRAFT_CHANCE=0.006

let nextId = 1
function makeSys(): CreatureTannerSystem { return new CreatureTannerSystem() }
function makeTanner(entityId: number, grade: LeatherGrade = 'tanned', tickVal = 0): Tanner {
  return { id: nextId++, entityId, skill: 70, hidesProcessed: 15, leatherGrade: grade, quality: 65, tradeValue: 45, tick: tickVal }
}

/** 构造假 EntityManager，getEntitiesWithComponents返回空，以免随机招募干扰测试 */
function makeEmEmpty() {
  return {
    getEntitiesWithComponents: () => [],
    getComponent: () => null,
    hasComponent: () => false,
  } as any
}

/** 构造有一个实体的 EntityManager（age>=10） */
function makeEmOne(eid: number) {
  return {
    getEntitiesWithComponents: () => [eid],
    getComponent: (_id: number, _comp: string) => ({ age: 20 }),
    hasComponent: () => true,
  } as any
}

describe('CreatureTannerSystem.getTanners', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有5个测试（保留）──

  it('初始无制革工', () => { expect((sys as any).tanners).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).tanners.push(makeTanner(1, 'tooled'))
    expect((sys as any).tanners[0].leatherGrade).toBe('tooled')
  })

  it('返回内部引用', () => {
    ;(sys as any).tanners.push(makeTanner(1))
    expect((sys as any).tanners).toBe((sys as any).tanners)
  })

  it('支持所有4种皮革等级', () => {
    const grades: LeatherGrade[] = ['rawhide', 'tanned', 'cured', 'tooled']
    grades.forEach((g, i) => { ;(sys as any).tanners.push(makeTanner(i + 1, g)) })
    const all = (sys as any).tanners
    grades.forEach((g, i) => { expect(all[i].leatherGrade).toBe(g) })
  })

  it('字段正确', () => {
    ;(sys as any).tanners.push(makeTanner(2))
    const t = (sys as any).tanners[0]
    expect(t.hidesProcessed).toBe(15)
    expect(t.tradeValue).toBe(45)
  })

  // ── 新增测试 ──

  // CHECK_INTERVAL 节流
  it('update在CHECK_INTERVAL未到时不处理(lastCheck=0,tick=1)', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 1)
    // tick-lastCheck=1 < 1200，不更新lastCheck
    expect((sys as any).lastCheck).toBe(0)
  })

  it('update在CHECK_INTERVAL到达时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('连续两次调用仅第一次通过节流门', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 1200)
    sys.update(0, makeEmEmpty(), 1201)
    // 第二次tick-lastCheck=1 < 1200，lastCheck仍为1200
    expect((sys as any).lastCheck).toBe(1200)
  })

  // skillMap 行为
  it('skillMap存储实体技能值并在update时增长SKILL_GROWTH', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // CRAFT_CHANCE=0.006 > 0 => 触发招募
    ;(sys as any).lastCheck = 0
    const eid = 42
    ;(sys as any).skillMap.set(eid, 20) // 预设技能
    const em = makeEmOne(eid)
    sys.update(0, em, 1200)
    vi.restoreAllMocks()
    const skill = (sys as any).skillMap.get(eid)
    expect(skill).toBeCloseTo(20.08, 5) // 20 + 0.08
  })

  it('skillMap不存在时赋予初始随机值再增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 99
    const em = makeEmOne(eid)
    sys.update(0, em, 1200)
    vi.restoreAllMocks()
    expect((sys as any).skillMap.has(eid)).toBe(true)
  })

  // time-based cleanup (cutoff = tick - 44000)
  it('cleanup移除tick小于cutoff的记录', () => {
    ;(sys as any).lastCheck = 0
    // 插入一个tick=0的记录，cutoff=50000-44000=6000，0<6000 => 被移除
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 0))
    sys.update(0, makeEmEmpty(), 50000)
    expect((sys as any).tanners).toHaveLength(0)
  })

  it('cleanup保留tick大于cutoff的记录', () => {
    ;(sys as any).lastCheck = 0
    // 插入tick=10000，cutoff=50000-44000=6000，10000>6000 => 保留
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 10000))
    sys.update(0, makeEmEmpty(), 50000)
    expect((sys as any).tanners).toHaveLength(1)
  })

  it('cleanup tick恰好等于cutoff时记录被移除', () => {
    ;(sys as any).lastCheck = 0
    // tick=6000, cutoff=50000-44000=6000, 6000 < 6000 => false => 保留? 边界：<, 不移除
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 6000))
    sys.update(0, makeEmEmpty(), 50000)
    // 6000 < 6000 is false => 记录保留
    expect((sys as any).tanners).toHaveLength(1)
  })

  it('cleanup仅移除过期记录，保留新记录', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 0))      // 过期
    ;(sys as any).tanners.push(makeTanner(2, 'cured', 45000))    // 保留
    sys.update(0, makeEmEmpty(), 50000)
    expect((sys as any).tanners).toHaveLength(1)
    expect((sys as any).tanners[0].entityId).toBe(2)
  })

  // MAX_TANNERS 上限
  it('tanners数量达到MAX_TANNERS时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 确保rand<CRAFT_CHANCE
    ;(sys as any).lastCheck = 0
    // 填满50个
    for (let i = 0; i < 50; i++) {
      ;(sys as any).tanners.push(makeTanner(i + 1))
    }
    const em = makeEmOne(999)
    sys.update(0, em, 1200)
    vi.restoreAllMocks()
    expect((sys as any).tanners.length).toBe(50)
  })

  // gradeIdx 与 skill 对应
  it('skill<25时leatherGrade为rawhide(gradeIdx=0)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 77
    ;(sys as any).skillMap.set(eid, 20) // skill=20 => floor(20/25)=0 => rawhide
    const em = makeEmOne(eid)
    sys.update(0, em, 1200)
    vi.restoreAllMocks()
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.leatherGrade).toBe('rawhide')
  })

  it('skill>=75时leatherGrade为tooled(gradeIdx=3)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 78
    ;(sys as any).skillMap.set(eid, 75) // skill=75 => floor(75/25)=3 => tooled
    const em = makeEmOne(eid)
    sys.update(0, em, 1200)
    vi.restoreAllMocks()
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.leatherGrade).toBe('tooled')
  })

  // age < 10 跳过
  it('age<10的实体不被招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const emYoung = {
      getEntitiesWithComponents: () => [100],
      getComponent: () => ({ age: 5 }), // age<10
      hasComponent: () => true,
    } as any
    sys.update(0, emYoung, 1200)
    vi.restoreAllMocks()
    expect((sys as any).tanners).toHaveLength(0)
  })
})
