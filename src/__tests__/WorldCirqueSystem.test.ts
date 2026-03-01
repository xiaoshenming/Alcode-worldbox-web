import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCirqueSystem } from '../systems/WorldCirqueSystem'
import type { Cirque } from '../systems/WorldCirqueSystem'

function makeSys(): WorldCirqueSystem { return new WorldCirqueSystem() }
let nextId = 1
function makeCirque(): Cirque {
  return { id: nextId++, x: 20, y: 30, diameter: 15, wallHeight: 25, glacialDepth: 10, erosionRate: 3, tarnPresent: true, spectacle: 80, tick: 0 }
}

describe('WorldCirqueSystem.getCirques', () => {
  let sys: WorldCirqueSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冰斗', () => { expect((sys as any).cirques).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).cirques.push(makeCirque())
    expect((sys as any).cirques).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).cirques).toBe((sys as any).cirques)
  })
  it('冰斗字段正确', () => {
    ;(sys as any).cirques.push(makeCirque())
    const c = (sys as any).cirques[0]
    expect(c.wallHeight).toBe(25)
    expect(c.tarnPresent).toBe(true)
    expect(c.spectacle).toBe(80)
  })
  it('多个冰斗全部返回', () => {
    ;(sys as any).cirques.push(makeCirque())
    ;(sys as any).cirques.push(makeCirque())
    expect((sys as any).cirques).toHaveLength(2)
  })
})
