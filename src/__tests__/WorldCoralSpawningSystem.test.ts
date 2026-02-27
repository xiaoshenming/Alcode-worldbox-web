import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCoralSpawningSystem } from '../systems/WorldCoralSpawningSystem'
import type { CoralSpawn, CoralSeason } from '../systems/WorldCoralSpawningSystem'

function makeSys(): WorldCoralSpawningSystem { return new WorldCoralSpawningSystem() }
let nextId = 1
function makeSpawn(season: CoralSeason = 'spawning'): CoralSpawn {
  return { id: nextId++, x: 30, y: 40, density: 80, fertility: 70, season, dispersal: 50, tick: 0 }
}

describe('WorldCoralSpawningSystem.getSpawns', () => {
  let sys: WorldCoralSpawningSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珊瑚产卵', () => { expect(sys.getSpawns()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).spawns.push(makeSpawn())
    expect(sys.getSpawns()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSpawns()).toBe((sys as any).spawns)
  })
  it('支持4种季节状态', () => {
    const seasons: CoralSeason[] = ['dormant', 'preparing', 'spawning', 'dispersing']
    expect(seasons).toHaveLength(4)
  })
  it('珊瑚产卵字段正确', () => {
    ;(sys as any).spawns.push(makeSpawn('dispersing'))
    const s = sys.getSpawns()[0]
    expect(s.season).toBe('dispersing')
    expect(s.density).toBe(80)
    expect(s.fertility).toBe(70)
  })
})
