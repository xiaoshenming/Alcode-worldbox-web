import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLineageSystem } from '../systems/CreatureLineageSystem'
function makeSys() { return new CreatureLineageSystem() }
describe('CreatureLineageSystem', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  it('初始records为空Map', () => { expect((sys as any).records.size).toBe(0) })
  it('初始panelOpen为false', () => { expect((sys as any).panelOpen).toBe(false) })
})
