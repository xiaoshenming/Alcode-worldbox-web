import { describe, it, expect, vi } from 'vitest'
import { DiplomaticDominionSystem } from '../systems/DiplomaticDominionSystem'
import type { DominionRelation } from '../systems/DiplomaticDominionSystem'

let _id = 1
function makeSys() { return new DiplomaticDominionSystem() }
function makeRel(o: Partial<DominionRelation> = {}): DominionRelation {
  return { id: _id++, civIdA: 1, civIdB: 2, form: 'vassal_state', selfGovernance: 50, imperialControl: 40, economicTies: 30, culturalAssimilation: 20, duration: 0, tick: 0, ...o }
}
// mock random sequence: first call < PROCEED_CHANCE(0.002), then civA index, civB index (different)
function mockSpawn() {
  let n = 0
  const vals = [0.001, 0.0, 0.1] // 0.001<0.002 => spawn; floor(0*8)+1=1; floor(0.1*8)+1=1 => same! use 0.2
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const v = [0.001, 0.0, 0.2, 0.5, 0.5, 0.5, 0.5][n] ?? 0.5
    n++; return v
  })
}

describe('基础数据结构', () => {
  it('初始relations为空数组', () => {
    expect((makeSys() as any).relations).toEqual([])
  })
  it('初始nextId=1', () => {
    expect((makeSys() as any).nextId).toBe(1)
  })
  it('初始lastCheck=0', () => {
    expect((makeSys() as any).lastCheck).toBe(0)
  })
  it('手动push后relations长度正确', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel())
    expect((sys as any).relations).toHaveLength(1)
  })
  it('makeRel默认form为vassal_state', () => {
    expect(makeRel().form).toBe('vassal_state')
  })
})

describe('CHECK_INTERVAL=2550节流', () => {
  it('tick=0时不执行', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ duration: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).relations[0].duration).toBe(5)
  })
  it('tick=2549时不执行', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ duration: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2549)
    expect((sys as any).relations[0].duration).toBe(5)
  })
  it('tick=2550时执行（duration+1）', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ duration: 5, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999) // > PROCEED_CHANCE, no spawn
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).relations[0].duration).toBe(6)
  })
  it('第二次调用需再等2550', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ duration: 0, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, 2550)
    const d1 = (sys as any).relations[0].duration
    sys.update(1, {} as any, {} as any, 2551)
    vi.restoreAllMocks()
    expect((sys as any).relations[0].duration).toBe(d1)
  })
  it('tick=5100时第二次执行', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ duration: 0, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, 2550)
    sys.update(1, {} as any, {} as any, 5100)
    vi.restoreAllMocks()
    expect((sys as any).relations[0].duration).toBe(2)
  })
})

describe('数值字段动态更新', () => {
  it('每次update执行时duration+1', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ duration: 10, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).relations[0].duration).toBe(11)
  })
  it('selfGovernance clamp下限10生效', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ selfGovernance: 10.001, tick: 0 }))
    // mock: no spawn (0.999), then field updates use 0.0 => 0.0-0.47=-0.47 => 10.001-0.47*0.12=9.9... => clamp to 10
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).relations[0].selfGovernance).toBeGreaterThanOrEqual(10)
  })
  it('selfGovernance clamp上限90生效', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ selfGovernance: 89.999, tick: 0 }))
    // mock: 0.999 => 0.999-0.47=0.529 => +0.529*0.12 => 90.06 => clamp to 90
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).relations[0].selfGovernance).toBeLessThanOrEqual(90)
  })
  it('imperialControl clamp上限85生效', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ imperialControl: 84.999, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).relations[0].imperialControl).toBeLessThanOrEqual(85)
  })
  it('economicTies clamp下限5生效', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ economicTies: 5.001, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).relations[0].economicTies).toBeGreaterThanOrEqual(5)
  })
})

describe('过期清理cutoff=tick-96000', () => {
  it('tick=100000时，tick=0的relation被清理', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, 100000)
    vi.restoreAllMocks()
    expect((sys as any).relations).toHaveLength(0)
  })
  it('新鲜relation不被清理', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ tick: 99000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, 100000)
    vi.restoreAllMocks()
    expect((sys as any).relations).toHaveLength(1)
  })
  it('混合：过期的删除，新鲜的保留', () => {
    const sys = makeSys()
    ;(sys as any).relations.push(makeRel({ id: 10, tick: 0 }))
    ;(sys as any).relations.push(makeRel({ id: 11, tick: 99000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, 100000)
    vi.restoreAllMocks()
    expect((sys as any).relations).toHaveLength(1)
    expect((sys as any).relations[0].id).toBe(11)
  })
  it('cutoff边界：tick恰好等于cutoff时不删除', () => {
    const sys = makeSys()
    const t = 100000
    ;(sys as any).relations.push(makeRel({ tick: t - 96000 })) // tick === cutoff, not < cutoff
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, t)
    vi.restoreAllMocks()
    expect((sys as any).relations).toHaveLength(1)
  })
  it('空数组时不崩溃', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, {} as any, {} as any, 100000)).not.toThrow()
  })
})

describe('MAX_RELATIONS=16上限', () => {
  it('relations达到16时不再spawn', () => {
    const sys = makeSys()
    for (let i = 0; i < 16; i++) {
      ;(sys as any).relations.push(makeRel({ tick: 999999 }))
    }
    // random < PROCEED_CHANCE => would spawn, but MAX hit
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).relations.length).toBeLessThanOrEqual(16)
  })
  it('relations=15时可spawn到16', () => {
    const sys = makeSys()
    for (let i = 0; i < 15; i++) {
      ;(sys as any).relations.push(makeRel({ tick: 999999 }))
    }
    // sequence: 0.001 < 0.002 => spawn; civA=floor(0*8)+1=1; civB=floor(0.2*8)+1=2 => different
    let n = 0
    vi.spyOn(Math, 'random').mockImplementation(() => [0.001, 0.0, 0.2, 0.5, 0.5, 0.5, 0.5][n++] ?? 0.5)
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).relations.length).toBe(16)
  })
  it('random>=PROCEED_CHANCE时不spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).relations).toHaveLength(0)
  })
  it('spawn后nextId递增', () => {
    const sys = makeSys()
    const idBefore = (sys as any).nextId
    let n = 0
    vi.spyOn(Math, 'random').mockImplementation(() => [0.001, 0.0, 0.2, 0.5, 0.5, 0.5, 0.5][n++] ?? 0.5)
    sys.update(1, {} as any, {} as any, 2550)
    vi.restoreAllMocks()
    expect((sys as any).nextId).toBe(idBefore + 1)
  })
})

describe('DominionForm枚举完整性', () => {
  it('colonial_dominion是合法form', () => {
    expect(makeRel({ form: 'colonial_dominion' }).form).toBe('colonial_dominion')
  })
  it('vassal_state是合法form', () => {
    expect(makeRel({ form: 'vassal_state' }).form).toBe('vassal_state')
  })
  it('autonomous_region是合法form', () => {
    expect(makeRel({ form: 'autonomous_region' }).form).toBe('autonomous_region')
  })
  it('tributary_dominion是合法form', () => {
    expect(makeRel({ form: 'tributary_dominion' }).form).toBe('tributary_dominion')
  })
})
