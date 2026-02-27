import { describe, it, expect, beforeEach } from 'vitest'
import { CameraBookmarkSystem } from '../systems/CameraBookmarkSystem'

// CameraBookmarkSystem 测试：
// 构造函数调用 load()，在 node 环境 localStorage 不存在，但 try/catch 静默处理。
// 测试 save/get/remove（书签状态管理）和 togglePanel/isPanelOpen（面板状态）。
// persist/showToast 是私有方法，不直接测试。

function makeCBS(): CameraBookmarkSystem {
  return new CameraBookmarkSystem()
}

// ── save / get ─────────────────────────────────────────────────────────────────

describe('CameraBookmarkSystem.save + get', () => {
  let cbs: CameraBookmarkSystem

  beforeEach(() => {
    cbs = makeCBS()
  })

  it('初始所有 slot 返回 null', () => {
    for (let i = 0; i < 9; i++) {
      expect(cbs.get(i)).toBeNull()
    }
  })

  it('save 后 get 返回对应书签', () => {
    cbs.save(0, 100, 200, 1.5)
    const b = cbs.get(0)
    expect(b).not.toBeNull()
    expect(b!.x).toBe(100)
    expect(b!.y).toBe(200)
    expect(b!.zoom).toBe(1.5)
  })

  it('save 到 slot 4 时其他 slot 不受影响', () => {
    cbs.save(4, 50, 75, 2.0)
    expect(cbs.get(0)).toBeNull()
    expect(cbs.get(4)).not.toBeNull()
    expect(cbs.get(8)).toBeNull()
  })

  it('越界 slot < 0 时 save 无效', () => {
    cbs.save(-1, 100, 200, 1.0)
    // 所有 slot 仍为 null
    expect(cbs.get(0)).toBeNull()
  })

  it('越界 slot >= 9 时 save 无效', () => {
    cbs.save(9, 100, 200, 1.0)
    // 不崩溃，8 仍为 null
    expect(cbs.get(8)).toBeNull()
  })

  it('覆盖同一 slot 时保存最新值', () => {
    cbs.save(2, 10, 20, 1.0)
    cbs.save(2, 30, 40, 2.0)
    const b = cbs.get(2)
    expect(b!.x).toBe(30)
    expect(b!.y).toBe(40)
    expect(b!.zoom).toBe(2.0)
  })

  it('9 个 slot 都可以保存', () => {
    for (let i = 0; i < 9; i++) {
      cbs.save(i, i * 10, i * 20, 1.0 + i * 0.1)
    }
    for (let i = 0; i < 9; i++) {
      const b = cbs.get(i)
      expect(b).not.toBeNull()
      expect(b!.x).toBe(i * 10)
    }
  })

  it('书签 label 格式为 "Bookmark N"（slot+1）', () => {
    cbs.save(0, 0, 0, 1.0)
    expect(cbs.get(0)!.label).toBe('Bookmark 1')
    cbs.save(8, 0, 0, 1.0)
    expect(cbs.get(8)!.label).toBe('Bookmark 9')
  })
})

// ── remove ─────────────────────────────────────────────────────────────────────

describe('CameraBookmarkSystem.remove', () => {
  let cbs: CameraBookmarkSystem

  beforeEach(() => {
    cbs = makeCBS()
  })

  it('remove 后 get 返回 null', () => {
    cbs.save(3, 100, 200, 1.5)
    cbs.remove(3)
    expect(cbs.get(3)).toBeNull()
  })

  it('remove 不存在的 slot 不崩溃', () => {
    expect(() => cbs.remove(5)).not.toThrow()
  })

  it('remove 一个不影响其他 slot', () => {
    cbs.save(1, 10, 20, 1.0)
    cbs.save(2, 30, 40, 1.5)
    cbs.remove(1)
    expect(cbs.get(1)).toBeNull()
    expect(cbs.get(2)).not.toBeNull()
  })
})

// ── togglePanel / isPanelOpen ─────────────────────────────────────────────────

describe('CameraBookmarkSystem panel state', () => {
  let cbs: CameraBookmarkSystem

  beforeEach(() => {
    cbs = makeCBS()
  })

  it('初始面板关闭', () => {
    expect(cbs.isPanelOpen()).toBe(false)
  })

  it('togglePanel 打开面板', () => {
    cbs.togglePanel()
    expect(cbs.isPanelOpen()).toBe(true)
  })

  it('再次 togglePanel 关闭面板', () => {
    cbs.togglePanel()
    cbs.togglePanel()
    expect(cbs.isPanelOpen()).toBe(false)
  })
})
