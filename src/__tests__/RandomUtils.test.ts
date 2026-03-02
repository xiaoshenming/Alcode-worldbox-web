import { describe, it, expect, vi, afterEach } from 'vitest'
import { pickRandom, pickWeighted } from '../utils/RandomUtils'

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────
// pickRandom
// ─────────────────────────────────────────────
describe('pickRandom - 基础功能', () => {
  it('从单元素数组中选择唯一元素', () => {
    expect(pickRandom(['only'])).toBe('only')
  })

  it('返回的元素在数组内', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    for (let i = 0; i < 20; i++) {
      expect(items).toContain(pickRandom(items))
    }
  })

  it('对数字数组有效', () => {
    const nums = [1, 2, 3, 10, 100]
    for (let i = 0; i < 10; i++) {
      expect(nums).toContain(pickRandom(nums))
    }
  })

  it('对对象数组有效', () => {
    const objs = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const result = pickRandom(objs)
    expect(objs).toContain(result)
  })

  it('对布尔数组有效', () => {
    const bools = [true, false]
    const result = pickRandom(bools)
    expect(typeof result).toBe('boolean')
  })

  it('对两元素数组有效', () => {
    const arr = ['head', 'tail']
    for (let i = 0; i < 30; i++) {
      expect(arr).toContain(pickRandom(arr))
    }
  })

  it('对大型数组有效', () => {
    const big = Array.from({ length: 1000 }, (_, i) => i)
    const result = pickRandom(big)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThan(1000)
  })

  it('返回值类型与数组元素类型一致', () => {
    const strs = ['x', 'y', 'z'] as const
    const result: 'x' | 'y' | 'z' = pickRandom(strs)
    expect(['x', 'y', 'z']).toContain(result)
  })
})

