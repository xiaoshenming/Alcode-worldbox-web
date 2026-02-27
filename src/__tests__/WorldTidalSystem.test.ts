import { describe, it, expect, beforeEach } from 'vitest'
import { WorldTidalSystem } from '../systems/WorldTidalSystem'

function makeSys(): WorldTidalSystem { return new WorldTidalSystem() }

describe('WorldTidalSystem.getTidalState', () => {
  let sys: WorldTidalSystem
  beforeEach(() => { sys = makeSys() })

  it('初始相位为0', () => {
    expect(sys.getTidalState().phase).toBe(0)
  })
  it('返回包含direction字段的对象', () => {
    const state = sys.getTidalState()
    expect(state).toHaveProperty('direction')
    expect(['rising', 'falling']).toContain(state.direction)
  })
  it('返回内部引用', () => {
    expect(sys.getTidalState()).toBe((sys as any).state)
  })
})

describe('WorldTidalSystem.getTideLevel', () => {
  let sys: WorldTidalSystem
  beforeEach(() => { sys = makeSys() })

  it('初始潮汐级别为0', () => {
    expect(sys.getTideLevel()).toBe(0)
  })
  it('注入state.level后可查询', () => {
    ;(sys as any).state.level = 2
    expect(sys.getTideLevel()).toBe(2)
  })
})

describe('WorldTidalSystem.getCoastalTileCount', () => {
  let sys: WorldTidalSystem
  beforeEach(() => { sys = makeSys() })

  it('初始为0', () => { expect(sys.getCoastalTileCount()).toBe(0) })
  it('注入后增加', () => {
    ;(sys as any).coastalTiles.push(100, 200)
    expect(sys.getCoastalTileCount()).toBe(2)
  })
})

describe('WorldTidalSystem.getFloodedCount', () => {
  let sys: WorldTidalSystem
  beforeEach(() => { sys = makeSys() })

  it('初始为0', () => { expect(sys.getFloodedCount()).toBe(0) })
})
