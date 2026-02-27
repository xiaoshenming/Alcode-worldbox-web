import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFameSystem } from '../systems/CreatureFameSystem'
import type { FameRecord, FameTitle } from '../systems/CreatureFameSystem'

function makeSys(): CreatureFameSystem { return new CreatureFameSystem() }
function makeRecord(totalFame: number, title: FameTitle = 'known'): FameRecord {
  const breakdown = { combat_victory: 0, exploration: 0, building: 0, healing: 0, leadership: 0, sacrifice: 0 }
  return { totalFame, fameBreakdown: breakdown, title, rank: 1 }
}

describe('CreatureFameSystem.getFame', () => {
  let sys: CreatureFameSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 undefined', () => { expect(sys.getFame(999)).toBeUndefined() })

  it('注入后可查询', () => {
    ;(sys as any).fameRecords.set(1, makeRecord(100, 'famous'))
    const rec = sys.getFame(1)
    expect(rec).toBeDefined()
    expect(rec!.totalFame).toBe(100)
    expect(rec!.title).toBe('famous')
  })
})

describe('CreatureFameSystem.getFameTitle', () => {
  let sys: CreatureFameSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 unknown', () => { expect(sys.getFameTitle(999)).toBe('unknown') })

  it('注入记录后返回 title', () => {
    ;(sys as any).fameRecords.set(1, makeRecord(200, 'legendary'))
    expect(sys.getFameTitle(1)).toBe('legendary')
  })
})

describe('CreatureFameSystem.getTopFamous', () => {
  let sys: CreatureFameSystem
  beforeEach(() => { sys = makeSys() })

  it('空时返回空数组', () => { expect(sys.getTopFamous(5)).toHaveLength(0) })

  it('按 totalFame 降序返回前 N 个', () => {
    ;(sys as any).fameRecords.set(1, makeRecord(50))
    ;(sys as any).fameRecords.set(2, makeRecord(200))
    ;(sys as any).fameRecords.set(3, makeRecord(100))
    const top = sys.getTopFamous(2)
    expect(top).toHaveLength(2)
    expect(top[0][1].totalFame).toBe(200)
    expect(top[1][1].totalFame).toBe(100)
  })
})
