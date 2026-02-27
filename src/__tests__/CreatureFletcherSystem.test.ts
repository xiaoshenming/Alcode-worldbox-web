import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFletcherSystem } from '../systems/CreatureFletcherSystem'
import type { Fletcher } from '../systems/CreatureFletcherSystem'

let nextId = 1
function makeSys(): CreatureFletcherSystem { return new CreatureFletcherSystem() }
function makeFletcher(entityId: number): Fletcher {
  return { id: nextId++, entityId, featherCutting: 50, shaftBinding: 60, flightTuning: 70, outputQuality: 80, tick: 0 }
}

describe('CreatureFletcherSystem.getFletchers', () => {
  let sys: CreatureFletcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无箭羽工', () => { expect(sys.getFletchers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    expect(sys.getFletchers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    expect(sys.getFletchers()).toBe((sys as any).fletchers)
  })

  it('多个全部返回', () => {
    ;(sys as any).fletchers.push(makeFletcher(1))
    ;(sys as any).fletchers.push(makeFletcher(2))
    expect(sys.getFletchers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const f = makeFletcher(10)
    f.featherCutting = 90; f.shaftBinding = 85; f.flightTuning = 80; f.outputQuality = 75
    ;(sys as any).fletchers.push(f)
    const r = sys.getFletchers()[0]
    expect(r.featherCutting).toBe(90); expect(r.shaftBinding).toBe(85)
    expect(r.flightTuning).toBe(80); expect(r.outputQuality).toBe(75)
  })
})
