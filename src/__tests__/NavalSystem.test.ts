import { describe, it, expect, beforeEach } from 'vitest'
import { NavalSystem } from '../systems/NavalSystem'
function makeSys() { return new NavalSystem() }
describe('NavalSystem', () => {
  let sys: NavalSystem
  beforeEach(() => { sys = makeSys() })
  it('初始portShipCount为空Map', () => { expect((sys as any).portShipCount.size).toBe(0) })
})
