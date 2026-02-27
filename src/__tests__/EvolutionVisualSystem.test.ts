import { describe, it, expect, beforeEach } from 'vitest'
import { EvolutionVisualSystem } from '../systems/EvolutionVisualSystem'
function makeSys() { return new EvolutionVisualSystem() }
describe('EvolutionVisualSystem', () => {
  let sys: EvolutionVisualSystem
  beforeEach(() => { sys = makeSys() })
  it('初始nodes为空Map', () => { expect((sys as any).nodes.size).toBe(0) })
  it('初始events为空', () => { expect((sys as any).events).toHaveLength(0) })
})
