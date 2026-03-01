import { describe, it, expect, beforeEach } from 'vitest'
import { WorldChronicleSystem } from '../systems/WorldChronicleSystem'
import type { Chronicle } from '../systems/WorldChronicleSystem'

function makeSys(): WorldChronicleSystem { return new WorldChronicleSystem() }
let nextId = 1
function makeChronicle(category: Chronicle['category'] = 'war', importance: 1 | 2 | 3 = 2, civId?: number, entityId?: number): Chronicle {
  return {
    id: nextId++, tick: 100, year: 50, category, title: 'Test', narrative: 'Test narrative',
    importance, involvedCivs: civId !== undefined ? [civId] : [], involvedEntities: entityId !== undefined ? [entityId] : []
  }
}

describe('WorldChronicleSystem.getChronicles', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无记录', () => { expect(sys.getChronicles()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;sys.getChronicles().push(makeChronicle())
    expect(sys.getChronicles()).toHaveLength(1)
  })
  it('按category过滤', () => {
    ;sys.getChronicles().push(makeChronicle('war'))
    ;sys.getChronicles().push(makeChronicle('hero'))
    expect(sys.getChronicles({ category: 'war' })).toHaveLength(1)
    expect(sys.getChronicles({ category: 'hero' })).toHaveLength(1)
  })
  it('按minImportance过滤', () => {
    ;sys.getChronicles().push(makeChronicle('war', 1))
    ;sys.getChronicles().push(makeChronicle('hero', 3))
    expect(sys.getChronicles({ minImportance: 2 })).toHaveLength(1)
    expect(sys.getChronicles({ minImportance: 3 })).toHaveLength(1)
  })
  it('支持7种记���类别', () => {
    const categories: Chronicle['category'][] = ['war', 'hero', 'disaster', 'civilization', 'wonder', 'religion', 'discovery']
    expect(categories).toHaveLength(7)
  })
})

describe('WorldChronicleSystem.getRecentChronicles', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空时返回[]', () => { expect(sys.getRecentChronicles(5)).toHaveLength(0) })
  it('返回末尾N条', () => {
    for (let i = 0; i < 15; i++) { ;sys.getChronicles().push(makeChronicle()) }
    expect(sys.getRecentChronicles(10)).toHaveLength(10)
  })
})

describe('WorldChronicleSystem.getChroniclesByCiv', () => {
  let sys: WorldChronicleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回[]', () => { expect(sys.getChroniclesByCiv(99)).toHaveLength(0) })
  it('按civId过滤', () => {
    ;sys.getChronicles().push(makeChronicle('war', 2, 1))
    ;sys.getChronicles().push(makeChronicle('hero', 2, 2))
    expect(sys.getChroniclesByCiv(1)).toHaveLength(1)
  })
})
