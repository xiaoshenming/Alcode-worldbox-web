import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTidalLagoonSystem } from '../systems/WorldTidalLagoonSystem'
import type { TidalLagoon } from '../systems/WorldTidalLagoonSystem'

function makeSys(): WorldTidalLagoonSystem { return new WorldTidalLagoonSystem() }
let nextId = 1
function makeLagoon(): TidalLagoon {
  return { id: nextId++, x: 30, y: 40, radius: 12, salinity: 25, depth: 5, biodiversity: 80, tidalRange: 3, tick: 0 }
}

describe('WorldTidalLagoonSystem.getLagoons', () => {
  let sys: WorldTidalLagoonSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无潮汐泻湖', () => { expect(sys.getLagoons()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).lagoons.push(makeLagoon())
    expect(sys.getLagoons()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getLagoons()).toBe((sys as any).lagoons)
  })
  it('潮汐泻湖字段正确', () => {
    ;(sys as any).lagoons.push(makeLagoon())
    const l = sys.getLagoons()[0]
    expect(l.salinity).toBe(25)
    expect(l.biodiversity).toBe(80)
    expect(l.tidalRange).toBe(3)
  })
  it('多个潮汐泻湖全部返回', () => {
    ;(sys as any).lagoons.push(makeLagoon())
    ;(sys as any).lagoons.push(makeLagoon())
    expect(sys.getLagoons()).toHaveLength(2)
  })
})
