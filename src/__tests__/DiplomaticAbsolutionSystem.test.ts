import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticAbsolutionSystem } from '../systems/DiplomaticAbsolutionSystem'
function makeSys() { return new DiplomaticAbsolutionSystem() }
describe('DiplomaticAbsolutionSystem', () => {
  let sys: DiplomaticAbsolutionSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getDeclarations为空', () => { expect(sys.getDeclarations()).toHaveLength(0) })
  it('注入后getDeclarations返回数据', () => {
    ;(sys as any).declarations.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_guilt_release', sincerity: 50, healingEffect: 30, politicalCost: 20, moralAuthority: 25, duration: 0, tick: 0 })
    expect(sys.getDeclarations()).toHaveLength(1)
    expect(sys.getDeclarations()[0].id).toBe(1)
  })
})
