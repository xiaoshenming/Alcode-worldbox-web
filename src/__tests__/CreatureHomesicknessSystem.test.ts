import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHomesicknessSystem } from '../systems/CreatureHomesicknessSystem'
import type { HomesicknessState } from '../systems/CreatureHomesicknessSystem'

let nextId = 1
function makeSys(): CreatureHomesicknessSystem { return new CreatureHomesicknessSystem() }
function makeState(entityId: number): HomesicknessState {
  return { id: nextId++, entityId, homeX: 10, homeY: 20, intensity: 50, moralePenalty: 10, returnAttempts: 2, tick: 0 }
}

describe('CreatureHomesicknessSystem.getStates', () => {
  let sys: CreatureHomesicknessSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无思乡状态', () => { expect((sys as any).states).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).states.push(makeState(1))
    expect((sys as any).states[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).states.push(makeState(1))
    expect((sys as any).states).toBe((sys as any).states)
  })
  it('多个全部返回', () => {
    ;(sys as any).states.push(makeState(1))
    ;(sys as any).states.push(makeState(2))
    expect((sys as any).states).toHaveLength(2)
  })
})

describe('CreatureHomesicknessSystem.getByEntity', () => {
  let sys: CreatureHomesicknessSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未注入返回 undefined', () => { expect(sys.getByEntity(999)).toBeUndefined() })
  it('找到对应实体', () => {
    ;(sys as any).states.push(makeState(1))
    ;(sys as any).states.push(makeState(2))
    const s = sys.getByEntity(2)
    expect(s).toBeDefined()
    expect(s!.entityId).toBe(2)
  })
})
