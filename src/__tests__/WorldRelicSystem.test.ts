import { describe, it, expect, beforeEach } from 'vitest'
import { WorldRelicSystem } from '../systems/WorldRelicSystem'
import type { Relic, RelicType } from '../systems/WorldRelicSystem'

function makeSys(): WorldRelicSystem { return new WorldRelicSystem() }
let nextId = 1
function makeRelic(type: RelicType = 'wisdom', discoveredBy: number | null = null): Relic {
  return { id: nextId++, type, x: 10, y: 10, power: 0.5, discoveredBy, discoveredTick: discoveredBy !== null ? 100 : null, active: true }
}

describe('WorldRelicSystem.getRelics', () => {
  let sys: WorldRelicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无遗物', () => { expect((sys as any).relics).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).relics.push(makeRelic())
    expect((sys as any).relics).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).relics).toBe((sys as any).relics)
  })
  it('支持5种遗物类型', () => {
    const types: RelicType[] = ['wisdom', 'war', 'nature', 'arcane', 'prosperity']
    expect(types).toHaveLength(5)
  })
  it('遗物字段正确', () => {
    ;(sys as any).relics.push(makeRelic('war'))
    const r = (sys as any).relics[0]
    expect(r.type).toBe('war')
    expect(r.power).toBe(0.5)
    expect(r.active).toBe(true)
  })
})

describe('WorldRelicSystem.getDiscoveredRelics', () => {
  let sys: WorldRelicSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无已发现遗物', () => { expect(sys.getDiscoveredRelics()).toHaveLength(0) })
  it('discoveredBy!=null才返回', () => {
    ;(sys as any).relics.push(makeRelic('wisdom', null))    // undiscovered
    ;(sys as any).relics.push(makeRelic('war', 1))           // discovered
    expect(sys.getDiscoveredRelics()).toHaveLength(1)
  })
  it('discoveredBy=null被过滤', () => {
    ;(sys as any).relics.push(makeRelic('nature', null))
    expect(sys.getDiscoveredRelics()).toHaveLength(0)
  })
})
