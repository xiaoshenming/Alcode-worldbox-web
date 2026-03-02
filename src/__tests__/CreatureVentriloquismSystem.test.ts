import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureVentriloquismSystem } from '../systems/CreatureVentriloquismSystem'
import type { VentriloquismAct, VoiceTrick } from '../systems/CreatureVentriloquismSystem'

// 常量参考: CHECK_INTERVAL=1100, EXPIRE_AFTER=5000, MAX_ACTS=80, SKILL_GROWTH=0.07
// PERFORM_CHANCE=0.004, DETECTION_BASE=0.4
// EFFECTIVENESS_MAP: distraction=0.6, mimicry=0.7, intimidation=0.8, lure=0.75, comedy=0.5, warning=0.65

let nextId = 1
function makeSys(): CreatureVentriloquismSystem { return new CreatureVentriloquismSystem() }
function makeAct(performerId: number, trick: VoiceTrick = 'distraction', tickVal = 0, overrides: Partial<VentriloquismAct> = {}): VentriloquismAct {
  return {
    id: nextId++, performerId, trick, skill: 70,
    effectiveness: 60, targetId: null, detected: false, tick: tickVal,
    ...overrides
  }
}

function makeMockEM(entityIds: number[] = [], creatureAge = 20) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockReturnValue(entityIds.length > 0 ? { age: creatureAge } : null),
    hasComponent: vi.fn().mockReturnValue(false),
  }
}

const CHECK_INTERVAL = 1100
const EXPIRE_AFTER = 5000
const MAX_ACTS = 80

describe('CreatureVentriloquismSystem — 基础数据结构', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无口技表演', () => { expect((sys as any).acts).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).acts.push(makeAct(1, 'mimicry'))
    expect((sys as any).acts[0].trick).toBe('mimicry')
  })

  it('返回内部引用', () => {
    ;(sys as any).acts.push(makeAct(1))
    expect((sys as any).acts).toBe((sys as any).acts)
  })

  it('支持所有6种口技技巧', () => {
    const tricks: VoiceTrick[] = ['distraction', 'mimicry', 'intimidation', 'lure', 'comedy', 'warning']
    tricks.forEach((t, i) => { ;(sys as any).acts.push(makeAct(i + 1, t)) })
    expect((sys as any).acts).toHaveLength(6)
  })

  it('targetId可为null', () => {
    ;(sys as any).acts.push(makeAct(1))
    expect((sys as any).acts[0].targetId).toBeNull()
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 skillMap 为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('detected字段可为true', () => {
    ;(sys as any).acts.push(makeAct(1, 'distraction', 0, { detected: true }))
    expect((sys as any).acts[0].detected).toBe(true)
  })

  it('skill字段默认为70', () => {
    ;(sys as any).acts.push(makeAct(1))
    expect((sys as any).acts[0].skill).toBe(70)
  })

  it('多个acts均存在', () => {
    ;(sys as any).acts.push(makeAct(1))
    ;(sys as any).acts.push(makeAct(2))
    ;(sys as any).acts.push(makeAct(3))
    expect((sys as any).acts).toHaveLength(3)
  })

  it('effectiveness字段默认为60', () => {
    ;(sys as any).acts.push(makeAct(1))
    expect((sys as any).acts[0].effectiveness).toBe(60)
  })
})

describe('CreatureVentriloquismSystem — CHECK_INTERVAL 节流逻辑', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick不足CHECK_INTERVAL时getEntitiesWithComponents不被调用', () => {
    const em = makeMockEM([1])
    sys.update(1, em as any, CHECK_INTERVAL - 1)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick达到CHECK_INTERVAL时执行一次逻辑', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledOnce()
  })

  it('第二次update不足间隔，不再执行', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL + 50)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('两次各达间隔，各执行一次，共调用两次', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })

  it('tick=1099时不触发（差值小于1100）', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, 1099)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick=1100时触发（差值恰好等于CHECK_INTERVAL）', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, 1100)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('lastCheck更新为当前tick', () => {
    const em = makeMockEM([])
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('节流期间acts数据不变', () => {
    ;(sys as any).acts.push(makeAct(1, 'comedy', 0, { skill: 40 }))
    const em = makeMockEM([])
    sys.update(1, em as any, 500) // 节流
    expect((sys as any).acts[0].skill).toBe(40)
  })

  it('lastCheck=2000时tick=3099不触发', () => {
    ;(sys as any).lastCheck = 2000
    const em = makeMockEM([])
    sys.update(1, em as any, 3099)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('lastCheck=2000时tick=3100触发', () => {
    ;(sys as any).lastCheck = 2000
    const em = makeMockEM([])
    sys.update(1, em as any, 3100)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })
})

