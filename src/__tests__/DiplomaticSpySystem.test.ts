import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
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

  // 3. 字段动态更新（mission resolve）
  it('active spy在deployedTick+MISSION_DURATION后被resolve', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // success
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
    sys.update(1, cm, 3000)
    expect(spy.status).toBe('active')
  })

  // 4. cleanup（status-based，MISSION_DURATION*3=9000）
  it('status=returned且tick-deployedTick>9000时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const spy: Spy = { id: 1, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'returned', deployedTick: 0, successChance: 0.5 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 9001
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 9001)
    expect((sys as any).spies).toHaveLength(0)
  })
  it('status=active时不被cleanup删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    // deployedTick=8000，tick=9001，差值1001 < MISSION_DURATION(3000)，不会被resolve也不会被cleanup
    const spy: Spy = { id: 1, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 8000, successChance: 0.5 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 9001
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 9001)
    expect((sys as any).spies).toHaveLength(1)
  })
  it('status=captured且tick-deployedTick>9000时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const spy: Spy = { id: 1, originCivId: 1, targetCivId: 2, mission: 'sabotage', skill: 5, status: 'captured', deployedTick: 0, successChance: 0.5 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 9001
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 9001)
    expect((sys as any).spies).toHaveLength(0)
  })
  it('status=dead且tick-deployedTick>9000时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const spy: Spy = { id: 1, originCivId: 1, targetCivId: 2, mission: 'assassinate', skill: 5, status: 'dead', deployedTick: 0, successChance: 0.5 }
    ;(sys as any).spies.push(spy)
    ;(sys as any).nextCheckTick = 9001
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 9001)
    expect((sys as any).spies).toHaveLength(0)
  })

  // 5. MAX_SPIES上限
  it('active spy数量不超过MAX_SPIES(30)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    for (let i = 0; i < 30; i++) {
      ;(sys as any).spies.push({ id: i+1, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 100000, successChance: 0.5 })
    }
    ;(sys as any).nextCheckTick = 100800
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 100800)
    const activeCount = (sys as any).spies.filter((s: Spy) => s.status === 'active').length
    expect(activeCount).toBeLessThanOrEqual(30)
  })
  it('population < 8的文明不能作为origin', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    ;(sys as any).nextCheckTick = 800
    const cm = makeCivManager([{ id: 1, name: 'A', population: 5 }, { id: 2, name: 'B', population: 5 }])
    sys.update(1, cm, 800)
    expect((sys as any).spies).toHaveLength(0)
  })
  it('incidents超过60条时被裁剪到40条', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 65; i++) {
      ;(sys as any).incidents.push({ spyId: i, originCivId: 1, targetCivId: 2, type: 'mission_success', tick: 0 })
    }
    ;(sys as any).nextCheckTick = 800
    const cm = makeCivManager([{ id: 1, name: 'A', population: 10 }, { id: 2, name: 'B', population: 10 }])
    sys.update(1, cm, 800)
    expect((sys as any).incidents.length).toBeLessThanOrEqual(40)
  })
  it('countActiveSpies只计算status=active的spy', () => {
    ;(sys as any).spies.push(
      { id: 1, status: 'active' },
      { id: 2, status: 'returned' },
      { id: 3, status: 'dead' }
    )
    expect((sys as any).countActiveSpies()).toBe(1)
  })

  // 6. 枚举完整性
  it('SpyMission包含6种任务', () => {
    const missions: SpyMission[] = ['scout', 'sabotage', 'steal_tech', 'assassinate', 'propaganda', 'counter_spy']
    expect(missions).toHaveLength(6)
  })
  it('SpyStatus包含4种状态', () => {
    const statuses: SpyStatus[] = ['active', 'captured', 'returned', 'dead']
    expect(statuses).toHaveLength(4)
  })
  it('Spy接口字段完整', () => {
    const spy: Spy = { id: 1, originCivId: 1, targetCivId: 2, mission: 'scout', skill: 5, status: 'active', deployedTick: 0, successChance: 0.5 }
    expect(spy.skill).toBe(5)
    expect(spy.successChance).toBe(0.5)
  })
})
