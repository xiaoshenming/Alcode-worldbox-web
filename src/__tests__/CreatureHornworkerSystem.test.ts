import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHornworkerSystem } from '../systems/CreatureHornworkerSystem'
import type { Hornworker } from '../systems/CreatureHornworkerSystem'

let nextId = 1
function makeSys(): CreatureHornworkerSystem { return new CreatureHornworkerSystem() }
function makeWorker(entityId: number): Hornworker {
  return { id: nextId++, entityId, hornShaping: 70, heatTreatment: 65, carvingDetail: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureHornworkerSystem.getWorkers', () => {
  let sys: CreatureHornworkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无角加工工', () => { expect(sys.getWorkers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).workers.push(makeWorker(1))
    expect(sys.getWorkers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).workers.push(makeWorker(1))
    expect(sys.getWorkers()).toBe((sys as any).workers)
  })
  it('字段正确', () => {
    ;(sys as any).workers.push(makeWorker(3))
    const w = sys.getWorkers()[0]
    expect(w.hornShaping).toBe(70)
    expect(w.carvingDetail).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).workers.push(makeWorker(1))
    ;(sys as any).workers.push(makeWorker(2))
    expect(sys.getWorkers()).toHaveLength(2)
  })
})
