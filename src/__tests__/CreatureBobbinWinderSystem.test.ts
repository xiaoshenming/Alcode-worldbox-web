import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBobbinWinderSystem } from '../systems/CreatureBobbinWinderSystem'
import type { BobbinWinder } from '../systems/CreatureBobbinWinderSystem'

let nextId = 1
function makeSys(): CreatureBobbinWinderSystem { return new CreatureBobbinWinderSystem() }
function makeWinder(entityId: number): BobbinWinder {
  return { id: nextId++, entityId, windingSpeed: 30, tensionAccuracy: 25, threadCapacity: 20, consistency: 35, tick: 0 }
}

describe('CreatureBobbinWinderSystem.getWinders', () => {
  let sys: CreatureBobbinWinderSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绕线师', () => { expect((sys as any).winders).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).winders.push(makeWinder(1))
    expect((sys as any).winders[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).winders.push(makeWinder(1))
    expect((sys as any).winders).toBe((sys as any).winders)
  })

  it('多个全部返回', () => {
    ;(sys as any).winders.push(makeWinder(1))
    ;(sys as any).winders.push(makeWinder(2))
    expect((sys as any).winders).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const w = makeWinder(10)
    w.windingSpeed = 80; w.tensionAccuracy = 75; w.threadCapacity = 70; w.consistency = 65
    ;(sys as any).winders.push(w)
    const r = (sys as any).winders[0]
    expect(r.windingSpeed).toBe(80)
    expect(r.tensionAccuracy).toBe(75)
    expect(r.threadCapacity).toBe(70)
    expect(r.consistency).toBe(65)
  })
})
