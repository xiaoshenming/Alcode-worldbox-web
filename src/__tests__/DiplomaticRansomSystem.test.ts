import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticRansomSystem } from '../systems/DiplomaticRansomSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticRansomSystem() }
function makeCivManager(ids: number[] = []) {
  const civs = new Map(ids.map(id => [id, { id }]))
  return { civilizations: civs } as any
}

describe('DiplomaticRansomSystem', () => {
  let sys: DiplomaticRansomSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 初始状态
  it('初始negotiations为空', () => { expect((sys as any).negotiations).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('negotiations是数组', () => { expect(Array.isArray((sys as any).negotiations)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL(3600)时不更新lastCheck', () => {
    sys.update(1, W, EM, 100, makeCivManager([1,2]))
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 3600, makeCivManager([1,2]))
    expect((sys as any).lastCheck).toBe(3600)
  })

  // civManager缺失/为空时不spawn
  it('civManager为undefined时直接返回', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 3600, undefined)
    expect((sys as any).lastCheck).toBe(3600) // lastCheck已更新
    expect((sys as any).negotiations).toHaveLength(0)
  })
  it('civManager只有1个civ时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, W, EM, 3600, makeCivManager([1]))
    expect((sys as any).negotiations).toHaveLength(0)
  })
  it('civManager为空时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, W, EM, 3600, makeCivManager([]))
    expect((sys as any).negotiations).toHaveLength(0)
  })

  // spawn条件
  it('random>SPAWN_CHANCE(0.002)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, W, EM, 3600, makeCivManager([1,2]))
    expect((sys as any).negotiations).toHaveLength(0)
  })

  // 手动注入negotiation后处理
  it('demanding状态random<0.1时变negotiating', () => {
    const n = { id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:0, rounds:0, status:'demanding', tick:0 }
    ;(sys as any).negotiations.push(n)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(1, W, EM, 3600, makeCivManager([1,2]))
    expect(n.status).toBe('negotiating')
    expect(n.rounds).toBe(1)
    expect(n.offeredAmount).toBeGreaterThan(0)
  })
  it('demanding状态random>=0.1时保持demanding', () => {
    const n = { id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:0, rounds:0, status:'demanding', tick:0 }
    ;(sys as any).negotiations.push(n)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 3600, makeCivManager([1,2]))
    expect(n.status).toBe('demanding')
  })
  it('paid状态跳过不更新rounds', () => {
    const n = { id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:100, rounds:3, status:'paid', tick:0 }
    ;(sys as any).negotiations.push(n)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(1, W, EM, 3600, makeCivManager([1,2]))
    expect(n.rounds).toBe(3) // 不变
  })
  it('refused��态跳过不更新rounds', () => {
    const n = { id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:0, rounds:10, status:'refused', tick:0 }
    ;(sys as any).negotiations.push(n)
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(1, W, EM, 3600, makeCivManager([1,2]))
    expect(n.rounds).toBe(10)
  })
  it('negotiating时demandedAmount降低', () => {
    const n = { id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:30, rounds:1, status:'negotiating', tick:0 }
    ;(sys as any).negotiations.push(n)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, W, EM, 3600, makeCivManager([1,2]))
    expect(n.demandedAmount).toBeLessThan(100)
  })
  it('negotiating时offeredAmount增加', () => {
    const n = { id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:30, rounds:1, status:'negotiating', tick:0 }
    ;(sys as any).negotiations.push(n)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, W, EM, 3600, makeCivManager([1,2]))
    expect(n.offeredAmount).toBeGreaterThanOrEqual(30)
  })

  // cleanup（状态driven: paid/refused && tick-n.tick > 5000）
  it('paid且tick差>5000时被删除', () => {
    ;(sys as any).negotiations.push({ id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:100, rounds:3, status:'paid', tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 6000, makeCivManager([1,2]))
    expect((sys as any).negotiations).toHaveLength(0)
  })
  it('refused且tick差>5000时被删除', () => {
    ;(sys as any).negotiations.push({ id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:0, rounds:10, status:'refused', tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 6000, makeCivManager([1,2]))
    expect((sys as any).negotiations).toHaveLength(0)
  })
  it('paid但tick差<=5000时保留', () => {
    ;(sys as any).negotiations.push({ id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:100, rounds:3, status:'paid', tick:4000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 7600, makeCivManager([1,2]))
    expect((sys as any).negotiations).toHaveLength(1)
  })
  it('demanding状态不被cleanup删除', () => {
    ;(sys as any).negotiations.push({ id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:0, rounds:0, status:'demanding', tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 6000, makeCivManager([1,2]))
    expect((sys as any).negotiations).toHaveLength(1)
  })

  // MAX_NEGOTIATIONS上限
  it('negotiations达到MAX_NEGOTIATIONS(8)不再spawn', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).negotiations.push({ id:i+1, captor:1, captive:2, prisoner:i, demandedAmount:100, offeredAmount:0, rounds:0, status:'demanding', tick:100000 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, W, EM, 105000, makeCivManager([1,2]))
    expect((sys as any).negotiations.length).toBeLessThanOrEqual(8)
  })

  // 多条cleanup
  it('多条negotiations中只删除符合条件的', () => {
    ;(sys as any).negotiations.push(
      { id:1, captor:1, captive:2, prisoner:100, demandedAmount:100, offeredAmount:100, rounds:3, status:'paid', tick:0 },
      { id:2, captor:2, captive:3, prisoner:200, demandedAmount:100, offeredAmount:0, rounds:0, status:'demanding', tick:0 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 6000, makeCivManager([1,2]))
    expect((sys as any).negotiations).toHaveLength(1)
    expect((sys as any).negotiations[0].id).toBe(2)
  })
})
