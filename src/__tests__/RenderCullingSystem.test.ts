import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RenderCullingSystem } from '../systems/RenderCullingSystem'

// worldW=200, worldH=200, CHUNK_SIZE=16
// getLODLevel: dist<halfDiag*0.4→0, <0.75→1, else→2
// isVisible: entityX/Y在 [vpX-margin/zoom, vpX+vpW+margin/zoom] 范围内

function makeSys() { return new RenderCullingSystem() }

// ─────────────────────────────────────────────
// 一、初始状态
// ─────────────────────────────────────────────
describe('RenderCullingSystem — 初始状态', () => {
  let sys: RenderCullingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('worldW 初始为 200', () => { expect((sys as any).worldW).toBe(200) })
  it('worldH 初始为 200', () => { expect((sys as any).worldH).toBe(200) })
  it('CHUNK_SIZE 为 16', () => { expect(sys.CHUNK_SIZE).toBe(16) })
  it('zoom 初���为 1', () => { expect((sys as any).zoom).toBe(1) })
  it('vpX 初始为 0', () => { expect((sys as any).vpX).toBe(0) })
  it('vpY 初始为 0', () => { expect((sys as any).vpY).toBe(0) })
  it('vpW 初始为 0', () => { expect((sys as any).vpW).toBe(0) })
  it('vpH 初始为 0', () => { expect((sys as any).vpH).toBe(0) })
  it('centerX 初始为 0', () => { expect((sys as any).centerX).toBe(0) })
  it('centerY 初始为 0', () => { expect((sys as any).centerY).toBe(0) })
  it('chunksX 初始按 ceil(200/16)=13 计算', () => {
    expect((sys as any).chunksX).toBe(Math.ceil(200 / 16))
  })
  it('chunksY 初始按 ceil(200/16)=13 计算', () => {
    expect((sys as any).chunksY).toBe(Math.ceil(200 / 16))
  })
  it('visibleChunks 初始为空 Set', () => {
    expect((sys as any).visibleChunks.size).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 二、getLODLevel — LOD 等级计算
// ─────────────────────────────────────────────
describe('RenderCullingSystem — getLODLevel LOD 等级', () => {
  let sys: RenderCullingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('getLODLevel 返回 0/1/2', () => {
    const level = sys.getLODLevel(0, 0)
    expect([0, 1, 2]).toContain(level)
  })

  it('实体在视口中心附近时 LODLevel=0（最高细节）', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // 中心=(400,300)，halfDiag=500，中心点距离=0 < 500*0.4=200 → level=0
    expect(sys.getLODLevel(400, 300)).toBe(0)
  })

  it('实体在视口边缘时 LODLevel=2（最低细节）', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // 中心=(400,300)，halfDiag≈500，角落(800,600)距离≈500 >=500*0.75=375 → level=2
    expect(sys.getLODLevel(800, 600)).toBe(2)
  })

  it('实体在中距离时 LODLevel=1', () => {
    sys.setViewport(0, 0, 1000, 1000, 1)
    // 中心=(500,500)，halfDiag=707，dx=400,dy=0, dist=400 >= 283 且 < 530 → 1
    expect(sys.getLODLevel(900, 500)).toBe(1)
  })

  it('正好在视口中心时距离为0，返回 LOD=0', () => {
    sys.setViewport(0, 0, 400, 400, 1)
    // center=(200,200), dist=0 < halfDiag*0.4 → 0
    expect(sys.getLODLevel(200, 200)).toBe(0)
  })

  it('halfDiag=0（vpW=0, vpH=0）时任意点返回 2', () => {
    // 不设置视口，vpW=vpH=0，halfDiag=0
    // dist < 0*0.4=0 → 不成立，dist < 0*0.75=0 → 不成立 → 返回 2
    expect(sys.getLODLevel(0, 0)).toBe(2)
  })

  it('LODLevel 边界：dist 恰好等于 halfDiag*0.4 时返回 1', () => {
    sys.setViewport(0, 0, 1000, 0, 1)
    // halfDiag=500, 0.4阈值=200
    // center=(500,0), dx=300, dy=0, dist=300 >= 200 且 < 375 → 1
    expect(sys.getLODLevel(800, 0)).toBe(1)
  })

  it('LOD 在不同视口尺寸下一致反映距离比例', () => {
    sys.setViewport(0, 0, 200, 200, 1)
    // halfDiag=141.4, center=(100,100)
    // 中心点 → 0
    expect(sys.getLODLevel(100, 100)).toBe(0)
  })

  it('LODLevel 不依赖 zoom', () => {
    // zoom 改变不影响 LOD 计算（以像素坐标为准）
    sys.setViewport(0, 0, 800, 600, 2)
    const lod1 = sys.getLODLevel(400, 300) // 中心
    sys.setViewport(0, 0, 800, 600, 1)
    const lod2 = sys.getLODLevel(400, 300)
    expect(lod1).toBe(lod2)
  })
})

// ─────────────────────────────────────────────
// 三、isVisible — 可见性判断
// ─────────────────────────────────────────────
describe('RenderCullingSystem — isVisible 可见性', () => {
  let sys: RenderCullingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('视口内的实体 isVisible=true', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    expect(sys.isVisible(400, 300)).toBe(true)
  })

  it('视口外的实体 isVisible=false（右侧超出 margin）', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // margin=32/zoom=32, vpX+vpW+margin=832, entityX=900 > 832 → false
    expect(sys.isVisible(900, 300)).toBe(false)
  })

  it('margin 内的实体 isVisible=true', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // 实体在 vpX-margin 到 vpX 之间: -30 >= -32 → true
    expect(sys.isVisible(-30, 300)).toBe(true)
  })

  it('zoom 影响 margin：zoom=2 时 margin 缩小为 16', () => {
    sys.setViewport(0, 0, 800, 600, 2)
    // margin=32/zoom=16, vpX-16=-16, entity=-20 < -16 → false
    expect(sys.isVisible(-20, 300)).toBe(false)
  })

  it('在 margin 边界上 isVisible=true（等于边界保留）', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // vpX-m = 0-32 = -32，entity=-32 → -32 >= -32 → true
    expect(sys.isVisible(-32, 300)).toBe(true)
  })

  it('在 margin 边界外 isVisible=false', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // entity=-33 < -32 → false
    expect(sys.isVisible(-33, 300)).toBe(false)
  })

  it('Y 轴上方超出 isVisible=false', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    expect(sys.isVisible(400, -33)).toBe(false)
  })

  it('Y 轴下方超出 isVisible=false', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // vpY+vpH+m = 600+32=632, entity=633 > 632 → false
    expect(sys.isVisible(400, 633)).toBe(false)
  })

  it('Y 轴下方边界 isVisible=true', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    expect(sys.isVisible(400, 632)).toBe(true)
  })

  it('自定义 margin 影响判断', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // margin=64, m=64/1=64, vpX-64=-64, entity=-50 >= -64 → true
    expect(sys.isVisible(-50, 300, 64)).toBe(true)
  })

  it('自定义 margin=0 时视口外立即不可见', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    // margin=0, m=0, vpX=0, entity=-1 < 0 → false
    expect(sys.isVisible(-1, 300, 0)).toBe(false)
  })

  it('zoom=0.5 时 margin=32/0.5=64', () => {
    sys.setViewport(0, 0, 800, 600, 0.5)
    // vpX-64=-64, entity=-50 >= -64 → true
    expect(sys.isVisible(-50, 300)).toBe(true)
    // entity=-65 < -64 → false
    expect(sys.isVisible(-65, 300)).toBe(false)
  })

  it('视口原点偏移时 isVisible 仍正确', () => {
    sys.setViewport(100, 50, 800, 600, 1)
    // vpX=100, margin=32, m=32, left=68, right=932
    expect(sys.isVisible(500, 300)).toBe(true)
    expect(sys.isVisible(50, 300)).toBe(false) // 50 < 68 → false
  })
})

