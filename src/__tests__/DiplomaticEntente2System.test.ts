import { describe, it, expect, vi } from 'vitest'
import { DiplomaticEntente2System } from '../systems/DiplomaticEntente2System'
import type { EntenteAgreement2 } from '../systems/DiplomaticEntente2System'

function makeSys() { return new DiplomaticEntente2System() }
function makeEntente(o: Partial<EntenteAgreement2> = {}): EntenteAgreement2 {
  return { id: 1, civIdA: 1, civIdB: 2, level: 'informal', mutualTrust: 20, sharedInterests: 20, cooperationDepth: 10, publicEndorsement: 10, duration: 0, tick: 0, ...o }
}
const W = {} as any

describe('基础数据结构', () => {
  it('初始ententes为空数组', () => {
    expect((makeSys() as any).ententes).toEqual([])
  })
  it('初始nextId=1', () => {
    expect((makeSys() as any).nextId).toBe(1)
  })
  it('初始lastCheck=0', () => {
    expect((makeSys() as any).lastCheck).toBe(0)
  })
  it('手动push后长度正确', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente())
    expect((sys as any).ententes).toHaveLength(1)
  })
  it('makeEntente默认level=informal', () => {
    expect(makeEntente().level).toBe('informal')
  })
})

describe('CHECK_INTERVAL=2620节流', () => {
  it('tick=0时不执行', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ duration: 5 }))
    sys.update(1, W, W, 0)
    expect((sys as any).ententes[0].duration).toBe(5)
  })
  it('tick=2619时不执行', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ duration: 5 }))
    sys.update(1, W, W, 2619)
    expect((sys as any).ententes[0].duration).toBe(5)
  })
  it('tick=2620时执行（duration+1）', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ duration: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].duration).toBe(6)
  })
  it('第二次调用需再等2620', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ duration: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    const d1 = (sys as any).ententes[0].duration
    sys.update(1, W, W, 2621)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].duration).toBe(d1)
  })
  it('tick=5240时第二次执行', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ duration: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    sys.update(1, W, W, 5240)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].duration).toBe(2)
  })
})

describe('数值字段递增', () => {
  it('每次执行mutualTrust+0.025', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ mutualTrust: 20 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].mutualTrust).toBeCloseTo(20.025)
  })
  it('每次执行cooperationDepth+0.02', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ cooperationDepth: 10 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].cooperationDepth).toBeCloseTo(10.02)
  })
  it('duration每次+1', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ duration: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].duration).toBe(1)
  })
  it('mutualTrust上限100', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ mutualTrust: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].mutualTrust).toBe(100)
  })
})

describe('level转换逻辑', () => {
  it('mutualTrust>30时informal→cordial', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'informal', mutualTrust: 31 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].level).toBe('cordial')
  })
  it('mutualTrust>55时cordial→strategic', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'cordial', mutualTrust: 56 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].level).toBe('strategic')
  })
  it('mutualTrust>80时strategic→allied', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'strategic', mutualTrust: 81 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].level).toBe('allied')
  })
  it('mutualTrust<=30时informal保持不变', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'informal', mutualTrust: 25 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes[0].level).toBe('informal')
  })
})

describe('allied+duration>=200时删除', () => {
  it('allied且duration>=200时删除', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'allied', duration: 200 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes).toHaveLength(0)
  })
  it('allied但duration<200时保留', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'allied', duration: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes).toHaveLength(1)
  })
  it('非allied即使duration>=200也不删除', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'strategic', duration: 300 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes).toHaveLength(1)
  })
  it('混合：allied>=200删除，其余保留', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ id: 1, level: 'allied', duration: 200 }))
    ;(sys as any).ententes.push(makeEntente({ id: 2, level: 'strategic', duration: 300 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes).toHaveLength(1)
    expect((sys as any).ententes[0].id).toBe(2)
  })
})

describe('MAX_ENTENTES=15上限', () => {
  it('ententes达到15时不再spawn', () => {
    const sys = makeSys()
    for (let i = 0; i < 15; i++) {
      ;(sys as any).ententes.push(makeEntente({ id: i, level: 'informal', duration: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes.length).toBeLessThanOrEqual(15)
  })
  it('ententes=14时random<INITIATE_CHANCE可spawn', () => {
    const sys = makeSys()
    for (let i = 0; i < 14; i++) {
      ;(sys as any).ententes.push(makeEntente({ id: i, level: 'informal', duration: 0 }))
    }
    // 0.001<0.0018 => spawn; a=floor(0*8)+1=1; b=floor(0.2*8)+1=2 => different
    let n = 0
    vi.spyOn(Math, 'random').mockImplementation(() => [0.001, 0.0, 0.2, 0.5, 0.5, 0.5, 0.5][n++] ?? 0.5)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes.length).toBe(15)
  })
  it('random>=INITIATE_CHANCE时不spawn', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).ententes).toHaveLength(0)
  })
  it('spawn后nextId递增', () => {
    const sys = makeSys()
    const idBefore = (sys as any).nextId
    let n = 0
    vi.spyOn(Math, 'random').mockImplementation(() => [0.001, 0.0, 0.2, 0.5, 0.5, 0.5, 0.5][n++] ?? 0.5)
    sys.update(1, W, W, 2620)
    vi.restoreAllMocks()
    expect((sys as any).nextId).toBe(idBefore + 1)
  })
})
