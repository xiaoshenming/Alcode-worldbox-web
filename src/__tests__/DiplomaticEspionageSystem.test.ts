import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticEspionageSystem } from '../systems/DiplomaticEspionageSystem'
import type { Spy, EspionageReport, SpyMission } from '../systems/DiplomaticEspionageSystem'

vi.mock('../systems/EventLog', () => ({ EventLog: { log: vi.fn() } }))

function makeEM(hasPosition = true) {
  return {
    getComponent: (_eid: number, comp: string) =>
      comp === 'position' ? (hasPosition ? { x: 10, y: 10 } : null) : null,
    getEntitiesWithComponents: () => [] as number[],
  } as any
}

function makeSpy(overrides: Partial<Spy> = {}): Spy {
  return {
    id: 1, entityId: 1, originCivId: 1, targetCivId: 2,
    mission: 'intel', x: 10, y: 10, skill: 5, cover: 80,
    progress: 0, discovered: false, startTick: 0, statusStr: '',
    ...overrides,
  } as Spy
}

const mockCivs = [
  { id: 1, name: 'CivA', villages: [{ x: 0, y: 0 }] },
  { id: 2, name: 'CivB', villages: [{ x: 10, y: 10 }] },
]

describe('DiplomaticEspionageSystem — 基础数据结构', () => {
  it('新系统 spies 初始为空数组', () => {
    const sys = new DiplomaticEspionageSystem()
    expect((sys as any).spies).toEqual([])
  })

  it('新系统 reports 初始为空数组', () => {
    const sys = new DiplomaticEspionageSystem()
    expect((sys as any).reports).toEqual([])
  })

  it('可以向 spies 直接注入并读取', () => {
    const sys = new DiplomaticEspionageSystem()
    const spy = makeSpy({ originCivId: 3, targetCivId: 4 })
    ;(sys as any).spies.push(spy)
    expect((sys as any).spies[0].originCivId).toBe(3)
    expect((sys as any).spies[0].targetCivId).toBe(4)
  })

  it('nextCheckTick 初始值为 CHECK_INTERVAL=1000', () => {
    const sys = new DiplomaticEspionageSystem()
    expect((sys as any).nextCheckTick).toBe(1000)
  })

  it('4 种 SpyMission 均可存储', () => {
    const missions: SpyMission[] = ['intel', 'sabotage', 'steal_tech', 'assassinate']
    for (const m of missions) {
      const spy = makeSpy({ mission: m })
      expect(spy.mission).toBe(m)
    }
  })
})

describe('DiplomaticEspionageSystem — 间谍清理', () => {
  it('em 返回 null position 时间谍被删除', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).spies.push(makeSpy({ entityId: 1 }))
    sys.update(1, makeEM(false), mockCivs, 0)
    expect((sys as any).spies.length).toBe(0)
  })

  it('em 返回有效 position 时间谍保留', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).spies.push(makeSpy({ entityId: 1 }))
    sys.update(1, makeEM(true), mockCivs, 0)
    expect((sys as any).spies.length).toBe(1)
  })

  it('多间谍时只删除无 position 的', () => {
    const sys = new DiplomaticEspionageSystem()
    const em = {
      getComponent: (_eid: number, comp: string) => {
        if (comp !== 'position') return null
        return _eid === 1 ? null : { x: 0, y: 0 }
      },
      getEntitiesWithComponents: () => [] as number[],
    } as any
    ;(sys as any).spies.push(makeSpy({ entityId: 1 }), makeSpy({ id: 2, entityId: 2 }))
    sys.update(1, em, mockCivs, 0)
    expect((sys as any).spies.length).toBe(1)
    expect((sys as any).spies[0].entityId).toBe(2)
  })

  it('discovered 且 tick-startTick>5000 时间谍被删除', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).spies.push(makeSpy({ entityId: 1, discovered: true, startTick: 0 }))
    sys.update(1, makeEM(true), mockCivs, 5001)
    expect((sys as any).spies.length).toBe(0)
  })
})

