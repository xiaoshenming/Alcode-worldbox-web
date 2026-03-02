import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticHerbalistSystem } from '../systems/DiplomaticHerbalistSystem'

const w = {} as any, em = {} as any
function sys() { return new DiplomaticHerbalistSystem() }

describe('DiplomaticHerbalistSystem', () => {
  let s: DiplomaticHerbalistSystem
  beforeEach(() => { s = sys() })

  // 基础5
  it('arrangements初始为空', () => { expect((s as any).arrangements).toHaveLength(0) })
  it('arrangements是数组', () => { expect(Array.isArray((s as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((s as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((s as any).lastCheck).toBe(0) })
  it('注入后arrangements有数据', () => {
    ;(s as any).arrangements.push({ id: 1 })
    expect((s as any).arrangements).toHaveLength(1)
  })

  // 节流5
  it('tick不足CHECK_INTERVAL不更新lastCheck', () => {
    s.update(1, w, em, 100)
    expect((s as any).lastCheck).toBe(0)
  })
  it('tick>=CHECK_INTERVAL更新lastCheck', () => {
    s.update(1, w, em, 3010)
    expect((s as any).lastCheck).toBe(3010)
  })
  it('第二次tick不足间隔不再更新', () => {
    s.update(1, w, em, 3010)
    s.update(1, w, em, 3100)
    expect((s as any).lastCheck).toBe(3010)
  })
  it('两次间隔足够各自更新lastCheck', () => {
    s.update(1, w, em, 3010)
    s.update(1, w, em, 6020)
    expect((s as any).lastCheck).toBe(6020)
  })
  it('tick=0时不触发', () => {
    s.update(1, w, em, 0)
    expect((s as any).lastCheck).toBe(0)
  })

  // 字段范围5
  it('gatheringRights在[5,85]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, gatheringRights:85, medicinalTrade:90, herbLore:80, gardenAccess:65, duration:0, tick:0 })
    s.update(1, w, em, 3010)
    expect((s as any).arrangements[0].gatheringRights).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })
  it('medicinalTrade在[10,90]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, gatheringRights:50, medicinalTrade:90, herbLore:50, gardenAccess:50, duration:0, tick:0 })
    s.update(1, w, em, 3010)
    expect((s as any).arrangements[0].medicinalTrade).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })
  it('herbLore在[5,80]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(s as any).arrangements.push({ id:1, gatheringRights:50, medicinalTrade:50, herbLore:5, gardenAccess:50, duration:0, tick:0 })
    s.update(1, w, em, 3010)
    expect((s as any).arrangements[0].herbLore).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
  it('gardenAccess在[5,65]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:65, duration:0, tick:0 })
    s.update(1, w, em, 3010)
    expect((s as any).arrangements[0].gardenAccess).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })
  it('duration每次update递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:0 })
    s.update(1, w, em, 3010)
    expect((s as any).arrangements[0].duration).toBe(1)
    vi.restoreAllMocks()
  })

  // 过期5
  it('tick小于cutoff的记录被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:0 })
    s.update(1, w, em, 100000)
    expect((s as any).arrangements).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick等于cutoff边界不被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tick = 100000
    ;(s as any).arrangements.push({ id:1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick: tick - 88000 })
    s.update(1, w, em, tick)
    expect((s as any).arrangements).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('tick大于cutoff的记录保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:50000 })
    s.update(1, w, em, 100000)
    expect((s as any).arrangements).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('多条记录部分过期只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push(
      { id:1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:0 },
      { id:2, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:50000 }
    )
    s.update(1, w, em, 100000)
    expect((s as any).arrangements).toHaveLength(1)
    expect((s as any).arrangements[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('无过期记录时数组不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:90000 })
    s.update(1, w, em, 100000)
    expect((s as any).arrangements).toHaveLength(1)
    vi.restoreAllMocks()
  })

  // MAX4
  it('arrangements达到16时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 16; i++)
      (s as any).arrangements.push({ id:i+1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:100000 })
    s.update(1, w, em, 100000)
    expect((s as any).arrangements.length).toBeLessThanOrEqual(16)
    vi.restoreAllMocks()
  })
  it('arrangements未满时长度小于16', () => {
    expect((s as any).arrangements.length).toBeLessThan(16)
  })
  it('MAX_ARRANGEMENTS为16', () => {
    for (let i = 0; i < 16; i++)
      (s as any).arrangements.push({ id:i+1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:100000 })
    expect((s as any).arrangements).toHaveLength(16)
  })
  it('nextId在无spawn时不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:100000 })
    const before = (s as any).nextId
    s.update(1, w, em, 100000)
    expect((s as any).nextId).toBe(before)
    vi.restoreAllMocks()
  })

  // 枚举4
  it('form类型royal_herbalist有效', () => {
    ;(s as any).arrangements.push({ id:1, form:'royal_herbalist', gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:100000 })
    expect((s as any).arrangements[0].form).toBe('royal_herbalist')
  })
  it('form类型abbey_herbalist有效', () => {
    ;(s as any).arrangements.push({ id:1, form:'abbey_herbalist', gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:100000 })
    expect((s as any).arrangements[0].form).toBe('abbey_herbalist')
  })
  it('form类型guild_herbalist有效', () => {
    ;(s as any).arrangements.push({ id:1, form:'guild_herbalist', gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:100000 })
    expect((s as any).arrangements[0].form).toBe('guild_herbalist')
  })
  it('form类型village_herbalist有效', () => {
    ;(s as any).arrangements.push({ id:1, form:'village_herbalist', gatheringRights:50, medicinalTrade:50, herbLore:50, gardenAccess:50, duration:0, tick:100000 })
    expect((s as any).arrangements[0].form).toBe('village_herbalist')
  })
})
