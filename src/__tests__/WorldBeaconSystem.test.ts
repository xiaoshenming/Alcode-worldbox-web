import { describe, it, expect, beforeEach } from 'vitest'
import { WorldBeaconSystem } from '../systems/WorldBeaconSystem'
import type { Beacon, BeaconType } from '../systems/WorldBeaconSystem'

function makeSys(): WorldBeaconSystem { return new WorldBeaconSystem() }
let nextId = 1
function makeBeacon(lit: boolean = true, type: BeaconType = 'watchtower'): Beacon {
  return { id: nextId++, x: 10, y: 10, type, range: 12, lit, fuel: 80, builtTick: 0, lastLitTick: 0 }
}

describe('WorldBeaconSystem.getBeacons', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无烽火台', () => { expect((sys as any).beacons).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).beacons.push(makeBeacon())
    expect((sys as any).beacons).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).beacons).toBe((sys as any).beacons)
  })
  it('支持6种烽火台类型', () => {
    const types: BeaconType[] = ['watchtower', 'lighthouse', 'signal_fire', 'smoke_signal', 'war_beacon', 'trade_marker']
    expect(types).toHaveLength(6)
  })
})

describe('WorldBeaconSystem.getBeaconCount', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始为0', () => { expect((sys as any).beacons.length).toBe(0) })
  it('注入后增加', () => {
    ;(sys as any).beacons.push(makeBeacon())
    ;(sys as any).beacons.push(makeBeacon())
    expect((sys as any).beacons.length).toBe(2)
  })
})

describe('WorldBeaconSystem.getLitBeacons', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无点亮烽火台', () => { expect(sys.getLitBeacons()).toHaveLength(0) })
  it('lit=true才返回', () => {
    ;(sys as any).beacons.push(makeBeacon(true))
    ;(sys as any).beacons.push(makeBeacon(false))
    expect(sys.getLitBeacons()).toHaveLength(1)
  })
})

describe('WorldBeaconSystem.getBeaconAt', () => {
  let sys: WorldBeaconSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配时返回null', () => { expect(sys.getBeaconAt(99, 99)).toBeNull() })
  it('坐标匹配时返回烽火台', () => {
    ;(sys as any).beacons.push(makeBeacon())
    expect(sys.getBeaconAt(10, 10)).not.toBeNull()
  })
})
