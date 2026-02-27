import { describe, it, expect, beforeEach } from 'vitest'
import { AmbientSoundMixer } from '../systems/AmbientSoundMixer'
function makeSys() { return new AmbientSoundMixer() }
const ctx = { isNight: false, season: 'spring', weather: 'clear', nearestBattleDist: 999, nearestCityDist: 999, cameraZoom: 1 }

describe('AmbientSoundMixer', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })

  it('getMasterVolume返回数字', () => { expect(typeof sys.getMasterVolume()).toBe('number') })
  it('初始 masterVolume 为 1', () => { expect(sys.getMasterVolume()).toBe(1) })
  it('setMasterVolume 可以设置音量', () => {
    sys.setMasterVolume(0.5)
    expect(sys.getMasterVolume()).toBe(0.5)
  })
  it('setMasterVolume 超出范围时被 clamp', () => {
    sys.setMasterVolume(2)
    expect(sys.getMasterVolume()).toBe(1)
    sys.setMasterVolume(-1)
    expect(sys.getMasterVolume()).toBe(0)
  })
  it('初始 isMuted 为 false', () => { expect(sys.isMuted()).toBe(false) })
  it('toggleMute 切换静音状态', () => {
    sys.toggleMute()
    expect(sys.isMuted()).toBe(true)
    sys.toggleMute()
    expect(sys.isMuted()).toBe(false)
  })
  it('getMixState 返回对象', () => {
    const state = sys.getMixState()
    expect(typeof state).toBe('object')
    expect(state.masterVolume).toBe(1)
    expect(state.muted).toBe(false)
  })
  it('update 不崩溃', () => {
    expect(() => sys.update(0, ctx)).not.toThrow()
  })
})
