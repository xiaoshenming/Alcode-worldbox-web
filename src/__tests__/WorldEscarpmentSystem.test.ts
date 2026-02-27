import { describe, it, expect, beforeEach } from 'vitest'
import { WorldEscarpmentSystem } from '../systems/WorldEscarpmentSystem'
import type { Escarpment } from '../systems/WorldEscarpmentSystem'

function makeSys(): WorldEscarpmentSystem { return new WorldEscarpmentSystem() }
let nextId = 1
function makeEscarpment(): Escarpment {
  return { id: nextId++, x: 30, y: 40, length: 60, height: 40, steepness: 80, erosionRate: 0.03, rockfallRisk: 25, vegetationCover: 30, tick: 0 }
}

describe('WorldEscarpmentSystem.getEscarpments', () => {
  let sys: WorldEscarpmentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无陡坡', () => { expect(sys.getEscarpments()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).escarpments.push(makeEscarpment())
    expect(sys.getEscarpments()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getEscarpments()).toBe((sys as any).escarpments)
  })
  it('陡坡字段正确', () => {
    ;(sys as any).escarpments.push(makeEscarpment())
    const e = sys.getEscarpments()[0]
    expect(e.steepness).toBe(80)
    expect(e.rockfallRisk).toBe(25)
    expect(e.vegetationCover).toBe(30)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
