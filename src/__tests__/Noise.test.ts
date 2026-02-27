import { describe, it, expect } from 'vitest'
import { Noise } from '../utils/Noise'

describe('Noise', () => {
  describe('noise2D', () => {
    it('返回值在 [-1, 1] 范围内', () => {
      const noise = new Noise(42)
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const val = noise.noise2D(x * 0.1, y * 0.1)
          expect(val).toBeGreaterThanOrEqual(-1.1) // 理论上接近 [-1,1]
          expect(val).toBeLessThanOrEqual(1.1)
        }
      }
    })

    it('相同输入返回相同输出（确定性）', () => {
      const noise = new Noise(12345)
      const v1 = noise.noise2D(0.5, 0.7)
      const v2 = noise.noise2D(0.5, 0.7)
      expect(v1).toBe(v2)
    })

    it('不同 seed 产生不同结果', () => {
      const n1 = new Noise(1)
      const n2 = new Noise(2)
      const v1 = n1.noise2D(0.5, 0.5)
      const v2 = n2.noise2D(0.5, 0.5)
      expect(v1).not.toBe(v2)
    })

    it('整数坐标处噪声连续（相邻值差异不过大）', () => {
      const noise = new Noise(99)
      const v1 = noise.noise2D(0, 0)
      const v2 = noise.noise2D(0.001, 0)
      expect(Math.abs(v1 - v2)).toBeLessThan(0.1)
    })
  })

  describe('fbm', () => {
    it('返回值在合理范围内', () => {
      const noise = new Noise(7)
      for (let i = 0; i < 20; i++) {
        const val = noise.fbm(i * 0.1, i * 0.05)
        expect(val).toBeGreaterThanOrEqual(-1.1)
        expect(val).toBeLessThanOrEqual(1.1)
      }
    })

    it('相同输入相同输出（确定性）', () => {
      const noise = new Noise(42)
      const v1 = noise.fbm(1.5, 2.3, 4)
      const v2 = noise.fbm(1.5, 2.3, 4)
      expect(v1).toBe(v2)
    })

    it('不同 octaves 产生不同结果', () => {
      const noise = new Noise(42)
      const v1 = noise.fbm(1.0, 1.0, 2)
      const v2 = noise.fbm(1.0, 1.0, 4)
      expect(v1).not.toBe(v2)
    })

    it('octaves=0 时返回 0（空 FBM）', () => {
      const noise = new Noise(42)
      const val = noise.fbm(1.0, 1.0, 0)
      expect(val).toBe(0)
    })
  })
})
