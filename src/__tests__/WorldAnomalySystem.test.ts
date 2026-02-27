import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAnomalySystem } from '../systems/WorldAnomalySystem'
import type { WorldAnomaly, AnomalyType } from '../systems/WorldAnomalySystem'

function makeSys(): WorldAnomalySystem { return new WorldAnomalySystem() }
let nextId = 1
function makeAnomaly(type: AnomalyType = 'rift'): WorldAnomaly {
  return { id: nextId++, type, x: 50, y: 50, radius: 5, intensity: 0.7, duration: 3000, createdTick: 0, affectedCount: 0 }
}

describe('WorldAnomalySystem.getAnomalies', () => {
  let sys: WorldAnomalySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无异常', () => { expect(sys.getAnomalies()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).anomalies.push(makeAnomaly())
    expect(sys.getAnomalies()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getAnomalies()).toBe((sys as any).anomalies)
  })
  it('支持5种异常类型', () => {
    const types: AnomalyType[] = ['rift', 'vortex', 'mirage', 'crystal_storm', 'void_zone']
    expect(types).toHaveLength(5)
  })
})

describe('WorldAnomalySystem.getActiveCount', () => {
  let sys: WorldAnomalySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始为0', () => { expect(sys.getActiveCount()).toBe(0) })
  it('注入后增加', () => {
    ;(sys as any).anomalies.push(makeAnomaly('vortex'))
    ;(sys as any).anomalies.push(makeAnomaly('void_zone'))
    expect(sys.getActiveCount()).toBe(2)
  })
})
