import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSentinelSystem } from '../systems/CreatureSentinelSystem'
import type { Sentinel, PatrolRoute } from '../systems/CreatureSentinelSystem'

let nextId = 1
function makeSys(): CreatureSentinelSystem { return new CreatureSentinelSystem() }
function makeSentinel(entityId: number, route: PatrolRoute = 'perimeter'): Sentinel {
  return { id: nextId++, entityId, skill: 70, alertness: 80, threatsDetected: 5, patrolRoute: route, visionRange: 10, shiftDuration: 8, fatigue: 20, tick: 0 }
}

describe('CreatureSentinelSystem.getSentinels', () => {
  let sys: CreatureSentinelSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无哨兵', () => { expect(sys.getSentinels()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sentinels.push(makeSentinel(1, 'watchtower'))
    expect(sys.getSentinels()[0].patrolRoute).toBe('watchtower')
  })
  it('返回内部引用', () => {
    ;(sys as any).sentinels.push(makeSentinel(1))
    expect(sys.getSentinels()).toBe((sys as any).sentinels)
  })
  it('支持所有4种巡逻路线', () => {
    const routes: PatrolRoute[] = ['perimeter', 'watchtower', 'roaming', 'gate']
    routes.forEach((r, i) => { ;(sys as any).sentinels.push(makeSentinel(i + 1, r)) })
    const all = sys.getSentinels()
    routes.forEach((r, i) => { expect(all[i].patrolRoute).toBe(r) })
  })
  it('多个全部返回', () => {
    ;(sys as any).sentinels.push(makeSentinel(1))
    ;(sys as any).sentinels.push(makeSentinel(2))
    expect(sys.getSentinels()).toHaveLength(2)
  })
})
