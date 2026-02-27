import { describe, it, expect, beforeEach } from 'vitest'
import { WorldSeedSystem } from '../systems/WorldSeedSystem'

describe('WorldSeedSystem.getSeed', () => {
  it('无参数时生成随机种子', () => {
    const sys = new WorldSeedSystem()
    expect(typeof sys.getSeed()).toBe('number')
  })
  it('指定种子时返回该种子', () => {
    const sys = new WorldSeedSystem(12345)
    expect(sys.getSeed()).toBe(12345)
  })
  it('setSeed可更改种子', () => {
    const sys = new WorldSeedSystem(1)
    sys.setSeed(99999)
    expect(sys.getSeed()).toBe(99999)
  })
})

describe('WorldSeedSystem.getSeedString', () => {
  it('返回8位大写十六进制字符串', () => {
    const sys = new WorldSeedSystem(0xABCD1234)
    expect(sys.getSeedString()).toBe('ABCD1234')
  })
  it('种子为0时返回00000000', () => {
    const sys = new WorldSeedSystem(0)
    expect(sys.getSeedString()).toBe('00000000')
  })
  it('长度固定为8', () => {
    const sys = new WorldSeedSystem(1)
    expect(sys.getSeedString()).toHaveLength(8)
  })
})

describe('WorldSeedSystem.seedFromString', () => {
  it('相同字符串返回相同哈希', () => {
    const sys = new WorldSeedSystem(1)
    const h1 = sys.seedFromString('hello')
    const h2 = sys.seedFromString('hello')
    expect(h1).toBe(h2)
  })
  it('不同字符串返回不同哈希', () => {
    const sys = new WorldSeedSystem(1)
    const h1 = sys.seedFromString('hello')
    const h2 = sys.seedFromString('world')
    expect(h1).not.toBe(h2)
  })
})
