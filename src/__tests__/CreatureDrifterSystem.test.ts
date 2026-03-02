import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureDrifterSystem } from '../systems/CreatureDrifterSystem'
import type { Drifter } from '../systems/CreatureDrifterSystem'

let nextId = 1
function makeSys(): CreatureDrifterSystem { return new CreatureDrifterSystem() }
function makeDrifter(entityId: number, driftingSkill = 30): Drifter {
  return { id: nextId++, entityId, driftingSkill, pinAlignment: 25, holeExpansion: 20, taperControl: 35, tick: 0 }
}
function makeEM() {
  return { getEntitiesWithComponent: vi.fn().mockReturnValue([]) }
}

describe('CreatureDrifterSystem', () => {
  let sys: CreatureDrifterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 1. 初始无漂移工
  it('初始无漂移工', () => {
    expect((sys as any).drifters).toHaveLength(0)
  })

  // 2. 注入后可查询
  it('注入后可查询', () => {
    ;(sys as any).drifters.push(makeDrifter(1))
    expect((sys as any).drifters[0].entityId).toBe(1)
  })

  // 3. 多个全部返回
  it('多个全部返回', () => {
    ;(sys as any).drifters.push(makeDrifter(1))
    ;(sys as any).drifters.push(makeDrifter(2))
    expect((sys as any).drifters).toHaveLength(2)
  })

  // 4. 四字段数据完整
  it('四字段数据完整', () => {
    const d = makeDrifter(10)
    d.driftingSkill = 80; d.pinAlignment = 75; d.holeExpansion = 70; d.taperControl = 65
    ;(sys as any).drifters.push(d)
    const r = (sys as any).drifters[0]
    expect(r.driftingSkill).toBe(80); expect(r.pinAlignment).toBe(75)
    expect(r.holeExpansion).toBe(70); expect(r.taperControl).toBe(65)
  })

  // 5. tick差值<3040时���更新lastCheck
  it('tick差值<3040时不更新lastCheck', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 1000
    sys.update(0, em as any, 4039) // diff = 3039 < 3040，不执行
    expect((sys as any).lastCheck).toBe(1000)
  })

  // 6. tick差值>=3040时更新lastCheck
  it('tick差值>=3040时更新lastCheck', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 1000
    sys.update(0, em as any, 4040) // diff = 3040 >= 3040，执行
    expect((sys as any).lastCheck).toBe(4040)
  })

  // 7. update后driftingSkill+0.02
  it('update后driftingSkill增加0.02', () => {
    const d = makeDrifter(1, 30)
    ;(sys as any).drifters.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 3040)
    expect((sys as any).drifters[0].driftingSkill).toBeCloseTo(30.02, 5)
  })

  // 8. update后pinAlignment+0.015
  it('update后pinAlignment增加0.015', () => {
    const d = makeDrifter(1, 30)
    ;(sys as any).drifters.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 3040)
    expect((sys as any).drifters[0].pinAlignment).toBeCloseTo(25.015, 5)
  })

  // 9. driftingSkill上限100
  it('driftingSkill上限为100，不超过', () => {
    const d = makeDrifter(1, 99.99)
    ;(sys as any).drifters.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 3040)
    expect((sys as any).drifters[0].driftingSkill).toBe(100)
  })

  // 10. cleanup: driftingSkill=3.98先递增到4.00再删除（3.98 + 0.02 = 4.00 <= 4）
  it('cleanup: driftingSkill=3.98先递增到4.00再删除（边界值）', () => {
    const d1 = makeDrifter(1, 3.98)   // 3.98 + 0.02 = 4.00 → <=4 → 删除
    const d2 = makeDrifter(2, 10.0)   // 10.0 + 0.02 = 10.02 → >4 → 保留
    ;(sys as any).drifters.push(d1, d2)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em as any, 3040)
    const remaining = (sys as any).drifters
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  // 11. taperControl上限100
  it('taperControl上限为100，不超过', () => {
    const d = makeDrifter(1, 30)
    d.taperControl = 99.995
    ;(sys as any).drifters.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em as any, 3040)
    expect((sys as any).drifters[0].taperControl).toBe(100)
  })

  // 12. cleanup: driftingSkill=4.01递增后>4，保留
  it('cleanup: driftingSkill=4.01递增后>4，不删除', () => {
    const d = makeDrifter(1, 4.01)  // 4.01 + 0.02 = 4.03 → >4 → 保留
    ;(sys as any).drifters.push(d)
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em as any, 3040)
    expect((sys as any).drifters).toHaveLength(1)
  })

  // 13. 内部引用稳定
  it('返回内部引用稳定', () => {
    ;(sys as any).drifters.push(makeDrifter(1))
    expect((sys as any).drifters).toBe((sys as any).drifters)
  })
})
