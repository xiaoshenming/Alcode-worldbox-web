import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticExonerationSystem } from '../systems/DiplomaticExonerationSystem'
function makeSys() { return new DiplomaticExonerationSystem() }
describe('DiplomaticExonerationSystem', () => {
  let sys: DiplomaticExonerationSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getProceedings为空', () => { expect(sys.getProceedings()).toHaveLength(0) })
  it('注入后getProceedings返回数据', () => {
    ;(sys as any).proceedings.push({ id: 1 })
    expect(sys.getProceedings()).toHaveLength(1)
  })
})
