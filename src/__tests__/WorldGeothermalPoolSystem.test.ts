import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGeothermalPoolSystem } from '../systems/WorldGeothermalPoolSystem'
import type { GeothermalPool } from '../systems/WorldGeothermalPoolSystem'

function makeSys(): WorldGeothermalPoolSystem { return new WorldGeothermalPoolSystem() }
let nextId = 1
function makePool(): GeothermalPool {
  return { id: nextId++, x: 25, y: 35, temperature: 80, mineralContent: 60, steamOutput: 70, depth: 5, tick: 0 }
}

describe('WorldGeothermalPoolSystem.getPools', () => {
  let sys: WorldGeothermalPoolSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地热池', () => { expect(sys.getPools()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pools.push(makePool())
    expect(sys.getPools()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPools()).toBe((sys as any).pools)
  })
  it('地热池字段正确', () => {
    ;(sys as any).pools.push(makePool())
    const p = sys.getPools()[0]
    expect(p.temperature).toBe(80)
    expect(p.mineralContent).toBe(60)
    expect(p.steamOutput).toBe(70)
  })
  it('多个地热池全部返回', () => {
    ;(sys as any).pools.push(makePool())
    ;(sys as any).pools.push(makePool())
    expect(sys.getPools()).toHaveLength(2)
  })
})
