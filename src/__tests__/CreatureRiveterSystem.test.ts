import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRiveterSystem } from '../systems/CreatureRiveterSystem'
import type { Riveter } from '../systems/CreatureRiveterSystem'

let nextId = 1
function makeSys(): CreatureRiveterSystem { return new CreatureRiveterSystem() }
function makeRiveter(entityId: number): Riveter {
  return { id: nextId++, entityId, holeAlignment: 70, hammerWork: 65, jointStrength: 75, outputQuality: 80, tick: 0 }
}

describe('CreatureRiveterSystem.getRiveters', () => {
  let sys: CreatureRiveterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铆接工', () => { expect(sys.getRiveters()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).riveters.push(makeRiveter(1))
    expect(sys.getRiveters()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).riveters.push(makeRiveter(1))
    expect(sys.getRiveters()).toBe((sys as any).riveters)
  })
  it('字段正确', () => {
    ;(sys as any).riveters.push(makeRiveter(2))
    const r = sys.getRiveters()[0]
    expect(r.holeAlignment).toBe(70)
    expect(r.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).riveters.push(makeRiveter(1))
    ;(sys as any).riveters.push(makeRiveter(2))
    expect(sys.getRiveters()).toHaveLength(2)
  })
})
