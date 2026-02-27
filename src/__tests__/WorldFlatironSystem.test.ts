import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFlatironSystem } from '../systems/WorldFlatironSystem'
import type { Flatiron } from '../systems/WorldFlatironSystem'

function makeSys(): WorldFlatironSystem { return new WorldFlatironSystem() }
let nextId = 1
function makeFlatiron(): Flatiron {
  return { id: nextId++, x: 20, y: 30, height: 15, tiltAngle: 30, rockHardness: 80, weatheringRate: 2, vegetationCover: 20, spectacle: 70, tick: 0 }
}

describe('WorldFlatironSystem.getFlatirons', () => {
  let sys: WorldFlatironSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无熨斗山', () => { expect(sys.getFlatirons()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).flatirons.push(makeFlatiron())
    expect(sys.getFlatirons()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFlatirons()).toBe((sys as any).flatirons)
  })
  it('熨斗山字段正确', () => {
    ;(sys as any).flatirons.push(makeFlatiron())
    const f = sys.getFlatirons()[0]
    expect(f.tiltAngle).toBe(30)
    expect(f.rockHardness).toBe(80)
    expect(f.spectacle).toBe(70)
  })
  it('多个熨斗山全部返回', () => {
    ;(sys as any).flatirons.push(makeFlatiron())
    ;(sys as any).flatirons.push(makeFlatiron())
    expect(sys.getFlatirons()).toHaveLength(2)
  })
})
