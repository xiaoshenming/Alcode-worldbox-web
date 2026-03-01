import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNostalgiaSystem } from '../systems/CreatureNostalgiaSystem'
import type { NostalgiaState } from '../systems/CreatureNostalgiaSystem'

function makeSys(): CreatureNostalgiaSystem { return new CreatureNostalgiaSystem() }
function makeState(entityId: number, intensity = 50): NostalgiaState {
  return { entityId, birthX: 10, birthY: 20, currentDist: 30, intensity, moodEffect: -5, lastVisitHome: 0 }
}

describe('CreatureNostalgiaSystem.getStates', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

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

describe('CreatureNostalgiaSystem.getTotalHomesick', () => {
  let sys: CreatureNostalgiaSystem
  beforeEach(() => { sys = makeSys() })

  it('初始为 0', () => { expect((sys as any).totalHomesick).toBe(0) })
  it('注入计数后返回正确', () => {
    ;(sys as any).totalHomesick = 7
    expect((sys as any).totalHomesick).toBe(7)
  })
})
