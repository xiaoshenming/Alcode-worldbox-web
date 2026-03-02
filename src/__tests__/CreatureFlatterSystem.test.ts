import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFlatterSystem } from '../systems/CreatureFlatterSystem'
import type { Flatter } from '../systems/CreatureFlatterSystem'

let nextId = 1
function makeSys(): CreatureFlatterSystem { return new CreatureFlatterSystem() }
function makeFlatter(entityId: number, flattingSkill = 50): Flatter {
  return {
    id: nextId++,
    entityId,
    flattingSkill,
    rollingPressure: 60,
    sheetUniformity: 70,
    thicknessControl: 80,
    tick: 0,
  }
}

describe('CreatureFlatterSystem', () => {
  let sys: CreatureFlatterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // ---- 静态数据测试 ----
  it('初始无压平工', () => {
    expect((sys as any).flatters).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).flatters.push(makeFlatter(1))
    expect((sys as any).flatters[0].entityId).toBe(1)
  })

  it('多个全部返回', () => {
    ;(sys as any).flatters.push(makeFlatter(1))
    ;(sys as any).flatters.push(makeFlatter(2))
    expect((sys as any).flatters).toHaveLength(2)
  })

  it('四字段数据完整（flattingSkill/rollingPressure/sheetUniformity/thicknessControl）', () => {
    const f = makeFlatter(10)
    f.flattingSkill = 90; f.rollingPressure = 85; f.sheetUniformity = 80; f.thicknessControl = 75
    ;(sys as any).flatters.push(f)
    const r = (sys as any).flatters[0]
    expect(r.flattingSkill).toBe(90)
    expect(r.rollingPressure).toBe(85)
    expect(r.sheetUniformity).toBe(80)
    expect(r.thicknessControl).toBe(75)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ---- update / tick 控制测试 ----
  it('tick差值 < CHECK_INTERVAL(2910) 时不更新 lastCheck', () => {
    const em = {} as any
    sys.update(1, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 >= CHECK_INTERVAL(2910) 时更新 lastCheck', () => {
    const em = {} as any
    sys.update(1, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })

  // ---- 技能增长测试 ----
  it('update 后 flattingSkill 增加 0.02', () => {
    const f = makeFlatter(1, 50)
    ;(sys as any).flatters.push(f)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)
    expect((sys as any).flatters[0].flattingSkill).toBeCloseTo(50.02)
  })

  it('update 后 rollingPressure 增加 0.015', () => {
    const f = makeFlatter(1, 50)
    f.rollingPressure = 40
    ;(sys as any).flatters.push(f)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)
    expect((sys as any).flatters[0].rollingPressure).toBeCloseTo(40.015)
  })

  it('update 后 thicknessControl 增加 0.01', () => {
    const f = makeFlatter(1, 50)
    f.thicknessControl = 30
    ;(sys as any).flatters.push(f)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)
    expect((sys as any).flatters[0].thicknessControl).toBeCloseTo(30.01)
  })

  it('flattingSkill 上限为 100（不超过）', () => {
    const f = makeFlatter(1, 99.99)
    ;(sys as any).flatters.push(f)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)
    expect((sys as any).flatters[0].flattingSkill).toBe(100)
  })

  it('rollingPressure 上限为 100（不超过）', () => {
    const f = makeFlatter(1, 50)
    f.rollingPressure = 99.99
    ;(sys as any).flatters.push(f)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)
    expect((sys as any).flatters[0].rollingPressure).toBe(100)
  })

  // ---- cleanup 逻辑测试 ----
  // 先递增后 cleanup：flattingSkill=3.98 -> 3.98+0.02=4.00 -> 4.00 <= 4 -> 删除
  it('cleanup: flattingSkill 递增到 <= 4 时被删除（3.98 → 4.00 → 删除）', () => {
    const f = makeFlatter(1, 3.98)
    ;(sys as any).flatters.push(f)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)
    expect((sys as any).flatters).toHaveLength(0)
  })

  it('cleanup: flattingSkill > 4 时保留（5 → 5.02 → 保留）', () => {
    const f = makeFlatter(1, 5)
    ;(sys as any).flatters.push(f)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)
    expect((sys as any).flatters).toHaveLength(1)
  })

  it('cleanup: entityId=1 删除，entityId=2 保留（混合场景）', () => {
    const f1 = makeFlatter(1, 3.98) // 3.98+0.02=4.00 -> 删除
    const f2 = makeFlatter(2, 50)   // 保留
    ;(sys as any).flatters.push(f1)
    ;(sys as any).flatters.push(f2)
    const em = {} as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 3000)
    expect((sys as any).flatters).toHaveLength(1)
    expect((sys as any).flatters[0].entityId).toBe(2)
  })
})
