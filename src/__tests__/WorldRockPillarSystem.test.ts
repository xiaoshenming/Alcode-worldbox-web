import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRockPillarSystem } from '../systems/WorldRockPillarSystem'
import type { RockPillar } from '../systems/WorldRockPillarSystem'

function makeSys(): WorldRockPillarSystem { return new WorldRockPillarSystem() }
let nextId = 1
function makePillar(): RockPillar {
  return { id: nextId++, x: 20, y: 30, height: 20, diameter: 3, stability: 70, erosionRate: 2, spectacle: 80, tick: 0 }
}

describe('WorldRockPillarSystem.getPillars', () => {
  let sys: WorldRockPillarSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无岩石柱', () => { expect(sys.getPillars()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pillars.push(makePillar())
    expect(sys.getPillars()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPillars()).toBe((sys as any).pillars)
  })
  it('岩石柱字段正确', () => {
    ;(sys as any).pillars.push(makePillar())
    const p = sys.getPillars()[0]
    expect(p.height).toBe(20)
    expect(p.stability).toBe(70)
    expect(p.spectacle).toBe(80)
  })
})
