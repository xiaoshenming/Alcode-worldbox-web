import { describe, it, expect, beforeEach } from 'vitest'
import { SoundSystem } from '../systems/SoundSystem'
function makeSys() { return new SoundSystem() }
describe('SoundSystem', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys() })
  it('初始ctx为null', () => { expect((sys as any).ctx).toBeNull() })
  it('初始muted为false', () => { expect((sys as any).muted).toBe(false) })
  it('isMuted 初始为false', () => { expect(sys.isMuted).toBe(false) })
  it('toggleMute切换muted状态', () => { const before = sys.isMuted; sys.toggleMute(); expect(sys.isMuted).toBe(!before) })
  it('toggleMute两次后恢复原状', () => { const before = sys.isMuted; sys.toggleMute(); sys.toggleMute(); expect(sys.isMuted).toBe(before) })
})
