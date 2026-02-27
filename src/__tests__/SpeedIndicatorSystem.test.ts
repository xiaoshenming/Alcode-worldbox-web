import { describe, it, expect, beforeEach } from 'vitest'
import { SpeedIndicatorSystem } from '../systems/SpeedIndicatorSystem'
function makeSys() { return new SpeedIndicatorSystem() }
describe('SpeedIndicatorSystem', () => {
  let sys: SpeedIndicatorSystem
  beforeEach(() => { sys = makeSys() })
  it('初始animPhase为0', () => { expect((sys as any).animPhase).toBe(0) })
})
