import { describe, it, expect, beforeEach } from 'vitest'
import { ReligionSystem } from '../systems/ReligionSystem'
function makeSys() { return new ReligionSystem() }
describe('ReligionSystem', () => {
  let sys: ReligionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始blessingCooldowns为空Map', () => { expect((sys as any).blessingCooldowns.size).toBe(0) })
})
