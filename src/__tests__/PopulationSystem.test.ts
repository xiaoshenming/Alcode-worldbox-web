import { describe, it, expect, beforeEach } from 'vitest'
import { PopulationSystem } from '../systems/PopulationSystem'
function makeSys() { return new PopulationSystem() }
describe('PopulationSystem', () => {
  let sys: PopulationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始pendingEvents为空', () => { expect((sys as any).pendingEvents).toHaveLength(0) })
})