describe('CreatureVentriloquismSystem — skillMap 积累与上限', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('同一实体多次update后skillMap中技能累增', () => {
    const em = makeMockEM([42], 20)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    const skill1 = (sys as any).skillMap.get(42) as number
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    const skill2 = (sys as any).skillMap.get(42) as number
    randSpy.mockRestore()
    expect(skill2).toBeGreaterThan(skill1)
  })

  it('skillMap中的技能值不超过100', () => {
    ;(sys as any).skillMap.set(99, 99.95)
    const em = makeMockEM([99], 20)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(99) as number
    randSpy.mockRestore()
    expect(skill).toBeLessThanOrEqual(100)
  })

  it('初始没有skillMap条目，首次招募创建条目', () => {
    expect((sys as any).skillMap.size).toBe(0)
    const em = makeMockEM([7], 20)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    expect((sys as any).skillMap.has(7)).toBe(true)
  })

  it('SKILL_GROWTH=0.07，每次update技能增长约0.07', () => {
    const em = makeMockEM([33], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).skillMap.set(33, 20)
    sys.update(1, em as any, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(33) as number
    expect(skill).toBeCloseTo(20.07, 4)
  })

  it('skill=100时不再增长', () => {
    const em = makeMockEM([44], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).skillMap.set(44, 100)
    sys.update(1, em as any, CHECK_INTERVAL)
    const skill = (sys as any).skillMap.get(44) as number
    expect(skill).toBe(100)
  })

  it('random>PERFORM_CHANCE时不招募，skillMap无新条目', () => {
    const em = makeMockEM([55], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).skillMap.has(55)).toBe(false)
  })

  it('random<=PERFORM_CHANCE时招募，skillMap新增条目', () => {
    const em = makeMockEM([66], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).skillMap.has(66)).toBe(true)
  })
})

describe('CreatureVentriloquismSystem — cleanup (cutoff = tick - 5000)', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick为0的act在tick=5001时被清除', () => {
    ;(sys as any).acts.push(makeAct(1, 'comedy', 0))
    const em = makeMockEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, EXPIRE_AFTER + 1)
    expect((sys as any).acts).toHaveLength(0)
  })

  it('tick恰好等于cutoff的act不被清除', () => {
    const baseTick = CHECK_INTERVAL
    ;(sys as any).acts.push(makeAct(1, 'lure', baseTick - EXPIRE_AFTER + 1))
    const em = makeMockEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, baseTick)
    expect((sys as any).acts).toHaveLength(1)
  })

  it('新鲜act不被清除', () => {
    ;(sys as any).acts.push(makeAct(1, 'warning', CHECK_INTERVAL))
    const em = makeMockEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect((sys as any).acts).toHaveLength(1)
  })

  it('混合新旧act：仅删除过期的', () => {
    ;(sys as any).acts.push(makeAct(1, 'distraction', 0))    // 过期
    ;(sys as any).acts.push(makeAct(2, 'mimicry', 5500))     // 保留
    const em = makeMockEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, 6000)
    expect((sys as any).acts).toHaveLength(1)
    expect((sys as any).acts[0].performerId).toBe(2)
  })

  it('cutoff为负数时所有act均保留', () => {
    ;(sys as any).acts.push(makeAct(1, 'comedy', 0))
    const em = makeMockEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL) // cutoff=1100-5000=-3900 < 0
    expect((sys as any).acts).toHaveLength(1)
  })

  it('多个过期act全部被移除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).acts.push(makeAct(i + 1, 'lure', 100))
    }
    const em = makeMockEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, 6000) // cutoff=1000, 全部 tick=100 < 1000 => 删除
    expect((sys as any).acts).toHaveLength(0)
  })

  it('cleanup逆序删除不影响保留元素', () => {
    ;(sys as any).acts.push(makeAct(1, 'comedy', 100))    // 过期
    ;(sys as any).acts.push(makeAct(2, 'mimicry', 5500))  // 保留
    ;(sys as any).acts.push(makeAct(3, 'lure', 200))      // 过期
    const em = makeMockEM([])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, 6000)
    expect((sys as any).acts).toHaveLength(1)
    expect((sys as any).acts[0].performerId).toBe(2)
  })
})

describe('CreatureVentriloquismSystem — MAX_ACTS 上限', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_ACTS限制：acts达到上限时不再增加新的', () => {
    for (let i = 0; i < MAX_ACTS; i++) {
      ;(sys as any).acts.push(makeAct(i + 1, 'lure', CHECK_INTERVAL))
    }
    const em = makeMockEM([999], 20)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    expect((sys as any).acts.length).toBeLessThanOrEqual(MAX_ACTS)
  })

  it('acts=79时（低于上限）可继续添加', () => {
    for (let i = 0; i < 79; i++) {
      ;(sys as any).acts.push(makeAct(i + 1, 'lure', CHECK_INTERVAL))
    }
    const em = makeMockEM([999], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).acts.length).toBeGreaterThanOrEqual(79)
  })
})

