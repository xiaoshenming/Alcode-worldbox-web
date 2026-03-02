import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureExileSystem } from '../systems/CreatureExileSystem'
import type { Exile, ExileReason } from '../systems/CreatureExileSystem'

let nextId = 1
function makeSys(): CreatureExileSystem { return new CreatureExileSystem() }
function makeExile(entityId: number, reason: ExileReason = 'crime', wanderTicks = 0): Exile {
  return { id: nextId++, entityId, fromCivId: 1, reason, wanderTicks, tick: 0 }
}

// em mock that supports getEntitiesWithComponents, getComponent, returns null for components
const makeEm = () => ({
  getEntitiesWithComponents: () => [] as number[],
  getComponent: () => null,
})

describe('CreatureExileSystem', () => {
  let sys: CreatureExileSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无流放者', () => {
    expect((sys as any).exiles).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).exiles.push(makeExile(1, 'treason'))
    expect((sys as any).exiles[0].reason).toBe('treason')
  })

  it('ExileReason包含6种', () => {
    const reasons: ExileReason[] = ['crime', 'treason', 'heresy', 'cowardice', 'debt', 'curse']
    reasons.forEach((r, i) => { ;(sys as any).exiles.push(makeExile(i + 1, r)) })
    const all = (sys as any).exiles
    reasons.forEach((r, i) => { expect(all[i].reason).toBe(r) })
  })

  it('tick差值<800时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, makeEm() as any, 1799) // 1799-1000=799 < 800
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值>=800时更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, makeEm() as any, 1800) // 1800-1000=800 >= 800
    expect((sys as any).lastCheck).toBe(1800)
  })

  it('_exiledSet初始为空', () => {
    expect((sys as any)._exiledSet.size).toBe(0)
  })

  it('isBanished: entityId在_exiledSet中返回true', () => {
    ;(sys as any)._exiledSet.add(42)
    expect((sys as any).isExiled(42)).toBe(true)
  })

  it('isBanished: entityId不在_exiledSet中返回false', () => {
    expect((sys as any).isExiled(99)).toBe(false)
  })

  it('severity字段: fromCivId可自定义', () => {
    const exile = makeExile(3, 'debt')
    exile.fromCivId = 7
    ;(sys as any).exiles.push(exile)
    expect((sys as any).exiles[0].fromCivId).toBe(7)
  })

  it('支持多个流放者同时存在', () => {
    ;(sys as any).exiles.push(makeExile(1, 'crime'))
    ;(sys as any).exiles.push(makeExile(2, 'heresy'))
    ;(sys as any).exiles.push(makeExile(3, 'curse'))
    expect((sys as any).exiles).toHaveLength(3)
  })

  it('cleanup: wanderTicks>=5000的流放者被移除', () => {
    ;(sys as any).exiles.push(makeExile(1, 'crime', 5000))
    ;(sys as any).exiles.push(makeExile(2, 'debt', 100))
    ;(sys as any)._exiledSet.add(1)
    ;(sys as any)._exiledSet.add(2)
    ;(sys as any).lastCheck = 0
    sys.update(16, makeEm() as any, 800)
    const exiles = (sys as any).exiles
    // entity 1 wanderTicks=5000 -> after updateWanderers becomes 5001, >=5000 -> removed
    expect(exiles.some((e: Exile) => e.entityId === 1)).toBe(false)
    expect(exiles.some((e: Exile) => e.entityId === 2)).toBe(true)
  })

  it('MAX_EXILES截断: 超过60个时裁剪到60', () => {
    for (let i = 0; i < 65; i++) {
      ;(sys as any).exiles.push(makeExile(i + 1))
      ;(sys as any)._exiledSet.add(i + 1)
    }
    ;(sys as any).lastCheck = 0
    sys.update(16, makeEm() as any, 800)
    expect((sys as any).exiles.length).toBeLessThanOrEqual(60)
  })
})
