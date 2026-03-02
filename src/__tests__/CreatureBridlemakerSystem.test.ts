import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureBridlemakerSystem } from '../systems/CreatureBridlemakerSystem'
import type { Bridlemaker } from '../systems/CreatureBridlemakerSystem'

let nextId = 1
function makeSys(): CreatureBridlemakerSystem { return new CreatureBridlemakerSystem() }
function makeBridlemaker(entityId: number, overrides: Partial<Bridlemaker> = {}): Bridlemaker {
  return {
    id: nextId++, entityId,
    leatherBraiding: 30, bitForging: 25, reinCrafting: 20, outputQuality: 35, tick: 0,
    ...overrides
  }
}

const noopEm = {} as any

describe('CreatureBridlemakerSystem', () => {
  let sys: CreatureBridlemakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // --- 基础存在性 ---
  it('初始无马具师', () => {
    expect((sys as any).bridlemakers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1))
    expect((sys as any).bridlemakers[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1))
    ;(sys as any).bridlemakers.push(makeBridlemaker(2))
    expect((sys as any).bridlemakers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBridlemaker(10, { leatherBraiding: 80, bitForging: 75, reinCrafting: 70, outputQuality: 65 })
    ;(sys as any).bridlemakers.push(b)
    const r = (sys as any).bridlemakers[0]
    expect(r.leatherBraiding).toBe(80)
    expect(r.bitForging).toBe(75)
    expect(r.reinCrafting).toBe(70)
    expect(r.outputQuality).toBe(65)
  })

  // --- tick 节流逻辑 ---
  it('tick 差值 < 2600 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 差值 >= 2600 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })

  it('tick 差值恰好等于 2600 时触发更新', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, noopEm, 3600)
    expect((sys as any).lastCheck).toBe(3600)
  })

  // --- 技能增长 ---
  it('update 后 leatherBraiding +0.02', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].leatherBraiding).toBeCloseTo(50.02)
  })

  it('update 后 reinCrafting +0.015', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { reinCrafting: 40 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].reinCrafting).toBeCloseTo(40.015)
  })

  it('update 后 outputQuality +0.01', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { outputQuality: 60 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].outputQuality).toBeCloseTo(60.01)
  })

  it('leatherBraiding 上限为 100（99.99 + 0.02 = 100）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 99.99 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers[0].leatherBraiding).toBe(100)
  })

  // --- cleanup 逻辑 ---
  it('leatherBraiding <= 4 时被删除（先递增后 cleanup，3.98 + 0.02 = 4.00 恰好删除）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 3.98 }))
    ;(sys as any).bridlemakers.push(makeBridlemaker(2, { leatherBraiding: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    const remaining = (sys as any).bridlemakers
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  it('leatherBraiding > 4 时不被删除（5.0 + 0.02 = 5.02 > 4）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 5.0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers).toHaveLength(1)
  })

  it('leatherBraiding 远低于 4 时也被删除（3.0 + 0.02 = 3.02 <= 4）', () => {
    ;(sys as any).bridlemakers.push(makeBridlemaker(1, { leatherBraiding: 3.0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noopEm, 2600)
    expect((sys as any).bridlemakers).toHaveLength(0)
  })
})
