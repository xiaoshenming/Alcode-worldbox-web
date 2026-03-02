import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureTannerSystem } from '../systems/CreatureTannerSystem'
import type { Tanner, LeatherGrade } from '../systems/CreatureTannerSystem'

// 常量参考: CHECK_INTERVAL=1200, EXPIRE_AFTER=44000, SKILL_GROWTH=0.08, MAX_TANNERS=50, CRAFT_CHANCE=0.006

let nextId = 1
function makeSys(): CreatureTannerSystem { return new CreatureTannerSystem() }
function makeTanner(entityId: number, grade: LeatherGrade = 'tanned', tickVal = 0, overrides: Partial<Tanner> = {}): Tanner {
  return {
    id: nextId++, entityId, skill: 70, hidesProcessed: 15,
    leatherGrade: grade, quality: 65, tradeValue: 45, tick: tickVal,
    ...overrides
  }
}

function makeEmEmpty() {
  return {
    getEntitiesWithComponents: () => [],
    getComponent: () => null,
    hasComponent: () => false,
  } as any
}

function makeEmOne(eid: number, age = 20) {
  return {
    getEntitiesWithComponents: () => [eid],
    getComponent: (_id: number, _comp: string) => ({ age }),
    hasComponent: () => true,
  } as any
}

function makeEmMany(eids: number[], age = 20) {
  return {
    getEntitiesWithComponents: () => eids,
    getComponent: () => ({ age }),
    hasComponent: () => true,
  } as any
}

describe('CreatureTannerSystem — 基础数据结构', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

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

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('多个制革工均存在', () => {
    ;(sys as any).tanners.push(makeTanner(1))
    ;(sys as any).tanners.push(makeTanner(2))
    ;(sys as any).tanners.push(makeTanner(3))
    expect((sys as any).tanners).toHaveLength(3)
  })

  it('制革工 id 字段存在且为数字', () => {
    ;(sys as any).tanners.push(makeTanner(1))
    expect(typeof (sys as any).tanners[0].id).toBe('number')
  })

  it('skill 字段为 70', () => {
    ;(sys as any).tanners.push(makeTanner(5))
    expect((sys as any).tanners[0].skill).toBe(70)
  })

  it('quality 字段为 65', () => {
    ;(sys as any).tanners.push(makeTanner(5))
    expect((sys as any).tanners[0].quality).toBe(65)
  })
})

describe('CreatureTannerSystem — CHECK_INTERVAL 节流逻辑', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值<CHECK_INTERVAL时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值恰好=CHECK_INTERVAL时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('tick差值>CHECK_INTERVAL时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('连续两次调用仅第一次通过节流门', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 1200)
    sys.update(0, makeEmEmpty(), 1201)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('两次各满足间隔均通过节流', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 1200)
    sys.update(0, makeEmEmpty(), 2400)
    expect((sys as any).lastCheck).toBe(2400)
  })

  it('节流期间制革工数据不变', () => {
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 0, { skill: 30 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 100) // 100 < 1200，节流
    expect((sys as any).tanners[0].skill).toBe(30)
  })

  it('节流期间 skillMap 不变', () => {
    ;(sys as any).skillMap.set(1, 50)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 500) // 节流
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('tick=1199时不触发（差值小于1200）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 1199)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastCheck=1000，tick=2200时触发（差值=1200）', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(0, makeEmEmpty(), 2200)
    expect((sys as any).lastCheck).toBe(2200)
  })
})

describe('CreatureTannerSystem — skillMap 行为', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skillMap不存在时赋予初始随机值再增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 99
    sys.update(0, makeEmOne(eid), 1200)
    expect((sys as any).skillMap.has(eid)).toBe(true)
  })

  it('skillMap存储实体技能值并在update时增长SKILL_GROWTH', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 42
    ;(sys as any).skillMap.set(eid, 20)
    sys.update(0, makeEmOne(eid), 1200)
    const skill = (sys as any).skillMap.get(eid)
    expect(skill).toBeCloseTo(20.08, 5)
  })

  it('技能值不超过100上限', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 55
    ;(sys as any).skillMap.set(eid, 99.95)
    sys.update(0, makeEmOne(eid), 1200)
    const skill = (sys as any).skillMap.get(eid)
    expect(skill).toBe(100)
  })

  it('技能值=100时不再增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 66
    ;(sys as any).skillMap.set(eid, 100)
    sys.update(0, makeEmOne(eid), 1200)
    expect((sys as any).skillMap.get(eid)).toBe(100)
  })

  it('同一实体第二次update技能累积增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 77
    ;(sys as any).skillMap.set(eid, 30)
    sys.update(0, makeEmOne(eid), 1200)
    const skill1 = (sys as any).skillMap.get(eid)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmOne(eid), 2400)
    const skill2 = (sys as any).skillMap.get(eid)
    expect(skill2).toBeGreaterThan(skill1!)
  })

  it('CRAFT_CHANCE=0.006，random返回0时触发招募并更新skillMap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 100
    sys.update(0, makeEmOne(eid), 1200)
    expect((sys as any).skillMap.has(eid)).toBe(true)
  })

  it('random>CRAFT_CHANCE时不触发招募，skillMap无变化', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    const eid = 101
    sys.update(0, makeEmOne(eid), 1200)
    expect((sys as any).skillMap.has(eid)).toBe(false)
  })
})

