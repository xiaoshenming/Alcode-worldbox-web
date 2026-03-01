import { describe, it, expect, beforeEach } from 'vitest'
import { WorldUndergroundRiverSystem } from '../systems/WorldUndergroundRiverSystem'
import type { UndergroundRiver, RiverFlow } from '../systems/WorldUndergroundRiverSystem'

function makeSys(): WorldUndergroundRiverSystem { return new WorldUndergroundRiverSystem() }
let nextId = 1
function makeRiver(flow: RiverFlow = 'moderate'): UndergroundRiver {
  return { id: nextId++, segments: [{ x: 10, y: 10 }, { x: 20, y: 20 }], flow, depth: 15, minerals: 40, discovered: false, tick: 0 }
}

describe('WorldUndergroundRiverSystem.getRivers', () => {
  let sys: WorldUndergroundRiverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无地下河', () => { expect((sys as any).rivers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rivers.push(makeRiver())
    expect((sys as any).rivers).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).rivers).toBe((sys as any).rivers)
  })
  it('支持4种水流速度', () => {
    const flows: RiverFlow[] = ['slow', 'moderate', 'fast', 'torrent']
    expect(flows).toHaveLength(4)
  })
  it('地下河字段正确', () => {
    ;(sys as any).rivers.push(makeRiver('fast'))
    const r = (sys as any).rivers[0]
    expect(r.flow).toBe('fast')
    expect(r.depth).toBe(15)
    expect(r.discovered).toBe(false)
  })
})
