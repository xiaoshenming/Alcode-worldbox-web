import { describe, it, expect, beforeEach } from 'vitest'
import { WeatherParticleSystem } from '../systems/WeatherParticleSystem'

function makeSys() { return new WeatherParticleSystem() }

describe('WeatherParticleSystem', () => {
  let sys: WeatherParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('初始currentWeather为clear', () => { expect((sys as any).currentWeather).toBe('clear') })
  it('初始intensity为1', () => { expect((sys as any).intensity).toBe(1) })
  it('getWeather()初始返回clear', () => { expect(sys.getWeather()).toBe('clear') })
  it('setWeather(rain)后getWeather()返回rain', () => {
    sys.setWeather('rain')
    expect(sys.getWeather()).toBe('rain')
  })
  it('setWeather(snow)后getWeather()返回snow', () => {
    sys.setWeather('snow')
    expect(sys.getWeather()).toBe('snow')
  })
  it('getParticleCount()初始为数字', () => {
    expect(typeof sys.getParticleCount()).toBe('number')
  })
  it('setIntensity(0.5)后intensity字段变化', () => {
    sys.setIntensity(0.5)
    expect((sys as any).intensity).toBe(0.5)
  })
})
