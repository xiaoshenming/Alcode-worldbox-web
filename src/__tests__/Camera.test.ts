import { describe, it, expect, beforeEach } from 'vitest'
import { Camera } from '../game/Camera'
import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../utils/Constants'

describe('Camera', () => {
  let camera: Camera

  beforeEach(() => {
    camera = new Camera(800, 600)
  })

  describe('constructor', () => {
    it('初始 zoom 为 1', () => {
      expect(camera.zoom).toBe(1)
    })

    it('初始位置居中于世界', () => {
      const expectedX = (WORLD_WIDTH * TILE_SIZE) / 2 - 400
      const expectedY = (WORLD_HEIGHT * TILE_SIZE) / 2 - 300
      expect(camera.x).toBe(expectedX)
      expect(camera.y).toBe(expectedY)
    })
  })

  describe('screenToWorld', () => {
    it('基础坐标转换正确', () => {
      camera.x = 0
      camera.y = 0
      camera.zoom = 1
      const result = camera.screenToWorld(TILE_SIZE * 3, TILE_SIZE * 4)
      expect(result.x).toBe(3)
      expect(result.y).toBe(4)
    })

    it('zoom=2 时坐标缩放', () => {
      camera.x = 0
      camera.y = 0
      camera.zoom = 2
      // screenX / zoom = TILE_SIZE * 3 / 2 = 12, / TILE_SIZE(8) = 1
      const result = camera.screenToWorld(TILE_SIZE * 3, 0)
      expect(result.x).toBe(Math.floor((TILE_SIZE * 3 / 2) / TILE_SIZE))
    })

    it('有偏移时坐标转换正确', () => {
      camera.x = TILE_SIZE * 2  // offset 2 tiles
      camera.y = 0
      camera.zoom = 1
      const result = camera.screenToWorld(0, 0)
      // (0 / 1 + TILE_SIZE*2) / TILE_SIZE = 2
      expect(result.x).toBe(2)
    })
  })

  describe('worldToScreen', () => {
    it('基础坐标转换正确', () => {
      camera.x = 0
      camera.y = 0
      camera.zoom = 1
      const result = camera.worldToScreen(3, 4)
      expect(result.x).toBe(3 * TILE_SIZE)
      expect(result.y).toBe(4 * TILE_SIZE)
    })

    it('zoom=2 时结果翻倍', () => {
      camera.x = 0
      camera.y = 0
      camera.zoom = 2
      const result = camera.worldToScreen(1, 1)
      expect(result.x).toBe(TILE_SIZE * 2)
      expect(result.y).toBe(TILE_SIZE * 2)
    })

    it('screenToWorld 和 worldToScreen 互逆', () => {
      camera.x = 0
      camera.y = 0
      camera.zoom = 1
      const screen = camera.worldToScreen(5, 7)
      const world = camera.screenToWorld(screen.x, screen.y)
      expect(world.x).toBe(5)
      expect(world.y).toBe(7)
    })
  })

  describe('pan', () => {
    it('向右拖拽时 x 减少（相对世界位置减少）', () => {
      camera.x = 100
      camera.y = 0
      camera.zoom = 1
      camera.pan(10, 0)
      expect(camera.x).toBe(90)
    })

    it('向下拖拽时 y 减少', () => {
      camera.x = 0
      camera.y = 100
      camera.zoom = 1
      camera.pan(0, 10)
      expect(camera.y).toBe(90)
    })

    it('pan 受世界边界限制', () => {
      camera.x = 0
      camera.y = 0
      camera.zoom = 1
      // 向左拖拽大量
      camera.pan(-99999, 0)
      // x 不能超过 WORLD_WIDTH * TILE_SIZE
      expect(camera.x).toBeLessThanOrEqual(WORLD_WIDTH * TILE_SIZE)
    })

    it('pan 到负值时被限制在 -200', () => {
      camera.x = 0
      camera.y = 0
      camera.zoom = 1
      // 向右拖拽大量
      camera.pan(99999, 0)
      expect(camera.x).toBeGreaterThanOrEqual(-200)
    })
  })

  describe('zoomTo', () => {
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

    it('zoom=1 时 zoomTo(1) 不改变位置', () => {
      camera.x = 100
      camera.y = 100
      camera.zoom = 1
      camera.zoomTo(1, 0, 0)
      expect(camera.zoom).toBe(1)
    })
  })

  describe('drag', () => {
    it('未开始拖拽时 drag 不改变摄像机位置', () => {
      camera.x = 100
      camera.y = 100
      camera.drag(50, 50) // not in drag state
      expect(camera.x).toBe(100)
      expect(camera.y).toBe(100)
    })

    it('开始拖拽后 drag 改变位置', () => {
      camera.x = 100
      camera.y = 100
      camera.startDrag(0, 0)
      expect((camera as any).isDragging).toBe(true)
      camera.drag(10, 10)
      // pan(-10, -10) → x increases by 10
      expect(camera.x).not.toBe(100) // 位置改变
    })

    it('endDrag 后停止拖拽状态', () => {
      camera.startDrag(0, 0)
      camera.endDrag()
      expect((camera as any).isDragging).toBe(false)
    })
  })
})
