import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRockPedestalSystem } from '../systems/WorldRockPedestalSystem'
import type { RockPedestal } from '../systems/WorldRockPedestalSystem'

function makeSys(): WorldRockPedestalSystem { return new WorldRockPedestalSystem() }
let nextId = 1
function makePedestal(): RockPedestal {
  return { id: nextId++, x: 20, y: 30, capDiameter: 8, stemHeight: 5, stemWidth: 2, balanceRisk: 30, erosionRate: 2, spectacle: 75, tick: 0 }
}

describe('WorldRockPedestalSystem.getPedestals', () => {
  let sys: WorldRockPedestalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无岩石台座', () => { expect(sys.getPedestals()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pedestals.push(makePedestal())
    expect(sys.getPedestals()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getPedestals()).toBe((sys as any).pedestals)
  })
  it('岩石台座字段正确', () => {
    ;(sys as any).pedestals.push(makePedestal())
    const p = sys.getPedestals()[0]
    expect(p.capDiameter).toBe(8)
    expect(p.balanceRisk).toBe(30)
    expect(p.spectacle).toBe(75)
  })
})
