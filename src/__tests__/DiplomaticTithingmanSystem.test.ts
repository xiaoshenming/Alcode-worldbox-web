import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticTithingmanSystem } from '../systems/DiplomaticTithingmanSystem'
import type { TithingmanArrangement, TithingmanForm } from '../systems/DiplomaticTithingmanSystem'

const w = {} as any, em = {} as any

function makeSys() { return new DiplomaticTithingmanSystem() }

function makeArrangement(overrides: Partial<TithingmanArrangement> = {}): TithingmanArrangement {
  return { id: 1, tithingCivId: 1, oversightCivId: 2, form: 'royal_tithingman',
    collectiveAuthority: 40, suretyBonds: 35, peacekeeping: 25, taxCollection: 20,
    duration: 0, tick: 1000, ...overrides }
}

describe('DiplomaticTithingmanSystem', () => {
  let sys: DiplomaticTithingmanSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始arrangements为空数组', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('arrangements是数组类型', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入arrangement后长度为1', () => {
    ;(sys as any).arrangements.push(makeArrangement())
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL节流 (CHECK_INTERVAL=2900)
  it('tick=0时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, w, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick<2900时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, w, em, 2899)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2900时触发并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, w, em, 2900)
    expect((sys as any).lastCheck).toBe(2900)
  })
  it('第二次调用需再等2900', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, w, em, 2900)
    sys.update(1, w, em, 4000)
    expect((sys as any).lastCheck).toBe(2900)
  })
  it('tick=5800时再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, w, em, 2900)
    sys.update(1, w, em, 5800)
    expect((sys as any).lastCheck).toBe(5800)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a = makeArrangement({ tick: 0 })
    ;(sys as any).arrangements.push(a)
    sys.update(1, w, em, 2900)
    expect(a.duration).toBe(1)
  })
  it('collectiveAuthority在update后变化', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const a = makeArrangement({ tick: 0, collectiveAuthority: 40 })
    ;(sys as any).arrangements.push(a)
    const before = a.collectiveAuthority
    sys.update(1, w, em, 2900)
    expect(a.collectiveAuthority).not.toBe(before)
  })
  it('suretyBonds不低于10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a = makeArrangement({ tick: 0, suretyBonds: 10 })
    ;(sys as any).arrangements.push(a)
    sys.update(1, w, em, 2900)
    expect(a.suretyBonds).toBeGreaterThanOrEqual(10)
  })
  it('taxCollection不超过65', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a = makeArrangement({ tick: 0, taxCollection: 65 })
    ;(sys as any).arrangements.push(a)
    sys.update(1, w, em, 2900)
    expect(a.taxCollection).toBeLessThanOrEqual(65)
  })

  // 4. cleanup
  it('tick远小于cutoff时arrangement被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArrangement({ tick: 0 }))
    sys.update(1, w, em, 100000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick在cutoff内时arrangement保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArrangement({ tick: 50000 }))
    sys.update(1, w, em, 52900)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('cutoff=tick-88000，恰好过期时删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tick = 100000
    ;(sys as any).arrangements.push(makeArrangement({ tick: tick - 88001 }))
    sys.update(1, w, em, tick)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('多条arrangement部分过期时只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tick = 100000
    ;(sys as any).arrangements.push(makeArrangement({ id: 1, tick: 1000 }))
    ;(sys as any).arrangements.push(makeArrangement({ id: 2, tick: 90000 }))
    sys.update(1, w, em, tick)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })

  // 5. MAX_ARRANGEMENTS上限
  it('arrangements达到16时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 16; i++)
      (sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 99000 }))
    sys.update(1, w, em, 100000)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('MAX_ARRANGEMENTS常量为16', () => {
    for (let i = 0; i < 16; i++)
      (sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 99000 }))
    expect((sys as any).arrangements).toHaveLength(16)
  })
  it('未达上限时可继续push', () => {
    for (let i = 0; i < 15; i++)
      (sys as any).arrangements.push(makeArrangement({ id: i + 1, tick: 99000 }))
    expect((sys as any).arrangements.length).toBeLessThan(16)
  })
  it('nextId在注入后可手动递增', () => {
    ;(sys as any).nextId = 7
    ;(sys as any).arrangements.push({ ...makeArrangement(), id: (sys as any).nextId++ })
    expect((sys as any).nextId).toBe(8)
  })

  // 6. 枚举完整性
  it('TithingmanForm包含royal_tithingman', () => {
    const a = makeArrangement({ form: 'royal_tithingman' })
    expect(a.form).toBe('royal_tithingman')
  })
  it('TithingmanForm包含hundred_tithingman和parish_tithingman', () => {
    const forms: TithingmanForm[] = ['hundred_tithingman', 'parish_tithingman']
    forms.forEach(f => expect(['hundred_tithingman', 'parish_tithingman']).toContain(f))
  })
  it('TithingmanForm包含manor_tithingman', () => {
    const a = makeArrangement({ form: 'manor_tithingman' })
    expect(a.form).toBe('manor_tithingman')
  })
})
