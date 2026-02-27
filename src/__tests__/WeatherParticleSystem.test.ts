import { describe, it, expect, beforeEach } from 'vitest'
import { WeatherParticleSystem } from '../systems/WeatherParticleSystem'
function makeSys() { return new WeatherParticleSystem() }
describe('WeatherParticleSystem', () => {
  let sys: WeatherParticleSystem
  beforeEach(() => { sys = makeSys() })
  it('初始currentWeather为clear', () => { expect((sys as any).currentWeather).toBe('clear') })
  it('初始intensity为1', () => { expect((sys as any).intensity).toBe(1) })
})
