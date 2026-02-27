import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticNeutralitySystem } from '../systems/DiplomaticNeutralitySystem'
function makeSys() { return new DiplomaticNeutralitySystem() }
describe('DiplomaticNeutralitySystem', () => {
  let sys: DiplomaticNeutralitySystem
  beforeEach(() => { sys = makeSys() })
  it('初始getDeclarations为空', () => { expect(sys.getDeclarations()).toHaveLength(0) })
  it('注入后getDeclarations返回数据', () => {
    ;(sys as any).declarations.push({ id: 1 })
    expect(sys.getDeclarations()).toHaveLength(1)
  })
})
