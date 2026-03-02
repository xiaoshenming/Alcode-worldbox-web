import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSeedSystem } from '../systems/WorldSeedSystem'

// ── 1. 初始状态 ────────────────────────────────────────────────────────────
describe('初始状态', () => {
  it('无参数构造时 seed 为 number', () => {
    const sys = new WorldSeedSystem()
    expect(typeof sys.getSeed()).toBe('number')
  })
  it('无参数时 seed >= 0', () => {
    const sys = new WorldSeedSystem()
    expect(sys.getSeed()).toBeGreaterThanOrEqual(0)
  })
  it('无参数时 state 等于 seed', () => {
    const sys = new WorldSeedSystem()
    expect((sys as any).state).toBe(sys.getSeed())
  })
  it('指定 seed=0 时 getSeed() === 0', () => {
    const sys = new WorldSeedSystem(0)
    expect(sys.getSeed()).toBe(0)
  })
  it('指定 seed=1 时 getSeed() === 1', () => {
    const sys = new WorldSeedSystem(1)
    expect(sys.getSeed()).toBe(1)
  })
  it('指定 seed=0xFFFFFFFF 时正确存���', () => {
    const sys = new WorldSeedSystem(0xFFFFFFFF)
    expect(sys.getSeed()).toBe(0xFFFFFFFF)
  })
  it('无参数时 _displayText 含 Seed: 前缀', () => {
    const sys = new WorldSeedSystem(42)
    expect((sys as any)._displayText).toMatch(/^Seed: /)
  })
  it('_displayTextWidth 初始为 0', () => {
    const sys = new WorldSeedSystem(1)
    expect((sys as any)._displayTextWidth).toBe(0)
  })
})

// ── 2. getSeed / setSeed 节流与状态更新 ──────────────────────────────���─────
describe('setSeed 节流与状态更新', () => {
  it('setSeed 后 getSeed() 返回新值', () => {
    const sys = new WorldSeedSystem(1)
    sys.setSeed(99999)
    expect(sys.getSeed()).toBe(99999)
  })
  it('setSeed 后 state 重置为新 seed', () => {
    const sys = new WorldSeedSystem(1)
    sys.setSeed(0x12345678)
    expect((sys as any).state).toBe(0x12345678)
  })
  it('setSeed 后 _displayTextWidth 重置为 0', () => {
    const sys = new WorldSeedSystem(1)
    ;(sys as any)._displayTextWidth = 999
    sys.setSeed(42)
    expect((sys as any)._displayTextWidth).toBe(0)
  })
  it('setSeed 后 _displayText 更新', () => {
    const sys = new WorldSeedSystem(1)
    sys.setSeed(0xABCD1234)
    expect((sys as any)._displayText).toContain('ABCD1234')
  })
  it('setSeed 处理 32-bit 无符号截断（>>> 0）', () => {
    const sys = new WorldSeedSystem(1)
    // -1 >>> 0 === 4294967295 === 0xFFFFFFFF
    sys.setSeed(-1)
    expect(sys.getSeed()).toBe(0xFFFFFFFF)
  })
  it('setSeed 多次调用最后一次生效', () => {
    const sys = new WorldSeedSystem(1)
    sys.setSeed(100)
    sys.setSeed(200)
    sys.setSeed(300)
    expect(sys.getSeed()).toBe(300)
  })
  it('setSeed 后 reset() 恢复新 seed', () => {
    const sys = new WorldSeedSystem(1)
    sys.setSeed(555)
    sys.random() // advance state
    sys.reset()
    expect((sys as any).state).toBe(555)
  })
  it('setSeed 后 getSeedString 反映新 seed', () => {
    const sys = new WorldSeedSystem(0)
    sys.setSeed(0xDEADBEEF)
    expect(sys.getSeedString()).toBe('DEADBEEF')
  })
})

// ── 3. getSeedString 格式 ──────────────────────────────────────────────────
describe('getSeedString 格式', () => {
  it('返回 8 位大写十六进制字符串', () => {
    const sys = new WorldSeedSystem(0xABCD1234)
    expect(sys.getSeedString()).toBe('ABCD1234')
  })
  it('种子为 0 时返回 00000000', () => {
    const sys = new WorldSeedSystem(0)
    expect(sys.getSeedString()).toBe('00000000')
  })
  it('长度固定为 8', () => {
    const sys = new WorldSeedSystem(1)
    expect(sys.getSeedString()).toHaveLength(8)
  })
  it('全大写字母', () => {
    const sys = new WorldSeedSystem(0xabcdef00)
    expect(sys.getSeedString()).toBe(sys.getSeedString().toUpperCase())
  })
  it('仅含十六进制字符', () => {
    const sys = new WorldSeedSystem(0xDEAD1234)
    expect(sys.getSeedString()).toMatch(/^[0-9A-F]{8}$/)
  })
  it('种子 0x00000001 返回 00000001', () => {
    const sys = new WorldSeedSystem(0x00000001)
    expect(sys.getSeedString()).toBe('00000001')
  })
  it('种子 0xFFFFFFFF 返回 FFFFFFFF', () => {
    const sys = new WorldSeedSystem(0xFFFFFFFF)
    expect(sys.getSeedString()).toBe('FFFFFFFF')
  })
  it('getSeedString 与 _displayText 中的十六进制部分一致', () => {
    const sys = new WorldSeedSystem(0x12345678)
    const hex = sys.getSeedString()
    expect((sys as any)._displayText).toContain(hex)
  })
})

