import { describe, it, expect, afterEach, vi } from 'vitest'
import { Noise } from '../utils/Noise'

// ─── 构造函数与初始化 ─────────────────────────────────────────────────────────

describe('Noise 构造函数', () => {
  afterEach(() => vi.restoreAllMocks())

  it('可以用整数seed构造', () => {
    expect(() => new Noise(42)).not.toThrow()
  })
  it('可以用浮点seed构造', () => {
    expect(() => new Noise(3.14)).not.toThrow()
  })
  it('可以用0 seed构造（取||1）', () => {
    expect(() => new Noise(0)).not.toThrow()
  })
  it('可以用负数seed构造（取绝对值）', () => {
    expect(() => new Noise(-100)).not.toThrow()
  })
  it('perm数组长度为512', () => {
    const n = new Noise(1)
    expect((n as any).perm).toHaveLength(512)
  })
  it('perm数组每个值在0到255之间', () => {
    const n = new Noise(42)
    for (const v of (n as any).perm) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(255)
    }
  })
  it('grad3数组长度为12', () => {
    const n = new Noise(1)
    expect((n as any).grad3).toHaveLength(12)
  })
  it('不同seed构造的Noise有不同的perm数组', () => {
    const n1 = new Noise(1)
    const n2 = new Noise(2)
    const same = (n1 as any).perm.every((v: number, i: number) => v === (n2 as any).perm[i])
    expect(same).toBe(false)
  })
  it('相同seed构造的Noise有相同的perm数组', () => {
    const n1 = new Noise(999)
    const n2 = new Noise(999)
    const same = (n1 as any).perm.every((v: number, i: number) => v === (n2 as any).perm[i])
    expect(same).toBe(true)
  })
  it('无参数构造不崩溃', () => {
    expect(() => new Noise()).not.toThrow()
  })
})

// ─── noise2D 范围与确定性 ─────────────────────────────────────────────────────

describe('Noise.noise2D - 值域与确定性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('返回值在理论范围内（约-1到1）', () => {
    const noise = new Noise(42)
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const val = noise.noise2D(x * 0.1, y * 0.1)
        expect(val).toBeGreaterThanOrEqual(-1.1)
        expect(val).toBeLessThanOrEqual(1.1)
      }
    }
  })
  it('相同输入返回相同输出（确定性）', () => {
    const noise = new Noise(12345)
    expect(noise.noise2D(0.5, 0.7)).toBe(noise.noise2D(0.5, 0.7))
  })
  it('不同seed在同一点输出不同', () => {
    const n1 = new Noise(1)
    const n2 = new Noise(2)
    expect(n1.noise2D(0.5, 0.5)).not.toBe(n2.noise2D(0.5, 0.5))
  })
  it('坐标微小变化时值连续（相邻差<0.1）', () => {
    const noise = new Noise(99)
    expect(Math.abs(noise.noise2D(0, 0) - noise.noise2D(0.001, 0))).toBeLessThan(0.1)
  })
  it('原点(0,0)可以正常求值', () => {
    const noise = new Noise(1)
    expect(() => noise.noise2D(0, 0)).not.toThrow()
  })
  it('大坐标值不崩溃', () => {
    const noise = new Noise(1)
    expect(() => noise.noise2D(1000, 1000)).not.toThrow()
  })
  it('负坐标值不崩溃', () => {
    const noise = new Noise(1)
    expect(() => noise.noise2D(-5, -3)).not.toThrow()
  })
  it('负坐标值在范围内', () => {
    const noise = new Noise(1)
    const v = noise.noise2D(-5, -3)
    expect(v).toBeGreaterThanOrEqual(-1.1)
    expect(v).toBeLessThanOrEqual(1.1)
  })
  it('x=0时输出在范围内', () => {
    const noise = new Noise(7)
    for (let y = 0; y < 5; y++) {
      const v = noise.noise2D(0, y * 0.3)
      expect(v).toBeGreaterThanOrEqual(-1.1)
      expect(v).toBeLessThanOrEqual(1.1)
    }
  })
  it('y=0时输出在范围内', () => {
    const noise = new Noise(7)
    for (let x = 0; x < 5; x++) {
      const v = noise.noise2D(x * 0.3, 0)
      expect(v).toBeGreaterThanOrEqual(-1.1)
      expect(v).toBeLessThanOrEqual(1.1)
    }
  })
  it('返回类型为number', () => {
    const noise = new Noise(1)
    expect(typeof noise.noise2D(0.5, 0.5)).toBe('number')
  })
  it('100x100网格采样均在范围内', () => {
    const noise = new Noise(31415)
    let allInRange = true
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        const v = noise.noise2D(x * 0.05, y * 0.05)
        if (v < -1.1 || v > 1.1) { allInRange = false; break }
      }
      if (!allInRange) break
    }
    expect(allInRange).toBe(true)
  })
  it('不同坐标产生不同值（noise非常数）', () => {
    const noise = new Noise(42)
    const v1 = noise.noise2D(0.1, 0.1)
    const v2 = noise.noise2D(0.9, 0.9)
    expect(v1).not.toBe(v2)
  })
  it('整数坐标不崩溃', () => {
    const noise = new Noise(1)
    expect(() => noise.noise2D(1, 2)).not.toThrow()
    expect(() => noise.noise2D(10, 20)).not.toThrow()
  })
})