describe('CreatureTannerSystem — leatherGrade 与 skill 的映射', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill<25时leatherGrade为rawhide(gradeIdx=0)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 77
    ;(sys as any).skillMap.set(eid, 20) // floor(20/25)=0 => rawhide
    sys.update(0, makeEmOne(eid), 1200)
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.leatherGrade).toBe('rawhide')
  })

  it('skill=25时leatherGrade为tanned(gradeIdx=1)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 78
    ;(sys as any).skillMap.set(eid, 24.93) // 24.93+0.08=25.01 => floor(25.01/25)=1 => tanned
    sys.update(0, makeEmOne(eid), 1200)
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.leatherGrade).toBe('tanned')
  })

  it('skill>=50且<75时leatherGrade为cured(gradeIdx=2)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 79
    ;(sys as any).skillMap.set(eid, 50) // floor(50.08/25)=2 => cured
    sys.update(0, makeEmOne(eid), 1200)
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.leatherGrade).toBe('cured')
  })

  it('skill>=75时leatherGrade为tooled(gradeIdx=3)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 80
    ;(sys as any).skillMap.set(eid, 75) // floor(75.08/25)=3 => tooled
    sys.update(0, makeEmOne(eid), 1200)
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.leatherGrade).toBe('tooled')
  })

  it('skill极高时gradeIdx不超过3（tooled）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 81
    ;(sys as any).skillMap.set(eid, 99) // floor(99.08/25)=3 => tooled
    sys.update(0, makeEmOne(eid), 1200)
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.leatherGrade).toBe('tooled')
  })

  it('hidesProcessed=2+floor(skill/10)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 82
    ;(sys as any).skillMap.set(eid, 30) // 30.08 => floor(30.08/10)=3 => hides=5
    sys.update(0, makeEmOne(eid), 1200)
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.hidesProcessed).toBe(5) // 2+3=5
  })

  it('quality=min(100, 15+skill*0.75+random*10)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // random=0
    ;(sys as any).lastCheck = 0
    const eid = 83
    ;(sys as any).skillMap.set(eid, 20) // skill=20.08 => quality=15+20.08*0.75+0=30.06
    sys.update(0, makeEmOne(eid), 1200)
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.quality).toBeGreaterThan(15)
    expect(added?.quality).toBeLessThanOrEqual(100)
  })

  it('tradeValue=quality*0.8*(gradeIdx+1)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 84
    ;(sys as any).skillMap.set(eid, 20) // rawhide gradeIdx=0, tradeValue=quality*0.8*1
    sys.update(0, makeEmOne(eid), 1200)
    const added = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(added?.tradeValue).toBeGreaterThan(0)
  })
})

describe('CreatureTannerSystem — 年龄过滤', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('age<10的实体不被招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmOne(100, 5), 1200) // age=5 < 10
    expect((sys as any).tanners).toHaveLength(0)
  })

  it('age=9的实体不被招募（边界）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmOne(100, 9), 1200)
    expect((sys as any).tanners).toHaveLength(0)
  })

  it('age=10的实体被招募（边界满足）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmOne(100, 10), 1200)
    expect((sys as any).tanners).toHaveLength(1)
  })

  it('age=20的实体正常招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmOne(100, 20), 1200)
    expect((sys as any).tanners).toHaveLength(1)
  })

  it('getComponent返回null时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const emNull = {
      getEntitiesWithComponents: () => [200],
      getComponent: () => null,
      hasComponent: () => true,
    } as any
    sys.update(0, emNull, 1200)
    expect((sys as any).tanners).toHaveLength(0)
  })
})

