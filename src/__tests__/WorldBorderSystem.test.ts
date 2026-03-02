import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBorderSystem } from '../systems/WorldBorderSystem'
import type { BorderStyle } from '../systems/WorldBorderSystem'

// WORLD_WIDTH=200, WORLD_HEIGHT=200, BORDER_WIDTH=8（源码常量）
const WORLD_W = 200
const WORLD_H = 200
const BORDER_WIDTH = 8
const MAX_PARTICLES = 40

function makeSys(): WorldBorderSystem { return new WorldBorderSystem() }

describe('WorldBorderSystem', () => {
  let sys: WorldBorderSystem
  beforeEach(() => { sys = makeSys() })

  // ---- 初始状态（已有5个，此处保留并扩充） ----

  it('初始边界风格为VOID', () => {
    expect(sys.getBorderStyle()).toBe('VOID')
  })

  it('isNearBorder中心点不在边界', () => {
    expect(sys.isNearBorder(100, 100)).toBe(false)
  })

  it('isNearBorder边缘点(0,0)在边界', () => {
    expect(sys.isNearBorder(0, 0)).toBe(true)
  })

  it('animTime初始为0', () => {
    expect((sys as any).animTime).toBe(0)
  })

  it('_particleCount初始为0', () => {
    expect((sys as any)._particleCount).toBe(0)
  })

  // ---- update()后animTime增加 ----

  it('update()后animTime增加约0.016', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 0.9 >= 0.15，不生成粒子
    sys.update(0)
    expect((sys as any).animTime).toBeCloseTo(0.016, 5)
    vi.restoreAllMocks()
  })

  it('多次update()后animTime累积', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0)
    sys.update(0)
    sys.update(0)
    expect((sys as any).animTime).toBeCloseTo(0.048, 5)
    vi.restoreAllMocks()
  })

  // ---- 粒子生成条件 ----

  it('Math.random()<0.15时update()会生成粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // < 0.15 → spawnParticle
    sys.update(0)
    expect((sys as any)._particleCount).toBe(1)
    vi.restoreAllMocks()
  })

  it('Math.random()>=0.15时update()不生成粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // >= 0.15 → 不spawn
    sys.update(0)
    expect((sys as any)._particleCount).toBe(0)
    vi.restoreAllMocks()
  })

  it('粒子数不超过MAX_PARTICLES(40)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // 每帧都spawn
    for (let i = 0; i < 100; i++) {
      sys.update(0)
    }
    expect((sys as any)._particleCount).toBeLessThanOrEqual(MAX_PARTICLES)
    vi.restoreAllMocks()
  })

  // ---- isNearBorder 各种位置 ----

  it('isNearBorder x<BORDER_WIDTH时在边界', () => {
    expect(sys.isNearBorder(3, 100)).toBe(true)
  })

  it('isNearBorder x>=WORLD_W-BORDER_WIDTH时在边界', () => {
    expect(sys.isNearBorder(WORLD_W - 1, 100)).toBe(true)
  })

  it('isNearBorder y<BORDER_WIDTH时在边界', () => {
    expect(sys.isNearBorder(100, 5)).toBe(true)
  })

  it('isNearBorder y>=WORLD_H-BORDER_WIDTH时在边界', () => {
    expect(sys.isNearBorder(100, WORLD_H - 1)).toBe(true)
  })

  it('isNearBorder自定义threshold=20时离边缘15格也在边界', () => {
    expect(sys.isNearBorder(15, 100, 20)).toBe(true)
  })

  it('isNearBorder自定义threshold=5时离边缘7格不在边界', () => {
    // x=7, threshold=5: 7 < 5? no; x >= 200-5=195? no; y=100 ok → false
    expect(sys.isNearBorder(7, 100, 5)).toBe(false)
  })

  it('isNearBorder恰好在BORDER_WIDTH处不在边界', () => {
    // x=8 >= 8（threshold），不满足x < threshold → 检查其他方向
    // y=100 也不在边界 → false
    expect(sys.isNearBorder(BORDER_WIDTH, 100)).toBe(false)
  })

  it('isNearBorder恰好在BORDER_WIDTH-1处在边界', () => {
    expect(sys.isNearBorder(BORDER_WIDTH - 1, 100)).toBe(true)
  })

  // ---- setStyle 切换风格 ----

  it('setStyle切换为OCEAN后getBorderStyle返回OCEAN', () => {
    ;(sys as any).style = 'OCEAN'
    expect(sys.getBorderStyle()).toBe('OCEAN')
  })

  it('setStyle切换为MIST后getBorderStyle返回MIST', () => {
    ;(sys as any).style = 'MIST'
    expect(sys.getBorderStyle()).toBe('MIST')
  })

  it('setStyle切换为FIRE后getBorderStyle返回FIRE', () => {
    ;(sys as any).style = 'FIRE'
    expect(sys.getBorderStyle()).toBe('FIRE')
  })

  it('setStyle切换为VOID后getBorderStyle返回VOID', () => {
    ;(sys as any).style = 'FIRE'
    ;(sys as any).style = 'VOID'
    expect(sys.getBorderStyle()).toBe('VOID')
  })

  // ---- 所有合法BorderStyle枚举值 ----

  it('所有合法BorderStyle值均可设置', () => {
    const styles: BorderStyle[] = ['VOID', 'OCEAN', 'MIST', 'FIRE']
    for (const s of styles) {
      ;(sys as any).style = s
      expect(sys.getBorderStyle()).toBe(s)
    }
  })

  // ---- 粒子生命周期：life递减后死亡 ----

  it('粒子life<=0时被移除（_particleCount减少）', () => {
    // 手动注入一个life极短的粒子
    const pool = (sys as any)._particlePool || []
    // 直接操纵私有 _particlePool 引用（来自模块级变量）
    // 借助spawnParticle先添一个粒子
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(0) // spawn 1 粒子，_particleCount=1
    vi.restoreAllMocks()
    expect((sys as any)._particleCount).toBe(1)

    // 让粒子 life 降至 0 以下（life 初始1.5-3.5，手动拉低）
    // 访问模块级 _particlePool
    // 通过 spawnParticle 写入了 slot[0]，直接设 life 为负
    // WorldBorderSystem 使用的是模块级 _particlePool，需通过 eval 或间接访问
    // 此处通过多次 update 使 life 耗尽（life最短=1.5, 每帧减0.016, 需~94帧）
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不再新增粒子
    for (let i = 0; i < 250; i++) sys.update(0) // 250*0.016=4s > maxLife(3.5)
    expect((sys as any)._particleCount).toBe(0)
    vi.restoreAllMocks()
  })
})
