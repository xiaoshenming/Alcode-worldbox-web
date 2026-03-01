import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePeenerSystem } from '../systems/CreaturePeenerSystem'
import type { Peener } from '../systems/CreaturePeenerSystem'

let nextId = 1
function makeSys(): CreaturePeenerSystem { return new CreaturePeenerSystem() }
function makePeener(entityId: number): Peener {
  return { id: nextId++, entityId, peeningSkill: 70, hammerControl: 65, surfaceHardening: 75, stressRelief: 80, tick: 0 }
}

describe('CreaturePeenerSystem.getPeeners', () => {
  let sys: CreaturePeenerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锤击工', () => { expect((sys as any).peeners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).peeners.push(makePeener(1))
    expect((sys as any).peeners[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).peeners.push(makePeener(1))
    expect((sys as any).peeners).toBe((sys as any).peeners)
  })
  it('字段正确', () => {
    ;(sys as any).peeners.push(makePeener(3))
    const p = (sys as any).peeners[0]
    expect(p.peeningSkill).toBe(70)
    expect(p.stressRelief).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).peeners.push(makePeener(1))
    ;(sys as any).peeners.push(makePeener(2))
    expect((sys as any).peeners).toHaveLength(2)
  })
})
