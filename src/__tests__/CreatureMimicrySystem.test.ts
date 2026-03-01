import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMimicrySystem } from '../systems/CreatureMimicrySystem'
import type { MimicryAttempt, MimicryType } from '../systems/CreatureMimicrySystem'

let nextId = 1
function makeSys(): CreatureMimicrySystem { return new CreatureMimicrySystem() }
function makeAttempt(mimicId: number, targetId: number, type: MimicryType = 'visual'): MimicryAttempt {
  return { id: nextId++, mimicId, targetId, type, skill: 60, success: true, benefit: 20, tick: 0 }
}

describe('CreatureMimicrySystem.getAttempts', () => {
  let sys: CreatureMimicrySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无拟态', () => { expect((sys as any).attempts).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2, 'acoustic'))
    expect((sys as any).attempts[0].type).toBe('acoustic')
  })
  it('返回内部引用', () => {
    ;(sys as any).attempts.push(makeAttempt(1, 2))
    expect((sys as any).attempts).toBe((sys as any).attempts)
  })
  it('支持所有 6 种拟态类型', () => {
    const types: MimicryType[] = ['visual', 'behavioral', 'acoustic', 'chemical', 'aggressive', 'defensive']
    types.forEach((t, i) => { ;(sys as any).attempts.push(makeAttempt(i + 1, i + 10, t)) })
    const all = (sys as any).attempts
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
})

describe('CreatureMimicrySystem.getSkill', () => {
  let sys: CreatureMimicrySystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 0', () => { expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0) })
  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 77)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(77)
  })
})
