import { describe, it, expect, beforeEach } from 'vitest'
import { WeatherDisasterSystem } from '../systems/WeatherDisasterSystem'
function makeSys() { return new WeatherDisasterSystem() }
describe('WeatherDisasterSystem', () => {
  let sys: WeatherDisasterSystem
  beforeEach(() => { sys = makeSys() })
  it('getActiveDisasters初始为空', () => { expect(sys.getActiveDisasters()).toHaveLength(0) })
  it('注入后getActiveDisasters返回数据', () => {
    ;(sys as any).activeDisasters.push({ type: 'tornado', x: 5, y: 5, intensity: 1, tick: 0 })
    expect(sys.getActiveDisasters()).toHaveLength(1)
  })
})
