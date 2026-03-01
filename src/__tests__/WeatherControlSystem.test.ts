import { describe, it, expect, beforeEach } from 'vitest'
import { WeatherControlSystem } from '../systems/WeatherControlSystem'
function makeSys() { return new WeatherControlSystem() }
describe('WeatherControlSystem', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })
  it('getWeather返回字符串', () => { expect(typeof (sys as any).weatherType).toBe('string') })
  it('getIntensity返回数字', () => { expect(typeof sys.getIntensity()).toBe('number') })
  it('setWeather 修改天气类型', () => {
    sys.setWeather('rain')
    expect((sys as any).weatherType).toBe('rain')
  })
  it('setIntensity 修改强度', () => {
    sys.setIntensity(0.8)
    expect(sys.getIntensity()).toBe(0.8)
  })
  it('isLocked 初始为false', () => { expect(sys.isLocked()).toBe(false) })
})