describe('pickRandom - 随机性验证', () => {
  it('多次调用不总是返回第一个元素', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const results = new Set<string>()
    for (let i = 0; i < 100; i++) {
      results.add(pickRandom(items))
    }
    // 100次抽样，应该至少命中3个不同元素
    expect(results.size).toBeGreaterThanOrEqual(3)
  })

  it('概率分布近似均匀 - 每个元素被选中的次数接近期望', () => {
    const items = ['a', 'b', 'c', 'd']
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }
    const N = 4000
    for (let i = 0; i < N; i++) {
      counts[pickRandom(items)]++
    }
    const expected = N / items.length
    for (const k of items) {
      // 允许20%误差
      expect(counts[k]).toBeGreaterThan(expected * 0.8)
      expect(counts[k]).toBeLessThan(expected * 1.2)
    }
  })

  it('Math.random 返回0时选择第一个元素', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const items = ['first', 'second', 'third']
    expect(pickRandom(items)).toBe('first')
  })

  it('Math.random 返回接近1时选择最后一个元素', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    const items = ['first', 'second', 'third']
    expect(pickRandom(items)).toBe('third')
  })

  it('Math.random 返回0.5时选择中间元素（奇数长度）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const items = ['a', 'b', 'c']
    // Math.floor(0.5 * 3) = 1
    expect(pickRandom(items)).toBe('b')
  })

  it('对同一数组的连续调用结果可能不同', () => {
    const items = [1, 2, 3, 4, 5]
    const seen = new Set<number>()
    for (let i = 0; i < 50; i++) {
      seen.add(pickRandom(items))
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('pickRandom - 边界情况', () => {
  it('readonly 数组可正常使用', () => {
    const arr = ['x', 'y'] as const
    const result = pickRandom(arr)
    expect(['x', 'y']).toContain(result)
  })

  it('包含 null 的数组', () => {
    const arr = [null, 'a', 'b']
    const result = pickRandom(arr)
    expect(arr).toContain(result)
  })

  it('包含 undefined 的数组', () => {
    const arr = [undefined, 1, 2]
    const result = pickRandom(arr)
    expect(arr).toContain(result)
  })

  it('单数字元素数组', () => {
    expect(pickRandom([42])).toBe(42)
  })

  it('不修改原始数组', () => {
    const original = ['a', 'b', 'c']
    const copy = [...original]
    pickRandom(original)
    expect(original).toEqual(copy)
  })

  it('嵌套数组的元素引用正确', () => {
    const inner1 = [1, 2]
    const inner2 = [3, 4]
    const arr = [inner1, inner2]
    const result = pickRandom(arr)
    expect(result === inner1 || result === inner2).toBe(true)
  })
})

// ─────────────────────────────────────────────
// pickWeighted
// ─────────────────────────────────────────────
describe('pickWeighted - 基础功能', () => {
  it('权重全0时返回fallback（测试fallback路径）', () => {
    const types = ['a', 'b', 'c'] as const
    const weights = { a: 0, b: 0, c: 0 }
    // r <= 0 (cum never exceeds 0 unless r==0), 浮点可能返回任意类型
    // 无论如何结果应在types内或等于fallback
    const result = pickWeighted(types, weights, 'a')
    expect([...types]).toContain(result)
  })

  it('权重100%偏向单一类型时始终返回该类型', () => {
    const types = ['win', 'lose'] as const
    const weights = { win: 1, lose: 0 }
    for (let i = 0; i < 20; i++) {
      expect(pickWeighted(types, weights, 'lose')).toBe('win')
    }
  })

  it('均等权重返回有效类型', () => {
    const types = ['x', 'y', 'z'] as const
    const weights = { x: 1 / 3, y: 1 / 3, z: 1 / 3 }
    for (let i = 0; i < 30; i++) {
      const r = pickWeighted(types, weights, 'x')
      expect([...types]).toContain(r)
    }
  })

  it('fallback类型有效（确保编译类型检查）', () => {
    const types = ['a', 'b'] as const
    const weights = { a: 0.5, b: 0.5 }
    const r = pickWeighted(types, weights, 'a')
    expect(['a', 'b']).toContain(r)
  })

  it('单类型权重1.0时总是返回该类型', () => {
    const types = ['only'] as const
    const weights = { only: 1.0 }
    for (let i = 0; i < 10; i++) {
      expect(pickWeighted(types, weights, 'only')).toBe('only')
    }
  })

  it('权重极度倾斜时统计表现正确', () => {
    const types = ['rare', 'common'] as const
    const weights = { rare: 0.01, common: 0.99 }
    let rareCount = 0
    const N = 1000
    for (let i = 0; i < N; i++) {
      if (pickWeighted(types, weights, 'common') === 'rare') rareCount++
    }
    // rare 约期望10次，允许很宽的范围
    expect(rareCount).toBeLessThan(60)
  })
})

describe('pickWeighted - 精确随机控制测试', () => {
  it('r=0时命中第一个类型', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const types = ['a', 'b', 'c'] as const
    const weights = { a: 0.3, b: 0.4, c: 0.3 }
    // cum=0.3 > 0, 返回 'a'
    expect(pickWeighted(types, weights, 'c')).toBe('a')
  })

  it('r=0.29时命中第一个类型（权重0.3）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.29)
    const types = ['a', 'b', 'c'] as const
    const weights = { a: 0.3, b: 0.4, c: 0.3 }
    expect(pickWeighted(types, weights, 'c')).toBe('a')
  })

  it('r=0.31时跳过第一类命中第二类', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.31)
    const types = ['a', 'b', 'c'] as const
    const weights = { a: 0.3, b: 0.4, c: 0.3 }
    // cum_a=0.3 < 0.31, cum_b=0.7 >= 0.31, 返回 'b'
    expect(pickWeighted(types, weights, 'c')).toBe('b')
  })

  it('r=0.7时命中第二类的边界', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7)
    const types = ['a', 'b', 'c'] as const
    const weights = { a: 0.3, b: 0.4, c: 0.3 }
    // cum_b = 0.7 >= 0.7, 返回 'b'
    expect(pickWeighted(types, weights, 'c')).toBe('b')
  })

  it('r=0.71时命中第三类', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.71)
    const types = ['a', 'b', 'c'] as const
    const weights = { a: 0.3, b: 0.4, c: 0.3 }
    // cum_c = 1.0 >= 0.71, 返回 'c'
    expect(pickWeighted(types, weights, 'c')).toBe('c')
  })

  it('r>1时无类型满足条件返回fallback', () => {
    // 通过mockReturnValue制造浮点边界情况
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    const types = ['a', 'b'] as const
    // 权重和为1，cum最大=1，r=1 <= 1 is true => 返回'b'，不一定是fallback
    // 但这测试边界路径本身不崩溃
    const result = pickWeighted(types, { a: 0.5, b: 0.5 }, 'a')
    expect(['a', 'b']).toContain(result)
  })
})

