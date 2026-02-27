import { describe, it, expect, beforeEach } from 'vitest'
import { SpeedIndicatorSystem } from '../systems/SpeedIndicatorSystem'
function makeSys() { return new SpeedIndicatorSystem() }
describe('SpeedIndicatorSystem', () => {
  let sys: SpeedIndicatorSystem
  beforeEach(() => { sys = makeSys() })
  it('初始animPhase为0', () => { expect((sys as any).animPhase).toBe(0) })
  it('update(1) 推进animPhase', () => {
    sys.update(1)
    expect((sys as any).animPhase).toBeGreaterThan(0)
  })
  it('update(0) 不推进animPhase（暂停）', () => {
    sys.update(0)
    expect((sys as any).animPhase).toBe(0)
  })
  it('animPhase 超过1后循环重置', () => {
    // 持续调用让phase循环
    for (let i = 0; i < 100; i++) sys.update(5)
    expect((sys as any).animPhase).toBeGreaterThanOrEqual(0)
    expect((sys as any).animPhase).toBeLessThan(1)
  })
  it('update(2) 推进速度比update(1)快', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    s1.update(1)
    s2.update(2)
    expect((s2 as any).animPhase).toBeGreaterThan((s1 as any).animPhase)
  })
})
