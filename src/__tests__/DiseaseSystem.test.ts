import { describe, it, expect, beforeEach } from 'vitest'
import { DiseaseSystem } from '../systems/DiseaseSystem'
function makeSys() { return new DiseaseSystem() }
describe('DiseaseSystem', () => {
  let sys: DiseaseSystem
  beforeEach(() => { sys = makeSys() })
  it('初始tickCounter为0', () => { expect((sys as any).tickCounter).toBe(0) })
  it('初始_outbreakGrid为空Map', () => { expect((sys as any)._outbreakGrid.size).toBe(0) })
})
