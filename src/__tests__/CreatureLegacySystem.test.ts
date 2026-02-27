import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLegacySystem } from '../systems/CreatureLegacySystem'
import type { Legacy, LegacyType } from '../systems/CreatureLegacySystem'

let nextId = 1
function makeSys(): CreatureLegacySystem { return new CreatureLegacySystem() }
function makeLegacy(creatureId: number, type: LegacyType = 'heroic'): Legacy {
  return { id: nextId++, creatureId, type, fame: 80, description: 'A great hero', influenceRadius: 50, tick: 0 }
}

describe('CreatureLegacySystem.getLegacies', () => {
  let sys: CreatureLegacySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无传承', () => { expect(sys.getLegacies()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).legacies.push(makeLegacy(1, 'scholarly'))
    expect(sys.getLegacies()[0].type).toBe('scholarly')
  })
  it('返回内部引用', () => {
    ;(sys as any).legacies.push(makeLegacy(1))
    expect(sys.getLegacies()).toBe((sys as any).legacies)
  })
  it('支持所有 6 种传承类型', () => {
    const types: LegacyType[] = ['heroic', 'scholarly', 'artistic', 'villainous', 'diplomatic', 'tragic']
    types.forEach((t, i) => { ;(sys as any).legacies.push(makeLegacy(i + 1, t)) })
    const all = sys.getLegacies()
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
})

describe('CreatureLegacySystem.getRecentLegacies', () => {
  let sys: CreatureLegacySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('count=2 返回最近 2 条', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).legacies.push(makeLegacy(i + 1)) }
    const recent = sys.getRecentLegacies(2)
    expect(recent).toHaveLength(2)
    expect(recent[1].creatureId).toBe(5)
  })
  it('count=0 返回全部（slice(-0)=slice(0)）', () => {
    ;(sys as any).legacies.push(makeLegacy(1))
    ;(sys as any).legacies.push(makeLegacy(2))
    expect(sys.getRecentLegacies(0)).toHaveLength(2)
  })
})
