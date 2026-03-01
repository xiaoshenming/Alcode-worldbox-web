import { describe, it, expect, beforeEach } from 'vitest'
import { WeatherDisasterSystem } from '../systems/WeatherDisasterSystem'
function makeSys() { return new WeatherDisasterSystem() }
describe('WeatherDisasterSystem', () => {
  let sys: WeatherDisasterSystem
  beforeEach(() => { sys = makeSys() })
  it('getActiveDisasters初始为空', () => { expect(sys.getActiveDisasters()).toHaveLength(0) })
  it('注入后getActiveDisasters返回数据', () => {
    ;sys.getActiveDisasters().push({ type: 'tornado' as any, x: 5, y: 5, intensity: 1, tick: 0 } as any)
    expect(sys.getActiveDisasters()).toHaveLength(1)
  })
  it('getActiveDisasters返回数组', () => { expect(Array.isArray(sys.getActiveDisasters())).toBe(true) })
  it('lastCheckTick初始为0', () => { expect((sys as any).lastCheckTick).toBe(0) })
  it('注入后清空activeDisasters恢复为空', () => {
    sys.getActiveDisasters().push({ type: 'blizzard' as any, startTick: 0, duration: 100, intensity: 1, affectedArea: null, originalTiles: new Map() })
    ;(sys as any).activeDisasters.length = 0
    expect(sys.getActiveDisasters()).toHaveLength(0)
  })
})
