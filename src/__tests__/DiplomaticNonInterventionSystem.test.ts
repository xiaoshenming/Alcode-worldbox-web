import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticNonInterventionSystem } from '../systems/DiplomaticNonInterventionSystem'
import type { NonInterventionPact, InterventionScope } from '../systems/DiplomaticNonInterventionSystem'

const CHECK_INTERVAL = 2450
const MAX_PACTS = 20

function makeSys() { return new DiplomaticNonInterventionSystem() }

function makePact(overrides: Partial<NonInterventionPact> = {}): NonInterventionPact {
  return {
    id: 1, civIdA: 1, civIdB: 2, scope: 'military',
    sovereignty: 50, compliance: 55, mutualTrust: 40, diplomaticStability: 45,
    duration: 0, tick: 0, ...overrides,
  }
}

describe('DiplomaticNonInterventionSystem — 基础数据结构', () => {
  let sys: DiplomaticNonInterventionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始pacts为空数组', () => {
    expect(Array.isArray((sys as any).pacts)).toBe(true)
    expect((sys as any).pacts).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入pact后长度为1且id正确', () => {
    ;(sys as any).pacts.push(makePact({ id: 1 }))
    expect((sys as any).pacts).toHaveLength(1)
    expect((sys as any).pacts[0].id).toBe(1)
  })

  it('NonInterventionPact包含所有必需字段', () => {
    const p = makePact()
    ;['id','civIdA','civIdB','scope','sovereignty','compliance','mutualTrust','diplomaticStability','duration','tick']
      .forEach(f => expect(p).toHaveProperty(f))
  })
})

describe('DiplomaticNonInterventionSystem — CHECK_INTERVAL=2450 节流', () => {
  let sys: DiplomaticNonInterventionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行，lastCheck依然为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时被节流，lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL时通过节流，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时通过节流，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第一次通过后同tick再调用被节流，lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('DiplomaticNonInterventionSystem — 字段动态更新', () => {
  let sys: DiplomaticNonInterventionSystem
  beforeEach(() => { sys = makeSys() })

  it('每次update通过节流后duration递增1', () => {
    ;(sys as any).pacts.push(makePact({ duration: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).pacts[0].duration).toBe(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).pacts[0].duration).toBe(2)
  })

  it('sovereignty被约束在[10, 100]范围内', () => {
    ;(sys as any).pacts.push(makePact({ sovereignty: 50, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 1; i <= 200; i++) sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    const v = (sys as any).pacts[0]?.sovereignty
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(100) }
  })

  it('compliance被约束在[10, 95]范围内', () => {
    ;(sys as any).pacts.push(makePact({ compliance: 55, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 1; i <= 200; i++) sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    const v = (sys as any).pacts[0]?.compliance
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(95) }
  })

  it('mutualTrust被约束在[5, 90]，diplomaticStability在[8, 85]', () => {
    ;(sys as any).pacts.push(makePact({ mutualTrust: 40, diplomaticStability: 45, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 1; i <= 200; i++) sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    const p = (sys as any).pacts[0]
    if (p) {
      expect(p.mutualTrust).toBeGreaterThanOrEqual(5); expect(p.mutualTrust).toBeLessThanOrEqual(90)
      expect(p.diplomaticStability).toBeGreaterThanOrEqual(8); expect(p.diplomaticStability).toBeLessThanOrEqual(85)
    }
  })
})

describe('DiplomaticNonInterventionSystem — 过期cleanup（cutoff=tick-83000）', () => {
  let sys: DiplomaticNonInterventionSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=0的pact在tick=90000时被清理（0 < 7000）', () => {
    ;(sys as any).pacts.push(makePact({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).pacts).toHaveLength(0)
  })

  it('tick=8000的pact在tick=90000时不被清理（8000 >= 7000）', () => {
    ;(sys as any).pacts.push(makePact({ id: 1, tick: 8000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).pacts).toHaveLength(1)
  })

  it('pact.tick恰好等于cutoff时不被清理（< cutoff才删）', () => {
    // cutoff = 90000 - 83000 = 7000; 7000 < 7000 为false
    ;(sys as any).pacts.push(makePact({ id: 1, tick: 7000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).pacts).toHaveLength(1)
  })

  it('多个pacts中只有过期的被删除', () => {
    ;(sys as any).pacts.push(makePact({ id: 1, tick: 0 }))
    ;(sys as any).pacts.push(makePact({ id: 2, tick: 10000 }))
    ;(sys as any).pacts.push(makePact({ id: 3, tick: 6999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).pacts).toHaveLength(1)
    expect((sys as any).pacts[0].id).toBe(2)
  })
})

describe('DiplomaticNonInterventionSystem — MAX_PACTS=20 上限', () => {
  let sys: DiplomaticNonInterventionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('pacts已满20条时即使random通过也不新增', () => {
    for (let i = 1; i <= MAX_PACTS; i++) {
      ;(sys as any).pacts.push(makePact({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).pacts).toHaveLength(MAX_PACTS)
  })

  it('random=1时（>PACT_CHANCE=0.003）不spawn新pact', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).pacts).toHaveLength(0)
  })

  it('pacts=19条时random通过可添加（不超过20）', () => {
    for (let i = 1; i <= MAX_PACTS - 1; i++) {
      ;(sys as any).pacts.push(makePact({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).pacts.length).toBeLessThanOrEqual(MAX_PACTS)
  })

  it('多次update后lastCheck始终追踪最新tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('DiplomaticNonInterventionSystem — InterventionScope枚举完整性', () => {
  it('包含全部4种scope', () => {
    const scopes: InterventionScope[] = ['military', 'political', 'economic', 'total']
    scopes.forEach(s => expect(makePact({ scope: s }).scope).toBe(s))
  })

  it('scope字段类型为string', () => {
    expect(typeof makePact().scope).toBe('string')
  })

  it('nextId手动递增后值正确', () => {
    const s = makeSys() as any
    s.pacts.push(makePact({ id: s.nextId++ }))
    s.pacts.push(makePact({ id: s.nextId++ }))
    expect(s.pacts[0].id).toBe(1)
    expect(s.pacts[1].id).toBe(2)
    expect(s.nextId).toBe(3)
  })
})