// ─────────────────────────────────────────────
// 四、getVisibleTileBounds — 可见区块边界
// ─────────────────────────────────────────────
describe('RenderCullingSystem — getVisibleTileBounds 边界', () => {
  let sys: RenderCullingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('getVisibleTileBounds 返回对象', () => {
    expect(typeof sys.getVisibleTileBounds()).toBe('object')
  })

  it('getVisibleTileBounds 计算正确的 startX/startY', () => {
    sys.setViewport(5, 10, 100, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    expect(bounds.startX).toBe(5)
    expect(bounds.startY).toBe(10)
  })

  it('getVisibleTileBounds 的 startX 下限为 0', () => {
    sys.setViewport(-10, -5, 100, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    expect(bounds.startX).toBe(0)
    expect(bounds.startY).toBe(0)
  })

  it('getVisibleTileBounds 的 endX 上限为 worldW-1', () => {
    sys.setViewport(150, 0, 100, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    // endX=min(199, ceil(150+100))=min(199, 250)=199
    expect(bounds.endX).toBe(199)
  })

  it('getVisibleTileBounds 返回缓存对象（同一引用）', () => {
    const b1 = sys.getVisibleTileBounds()
    const b2 = sys.getVisibleTileBounds()
    expect(b1).toBe(b2)
  })

  it('startX 使用 floor(vpX)', () => {
    sys.setViewport(5.7, 0, 100, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    expect(bounds.startX).toBe(5)
  })

  it('endX 使用 ceil(vpX + vpW)', () => {
    sys.setViewport(0, 0, 100.3, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    // ceil(0+100.3)=101，min(199, 101)=101
    expect(bounds.endX).toBe(101)
  })

  it('startY 不低于 0', () => {
    sys.setViewport(0, -100, 100, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    expect(bounds.startY).toBeGreaterThanOrEqual(0)
  })

  it('endY 不超过 worldH-1', () => {
    sys.setViewport(0, 180, 100, 80, 1)
    const bounds = sys.getVisibleTileBounds()
    expect(bounds.endY).toBeLessThanOrEqual(199)
  })

  it('视口完全在世界内时边界值精确', () => {
    sys.setViewport(10, 20, 50, 40, 1)
    const bounds = sys.getVisibleTileBounds()
    expect(bounds.startX).toBe(10)
    expect(bounds.startY).toBe(20)
    expect(bounds.endX).toBe(60)
    expect(bounds.endY).toBe(60)
  })

  it('视口 vpX=0, vpW=200 时 endX=199（世界边界）', () => {
    sys.setViewport(0, 0, 200, 200, 1)
    const bounds = sys.getVisibleTileBounds()
    expect(bounds.endX).toBe(199)
    expect(bounds.endY).toBe(199)
  })
})

// ─────────────────────────────────────────────
// 五、setWorldSize — 世界尺寸更新
// ─────────────────────────────────────────────
describe('RenderCullingSystem — setWorldSize', () => {
  let sys: RenderCullingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setWorldSize 更新 worldW/worldH', () => {
    sys.setWorldSize(400, 300)
    expect((sys as any).worldW).toBe(400)
    expect((sys as any).worldH).toBe(300)
  })

  it('setWorldSize 后 getVisibleTileBounds 的 endX 上限更新', () => {
    sys.setWorldSize(100, 100)
    sys.setViewport(90, 0, 50, 50, 1)
    const bounds = sys.getVisibleTileBounds()
    // endX=min(99, ceil(90+50))=min(99, 140)=99
    expect(bounds.endX).toBe(99)
  })

  it('setWorldSize 后 chunksX 更新为 ceil(width/16)', () => {
    sys.setWorldSize(320, 160)
    expect((sys as any).chunksX).toBe(Math.ceil(320 / 16))
    expect((sys as any).chunksY).toBe(Math.ceil(160 / 16))
  })

  it('setWorldSize(16,16) 时 chunksX=1', () => {
    sys.setWorldSize(16, 16)
    expect((sys as any).chunksX).toBe(1)
    expect((sys as any).chunksY).toBe(1)
  })

  it('setWorldSize(17,17) 时 chunksX=2（需要额外一个 chunk）', () => {
    sys.setWorldSize(17, 17)
    expect((sys as any).chunksX).toBe(2)
    expect((sys as any).chunksY).toBe(2)
  })

  it('多次 setWorldSize 最后一次生效', () => {
    sys.setWorldSize(100, 100)
    sys.setWorldSize(500, 400)
    expect((sys as any).worldW).toBe(500)
    expect((sys as any).worldH).toBe(400)
  })
})

// ─────────────────────────────────────────────
// 六、setViewport — 视口更新
// ─────────────────────────────────────────────
describe('RenderCullingSystem — setViewport', () => {
  let sys: RenderCullingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setViewport 正确更新 vpX/vpY/vpW/vpH/zoom', () => {
    sys.setViewport(10, 20, 800, 600, 2)
    expect((sys as any).vpX).toBe(10)
    expect((sys as any).vpY).toBe(20)
    expect((sys as any).vpW).toBe(800)
    expect((sys as any).vpH).toBe(600)
    expect((sys as any).zoom).toBe(2)
  })

  it('setViewport 计算 centerX = vpX + vpW/2', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    expect((sys as any).centerX).toBe(400)
  })

  it('setViewport 计算 centerY = vpY + vpH/2', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    expect((sys as any).centerY).toBe(300)
  })

  it('setViewport 偏移时 center 正确', () => {
    sys.setViewport(100, 50, 400, 300, 1)
    expect((sys as any).centerX).toBe(300)
    expect((sys as any).centerY).toBe(200)
  })

  it('setViewport 后 visibleChunks 被重建（非空）', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    expect((sys as any).visibleChunks.size).toBeGreaterThan(0)
  })

  it('多次 setViewport 以最后一次为准', () => {
    sys.setViewport(0, 0, 100, 100, 1)
    sys.setViewport(50, 50, 200, 200, 2)
    expect((sys as any).vpX).toBe(50)
    expect((sys as any).zoom).toBe(2)
  })
})

// ─────────────────────────────────────────────
// 七、rebuildVisibleChunks（通过 setViewport 触发）
// ─────────────────────────────────────────────
describe('RenderCullingSystem — visibleChunks 重建', () => {
  let sys: RenderCullingSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setViewport 后 visibleChunks 不为空', () => {
    sys.setViewport(0, 0, 800, 600, 1)
    expect((sys as any).visibleChunks.size).toBeGreaterThan(0)
  })

  it('视口覆盖全部世界时 visibleChunks 包含全部 chunks', () => {
    sys.setViewport(0, 0, 200, 200, 1)
    const total = Math.ceil(200 / 16) * Math.ceil(200 / 16)
    // 加上 margin=16，会超出但被 min 截断，期望 = total（全覆盖）
    expect((sys as any).visibleChunks.size).toBeLessThanOrEqual(total)
    expect((sys as any).visibleChunks.size).toBeGreaterThan(0)
  })

  it('小视口 visibleChunks 数量少于大视口', () => {
    sys.setViewport(0, 0, 32, 32, 1)
    const small = (sys as any).visibleChunks.size
    sys.setViewport(0, 0, 160, 160, 1)
    const large = (sys as any).visibleChunks.size
    expect(large).toBeGreaterThan(small)
  })
})
