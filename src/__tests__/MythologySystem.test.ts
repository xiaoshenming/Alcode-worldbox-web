import { describe, it, expect, beforeEach } from 'vitest'
import { MythologySystem } from '../systems/MythologySystem'

function makeSys(): MythologySystem { return new MythologySystem() }
// Myth接口非export，直接构造
function makeMyth(civId: number, type: string) {
  return {
    id: 1, type, title: 'A Myth', text: 'Long ago...',
    civId, createdTick: 0, belief: 0.8, historical: false
  }
}

describe('MythologySystem.getMythsForCiv', () => {
  let sys: MythologySystem
  beforeEach(() => { sys = makeSys() })

  it('无神话时返回空数组', () => {
    expect(sys.getMythsForCiv(1)).toHaveLength(0)
  })
  it('注入后可查询特定文明的神话', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation')])
    expect(sys.getMythsForCiv(1)).toHaveLength(1)
  })
  it('不同文明的神话相互隔离', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'hero')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'disaster'), makeMyth(2, 'divine')])
    expect(sys.getMythsForCiv(1)).toHaveLength(1)
    expect(sys.getMythsForCiv(2)).toHaveLength(2)
  })
  it('支持6种神话类型', () => {
    const types = ['creation', 'hero', 'disaster', 'divine', 'prophecy', 'origin']
    ;(sys as any).myths.set(1, types.map(t => makeMyth(1, t)))
    expect(sys.getMythsForCiv(1)).toHaveLength(6)
  })
  it('返回只读引用', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation')])
    expect(sys.getMythsForCiv(1)).toBe((sys as any).myths.get(1))
  })
})

describe('MythologySystem.getCulturalSimilarity', () => {
  let sys: MythologySystem
  beforeEach(() => { sys = makeSys() })

  it('无神话时相似度为0', () => {
    expect(sys.getCulturalSimilarity(1, 2)).toBe(0)
  })
  it('类型完全不同时相���度为0', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'hero')])
    expect(sys.getCulturalSimilarity(1, 2)).toBe(0)
  })
  it('有共同神话类型时相似度>0', () => {
    ;(sys as any).myths.set(1, [makeMyth(1, 'creation'), makeMyth(1, 'hero')])
    ;(sys as any).myths.set(2, [makeMyth(2, 'creation'), makeMyth(2, 'disaster')])
    expect(sys.getCulturalSimilarity(1, 2)).toBeGreaterThan(0)
  })
})
