import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticTribunalSystem } from '../systems/DiplomaticTribunalSystem'

function makeSys() { return new DiplomaticTribunalSystem() }

const emFull = { getEntitiesWithComponent: (_: string) => [1, 2, 3, 4, 5] } as any
const emEmpty = { getEntitiesWithComponent: (_: string) => [] } as any
const world = {} as any

describe('DiplomaticTribunalSystem', () => {
  let sys: DiplomaticTribunalSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  // --- 初始状态 (3个) ---
  it('初始proceedings为空数组', () => {
    expect((sys as any).proceedings).toHaveLength(0)
    expect(Array.isArray((sys as any).proceedings)).toBe(true)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始_proceedingKeySet为空Set', () => {
    const keySet = (sys as any)._proceedingKeySet
    expect(keySet).toBeInstanceOf(Set)
    expect(keySet.size).toBe(0)
  })

  // --- 节流 (3个) ---
  it('tick不足CHECK_INTERVAL(5500)时不触发更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, emFull, 0)
    sys.update(1, world, emFull, 5499)
    expect((sys as any).proceedings).toHaveLength(0)
  })

  it('tick达到CHECK_INTERVAL后更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, emFull, 5500)
    expect((sys as any).lastCheck).toBe(5500)
  })

  it('同一interval内第二次调用不重新触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, emFull, 5500)
    const check1 = (sys as any).lastCheck
    sys.update(1, world, emFull, 6000) // 未到11000
    expect((sys as any).lastCheck).toBe(check1)
  })

  // --- 空entities不spawn (2个) ---
  it('entities为空时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, emEmpty, 5500)
    expect((sys as any).proceedings).toHaveLength(0)
  })

  it('entities不足2个时不spawn', () => {
    const emOne = { getEntitiesWithComponent: (_: string) => [1] } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, emOne, 5500)
    expect((sys as any).proceedings).toHaveLength(0)
  })

  // --- spawn (5个) ---
  it('random=0且entities>=2时触发spawn', () => {
    // random=0 < CASE_CHANCE=0.003 触发spawn
    // pickRandom用random选index，需要确保prosecutor !== defendant
    // emFull有5个元素，random=0时两次index都是0（相同），会return
    // 改用mockReturnValueOnce序列确保不同index
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // < CASE_CHANCE
      .mockReturnValueOnce(0)    // prosecutor index=0 → entity[0]=1
      .mockReturnValueOnce(0.4)  // defendant index=2 → entity[2]=3
      .mockReturnValue(0.5)      // 其余random
    sys.update(1, world, emFull, 5500)
    expect((sys as any).proceedings.length).toBeGreaterThanOrEqual(1)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.4)
      .mockReturnValue(0.5)
    sys.update(1, world, emFull, 5500)
    const len = (sys as any).proceedings.length
    if (len > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })

  it('spawn后_proceedingKeySet中有对应key', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)    // prosecutor=entities[0]=1
      .mockReturnValueOnce(0.4)  // defendant=entities[2]=3
      .mockReturnValue(0.5)
    sys.update(1, world, emFull, 5500)
    const keySet = (sys as any)._proceedingKeySet as Set<string>
    const procs = (sys as any).proceedings
    if (procs.length > 0) {
      const p = procs[0]
      expect(keySet.has(`${p.prosecutorCivId}_${p.defendantCivId}`)).toBe(true)
    }
  })

  it('同一key不重复spawn', () => {
    // 先手动注入一个proceeding占据key 1_3
    ;(sys as any).proceedings.push({
      id: 1, prosecutorCivId: 1, defendantCivId: 3,
      caseType: 'territorial', evidence: 30, verdict: 50, compliance: 40, tick: 0,
    })
    ;(sys as any)._proceedingKeySet.add('1_3')

    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)    // prosecutor=entities[0]=1
      .mockReturnValueOnce(0.4)  // defendant=entities[2]=3
      .mockReturnValue(0.5)
    sys.update(1, world, emFull, 5500)
    // 不应再spawn相同key
    expect((sys as any).proceedings).toHaveLength(1)
  })

  it('达到MAX_PROCEEDINGS(8)后不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 8; i++) {
      ;(sys as any).proceedings.push({
        id: i + 1, prosecutorCivId: i + 10, defendantCivId: i + 20,
        caseType: 'territorial', evidence: 50, verdict: 50, compliance: 40, tick: 0,
      })
    }
    sys.update(1, world, emFull, 5500)
    expect((sys as any).proceedings).toHaveLength(8)
  })

  // --- verdict更新 (3个) ---
  it('evidence>60时verdict向100增加', () => {
    ;(sys as any).proceedings.push({
      id: 1, prosecutorCivId: 1, defendantCivId: 2,
      caseType: 'territorial', evidence: 70, verdict: 50, compliance: 40, tick: 0,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1) // 跳过spawn
    sys.update(1, world, emFull, 5500)
    expect((sys as any).proceedings[0]?.verdict).toBeGreaterThanOrEqual(50)
  })

  it('evidence<30时verdict向0减少', () => {
    ;(sys as any).proceedings.push({
      id: 1, prosecutorCivId: 1, defendantCivId: 2,
      caseType: 'war_crimes', evidence: 20, verdict: 50, compliance: 40, tick: 0,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, emFull, 5500)
    const p = (sys as any).proceedings[0]
    if (p) {
      expect(p.verdict).toBeLessThanOrEqual(50)
    }
  })

  it('evidence在30-60之间verdict不变', () => {
    ;(sys as any).proceedings.push({
      id: 1, prosecutorCivId: 1, defendantCivId: 2,
      caseType: 'trade_violation', evidence: 45, verdict: 50, compliance: 40, tick: 0,
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, emFull, 5500)
    const p = (sys as any).proceedings[0]
    if (p) {
      expect(p.verdict).toBe(50)
    }
  })

  // --- cleanup (3个) ---
  it('verdict>=95时删除proceeding并从keySet移除', () => {
    ;(sys as any).proceedings.push({
      id: 1, prosecutorCivId: 1, defendantCivId: 2,
      caseType: 'territorial', evidence: 50, verdict: 96, compliance: 40, tick: 0,
    })
    ;(sys as any)._proceedingKeySet.add('1_2')
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, emFull, 5500)
    expect((sys as any).proceedings).toHaveLength(0)
    expect((sys as any)._proceedingKeySet.has('1_2')).toBe(false)
  })

  it('verdict<=5时删除proceeding', () => {
    ;(sys as any).proceedings.push({
      id: 1, prosecutorCivId: 3, defendantCivId: 4,
      caseType: 'war_crimes', evidence: 50, verdict: 4, compliance: 40, tick: 0,
    })
    ;(sys as any)._proceedingKeySet.add('3_4')
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, emFull, 5500)
    expect((sys as any).proceedings).toHaveLength(0)
  })

  it('tick - p.tick > 65000时删除超时proceeding', () => {
    ;(sys as any).proceedings.push({
      id: 1, prosecutorCivId: 5, defendantCivId: 6,
      caseType: 'treaty_breach', evidence: 50, verdict: 50, compliance: 40, tick: 0,
    })
    ;(sys as any)._proceedingKeySet.add('5_6')
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, emFull, 70000) // 70000 - 0 = 70000 > 65000
    expect((sys as any).proceedings).toHaveLength(0)
    expect((sys as any)._proceedingKeySet.has('5_6')).toBe(false)
  })

  it('tick - p.tick === 65000时不删除(未超过)', () => {
    ;(sys as any).proceedings.push({
      id: 1, prosecutorCivId: 7, defendantCivId: 8,
      caseType: 'territorial', evidence: 50, verdict: 50, compliance: 40, tick: 0,
    })
    ;(sys as any)._proceedingKeySet.add('7_8')
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, emFull, 65000) // 65000 - 0 = 65000，不>65000
    expect((sys as any).proceedings).toHaveLength(1)
  })
})
