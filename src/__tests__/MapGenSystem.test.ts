import { describe, it, expect, beforeEach } from 'vitest'
import { MapGenSystem } from '../systems/MapGenSystem'

function makeSys() { return new MapGenSystem() }

describe('MapGenSystem', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })

  it('getRiverCount初始为0', () => { expect(sys.getRiverCount()).toBe(0) })
  it('getClusterCount初始为0', () => { expect(sys.getClusterCount()).toBe(0) })
  it('getRiverCount返回数字', () => { expect(typeof sys.getRiverCount()).toBe('number') })
  it('getClusterCount返回数字', () => { expect(typeof sys.getClusterCount()).toBe('number') })
  it('private rivers数组初始为空', () => {
    expect((sys as any).rivers).toHaveLength(0)
  })
  it('getRiverCount与private rivers长度一致', () => {
    expect(sys.getRiverCount()).toBe((sys as any).rivers.length)
  })
})
