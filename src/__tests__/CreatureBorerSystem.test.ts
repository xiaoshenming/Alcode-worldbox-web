import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBorerSystem } from '../systems/CreatureBorerSystem'
import type { Borer } from '../systems/CreatureBorerSystem'

const CHECK_INTERVAL = 2980

let nextId = 1
function makeSys(): CreatureBorerSystem { return new CreatureBorerSystem() }
function makeBorer(entityId: number): Borer {
  return { id: nextId++, entityId, boringSkill: 30, cuttingDepth: 25, holeConcentricity: 20, toolAlignment: 35, tick: 0 }
}

describe('CreatureBorerSystem.getBorers', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镗孔师', () => { expect((sys as any).borers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).borers.push(makeBorer(1))
    expect((sys as any).borers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).borers.push(makeBorer(1))
    expect((sys as any).borers).toBe((sys as any).borers)
  })

  it('多个全部返回', () => {
    ;(sys as any).borers.push(makeBorer(1))
    ;(sys as any).borers.push(makeBorer(2))
    expect((sys as any).borers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const b = makeBorer(10)
    b.boringSkill = 80; b.cuttingDepth = 75; b.holeConcentricity = 70; b.toolAlignment = 65
    ;(sys as any).borers.push(b)
    const r = (sys as any).borers[0]
    expect(r.boringSkill).toBe(80)
    expect(r.cuttingDepth).toBe(75)
    expect(r.holeConcentricity).toBe(70)
    expect(r.toolAlignment).toBe(65)
  })
})

describe('CreatureBorerSystem CHECK_INTERVAL 节流', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 小于 CHECK_INTERVAL 时不更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick 大于 CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL + 200)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 200)
  })

  it('第二次 tick 未超过间隔时不再更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL + 1)
    // 差值 1 < CHECK_INTERVAL，不更新
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('第二次 tick 超过间隔时再次更新 lastCheck', () => {
    sys.update(1, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreatureBorerSystem 技能递增', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发后 boringSkill 增加 0.02', () => {
    const b = makeBorer(1)
    b.boringSkill = 50
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].boringSkill).toBeCloseTo(50.02)
  })

  it('每次触发后 cuttingDepth 增加 0.015', () => {
    const b = makeBorer(1)
    b.cuttingDepth = 50
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].cuttingDepth).toBeCloseTo(50.015)
  })

  it('每次触发后 toolAlignment 增加 0.01', () => {
    const b = makeBorer(1)
    b.toolAlignment = 50
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].toolAlignment).toBeCloseTo(50.01)
  })

  it('boringSkill 上限为 100，不超过', () => {
    const b = makeBorer(1)
    b.boringSkill = 99.99
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].boringSkill).toBe(100)
  })

  it('toolAlignment 上限为 100，不超过', () => {
    const b = makeBorer(1)
    b.toolAlignment = 99.999
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers[0].toolAlignment).toBe(100)
  })

  it('节流期间技能不递增', () => {
    const b = makeBorer(1)
    b.boringSkill = 50
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).borers[0].boringSkill).toBe(50)
  })
})

describe('CreatureBorerSystem cleanup', () => {
  let sys: CreatureBorerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // 注意：cleanup 先做技能递增再判断，所以初始值需低于 4
  // 例如初始 3.0 → +0.02 = 3.02 ≤ 4，被移除
  it('技能递增后仍 <= 4 的镗孔师被移除（初始值 3.0）', () => {
    const b = makeBorer(1)
    b.boringSkill = 3.0
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    // 3.0 + 0.02 = 3.02 <= 4，被清除
    expect((sys as any).borers).toHaveLength(0)
  })

  it('boringSkill > 4 的镗孔师不被移除', () => {
    const b = makeBorer(1)
    b.boringSkill = 4.01
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(1)
  })

  it('先技能递增后 cleanup：初始值 3.98 递增后 4.00 仍被清除', () => {
    const b = makeBorer(1)
    b.boringSkill = 3.98
    ;(sys as any).borers.push(b)
    sys.update(1, {} as any, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00，仍 <= 4 被清除
    expect((sys as any).borers).toHaveLength(0)
  })

  it('只清除低技能，高技能保留', () => {
    const b1 = makeBorer(1); b1.boringSkill = 3.0   // 递增后 3.02 <= 4 → 被清除
    const b2 = makeBorer(2); b2.boringSkill = 50    // 递增后 50.02 > 4 → 保留
    ;(sys as any).borers.push(b1, b2)
    sys.update(1, {} as any, CHECK_INTERVAL)
    expect((sys as any).borers).toHaveLength(1)
    expect((sys as any).borers[0].entityId).toBe(2)
  })
})
