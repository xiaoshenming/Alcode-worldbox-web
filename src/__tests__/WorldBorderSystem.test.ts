import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldBorderSystem } from '../systems/WorldBorderSystem'
import type { BorderStyle } from '../systems/WorldBorderSystem'

const WORLD_W = 200
const WORLD_H = 200
const BORDER_WIDTH = 8
const MAX_PARTICLES = 40

function makeSys(): WorldBorderSystem { return new WorldBorderSystem() }

describe('WorldBorderSystem', () => {
  let sys: WorldBorderSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始边界风格为VOID', () => { expect(sys.getBorderStyle()).toBe('VOID') })
  it('isNearBorder中心点不在边界', () => { expect(sys.isNearBorder(100, 100)).toBe(false) })
  it('isNearBorder边缘点(0,0)在边界', () => { expect(sys.isNearBorder(0, 0)).toBe(true) })
  it('animTime初始为0', () => { expect((sys as any).animTime).toBe(0) })
  it('_particleCount初始为0', () => { expect((sys as any)._particleCount).toBe(0) })

  it('update()后animTime增加约0.016', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0)
    expect((sys as any).animTime).toBeCloseTo(0.016, 5)
  })
  it('多次update()后animTime累积', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0); sys.update(0); sys.update(0)
    expect((sys as any).animTime).toBeCloseTo(0.048, 5)
  })
  it('Math.random()<0.15时update()会生成粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    sys.update(0)
    expect((sys as any)._particleCount).toBe(1)
  })
  it('Math.random()>=0.15时update()不生成粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0)
    expect((sys as any)._particleCount).toBe(0)
  })
  it('粒子数不超过MAX_PARTICLES(40)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    for (let i = 0; i < 100; i++) { sys.update(0) }
    expect((sys as any)._particleCount).toBeLessThanOrEqual(MAX_PARTICLES)
  })
  it('isNearBorder x<BORDER_WIDTH时在边界', () => { expect(sys.isNearBorder(3, 100)).toBe(true) })
  it('isNearBorder x>=WORLD_W-BORDER_WIDTH时在边界', () => { expect(sys.isNearBorder(WORLD_W - 1, 100)).toBe(true) })
  it('isNearBorder y<BORDER_WIDTH时在边界', () => { expect(sys.isNearBorder(100, 5)).toBe(true) })
  it('isNearBorder y>=WORLD_H-BORDER_WIDTH时在边界', () => { expect(sys.isNearBorder(100, WORLD_H - 1)).toBe(true) })
  it('isNearBorder自定义threshold=20时离边缘15格也在边界', () => { expect(sys.isNearBorder(15, 100, 20)).toBe(true) })
  it('isNearBorder自定义threshold=5时离边缘7格不在边界', () => { expect(sys.isNearBorder(7, 100, 5)).toBe(false) })
  it('isNearBorder恰好在BORDER_WIDTH处不在边界', () => { expect(sys.isNearBorder(BORDER_WIDTH, 100)).toBe(false) })
  it('isNearBorder恰好在BORDER_WIDTH-1处在边界', () => { expect(sys.isNearBorder(BORDER_WIDTH - 1, 100)).toBe(true) })
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
  it('所有合法BorderStyle值均可设置', () => {
    const styles: BorderStyle[] = ['VOID', 'OCEAN', 'MIST', 'FIRE']
    for (const s of styles) {
      ;(sys as any).style = s
      expect(sys.getBorderStyle()).toBe(s)
    }
  })
  it('粒子life<=0时被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    sys.update(0)
    vi.restoreAllMocks()
    expect((sys as any)._particleCount).toBe(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 250; i++) sys.update(0)
    expect((sys as any)._particleCount).toBe(0)
  })
  it('animTime在多次update后持续增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0)
    const t1 = (sys as any).animTime
    sys.update(0)
    expect((sys as any).animTime).toBeGreaterThan(t1)
  })
  it('isNearBorder x=WORLD_W-BORDER_WIDTH处恰好在边界', () => {
    expect(sys.isNearBorder(WORLD_W - BORDER_WIDTH, 100)).toBe(true)
  })
  it('isNearBorder y=0在边界', () => { expect(sys.isNearBorder(100, 0)).toBe(true) })
  it('isNearBorder y=WORLD_H-1在边界', () => { expect(sys.isNearBorder(100, WORLD_H - 1)).toBe(true) })
  it('isNearBorder x=0,y=WORLD_H-1在边界', () => { expect(sys.isNearBorder(0, WORLD_H - 1)).toBe(true) })
  it('isNearBorder x=WORLD_W-1,y=WORLD_H-1在边界', () => { expect(sys.isNearBorder(WORLD_W - 1, WORLD_H - 1)).toBe(true) })
  it('isNearBorder中部偏左不在边界', () => { expect(sys.isNearBorder(50, 50)).toBe(false) })
  it('isNearBorder中部偏右不在边界', () => { expect(sys.isNearBorder(150, 150)).toBe(false) })
  it('isNearBorder threshold=0时任何点都不在边界', () => { expect(sys.isNearBorder(0, 0, 0)).toBe(false) })
  it('isNearBorder threshold=200时所有点都在边界', () => { expect(sys.isNearBorder(100, 100, 200)).toBe(true) })
  it('update后_particleCount为非负数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0)
    expect((sys as any)._particleCount).toBeGreaterThanOrEqual(0)
  })
  it('getBorderStyle返回字符串', () => { expect(typeof sys.getBorderStyle()).toBe('string') })
  it('连续spawn后_particleCount在无新粒子时逐步归零', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    for (let i = 0; i < 10; i++) sys.update(0)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 300; i++) sys.update(0)
    expect((sys as any)._particleCount).toBe(0)
  })
  it('isNearBorder x=1,y=100在边界', () => { expect(sys.isNearBorder(1, 100)).toBe(true) })
  it('isNearBorder x=WORLD_W-2,y=100在边界', () => { expect(sys.isNearBorder(WORLD_W - 2, 100)).toBe(true) })
  it('isNearBorder x=50,y=1在边界', () => { expect(sys.isNearBorder(50, 1)).toBe(true) })
  it('isNearBorder x=50,y=WORLD_H-2在边界', () => { expect(sys.isNearBorder(50, WORLD_H - 2)).toBe(true) })
  it('新建系统isNearBorder(100,100)返回false', () => {
    const sys2 = makeSys()
    expect(sys2.isNearBorder(100, 100)).toBe(false)
  })
  it('update后animTime不为负数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0)
    expect((sys as any).animTime).toBeGreaterThanOrEqual(0)
  })
  it('_particleCount在spawn达到MAX后再update不超出', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05)
    for (let i = 0; i < 200; i++) sys.update(0)
    expect((sys as any)._particleCount).toBeLessThanOrEqual(MAX_PARTICLES)
    expect((sys as any)._particleCount).toBeGreaterThanOrEqual(0)
  })
  it('isNearBorder x=BORDER_WIDTH+1,y=WORLD_H/2不在边界', () => {
    expect(sys.isNearBorder(BORDER_WIDTH + 1, WORLD_H / 2)).toBe(false)
  })
  it('isNearBorder x=WORLD_W/2,y=BORDER_WIDTH不在边界', () => {
    expect(sys.isNearBorder(WORLD_W / 2, BORDER_WIDTH)).toBe(false)
  })
  it('不同阈值下isNearBorder行为正确', () => {
    expect(sys.isNearBorder(10, 100, 11)).toBe(true)
    expect(sys.isNearBorder(10, 100, 10)).toBe(false)
  })
  it('FIRE风格下update也会更新animTime', () => {
    ;(sys as any).style = 'FIRE'
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0)
    expect((sys as any).animTime).toBeGreaterThan(0)
  })
  it('OCEAN风格下update也会更新animTime', () => {
    ;(sys as any).style = 'OCEAN'
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0)
    expect((sys as any).animTime).toBeGreaterThan(0)
  })

  it('isNearBorder负坐标在边界', () => { expect(sys.isNearBorder(-1, 100)).toBe(true) })
  it('isNearBorder超出边界的坐标也在边界', () => { expect(sys.isNearBorder(WORLD_W + 1, 100)).toBe(true) })
})
