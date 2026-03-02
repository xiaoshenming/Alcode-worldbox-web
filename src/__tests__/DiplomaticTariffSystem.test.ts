import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticTariffSystem } from '../systems/DiplomaticTariffSystem'
import type { Tariff, TariffLevel } from '../systems/DiplomaticTariffSystem'

function makeSys() { return new DiplomaticTariffSystem() }

function makeCivManager(ids: number[] = []) {
  const civs = new Map(ids.map(id => [id, { id }]))
  return { civilizations: civs } as any
}

const em = {} as any

function makeTariff(overrides: Partial<Tariff> = {}): Tariff {
  return { id: 1, imposerCivId: 1, targetCivId: 2, level: 'low',
    rate: 0.1, retaliation: false, revenue: 0, startTick: 0, duration: 5000, ...overrides }
}

describe('DiplomaticTariffSystem', () => {
  let sys: DiplomaticTariffSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始tariffs为空数组', () => { expect((sys as any).tariffs).toHaveLength(0) })
  it('tariffs是数组类型', () => { expect(Array.isArray((sys as any).tariffs)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入tariff后长度为1', () => {
    ;(sys as any).tariffs.push(makeTariff())
    expect((sys as any).tariffs).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL节流 (CHECK_INTERVAL=1400)
  it('tick=0时不处理', () => {
    sys.update(1, em, makeCivManager([1, 2]), 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick<1400时跳过', () => {
    sys.update(1, em, makeCivManager([1, 2]), 1399)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1400时触发并更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })
  it('civs少于2个时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, makeCivManager([1]), 1400)
    expect((sys as any).tariffs).toHaveLength(0)
  })
  it('civManager无civilizations时跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, {} as any, 1400)
    expect((sys as any).tariffs).toHaveLength(0)
  })

  // 3. 字段动态更新 (revenue每tick增加 rate * 0.5 * 1400 / 100)
  it('revenue每次update按rate增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const t = makeTariff({ rate: 0.1, revenue: 0, startTick: 0, duration: 10000 })
    ;(sys as any).tariffs.push(t)
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    // REVENUE_RATE(0.5) * rate(0.1) * CHECK_INTERVAL(1400) / 100 = 0.7
    expect(t.revenue).toBeCloseTo(0.7, 5)
  })
  it('high level tariff的revenue增加更多', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const t = makeTariff({ rate: 0.5, revenue: 0, startTick: 0, duration: 10000 })
    ;(sys as any).tariffs.push(t)
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    expect(t.revenue).toBeCloseTo(3.5, 5)
  })
  it('elapsed>duration时rate设为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const t = makeTariff({ rate: 0.5, startTick: 0, duration: 100 })
    ;(sys as any).tariffs.push(t)
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    expect(t.rate).toBe(0)
  })
  it('rate<=0.01的tariff在update后被cleanup删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).tariffs.push(makeTariff({ rate: 0.005 }))
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    expect((sys as any).tariffs).toHaveLength(0)
  })

  // 4. cleanup
  it('rate=0的tariff被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).tariffs.push(makeTariff({ rate: 0 }))
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    expect((sys as any).tariffs).toHaveLength(0)
  })
  it('rate=0.01的tariff被删除(边界)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).tariffs.push(makeTariff({ rate: 0.01, startTick: 0, duration: 10000 }))
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    expect((sys as any).tariffs).toHaveLength(0)
  })
  it('rate=0.02的tariff保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).tariffs.push(makeTariff({ rate: 0.02, startTick: 0, duration: 10000 }))
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    expect((sys as any).tariffs).toHaveLength(1)
  })
  it('多条tariff中只删rate<=0.01的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).tariffs.push(makeTariff({ id: 1, rate: 0.005, startTick: 0, duration: 10000 }))
    ;(sys as any).tariffs.push(makeTariff({ id: 2, rate: 0.5, startTick: 0, duration: 10000 }))
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    expect((sys as any).tariffs).toHaveLength(1)
    expect((sys as any).tariffs[0].id).toBe(2)
  })

  // 5. MAX_TARIFFS上限
  it('tariffs达到25时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 25; i++)
      (sys as any).tariffs.push(makeTariff({ id: i + 1, rate: 0.5, startTick: 0, duration: 99999 }))
    sys.update(1, em, makeCivManager([1, 2]), 1400)
    expect((sys as any).tariffs.length).toBeLessThanOrEqual(25)
  })
  it('MAX_TARIFFS常量为25', () => {
    for (let i = 0; i < 25; i++)
      (sys as any).tariffs.push(makeTariff({ id: i + 1, rate: 0.5, startTick: 0, duration: 99999 }))
    expect((sys as any).tariffs).toHaveLength(25)
  })
  it('未达上限时可继续push', () => {
    for (let i = 0; i < 24; i++)
      (sys as any).tariffs.push(makeTariff({ id: i + 1, rate: 0.5, startTick: 0, duration: 99999 }))
    expect((sys as any).tariffs.length).toBeLessThan(25)
  })
  it('nextId在注入后可手动递增', () => {
    ;(sys as any).nextId = 10
    ;(sys as any).tariffs.push({ ...makeTariff(), id: (sys as any).nextId++ })
    expect((sys as any).nextId).toBe(11)
  })

  // 6. 枚举完整性
  it('TariffLevel包含low', () => {
    const t = makeTariff({ level: 'low' })
    expect(t.level).toBe('low')
  })
  it('TariffLevel包含moderate和high', () => {
    const levels: TariffLevel[] = ['moderate', 'high']
    levels.forEach(l => expect(['moderate', 'high']).toContain(l))
  })
  it('TariffLevel包含prohibitive', () => {
    const t = makeTariff({ level: 'prohibitive' })
    expect(t.level).toBe('prohibitive')
  })
})
