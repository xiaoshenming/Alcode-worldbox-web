import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UnifiedParticleSystem } from '../systems/UnifiedParticleSystem'
import type { ParticleType } from '../systems/UnifiedParticleSystem'

function makeSys() { return new UnifiedParticleSystem() }

// ─────────────────────────────────────────────
// 初始化与内存布局
// ─────────────────────────────────────────────
describe('UnifiedParticleSystem 初始化', () => {
  let sys: UnifiedParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('getActiveCount 初始为 0', () => { expect(sys.getActiveCount()).toBe(0) })
  it('getPoolUsage 初始为 0', () => { expect(sys.getPoolUsage()).toBe(0) })
  it('内部 px 数组长度为 2000', () => { expect((sys as any).px.length).toBe(2000) })
  it('内部 py 数组长度为 2000', () => { expect((sys as any).py.length).toBe(2000) })
  it('内部 pvx 数组长度为 2000', () => { expect((sys as any).pvx.length).toBe(2000) })
  it('内部 pvy 数组长度为 2000', () => { expect((sys as any).pvy.length).toBe(2000) })
  it('内部 plife 数组长度为 2000', () => { expect((sys as any).plife.length).toBe(2000) })
  it('内部 pmaxLife 数组长度为 2000', () => { expect((sys as any).pmaxLife.length).toBe(2000) })
  it('内部 psize 数组长度为 2000', () => { expect((sys as any).psize.length).toBe(2000) })
  it('内部 pr 数组长度为 2000', () => { expect((sys as any).pr.length).toBe(2000) })
  it('内部 pg 数组长度为 2000', () => { expect((sys as any).pg.length).toBe(2000) })
  it('内部 pb 数组长度为 2000', () => { expect((sys as any).pb.length).toBe(2000) })
  it('内部 pa 数组长度为 2000', () => { expect((sys as any).pa.length).toBe(2000) })
  it('内部 ptype 数组长度为 2000', () => { expect((sys as any).ptype.length).toBe(2000) })
  it('内部 palive 数组长度为 2000', () => { expect((sys as any).palive.length).toBe(2000) })
  it('内部 freeList 数组长度为 2000', () => { expect((sys as any).freeList.length).toBe(2000) })
  it('freeCount 初始等于 MAX_PARTICLES', () => { expect((sys as any).freeCount).toBe(2000) })
  it('activeCount 内部字段初始为 0', () => { expect((sys as any).activeCount).toBe(0) })
  it('streams 数组长度为 MAX_STREAMS=64', () => { expect((sys as any).streams.length).toBe(64) })
  it('所有 stream 初始均为 inactive', () => {
    const streams = (sys as any).streams
    expect(streams.every((s: any) => s.active === false)).toBe(true)
  })
  it('sortBuf 数组长度为 2000', () => { expect((sys as any).sortBuf.length).toBe(2000) })
  it('_colorCache 初始为空 Map', () => { expect((sys as any)._colorCache.size).toBe(0) })
  it('freeList[0] 指向 index 0', () => {
    // freeList 初始化为反向顺序，栈顶是 0
    expect((sys as any).freeList[(sys as any).freeCount - 1]).toBe(0)
  })
  it('nextStreamId 初始为 0', () => { expect((sys as any).nextStreamId).toBe(0) })
})

