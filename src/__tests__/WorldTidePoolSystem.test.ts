import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTidePoolSystem } from '../systems/WorldTidePoolSystem'
import type { TidePool } from '../systems/WorldTidePoolSystem'

function makeSys(): WorldTidePoolSystem { return new WorldTidePoolSystem() }
let nextId = 1
function makePool(active = true): TidePool {
  return { id: nextId++, x: 15, y: 25, size: 5, biodiversity: 70, resources: 30, age: 500, active }
}

describe('WorldTidePoolSystem', () => {
  let sys: WorldTidePoolSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无潮池', () => { expect(sys.getPools()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pools.push(makePool())
    expect(sys.getPools()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPools()).toBe((sys as any).pools)
  })
  it('getActivePools只返回active=true', () => {
    ;(sys as any).pools.push(makePool(true))
    ;(sys as any).pools.push(makePool(false))
    expect(sys.getActivePools()).toHaveLength(1)
  })
  it('潮池字段正确', () => {
    ;(sys as any).pools.push(makePool())
    const p = sys.getPools()[0]
    expect(p.biodiversity).toBe(70)
    expect(p.resources).toBe(30)
    expect(p.active).toBe(true)
  })
})