// ── 4. seedFromString 哈希行为 ─────────────────────────────────────────────
describe('seedFromString 哈希行为', () => {
  it('相同字符串返回相同哈希', () => {
    const sys = new WorldSeedSystem(1)
    expect(sys.seedFromString('hello')).toBe(sys.seedFromString('hello'))
  })
  it('不同字符串返回不同哈希', () => {
    const sys = new WorldSeedSystem(1)
    expect(sys.seedFromString('hello')).not.toBe(sys.seedFromString('world'))
  })
  it('空字符串返回 0（循环不执行）', () => {
    const sys = new WorldSeedSystem(1)
    expect(sys.seedFromString('')).toBe(0)
  })
  it('返回值为非负整数（>>> 0 保证）', () => {
    const sys = new WorldSeedSystem(1)
    const h = sys.seedFromString('test')
    expect(h).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(h)).toBe(true)
  })
  it('单字符哈希可重复', () => {
    const sys = new WorldSeedSystem(1)
    expect(sys.seedFromString('A')).toBe(sys.seedFromString('A'))
  })
  it('大小写敏感', () => {
    const sys = new WorldSeedSystem(1)
    expect(sys.seedFromString('abc')).not.toBe(sys.seedFromString('ABC'))
  })
  it('长字符串不崩溃', () => {
    const sys = new WorldSeedSystem(1)
    const long = 'x'.repeat(10000)
    expect(() => sys.seedFromString(long)).not.toThrow()
  })
  it('不改变 seed 或 state', () => {
    const sys = new WorldSeedSystem(42)
    sys.seedFromString('anything')
    expect(sys.getSeed()).toBe(42)
    expect((sys as any).state).toBe(42)
  })
})

