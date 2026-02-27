import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPlebisciteSystem } from '../systems/DiplomaticPlebisciteSystem'
function makeSys() { return new DiplomaticPlebisciteSystem() }
describe('DiplomaticPlebisciteSystem', () => {
  let sys: DiplomaticPlebisciteSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPacts为空', () => { expect(sys.getPacts()).toHaveLength(0) })
  it('注入后getPacts返回数据', () => {
    ;(sys as any).pacts.push({ id: 1 })
    expect(sys.getPacts()).toHaveLength(1)
  })
})
