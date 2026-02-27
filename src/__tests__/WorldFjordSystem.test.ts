import { describe, it, expect, beforeEach } from 'vitest'
import { WorldFjordSystem } from '../systems/WorldFjordSystem'
import type { Fjord } from '../systems/WorldFjordSystem'

function makeSys(): WorldFjordSystem { return new WorldFjordSystem() }
let nextId = 1
function makeFjord(): Fjord {
  return { id: nextId++, x: 10, y: 15, length: 30, depth: 200, cliffHeight: 50, waterClarity: 85, glacialActivity: 40, salinity: 20, tick: 0 }
}

describe('WorldFjordSystem.getFjords', () => {
  let sys: WorldFjordSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无峡湾', () => { expect(sys.getFjords()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).fjords.push(makeFjord())
    expect(sys.getFjords()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getFjords()).toBe((sys as any).fjords)
  })
  it('峡湾字段正确', () => {
    ;(sys as any).fjords.push(makeFjord())
    const f = sys.getFjords()[0]
    expect(f.depth).toBe(200)
    expect(f.cliffHeight).toBe(50)
    expect(f.waterClarity).toBe(85)
  })
  it('多个峡湾全部返回', () => {
    ;(sys as any).fjords.push(makeFjord())
    ;(sys as any).fjords.push(makeFjord())
    expect(sys.getFjords()).toHaveLength(2)
  })
})
