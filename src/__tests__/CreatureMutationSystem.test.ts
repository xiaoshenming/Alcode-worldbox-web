import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMutationSystem } from '../systems/CreatureMutationSystem'
import type { Mutation, MutationType } from '../systems/CreatureMutationSystem'

function makeSys(): CreatureMutationSystem { return new CreatureMutationSystem() }
function makeMutation(type: MutationType = 'strength'): Mutation {
  return { type, magnitude: 0.5, tick: 0, magnitudeStr: '50', displayStr: `* Enhanced Strength (50%)` }
}

describe('CreatureMutationSystem.getMutations', () => {
  let sys: CreatureMutationSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回空数组', () => { expect(sys.getMutations(999)).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).mutations.set(1, [makeMutation('speed')])
    expect(sys.getMutations(1)).toHaveLength(1)
    expect(sys.getMutations(1)[0].type).toBe('speed')
  })
  it('支持所有 5 种突变类型', () => {
    const types: MutationType[] = ['strength', 'speed', 'resilience', 'gigantism', 'bioluminescence']
    ;(sys as any).mutations.set(1, types.map(t => makeMutation(t)))
    expect(sys.getMutations(1)).toHaveLength(5)
    types.forEach((t, i) => { expect(sys.getMutations(1)[i].type).toBe(t) })
  })
})

describe('CreatureMutationSystem.hasMutation', () => {
  let sys: CreatureMutationSystem
  beforeEach(() => { sys = makeSys() })

  it('无突变返回 false', () => { expect(sys.hasMutation(1, 'strength')).toBe(false) })
  it('有对应突变返回 true', () => {
    ;(sys as any).mutations.set(1, [makeMutation('gigantism')])
    expect(sys.hasMutation(1, 'gigantism')).toBe(true)
    expect(sys.hasMutation(1, 'speed')).toBe(false)
  })
})
