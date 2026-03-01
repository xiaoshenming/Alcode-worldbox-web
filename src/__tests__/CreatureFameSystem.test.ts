import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFameSystem } from '../systems/CreatureFameSystem'
function makeSys(): CreatureFameSystem { return new CreatureFameSystem() }
describe('CreatureFameSystem', () => {
  let sys: CreatureFameSystem
  beforeEach(() => { sys = makeSys() })
  it('初始fameRecords为空', () => {
    expect((sys as any).fameRecords.size).toBe(0)
  })
  it('addFame后fameRecords增加记录', () => {
    sys.addFame(1, 'combat_victory')
    expect((sys as any).fameRecords.has(1)).toBe(true)
  })
  it('addFame增加totalFame', () => {
    sys.addFame(1, 'combat_victory')
    const record = (sys as any).fameRecords.get(1)
    expect(record.totalFame).toBeGreaterThan(0)
  })
  it('addFame多次累积fame', () => {
    sys.addFame(1, 'combat_victory')
    sys.addFame(1, 'building')
    const record = (sys as any).fameRecords.get(1)
    expect(record.totalFame).toBeGreaterThan(0)
  })
  it('fameRecords中的title字段有值', () => {
    sys.addFame(1, 'leadership')
    const record = (sys as any).fameRecords.get(1)
    expect(typeof record.title).toBe('string')
  })
})
