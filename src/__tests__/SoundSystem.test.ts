import { describe, it, expect, beforeEach } from 'vitest'
import { SoundSystem } from '../systems/SoundSystem'
function makeSys() { return new SoundSystem() }
describe('SoundSystem', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys() })
  it('初始ctx为null', () => { expect((sys as any).ctx).toBeNull() })
  it('初始muted为false', () => { expect((sys as any).muted).toBe(false) })
})
