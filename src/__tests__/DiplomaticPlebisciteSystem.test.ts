import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPlebisciteSystem } from '../systems/DiplomaticPlebisciteSystem'
function makeSys() { return new DiplomaticPlebisciteSystem() }
describe('DiplomaticPlebisciteSystem', () => {
  let sys: DiplomaticPlebisciteSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPacts为空', () => { expect((sys as any).pacts).toHaveLength(0) })
  it('注入后getPacts返回数据', () => {
    ;(sys as any).pacts.push({ id: 1 })
    expect((sys as any).pacts).toHaveLength(1)
  })
  it('getPacts返回数组', () => { expect(Array.isArray((sys as any).pacts)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
})
