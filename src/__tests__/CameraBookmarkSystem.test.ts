import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  afterEach(() => vi.restoreAllMocks())

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
    expect(cbs.get(0)).toBeNull()
  })

  it('越界 slot >= 9 时 save 无效', () => {
    cbs.save(9, 100, 200, 1.0)
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

  it('书签 x 坐标精确保存', () => {
    cbs.save(0, 999.9, 0, 1.0)
    expect(cbs.get(0)!.x).toBe(999.9)
  })

  it('书签 y 坐标精确保存', () => {
    cbs.save(0, 0, 777.7, 1.0)
    expect(cbs.get(0)!.y).toBe(777.7)
  })

  it('书签 zoom 精确保存', () => {
    cbs.save(0, 0, 0, 3.75)
    expect(cbs.get(0)!.zoom).toBe(3.75)
  })

  it('slot 0 书签 label 为 "Bookmark 1"', () => {
    cbs.save(0, 0, 0, 1.0)
    expect(cbs.get(0)!.label).toBe('Bookmark 1')
  })

  it('slot 4 书签 label 为 "Bookmark 5"', () => {
    cbs.save(4, 0, 0, 1.0)
    expect(cbs.get(4)!.label).toBe('Bookmark 5')
  })

  it('slot 8 书签 label 为 "Bookmark 9"', () => {
    cbs.save(8, 0, 0, 1.0)
    expect(cbs.get(8)!.label).toBe('Bookmark 9')
  })

  it('书签 coordStr 包含 x 的四舍五入值', () => {
    cbs.save(0, 100.6, 200, 1.0)
    const b = cbs.get(0)
    expect(b!.coordStr).toContain('101')
  })

  it('书签 coordStr 包含 y 的四舍五入值', () => {
    cbs.save(0, 100, 200.4, 1.0)
    const b = cbs.get(0)
    expect(b!.coordStr).toContain('200')
  })

  it('书签 coordStr 格式为 "(x,y)"', () => {
    cbs.save(0, 50, 75, 1.0)
    const b = cbs.get(0)
    expect(b!.coordStr).toBe('(50,75)')
  })

  it('书签 rowLabel 格式为 "[N] Bookmark N"', () => {
    cbs.save(0, 0, 0, 1.0)
    const b = cbs.get(0)
    expect(b!.rowLabel).toBe('[1] Bookmark 1')
  })

  it('slot 5 rowLabel 为 "[6] Bookmark 6"', () => {
    cbs.save(5, 0, 0, 1.0)
    expect(cbs.get(5)!.rowLabel).toBe('[6] Bookmark 6')
  })

  it('负数坐标可以保存', () => {
    cbs.save(0, -100, -200, 1.0)
    const b = cbs.get(0)
    expect(b!.x).toBe(-100)
    expect(b!.y).toBe(-200)
  })

  it('坐标为 0 时可以保存', () => {
    cbs.save(0, 0, 0, 1.0)
    expect(cbs.get(0)!.x).toBe(0)
    expect(cbs.get(0)!.y).toBe(0)
  })

  it('zoom 为 0 时可以保存', () => {
    cbs.save(0, 0, 0, 0)
    expect(cbs.get(0)!.zoom).toBe(0)
  })

  it('越界 slot -100 时 save 无效', () => {
    cbs.save(-100, 100, 200, 1.0)
    for (let i = 0; i < 9; i++) {
      expect(cbs.get(i)).toBeNull()
    }
  })

  it('越界 slot 100 时 save 无效', () => {
    cbs.save(100, 100, 200, 1.0)
    for (let i = 0; i < 9; i++) {
      expect(cbs.get(i)).toBeNull()
    }
  })

  it('连续保存同一 slot 多次，最后一次生效', () => {
    for (let i = 0; i < 5; i++) {
      cbs.save(3, i * 10, i * 10, 1.0)
    }
    const b = cbs.get(3)
    expect(b!.x).toBe(40)
    expect(b!.y).toBe(40)
  })

  it('get 越界 slot -1 返回 null 或 undefined（不崩溃）', () => {
    expect(() => cbs.get(-1)).not.toThrow()
  })
})

// ── remove ─────────────────────────────────────────────────────────────────────

describe('CameraBookmarkSystem.remove', () => {
  let cbs: CameraBookmarkSystem

  beforeEach(() => {
    cbs = makeCBS()
  })
  afterEach(() => vi.restoreAllMocks())

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

  it('remove 后可以重新 save 到同一 slot', () => {
    cbs.save(0, 100, 200, 1.0)
    cbs.remove(0)
    cbs.save(0, 300, 400, 2.0)
    const b = cbs.get(0)
    expect(b!.x).toBe(300)
    expect(b!.y).toBe(400)
  })

  it('remove slot 0 后其他 slot 不受影响', () => {
    for (let i = 0; i < 9; i++) {
      cbs.save(i, i * 10, i * 10, 1.0)
    }
    cbs.remove(0)
    expect(cbs.get(0)).toBeNull()
    for (let i = 1; i < 9; i++) {
      expect(cbs.get(i)).not.toBeNull()
    }
  })

  it('remove slot 8 后其他 slot 不受影响', () => {
    for (let i = 0; i < 9; i++) {
      cbs.save(i, i * 10, i * 10, 1.0)
    }
    cbs.remove(8)
    expect(cbs.get(8)).toBeNull()
    for (let i = 0; i < 8; i++) {
      expect(cbs.get(i)).not.toBeNull()
    }
  })

  it('remove 已经为 null 的 slot 不崩溃', () => {
    expect(() => cbs.remove(0)).not.toThrow()
    expect(cbs.get(0)).toBeNull()
  })

  it('连续 remove 同一 slot 多次不崩溃', () => {
    cbs.save(4, 100, 200, 1.0)
    expect(() => {
      cbs.remove(4)
      cbs.remove(4)
      cbs.remove(4)
    }).not.toThrow()
  })
})

