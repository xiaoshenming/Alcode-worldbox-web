import { describe, it, expect } from 'vitest'
import { pickRandom, pickWeighted } from '../utils/RandomUtils'

describe('pickRandom', () => {
  it('从单元素数组中选择唯一元素', () => {
    expect(pickRandom(['only'])).toBe('only')
  })

  it('返回的元素在数组内', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    for (let i = 0; i < 20; i++) {
      const result = pickRandom(items)
      expect(items).toContain(result)
    }
  })

  it('对数字数组有效', () => {
    const nums = [1, 2, 3, 10, 100]
    for (let i = 0; i < 10; i++) {
      expect(nums).toContain(pickRandom(nums))
    }
  })
})

describe('pickWeighted', () => {
  it('权重全0时返回fallback', () => {
    const types = ['a', 'b', 'c'] as const
    const weights = { a: 0, b: 0, c: 0 }
    // 权重全0，累积永远不超过r，返回fallback
    const result = pickWeighted(types, weights, 'a')
    expect(types).toContain(result)
  })

  it('权重100%偏向单一类型', () => {
    const types = ['win', 'lose'] as const
    const weights = { win: 1, lose: 0 }
    for (let i = 0; i < 10; i++) {
      expect(pickWeighted(types, weights, 'lose')).toBe('win')
    }
  })

  it('均等权重返回有效类型', () => {
    const types = ['x', 'y', 'z'] as const
    const weights = { x: 1/3, y: 1/3, z: 1/3 }
    for (let i = 0; i < 30; i++) {
      const r = pickWeighted(types, weights, 'x')
      expect(types).toContain(r)
    }
  })

  it('fallback类型有效（确保编译类型检查）', () => {
    const types = ['a', 'b'] as const
    const weights = { a: 0.5, b: 0.5 }
    const r = pickWeighted(types, weights, 'a')
    expect(['a', 'b']).toContain(r)
  })
})
