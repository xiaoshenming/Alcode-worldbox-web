import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLineageSystem } from '../systems/CreatureLineageSystem'
function makeSys() { return new CreatureLineageSystem() }
describe('CreatureLineageSystem', () => {
  let sys: CreatureLineageSystem
  beforeEach(() => { sys = makeSys() })
  it('初始records为空Map', () => { expect((sys as any).records.size).toBe(0) })
  it('初始panelOpen为false', () => { expect((sys as any).panelOpen).toBe(false) })
  it('registerBirth 后 records 增加', () => {
    sys.registerBirth(1, 0, 0, 'TestBeast', 'human')
    expect((sys as any).records.size).toBe(1)
  })
  it('registerBirth 后获取正确的名字', () => {
    sys.registerBirth(1, 0, 0, 'TestBeast', 'human')
    const record = (sys as any).records.get(1)
    expect(record.name).toBe('TestBeast')
    expect(record.alive).toBe(true)
  })
  it('registerDeath 后 alive 为false', () => {
    sys.registerBirth(1, 0, 0, 'TestBeast', 'human')
    sys.registerDeath(1)
    const record = (sys as any).records.get(1)
    expect(record.alive).toBe(false)
  })
  it('handleKey l 切换panelOpen', () => {
    sys.handleKey('l')
    expect((sys as any).panelOpen).toBe(true)
    sys.handleKey('l')
    expect((sys as any).panelOpen).toBe(false)
  })
})
