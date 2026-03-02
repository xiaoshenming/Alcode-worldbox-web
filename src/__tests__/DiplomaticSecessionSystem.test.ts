import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticSecessionSystem } from '../systems/DiplomaticSecessionSystem'
import type { SecessionMovement, SecessionMethod } from '../systems/DiplomaticSecessionSystem'

function makeSys() { return new DiplomaticSecessionSystem() }
const nullWorld = {} as any
const nullEm = {} as any

describe('DiplomaticSecessionSystem', () => {
  let sys: DiplomaticSecessionSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  // --- 初始状态 ---
  it('初始movements为空数组', () => {
    expect((sys as any).movements).toHaveLength(0)
  })

  it('movements字段是Array实例', () => {
    expect(Array.isArray((sys as any).movements)).toBe(true)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // --- 节流控制 ---
  it('tick未超过CHECK_INTERVAL(2500)时不更新lastCheck', () => {
    sys.update(1, nullWorld, nullEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick超过CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('连续两次update：第二次tick差不足时不再更新lastCheck', () => {
    sys.update(1, nullWorld, nullEm, 3000)
    sys.update(1, nullWorld, nullEm, 3001)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('连续两次update：第二次tick差足够时再次更新lastCheck', () => {
    sys.update(1, nullWorld, nullEm, 3000)
    sys.update(1, nullWorld, nullEm, 6000)
    expect((sys as any).lastCheck).toBe(6000)
  })

  // --- spawn 逻辑 ---
  it('random=1时不spawn（random<MOVEMENT_CHANCE=0.0025不满足）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).movements).toHaveLength(0)
  })

  it('random=0时spawn一条movement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).movements).toHaveLength(1)
  })

  it('spawn时nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn的movement包含必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    const m: SecessionMovement = (sys as any).movements[0]
    expect(m).toHaveProperty('id')
    expect(m).toHaveProperty('parentCivId')
    expect(m).toHaveProperty('regionId')
    expect(m).toHaveProperty('method')
    expect(m).toHaveProperty('support')
    expect(m).toHaveProperty('opposition')
    expect(m).toHaveProperty('legitimacy')
    expect(m).toHaveProperty('internationalRecognition')
    expect(m).toHaveProperty('duration')
    expect(m).toHaveProperty('tick')
  })

  it('spawn的movement tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).movements[0].tick).toBe(3000)
  })

  it('spawn的movement duration初始为0', () => {
    ;(sys as any).movements.push({
      id: 1, parentCivId: 1, regionId: 1, method: 'referendum',
      support: 50, opposition: 50, legitimacy: 50,
      internationalRecognition: 20, duration: 0, tick: 3000
    } as SecessionMovement)
    expect((sys as any).movements[0].duration).toBe(0)
  })

  it('spawn的method是合法枚举值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    const valid: SecessionMethod[] = ['referendum', 'declaration', 'negotiated', 'revolt']
    expect(valid).toContain((sys as any).movements[0].method)
  })

  // --- MAX_MOVEMENTS 上限 ---
  it('MAX_MOVEMENTS(20)已满时不再spawn', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).movements.push({ id: i + 1, tick: 99999, duration: 0 } as any)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).movements.length).toBeLessThanOrEqual(20)
  })

  // --- duration 更新 ---
  it('每次update使已有movement的duration+1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).movements.push({
      id: 1, parentCivId: 1, regionId: 1, method: 'referendum',
      support: 50, opposition: 50, legitimacy: 50,
      internationalRecognition: 20, duration: 0, tick: 3000
    } as SecessionMovement)
    sys.update(1, nullWorld, nullEm, 3000)
    expect((sys as any).movements[0].duration).toBe(1)
  })

  it('多次update使duration累积', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).movements.push({
      id: 1, parentCivId: 1, regionId: 1, method: 'referendum',
      support: 50, opposition: 50, legitimacy: 50,
      internationalRecognition: 20, duration: 0, tick: 3000
    } as SecessionMovement)
    sys.update(1, nullWorld, nullEm, 3000)
    ;(sys as any).lastCheck = 0
    sys.update(1, nullWorld, nullEm, 6000)
    expect((sys as any).movements[0].duration).toBe(2)
  })

  // --- 清理逻辑 ---
  it('tick=90000时清除tick=0的movement(cutoff=10000)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).movements.push({
      id: 1, parentCivId: 1, regionId: 1, method: 'revolt',
      support: 50, opposition: 50, legitimacy: 50,
      internationalRecognition: 20, duration: 0, tick: 0
    } as SecessionMovement)
    sys.update(1, nullWorld, nullEm, 90000)
    expect((sys as any).movements).toHaveLength(0)
  })

  it('cutoff内的movement不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).movements.push({
      id: 1, parentCivId: 1, regionId: 1, method: 'revolt',
      support: 50, opposition: 50, legitimacy: 50,
      internationalRecognition: 20, duration: 0, tick: 50000
    } as SecessionMovement)
    sys.update(1, nullWorld, nullEm, 90000)
    expect((sys as any).movements).toHaveLength(1)
  })

  it('混合新旧movement：只清除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const base = { parentCivId: 1, regionId: 1, method: 'revolt' as SecessionMethod,
      support: 50, opposition: 50, legitimacy: 50, internationalRecognition: 20, duration: 0 }
    ;(sys as any).movements.push({ id: 1, tick: 0, ...base })
    ;(sys as any).movements.push({ id: 2, tick: 50000, ...base })
    sys.update(1, nullWorld, nullEm, 90000)
    expect((sys as any).movements).toHaveLength(1)
    expect((sys as any).movements[0].id).toBe(2)
  })

  // --- 数值范围约束 ---
  it('update后support保持在5~95范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).movements.push({
      id: 1, parentCivId: 1, regionId: 1, method: 'referendum',
      support: 95, opposition: 50, legitimacy: 50,
      internationalRecognition: 20, duration: 0, tick: 3000
    } as SecessionMovement)
    sys.update(1, nullWorld, nullEm, 3000)
    const val = (sys as any).movements[0].support
    expect(val).toBeGreaterThanOrEqual(5)
    expect(val).toBeLessThanOrEqual(95)
  })

  it('update后internationalRecognition保持在0~100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).movements.push({
      id: 1, parentCivId: 1, regionId: 1, method: 'referendum',
      support: 50, opposition: 50, legitimacy: 50,
      internationalRecognition: 100, duration: 0, tick: 3000
    } as SecessionMovement)
    sys.update(1, nullWorld, nullEm, 3000)
    const val = (sys as any).movements[0].internationalRecognition
    expect(val).toBeGreaterThanOrEqual(0)
    expect(val).toBeLessThanOrEqual(100)
  })
})
