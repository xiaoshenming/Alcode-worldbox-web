import { describe, it, expect, beforeEach } from 'vitest'
import { ArtifactSystem } from '../systems/ArtifactSystem'
function makeSys() { return new ArtifactSystem() }
describe('ArtifactSystem', () => {
  let sys: ArtifactSystem
  beforeEach(() => { sys = makeSys() })
  it('初始spawnedCount为0', () => { expect((sys as any).spawnedCount).toBe(0) })
  it('初始maxArtifacts为6', () => { expect((sys as any).maxArtifacts).toBe(6) })
})