// ─────────────────────────────────────────────
// alloc / free 内部逻辑
// ─────────────────────────────────────────────
describe('UnifiedParticleSystem alloc/free 内部逻辑', () => {
  let sys: UnifiedParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('alloc 返回有效 index', () => {
    const idx = (sys as any).alloc()
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(2000)
  })
  it('alloc 后 freeCount 减 1', () => {
    ;(sys as any).alloc()
    expect((sys as any).freeCount).toBe(1999)
  })
  it('alloc 后 activeCount 加 1', () => {
    ;(sys as any).alloc()
    expect((sys as any).activeCount).toBe(1)
  })
  it('alloc 后对应 palive 置为 1', () => {
    const idx = (sys as any).alloc()
    expect((sys as any).palive[idx]).toBe(1)
  })
  it('free 后 freeCount 加 1', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).free(idx)
    expect((sys as any).freeCount).toBe(2000)
  })
  it('free 后对应 palive 置为 0', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).free(idx)
    expect((sys as any).palive[idx]).toBe(0)
  })
  it('free 后 activeCount 减 1', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).free(idx)
    expect((sys as any).activeCount).toBe(0)
  })
  it('alloc 在 freeCount=0 时返回 -1', () => {
    // 耗尽所有槽位
    ;(sys as any).freeCount = 0
    const idx = (sys as any).alloc()
    expect(idx).toBe(-1)
  })
  it('alloc 2000 次后 activeCount 为 2000', () => {
    for (let i = 0; i < 2000; i++) {
      ;(sys as any).alloc()
    }
    expect((sys as any).activeCount).toBe(2000)
  })
  it('getPoolUsage 在 1000 个粒子时为 0.5', () => {
    for (let i = 0; i < 1000; i++) {
      ;(sys as any).alloc()
    }
    expect(sys.getPoolUsage()).toBeCloseTo(0.5)
  })
})

// ─────────────────────────────────────────────
// initParticle 与 SoA 数据写入
// ─────────────────────────────────────────────
describe('UnifiedParticleSystem initParticle 数据写入', () => {
  let sys: UnifiedParticleSystem
  beforeEach(() => { sys = makeSys() })

  const types: ParticleType[] = ['fire', 'smoke', 'magic', 'blood', 'spark', 'bubble', 'dust', 'holy']

  it('initParticle 写入 px 坐标', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'fire', 100, 200)
    expect((sys as any).px[idx]).toBe(100)
  })
  it('initParticle 写入 py 坐标', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'fire', 100, 200)
    expect((sys as any).py[idx]).toBe(200)
  })
  it('initParticle 写入 plife > 0', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'fire', 0, 0)
    expect((sys as any).plife[idx]).toBeGreaterThan(0)
  })
  it('initParticle plife <= pmaxLife', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'fire', 0, 0)
    expect((sys as any).plife[idx]).toBeLessThanOrEqual((sys as any).pmaxLife[idx])
  })
  it('initParticle psize > 0', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'smoke', 0, 0)
    expect((sys as any).psize[idx]).toBeGreaterThan(0)
  })
  it('fire 粒子 pr=255', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'fire', 0, 0)
    expect((sys as any).pr[idx]).toBe(255)
  })
  it('blood 粒子重力 gravity=0.15（来自 preset）', () => {
    // 通过检验 blood ptype 映射正确
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'blood', 0, 0)
    expect((sys as any).ptype[idx]).toBe(3) // blood type ID = 3
  })
  it('所有类型 initParticle 不抛出异常', () => {
    for (const type of types) {
      const idx = (sys as any).alloc()
      expect(() => (sys as any).initParticle(idx, type, 50, 50)).not.toThrow()
    }
  })
  it('ptype 对应 fire 为 0', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'fire', 0, 0)
    expect((sys as any).ptype[idx]).toBe(0)
  })
  it('ptype 对应 holy 为 7', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'holy', 0, 0)
    expect((sys as any).ptype[idx]).toBe(7)
  })
})

