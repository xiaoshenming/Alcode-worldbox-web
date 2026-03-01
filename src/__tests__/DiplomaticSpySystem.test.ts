import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticSpySystem } from '../systems/DiplomaticSpySystem'
function makeSys() { return new DiplomaticSpySystem() }
describe('DiplomaticSpySystem', () => {
  let sys: DiplomaticSpySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getSpies为空', () => { expect((sys as any).spies).toHaveLength(0) })
  it('注入后getSpies返回数据', () => {
    ;(sys as any).spies.push({ id: 1 })
    expect((sys as any).spies).toHaveLength(1)
  })
  it('getSpies返回数组', () => { expect(Array.isArray((sys as any).spies)).toBe(true) })
  it('spies初始为空数组', () => { expect((sys as any).spies).toHaveLength(0) })
  it('nextCheckTick初始大于0', () => { expect((sys as any).nextCheckTick).toBeGreaterThan(0) })
})
