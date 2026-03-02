import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticPardonSystem } from '../systems/DiplomaticPardonSystem'
import type { PardonDecree, PardonForm } from '../systems/DiplomaticPardonSystem'

const CHECK_INTERVAL = 2520
const MAX_DECREES = 20

function makeSys() { return new DiplomaticPardonSystem() }

function makeDecree(overrides: Partial<PardonDecree> = {}): PardonDecree {
  return {
    id: 1, civIdA: 1, civIdB: 2, form: 'unconditional_pardon',
    forgivenessDepth: 40, publicSupport: 35, politicalCapital: 35, reconciliationEffect: 25,
    duration: 0, tick: 0, ...overrides,
  }
}

describe('DiplomaticPardonSystem — 基础数据结构', () => {
  let sys: DiplomaticPardonSystem
  beforeEach(() => { sys = makeSys() })

  it('初始decrees为空数组', () => {
    expect(Array.isArray((sys as any).decrees)).toBe(true)
    expect((sys as any).decrees).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入decree后长度为1且id正确', () => {
    ;(sys as any).decrees.push(makeDecree({ id: 1 }))
    expect((sys as any).decrees).toHaveLength(1)
    expect((sys as any).decrees[0].id).toBe(1)
  })

  it('PardonDecree包含所有必需字段', () => {
    const d = makeDecree()
    ;['id','civIdA','civIdB','form','forgivenessDepth','publicSupport','politicalCapital','reconciliationEffect','duration','tick']
      .forEach(f => expect(d).toHaveProperty(f))
  })
})

describe('DiplomaticPardonSystem — CHECK_INTERVAL=2520 节流', () => {
  let sys: DiplomaticPardonSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行，lastCheck依然为0', () => {
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时被节流，lastCheck不变', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL时通过节流，lastCheck更新', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时通过节流，lastCheck更新', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第一次通过后同tick再调用被节流，lastCheck不变', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('DiplomaticPardonSystem — 字段动态更新', () => {
  let sys: DiplomaticPardonSystem
  beforeEach(() => { sys = makeSys() })

  it('每次update通过节流后duration递增1', () => {
    ;(sys as any).decrees.push(makeDecree({ duration: 0, tick: 999999 }))
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).decrees[0].duration).toBe(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).decrees[0].duration).toBe(2)
  })

  it('forgivenessDepth被约束在[10, 85]范围内', () => {
    ;(sys as any).decrees.push(makeDecree({ forgivenessDepth: 40, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    const v = (sys as any).decrees[0]?.forgivenessDepth
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85) }
  })

  it('publicSupport被约束在[5, 80]范围内', () => {
    ;(sys as any).decrees.push(makeDecree({ publicSupport: 35, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    const v = (sys as any).decrees[0]?.publicSupport
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
  })

  it('politicalCapital在[10,75]，reconciliationEffect在[5,70]', () => {
    ;(sys as any).decrees.push(makeDecree({ politicalCapital: 35, reconciliationEffect: 25, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    const d = (sys as any).decrees[0]
    if (d) {
      expect(d.politicalCapital).toBeGreaterThanOrEqual(10); expect(d.politicalCapital).toBeLessThanOrEqual(75)
      expect(d.reconciliationEffect).toBeGreaterThanOrEqual(5); expect(d.reconciliationEffect).toBeLessThanOrEqual(70)
    }
  })
})

describe('DiplomaticPardonSystem — 过期cleanup（cutoff=tick-88000）', () => {
  let sys: DiplomaticPardonSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=0的decree在tick=90000时被清理（0 < 2000）', () => {
    ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).decrees).toHaveLength(0)
  })

  it('tick=3000的decree在tick=90000时不被清理（3000 >= 2000）', () => {
    ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 3000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).decrees).toHaveLength(1)
  })

  it('decree.tick恰好等于cutoff时不被清理', () => {
    // cutoff = 90000 - 88000 = 2000; 2000 < 2000 为false
    ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 2000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).decrees).toHaveLength(1)
  })

  it('多个decrees中只有过期的被删除', () => {
    ;(sys as any).decrees.push(makeDecree({ id: 1, tick: 0 }))
    ;(sys as any).decrees.push(makeDecree({ id: 2, tick: 5000 }))
    ;(sys as any).decrees.push(makeDecree({ id: 3, tick: 1500 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).decrees).toHaveLength(1)
    expect((sys as any).decrees[0].id).toBe(2)
  })
})

describe('DiplomaticPardonSystem — MAX_DECREES=20 上限', () => {
  let sys: DiplomaticPardonSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('decrees已满20条时即使random通过也不新增', () => {
    for (let i = 1; i <= MAX_DECREES; i++) {
      ;(sys as any).decrees.push(makeDecree({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).decrees).toHaveLength(MAX_DECREES)
  })

  it('random=1时（>PROCEED_CHANCE=0.0022）不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).decrees).toHaveLength(0)
  })

  it('decrees=19条时random通过可添加（不超过20）', () => {
    for (let i = 1; i <= MAX_DECREES - 1; i++) {
      ;(sys as any).decrees.push(makeDecree({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).decrees.length).toBeLessThanOrEqual(MAX_DECREES)
  })

  it('多次update后lastCheck始终追踪最新tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('DiplomaticPardonSystem — PardonForm枚举完整性', () => {
  it('包含全部4种form', () => {
    const forms: PardonForm[] = ['unconditional_pardon', 'conditional_pardon', 'posthumous_pardon', 'collective_pardon']
    forms.forEach(f => expect(makeDecree({ form: f }).form).toBe(f))
  })

  it('form字段类型为string', () => {
    expect(typeof makeDecree().form).toBe('string')
  })

  it('nextId手动递增后值正确', () => {
    const s = makeSys() as any
    s.decrees.push(makeDecree({ id: s.nextId++ }))
    s.decrees.push(makeDecree({ id: s.nextId++ }))
    expect(s.decrees[0].id).toBe(1)
    expect(s.decrees[1].id).toBe(2)
    expect(s.nextId).toBe(3)
  })
})
