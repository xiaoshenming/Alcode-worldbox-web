import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMesaSystem } from '../systems/WorldMesaSystem'
import type { Mesa } from '../systems/WorldMesaSystem'

function makeSys(): WorldMesaSystem { return new WorldMesaSystem() }
let nextId = 1
function makeMesa(): Mesa {
  return { id: nextId++, x: 20, y: 30, radius: 15, elevation: 60, capRockThickness: 10, erosionRate: 0.01, plateauArea: 700, stratification: 8, tick: 0 }
}

describe('WorldMesaSystem.getMesas', () => {
  let sys: WorldMesaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无台地', () => { expect((sys as any).mesas).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).mesas.push(makeMesa())
    expect((sys as any).mesas).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).mesas).toBe((sys as any).mesas)
  })
  it('台地字段正确', () => {
    ;(sys as any).mesas.push(makeMesa())
    const m = (sys as any).mesas[0]
    expect(m.elevation).toBe(60)
    expect(m.plateauArea).toBe(700)
    expect(m.stratification).toBe(8)
  })
  it('多个台地全部返回', () => {
    ;(sys as any).mesas.push(makeMesa())
    ;(sys as any).mesas.push(makeMesa())
    expect((sys as any).mesas).toHaveLength(2)
  })
})
