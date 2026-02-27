import { describe, it, expect, beforeEach } from 'vitest'
import { DiplomaticEntenteSystem } from '../systems/DiplomaticEntenteSystem'
function makeSys() { return new DiplomaticEntenteSystem() }
describe('DiplomaticEntenteSystem', () => {
  let sys: DiplomaticEntenteSystem
  beforeEach(() => { sys = makeSys() })
  it('初始getTreaties为空', () => { expect(sys.getTreaties()).toHaveLength(0) })
  it('注入后getTreaties返回数据', () => {
    ;(sys as any).treaties.push({ id: 1 })
    expect(sys.getTreaties()).toHaveLength(1)
  })
})
