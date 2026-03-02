import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Camera } from '../game/Camera'
import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../utils/Constants'

afterEach(() => vi.restoreAllMocks())

describe('Camera - constructor', () => {
  it('初始 zoom 为 1', () => {
    const camera = new Camera(800, 600)
    expect(camera.zoom).toBe(1)
  })

  it('初始位置居中于世界', () => {
    const camera = new Camera(800, 600)
    const expectedX = (WORLD_WIDTH * TILE_SIZE) / 2 - 400
    const expectedY = (WORLD_HEIGHT * TILE_SIZE) / 2 - 300
    expect(camera.x).toBe(expectedX)
    expect(camera.y).toBe(expectedY)
  })

  it('不同画布尺寸 → 不同初始位置', () => {
    const cam1 = new Camera(800, 600)
    const cam2 = new Camera(1280, 720)
    expect(cam1.x).not.toBe(cam2.x)
    expect(cam1.y).not.toBe(cam2.y)
  })

  it('minZoom 为 0.25', () => {
    const camera = new Camera(800, 600)
    expect(camera.minZoom).toBe(0.25)
  })

  it('maxZoom 为 4', () => {
    const camera = new Camera(800, 600)
    expect(camera.maxZoom).toBe(4)
  })

  it('targetZoom 初始为 1', () => {
    const camera = new Camera(800, 600)
    expect(camera.targetZoom).toBe(1)
  })

  it('isDragging 初始为 false', () => {
    const camera = new Camera(800, 600)
    expect((camera as any).isDragging).toBe(false)
  })

  it('方形画布时 x 和 y 初始值对称', () => {
    const size = 600
    const camera = new Camera(size, size)
    const halfWorld = (WORLD_WIDTH * TILE_SIZE) / 2
    expect(camera.x).toBe(halfWorld - size / 2)
    expect(camera.y).toBe(halfWorld - size / 2)
  })
})

describe('Camera - screenToWorld', () => {
  let camera: Camera
  beforeEach(() => {
    camera = new Camera(800, 600)
    camera.x = 0
    camera.y = 0
    camera.zoom = 1
  })

  it('基础坐标转换正确', () => {
    const result = camera.screenToWorld(TILE_SIZE * 3, TILE_SIZE * 4)
    expect(result.x).toBe(3)
    expect(result.y).toBe(4)
  })

  it('zoom=2 时坐标缩放', () => {
    camera.zoom = 2
    const result = camera.screenToWorld(TILE_SIZE * 3, 0)
    expect(result.x).toBe(Math.floor((TILE_SIZE * 3 / 2) / TILE_SIZE))
  })

  it('有偏移时坐标转换正确', () => {
    camera.x = TILE_SIZE * 2
    camera.y = 0
    const result = camera.screenToWorld(0, 0)
    expect(result.x).toBe(2)
  })

  it('screenToWorld 返回 floor 值（整数）', () => {
    const result = camera.screenToWorld(3, 5)
    expect(Number.isInteger(result.x)).toBe(true)
    expect(Number.isInteger(result.y)).toBe(true)
  })

  it('screenX=0 screenY=0 camera 在原点 → world (0,0)', () => {
    const result = camera.screenToWorld(0, 0)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })

  it('多次调用返回同一引用对象（复用）', () => {
    const r1 = camera.screenToWorld(0, 0)
    const r2 = camera.screenToWorld(TILE_SIZE, TILE_SIZE)
    expect(r1).toBe(r2)
  })

  it('zoom=0.5 时 world 坐标翻倍', () => {
    camera.zoom = 0.5
    const result = camera.screenToWorld(TILE_SIZE * 4, 0)
    expect(result.x).toBe(8)
  })

  it('y 轴负偏移时 worldY 增大', () => {
    camera.y = -TILE_SIZE * 3
    const result = camera.screenToWorld(0, 0)
    expect(result.y).toBe(-3)
  })
})

describe('Camera - worldToScreen', () => {
  let camera: Camera
  beforeEach(() => {
    camera = new Camera(800, 600)
    camera.x = 0
    camera.y = 0
    camera.zoom = 1
  })

  it('基础坐标转换正确', () => {
    const result = camera.worldToScreen(3, 4)
    expect(result.x).toBe(3 * TILE_SIZE)
    expect(result.y).toBe(4 * TILE_SIZE)
  })

  it('zoom=2 时结果翻倍', () => {
    camera.zoom = 2
    const result = camera.worldToScreen(1, 1)
    expect(result.x).toBe(TILE_SIZE * 2)
    expect(result.y).toBe(TILE_SIZE * 2)
  })

  it('screenToWorld 和 worldToScreen 互逆', () => {
    const screen = camera.worldToScreen(5, 7)
    const world = camera.screenToWorld(screen.x, screen.y)
    expect(world.x).toBe(5)
    expect(world.y).toBe(7)
  })

  it('camera.x 偏移后 worldToScreen 结果减少', () => {
    camera.x = TILE_SIZE * 2
    const result = camera.worldToScreen(3, 0)
    expect(result.x).toBe(TILE_SIZE)
  })

  it('zoom=0.5 时屏幕坐标减半', () => {
    camera.zoom = 0.5
    const result = camera.worldToScreen(4, 0)
    expect(result.x).toBe(2 * TILE_SIZE)
  })

  it('worldToScreen 返回与 screenToWorld 相同引用对象（复用）', () => {
    const r1 = camera.worldToScreen(0, 0)
    const r2 = camera.worldToScreen(1, 1)
    expect(r1).toBe(r2)
  })

  it('world (0,0) 在 camera.x=0 时 screenX=0', () => {
    const result = camera.worldToScreen(0, 0)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })

  it('world x ��转换正确', () => {
    // 注意 _worldPos 是共用对象，需单次调用内提取值
    const xVal = camera.worldToScreen(5, 0).x
    expect(xVal).toBe(5 * TILE_SIZE)
  })

  it('world y 轴转换正确', () => {
    const yVal = camera.worldToScreen(0, 5).y
    expect(yVal).toBe(5 * TILE_SIZE)
  })
})

