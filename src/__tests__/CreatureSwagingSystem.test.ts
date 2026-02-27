import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSwagingSystem } from '../systems/CreatureSwagingSystem'
import type { SwagingWorker } from '../systems/CreatureSwagingSystem'

let nextId = 1
function makeSys(): CreatureSwagingSystem { return new CreatureSwagingSystem() }
function makeWorker(entityId: number): SwagingWorker {
  return { id: nextId++, entityId, swagingSkill: 70, forgeAccuracy: 65, pressOperation: 80, dieAlignment: 75, tick: 0 }
}

describe('CreatureSwagingSystem.getSwagingWorkers', () => {
  let sys: CreatureSwagingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无旋锻工人', () => { expect(sys.getSwagingWorkers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).workers.push(makeWorker(1))
    expect(sys.getSwagingWorkers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).workers.push(makeWorker(1))
    expect(sys.getSwagingWorkers()).toBe((sys as any).workers)
  })
  it('字段正确', () => {
    ;(sys as any).workers.push(makeWorker(2))
    const w = sys.getSwagingWorkers()[0]
    expect(w.swagingSkill).toBe(70)
    expect(w.pressOperation).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).workers.push(makeWorker(1))
    ;(sys as any).workers.push(makeWorker(2))
    expect(sys.getSwagingWorkers()).toHaveLength(2)
  })
})
