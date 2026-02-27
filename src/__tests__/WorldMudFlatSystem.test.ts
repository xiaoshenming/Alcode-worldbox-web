import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMudFlatSystem } from '../systems/WorldMudFlatSystem'
import type { MudFlat } from '../systems/WorldMudFlatSystem'

function makeSys(): WorldMudFlatSystem { return new WorldMudFlatSystem() }
let nextId = 1
function makeFlat(): MudFlat {
  return { id: nextId++, x: 15, y: 25, radius: 10, sedimentDepth: 3, moistureLevel: 80, invertebrateCount: 50, birdActivity: 30, tick: 0 }
}

describe('WorldMudFlatSystem.getFlats', () => {
  let sys: WorldMudFlatSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无泥滩', () => { expect(sys.getFlats()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).flats.push(makeFlat())
    expect(sys.getFlats()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFlats()).toBe((sys as any).flats)
  })
  it('泥滩字段正确', () => {
    ;(sys as any).flats.push(makeFlat())
    const f = sys.getFlats()[0]
    expect(f.moistureLevel).toBe(80)
    expect(f.invertebrateCount).toBe(50)
    expect(f.birdActivity).toBe(30)
  })
})
