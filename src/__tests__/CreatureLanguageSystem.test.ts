import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLanguageSystem } from '../systems/CreatureLanguageSystem'
function makeSys() { return new CreatureLanguageSystem() }
describe('CreatureLanguageSystem', () => {
  let sys: CreatureLanguageSystem
  beforeEach(() => { sys = makeSys() })
  it('getLanguages初始为空Map', () => { expect(sys.getLanguages().size).toBe(0) })
  it('getLanguageCount初始为0', () => { expect(sys.getLanguageCount()).toBe(0) })
  it('getLanguage未知civId返回undefined', () => { expect(sys.getLanguage(999)).toBeUndefined() })
  it('注入后getLanguages返回数据', () => {
    ;(sys as any).languages.set(1, { civId: 1, name: 'TestLang', words: {} })
    expect(sys.getLanguageCount()).toBe(1)
  })
})