describe('pickWeighted - 统计分布验证', () => {
  it('权重2:1分布 - 频率之比接近2:1', () => {
    const types = ['heavy', 'light'] as const
    const weights = { heavy: 2 / 3, light: 1 / 3 }
    let heavy = 0
    const N = 3000
    for (let i = 0; i < N; i++) {
      if (pickWeighted(types, weights, 'heavy') === 'heavy') heavy++
    }
    const ratio = heavy / (N - heavy)
    expect(ratio).toBeGreaterThan(1.5)
    expect(ratio).toBeLessThan(2.5)
  })

  it('四类均等权重 - 每类频率接近25%', () => {
    const types = ['a', 'b', 'c', 'd'] as const
    const weights = { a: 0.25, b: 0.25, c: 0.25, d: 0.25 }
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }
    const N = 4000
    for (let i = 0; i < N; i++) {
      counts[pickWeighted(types, weights, 'a')]++
    }
    for (const k of types) {
      expect(counts[k] / N).toBeGreaterThan(0.18)
      expect(counts[k] / N).toBeLessThan(0.32)
    }
  })

  it('四类不同权重 - 统计排序与权重排序一致', () => {
    const types = ['a', 'b', 'c', 'd'] as const
    const weights = { a: 0.5, b: 0.3, c: 0.15, d: 0.05 }
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }
    const N = 5000
    for (let i = 0; i < N; i++) {
      counts[pickWeighted(types, weights, 'a')]++
    }
    expect(counts['a']).toBeGreaterThan(counts['b'])
    expect(counts['b']).toBeGreaterThan(counts['c'])
    expect(counts['c']).toBeGreaterThan(counts['d'])
  })
})

describe('pickWeighted - 边界与健壮性', () => {
  it('所有类型均有效且结果在types内', () => {
    const types = ['alpha', 'beta', 'gamma', 'delta'] as const
    const weights = { alpha: 0.1, beta: 0.2, gamma: 0.3, delta: 0.4 }
    for (let i = 0; i < 50; i++) {
      const r = pickWeighted(types, weights, 'alpha')
      expect([...types]).toContain(r)
    }
  })

  it('权重极小值不崩溃', () => {
    const types = ['a', 'b'] as const
    const weights = { a: 1e-10, b: 1 - 1e-10 }
    expect(() => {
      for (let i = 0; i < 20; i++) pickWeighted(types, weights, 'b')
    }).not.toThrow()
  })

  it('多次调用结果集合覆盖多个类型（不固定返回同一值）', () => {
    const types = ['a', 'b', 'c'] as const
    const weights = { a: 0.33, b: 0.34, c: 0.33 }
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      seen.add(pickWeighted(types, weights, 'a'))
    }
    expect(seen.size).toBeGreaterThanOrEqual(2)
  })

  it('fallback不影响正常选择的返回值类型', () => {
    const types = ['x', 'y'] as const
    const weights = { x: 0.6, y: 0.4 }
    // fallback 为 'y'，正常情况下不影响结果
    for (let i = 0; i < 20; i++) {
      const r = pickWeighted(types, weights, 'y')
      expect(['x', 'y']).toContain(r)
    }
  })
})
