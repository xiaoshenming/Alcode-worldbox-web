import { describe, it, expect, beforeEach } from 'vitest'
import { TerrainDecorationSystem } from '../systems/TerrainDecorationSystem'
function makeSys() { return new TerrainDecorationSystem() }
describe('TerrainDecorationSystem', () => {
  let sys: TerrainDecorationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始worldW为0', () => { expect((sys as any).worldW).toBe(0) })
  it('初始worldH为0', () => { expect((sys as any).worldH).toBe(0) })
})
