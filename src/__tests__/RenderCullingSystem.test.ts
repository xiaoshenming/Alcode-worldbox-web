import { describe, it, expect, beforeEach } from 'vitest'
import { RenderCullingSystem } from '../systems/RenderCullingSystem'

// worldW=200, worldH=200, CHUNK_SIZE=16
// getLODLevel: dist<halfDiag*0.4→0, <0.75→1, else→2
// isVisible: entityX/Y在 [vpX-margin/zoom, vpX+vpW+margin/zoom] 范围内

function makeSys() { return new RenderCullingSystem() }

describe('RenderCullingSystem', () => {
  let sys: RenderCullingSystem

  beforeEach(() => { sys = makeSys() })

  it('getLODLevel返回0/1/2', () => {
    const level = sys.getLODLevel(0, 0)
    expect([0, 1, 2]).toContain(level)
  })
  it('getVisibleTileBounds返回对象', () => { expect(typeof sys.getVisibleTileBounds()).toBe('object') })
  it('worldW初始为200', () => { expect((sys as any).worldW).toBe(200) })
  it('worldH初始为200', () => { expect((sys as any).worldH).toBe(200) })

  // ── getLODLevel: 距离中心的LOD计算 ───────────────────────────────────────

  it('实体在视口中心附近时LODLevel=0（最高细节）', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // 中心=(400,300)，halfDiag=500，中心点距离=0 < 500*0.4=200 → level=0
    expect(sys.getLODLevel(400, 300)).toBe(0)
  })

  it('实体在视口边缘时LODLevel=2（最低细节）', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // 中心=(400,300)，halfDiag≈500，角落(800,600)距离≈500 >=500*0.75=375 → level=2
    expect(sys.getLODLevel(800, 600)).toBe(2)
  })

  it('实体在中距离时LODLevel=1', () => {
    sys.setViewport(0, 0, 1000, 1000, 1)
    // 中心=(500,500)，halfDiag=707，某点距离=400: 400>=707*0.4=283 且 400<707*0.75=530 → 1
    expect(sys.getLODLevel(900, 500)).toBe(1)  // dx=400,dy=0, dist=400
  })

  // ── isVisible ────────────────────────────────────────────────────────────

  it('视口内的实体isVisible=true', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    expect(sys.isVisible(400, 300)).toBe(true)
  })

  it('视口外的实体isVisible=false', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // margin=32/zoom=32, vpX+vpW+margin=832, entityX=900 > 832 → false
    expect(sys.isVisible(900, 300)).toBe(false)
  })

  it('margin内的实体isVisible=true', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // 实体在vpX-margin到vpX之间: -30 >= -(32) → true
    expect(sys.isVisible(-30, 300)).toBe(true)
  })

  it('zoom影响margin的实际像素：zoom=2时margin缩小', () => {
    sys.setViewport(0, 0, 800, 600, 2)
    // margin=32/zoom=16, vpX-16=-16, entity=-20 < -16 → false
    expect(sys.isVisible(-20, 300)).toBe(false)
  })

  // ── getVisibleTileBounds: 边界计算 ───────────────────────────────────────

  it('getVisibleTileBounds计算正确的startX/startY', () => {
    sys.setViewport(5, 10, 100, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    expect(bounds.startX).toBe(5)   // max(0, floor(5)) = 5
    expect(bounds.startY).toBe(10)  // max(0, floor(10)) = 10
  })

  it('getVisibleTileBounds的startX下限为0', () => {
    sys.setViewport(-10, -5, 100, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    expect(bounds.startX).toBe(0)  // max(0, floor(-10)) = 0
    expect(bounds.startY).toBe(0)  // max(0, floor(-5)) = 0
  })

  it('getVisibleTileBounds的endX上限为worldW-1', () => {
    sys.setViewport(150, 0, 100, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    // endX=min(199, ceil(150+100))=min(199, 250)=199
    expect(bounds.endX).toBe(199)
  })

  it('getVisibleTileBounds返回缓存对象（同一引用）', () => {
    const b1 = sys.getVisibleTileBounds()
    const b2 = sys.getVisibleTileBounds()
    expect(b1).toBe(b2)  // 同一对象引用
  })

  // ── setWorldSize ─────────────────────────────────────────────────────────

  it('setWorldSize更新worldW/worldH', () => {
    sys.setWorldSize(400, 300)
    expect((sys as any).worldW).toBe(400)
    expect((sys as any).worldH).toBe(300)
  })

  it('setWorldSize后getVisibleTileBounds的endX上限更新', () => {
    sys.setWorldSize(100, 100)
    sys.setViewport(90, 0, 50, 50, 1)
    const bounds = sys.getVisibleTileBounds()
    // endX=min(99, ceil(90+50))=min(99, 140)=99
    expect(bounds.endX).toBe(99)
  })
})
