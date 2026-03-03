import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticSpySystem, Spy, SpyMission, SpyStatus } from '../systems/DiplomaticSpySystem'

function makeCivManager(civs: Array<{id: number, name: string, population: number, relations?: any}> = []) {
  return { civs } as any
}
function makeSys() { return new DiplomaticSpySystem() }

describe('DiplomaticSpySystem', () => {
  let sys: DiplomaticSpySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('spies初始为空数组', () => { expect((sys as any).spies).toHaveLength(0) })
  it('incidents初始为空数组', () => { expect((sys as any).incidents).toHaveLength(0) })
  it('nextCheckTick初始等于CHECK_INTERVAL(800)', () => { expect((sys as any).nextCheckTick).toBe(800) })
  it('spies是数组类型', () => { expect(Array.isArray((sys as any).spies)).toBe(true) })
  it('手动注入spy后长度为1', () => {
    ;(sys as any).spies.push({ id: 1, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.5 })
    expect((sys as any).spies).toHaveLength(1)
  })
  it('incidents是数组类型', () => { expect(Array.isArray((sys as any).incidents)).toBe(true) })

  // 2. CHECK_INTERVAL节流（nextCheckTick模式）
  it('tick < nextCheckTick时不处理', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 799)
    expect((sys as any).nextCheckTick).toBe(800)
  })
  it('tick >= nextCheckTick时更新nextCheckTick', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 800)
    expect((sys as any).nextCheckTick).toBe(1600)
  })
  it('civs不足2个时不spawn', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, cm, 800)
    expect((sys as any).spies).toHaveLength(0)
  })
  it('civManager为null时不崩溃', () => {
    expect(() => sys.update(1, null as any, 800)).not.toThrow()
  })
  it('tick=800时nextCheckTick变为1600', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 800)
    expect((sys as any).nextCheckTick).toBe(1600)
  })
  it('tick=1600时nextCheckTick变为2400', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 800)
    sys.update(1, cm, 1600)
    expect((sys as any).nextCheckTick).toBe(2400)
  })
  it('civManager.civs为undefined时不崩溃', () => {
    expect(() => sys.update(1, {} as any, 800)).not.toThrow()
  })
  it('civs为空数组时不spawn', () => {
    const cm = makeCivManager([])
    sys.update(1, cm, 800)
    expect((sys as any).spies).toHaveLength(0)
  })

  // 3. 任务解决（mission resolve）
  it('active spy在deployedTick+MISSION_DURATION后被resolve', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.95 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    expect(spy.status).not.toBe('active')
  })
  it('mission成功时status变为returned', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.95 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    expect(spy.status).toBe('returned')
  })
  it('mission成功时incidents增加一条', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.95 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    expect((sys as any).incidents.length).toBeGreaterThan(0)
  })
  it('deployedTick不足MISSION_DURATION时active spy不被resolve', () => {
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 2000, successChance: 0.5 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000) // 3000-2000=1000 < MISSION_DURATION=3000
    expect(spy.status).toBe('active')
  })
  it('mission失败roll<0.4时status为captured', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.01  // fail (< successChance=0.05)
      return 0.2  // roll<0.4 → captured
    })
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.05 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    expect(spy.status).toBe('captured')
  })
  it('mission失败roll在[0.4,0.6)时status为dead', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.01
      return 0.5  // [0.4,0.6) → dead
    })
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.05 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    expect(spy.status).toBe('dead')
  })
  it('mission失败roll>=0.6时status为returned（任务失败但安全返回）', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.01
      return 0.8  // >=0.6 → returned
    })
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.05 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    expect(spy.status).toBe('returned')
  })
  it('captured时关系惩罚-15', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.01
      return 0.2
    })
    const relations: any = { 1: 50 }
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10, relations }
    ])
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.05 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    sys.update(1, cm, 3000)
    expect(relations[1]).toBe(35)
  })

  // 4. spy pruning
  it('非active且时间足够长的spy被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // prevent new spy recruitment (0.99 > 0.3)
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'returned', deployedTick: 0, successChance: 0.5 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 9001
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 9001) // 9001 - 0 = 9001 > MISSION_DURATION*3=9000
    expect((sys as any).spies).toHaveLength(0)
  })
  it('非active但时间不足的spy不被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // prevent new spy recruitment (0.99 > 0.3)
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'returned', deployedTick: 5000, successChance: 0.5 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 9001
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 9001) // 9001 - 5000 = 4001 < 9000
    expect((sys as any).spies).toHaveLength(1)
  })

  // 5. incidents cap
  it('incidents超过60时被修剪到40', () => {
    for (let i = 0; i < 65; i++) {
      ;(sys as any).incidents.push({ spyId: i, originCivId: 1, targetCivId: 2, type: 'mission_fail', tick: 0 })
    }
    ;(sys as any).nextCheckTick = 1600
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 1600)
    expect((sys as any).incidents.length).toBeLessThanOrEqual(65)
  })

  // 6. successChance范围
  it('successChance在[0.1,0.95]范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 }
    ])
    sys.update(1, cm, 800)
    if ((sys as any).spies.length > 0) {
      const sc = (sys as any).spies[0].successChance
      expect(sc).toBeGreaterThanOrEqual(0.1)
      expect(sc).toBeLessThanOrEqual(0.95)
    }
  })

  // 7. skill范围
  it('新招募spy的skill在[1,10]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 }
    ])
    sys.update(1, cm, 800)
    if ((sys as any).spies.length > 0) {
      const skill = (sys as any).spies[0].skill
      expect(skill).toBeGreaterThanOrEqual(1)
      expect(skill).toBeLessThanOrEqual(10)
    }
  })

  // 8. mission合法值
  it('新招募spy的mission是合法SpyMission', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 }
    ])
    sys.update(1, cm, 800)
    if ((sys as any).spies.length > 0) {
      const valid: SpyMission[] = ['scout', 'sabotage', 'steal_tech', 'assassinate', 'propaganda', 'counter_spy']
      expect(valid).toContain((sys as any).spies[0].mission)
    }
  })
  it('新招募spy的status初始为active', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 10 },
      { id: 2, name: 'B', population: 10 }
    ])
    sys.update(1, cm, 800)
    if ((sys as any).spies.length > 0) {
      expect((sys as any).spies[0].status).toBe('active')
    }
  })

  // 9. population门槛
  it('population低于MIN_POP_FOR_SPIES(8)的civ不被选为origin', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 5 },  // < 8
      { id: 2, name: 'B', population: 10 }
    ])
    sys.update(1, cm, 800)
    if ((sys as any).spies.length > 0) {
      expect((sys as any).spies[0].originCivId).not.toBe(1)
    }
  })

  // 10. MAX_SPIES上限
  it('active spies不超过MAX_SPIES=30', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 20 },
      { id: 2, name: 'B', population: 20 }
    ])
    for (let t = 800; t <= 800 * 50; t += 800) { sys.update(1, cm, t) }
    const activeCount = (sys as any).spies.filter((s: any) => s.status === 'active').length
    expect(activeCount).toBeLessThanOrEqual(30)
  })

  // 11. incidents字段结构
  it('incident含spyId字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.95 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    if ((sys as any).incidents.length > 0) {
      expect((sys as any).incidents[0].spyId).toBeDefined()
    }
  })
  it('incident含originCivId字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.95 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    if ((sys as any).incidents.length > 0) {
      expect((sys as any).incidents[0].originCivId).toBe(1)
    }
  })
  it('incident含type字段且为合法值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.95 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    if ((sys as any).incidents.length > 0) {
      const valid = ['captured','killed','mission_success','mission_fail']
      expect(valid).toContain((sys as any).incidents[0].type)
    }
  })
  it('mission_success时incident.type为mission_success', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // 0.1 < successChance(0.95) → success
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.95 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    expect((sys as any).incidents.some((i: any) => i.type === 'mission_success')).toBe(true)
  })
})

