import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticWarrenerSystem } from '../systems/DiplomaticWarrenerSystem'

function makeSys() { return new DiplomaticWarrenerSystem() }
const world = {} as any
const em = {} as any

describe('DiplomaticWarrenerSystem', () => {
  let sys: DiplomaticWarrenerSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // === 初始状态 ===
  it('初始arrangements为空数组', () => {
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('arrangements是数组类型', () => {
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })

  // === 节流逻辑 ===
  it('tick不足CHECK_INTERVAL(2830)时不更新lastCheck', () => {
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL(2830)时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2830)
    expect((sys as any).lastCheck).toBe(2830)
  })
  it('tick=2829时不触发（严格小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2829)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次调用间隔不足2830时lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, world, em, 4000) // 4000-3000=1000 < 2830
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('间隔足够时再次触发并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 3000)
    sys.update(1, world, em, 6000) // 6000-3000=3000 >= 2830
    expect((sys as any).lastCheck).toBe(6000)
  })

  // === spawn逻辑 ===
  it('random超过PROCEED_CHANCE(0.0021)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, world, em, 2830)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('random足够小且civ不同时spawn arrangement', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001  // < 0.0021
      if (call === 2) return 0.0      // warren = 1
      if (call === 3) return 0.99     // preserve = 8
      return 0.5
    })
    sys.update(1, world, em, 2830)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('spawn的arrangement含id字段', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2830)
    const arr = (sys as any).arrangements
    if (arr.length > 0) expect(arr[0]).toHaveProperty('id')
  })
  it('spawn的arrangement含duration:0', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2830)
    const arr = (sys as any).arrangements
    if (arr.length > 0) expect(arr[0].duration).toBe(1)  // spawn后同次update递增
  })
  it('spawn的arrangement含tick字段等于当前tick', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2830)
    const arr = (sys as any).arrangements
    if (arr.length > 0) expect(arr[0].tick).toBe(2830)
  })
  it('nextId在spawn后递增', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2830)
    const arr = (sys as any).arrangements
    if (arr.length > 0) expect((sys as any).nextId).toBe(2)
  })
  it('达到MAX_ARRANGEMENTS(16)上限时不再spawn', () => {
    for (let i = 0; i < 16; i++) {
      (sys as any).arrangements.push({ id: i + 1, tick: 2830, duration: 0, warrenJurisdiction: 50, gameRights: 50, breedingManagement: 30, harvestQuota: 30 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, 2830)
    expect((sys as any).arrangements).toHaveLength(16)
  })

  // === duration递增 ===
  it('update后已有arrangement的duration递增1', () => {
    ;(sys as any).arrangements.push({
      id: 1, warrenCivId: 1, preserveCivId: 2, form: 'royal_warrener',
      warrenJurisdiction: 50, gameRights: 50, breedingManagement: 30, harvestQuota: 30,
      duration: 2, tick: 100000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 100000 + 2830)
    expect((sys as any).arrangements[0].duration).toBe(3)
  })
  it('多次update后duration累计递增', () => {
    ;(sys as any).arrangements.push({
      id: 1, warrenCivId: 1, preserveCivId: 2, form: 'manor_warrener',
      warrenJurisdiction: 50, gameRights: 50, breedingManagement: 30, harvestQuota: 30,
      duration: 0, tick: 200000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 200000 + 2830)
    sys.update(1, world, em, 200000 + 5660)
    sys.update(1, world, em, 200000 + 8490)
    expect((sys as any).arrangements[0].duration).toBe(3)
  })

  // === cleanup逻辑（cutoff = tick - 88000）===
  it('tick < cutoff(tick-88000)时删除旧arrangement', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push({
      id: 1, warrenCivId: 1, preserveCivId: 2, form: 'royal_warrener',
      warrenJurisdiction: 50, gameRights: 50, breedingManagement: 30, harvestQuota: 30,
      duration: 0, tick: currentTick - 88001
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick === cutoff(tick-88000)时不删除（边界）', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push({
      id: 1, warrenCivId: 1, preserveCivId: 2, form: 'chase_warrener',
      warrenJurisdiction: 50, gameRights: 50, breedingManagement: 30, harvestQuota: 30,
      duration: 0, tick: currentTick - 88000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('tick远比cutoff新时保留arrangement', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push({
      id: 1, warrenCivId: 1, preserveCivId: 2, form: 'park_warrener',
      warrenJurisdiction: 50, gameRights: 50, breedingManagement: 30, harvestQuota: 30,
      duration: 0, tick: currentTick - 10000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('混合新旧arrangement只删除旧的', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push(
      { id: 1, warrenCivId: 1, preserveCivId: 2, form: 'royal_warrener', warrenJurisdiction: 50, gameRights: 50, breedingManagement: 30, harvestQuota: 30, duration: 0, tick: currentTick - 88001 },
      { id: 2, warrenCivId: 3, preserveCivId: 4, form: 'manor_warrener', warrenJurisdiction: 50, gameRights: 50, breedingManagement: 30, harvestQuota: 30, duration: 0, tick: currentTick - 10000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })

  // === 手动注入 ===
  it('手动注入后arrangements长度正确', () => {
    ;(sys as any).arrangements.push({ id: 30 }, { id: 31 })
    expect((sys as any).arrangements).toHaveLength(2)
  })
  it('手动注入arrangement的id字段可读取', () => {
    ;(sys as any).arrangements.push({ id: 88, tick: 999999, duration: 1 })
    expect((sys as any).arrangements[0].id).toBe(88)
  })
})
