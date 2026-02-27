import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFashionSystem } from '../systems/CreatureFashionSystem'
import type { FashionTrend, FashionCategory } from '../systems/CreatureFashionSystem'

let nextId = 1
function makeSys(): CreatureFashionSystem { return new CreatureFashionSystem() }
function makeTrend(civId: number, category: FashionCategory = 'clothing'): FashionTrend {
  return { id: nextId++, civId, category, name: 'test', popularity: 50, startedAt: 0, followers: 10 }
}

describe('CreatureFashionSystem.getTrends', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无时尚潮流', () => { expect(sys.getTrends()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).trends.push(makeTrend(1, 'jewelry'))
    expect(sys.getTrends()[0].category).toBe('jewelry')
  })

  it('返回内部引用', () => {
    ;(sys as any).trends.push(makeTrend(1))
    expect(sys.getTrends()).toBe((sys as any).trends)
  })

  it('支持所有 5 种时尚类别', () => {
    const cats: FashionCategory[] = ['headwear', 'clothing', 'jewelry', 'warpaint', 'hairstyle']
    cats.forEach((c, i) => { ;(sys as any).trends.push(makeTrend(i + 1, c)) })
    const all = sys.getTrends()
    cats.forEach((c, i) => { expect(all[i].category).toBe(c) })
  })
})

describe('CreatureFashionSystem.getTrendsForCiv', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配文明返���空', () => {
    ;(sys as any).trends.push(makeTrend(1))
    expect(sys.getTrendsForCiv(999)).toHaveLength(0)
  })

  it('过滤指定文明潮流', () => {
    ;(sys as any).trends.push(makeTrend(1))
    ;(sys as any).trends.push(makeTrend(2))
    ;(sys as any).trends.push(makeTrend(1))
    const result = sys.getTrendsForCiv(1)
    expect(result).toHaveLength(2)
    result.forEach(t => expect(t.civId).toBe(1))
  })

  it('返回副本非内部引用', () => {
    ;(sys as any).trends.push(makeTrend(1))
    expect(sys.getTrendsForCiv(1)).not.toBe((sys as any).trends)
  })
})

describe('CreatureFashionSystem.getTrendCount', () => {
  let sys: CreatureFashionSystem
  beforeEach(() => { sys = makeSys() })

  it('空时返回 0', () => { expect(sys.getTrendCount()).toBe(0) })

  it('注入后返回正确数量', () => {
    ;(sys as any).trends.push(makeTrend(1))
    ;(sys as any).trends.push(makeTrend(2))
    expect(sys.getTrendCount()).toBe(2)
  })
})
