import { describe, it, expect, beforeEach } from 'vitest'
import { BiomeEvolutionSystem } from '../systems/BiomeEvolutionSystem'
function makeSys() { return new BiomeEvolutionSystem() }
describe('BiomeEvolutionSystem', () => {
  let sys: BiomeEvolutionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始sampleCount为正数', () => { expect((sys as any).sampleCount).toBeGreaterThan(0) })
})
