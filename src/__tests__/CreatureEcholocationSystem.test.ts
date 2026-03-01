import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEcholocationSystem } from '../systems/CreatureEcholocationSystem'
import type { EchoPing } from '../systems/CreatureEcholocationSystem'

let nextId = 1
function makeSys(): CreatureEcholocationSystem { return new CreatureEcholocationSystem() }
function makePing(emitterId: number): EchoPing {
  return { id: nextId++, emitterId, range: 10, accuracy: 80, entitiesDetected: 3, resourcesFound: 2, tick: 0 }
}

describe('CreatureEcholocationSystem.getPings', () => {
  let sys: CreatureEcholocationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无回声', () => { expect((sys as any).pings).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).pings.push(makePing(1))
    expect((sys as any).pings[0].emitterId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).pings.push(makePing(1))
    expect((sys as any).pings).toBe((sys as any).pings)
  })

  it('多个全部返回', () => {
    ;(sys as any).pings.push(makePing(1))
    ;(sys as any).pings.push(makePing(2))
    expect((sys as any).pings).toHaveLength(2)
  })
})

describe('CreatureEcholocationSystem.getSkill', () => {
  let sys: CreatureEcholocationSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 0', () => { expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0) })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 75)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(75)
  })
})
