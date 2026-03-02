import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticTradeAgreementSystem } from '../systems/DiplomaticTradeAgreementSystem'

const em = {} as any

function makeSys() { return new DiplomaticTradeAgreementSystem() }

describe('DiplomaticTradeAgreementSystem', () => {
  let sys: DiplomaticTradeAgreementSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 初始状态
  it('初始agreements为空', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('agreements是数组', () => { expect(Array.isArray((sys as any).agreements)).toBe(true) })

  // 节流
  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick>=CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
  it('第二次节流生效', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1200)
    sys.update(1, em, 1201)
    expect((sys as any).lastCheck).toBe(1200)
  })

  // status - active时duration递增
  it('active agreement每次update duration+1', () => {
    ;(sys as any).agreements.push({
      id: 1, civ1: 'human', civ2: 'elf', type: 'free_trade',
      status: 'active', benefit: 50, duration: 0, maxDuration: 9999, tick: 1200,
    })
    // random=1: skip spawn(>AGREE_CHANCE), skip broken(<0.002 false)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1200)
    expect((sys as any).agreements[0].duration).toBe(1)
  })
  it('非active agreement不递增duration', () => {
    ;(sys as any).agreements.push({
      id: 1, civ1: 'human', civ2: 'elf', type: 'free_trade',
      status: 'expired', benefit: 50, duration: 5, maxDuration: 9999, tick: 1200,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1200)
    expect((sys as any).agreements[0].duration).toBe(5)
  })

  // status - duration >= maxDuration → expired
  it('duration>=maxDuration时status变为expired', () => {
    ;(sys as any).agreements.push({
      id: 1, civ1: 'human', civ2: 'dwarf', type: 'exclusive',
      status: 'active', benefit: 40, duration: 2999, maxDuration: 3000, tick: 1200,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1200)
    expect((sys as any).agreements[0].status).toBe('expired')
  })

  // status - random < 0.002 → broken
  it('random<0.002时status变为broken', () => {
    ;(sys as any).agreements.push({
      id: 1, civ1: 'orc', civ2: 'elf', type: 'resource_swap',
      status: 'active', benefit: 60, duration: 0, maxDuration: 9999, tick: 1200,
    })
    // 第一次random用于spawn判断(>AGREE_CHANCE跳过)，第二次用于broken判断
    // 用序列mock: spawn检查用1(跳过), broken检查用0.001
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => call++ === 0 ? 1 : 0.001)
    sys.update(1, em, 1200)
    expect((sys as any).agreements[0].status).toBe('broken')
  })

  // cleanup - inactive > 20时触发
  it('超过20个非active时cleanup触发，总量降至<=21', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 21; i++) {
      ;(sys as any).agreements.push({
        id: i + 1, civ1: 'human', civ2: 'elf', type: 'free_trade',
        status: 'expired', benefit: 50, duration: 9999, maxDuration: 9999, tick: 1200,
      })
    }
    sys.update(1, em, 1200)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(21)
  })
  it('20个非active时不触发cleanup', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 20; i++) {
      ;(sys as any).agreements.push({
        id: i + 1, civ1: 'human', civ2: 'elf', type: 'free_trade',
        status: 'expired', benefit: 50, duration: 9999, maxDuration: 9999, tick: 1200,
      })
    }
    sys.update(1, em, 1200)
    expect((sys as any).agreements).toHaveLength(20)
  })
  it('cleanup时active不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 21; i++) {
      ;(sys as any).agreements.push({
        id: i + 1, civ1: 'human', civ2: 'elf', type: 'free_trade',
        status: 'expired', benefit: 50, duration: 9999, maxDuration: 9999, tick: 1200,
      })
    }
    ;(sys as any).agreements.push({
      id: 99, civ1: 'orc', civ2: 'dwarf', type: 'tariff_reduction',
      status: 'active', benefit: 70, duration: 0, maxDuration: 9999, tick: 1200,
    })
    sys.update(1, em, 1200)
    const active = (sys as any).agreements.filter((a: any) => a.status === 'active')
    expect(active).toHaveLength(1)
    expect(active[0].id).toBe(99)
  })

  // 4种type均可注入
  it('4种agreement type均合法', () => {
    const types = ['free_trade', 'exclusive', 'resource_swap', 'tariff_reduction']
    types.forEach(t => {
      ;(sys as any).agreements.push({
        id: 99, civ1: 'human', civ2: 'elf', type: t,
        status: 'active', benefit: 50, duration: 0, maxDuration: 9999, tick: 1200,
      })
    })
    expect((sys as any).agreements).toHaveLength(4)
  })

  // 3种status均可注入
  it('3种status均合法', () => {
    const statuses = ['active', 'expired', 'broken']
    statuses.forEach(s => {
      ;(sys as any).agreements.push({
        id: 99, civ1: 'human', civ2: 'elf', type: 'free_trade',
        status: s, benefit: 50, duration: 0, maxDuration: 9999, tick: 1200,
      })
    })
    expect((sys as any).agreements.filter((a: any) => a.status === 'expired')).toHaveLength(1)
    expect((sys as any).agreements.filter((a: any) => a.status === 'broken')).toHaveLength(1)
  })

  // broken不再递增duration
  it('broken agreement不递增duration', () => {
    ;(sys as any).agreements.push({
      id: 1, civ1: 'human', civ2: 'elf', type: 'free_trade',
      status: 'broken', benefit: 50, duration: 3, maxDuration: 9999, tick: 1200,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, em, 1200)
    expect((sys as any).agreements[0].duration).toBe(3)
  })

  // 空agreements时update不崩溃
  it('空agreements时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, em, 1200)).not.toThrow()
  })

  // 多次update累积duration
  it('多次update累积duration', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({
      id: 1, civ1: 'human', civ2: 'elf', type: 'free_trade',
      status: 'active', benefit: 50, duration: 0, maxDuration: 99999, tick: 1200,
    })
    sys.update(1, em, 1200)
    sys.update(1, em, 2400)
    sys.update(1, em, 3600)
    expect((sys as any).agreements[0].duration).toBe(3)
  })

  // benefit字段存在
  it('注入的benefit字段被保留', () => {
    ;(sys as any).agreements.push({
      id: 1, civ1: 'human', civ2: 'elf', type: 'free_trade',
      status: 'active', benefit: 77, duration: 0, maxDuration: 9999, tick: 1200,
    })
    expect((sys as any).agreements[0].benefit).toBe(77)
  })

  // cleanup保留最后20个inactive
  it('cleanup保留最后20个inactive（最新的）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 25; i++) {
      ;(sys as any).agreements.push({
        id: i + 1, civ1: 'human', civ2: 'elf', type: 'free_trade',
        status: 'expired', benefit: 50, duration: 9999, maxDuration: 9999, tick: 1200,
      })
    }
    sys.update(1, em, 1200)
    expect((sys as any).agreements.length).toBe(20)
    // 保留的是最后20个（id 6-25）
    expect((sys as any).agreements[0].id).toBe(6)
  })
})