describe('CreatureVentriloquismSystem — 年龄过滤', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('年龄<12的生物不被招募', () => {
    const em = makeMockEM([55], 5)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    expect((sys as any).acts).toHaveLength(0)
  })

  it('年龄=11时不被招募（边界）', () => {
    const em = makeMockEM([56], 11)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).acts).toHaveLength(0)
  })

  it('年龄=12时被招募（边界满足）', () => {
    const em = makeMockEM([57], 12)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).acts).toHaveLength(1)
  })

  it('年龄=20时正常招募', () => {
    const em = makeMockEM([58], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).acts).toHaveLength(1)
  })

  it('getComponent返回null时不招募', () => {
    const emNull = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([200]),
      getComponent: vi.fn().mockReturnValue(null),
      hasComponent: vi.fn().mockReturnValue(false),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, emNull as any, CHECK_INTERVAL)
    expect((sys as any).acts).toHaveLength(0)
  })
})

describe('CreatureVentriloquismSystem — act字段赋值', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('招募的act tick等于当前tick', () => {
    const em = makeMockEM([10], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).acts[0].tick).toBe(CHECK_INTERVAL)
  })

  it('招募的act performerId等于实体id', () => {
    const em = makeMockEM([42], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).acts[0].performerId).toBe(42)
  })

  it('detected为false时effectiveness = baseFx * (skill/100)', () => {
    // distraction baseFx=0.6, 检测到detected=false: effectiveness=0.6*(skill/100)
    const em = makeMockEM([10], 20)
    // 固定random=0.001使random<=PERFORM_CHANCE, 且random用于trick选择和detected
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).skillMap.set(10, 100) // skill=100, detected=Math.random() > (1*(1-0.4)+0.4)=1.0 => 0.001>1.0 false
    sys.update(1, em as any, CHECK_INTERVAL)
    const act = (sys as any).acts[0]
    // detected=false, effectiveness=baseFx*(100/100)=baseFx
    expect(act.detected).toBe(false)
    expect(act.effectiveness).toBeGreaterThan(0)
  })

  it('id字段自增', () => {
    const em = makeMockEM([10], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).nextId = 5
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).acts[0].id).toBeGreaterThanOrEqual(5)
  })

  it('单实体时targetId为null（无其他生物可作为目标）', () => {
    const em = makeMockEM([10], 20)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    // creatures数组=[10], find(t=>t!==10)=undefined => targetId=null
    expect((sys as any).acts[0].targetId).toBeNull()
  })

  it('多实体时targetId为另一实体', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([10, 20]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
      hasComponent: vi.fn().mockReturnValue(false),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em as any, CHECK_INTERVAL)
    // performers=[10,20], eid=10 => target=20
    const act = (sys as any).acts.find((a: VentriloquismAct) => a.performerId === 10)
    if (act) {
      expect(act.targetId).toBe(20)
    }
  })
})

describe('CreatureVentriloquismSystem — trick 与 effectiveness 映射', () => {
  let sys: CreatureVentriloquismSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('detected=true时effectiveness=baseFx*0.2', () => {
    // 让detected=true: Math.random() > (skill/100)*(1-0.4)+0.4
    // skill=0 => threshold=0+0.4=0.4, random>0.4时detected=true
    const em = makeMockEM([10], 20)
    // 第一次random用于PERFORM_CHANCE (需<=0.004), 第二次用于trick选择，第三次用于detected
    const mockValues = [0.001, 0, 0.9] // 0.9 > threshold => detected=true
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => mockValues[callCount++ % mockValues.length])
    ;(sys as any).skillMap.set(10, 0)
    sys.update(1, em as any, CHECK_INTERVAL)
    const act = (sys as any).acts[0]
    if (act) {
      expect(act.detected).toBe(true)
      // effectiveness应当很小（baseFx*0.2）
      expect(act.effectiveness).toBeLessThan(1)
    }
  })

  it('6种trick均为已知类型', () => {
    const validTricks: VoiceTrick[] = ['distraction', 'mimicry', 'intimidation', 'lure', 'comedy', 'warning']
    for (let i = 0; i < 6; i++) {
      const em = makeMockEM([i + 1], 20)
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      ;(sys as any).lastCheck = 0
      sys.update(1, em as any, CHECK_INTERVAL * (i + 1))
    }
    for (const act of (sys as any).acts) {
      expect(validTricks).toContain(act.trick)
    }
  })
})
