import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRavineSystem } from '../systems/WorldRavineSystem'
import type { Ravine } from '../systems/WorldRavineSystem'

function makeSys(): WorldRavineSystem { return new WorldRavineSystem() }
let nextId = 1
function makeRavine(): Ravine {
  return { id: nextId++, x: 20, y: 30, length: 20, depth: 8, wallSteepness: 75, waterFlow: 30, erosionRate: 3, spectacle: 65, tick: 0 }
}

describe('WorldRavineSystem.getRavines', () => {
  let sys: WorldRavineSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冲沟', () => { expect(sys.getRavines()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).ravines.push(makeRavine())
    expect(sys.getRavines()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getRavines()).toBe((sys as any).ravines)
  })
  it('冲沟字段正确', () => {
    ;(sys as any).ravines.push(makeRavine())
    const r = sys.getRavines()[0]
    expect(r.wallSteepness).toBe(75)
    expect(r.waterFlow).toBe(30)
    expect(r.spectacle).toBe(65)
  })
  it('多个冲沟全部返回', () => {
    ;(sys as any).ravines.push(makeRavine())
    ;(sys as any).ravines.push(makeRavine())
    expect(sys.getRavines()).toHaveLength(2)
  })
})
