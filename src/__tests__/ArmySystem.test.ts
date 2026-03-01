import { describe, it, expect, beforeEach } from 'vitest'
import { ArmySystem } from '../systems/ArmySystem'
import type { Army } from '../systems/ArmySystem'

// ArmySystem 的纯查询方法测试：
// - getArmies() → 返回内部 armies Map（直接引用，非快照）
// 通过直接操作私有字段（as any）注入测试数据。

function makeArmySys(): ArmySystem {
  return new ArmySystem()
}

function makeArmy(civId: number, overrides: Partial<Army> = {}): Army {
  return {
    civId,
    soldiers: [],
    state: 'idle',
    targetX: 0,
    targetY: 0,
    targetCivId: -1,
    morale: 100,
    ...overrides,
  }
}

// ── getArmies ─────────────────────────────────────────────────────────────────

describe('ArmySystem.getArmies', () => {
  let sys: ArmySystem

  beforeEach(() => {
    sys = makeArmySys()
  })

  it('初始状态返回空 Map', () => {
    expect(sys.getArmies().size).toBe(0)
  })

  it('注入军队后可查询到', () => {
    const army = makeArmy(1)
    ;sys.getArmies().set(1, army)
    expect(sys.getArmies().size).toBe(1)
    expect(sys.getArmies().get(1)).toBe(army)
  })

  it('多个文明的军队都能查询到', () => {
    ;sys.getArmies().set(1, makeArmy(1))
    ;sys.getArmies().set(2, makeArmy(2, { state: 'marching' }))
    ;sys.getArmies().set(3, makeArmy(3, { state: 'sieging' }))
    expect(sys.getArmies().size).toBe(3)
  })

  it('返回 Map 类型', () => {
    expect(sys.getArmies() instanceof Map).toBe(true)
  })

  it('军队 state 字段可以是所有有效值', () => {
    const states: Army['state'][] = ['idle', 'marching', 'sieging', 'defending']
    states.forEach((state, i) => {
      ;sys.getArmies().set(i, makeArmy(i, { state }))
    })
    const armies = sys.getArmies()
    states.forEach((state, i) => {
      expect(armies.get(i)!.state).toBe(state)
    })
  })

  it('军队的 morale 和 soldiers 字段正确', () => {
    const army = makeArmy(10, { soldiers: [1, 2, 3], morale: 75, state: 'marching' })
    ;sys.getArmies().set(10, army)
    const result = sys.getArmies().get(10)!
    expect(result.soldiers).toHaveLength(3)
    expect(result.morale).toBe(75)
    expect(result.state).toBe('marching')
  })

  it('getArmies 返回的是内部 Map 的直接引用', () => {
    // 外部修改可影响内部（直接引用）
    ;sys.getArmies().set(5, makeArmy(5))
    const ref = sys.getArmies()
    ref.delete(5)
    expect(sys.getArmies().size).toBe(0)
  })
})