// ── togglePanel / isPanelOpen ─────────────────────────────────────────────────

describe('CameraBookmarkSystem panel state', () => {
  let cbs: CameraBookmarkSystem

  beforeEach(() => {
    cbs = makeCBS()
  })
  afterEach(() => vi.restoreAllMocks())

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

  it('三次 togglePanel 面板打开', () => {
    cbs.togglePanel()
    cbs.togglePanel()
    cbs.togglePanel()
    expect(cbs.isPanelOpen()).toBe(true)
  })

  it('四次 togglePanel 面板关闭', () => {
    cbs.togglePanel()
    cbs.togglePanel()
    cbs.togglePanel()
    cbs.togglePanel()
    expect(cbs.isPanelOpen()).toBe(false)
  })

  it('isPanelOpen 返回 boolean 类型', () => {
    expect(typeof cbs.isPanelOpen()).toBe('boolean')
  })

  it('多次查询 isPanelOpen 不改变状态', () => {
    cbs.togglePanel()
    const first = cbs.isPanelOpen()
    const second = cbs.isPanelOpen()
    expect(first).toBe(second)
  })

  it('新创建实例面板各自独立', () => {
    const cbs1 = makeCBS()
    const cbs2 = makeCBS()
    cbs1.togglePanel()
    expect(cbs1.isPanelOpen()).toBe(true)
    expect(cbs2.isPanelOpen()).toBe(false)
  })
})

// ── update 方法（toastTimer 递减） ────────────────────────────────────────────

describe('CameraBookmarkSystem.update', () => {
  let cbs: CameraBookmarkSystem

  beforeEach(() => {
    cbs = makeCBS()
  })
  afterEach(() => vi.restoreAllMocks())

  it('update 方法存在', () => {
    expect(typeof cbs.update).toBe('function')
  })

  it('初始 toastTimer 为 0', () => {
    expect((cbs as any).toastTimer).toBe(0)
  })

  it('update 时 toastTimer > 0 则递减', () => {
    ;(cbs as any).toastTimer = 10
    cbs.update()
    expect((cbs as any).toastTimer).toBe(9)
  })

  it('toastTimer 为 0 时调用 update 不变为负数', () => {
    ;(cbs as any).toastTimer = 0
    cbs.update()
    expect((cbs as any).toastTimer).toBe(0)
  })

  it('save 后 toastTimer 被设为 90（TOAST_TICKS）', () => {
    cbs.save(0, 0, 0, 1.0)
    expect((cbs as any).toastTimer).toBe(90)
  })

  it('save 后调用 update 90 次 toastTimer 归 0', () => {
    cbs.save(0, 0, 0, 1.0)
    for (let i = 0; i < 90; i++) {
      cbs.update()
    }
    expect((cbs as any).toastTimer).toBe(0)
  })

  it('save 后 toastMsg 不为空', () => {
    cbs.save(0, 0, 0, 1.0)
    expect((cbs as any).toastMsg).not.toBe('')
  })

  it('save slot 3 后 toastMsg 包含 "4"', () => {
    cbs.save(3, 0, 0, 1.0)
    expect((cbs as any).toastMsg).toContain('4')
  })
})

// ── 实例化与基本属性 ─────────────────────────────────────────────────────────

describe('CameraBookmarkSystem - 实例化与基本属性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('构造时不崩溃', () => {
    expect(() => new CameraBookmarkSystem()).not.toThrow()
  })

  it('bookmarks 初始为长度 9 的数组', () => {
    const cbs = makeCBS()
    expect((cbs as any).bookmarks).toHaveLength(9)
  })

  it('bookmarks 初始全为 null', () => {
    const cbs = makeCBS()
    const bookmarks: (any | null)[] = (cbs as any).bookmarks
    expect(bookmarks.every((b: any) => b === null)).toBe(true)
  })

  it('panelOpen 初始为 false', () => {
    const cbs = makeCBS()
    expect((cbs as any).panelOpen).toBe(false)
  })

  it('toastMsg 初始为空字符串', () => {
    const cbs = makeCBS()
    expect((cbs as any).toastMsg).toBe('')
  })

  it('多个实例互相独立', () => {
    const cbs1 = makeCBS()
    const cbs2 = makeCBS()
    cbs1.save(0, 100, 200, 1.0)
    expect(cbs1.get(0)).not.toBeNull()
    expect(cbs2.get(0)).toBeNull()
  })

  it('save 后 _toastMsgWidth 重置为 0', () => {
    const cbs = makeCBS()
    ;(cbs as any)._toastMsgWidth = 100
    cbs.save(0, 0, 0, 1.0)
    expect((cbs as any)._toastMsgWidth).toBe(0)
  })
})