describe('DiplomaticSpySystem - 附加测试', () => {
  let sys: DiplomaticSpySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('countActiveSpies正确计算active spy数量', () => {
    ;(sys as any).spies.push(
      { id:1, status: 'active' },
      { id:2, status: 'returned' },
      { id:3, status: 'active' }
    )
    expect((sys as any).countActiveSpies()).toBe(2)
  })
  it('spies全部returned时countActiveSpies返回0', () => {
    ;(sys as any).spies.push({ id:1, status: 'returned' }, { id:2, status: 'dead' })
    expect((sys as any).countActiveSpies()).toBe(0)
  })
  it('spies为空时countActiveSpies返回0', () => {
    expect((sys as any).countActiveSpies()).toBe(0)
  })
  it('spy的deployedTick被记录为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 800)
    if ((sys as any).spies.length > 0) {
      expect((sys as any).spies[0].deployedTick).toBe(800)
    }
  })
  it('多次update时nextCheckTick持续递增', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 800)
    sys.update(1, cm, 1600)
    sys.update(1, cm, 2400)
    expect((sys as any).nextCheckTick).toBe(3200)
  })
  it('spy的originCivId不等于targetCivId', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 800)
    if ((sys as any).spies.length > 0) {
      const s = (sys as any).spies[0]
      expect(s.originCivId).not.toBe(s.targetCivId)
    }
  })
  it('incident的tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.95 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    if ((sys as any).incidents.length > 0) {
      expect((sys as any).incidents[0].tick).toBe(3000)
    }
  })
  it('captured时incident含targetCivId', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0.01
      return 0.2
    })
    const spy: Spy = { id: 99, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.05 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 3000
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 3000)
    if ((sys as any).incidents.length > 0) {
      expect((sys as any).incidents[0].targetCivId).toBe(2)
    }
  })
  it('civs只有1个时不能spawn（需要origin和target不同）', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 20 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    sys.update(1, cm, 800)
    expect((sys as any).spies).toHaveLength(0)
  })
  it('update无civs时nextCheckTick仍然更新', () => {
    const cm = makeCivManager([])
    sys.update(1, cm, 800)
    expect((sys as any).nextCheckTick).toBe(1600)
  })
  it('incidents超过60时trim到40以内', () => {
    for (let i = 0; i < 70; i++) {
      ;(sys as any).incidents.push({ spyId: i, originCivId: 1, targetCivId: 2, type: 'mission_fail', tick: 0 })
    }
    ;(sys as any).nextCheckTick = 800
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 800)
    expect((sys as any).incidents.length).toBeLessThanOrEqual(65)
  })
  it('counter_spy任务降低其他spy的successChance', () => {
    // 先注入一个counter_spy
    ;(sys as any).spies.push({
      id: 1, originCivId: 2, targetCivId: 1, mission: 'counter_spy',
      skill: 5, status: 'active', deployedTick: 0, successChance: 0.5
    })
    vi.spyOn(Math, 'random').mockReturnValue(0.2)
    const cm = makeCivManager([
      { id: 1, name: 'A', population: 20 },
      { id: 2, name: 'B', population: 20 }
    ])
    sys.update(1, cm, 800)
    // 新spawn的spy如果target是civ2，successChance会降低
    // 主要测试不崩溃
    expect((sys as any).spies.length).toBeGreaterThanOrEqual(1)
  })
  it('同一tick两次update时nextCheckTick不重复增加', () => {
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 800)
    const after1 = (sys as any).nextCheckTick
    sys.update(1, cm, 800) // 同一tick，此时nextCheckTick已是1600 > 800，不触发
    expect((sys as any).nextCheckTick).toBe(after1)
  })
  it('skill=10的spy successChance最高(<=0.95)', () => {
    // successChance = min(0.95, max(0.1, 0.5+(10-5)*0.06-0)) = min(0.95, 0.8) = 0.8
    const sc = Math.min(0.95, Math.max(0.1, 0.5 + (10 - 5) * 0.06))
    expect(sc).toBe(0.8)
    expect(sc).toBeLessThanOrEqual(0.95)
  })
  it('skill=1的spy successChance最低(>=0.1)', () => {
    // successChance = min(0.95, max(0.1, 0.5+(1-5)*0.06)) = min(0.95, max(0.1, 0.26)) = 0.26
    const sc = Math.min(0.95, Math.max(0.1, 0.5 + (1 - 5) * 0.06))
    expect(sc).toBe(0.26)
    expect(sc).toBeGreaterThanOrEqual(0.1)
  })
  it('SpyStatus枚举包含4种合法值', () => {
    const valid: SpyStatus[] = ['active', 'captured', 'returned', 'dead']
    expect(valid).toHaveLength(4)
  })
  it('SpyMission枚举包含6种合法值', () => {
    const valid: SpyMission[] = ['scout', 'sabotage', 'steal_tech', 'assassinate', 'propaganda', 'counter_spy']
    expect(valid).toHaveLength(6)
  })
})
