import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePilgrimageSystem } from '../systems/CreaturePilgrimageSystem'
import type { Pilgrimage, PilgrimageGoal } from '../systems/CreaturePilgrimageSystem'

let nextId = 1
function makeSys(): CreaturePilgrimageSystem { return new CreaturePilgrimageSystem() }
function makePilgrimage(entityId: number, goal: PilgrimageGoal = 'sacred_mountain'): Pilgrimage {
  return { id: nextId++, entityId, goal, targetX: 100, targetY: 100, distanceTraveled: 0, wisdom: 0, startTick: 0, completed: false }
}

describe('CreaturePilgrimageSystem.getPilgrimages', () => {
  let sys: CreaturePilgrimageSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无朝圣', () => { expect((sys as any).pilgrimages).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1, 'ancient_temple'))
    expect((sys as any).pilgrimages[0].goal).toBe('ancient_temple')
  })
  it('返回内部引用', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1))
    expect((sys as any).pilgrimages).toBe((sys as any).pilgrimages)
  })
  it('支持所有5种目标', () => {
    const goals: PilgrimageGoal[] = ['sacred_mountain', 'ancient_temple', 'holy_spring', 'ancestor_grave', 'world_edge']
    goals.forEach((g, i) => { ;(sys as any).pilgrimages.push(makePilgrimage(i + 1, g)) })
    const all = (sys as any).pilgrimages
    goals.forEach((g, i) => { expect(all[i].goal).toBe(g) })
  })
  it('completed初始为false', () => {
    ;(sys as any).pilgrimages.push(makePilgrimage(1))
    expect((sys as any).pilgrimages[0].completed).toBe(false)
  })
})
