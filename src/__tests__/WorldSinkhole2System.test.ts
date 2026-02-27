import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSinkhole2System } from '../systems/WorldSinkhole2System'
import type { Sinkhole2 } from '../systems/WorldSinkhole2System'

function makeSys(): WorldSinkhole2System { return new WorldSinkhole2System() }
let nextId = 1
function makeSinkhole(): Sinkhole2 {
  return { id: nextId++, x: 25, y: 35, diameter: 10, depth: 15, collapseRate: 3, waterLevel: 5, stability: 40, spectacle: 70, tick: 0 }
}

describe('WorldSinkhole2System.getSinkholes', () => {
  let sys: WorldSinkhole2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无天坑', () => { expect(sys.getSinkholes()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sinkholes.push(makeSinkhole())
    expect(sys.getSinkholes()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSinkholes()).toBe((sys as any).sinkholes)
  })
  it('天坑字段正确', () => {
    ;(sys as any).sinkholes.push(makeSinkhole())
    const s = sys.getSinkholes()[0]
    expect(s.diameter).toBe(10)
    expect(s.stability).toBe(40)
    expect(s.spectacle).toBe(70)
  })
  it('多个天坑全部返回', () => {
    ;(sys as any).sinkholes.push(makeSinkhole())
    ;(sys as any).sinkholes.push(makeSinkhole())
    expect(sys.getSinkholes()).toHaveLength(2)
  })
})
