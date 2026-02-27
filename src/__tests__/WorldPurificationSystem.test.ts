import { describe, it, expect, beforeEach } from 'vitest'
import { WorldPurificationSystem } from '../systems/WorldPurificationSystem'
import type { PurificationSite } from '../systems/WorldPurificationSystem'

function makeSys(): WorldPurificationSystem { return new WorldPurificationSystem() }
let nextId = 1
function makeSite(): PurificationSite {
  return { id: nextId++, x: 20, y: 30, radius: 10, power: 80, growthRate: 0.1, age: 1000, active: true }
}

describe('WorldPurificationSystem.getSites', () => {
  let sys: WorldPurificationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无净化区', () => { expect(sys.getSites()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sites.push(makeSite())
    expect(sys.getSites()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSites()).toBe((sys as any).sites)
  })
  it('净化区字段正确', () => {
    ;(sys as any).sites.push(makeSite())
    const s = sys.getSites()[0]
    expect(s.power).toBe(80)
    expect(s.radius).toBe(10)
    expect(s.active).toBe(true)
  })
  it('getActiveSites只返回active区域', () => {
    const s1 = makeSite()
    const s2 = { ...makeSite(), active: false }
    ;(sys as any).sites.push(s1, s2)
    expect(sys.getActiveSites()).toHaveLength(1)
    expect(sys.getActiveSites()[0].active).toBe(true)
  })
})