describe('DiplomaticEspionageSystem — 间谍进度推进', () => {
  it('tick >= nextMissionTick 时 progress 增加', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).spies.push(makeSpy({ entityId: 1, skill: 0, progress: 0 }))
    ;(sys as any).nextMissionTick = 0
    sys.update(1, makeEM(true), mockCivs, 0)
    // progress += 5 + floor(0/3) = 5
    expect((sys as any).spies[0]?.progress).toBeGreaterThanOrEqual(5)
  })

  it('tick < nextMissionTick 时 progress 不增加', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).spies.push(makeSpy({ entityId: 1, skill: 0, progress: 0 }))
    ;(sys as any).nextMissionTick = 9999
    sys.update(1, makeEM(true), mockCivs, 0)
    expect((sys as any).spies[0]?.progress).toBe(0)
  })

  it('progress >= 100 时重置为 0（completeMission）', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).spies.push(makeSpy({ entityId: 1, skill: 0, progress: 96 }))
    ;(sys as any).nextMissionTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeEM(true), mockCivs, 0)
    // progress=96+5=101>=100 → completeMission → progress=0
    expect((sys as any).spies[0]?.progress).toBe(0)
    vi.restoreAllMocks()
  })

  it('completeMission 后 cover -= 10', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).spies.push(makeSpy({ entityId: 1, skill: 0, progress: 96, cover: 80 }))
    ;(sys as any).nextMissionTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeEM(true), mockCivs, 0)
    expect((sys as any).spies[0]?.cover).toBe(70)
    vi.restoreAllMocks()
  })
})

describe('DiplomaticEspionageSystem — 间谍检测与 reports', () => {
  it('discovered=true 的间谍不再被检测（不会二次标记）', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).spies.push(makeSpy({ entityId: 1, discovered: true, cover: 0 }))
    ;(sys as any).nextDetectTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0) // 极高检测概率
    sys.update(1, makeEM(true), mockCivs, 0)
    // 已经是 discovered，不应再次触发 EventLog
    expect((sys as any).spies[0]?.discovered).toBe(true)
    vi.restoreAllMocks()
  })

  it('completeMission 后 reports 中新增一条记录', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).spies.push(makeSpy({ entityId: 1, skill: 0, progress: 96 }))
    ;(sys as any).nextMissionTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeEM(true), mockCivs, 0)
    expect((sys as any).reports.length).toBe(1)
    vi.restoreAllMocks()
  })

  it('reports 超过 50 条时截断到 30 条', () => {
    const sys = new DiplomaticEspionageSystem()
    for (let i = 0; i < 51; i++) {
      ;(sys as any).reports.push({ spyId: i, mission: 'intel', success: true, detail: '', tick: 0 })
    }
    sys.update(1, makeEM(false), [], 0)
    expect((sys as any).reports.length).toBe(30)
  })

  it('reports 未超过 50 条时不截断', () => {
    const sys = new DiplomaticEspionageSystem()
    for (let i = 0; i < 30; i++) {
      ;(sys as any).reports.push({ spyId: i, mission: 'intel', success: true, detail: '', tick: 0 })
    }
    sys.update(1, makeEM(false), [], 0)
    expect((sys as any).reports.length).toBe(30)
  })
})

describe('DiplomaticEspionageSystem — MAX_SPIES=15 上限', () => {
  it('spies.length >= 15 时不部署新间谍', () => {
    const sys = new DiplomaticEspionageSystem()
    for (let i = 0; i < 15; i++) {
      ;(sys as any).spies.push(makeSpy({ id: i, entityId: i }))
    }
    ;(sys as any).nextCheckTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // < 0.25
    sys.update(1, makeEM(true), mockCivs, 0)
    expect((sys as any).spies.length).toBe(15)
    vi.restoreAllMocks()
  })

  it('civs 为空时不部署间谍', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).nextCheckTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.update(1, makeEM(true), [], 0)
    expect((sys as any).spies.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('civs 只有 1 个时不部署间谍（需要 >= 2）', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).nextCheckTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.update(1, makeEM(true), [{ id: 1, name: 'A' }], 0)
    expect((sys as any).spies.length).toBe(0)
    vi.restoreAllMocks()
  })

  it('random >= 0.25 时不部署间谍', () => {
    const sys = new DiplomaticEspionageSystem()
    ;(sys as any).nextCheckTick = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // >= 0.25
    sys.update(1, makeEM(true), mockCivs, 0)
    expect((sys as any).spies.length).toBe(0)
    vi.restoreAllMocks()
  })
})

describe('DiplomaticEspionageSystem — SpyMission 枚举完整性', () => {
  const missions: SpyMission[] = ['intel', 'sabotage', 'steal_tech', 'assassinate']

  it("mission='intel' 可存储", () => { expect(makeSpy({ mission: 'intel' }).mission).toBe('intel') })
  it("mission='sabotage' 可存储", () => { expect(makeSpy({ mission: 'sabotage' }).mission).toBe('sabotage') })
  it("mission='steal_tech' 可存储", () => { expect(makeSpy({ mission: 'steal_tech' }).mission).toBe('steal_tech') })
  it("mission='assassinate' 可存储", () => { expect(makeSpy({ mission: 'assassinate' }).mission).toBe('assassinate') })

  it('所有 4 种 mission 均是有效的 SpyMission 类型', () => {
    for (const m of missions) {
      expect(missions).toContain(makeSpy({ mission: m }).mission)
    }
  })
})
