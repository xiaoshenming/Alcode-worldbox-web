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

describe('额外边界与防御性测试', () => {
  it('mutualTrust 上限 100 不被突破', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ mutualTrust: 99.99, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes[0]?.mutualTrust).toBeLessThanOrEqual(100)
  })

  it('cooperationDepth 上限 100 不被突破', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ cooperationDepth: 99.99, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes[0]?.cooperationDepth).toBeLessThanOrEqual(100)
  })

  it('informal -> cordial 当 mutualTrust > 30', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'informal', mutualTrust: 30.1, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes[0]?.level).toBe('cordial')
  })

  it('cordial -> strategic 当 mutualTrust > 55', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'cordial', mutualTrust: 55.1, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes[0]?.level).toBe('strategic')
  })

  it('strategic -> allied 当 mutualTrust > 80', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'strategic', mutualTrust: 80.1, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes[0]?.level).toBe('allied')
  })

  it('allied 阶段 duration >= 200 被清理', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'allied', mutualTrust: 85, duration: 199, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes).toHaveLength(0)
  })

  it('allied 阶段 duration < 200 时保留', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'allied', mutualTrust: 85, duration: 100, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes).toHaveLength(1)
  })

  it('非 allied 阶段 duration=200 时保留', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ level: 'strategic', mutualTrust: 70, duration: 200, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes).toHaveLength(1)
  })

  it('mutualTrust 每 tick +0.025', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ mutualTrust: 20, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes[0]?.mutualTrust).toBeCloseTo(20.025, 5)
  })

  it('cooperationDepth 每 tick +0.02', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ cooperationDepth: 10, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes[0]?.cooperationDepth).toBeCloseTo(10.02, 5)
  })

  it('CHECK_INTERVAL=2620 节流有效', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ duration: 5, tick: 0 }))
    sys.update(1, W, W, 2619)
    expect((sys as any).ententes[0].duration).toBe(5)
  })

  it('update 不改变 civIdA/civIdB', () => {
    const sys = makeSys()
    ;(sys as any).ententes.push(makeEntente({ civIdA: 5, civIdB: 8, tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes[0].civIdA).toBe(5)
    expect((sys as any).ententes[0].civIdB).toBe(8)
  })

  it('空 ententes 时 update 不崩溃', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(() => sys.update(1, W, W, 2620)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('MAX_ENTENTES=15 上限：已满时不新增', () => {
    const sys = makeSys()
    for (let i = 0; i < 15; i++) {
      ;(sys as any).ententes.push(makeEntente({ id: i + 1, tick: 9999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, W, W, 2620)
    expect((sys as any).ententes.length).toBeLessThanOrEqual(15)
    vi.restoreAllMocks()
  })

  it('EntenteAgreement2 包含所有必要字段', () => {
    const e = makeEntente()
    expect(e).toHaveProperty('id')
    expect(e).toHaveProperty('civIdA')
    expect(e).toHaveProperty('civIdB')
    expect(e).toHaveProperty('level')
    expect(e).toHaveProperty('mutualTrust')
    expect(e).toHaveProperty('sharedInterests')
    expect(e).toHaveProperty('cooperationDepth')
    expect(e).toHaveProperty('publicEndorsement')
    expect(e).toHaveProperty('duration')
    expect(e).toHaveProperty('tick')
  })

  it('nextId 手动设置后保持', () => {
    const sys = makeSys()
    ;(sys as any).nextId = 55
    expect((sys as any).nextId).toBe(55)
  })

  it('lastCheck 更新到最新 tick', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, W, 2620 * 3)
    expect((sys as any).lastCheck).toBe(2620 * 3)
    vi.restoreAllMocks()
  })

  it('4 种 level 均可存储', () => {
    const levels = ['informal', 'cordial', 'strategic', 'allied']
    for (const l of levels) {
      expect(makeEntente({ level: l as any }).level).toBe(l)
    }
  })
})
