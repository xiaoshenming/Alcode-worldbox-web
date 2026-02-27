import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCouleeSystem } from '../systems/WorldCouleeSystem'
import type { Coulee } from '../systems/WorldCouleeSystem'

function makeSys(): WorldCouleeSystem { return new WorldCouleeSystem() }
let nextId = 1
function makeCoulee(): Coulee {
  return { id: nextId++, x: 20, y: 30, length: 25, wallSteepness: 70, lavaPresence: 20, erosionRate: 3, vegetationCover: 40, spectacle: 65, tick: 0 }
}

describe('WorldCouleeSystem.getCoulees', () => {
  let sys: WorldCouleeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无熔岩沟', () => { expect(sys.getCoulees()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).coulees.push(makeCoulee())
    expect(sys.getCoulees()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getCoulees()).toBe((sys as any).coulees)
  })
  it('熔岩沟字段正确', () => {
    ;(sys as any).coulees.push(makeCoulee())
    const c = sys.getCoulees()[0]
    expect(c.wallSteepness).toBe(70)
    expect(c.lavaPresence).toBe(20)
    expect(c.spectacle).toBe(65)
  })
  it('多个熔岩沟全部返回', () => {
    ;(sys as any).coulees.push(makeCoulee())
    ;(sys as any).coulees.push(makeCoulee())
    expect(sys.getCoulees()).toHaveLength(2)
  })
})
