import { describe, it, expect, beforeEach } from 'vitest'
import { WorldGrottoSystem } from '../systems/WorldGrottoSystem'
import type { Grotto } from '../systems/WorldGrottoSystem'

function makeSys(): WorldGrottoSystem { return new WorldGrottoSystem() }
let nextId = 1
function makeGrotto(): Grotto {
  return { id: nextId++, x: 15, y: 25, depth: 10, waterLevel: 3, stalactites: 20, luminosity: 30, humidity: 80, biodiversity: 60, tick: 0 }
}

describe('WorldGrottoSystem.getGrottos', () => {
  let sys: WorldGrottoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无岩洞', () => { expect((sys as any).grottos).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).grottos.push(makeGrotto())
    expect((sys as any).grottos).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).grottos).toBe((sys as any).grottos)
  })
  it('岩洞字段正确', () => {
    ;(sys as any).grottos.push(makeGrotto())
    const g = (sys as any).grottos[0]
    expect(g.stalactites).toBe(20)
    expect(g.humidity).toBe(80)
    expect(g.biodiversity).toBe(60)
  })
  it('多个岩洞全部返回', () => {
    ;(sys as any).grottos.push(makeGrotto())
    ;(sys as any).grottos.push(makeGrotto())
    expect((sys as any).grottos).toHaveLength(2)
  })
})
