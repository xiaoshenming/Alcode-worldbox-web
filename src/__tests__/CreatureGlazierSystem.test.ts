import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureGlazierSystem } from '../systems/CreatureGlazierSystem'
import type { Glazier } from '../systems/CreatureGlazierSystem'

let nextId = 1
function makeSys(): CreatureGlazierSystem { return new CreatureGlazierSystem() }
function makeGlazier(entityId: number, overrides: Partial<Glazier> = {}): Glazier {
  return {
    id: nextId++, entityId,
    glassCutting: 50, leadWorking: 60, designPrecision: 70, outputQuality: 80, tick: 0,
    ...overrides,
  }
}

/** 让 sys 跳过 tick 门槛：设 lastCheck=0，传 tick=CHECK_INTERVAL(2600) */
function triggerUpdate(sys: CreatureGlazierSystem, tick = 2600) {
  const em = {} as any
  ;(sys as any).lastCheck = 0
  sys.update(0, em, tick)
}

describe('CreatureGlazierSystem', () => {
  let sys: CreatureGlazierSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无玻璃工', () => {
    expect((sys as any).glaziers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询 entityId', () => {
    ;(sys as any).glaziers.push(makeGlazier(5))
    expect((sys as any).glaziers[0].entityId).toBe(5)
  })

  // 3. 多个全部返回
  it('多个记录全部返回', () => {
    ;(sys as any).glaziers.push(makeGlazier(1))
    ;(sys as any).glaziers.push(makeGlazier(2))
    ;(sys as any).glaziers.push(makeGlazier(3))
    expect((sys as any).glaziers).toHaveLength(3)
  })

  // 4. 四字段数据完整（glassCutting/designPrecision/leadWorking/outputQuality）
  it('四字段数据完整', () => {
    const g = makeGlazier(10, { glassCutting: 90, leadWorking: 85, designPrecision: 80, outputQuality: 75 })
    ;(sys as any).glaziers.push(g)
    const r = (sys as any).glaziers[0] as Glazier
    expect(r.glassCutting).toBe(90)
    expect(r.leadWorking).toBe(85)
    expect(r.designPrecision).toBe(80)
    expect(r.outputQuality).toBe(75)
  })

  // 5. tick 差 < 2600 不更新 lastCheck
  it('tick 差 < 2600 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 3000
    const em = {} as any
    sys.update(0, em, 3000 + 2599)
    expect((sys as any).lastCheck).toBe(3000)
  })

  // 6. tick 差 >= 2600 更新 lastCheck
  it('tick 差 >= 2600 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })

  // 7. update 后 glassCutting +0.02
  it('update 后 glassCutting 增加 0.02', () => {
    ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 50 }))
    triggerUpdate(sys)
    expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(50.02, 5)
  })

  // 8. update 后 designPrecision +0.015
  it('update 后 designPrecision 增加 0.015', () => {
    ;(sys as any).glaziers.push(makeGlazier(1, { designPrecision: 70 }))
    triggerUpdate(sys)
    expect((sys as any).glaziers[0].designPrecision).toBeCloseTo(70.015, 5)
  })

  // 9. glassCutting 上限 100
  it('glassCutting 不超过 100', () => {
    ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 99.99 }))
    triggerUpdate(sys)
    expect((sys as any).glaziers[0].glassCutting).toBeLessThanOrEqual(100)
    expect((sys as any).glaziers[0].glassCutting).toBeCloseTo(100, 5)
  })

  // 10. cleanup: glassCutting <= 4 时删除（3.98+0.02=4.00 → 被删）
  it('cleanup: glassCutting <= 4 时删除（边界 3.98→4.00）', () => {
    ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 3.98 }))
    ;(sys as any).glaziers.push(makeGlazier(2, { glassCutting: 5 }))
    triggerUpdate(sys)
    const remaining = (sys as any).glaziers as Glazier[]
    expect(remaining.some(g => g.entityId === 1)).toBe(false)
    expect(remaining.some(g => g.entityId === 2)).toBe(true)
  })

  // 11. cleanup: glassCutting 明显低于 4 时删除
  it('cleanup: glassCutting=1 时删除', () => {
    ;(sys as any).glaziers.push(makeGlazier(1, { glassCutting: 1 }))
    triggerUpdate(sys)
    expect((sys as any).glaziers).toHaveLength(0)
  })

  // 12. outputQuality 上限 100
  it('outputQuality 不超过 100', () => {
    ;(sys as any).glaziers.push(makeGlazier(1, { outputQuality: 99.995 }))
    triggerUpdate(sys)
    expect((sys as any).glaziers[0].outputQuality).toBeLessThanOrEqual(100)
  })

  // 13. update 后 outputQuality +0.01
  it('update 后 outputQuality 增加 0.01', () => {
    ;(sys as any).glaziers.push(makeGlazier(1, { outputQuality: 80 }))
    triggerUpdate(sys)
    expect((sys as any).glaziers[0].outputQuality).toBeCloseTo(80.01, 5)
  })
})
