import { describe, it, expect, beforeEach } from 'vitest'
import { VolcanoSystem } from '../systems/VolcanoSystem'
import type { Volcano } from '../systems/VolcanoSystem'

// VolcanoSystem 测试：
// - getVolcanoes()      → 返回只读火山数组
// - createVolcano()     → 创建火山，有位置最小间距检查
// 注：update() 依赖 World 和 ParticleSystem，不在此测试。

function makeVS(): VolcanoSystem {
  return new VolcanoSystem()
}

// ── getVolcanoes ──────────────────────────────────────────────────────────────

describe('VolcanoSystem.getVolcanoes', () => {
  let vs: VolcanoSystem

  beforeEach(() => {
    vs = makeVS()
  })

  it('初始无火山', () => {
    expect(vs.getVolcanoes()).toHaveLength(0)
  })

  it('createVolcano 后火山出现在列表', () => {
    vs.createVolcano(50, 50)
    expect(vs.getVolcanoes()).toHaveLength(1)
  })

  it('返回的火山包含正确坐标', () => {
    vs.createVolcano(30, 70)
    const v = vs.getVolcanoes()[0]
    expect(v.x).toBe(30)
    expect(v.y).toBe(70)
  })

  it('新火山初始状态未活跃', () => {
    vs.createVolcano(50, 50)
    expect(vs.getVolcanoes()[0].active).toBe(false)
  })

  it('新火山 pressure 在 0~30 之间', () => {
    for (let i = 0; i < 10; i++) {
      const tVS = makeVS()
      tVS.createVolcano(50, 50)
      const v = tVS.getVolcanoes()[0]
      expect(v.pressure).toBeGreaterThanOrEqual(0)
      expect(v.pressure).toBeLessThanOrEqual(30)
    }
  })

  it('新火山初始 lavaFlows 为空', () => {
    vs.createVolcano(50, 50)
    expect(vs.getVolcanoes()[0].lavaFlows).toHaveLength(0)
  })
})

// ── createVolcano ────────────────────────────────────────────────────────────

describe('VolcanoSystem.createVolcano', () => {
  let vs: VolcanoSystem

  beforeEach(() => {
    vs = makeVS()
  })

  it('创建成功时返回 Volcano 对象', () => {
    const v = vs.createVolcano(50, 50)
    expect(v).not.toBeNull()
    expect(v!.x).toBe(50)
    expect(v!.y).toBe(50)
  })

  it('距离太近（< 20 格）时返回 null', () => {
    vs.createVolcano(50, 50)
    // 距离 50,50 只有 5 格，平方距离=50 < 400
    const v = vs.createVolcano(55, 50)
    expect(v).toBeNull()
  })

  it('距离足够远时可以创建第二个火山', () => {
    vs.createVolcano(0, 0)
    // 距离 0,0 有 100 格，平方距离=10000 > 400
    const v = vs.createVolcano(100, 0)
    expect(v).not.toBeNull()
    expect(vs.getVolcanoes()).toHaveLength(2)
  })

  it('超过 10 个火山上限时返回 null', () => {
    // 以足够大的间距创建 10 个火山
    for (let i = 0; i < 10; i++) {
      vs.createVolcano(i * 30, 0)
    }
    expect(vs.getVolcanoes()).toHaveLength(10)
    const v = vs.createVolcano(0, 100)  // 第 11 个
    expect(v).toBeNull()
    expect(vs.getVolcanoes()).toHaveLength(10)
  })

  it('每个火山有唯一的 id（递增）', () => {
    const v1 = vs.createVolcano(0, 0)
    const v2 = vs.createVolcano(100, 0)
    expect(v2!.id).toBeGreaterThan(v1!.id)
  })

  it('eruptionDuration 在 300~900 之间', () => {
    for (let i = 0; i < 10; i++) {
      const tVS = makeVS()
      tVS.createVolcano(50, 50)
      const v = tVS.getVolcanoes()[0]
      expect(v.eruptionDuration).toBeGreaterThanOrEqual(300)
      expect(v.eruptionDuration).toBeLessThanOrEqual(900)
    }
  })
})
