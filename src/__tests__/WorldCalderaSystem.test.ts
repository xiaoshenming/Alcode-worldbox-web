import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCalderaSystem } from '../systems/WorldCalderaSystem'
import type { Caldera } from '../systems/WorldCalderaSystem'

function makeSys(): WorldCalderaSystem { return new WorldCalderaSystem() }
let nextId = 1
function makeCaldera(): Caldera {
  return { id: nextId++, x: 50, y: 50, diameter: 20, lakeDepth: 10, resurgentDome: 5, geothermalActivity: 80, age: 5000, tick: 0 }
}

describe('WorldCalderaSystem.getCalderas', () => {
  let sys: WorldCalderaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无破火山口', () => { expect(sys.getCalderas()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).calderas.push(makeCaldera())
    expect(sys.getCalderas()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getCalderas()).toBe((sys as any).calderas)
  })
  it('破火山口字段正确', () => {
    ;(sys as any).calderas.push(makeCaldera())
    const c = sys.getCalderas()[0]
    expect(c.diameter).toBe(20)
    expect(c.geothermalActivity).toBe(80)
    expect(c.lakeDepth).toBe(10)
  })
  it('多个破火山口全部返回', () => {
    ;(sys as any).calderas.push(makeCaldera())
    ;(sys as any).calderas.push(makeCaldera())
    expect(sys.getCalderas()).toHaveLength(2)
  })
})
