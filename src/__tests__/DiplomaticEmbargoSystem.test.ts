import { describe, it, expect, vi } from 'vitest'
import { DiplomaticEmbargoSystem } from '../systems/DiplomaticEmbargoSystem'
import type { Embargo } from '../systems/DiplomaticEmbargoSystem'

function makeSys() { return new DiplomaticEmbargoSystem() }
function makeCivMgr() { return { civilizations: new Map([[1, { id: 1 }], [2, { id: 2 }]]) } as any }
function makeEmbargo(o: Partial<Embargo> = {}): Embargo {
  return { id: 1, imposerCivId: 1, targetCivId: 2, severity: 'partial', status: 'active', economicDamage: 0, selfDamage: 0, duration: 10000, startTick: 0, supporterCivIds: [], ...o }
}

describe('基础数据结构', () => {
  it('初始embargoes为空数组', () => {
    expect((makeSys() as any).embargoes).toEqual([])
  })
  it('初始nextId=1', () => {
    expect((makeSys() as any).nextId).toBe(1)
  })
  it('初始lastCheck=0', () => {
    expect((makeSys() as any).lastCheck).toBe(0)
  })
  it('手动push后长度正确', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo())
    expect((sys as any).embargoes).toHaveLength(1)
  })
  it('makeEmbargo默认severity=partial', () => {
    expect(makeEmbargo().severity).toBe('partial')
  })
})

describe('CHECK_INTERVAL=1400节流', () => {
  it('tick=0时不执行', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ startTick: 0 }))
    sys.update(1, {} as any, makeCivMgr(), 0)
    expect((sys as any).embargoes[0].economicDamage).toBe(0)
  })
  it('tick=1399时不执行', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ startTick: 0 }))
    sys.update(1, {} as any, makeCivMgr(), 1399)
    expect((sys as any).embargoes[0].economicDamage).toBe(0)
  })
  it('tick=1400时执行（economicDamage增加）', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ startTick: 0, duration: 10000 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    expect((sys as any).embargoes[0].economicDamage).toBeGreaterThan(0)
  })
  it('第二次调用需再等1400', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ startTick: 0, duration: 10000 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    const d1 = (sys as any).embargoes[0].economicDamage
    sys.update(1, {} as any, makeCivMgr(), 1401)
    expect((sys as any).embargoes[0].economicDamage).toBe(d1)
  })
  it('tick=2800时第二次执行', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ startTick: 0, duration: 10000 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    const d1 = (sys as any).embargoes[0].economicDamage
    sys.update(1, {} as any, makeCivMgr(), 2800)
    expect((sys as any).embargoes[0].economicDamage).toBeGreaterThan(d1)
  })
})

describe('economicDamage和selfDamage递增', () => {
  it('partial每tick economicDamage+=0.02', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ severity: 'partial', startTick: 0, duration: 10000 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    expect((sys as any).embargoes[0].economicDamage).toBeCloseTo(0.02)
  })
  it('full每tick economicDamage+=0.04', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ severity: 'full', startTick: 0, duration: 10000 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    expect((sys as any).embargoes[0].economicDamage).toBeCloseTo(0.04)
  })
  it('blockade每tick economicDamage+=0.06', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ severity: 'blockade', startTick: 0, duration: 10000 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    expect((sys as any).embargoes[0].economicDamage).toBeCloseTo(0.06)
  })
  it('selfDamage是economicDamage的0.3倍', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ severity: 'full', startTick: 0, duration: 10000 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    const e = (sys as any).embargoes[0]
    expect(e.selfDamage).toBeCloseTo(e.economicDamage * 0.3)
  })
})

describe('状态转换', () => {
  it('elapsed在0.7~1.0之间时status变weakening且保留', () => {
    const sys = makeSys()
    // elapsed=1401, duration=2000 => 1401>1400(0.7*2000) => weakening, 1401<2000 => 保留
    ;(sys as any).embargoes.push(makeEmbargo({ duration: 2000, startTick: -1, status: 'active' }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    expect((sys as any).embargoes[0].status).toBe('weakening')
    expect((sys as any).embargoes).toHaveLength(1)
  })
  it('elapsed>duration时删除', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ duration: 500, startTick: 0 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    expect((sys as any).embargoes).toHaveLength(0)
  })
  it('selfDamage>60时删除', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ selfDamage: 61, duration: 99999, startTick: 0 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    expect((sys as any).embargoes).toHaveLength(0)
  })
  it('elapsed<duration且selfDamage<60时保留', () => {
    const sys = makeSys()
    ;(sys as any).embargoes.push(makeEmbargo({ duration: 99999, startTick: 0, selfDamage: 0 }))
    sys.update(1, {} as any, makeCivMgr(), 1400)
    expect((sys as any).embargoes).toHaveLength(1)
  })
})

describe('MAX_EMBARGOES=12上限', () => {
  it('embargoes达到12时不再spawn', () => {
    const sys = makeSys()
    for (let i = 0; i < 12; i++) {
      ;(sys as any).embargoes.push(makeEmbargo({ id: i, duration: 99999, startTick: 999999 }))
    }
    // random < EMBARGO_CHANCE(0.003) would spawn, but MAX hit
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, makeCivMgr(), 1400)
    vi.restoreAllMocks()
    expect((sys as any).embargoes.length).toBeLessThanOrEqual(12)
  })
  it('embargoes=11时random<EMBARGO_CHANCE可spawn到12', () => {
    const sys = makeSys()
    for (let i = 0; i < 11; i++) {
      ;(sys as any).embargoes.push(makeEmbargo({ id: i, duration: 99999, startTick: 999999 }))
    }
    // sequence: 0.001<0.003 => spawn; iA=floor(0*2)=0; iB=floor(0.5*2)=1 => different
    let n = 0
    vi.spyOn(Math, 'random').mockImplementation(() => [0.001, 0.0, 0.5, 0.3, 0.5, 0.5][n++] ?? 0.5)
    sys.update(1, {} as any, makeCivMgr(), 1400)
    vi.restoreAllMocks()
    expect((sys as any).embargoes.length).toBe(12)
  })
  it('random>=EMBARGO_CHANCE时不spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, {} as any, makeCivMgr(), 1400)
    vi.restoreAllMocks()
    expect((sys as any).embargoes).toHaveLength(0)
  })
  it('文明数<2时不spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const civs = new Map([[1, { id: 1 }]])
    sys.update(1, {} as any, { civilizations: civs } as any, 1400)
    vi.restoreAllMocks()
    expect((sys as any).embargoes).toHaveLength(0)
  })
})

describe('EmbargoSeverity枚举完整性', () => {
  it('partial是合法severity', () => {
    expect(makeEmbargo({ severity: 'partial' }).severity).toBe('partial')
  })
  it('full是合法severity', () => {
    expect(makeEmbargo({ severity: 'full' }).severity).toBe('full')
  })
  it('blockade是合法severity', () => {
    expect(makeEmbargo({ severity: 'blockade' }).severity).toBe('blockade')
  })
  it('status初始为active', () => {
    expect(makeEmbargo().status).toBe('active')
  })
})
