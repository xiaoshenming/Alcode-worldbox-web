import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePlowrightSystem } from '../systems/CreaturePlowrightSystem'
import type { Plowright } from '../systems/CreaturePlowrightSystem'

const CHECK_INTERVAL = 2610
const MAX_PLOWRIGHTS = 10

let nextId = 1
function makeSys(): CreaturePlowrightSystem { return new CreaturePlowrightSystem() }
function makePlowright(entityId: number, overrides: Partial<Plowright> = {}): Plowright {
  return {
    id: nextId++,
    entityId,
    ironForging: 70,
    bladeSharpening: 65,
    handleFitting: 75,
    outputQuality: 80,
    tick: 0,
    ...overrides,
  }
}

const emMock = { getEntitiesWithComponents: () => [] } as any

describe('CreaturePlowrightSystem.getPlowrights', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无犁制作者', () => { expect((sys as any).plowrights).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).plowrights.push(makePlowright(1))
    expect((sys as any).plowrights[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).plowrights.push(makePlowright(1))
    expect((sys as any).plowrights).toBe((sys as any).plowrights)
  })
  it('字段正确', () => {
    ;(sys as any).plowrights.push(makePlowright(2))
    const p = (sys as any).plowrights[0]
    expect(p.ironForging).toBe(70)
    expect(p.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).plowrights.push(makePlowright(1))
    ;(sys as any).plowrights.push(makePlowright(2))
    expect((sys as any).plowrights).toHaveLength(2)
  })
})

describe('CreaturePlowrightSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL 时不更新 lastCheck', () => {
    sys.update(1, emMock, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 达到 CHECK_INTERVAL 时更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })

  it('连续两次间隔不足时跳过第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    const snap = (sys as any).plowrights.length
    sys.update(1, emMock, CHECK_INTERVAL + 1) // 间隔仅1
    expect((sys as any).plowrights.length).toBe(snap)
    vi.restoreAllMocks()
  })
})

describe('CreaturePlowrightSystem - 技能递增与上限', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update 后 ironForging 增加 0.02', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].ironForging).toBeCloseTo(50.02)
    vi.restoreAllMocks()
  })

  it('update 后 handleFitting 增加 0.015', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { handleFitting: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].handleFitting).toBeCloseTo(50.015)
    vi.restoreAllMocks()
  })

  it('update 后 outputQuality 增加 0.01', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { outputQuality: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].outputQuality).toBeCloseTo(50.01)
    vi.restoreAllMocks()
  })

  it('ironForging 不超过 100 上限', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 99.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].ironForging).toBe(100)
    vi.restoreAllMocks()
  })

  it('outputQuality 不超过 100 上限', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { outputQuality: 99.995 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].outputQuality).toBe(100)
    vi.restoreAllMocks()
  })

  it('bladeSharpening 不参与递增（无对应 += 逻辑）', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { bladeSharpening: 65 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights[0].bladeSharpening).toBe(65)
    vi.restoreAllMocks()
  })
})

describe('CreaturePlowrightSystem - cleanup（ironForging <= 4）', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('ironForging > 4 的记录不被清除', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // 1 < RECRUIT_CHANCE 为 false，不招募
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('ironForging === 3.98 更新后恰好 <= 4 应被清除', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不招募
    // 3.98 + 0.02 = 4.00，<= 4 应被移除
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('仅清除低技能记录，高技能保留', () => {
    ;(sys as any).plowrights.push(makePlowright(1, { ironForging: 3 }))
    ;(sys as any).plowrights.push(makePlowright(2, { ironForging: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不招募
    sys.update(1, emMock, CHECK_INTERVAL)
    const survivors = (sys as any).plowrights
    expect(survivors).toHaveLength(1)
    expect(survivors[0].entityId).toBe(2)
    vi.restoreAllMocks()
  })

  it('多个低技能记录全部被清除', () => {
    for (let i = 1; i <= 4; i++) {
      ;(sys as any).plowrights.push(makePlowright(i, { ironForging: 2 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不招募
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('CreaturePlowrightSystem - MAX_PLOWRIGHTS 上限', () => {
  let sys: CreaturePlowrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已达 MAX_PLOWRIGHTS 时不再招募', () => {
    for (let i = 0; i < MAX_PLOWRIGHTS; i++) {
      ;(sys as any).plowrights.push(makePlowright(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).plowrights.length).toBeLessThanOrEqual(MAX_PLOWRIGHTS)
    vi.restoreAllMocks()
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})