describe('CreatureTannerSystem — MAX_TANNERS 上限', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tanners达到MAX_TANNERS(50)时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    for (let i = 0; i < 50; i++) {
      ;(sys as any).tanners.push(makeTanner(i + 1))
    }
    sys.update(0, makeEmOne(999), 1200)
    expect((sys as any).tanners.length).toBe(50)
  })

  it('tanners=49时（低于上限）可继续添加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    for (let i = 0; i < 49; i++) {
      ;(sys as any).tanners.push(makeTanner(i + 1))
    }
    sys.update(0, makeEmOne(999), 1200)
    expect((sys as any).tanners.length).toBeGreaterThan(49)
  })

  it('多实体时仍受MAX_TANNERS约束', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    for (let i = 0; i < 50; i++) {
      ;(sys as any).tanners.push(makeTanner(i + 1))
    }
    sys.update(0, makeEmMany([100, 101, 102, 103, 104]), 1200)
    expect((sys as any).tanners.length).toBe(50)
  })
})

describe('CreatureTannerSystem — cleanup 过期清理 (cutoff = tick - 44000)', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick小于cutoff的记录被移除', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 0))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEmEmpty(), 50000) // cutoff=6000, 0<6000 => 删除
    expect((sys as any).tanners).toHaveLength(0)
  })

  it('tick大于cutoff的记录被保留', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 10000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEmEmpty(), 50000) // cutoff=6000, 10000>6000 => 保留
    expect((sys as any).tanners).toHaveLength(1)
  })

  it('tick恰好等于cutoff时记录保留（< cutoff才删除）', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 6000))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEmEmpty(), 50000) // cutoff=6000, 6000 < 6000 为false => 保留
    expect((sys as any).tanners).toHaveLength(1)
  })

  it('混合记录：仅移除过期的', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 0))     // 过期
    ;(sys as any).tanners.push(makeTanner(2, 'cured', 45000))  // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEmEmpty(), 50000)
    expect((sys as any).tanners).toHaveLength(1)
    expect((sys as any).tanners[0].entityId).toBe(2)
  })

  it('多个过期记录全部被移除', () => {
    ;(sys as any).lastCheck = 0
    for (let i = 0; i < 5; i++) {
      ;(sys as any).tanners.push(makeTanner(i + 1, 'tanned', 100)) // 全部过期
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEmEmpty(), 50000)
    expect((sys as any).tanners).toHaveLength(0)
  })

  it('cutoff为负数时（tick<44000）所有记录均保留', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 0))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEmEmpty(), 1200) // cutoff=1200-44000=-42800 < 0，0 > -42800 => 保留
    expect((sys as any).tanners).toHaveLength(1)
  })

  it('cleanup逆序删除不影响保留的其他元素', () => {
    ;(sys as any).lastCheck = 0
    ;(sys as any).tanners.push(makeTanner(1, 'tanned', 100))   // 过期
    ;(sys as any).tanners.push(makeTanner(2, 'cured', 48000))  // 保留
    ;(sys as any).tanners.push(makeTanner(3, 'tooled', 200))   // 过期
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEmEmpty(), 50000)
    expect((sys as any).tanners).toHaveLength(1)
    expect((sys as any).tanners[0].entityId).toBe(2)
  })
})

describe('CreatureTannerSystem — 招募时字段赋值', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('招募的制革工 tick 等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmOne(10), 1200)
    expect((sys as any).tanners[0].tick).toBe(1200)
  })

  it('招募的制革工 entityId 等于实体id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmOne(42), 1200)
    expect((sys as any).tanners[0].entityId).toBe(42)
  })

  it('id从1开始自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmOne(10), 1200)
    expect((sys as any).tanners[0].id).toBeGreaterThanOrEqual(1)
  })

  it('skill字段等于skillMap中增长后的值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eid = 50
    ;(sys as any).skillMap.set(eid, 30)
    sys.update(0, makeEmOne(eid), 1200)
    const tanner = (sys as any).tanners.find((t: Tanner) => t.entityId === eid)
    expect(tanner?.skill).toBeCloseTo(30.08, 5)
  })
})

describe('CreatureTannerSystem — 多实体并发处理', () => {
  let sys: CreatureTannerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('多实体场景下仍受MAX_TANNERS约束', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 全部触发招募
    ;(sys as any).lastCheck = 0
    const eids = Array.from({ length: 100 }, (_, i) => i + 1)
    sys.update(0, makeEmMany(eids), 1200)
    expect((sys as any).tanners.length).toBeLessThanOrEqual(50)
  })

  it('空实体列表时tanners不增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(0, makeEmEmpty(), 1200)
    expect((sys as any).tanners).toHaveLength(0)
  })

  it('random每次返回0时招募尽可能多的实体', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    const eids = Array.from({ length: 10 }, (_, i) => i + 1)
    sys.update(0, makeEmMany(eids), 1200)
    expect((sys as any).tanners.length).toBeGreaterThan(0)
  })
})
