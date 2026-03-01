import { describe, it, expect } from 'vitest'
import { roundRect, lerpColorHex, lerpColorRgb } from '../utils/CanvasUtils'

describe('CanvasUtils', () => {
  it('roundRect可以导入', () => {
    expect(typeof roundRect).toBe('function')
  })

  it('roundRect接受正确的参数数量', () => {
    expect(roundRect.length).toBe(6)
  })
})

describe('lerpColorHex', () => {
  it('t=0时返回颜色a', () => {
    expect(lerpColorHex('#000000', '#ffffff', 0)).toBe('#000000')
  })

  it('t=1时返回颜色b', () => {
    expect(lerpColorHex('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('t=0.5时返回中间颜色', () => {
    const result = lerpColorHex('#000000', '#ffffff', 0.5)
    // 128 = Math.round(127.5) 在某些JS实现中, 确保是#808080左右
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
    const r = parseInt(result.slice(1, 3), 16)
    expect(r).toBeGreaterThanOrEqual(127)
    expect(r).toBeLessThanOrEqual(128)
  })

  it('返回有效的hex格式', () => {
    const result = lerpColorHex('#ff0000', '#0000ff', 0.3)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('lerpColorRgb', () => {
  it('t=0时返回颜色a的rgb格式', () => {
    expect(lerpColorRgb('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)')
  })

  it('t=1时返回颜色b的rgb格式', () => {
    expect(lerpColorRgb('#000000', '#ffffff', 1)).toBe('rgb(255,255,255)')
  })

  it('t=0.5时返回中间颜色的rgb格式', () => {
    const result = lerpColorRgb('#000000', '#ffffff', 0.5)
    expect(result).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
    const match = result.match(/rgb\((\d+),(\d+),(\d+)\)/)!
    const r = parseInt(match[1])
    expect(r).toBeGreaterThanOrEqual(127)
    expect(r).toBeLessThanOrEqual(128)
  })

  it('红色插值到蓝色', () => {
    const result = lerpColorRgb('#ff0000', '#0000ff', 0.5)
    expect(result).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
    const match = result.match(/rgb\((\d+),(\d+),(\d+)\)/)!
    // r应该减半，b应该增半
    expect(parseInt(match[1])).toBeGreaterThan(100) // r接近128
    expect(parseInt(match[3])).toBeGreaterThan(100) // b接近128
  })
})
