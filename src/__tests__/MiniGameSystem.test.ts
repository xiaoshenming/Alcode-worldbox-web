import { describe, it, expect, beforeEach } from 'vitest'
import { MiniGameSystem } from '../systems/MiniGameSystem'
function makeSys() { return new MiniGameSystem() }
describe('MiniGameSystem', () => {
  let sys: MiniGameSystem
  beforeEach(() => { sys = makeSys() })
  it('getHistory初始为空', () => { expect(sys.getHistory()).toHaveLength(0) })
  it('isActive初始为false', () => { expect(sys.isActive()).toBe(false) })
  it('getHistory返回副本（非内部引用）', () => {
    const h1 = sys.getHistory()
    const h2 = sys.getHistory()
    expect(h1).not.toBe(h2)
  })
  it('nextTriggerTick是正数', () => { expect((sys as any).nextTriggerTick).toBeGreaterThan(0) })
  it('active初始为null', () => { expect((sys as any).active).toBeNull() })
})
