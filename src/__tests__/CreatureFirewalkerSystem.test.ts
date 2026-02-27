import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFirewalkerSystem } from '../systems/CreatureFirewalkerSystem'
import type { FirewalkerData, FirewalkerMastery } from '../systems/CreatureFirewalkerSystem'

function makeSys(): CreatureFirewalkerSystem { return new CreatureFirewalkerSystem() }
function makeFirewalker(entityId: number, mastery: FirewalkerMastery = 'novice', active = true): FirewalkerData {
  return { entityId, heatResistance: 50, fireTrail: false, walkDistance: 20, mastery, active, tick: 0 }
}

describe('CreatureFirewalkerSystem.getFirewalkers', () => {
  let sys: CreatureFirewalkerSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无火行者', () => { expect(sys.getFirewalkers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).firewalkers.push(makeFirewalker(1, 'master'))
    expect(sys.getFirewalkers()[0].mastery).toBe('master')
  })

  it('返回内部引用', () => {
    ;(sys as any).firewalkers.push(makeFirewalker(1))
    expect(sys.getFirewalkers()).toBe((sys as any).firewalkers)
  })

  it('支持所有 4 种火行者精通等级', () => {
    const levels: FirewalkerMastery[] = ['novice', 'adept', 'master', 'grandmaster']
    levels.forEach((l, i) => { ;(sys as any).firewalkers.push(makeFirewalker(i + 1, l)) })
    const all = sys.getFirewalkers()
    levels.forEach((l, i) => { expect(all[i].mastery).toBe(l) })
  })

  it('active 字段可设为 false', () => {
    ;(sys as any).firewalkers.push(makeFirewalker(1, 'novice', false))
    expect(sys.getFirewalkers()[0].active).toBe(false)
  })
})
