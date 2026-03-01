import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPropagandaSystem } from '../systems/DiplomaticPropagandaSystem'
function makeSys() { return new DiplomaticPropagandaSystem() }
describe('DiplomaticPropagandaSystem', () => {
  let sys: DiplomaticPropagandaSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPropaganda为空', () => { expect((sys as any).propaganda).toHaveLength(0) })
  it('注入后getPropaganda返回数据', () => {
    ;(sys as any).propaganda.push({ id: 1 })
    expect((sys as any).propaganda).toHaveLength(1)
  })
  it('getPropaganda返回数组', () => { expect(Array.isArray((sys as any).propaganda)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
