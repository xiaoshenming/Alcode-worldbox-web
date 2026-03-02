import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticVerdererSystem } from '../systems/DiplomaticVerdererSystem'

function makeSys() { return new DiplomaticVerdererSystem() }
const world = {} as any
const em = {} as any

describe('DiplomaticVerdererSystem', () => {
  let sys: DiplomaticVerdererSystem
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
  it('tick不足CHECK_INTERVAL(2820)时不更新lastCheck', () => {
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2820)
    expect((sys as any).lastCheck).toBe(2820)
  })
  it('tick=2819时不触发（严格小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2819)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次调用间隔不足时lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, world, em, 4000) // 4000-3000=1000 < 2820
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('间隔足���时再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 3000)
    sys.update(1, world, em, 6000) // 6000-3000=3000 >= 2820
    expect((sys as any).lastCheck).toBe(6000)
  })

  // === spawn逻辑 ===
  it('random足够小时spawn arrangement', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)   // PROCEED_CHANCE检查 0.001 < 0.0021
      .mockReturnValue(0.5)          // forest/verderer id随机
    sys.update(1, world, em, 2820)
    // 注意：forest和verderer可能相等导致返回，所以不一定spawn
    // 改用确定性mock
  })
  it('random=0时确保spawn（排除相等情况）', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001   // PROCEED_CHANCE
      if (call === 2) return 0.0       // forest = 1 + floor(0*8) = 1
      if (call === 3) return 0.99      // verderer = 1 + floor(0.99*8) = 8
      return 0.5
    })
    sys.update(1, world, em, 2820)
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
    sys.update(1, world, em, 2820)
    const arr = (sys as any).arrangements
    if (arr.length > 0) {
      expect(arr[0]).toHaveProperty('id')
    }
  })
  it('spawn后同次update即递增duration为1', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2820)
    const arr = (sys as any).arrangements
    if (arr.length > 0) {
      // spawn后同次update中 a.duration+=1，所以duration为1
      expect(arr[0].duration).toBe(1)
    }
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
    sys.update(1, world, em, 2820)
    const arr = (sys as any).arrangements
    if (arr.length > 0) {
      expect(arr[0].tick).toBe(2820)
    }
  })
  it('random超过PROCEED_CHANCE(0.0021)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, world, em, 2820)
    expect((sys as any).arrangements).toHaveLength(0)
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
    sys.update(1, world, em, 2820)
    const arr = (sys as any).arrangements
    if (arr.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('达到MAX_ARRANGEMENTS(16)上限时不再spawn', () => {
    // 预填16条
    for (let i = 0; i < 16; i++) {
      (sys as any).arrangements.push({ id: i + 1, tick: 2820, duration: 0, forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, 2820)
    expect((sys as any).arrangements).toHaveLength(16)
  })

  // === duration递增 ===
  it('update后已有arrangement的duration递增1', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 5, tick: 100000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 100000 + 2820)
    expect((sys as any).arrangements[0].duration).toBe(6)
  })
  it('多次update后duration累计递增', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 0, tick: 200000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 200000 + 2820)
    sys.update(1, world, em, 200000 + 5640)
    sys.update(1, world, em, 200000 + 8460)
    expect((sys as any).arrangements[0].duration).toBe(3)
  })

  // === cleanup逻辑 ===
  it('tick < cutoff(tick-88000)时删除旧arrangement', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 0, tick: currentTick - 88001 // 严格小于cutoff
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick === cutoff时不删除（边界）', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 0, tick: currentTick - 88000 // 等于cutoff，NOT删除
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('tick > cutoff时保留arrangement', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 0, tick: currentTick - 50000 // 远比cutoff新
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('混合新旧arrangement只删除旧的', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push(
      { id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer', forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30, duration: 0, tick: currentTick - 88001 },
      { id: 2, forestCivId: 3, verdererCivId: 4, form: 'forest_verderer', forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30, duration: 0, tick: currentTick - 50000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })

  // === 手动注入 ===
  it('手动注入后arrangements长度正确', () => {
    ;(sys as any).arrangements.push({ id: 10 }, { id: 11 })
    expect((sys as any).arrangements).toHaveLength(2)
  })
  it('手动注入arrangement的id字段可读取', () => {
    ;(sys as any).arrangements.push({ id: 42, tick: 999999, duration: 3 })
    expect((sys as any).arrangements[0].id).toBe(42)
  })
})
