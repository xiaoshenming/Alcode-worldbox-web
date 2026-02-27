import { describe, it, expect, beforeEach } from 'vitest'
import { WorldObsidianSystem } from '../systems/WorldObsidianSystem'
import type { ObsidianDeposit, ObsidianQuality } from '../systems/WorldObsidianSystem'

function makeSys(): WorldObsidianSystem { return new WorldObsidianSystem() }
let nextId = 1
function makeDeposit(quality: ObsidianQuality = 'polished'): ObsidianDeposit {
  return { id: nextId++, x: 20, y: 30, quality, reserves: 500, harvestRate: 5, age: 1000, tick: 0 }
}

describe('WorldObsidianSystem.getDeposits', () => {
  let sys: WorldObsidianSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无黑曜石矿', () => { expect(sys.getDeposits()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).deposits.push(makeDeposit())
    expect(sys.getDeposits()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getDeposits()).toBe((sys as any).deposits)
  })
  it('支持4种品质', () => {
    const qualities: ObsidianQuality[] = ['rough', 'polished', 'flawless', 'legendary']
    expect(qualities).toHaveLength(4)
  })
  it('黑曜石矿字段正确', () => {
    ;(sys as any).deposits.push(makeDeposit('legendary'))
    const d = sys.getDeposits()[0]
    expect(d.quality).toBe('legendary')
    expect(d.reserves).toBe(500)
    expect(d.harvestRate).toBe(5)
  })
})