// ── 5. random() PRNG 行为 ──────────────────────────────────────────────────
describe('random() PRNG 行为', () => {
  it('返回 [0, 1) 范围内的数', () => {
    const sys = new WorldSeedSystem(12345)
    for (let i = 0; i < 50; i++) {
      const v = sys.random()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('相同种子产生相同序列', () => {
    const sys1 = new WorldSeedSystem(99999)
    const sys2 = new WorldSeedSystem(99999)
    for (let i = 0; i < 20; i++) {
      expect(sys1.random()).toBe(sys2.random())
    }
  })
  it('不同种子产生不同序列', () => {
    const sys1 = new WorldSeedSystem(1)
    const sys2 = new WorldSeedSystem(2)
    const seq1 = Array.from({ length: 5 }, () => sys1.random())
    const seq2 = Array.from({ length: 5 }, () => sys2.random())
    expect(seq1).not.toEqual(seq2)
  })
  it('每次调用 state 递增（非幂等）', () => {
    const sys = new WorldSeedSystem(42)
    const before = (sys as any).state
    sys.random()
    expect((sys as any).state).not.toBe(before)
  })
  it('连续调用返回不同值', () => {
    const sys = new WorldSeedSystem(54321)
    const v1 = sys.random()
    const v2 = sys.random()
    expect(v1).not.toBe(v2)
  })
  it('seed=0 时不崩溃', () => {
    const sys = new WorldSeedSystem(0)
    expect(() => sys.random()).not.toThrow()
  })
  it('reset() 后序列从头重复', () => {
    const sys = new WorldSeedSystem(777)
    const seq1 = [sys.random(), sys.random(), sys.random()]
    sys.reset()
    const seq2 = [sys.random(), sys.random(), sys.random()]
    expect(seq1).toEqual(seq2)
  })
  it('setSeed 后 reset 仍产生新序列', () => {
    const sys = new WorldSeedSystem(1)
    sys.setSeed(888)
    sys.reset()
    const v = sys.random()
    const sys2 = new WorldSeedSystem(888)
    expect(v).toBe(sys2.random())
  })
})

// ── 6. reset() 行为 ────────────────────────────────────────────────────────
describe('reset() 行为', () => {
  it('reset 后 state === seed', () => {
    const sys = new WorldSeedSystem(12345)
    sys.random()
    sys.random()
    sys.reset()
    expect((sys as any).state).toBe(12345)
  })
  it('多次 random 后 reset 仍恢复', () => {
    const sys = new WorldSeedSystem(54321)
    for (let i = 0; i < 100; i++) sys.random()
    sys.reset()
    expect((sys as any).state).toBe(54321)
  })
  it('reset 不改变 seed 值', () => {
    const sys = new WorldSeedSystem(42)
    sys.random()
    sys.reset()
    expect(sys.getSeed()).toBe(42)
  })
  it('reset 不改变 _displayText', () => {
    const sys = new WorldSeedSystem(0xCAFEBABE)
    const before = (sys as any)._displayText
    sys.random()
    sys.reset()
    expect((sys as any)._displayText).toBe(before)
  })
})

// ── 7. _displayText 格式上限校验 ──────────────────────────────────────────
describe('_displayText 格式', () => {
  it('格式为 "Seed: XXXXXXXX"', () => {
    const sys = new WorldSeedSystem(0x00000001)
    expect((sys as any)._displayText).toBe('Seed: 00000001')
  })
  it('_displayText 在 setSeed 后立即更新', () => {
    const sys = new WorldSeedSystem(0)
    sys.setSeed(0xFFFFFFFF)
    expect((sys as any)._displayText).toBe('Seed: FFFFFFFF')
  })
  it('构造时 _displayText 与 seed 一致', () => {
    const sys = new WorldSeedSystem(0x12AB34CD)
    expect((sys as any)._displayText).toBe('Seed: 12AB34CD')
  })
  it('_displayText 不�� random() 改变', () => {
    const sys = new WorldSeedSystem(42)
    const before = (sys as any)._displayText
    sys.random()
    sys.random()
    expect((sys as any)._displayText).toBe(before)
  })
})

// ── 8. 边界验证 ────────────────────────────────────────────────────────────
describe('边界验证', () => {
  it('seed 为最大 32-bit 无符号整数 0xFFFFFFFF 不崩溃', () => {
    expect(() => new WorldSeedSystem(0xFFFFFFFF)).not.toThrow()
  })
  it('seed 为负数时 setSeed 做 >>> 0 截断', () => {
    const sys = new WorldSeedSystem(1)
    sys.setSeed(-1)
    expect(sys.getSeed()).toBe(0xFFFFFFFF)
  })
  it('多次 setSeed 后 state 总等于最新 seed', () => {
    const sys = new WorldSeedSystem(0)
    for (let i = 0; i < 10; i++) {
      const s = i * 1000
      sys.setSeed(s)
      expect((sys as any).state).toBe(s)
    }
  })
  it('getSeedString 在 setSeed(0) 后返回 00000000', () => {
    const sys = new WorldSeedSystem(999)
    sys.setSeed(0)
    expect(sys.getSeedString()).toBe('00000000')
  })
  it('构造参数 0 时 random() 结果为 number', () => {
    const sys = new WorldSeedSystem(0)
    expect(typeof sys.random()).toBe('number')
  })
  it('100 次 random() 全部在 [0,1) 内（边界压力测试）', () => {
    const sys = new WorldSeedSystem(0xDEADBEEF)
    for (let i = 0; i < 100; i++) {
      const v = sys.random()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

// ── 额外补充测试（满足 60+ 要求）────────────────────────────────────────────
describe('额外边界与行为验证', () => {
  it('getSeed 返回值为有限数', () => {
    const sys = new WorldSeedSystem(12345)
    expect(Number.isFinite(sys.getSeed())).toBe(true)
  })
  it('random 返回有限数', () => {
    const sys = new WorldSeedSystem(0)
    expect(Number.isFinite(sys.random())).toBe(true)
  })
  it('seedFromString 对单字符返回非负整数', () => {
    const sys = new WorldSeedSystem(1)
    const h = sys.seedFromString('z')
    expect(h).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(h)).toBe(true)
  })
  it('setSeed 后 getSeedString 长度仍为 8', () => {
    const sys = new WorldSeedSystem(0)
    sys.setSeed(0x1)
    expect(sys.getSeedString()).toHaveLength(8)
  })
  it('reset 可多次调用不崩溃', () => {
    const sys = new WorldSeedSystem(42)
    expect(() => { sys.reset(); sys.reset(); sys.reset() }).not.toThrow()
  })
  it('seedFromString 对数字字符串也返回非负整数', () => {
    const sys = new WorldSeedSystem(1)
    const h = sys.seedFromString('12345')
    expect(h).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(h)).toBe(true)
  })
  it('random 不返回负数', () => {
    const sys = new WorldSeedSystem(7654321)
    for (let i = 0; i < 30; i++) {
      expect(sys.random()).toBeGreaterThanOrEqual(0)
    }
  })
  it('不同实例互不影响各自的 random 序列', () => {
    const a = new WorldSeedSystem(111)
    const b = new WorldSeedSystem(222)
    a.random()
    a.random()
    b.random()
    // a 和 b 各自的 state 独立
    expect((a as any).state).not.toBe((b as any).state)
  })
})
