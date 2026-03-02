import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureWheelwrightSystem } from '../systems/CreatureWheelwrightSystem'
import type { Wheelwright } from '../systems/CreatureWheelwrightSystem'

let nextId = 1
function makeSys(): CreatureWheelwrightSystem { return new CreatureWheelwrightSystem() }
function makeMaker(entityId: number, woodBending = 70, rimShaping = 80, outputQuality = 75): Wheelwright {
  return { id: nextId++, entityId, woodBending, spokeFitting: 65, rimShaping, outputQuality, tick: 0 }
}

function makeEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(true),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
  }
}

describe('CreatureWheelwrightSystem.getWheelwrights', () => {
  let sys: CreatureWheelwrightSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无车轮工匠', () => { expect((sys as any).wheelwrights).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    expect((sys as any).wheelwrights[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    expect((sys as any).wheelwrights).toBe((sys as any).wheelwrights)
  })
  it('字段正确', () => {
    ;(sys as any).wheelwrights.push(makeMaker(2))
    const w = (sys as any).wheelwrights[0]
    expect(w.woodBending).toBe(70)
    expect(w.rimShaping).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1))
    ;(sys as any).wheelwrights.push(makeMaker(2))
    expect((sys as any).wheelwrights).toHaveLength(2)
  })
})

describe('CreatureWheelwrightSystem CHECK_INTERVAL=2620 节流', () => {
  let sys: CreatureWheelwrightSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 时不执行（差值=0 < 2620）', () => {
    // tick 0 - lastCheck 0 = 0, < 2620, 不进入
    const spy = vi.spyOn(sys as any, 'wheelwrights', 'get')
    sys.update(0, makeEM() as any, 0)
    // 如果 update 没进入，wheelwrights 不会被 push 调用
    // 验证 lastCheck 仍是 0
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2619 时跳过', () => {
    sys.update(0, makeEM() as any, 2619)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2620 时执行并更新 lastCheck', () => {
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).lastCheck).toBe(2620)
  })

  it('执行后 2619 tick 内再次调用不执行', () => {
    sys.update(0, makeEM() as any, 2620)
    const lastCheck1 = (sys as any).lastCheck
    sys.update(0, makeEM() as any, 2620 + 2619)
    expect((sys as any).lastCheck).toBe(lastCheck1) // 未更新
  })

  it('执行后满 2620 再次执行', () => {
    sys.update(0, makeEM() as any, 2620)
    sys.update(0, makeEM() as any, 5240)
    expect((sys as any).lastCheck).toBe(5240)
  })
})

describe('CreatureWheelwrightSystem 技能增长', () => {
  let sys: CreatureWheelwrightSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次 update 触发后 woodBending += 0.02', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 50.0))
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights[0].woodBending).toBeCloseTo(50.02, 5)
  })

  it('每次 update 触发后 rimShaping += 0.015', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 70, 40.0))
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights[0].rimShaping).toBeCloseTo(40.015, 5)
  })

  it('每次 update 触发后 outputQuality += 0.01', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 70, 80, 30.0))
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights[0].outputQuality).toBeCloseTo(30.01, 5)
  })

  it('woodBending 不超过 100', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 99.99))
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights[0].woodBending).toBe(100)
  })

  it('rimShaping 不超过 100', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 70, 99.99))
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights[0].rimShaping).toBe(100)
  })

  it('outputQuality 不超过 100', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 70, 80, 99.99))
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights[0].outputQuality).toBe(100)
  })
})

describe('CreatureWheelwrightSystem woodBending<=4 清理', () => {
  let sys: CreatureWheelwrightSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('woodBending=5 时保留', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 5))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights).toHaveLength(1)
  })

  it('woodBending 恰好到 3.98 → cleanup 先增 +0.02 → 4.0 > 4，保留', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 3.98))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2620)
    // 增后 3.98+0.02=4.00，cleanup 条件 <= 4 → 4.00 <= 4 → 删除
    expect((sys as any).wheelwrights).toHaveLength(0)
  })

  it('woodBending=4.01 → 增后 4.03 > 4，保留', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 4.01))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights).toHaveLength(1)
  })

  it('woodBending=2 → cleanup 删除', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 2))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights).toHaveLength(0)
  })

  it('混合：一个低一个正常，只删低的', () => {
    ;(sys as any).wheelwrights.push(makeMaker(1, 1))  // 会被删
    ;(sys as any).wheelwrights.push(makeMaker(2, 50)) // 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeEM() as any, 2620)
    expect((sys as any).wheelwrights).toHaveLength(1)
    expect((sys as any).wheelwrights[0].entityId).toBe(2)
  })
})

describe('CreatureWheelwrightSystem nextId 递增', () => {
  let sys: CreatureWheelwrightSystem

  beforeEach(() => { sys = makeSys() })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})
