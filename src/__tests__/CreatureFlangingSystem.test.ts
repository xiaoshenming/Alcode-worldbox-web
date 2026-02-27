import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFlangingSystem } from '../systems/CreatureFlangingSystem'
import type { FlangingWorker } from '../systems/CreatureFlangingSystem'

let nextId = 1
function makeSys(): CreatureFlangingSystem { return new CreatureFlangingSystem() }
function makeWorker(entityId: number): FlangingWorker {
  return { id: nextId++, entityId, flangingSkill: 50, bendAccuracy: 60, pressOperation: 70, flangeInspection: 80, tick: 0 }
}

describe('CreatureFlangingSystem.getFlangingWorkers', () => {
  let sys: CreatureFlangingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无法兰工', () => { expect(sys.getFlangingWorkers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).workers.push(makeWorker(1))
    expect(sys.getFlangingWorkers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).workers.push(makeWorker(1))
    expect(sys.getFlangingWorkers()).toBe((sys as any).workers)
  })

  it('多个全部返回', () => {
    ;(sys as any).workers.push(makeWorker(1))
    ;(sys as any).workers.push(makeWorker(2))
    expect(sys.getFlangingWorkers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const w = makeWorker(10)
    w.flangingSkill = 90; w.bendAccuracy = 85; w.pressOperation = 80; w.flangeInspection = 75
    ;(sys as any).workers.push(w)
    const r = sys.getFlangingWorkers()[0]
    expect(r.flangingSkill).toBe(90); expect(r.bendAccuracy).toBe(85)
    expect(r.pressOperation).toBe(80); expect(r.flangeInspection).toBe(75)
  })
})