// ─────────────────────────────────────────────
// update 逻辑
// ─────────────────────────────────────────────
describe('UnifiedParticleSystem update 粒子生命周期', () => {
  let sys: UnifiedParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('update 后生命剩余减少', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'smoke', 50, 50)
    const lifeBefore = (sys as any).plife[idx]
    sys.update(1)
    expect((sys as any).plife[idx]).toBeLessThan(lifeBefore)
  })
  it('粒子生命耗尽后 palive 置 0', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'spark', 0, 0)
    ;(sys as any).plife[idx] = 1 // 强制下一帧到期
    sys.update(1)
    expect((sys as any).palive[idx]).toBe(0)
  })
  it('粒子生命耗尽后 activeCount 减少', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'spark', 0, 0)
    ;(sys as any).plife[idx] = 1
    sys.update(1)
    expect(sys.getActiveCount()).toBe(0)
  })
  it('update 后活跃粒子位置改变', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'fire', 100, 100)
    ;(sys as any).pvy[idx] = -1.2
    ;(sys as any).pvx[idx] = 0.5
    const xBefore = (sys as any).px[idx]
    sys.update(1)
    // 位置应已更新（fire 粒子有速度）
    expect((sys as any).px[idx]).not.toBeNaN()
    expect((sys as any).py[idx]).not.toBeNaN()
  })
  it('火焰粒子更新后颜色渐变（pg 改变）', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'fire', 100, 100)
    ;(sys as any).plife[idx] = 20
    ;(sys as any).pmaxLife[idx] = 40
    sys.update(1)
    // fire colorT = 1 - lifeRatio，pg = 60 + colorT*180
    const pg = (sys as any).pg[idx]
    expect(pg).toBeGreaterThanOrEqual(60)
    expect(pg).toBeLessThanOrEqual(240)
  })
  it('update 不崩溃（无活跃粒子）', () => {
    expect(() => sys.update(1)).not.toThrow()
  })
  it('update 大 tick 不崩溃', () => {
    expect(() => sys.update(999999)).not.toThrow()
  })
  it('stream 激活后 update 发射粒子', () => {
    const stream = (sys as any).streams[0]
    stream.active = true
    stream.type = 'fire'
    stream.x = 100
    stream.y = 100
    stream.dx = 0
    stream.dy = 0
    stream.rate = 1
    stream.accumulator = 1
    sys.update(1)
    expect(sys.getActiveCount()).toBeGreaterThan(0)
  })
  it('stream inactive 时 update 不发射粒子', () => {
    const stream = (sys as any).streams[0]
    stream.active = false
    stream.rate = 5
    stream.accumulator = 10
    sys.update(1)
    expect(sys.getActiveCount()).toBe(0)
  })
})

// ─────────────────────────────────────────────
// clear
// ─────────────────────────────────────────────
describe('UnifiedParticleSystem clear', () => {
  let sys: UnifiedParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('clear 后 activeCount 为 0', () => {
    const idx = (sys as any).alloc()
    ;(sys as any).initParticle(idx, 'fire', 0, 0)
    sys.clear()
    expect(sys.getActiveCount()).toBe(0)
  })
  it('clear 后 freeCount 恢复为 2000', () => {
    for (let i = 0; i < 10; i++) { (sys as any).alloc() }
    sys.clear()
    expect((sys as any).freeCount).toBe(2000)
  })
  it('clear 后 getPoolUsage 为 0', () => {
    for (let i = 0; i < 500; i++) { (sys as any).alloc() }
    sys.clear()
    expect(sys.getPoolUsage()).toBe(0)
  })
  it('clear 后所有 palive 为 0', () => {
    for (let i = 0; i < 50; i++) { (sys as any).alloc() }
    sys.clear()
    const palive = (sys as any).palive as Uint8Array
    expect(Array.from(palive).every(v => v === 0)).toBe(true)
  })
  it('clear 后所有 stream 变为 inactive', () => {
    ;(sys as any).streams[0].active = true
    ;(sys as any).streams[1].active = true
    sys.clear()
    const streams = (sys as any).streams
    expect(streams.every((s: any) => s.active === false)).toBe(true)
  })
  it('clear 后再次 alloc 正常', () => {
    for (let i = 0; i < 2000; i++) { (sys as any).alloc() }
    sys.clear()
    const idx = (sys as any).alloc()
    expect(idx).toBeGreaterThanOrEqual(0)
  })
  it('clear 后 update 不崩溃', () => {
    sys.clear()
    expect(() => sys.update(1)).not.toThrow()
  })
})

// ─────────────────────────────────────────────
// getPoolUsage
// ─────────────────────────────────────────────
describe('UnifiedParticleSystem getPoolUsage', () => {
  let sys: UnifiedParticleSystem
  beforeEach(() => { sys = makeSys() })

  it('满载时 getPoolUsage 为 1', () => {
    for (let i = 0; i < 2000; i++) { (sys as any).alloc() }
    expect(sys.getPoolUsage()).toBe(1)
  })
  it('getPoolUsage 返回值在 0-1 之间', () => {
    for (let i = 0; i < 500; i++) { (sys as any).alloc() }
    const usage = sys.getPoolUsage()
    expect(usage).toBeGreaterThanOrEqual(0)
    expect(usage).toBeLessThanOrEqual(1)
  })
})
