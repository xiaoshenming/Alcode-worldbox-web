import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticPropagandaSystem } from '../systems/DiplomaticPropagandaSystem'
function makeSys() { return new DiplomaticPropagandaSystem() }
describe('DiplomaticPropagandaSystem', () => {
  let sys: DiplomaticPropagandaSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getPropaganda为空', () => { expect(sys.getPropaganda()).toHaveLength(0) })
  it('注入后getPropaganda返回数据', () => {
    ;(sys as any).propaganda.push({ id: 1 })
    expect(sys.getPropaganda()).toHaveLength(1)
  })
})
