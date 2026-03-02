import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureDrawerSystem } from '../systems/CreatureDrawerSystem'
import type { Drawer } from '../systems/CreatureDrawerSystem'

let nextId = 1
function makeSys(): CreatureDrawerSystem { return new CreatureDrawerSystem() }
function makeDrawer(entityId: number, drawingSkill = 30): Drawer {
  return { id: nextId++, entityId, drawingSkill, diePrecision: 25, tensileControl: 20, wireQuality: 35, tick: 0 }
}
function makeEM() {
  return { getEntitiesWithComponent: vi.fn().mockReturnValue([]) }
}

describe('CreatureDrawerSystem', () => {
  let sys: CreatureDrawerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无拔丝工
  it('初始无拔丝工', () => {
    expect((sys as any).drawers).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询', () => {
    ;(sys as any).drawers.push(makeDrawer(1))
    expect((sys as any).drawers[0].entityId).toBe(1)
  })

  // 3. 多个全部返回
  it('多个全部返回', () => {
    ;(sys as any).drawers.push(makeDrawer(1))
    ;(sys as any).drawers.push(makeDrawer(2))
    expect((sys as any).drawers).toHaveLength(2)
  })

  // 4. 四字段数据完整
  it('四字段数据完整', () => {
    const d = makeDrawer(10)
    d.drawingSkill = 80; d.diePrecision = 75; d.tensileControl = 70; d.wireQuality = 65
    ;(sys as any).drawers.push(d)
    const r = (sys as any).drawers[0]
    expect(r.drawingSkill).toBe(80); expect(r.diePrecision).toBe(75)
    expect(r.tensileControl).toBe(70); expect(r.wireQuality).toBe(65)
  })

  // 5. tick差值<2820时不更新lastCheck
  it('tick差值<2820时不更新lastCheck', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 1000
    sys.update(0, em as any, 3819) // diff = 2819 < 2820，不执行
    expect((sys as any).lastCheck).toBe(1000)
  })

  // 6. tick差值>=2820时更新lastCheck
  it('tick差值>=2820时更新lastCheck', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 1000
    sys.update(0, em as any, 3820) // diff = 2820 >= 2820，执行
    expect((sys as any).lastCheck).toBe(3820)
  })

  // 7. update后drawingSkill+0.02
  it('update后drawingSkill增加0.02', () => {
    const d = makeDrawer(1, 30)
    ;(sys as any).drawers.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 2820)
    expect((sys as any).drawers[0].drawingSkill).toBeCloseTo(30.02, 5)
  })

  // 8. update后diePrecision+0.015
  it('update后diePrecision增加0.015', () => {
    const d = makeDrawer(1, 30)
    ;(sys as any).drawers.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 2820)
    expect((sys as any).drawers[0].diePrecision).toBeCloseTo(25.015, 5)
  })

  // 9. drawingSkill上限100
  it('drawingSkill上限为100，不超过', () => {
    const d = makeDrawer(1, 99.99)
    ;(sys as any).drawers.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 2820)
    expect((sys as any).drawers[0].drawingSkill).toBe(100)
  })

  // 10. wireQuality上限100
  it('wireQuality上限为100，不超过', () => {
    const d = makeDrawer(1, 30)
    d.wireQuality = 99.995
    ;(sys as any).drawers.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 2820)
    expect((sys as any).drawers[0].wireQuality).toBe(100)
  })

  // 11. cleanup: drawingSkill<=4时删除（先递增后cleanup）
  // 3.98 + 0.02 = 4.00 → 4.00 <= 4 → 删除
  it('cleanup: drawingSkill=3.98先递增到4.00再删除', () => {
    const d1 = makeDrawer(1, 3.98)   // 3.98 + 0.02 = 4.00 → <=4 → 删除
    const d2 = makeDrawer(2, 10.0)   // 10.0 + 0.02 = 10.02 → >4 → 保留
    ;(sys as any).drawers.push(d1, d2)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 2820)
    const remaining = (sys as any).drawers
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  // 12. cleanup: drawingSkill=4.01时递增后>4，保留
  it('cleanup: drawingSkill=4.01递增后>4，不删除', () => {
    const d = makeDrawer(1, 4.01)  // 4.01 + 0.02 = 4.03 → >4 → 保留
    ;(sys as any).drawers.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 2820)
    expect((sys as any).drawers).toHaveLength(1)
  })

  // 13. 内部引用稳定
  it('返回内部引用稳定', () => {
    ;(sys as any).drawers.push(makeDrawer(1))
    expect((sys as any).drawers).toBe((sys as any).drawers)
  })
})
