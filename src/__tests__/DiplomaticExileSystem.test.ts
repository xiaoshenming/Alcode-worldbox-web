import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticExileSystem } from '../systems/DiplomaticExileSystem'
function makeSys() { return new DiplomaticExileSystem() }
describe('DiplomaticExileSystem', () => {
  let sys: DiplomaticExileSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getExiles为空', () => { expect(sys.getExiles()).toHaveLength(0) })
  it('注入后getExiles返回数据', () => {
    ;(sys as any).exiles.push({ id: 1 })
    expect(sys.getExiles()).toHaveLength(1)
  })
})
