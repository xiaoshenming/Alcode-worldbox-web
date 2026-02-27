import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMudVolcanoSystem } from '../systems/WorldMudVolcanoSystem'
import type { MudVolcano } from '../systems/WorldMudVolcanoSystem'

function makeSys(): WorldMudVolcanoSystem { return new WorldMudVolcanoSystem() }
let nextId = 1
function makeMudVolcano(): MudVolcano {
  return { id: nextId++, x: 25, y: 35, eruptionForce: 6, mudDepth: 4, gasEmission: 70, dormancy: 100, tick: 0 }
}

describe('WorldMudVolcanoSystem.getVolcanos', () => {
  let sys: WorldMudVolcanoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无泥火山', () => { expect(sys.getVolcanos()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).volcanos.push(makeMudVolcano())
    expect(sys.getVolcanos()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getVolcanos()).toBe((sys as any).volcanos)
  })
  it('泥火山字段正确', () => {
    ;(sys as any).volcanos.push(makeMudVolcano())
    const v = sys.getVolcanos()[0]
    expect(v.eruptionForce).toBe(6)
    expect(v.gasEmission).toBe(70)
    expect(v.dormancy).toBe(100)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
