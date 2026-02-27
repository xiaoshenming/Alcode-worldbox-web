import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTideFlatSystem } from '../systems/WorldTideFlatSystem'
import type { TideFlat } from '../systems/WorldTideFlatSystem'

function makeSys(): WorldTideFlatSystem { return new WorldTideFlatSystem() }
let nextId = 1
function makeFlat(): TideFlat {
  return { id: nextId++, x: 20, y: 30, exposure: 50, organisms: 30, tidePhase: 1.5, nutrients: 70, tick: 0 }
}

describe('WorldTideFlatSystem.getTideFlats', () => {
  let sys: WorldTideFlatSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无潮滩', () => { expect(sys.getTideFlats()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tideFlats.push(makeFlat())
    expect(sys.getTideFlats()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getTideFlats()).toBe((sys as any).tideFlats)
  })
  it('潮滩字段正确', () => {
    ;(sys as any).tideFlats.push(makeFlat())
    const f = sys.getTideFlats()[0]
    expect(f.exposure).toBe(50)
    expect(f.nutrients).toBe(70)
    expect(f.organisms).toBe(30)
  })
})
