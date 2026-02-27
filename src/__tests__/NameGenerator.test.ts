import { describe, it, expect } from 'vitest'
import { generateName } from '../utils/NameGenerator'

describe('generateName', () => {
  it('人类种族返回非空字符串', () => {
    const name = generateName('human')
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })

  it('精灵种族返回非空字符串', () => {
    const name = generateName('elf')
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })

  it('矮人种族返回非空字符串', () => {
    const name = generateName('dwarf')
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })

  it('兽人种族返回非空字符串', () => {
    const name = generateName('orc')
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })

  it('未知种族返回动物名（fallback）', () => {
    const name = generateName('dragon')
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })

  it('多次调用不总是相同结果（随机性）', () => {
    const names = new Set<string>()
    for (let i = 0; i < 50; i++) {
      names.add(generateName('human'))
    }
    // 50次调用中应该至少有2个不同的名字
    expect(names.size).toBeGreaterThan(1)
  })

  it('人类名字由前缀+后缀组成（有合理长度）', () => {
    for (let i = 0; i < 20; i++) {
      const name = generateName('human')
      // 最短前缀2字符 + 最短后缀2字符 = 4，最长约 3+6 = 9
      expect(name.length).toBeGreaterThanOrEqual(4)
      expect(name.length).toBeLessThanOrEqual(12)
    }
  })
})
