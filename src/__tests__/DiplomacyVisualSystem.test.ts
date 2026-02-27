import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomacyVisualSystem } from '../systems/DiplomacyVisualSystem'
function makeSys() { return new DiplomacyVisualSystem() }
describe('DiplomacyVisualSystem', () => {
  let sys: DiplomacyVisualSystem
  beforeEach(() => { sys = makeSys() })
  it('初始civs为空', () => { expect((sys as any).civs).toHaveLength(0) })
  it('初始visible为true', () => { expect((sys as any).visible).toBe(true) })
  it('isVisible 初始返回false（面板初始关闭）', () => { expect(sys.isVisible()).toBe(false) })
  it('addEvent 后 bubbles 数组增加', () => {
    sys.addEvent({ type: 'war', civA: 'civ1', civB: 'civ2', x: 10, y: 20 })
    expect((sys as any).bubbles.length).toBeGreaterThan(0)
  })
  it('visible初始为true', () => { expect((sys as any).visible).toBe(true) })
})
