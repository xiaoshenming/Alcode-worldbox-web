import { describe, it, expect, beforeEach } from 'vitest'
import { MusicSystem } from '../systems/MusicSystem'
function makeSys() { return new MusicSystem() }
describe('MusicSystem', () => {
  let sys: MusicSystem
  beforeEach(() => { sys = makeSys() })
  it('初始ctx为null', () => { expect((sys as any).ctx).toBeNull() })
  it('初始masterVolume为正数', () => { expect((sys as any).masterVolume).toBeGreaterThan(0) })
})
