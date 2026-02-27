import { describe, it, expect, beforeEach } from 'vitest'
import { ArtifactSystem, getArtifactBonus } from '../systems/ArtifactSystem'
import { EntityManager } from '../ecs/Entity'

function makeSys() { return new ArtifactSystem() }
function makeEm() { return new EntityManager() }

describe('ArtifactSystem', () => {
  let sys: ArtifactSystem
  beforeEach(() => { sys = makeSys() })

  it('初始spawnedCount为0', () => { expect((sys as any).spawnedCount).toBe(0) })
  it('初始maxArtifacts为6', () => { expect((sys as any).maxArtifacts).toBe(6) })
  it('lastSpawnTick初始为0', () => { expect((sys as any).lastSpawnTick).toBe(0) })
  it('spawnedCount类型为number', () => { expect(typeof (sys as any).spawnedCount).toBe('number') })
  it('getArtifactBonus无实体时返回1（基础值）', () => {
    const em = makeEm()
    const result = getArtifactBonus(em, 999, 'combat')
    expect(result).toBe(1)
  })
  it('getArtifactBonus对不同bonusType也返回1', () => {
    const em = makeEm()
    expect(getArtifactBonus(em, 1, 'speed')).toBe(1)
    expect(getArtifactBonus(em, 1, 'defense')).toBe(1)
  })
  it('maxArtifacts类型为number', () => { expect(typeof (sys as any).maxArtifacts).toBe('number') })
})
