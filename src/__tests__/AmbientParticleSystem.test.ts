import { describe, it, expect, beforeEach } from 'vitest'
import { AmbientParticleSystem } from '../systems/AmbientParticleSystem'
import { TileType } from '../utils/Constants'

function makeSys() { return new AmbientParticleSystem() }

function makeMockWorld() {
  const tiles: TileType[][] = Array.from({ length: 20 }, () =>
    Array.from({ length: 20 }, () => TileType.GRASS)
  )
  return {
    season: 'spring',
    isDay: () => true,
    getTile: (x: number, y: number) => TileType.GRASS,
    tiles,
    width: 20,
    height: 20
  }
}

const mockParticles = { addParticle: () => {} }

describe('AmbientParticleSystem', () => {
  let sys: AmbientParticleSystem
  beforeEach(() => { sys = makeSys() })
  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('update() 不崩溃（白天）', () => {
    expect(() => sys.update(makeMockWorld() as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })
  it('update() 不崩溃（夜晚）', () => {
    const nightWorld = { ...makeMockWorld(), isDay: () => false }
    expect(() => sys.update(nightWorld as any, mockParticles as any, 0, 0, 0, 20, 20)).not.toThrow()
  })
})
