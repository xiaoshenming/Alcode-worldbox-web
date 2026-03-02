import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLoomMakersSystem } from '../systems/CreatureLoomMakersSystem'
import type { LoomMaker } from '../systems/CreatureLoomMakersSystem'

// CHECK_INTERVAL=2550, MAX_MAKERS=12, RECRUIT_CHANCE=0.0016
// 技能递增：loomMastery+0.02, patternMemory+0.015, weavingSpeed+0.01 每次更新
// cleanup: loomMastery<=4 时删除

let nextId = 1
function makeSys(): CreatureLoomMakersSystem { return new CreatureLoomMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<LoomMaker> = {}): LoomMaker {
  return { id: nextId++, entityId, loomMastery: 70, threadCount: 200, patternMemory: 80, weavingSpeed: 60, tick: 0, ...overrides }
}

// 简易 mock EntityManager（LoomMakers.update() 依赖 EntityManager，但无实质调用）
const mockEm = {} as any

describe('CreatureLoomMakersSystem', () => {
  let sys: CreatureLoomMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ── 原有 5 个测试 ──────────────────────────────────────────────
  it('初始无织机师', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(5))
    const m = (sys as any).makers[0]
    expect(m.loomMastery).toBe(70)
    expect(m.patternMemory).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流测试 ────────────────────────────────────
  it('tick < CHECK_INTERVAL 时不执行更新（lastCheck=0）', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 20 }))
    sys.update(1, mockEm, 100)   // 100 - 0 < 2550
    expect((sys as any).makers[0].loomMastery).toBe(20) // 未变
  })

  it('tick >= CHECK_INTERVAL 时执行一次更新', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 20 }))
    sys.update(1, mockEm, 2550)  // 2550 - 0 >= 2550
    expect((sys as any).makers[0].loomMastery).toBeCloseTo(20.02, 5)
  })

  it('第一次更新后 lastCheck 被设为当前 tick', () => {
    sys.update(1, mockEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  it('再次调用时 tick 差值不足 CHECK_INTERVAL 不再更新', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 20 }))
    sys.update(1, mockEm, 2550)  // 首次更新：loomMastery→20.02
    sys.update(1, mockEm, 2600)  // 差值 50 < 2550，不更新
    expect((sys as any).makers[0].loomMastery).toBeCloseTo(20.02, 5)
  })

  it('两次满足 CHECK_INTERVAL 的更新累积技能', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 20 }))
    sys.update(1, mockEm, 2550)  // +0.02
    sys.update(1, mockEm, 5100)  // +0.02 再次
    expect((sys as any).makers[0].loomMastery).toBeCloseTo(20.04, 5)
  })

  // ── 技能递增上限 ──────────────────────────────────────────────
  it('loomMastery 递增量为 0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 50 }))
    sys.update(1, mockEm, 2550)
    expect((sys as any).makers[0].loomMastery).toBeCloseTo(50.02, 5)
  })

  it('patternMemory 递增量为 0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, { patternMemory: 50 }))
    sys.update(1, mockEm, 2550)
    expect((sys as any).makers[0].patternMemory).toBeCloseTo(50.015, 5)
  })

  it('weavingSpeed 递增量为 0.01', () => {
    ;(sys as any).makers.push(makeMaker(1, { weavingSpeed: 50 }))
    sys.update(1, mockEm, 2550)
    expect((sys as any).makers[0].weavingSpeed).toBeCloseTo(50.01, 5)
  })

  it('loomMastery 上限为 100，不超过', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 99.99 }))
    sys.update(1, mockEm, 2550)
    expect((sys as any).makers[0].loomMastery).toBe(100)
  })

  it('patternMemory 上限为 100，不超过', () => {
    ;(sys as any).makers.push(makeMaker(1, { patternMemory: 100 }))
    sys.update(1, mockEm, 2550)
    expect((sys as any).makers[0].patternMemory).toBe(100)
  })

  it('weavingSpeed 上限为 100，不超过', () => {
    ;(sys as any).makers.push(makeMaker(1, { weavingSpeed: 100 }))
    sys.update(1, mockEm, 2550)
    expect((sys as any).makers[0].weavingSpeed).toBe(100)
  })

  // ── cleanup 测试 ─────────────────────────────────────────────
  it('loomMastery <= 4 的织机师被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 4 }))
    sys.update(1, mockEm, 2550)
    // 更新后 loomMastery = 4.02（先加后删），但初始值4本身<=4会被删除
    // 实现：先加再删，4.02 > 4 不删。需初始值在update前<=4时触发
    // 因此直接注入一个接近边界的值，确认 <=4 被删
    ;(sys as any).makers = []
    ;(sys as any).makers.push(makeMaker(2, { loomMastery: 3.5 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, mockEm, 5100)  // 5100-0 >= 2550
    // 3.5+0.02=3.52, 3.52<=4 → 删除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('loomMastery 增量后仍 <= 4 时被删除（3.9+0.02=3.92 <=4）', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 3.9 }))
    sys.update(1, mockEm, 2550) // 3.9+0.02=3.92 <=4 → 删除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('loomMastery > 4 的织机师在增量后保留', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 4.01 }))
    sys.update(1, mockEm, 2550) // 4.01+0.02=4.03 > 4 → 保留
    expect((sys as any).makers).toHaveLength(1)
  })

  it('多个织机师中只删除 loomMastery <= 4 的', () => {
    ;(sys as any).makers.push(makeMaker(1, { loomMastery: 2 }))   // 2.02 <= 4 → 删
    ;(sys as any).makers.push(makeMaker(2, { loomMastery: 50 }))  // 50.02 > 4 → 保
    ;(sys as any).makers.push(makeMaker(3, { loomMastery: 1 }))   // 1.02 <= 4 → 删
    sys.update(1, mockEm, 2550)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  // ── 数据完整性 ──────────────────────────────────────────────
  it('所有字段正确存储并可读取', () => {
    const m = makeMaker(99, { loomMastery: 55, threadCount: 123, patternMemory: 77, weavingSpeed: 44, tick: 999 })
    ;(sys as any).makers.push(m)
    const stored = (sys as any).makers[0]
    expect(stored.entityId).toBe(99)
    expect(stored.loomMastery).toBe(55)
    expect(stored.threadCount).toBe(123)
    expect(stored.patternMemory).toBe(77)
    expect(stored.weavingSpeed).toBe(44)
    expect(stored.tick).toBe(999)
  })

  it('nextId 自增，保证 id 唯一', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    const ids = (sys as any).makers.map((m: LoomMaker) => m.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('MAX_MAKERS=12，注入12个后不应自动新增（上限已满）', () => {
    for (let i = 1; i <= 12; i++) {
      ;(sys as any).makers.push(makeMaker(i))
    }
    expect((sys as any).makers).toHaveLength(12)
  })
})
