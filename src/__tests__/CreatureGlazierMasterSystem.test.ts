import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureGlazierMasterSystem } from '../systems/CreatureGlazierMasterSystem'
import type { GlazierMaster } from '../systems/CreatureGlazierMasterSystem'

let nextId = 1
function makeSys(): CreatureGlazierMasterSystem { return new CreatureGlazierMasterSystem() }
function makeMaster(entityId: number, overrides: Partial<GlazierMaster> = {}): GlazierMaster {
  return {
    id: nextId++, entityId,
    glassCutting: 50, leadWork: 60, colorMixing: 70, outputQuality: 80, tick: 0,
    ...overrides,
  }
}

/** 让 sys 跳过 tick 门槛：设 lastCheck=0，传 tick=CHECK_INTERVAL(2670) */
function triggerUpdate(sys: CreatureGlazierMasterSystem, tick = 2670) {
  const em = {} as any
  ;(sys as any).lastCheck = 0
  sys.update(0, em, tick)
}

describe('CreatureGlazierMasterSystem', () => {
  let sys: CreatureGlazierMasterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无记录
  it('初始无玻璃大师', () => {
    expect((sys as any).masters).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询 entityId', () => {
    ;(sys as any).masters.push(makeMaster(7))
    expect((sys as any).masters[0].entityId).toBe(7)
  })

  // 3. 多个全部返回
  it('多个记录全部返回', () => {
    ;(sys as any).masters.push(makeMaster(1))
    ;(sys as any).masters.push(makeMaster(2))
    ;(sys as any).masters.push(makeMaster(3))
    expect((sys as any).masters).toHaveLength(3)
  })

  // 4. 四字段数据完整
  it('四字段数据完整', () => {
    const m = makeMaster(10, { glassCutting: 90, leadWork: 85, colorMixing: 80, outputQuality: 75 })
    ;(sys as any).masters.push(m)
    const r = (sys as any).masters[0] as GlazierMaster
    expect(r.glassCutting).toBe(90)
    expect(r.leadWork).toBe(85)
    expect(r.colorMixing).toBe(80)
    expect(r.outputQuality).toBe(75)
  })

  // 5. tick 差 < 2670 不更新 lastCheck（em 为空对象，不会崩溃）
  it('tick 差 < 2670 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    const em = {} as any
    sys.update(0, em, 5000 + 2669)
    expect((sys as any).lastCheck).toBe(5000)
  })

  // 6. tick 差 >= 2670 更新 lastCheck
  it('tick 差 >= 2670 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    const em = {} as any
    sys.update(0, em, 2670)
    expect((sys as any).lastCheck).toBe(2670)
  })

  // 7. update 后 glassCutting +0.02
  it('update 后 glassCutting 增加 0.02', () => {
    ;(sys as any).masters.push(makeMaster(1, { glassCutting: 50 }))
    triggerUpdate(sys)
    expect((sys as any).masters[0].glassCutting).toBeCloseTo(50.02, 5)
  })

  // 8. update 后 colorMixing +0.015
  it('update 后 colorMixing 增加 0.015', () => {
    ;(sys as any).masters.push(makeMaster(1, { colorMixing: 70 }))
    triggerUpdate(sys)
    expect((sys as any).masters[0].colorMixing).toBeCloseTo(70.015, 5)
  })

  // 9. glassCutting 上限 100
  it('glassCutting 不超过 100', () => {
    ;(sys as any).masters.push(makeMaster(1, { glassCutting: 99.99 }))
    triggerUpdate(sys)
    expect((sys as any).masters[0].glassCutting).toBeLessThanOrEqual(100)
    expect((sys as any).masters[0].glassCutting).toBeCloseTo(100, 5)
  })

  // 10. cleanup: glassCutting <= 4 时删除（先递增后 cleanup，3.98+0.02=4.00 → 被删）
  it('cleanup: glassCutting <= 4 时删除（边界 3.98→4.00）', () => {
    // entityId=1: glassCutting=3.98，+0.02=4.00 → 恰好等于4 → 被删
    // entityId=2: glassCutting=5，+0.02=5.02 → 保留
    ;(sys as any).masters.push(makeMaster(1, { glassCutting: 3.98 }))
    ;(sys as any).masters.push(makeMaster(2, { glassCutting: 5 }))
    triggerUpdate(sys)
    const remaining = (sys as any).masters as GlazierMaster[]
    expect(remaining.some(m => m.entityId === 1)).toBe(false)
    expect(remaining.some(m => m.entityId === 2)).toBe(true)
  })

  // 11. cleanup: glassCutting 明显低于 4 时删除
  it('cleanup: glassCutting=2 时删除', () => {
    ;(sys as any).masters.push(makeMaster(1, { glassCutting: 2 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 阻断spawn(RECRUIT_CHANCE=0.0013)
    triggerUpdate(sys)
    vi.restoreAllMocks()
    expect((sys as any).masters).toHaveLength(0)
  })

  // 12. outputQuality 上限 100
  it('outputQuality 不超过 100', () => {
    ;(sys as any).masters.push(makeMaster(1, { outputQuality: 99.995 }))
    triggerUpdate(sys)
    expect((sys as any).masters[0].outputQuality).toBeLessThanOrEqual(100)
  })
})