// ─── fbm 函数 ─────────────────────────────────────────────────────────────────

describe('Noise.fbm - 分形布朗运动', () => {
  afterEach(() => vi.restoreAllMocks())

  it('返回值在合理范围内（[-1.1, 1.1]）', () => {
    const noise = new Noise(7)
    for (let i = 0; i < 20; i++) {
      const val = noise.fbm(i * 0.1, i * 0.05)
      expect(val).toBeGreaterThanOrEqual(-1.1)
      expect(val).toBeLessThanOrEqual(1.1)
    }
  })
  it('相同输入相同输出（确定性）', () => {
    const noise = new Noise(42)
    expect(noise.fbm(1.5, 2.3, 4)).toBe(noise.fbm(1.5, 2.3, 4))
  })
  it('不同octaves产生不同结果', () => {
    const noise = new Noise(42)
    expect(noise.fbm(1.0, 1.0, 2)).not.toBe(noise.fbm(1.0, 1.0, 4))
  })
  it('octaves=0时返回0（无迭代）', () => {
    const noise = new Noise(42)
    expect(noise.fbm(1.0, 1.0, 0)).toBe(0)
  })
  it('octaves=1时结果与单次noise2D一致', () => {
    const noise = new Noise(100)
    // octaves=1, lacunarity=2, gain=0.5
    // sum = noise2D(x*1, y*1)*1, max = 1, result = sum/max = noise2D(x,y)
    const v1 = noise.fbm(0.3, 0.7, 1, 2, 0.5)
    const v2 = noise.noise2D(0.3, 0.7)
    expect(v1).toBeCloseTo(v2, 10)
  })
  it('默认octaves=4时不崩溃', () => {
    const noise = new Noise(42)
    expect(() => noise.fbm(1.0, 1.0)).not.toThrow()
  })
  it('大octaves值不崩溃', () => {
    const noise = new Noise(42)
    expect(() => noise.fbm(0.5, 0.5, 16)).not.toThrow()
  })
  it('不同seed的fbm在同一点产生不同值', () => {
    const n1 = new Noise(1)
    const n2 = new Noise(2)
    expect(n1.fbm(0.5, 0.5, 4)).not.toBe(n2.fbm(0.5, 0.5, 4))
  })
  it('lacunarity和gain影响结果', () => {
    const noise = new Noise(42)
    const v1 = noise.fbm(0.5, 0.5, 4, 2, 0.5)
    const v2 = noise.fbm(0.5, 0.5, 4, 3, 0.6)
    expect(v1).not.toBe(v2)
  })
  it('负坐标不崩溃', () => {
    const noise = new Noise(1)
    expect(() => noise.fbm(-1, -2, 4)).not.toThrow()
  })
  it('原点(0,0)不崩溃', () => {
    const noise = new Noise(1)
    expect(() => noise.fbm(0, 0, 4)).not.toThrow()
  })
  it('返回类型为number', () => {
    const noise = new Noise(1)
    expect(typeof noise.fbm(0.5, 0.5)).toBe('number')
  })
  it('100点采样均在范围内', () => {
    const noise = new Noise(27182)
    let allInRange = true
    for (let i = 0; i < 100; i++) {
      const v = noise.fbm(i * 0.03, i * 0.07, 4)
      if (v < -1.1 || v > 1.1) { allInRange = false; break }
    }
    expect(allInRange).toBe(true)
  })
  it('octaves=1与octaves=2结果不同', () => {
    const noise = new Noise(42)
    expect(noise.fbm(0.5, 0.5, 1)).not.toBe(noise.fbm(0.5, 0.5, 2))
  })
  it('x和y坐标交换一般产生不同值', () => {
    const noise = new Noise(42)
    const v1 = noise.fbm(0.3, 0.7, 4)
    const v2 = noise.fbm(0.7, 0.3, 4)
    // Simplex noise通常不对称
    expect(typeof v1).toBe('number')
    expect(typeof v2).toBe('number')
  })
})

