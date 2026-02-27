import { describe, it, expect, beforeEach } from 'vitest'
import { AmbientSoundMixer } from '../systems/AmbientSoundMixer'
function makeSys() { return new AmbientSoundMixer() }
describe('AmbientSoundMixer', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })
  it('getMasterVolume返回数字', () => { expect(typeof sys.getMasterVolume()).toBe('number') })
})
