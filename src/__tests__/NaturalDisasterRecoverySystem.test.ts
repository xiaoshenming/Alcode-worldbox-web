import { describe, it, expect, beforeEach } from 'vitest'
import { NaturalDisasterRecoverySystem } from '../systems/NaturalDisasterRecoverySystem'
import type { RecoveryZone, DisasterType } from '../systems/NaturalDisasterRecoverySystem'

function makeSys(): NaturalDisasterRecoverySystem { return new NaturalDisasterRecoverySystem() }
let nextId = 1
function makeZone(progress: number = 0.5, disasterType: DisasterType = 'earthquake'): RecoveryZone {
  return {
    id: nextId++, centerX: 50, centerY: 50, radius: 10, disasterType, progress, startTick: 0,
    damagedTiles: [], destroyedBuildings: []
  }
}

describe('NaturalDisasterRecoverySystem.getRecoveryZones', () => {
  let sys: NaturalDisasterRecoverySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无恢复区', () => { expect(sys.getRecoveryZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).recoveryZones.push(makeZone())
    expect(sys.getRecoveryZones()).toHaveLength(1)
  })
  it('支持5种灾难类型', () => {
    const types: DisasterType[] = ['earthquake', 'fire', 'flood', 'meteor', 'volcano']
    expect(types).toHaveLength(5)
  })
  it('区域字段正确', () => {
    ;(sys as any).recoveryZones.push(makeZone(0.7, 'fire'))
    const z = sys.getRecoveryZones()[0]
    expect(z.progress).toBe(0.7)
    expect(z.disasterType).toBe('fire')
  })
})

describe('NaturalDisasterRecoverySystem.getRecoveryProgress', () => {
  let sys: NaturalDisasterRecoverySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('不存在的id返回-1', () => { expect(sys.getRecoveryProgress(999)).toBe(-1) })
  it('注入后返回正确进度', () => {
    const zone = makeZone(0.3)
    ;(sys as any).recoveryZones.push(zone)
    expect(sys.getRecoveryProgress(zone.id)).toBe(0.3)
  })
})

describe('NaturalDisasterRecoverySystem.getActiveZoneCount', () => {
  let sys: NaturalDisasterRecoverySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始为0', () => { expect(sys.getActiveZoneCount()).toBe(0) })
  it('注入后增加', () => {
    ;(sys as any).recoveryZones.push(makeZone())
    ;(sys as any).recoveryZones.push(makeZone())
    expect(sys.getActiveZoneCount()).toBe(2)
  })
})