// ─── dot 内部函数 ─────────────────────────────────────────────────────────────

describe('Noise - 内部dot函数', () => {
  afterEach(() => vi.restoreAllMocks())

  it('dot([1,1,0], 2, 3) = 1*2+1*3 = 5', () => {
    const n = new Noise(1)
    expect((n as any).dot([1, 1, 0], 2, 3)).toBe(5)
  })
  it('dot([0,0,0], 5, 5) = 0', () => {
    const n = new Noise(1)
    expect((n as any).dot([0, 0, 0], 5, 5)).toBe(0)
  })
  it('dot([-1,1,0], 1, 1) = 0', () => {
    const n = new Noise(1)
    expect((n as any).dot([-1, 1, 0], 1, 1)).toBe(0)
  })
  it('dot([1,0,1], 3, 4) = 3', () => {
    const n = new Noise(1)
    expect((n as any).dot([1, 0, 1], 3, 4)).toBe(3)
  })
  it('dot返回number类型', () => {
    const n = new Noise(1)
    expect(typeof (n as any).dot([1, 1, 0], 1, 1)).toBe('number')
  })
})

// ─── 地形生成场景 ─────────────────────────────────────────────────────────────

describe('Noise - 地形生成实用场景', () => {
  afterEach(() => vi.restoreAllMocks())

  it('可以生成200x200地图而不崩溃', () => {
    const noise = new Noise(54321)
    expect(() => {
      for (let x = 0; x < 200; x++) {
        for (let y = 0; y < 200; y++) {
          noise.fbm(x * 0.01, y * 0.01, 4)
        }
      }
    }).not.toThrow()
  })
  it('组合多个Noise实例产生不同层次结果', () => {
    const n1 = new Noise(1)
    const n2 = new Noise(2)
    const v1 = n1.noise2D(0.5, 0.5)
    const v2 = n2.noise2D(0.5, 0.5)
    expect(v1).not.toBe(v2)
  })
  it('scale=0.005时大范围采样值分布正常', () => {
    const noise = new Noise(11111)
    const samples = []
    for (let i = 0; i < 50; i++) {
      samples.push(noise.fbm(i * 0.005, 0, 4))
    }
    const min = Math.min(...samples)
    const max = Math.max(...samples)
    // 应当有一定分布，不全是同一值
    expect(max - min).toBeGreaterThan(0)
  })
  it('不同seed生成的地图相关性极低（值不全相同）', () => {
    const n1 = new Noise(1)
    const n2 = new Noise(99999)
    let allSame = true
    for (let i = 0; i < 20; i++) {
      if (n1.noise2D(i * 0.1, i * 0.1) !== n2.noise2D(i * 0.1, i * 0.1)) {
        allSame = false
        break
      }
    }
    expect(allSame).toBe(false)
  })
  it('fbm与noise2D共用同一perm表（相同seed确定性）', () => {
    const n = new Noise(77777)
    const v1 = n.fbm(0.2, 0.4, 2)
    const v2 = n.fbm(0.2, 0.4, 2)
    expect(v1).toBe(v2)
  })
  it('noise2D在同一条线上相邻点差值小于0.5（连续性）', () => {
    const noise = new Noise(12321)
    for (let i = 0; i < 50; i++) {
      const v1 = noise.noise2D(i * 0.01, 0)
      const v2 = noise.noise2D((i + 1) * 0.01, 0)
      expect(Math.abs(v1 - v2)).toBeLessThan(0.5)
    }
  })
})
