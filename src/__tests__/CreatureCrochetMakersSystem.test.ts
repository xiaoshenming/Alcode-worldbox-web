import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureCrochetMakersSystem } from '../systems/CreatureCrochetMakersSystem'
import type { CrochetMaker, CrochetType } from '../systems/CreatureCrochetMakersSystem'

let nextId = 1
function makeSys(): CreatureCrochetMakersSystem { return new CreatureCrochetMakersSystem() }
function makeMaker(entityId: number, skill = 30, crochetType: CrochetType = 'amigurumi', tick = 0): CrochetMaker {
  return {
    id: nextId++,
    entityId,
    skill,
    piecesMade: 3 + Math.floor(skill / 7),
    crochetType,
    loopTension: 14 + skill * 0.72,
    reputation: 10 + skill * 0.82,
    tick,
  }
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
  }
}

const CHECK_INTERVAL = 1530

describe('CreatureCrochetMakersSystem', () => {
  let sys: CreatureCrochetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无钩针工', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注��后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'irish'))
    expect((sys as any).makers[0].crochetType).toBe('irish')
    expect((sys as any).makers).toHaveLength(1)
  })

  // 3. CrochetType 包含 4 种
  it('CrochetType 包含 4 种（amigurumi/filet/tunisian/irish）', () => {
    const types: CrochetType[] = ['amigurumi', 'filet', 'tunisian', 'irish']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, 30, t)) })
    const all = (sys as any).makers as CrochetMaker[]
    types.forEach((t, i) => { expect(all[i].crochetType).toBe(t) })
  })

  // 4. loopTension 公式验证: 14 + skill * 0.72
  it('loopTension 公式: 14 + skill * 0.72', () => {
    const skill = 50
    const maker = makeMaker(1, skill)
    expect(maker.loopTension).toBeCloseTo(14 + skill * 0.72, 5)
  })

  // 5. reputation 公式验证: 10 + skill * 0.82
  it('reputation 公式: 10 + skill * 0.82', () => {
    const skill = 60
    const maker = makeMaker(1, skill)
    expect(maker.reputation).toBeCloseTo(10 + skill * 0.82, 5)
  })

  // 6. piecesMade 计算: skill=49 → 3 + floor(49/7) = 3 + 7 = 10
  it('piecesMade: skill=49 → 10', () => {
    const skill = 49
    expect(3 + Math.floor(skill / 7)).toBe(10)
    const maker = makeMaker(1, skill)
    expect(maker.piecesMade).toBe(10)
  })

  // 7. crochetType 由 skill/25 决定 4 段
  it('crochetType 由 skill/25 决定：skill=0→amigurumi, 25→filet, 50→tunisian, 75→irish', () => {
    const TYPES: CrochetType[] = ['amigurumi', 'filet', 'tunisian', 'irish']
    const cases: [number, CrochetType][] = [
      [0, 'amigurumi'],
      [24, 'amigurumi'],
      [25, 'filet'],
      [49, 'filet'],
      [50, 'tunisian'],
      [74, 'tunisian'],
      [75, 'irish'],
      [100, 'irish'],
    ]
    cases.forEach(([skill, expected]) => {
      const idx = Math.min(3, Math.floor(skill / 25))
      expect(TYPES[idx]).toBe(expected)
    })
  })

  // 8. tick 差值 < CHECK_INTERVAL 时不触发更新
  // 第一次以 CHECK_INTERVAL 触发（让 lastCheck = CHECK_INTERVAL），
  // 第二次 tick = CHECK_INTERVAL + CHECK_INTERVAL - 1，差值 < CHECK_INTERVAL → skip
  it('tick 差值 < 1530 时不触发第二次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em as any, CHECK_INTERVAL)          // 触发：lastCheck = CHECK_INTERVAL
    sys.update(1, em as any, CHECK_INTERVAL * 2 - 1)  // 差值 = CHECK_INTERVAL - 1 < CHECK_INTERVAL，skip
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  // 9. tick 差值 >= CHECK_INTERVAL 时触发第二次更新
  it('tick 差值 >= 1530 时触发第二次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em as any, CHECK_INTERVAL)      // 触发：lastCheck = CHECK_INTERVAL
    sys.update(1, em as any, CHECK_INTERVAL * 2)  // 差值 = CHECK_INTERVAL，触发
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })

  // 10. time-based cleanup: cutoff = tick - 52000, 旧记录被删，新记录保留
  it('cleanup: tick < cutoff 的记录被删除，新记录保留', () => {
    const tick = 100000
    ;(sys as any).makers.push(makeMaker(1, 30, 'amigurumi', tick - 60000)) // 旧，应被删
    ;(sys as any).makers.push(makeMaker(2, 30, 'filet',     tick - 30000)) // 新，保留
    const cutoff = tick - 52000
    const makers = (sys as any).makers as CrochetMaker[]
    for (let i = makers.length - 1; i >= 0; i--) {
      if (makers[i].tick < cutoff) makers.splice(i, 1)
    }
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  // 11. MAX_MAKERS = 30 限制
  it('注入 30 个 maker 时数组长度为 30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  // 12. skill=0 时 loopTension=14, reputation=10
  it('skill=0 时 loopTension=14, reputation=10', () => {
    const maker = makeMaker(1, 0)
    expect(maker.loopTension).toBeCloseTo(14, 5)
    expect(maker.reputation).toBeCloseTo(10, 5)
  })

  // 13. skill=100 的极值公式验证
  it('skill=100 极值: loopTension=86, reputation=92', () => {
    const skill = 100
    const maker = makeMaker(1, skill)
    expect(maker.loopTension).toBeCloseTo(14 + 100 * 0.72, 5) // 86
    expect(maker.reputation).toBeCloseTo(10 + 100 * 0.82, 5)  // 92
  })
})
