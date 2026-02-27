import { describe, it, expect, beforeEach } from 'vitest'
import { DayNightRenderer } from '../systems/DayNightRenderer'
function makeSys() { return new DayNightRenderer() }
describe('DayNightRenderer', () => {
  let sys: DayNightRenderer
  beforeEach(() => { sys = makeSys() })
  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('初始cachedIsDay为true', () => { expect((sys as any).cachedIsDay).toBe(true) })
  it('初始cachedCycle为-1（强制重绘）', () => { expect((sys as any).cachedCycle).toBe(-1) })
  it('初始flickerTime为0', () => { expect((sys as any).flickerTime).toBe(0) })
  it('初始offscreen为null（懒加载）', () => { expect((sys as any).offscreen).toBeNull() })
  it('_overlay 对象存在且有r/g/b/a字段', () => {
    const overlay = (sys as any)._overlay
    expect(overlay).toHaveProperty('r')
    expect(overlay).toHaveProperty('g')
    expect(overlay).toHaveProperty('b')
    expect(overlay).toHaveProperty('a')
  })
})
