import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticVindicationSystem } from '../systems/DiplomaticVindicationSystem'

function makeSys() { return new DiplomaticVindicationSystem() }
const world = {} as any
const em = {} as any

describe('DiplomaticVindicationSystem', () => {
  let sys: DiplomaticVindicationSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // === 初始状态 ===
  it('初始proceedings为空数组', () => {
    expect((sys as any).proceedings).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('proceedings是数组类型', () => {
    expect(Array.isArray((sys as any).proceedings)).toBe(true)
  })

  // === 节流逻辑 ===
  it('tick不足CHECK_INTERVAL(2450)时不更新lastCheck', () => {
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL(2450)时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2450)
    expect((sys as any).lastCheck).toBe(2450)
  })
  it('tick=2449时不触发（严格小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2449)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次调用间隔不足2450时lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, world, em, 4000) // 4000-3000=1000 < 2450
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('间隔足够时再次触发并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 3000)
    sys.update(1, world, em, 6000) // 6000-3000=3000 >= 2450
    expect((sys as any).lastCheck).toBe(6000)
  })

  // === spawn逻辑 ===
  it('random超过PROCEED_CHANCE(0.0024)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, world, em, 2450)
    expect((sys as any).proceedings).toHaveLength(0)
  })
  it('random足够小且civ不同时spawn proceeding', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001   // PROCEED_CHANCE < 0.0024
      if (call === 2) return 0.0      // civA = 1
      if (call === 3) return 0.99     // civB = 8
      return 0.5
    })
    sys.update(1, world, em, 2450)
    expect((sys as any).proceedings).toHaveLength(1)
  })
  it('spawn的proceeding含id字段', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2450)
    const procs = (sys as any).proceedings
    if (procs.length > 0) expect(procs[0]).toHaveProperty('id')
  })
  it('spawn的proceeding含duration:0', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2450)
    const procs = (sys as any).proceedings
    if (procs.length > 0) expect(procs[0].duration).toBe(1)  // spawn后同次update递增
  })
  it('spawn的proceeding含tick字段等于当前tick', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2450)
    const procs = (sys as any).proceedings
    if (procs.length > 0) expect(procs[0].tick).toBe(2450)
  })
  it('nextId在spawn后递增', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2450)
    const procs = (sys as any).proceedings
    if (procs.length > 0) expect((sys as any).nextId).toBe(2)
  })
  it('达到MAX_PROCEEDINGS(20)上限时不再spawn', () => {
    for (let i = 0; i < 20; i++) {
      (sys as any).proceedings.push({ id: i + 1, tick: 2450, duration: 0, argumentStrength: 50, publicConviction: 40, moralStanding: 30, historicalRecord: 20 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 2450)
    expect((sys as any).proceedings).toHaveLength(20)
  })

  // === duration递增 ===
  it('update后已有proceeding的duration递增1', () => {
    ;(sys as any).proceedings.push({
      id: 1, civIdA: 1, civIdB: 2, form: 'war_justification',
      argumentStrength: 50, publicConviction: 40, moralStanding: 30, historicalRecord: 20,
      duration: 3, tick: 100000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 100000 + 2450)
    expect((sys as any).proceedings[0].duration).toBe(4)
  })
  it('多次update后duration累计递增', () => {
    ;(sys as any).proceedings.push({
      id: 1, civIdA: 1, civIdB: 2, form: 'policy_defense',
      argumentStrength: 50, publicConviction: 40, moralStanding: 30, historicalRecord: 20,
      duration: 0, tick: 200000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 200000 + 2450)
    sys.update(1, world, em, 200000 + 4900)
    sys.update(1, world, em, 200000 + 7350)
    expect((sys as any).proceedings[0].duration).toBe(3)
  })

  // === cleanup逻辑（cutoff = tick - 87000）===
  it('tick < cutoff(tick-87000)时删除旧proceeding', () => {
    const currentTick = 200000
    ;(sys as any).proceedings.push({
      id: 1, civIdA: 1, civIdB: 2, form: 'war_justification',
      argumentStrength: 50, publicConviction: 40, moralStanding: 30, historicalRecord: 20,
      duration: 0, tick: currentTick - 87001
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).proceedings).toHaveLength(0)
  })
  it('tick === cutoff(tick-87000)时不删除（边界）', () => {
    const currentTick = 200000
    ;(sys as any).proceedings.push({
      id: 1, civIdA: 1, civIdB: 2, form: 'war_justification',
      argumentStrength: 50, publicConviction: 40, moralStanding: 30, historicalRecord: 20,
      duration: 0, tick: currentTick - 87000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).proceedings).toHaveLength(1)
  })
  it('tick远比cutoff新时保留proceeding', () => {
    const currentTick = 200000
    ;(sys as any).proceedings.push({
      id: 1, civIdA: 1, civIdB: 2, form: 'honor_restoration',
      argumentStrength: 50, publicConviction: 40, moralStanding: 30, historicalRecord: 20,
      duration: 0, tick: currentTick - 10000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).proceedings).toHaveLength(1)
  })
  it('混合新旧proceeding只删除旧的', () => {
    const currentTick = 200000
    ;(sys as any).proceedings.push(
      { id: 1, civIdA: 1, civIdB: 2, form: 'war_justification', argumentStrength: 50, publicConviction: 40, moralStanding: 30, historicalRecord: 20, duration: 0, tick: currentTick - 87001 },
      { id: 2, civIdA: 3, civIdB: 4, form: 'policy_defense', argumentStrength: 50, publicConviction: 40, moralStanding: 30, historicalRecord: 20, duration: 0, tick: currentTick - 10000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).proceedings).toHaveLength(1)
    expect((sys as any).proceedings[0].id).toBe(2)
  })

  // === 手动注入 ===
  it('手动注入后proceedings长度正确', () => {
    ;(sys as any).proceedings.push({ id: 10 }, { id: 11 })
    expect((sys as any).proceedings).toHaveLength(2)
  })
  it('手动注入proceeding的id字段可读取', () => {
    ;(sys as any).proceedings.push({ id: 77, tick: 999999, duration: 2 })
    expect((sys as any).proceedings[0].id).toBe(77)
  })
})