describe('Camera - pan', () => {
  let camera: Camera
  beforeEach(() => {
    camera = new Camera(800, 600)
    camera.x = 100
    camera.y = 100
    camera.zoom = 1
  })

  it('向右拖拽时 x 减少', () => {
    camera.pan(10, 0)
    expect(camera.x).toBe(90)
  })

  it('向下拖拽时 y 减少', () => {
    camera.pan(0, 10)
    expect(camera.y).toBe(90)
  })

  it('pan 受世界边界限制（右侧）', () => {
    camera.x = 0
    camera.y = 0
    camera.pan(-99999, 0)
    expect(camera.x).toBeLessThanOrEqual(WORLD_WIDTH * TILE_SIZE)
  })

  it('pan 到负值时被限制在 -200', () => {
    camera.x = 0
    camera.y = 0
    camera.pan(99999, 0)
    expect(camera.x).toBeGreaterThanOrEqual(-200)
  })

  it('y 轴 pan 下限也是 -200', () => {
    camera.y = 0
    camera.pan(0, 99999)
    expect(camera.y).toBeGreaterThanOrEqual(-200)
  })

  it('y 轴 pan 上限是 WORLD_HEIGHT * TILE_SIZE', () => {
    camera.y = 0
    camera.pan(0, -99999)
    expect(camera.y).toBeLessThanOrEqual(WORLD_HEIGHT * TILE_SIZE)
  })

  it('zoom=2 时 pan(20,0) 仅移动 10 单位（除以 zoom）', () => {
    camera.zoom = 2
    camera.x = 200
    camera.pan(20, 0)
    expect(camera.x).toBe(190)
  })

  it('pan(0,0) 不改变位置', () => {
    const xBefore = camera.x
    const yBefore = camera.y
    camera.pan(0, 0)
    expect(camera.x).toBe(xBefore)
    expect(camera.y).toBe(yBefore)
  })

  it('连续多次 pan 累积正确', () => {
    camera.x = 200
    camera.y = 200
    camera.pan(10, 0)
    camera.pan(10, 0)
    camera.pan(10, 0)
    expect(camera.x).toBe(170)
  })
})

describe('Camera - zoomTo', () => {
  let camera: Camera
  beforeEach(() => {
    camera = new Camera(800, 600)
    camera.x = 0
    camera.y = 0
    camera.zoom = 1
  })

  it('zoom 被限制在 minZoom 以上', () => {
    camera.zoomTo(0.01, 400, 300)
    expect(camera.zoom).toBeGreaterThanOrEqual(camera.minZoom)
  })

  it('zoom 被限制在 maxZoom 以下', () => {
    camera.zoomTo(100, 400, 300)
    expect(camera.zoom).toBeLessThanOrEqual(camera.maxZoom)
  })

  it('zoom 设置到有效值内正常工作', () => {
    camera.zoomTo(2, 0, 0)
    expect(camera.zoom).toBe(2)
  })

  it('zoom=1 时 zoomTo(1) 不改变 zoom', () => {
    camera.zoomTo(1, 0, 0)
    expect(camera.zoom).toBe(1)
  })

  it('zoomTo(minZoom) → zoom 恰好为 minZoom', () => {
    camera.zoomTo(camera.minZoom, 0, 0)
    expect(camera.zoom).toBe(camera.minZoom)
  })

  it('zoomTo(maxZoom) → zoom 恰好为 maxZoom', () => {
    camera.zoomTo(camera.maxZoom, 0, 0)
    expect(camera.zoom).toBe(camera.maxZoom)
  })

  it('zoomTo 会调整 x/y 以保持中心点不变', () => {
    camera.zoom = 1
    camera.x = 0
    camera.y = 0
    const cx = 400
    const cy = 300
    camera.zoomTo(2, cx, cy)
    expect(camera.zoom).toBe(2)
    const expectedX = cx / 2 - (cx / 1 - 0)
    expect(camera.x).toBeCloseTo(expectedX, 5)
  })

  it('连续 zoomTo 不超过边界', () => {
    for (let i = 0; i < 10; i++) {
      camera.zoomTo(i * 5, 0, 0)
    }
    expect(camera.zoom).toBeLessThanOrEqual(camera.maxZoom)
  })

  it('zoomTo 极小值时 zoom 精确钳制到 minZoom', () => {
    camera.zoomTo(0.0001, 0, 0)
    expect(camera.zoom).toBe(camera.minZoom)
  })

  it('zoomTo 极大值时 zoom 精确钳制到 maxZoom', () => {
    camera.zoomTo(999999, 0, 0)
    expect(camera.zoom).toBe(camera.maxZoom)
  })
})

