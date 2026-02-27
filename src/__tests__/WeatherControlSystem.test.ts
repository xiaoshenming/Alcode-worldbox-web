import { describe, it, expect, beforeEach } from 'vitest'
import { WeatherControlSystem } from '../systems/WeatherControlSystem'
function makeSys() { return new WeatherControlSystem() }
describe('WeatherControlSystem', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })
  it('getWeather返回字符串', () => { expect(typeof sys.getWeather()).toBe('string') })
  it('getIntensity返回数字', () => { expect(typeof sys.getIntensity()).toBe('number') })
})