describe('Camera - drag', () => {
  let camera: Camera
  beforeEach(() => {
    camera = new Camera(800, 600)
    camera.x = 100
    camera.y = 100
    camera.zoom = 1
  })

  it('未开始拖拽时 drag 不改变摄像机位置', () => {
    camera.drag(50, 50)
    expect(camera.x).toBe(100)
    expect(camera.y).toBe(100)
  })

  it('开始拖拽后 isDragging 为 true', () => {
    camera.startDrag(0, 0)
    expect((camera as any).isDragging).toBe(true)
  })

  it('开始拖拽后 drag 改变位置', () => {
    camera.startDrag(0, 0)
    camera.drag(10, 10)
    expect(camera.x).not.toBe(100)
  })

  it('endDrag 后停止拖拽状态', () => {
    camera.startDrag(0, 0)
    camera.endDrag()
    expect((camera as any).isDragging).toBe(false)
  })

  it('endDrag 后 drag 不再改变位置', () => {
    camera.startDrag(0, 0)
    camera.endDrag()
    camera.drag(50, 50)
    expect(camera.x).toBe(100)
    expect(camera.y).toBe(100)
  })

  it('startDrag 记录正确的起始坐标', () => {
    camera.startDrag(123, 456)
    expect((camera as any).lastMouseX).toBe(123)
    expect((camera as any).lastMouseY).toBe(456)
  })

  it('drag 更新 lastMouseX/Y', () => {
    camera.startDrag(0, 0)
    camera.drag(30, 40)
    expect((camera as any).lastMouseX).toBe(30)
    expect((camera as any).lastMouseY).toBe(40)
  })

  it('drag 向右移动时 camera.x 减小（世界向右平移）', () => {
    camera.startDrag(0, 0)
    const xBefore = camera.x
    camera.drag(50, 0)
    expect(camera.x).toBeLessThan(xBefore)
  })

  it('drag 向下移动时 camera.y 减小', () => {
    camera.startDrag(0, 0)
    const yBefore = camera.y
    camera.drag(0, 50)
    expect(camera.y).toBeLessThan(yBefore)
  })

  it('getDragging 返回与 isDragging 一致的值', () => {
    expect(camera.getDragging()).toBe(false)
    camera.startDrag(0, 0)
    expect(camera.getDragging()).toBe(true)
    camera.endDrag()
    expect(camera.getDragging()).toBe(false)
  })
})

describe('Camera - getVisibleBounds（mock window）', () => {
  let camera: Camera

  beforeEach(() => {
    camera = new Camera(800, 600)
    camera.x = 0
    camera.y = 0
    camera.zoom = 1
    // getVisibleBounds 依赖 window.innerWidth/innerHeight，在 Node 环境中需模拟
    vi.stubGlobal('window', {
      innerWidth: 800,
      innerHeight: 600,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getVisibleBounds 返回的 startX >= 0', () => {
    const bounds = camera.getVisibleBounds()
    expect(bounds.startX).toBeGreaterThanOrEqual(0)
  })

  it('getVisibleBounds 返回的 startY >= 0', () => {
    const bounds = camera.getVisibleBounds()
    expect(bounds.startY).toBeGreaterThanOrEqual(0)
  })

  it('getVisibleBounds 返回的 endX <= WORLD_WIDTH', () => {
    const bounds = camera.getVisibleBounds()
    expect(bounds.endX).toBeLessThanOrEqual(WORLD_WIDTH)
  })

  it('getVisibleBounds 返回的 endY <= WORLD_HEIGHT', () => {
    const bounds = camera.getVisibleBounds()
    expect(bounds.endY).toBeLessThanOrEqual(WORLD_HEIGHT)
  })

  it('getVisibleBounds 多次调用返回同一对象引用（复用）', () => {
    const b1 = camera.getVisibleBounds()
    const b2 = camera.getVisibleBounds()
    expect(b1).toBe(b2)
  })

  it('startX < endX（有可见宽度）', () => {
    const bounds = camera.getVisibleBounds()
    expect(bounds.startX).toBeLessThan(bounds.endX)
  })

  it('startY < endY（有可见高度）', () => {
    const bounds = camera.getVisibleBounds()
    expect(bounds.startY).toBeLessThan(bounds.endY)
  })
})
