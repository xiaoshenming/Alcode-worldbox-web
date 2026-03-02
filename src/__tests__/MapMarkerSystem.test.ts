import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MapMarkerSystem } from '../systems/MapMarkerSystem'
import type { MarkerData } from '../systems/MapMarkerSystem'

// ─── localStorage mock ────────────────────────────────────────────────────────
const _store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => _store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { _store[key] = val }),
  removeItem: vi.fn((key: string) => { delete _store[key] }),
  clear: vi.fn(() => { for (const k in _store) delete _store[k] }),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

function makeSys(): MapMarkerSystem { return new MapMarkerSystem() }

let _gId = 1
function makeMarker(overrides: Partial<MarkerData> = {}): MarkerData {
  return { id: _gId++, x: 10, y: 20, type: 'pin', label: 'Test', created: 0, ...overrides }
}

function injectMarker(sys: MapMarkerSystem, slot: number, m: MarkerData) {
  ;(sys as any).pool[slot] = m
}

describe('MapMarkerSystem — 初始化', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.clear()
    _gId = 1
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('无 localStorage 数据时初始无标记', () => {
    const sys = makeSys()
    expect(sys.getMarkers()).toHaveLength(0)
  })

  it('pool 长度为 100', () => {
    const sys = makeSys()
    expect((sys as any).pool).toHaveLength(100)
  })

  it('nextId 初始为 1（空存储）', () => {
    const sys = makeSys()
    expect((sys as any).nextId).toBe(1)
  })

  it('count 初始为 0', () => {
    const sys = makeSys()
    expect((sys as any).count).toBe(0)
  })

  it('_lastZoom 初始为 -1', () => {
    const sys = makeSys()
    expect((sys as any)._lastZoom).toBe(-1)
  })
})

describe('MapMarkerSystem — getMarkers()', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null)
    _gId = 1
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('空 pool 返回空数组', () => {
    const sys = makeSys()
    expect(sys.getMarkers()).toHaveLength(0)
  })

  it('单个注入标记可查询', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker())
    expect(sys.getMarkers()).toHaveLength(1)
  })

  it('多个注入标记全部返回', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker())
    injectMarker(sys, 5, makeMarker())
    injectMarker(sys, 10, makeMarker())
    expect(sys.getMarkers()).toHaveLength(3)
  })

  it('null slot 被跳过', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker())
    ;(sys as any).pool[1] = null
    injectMarker(sys, 2, makeMarker())
    expect(sys.getMarkers()).toHaveLength(2)
  })

  it('返回标记字段值正确', () => {
    const sys = makeSys()
    const m = makeMarker({ x: 42, y: 99, type: 'star', label: 'Castle' })
    injectMarker(sys, 0, m)
    const result = sys.getMarkers()[0]
    expect(result.x).toBe(42)
    expect(result.y).toBe(99)
    expect(result.type).toBe('star')
    expect(result.label).toBe('Castle')
  })

  it('最多返回 100 个标记', () => {
    const sys = makeSys()
    for (let i = 0; i < 100; i++) {
      ;(sys as any).pool[i] = makeMarker()
    }
    expect(sys.getMarkers()).toHaveLength(100)
  })

  it('末尾 slot 的标记也能返回', () => {
    const sys = makeSys()
    injectMarker(sys, 99, makeMarker({ label: 'Last' }))
    const markers = sys.getMarkers()
    expect(markers).toHaveLength(1)
    expect(markers[0].label).toBe('Last')
  })
})

describe('MapMarkerSystem — update()', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null)
    _gId = 1
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('update(0) 不崩溃', () => {
    const sys = makeSys()
    expect(() => sys.update(0)).not.toThrow()
  })

  it('update 多次调用不崩溃', () => {
    const sys = makeSys()
    expect(() => {
      for (let i = 0; i < 100; i++) sys.update(i)
    }).not.toThrow()
  })

  it('update 不修改 pool 内容', () => {
    const sys = makeSys()
    const m = makeMarker()
    injectMarker(sys, 0, m)
    sys.update(10)
    expect(sys.getMarkers()).toHaveLength(1)
    expect(sys.getMarkers()[0].label).toBe('Test')
  })
})

describe('MapMarkerSystem — save() 和 load()', () => {
  beforeEach(() => {
    localStorageMock.clear()
    localStorageMock.getItem.mockImplementation((key: string) => _store[key] ?? null)
    localStorageMock.setItem.mockImplementation((key: string, val: string) => { _store[key] = val })
    _gId = 1
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('save 调用 localStorage.setItem', () => {
    const sys = makeSys()
    sys.save()
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('save 序列化的数据为有效 JSON', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ label: 'A' }))
    sys.save()
    const raw = _store['worldbox_markers']
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it('save 后 load 恢复标记数量', () => {
    const sys1 = makeSys()
    injectMarker(sys1, 0, makeMarker({ id: 10, x: 5, y: 5, type: 'flag', label: 'X', created: 0 }))
    injectMarker(sys1, 1, makeMarker({ id: 11, x: 15, y: 15, type: 'star', label: 'Y', created: 0 }))
    sys1.save()

    localStorageMock.getItem.mockReturnValue(_store['worldbox_markers'])
    const sys2 = makeSys()
    expect(sys2.getMarkers()).toHaveLength(2)
  })

  it('load 读取空字符串不崩溃', () => {
    localStorageMock.getItem.mockReturnValue('')
    expect(() => makeSys()).not.toThrow()
  })

  it('load 读取损坏 JSON 不崩溃', () => {
    localStorageMock.getItem.mockReturnValue('{not-json')
    expect(() => makeSys()).not.toThrow()
  })

  it('load 读取非数组 JSON 不崩溃', () => {
    localStorageMock.getItem.mockReturnValue('{"key":"val"}')
    expect(() => makeSys()).not.toThrow()
  })

  it('load null 数据不崩溃', () => {
    localStorageMock.getItem.mockReturnValue(null)
    expect(() => makeSys()).not.toThrow()
  })

  it('load 更新 nextId 超过已存储的最大 id', () => {
    const raw = JSON.stringify([
      { id: 50, x: 1, y: 1, type: 'pin', label: 'Z', created: 0 }
    ])
    localStorageMock.getItem.mockReturnValue(raw)
    const sys = makeSys()
    expect((sys as any).nextId).toBeGreaterThan(50)
  })

  it('load 超过100条时截断到100', () => {
    const arr = []
    for (let i = 0; i < 120; i++) {
      arr.push({ id: i + 1, x: i, y: i, type: 'pin', label: `M${i}`, created: 0 })
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(arr))
    const sys = makeSys()
    expect(sys.getMarkers().length).toBeLessThanOrEqual(100)
  })

  it('save 写入的 key 为 worldbox_markers', () => {
    const sys = makeSys()
    sys.save()
    expect(localStorageMock.setItem).toHaveBeenCalledWith('worldbox_markers', expect.any(String))
  })

  it('load 后 count 与标记数一致', () => {
    const raw = JSON.stringify([
      { id: 1, x: 0, y: 0, type: 'pin', label: 'A', created: 0 },
      { id: 2, x: 1, y: 1, type: 'star', label: 'B', created: 0 },
    ])
    localStorageMock.getItem.mockReturnValue(raw)
    const sys = makeSys()
    expect((sys as any).count).toBe(2)
  })

  it('localStorage.setItem 抛出异常时 save 不崩溃', () => {
    localStorageMock.setItem.mockImplementation(() => { throw new Error('QuotaExceeded') })
    const sys = makeSys()
    expect(() => sys.save()).not.toThrow()
  })

  it('localStorage.getItem 抛出异常时 load 不崩溃', () => {
    localStorageMock.getItem.mockImplementation(() => { throw new Error('SecurityError') })
    expect(() => makeSys()).not.toThrow()
  })
})

describe('MapMarkerSystem — render()', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null)
    _gId = 1
  })
  afterEach(() => { vi.restoreAllMocks() })

  function makeCtx() {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      font: '',
      textAlign: '',
      textBaseline: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
    } as unknown as CanvasRenderingContext2D
  }

  it('无标记时 render 不崩溃', () => {
    const sys = makeSys()
    const ctx = makeCtx()
    expect(() => sys.render(ctx, 0, 0, 1)).not.toThrow()
  })

  it('render 调用 ctx.save 和 ctx.restore', () => {
    const sys = makeSys()
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('有标记时 render 调用 fillText', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ x: 5, y: 5 }))
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('zoom 变化时更新字体缓存', () => {
    const sys = makeSys()
    sys.render(makeCtx(), 0, 0, 1)
    expect((sys as any)._lastZoom).toBe(1)
    sys.render(makeCtx(), 0, 0, 2)
    expect((sys as any)._lastZoom).toBe(2)
  })

  it('相同 zoom 时字体缓存不重新计算', () => {
    const sys = makeSys()
    sys.render(makeCtx(), 0, 0, 1.5)
    const font1 = (sys as any)._sansFont
    sys.render(makeCtx(), 0, 0, 1.5)
    const font2 = (sys as any)._sansFont
    expect(font1).toBe(font2)
  })

  it('zoom < 0.4 时不渲染标签（无 strokeText）', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ label: 'Hidden' }))
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 0.3)
    expect(ctx.strokeText).not.toHaveBeenCalled()
  })

  it('zoom > 0.4 时渲染标签（有 strokeText）', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ label: 'Visible' }))
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.strokeText).toHaveBeenCalled()
  })

  it('未知 type 使用原始 type 字符串渲染', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ type: 'custom_icon', label: '' }))
    const ctx = makeCtx()
    sys.render(ctx, 0, 0, 1)
    expect(ctx.fillText).toHaveBeenCalledWith('custom_icon', expect.any(Number), expect.any(Number))
  })
})

describe('MapMarkerSystem — 标记类型覆盖', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null)
    _gId = 1
  })
  afterEach(() => { vi.restoreAllMocks() })

  it.each(['pin', 'star', 'warning', 'flag'])('类型 %s 可注入并查询', (type) => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ type }))
    expect(sys.getMarkers()[0].type).toBe(type)
  })

  it('空 label 标记不崩溃', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ label: '' }))
    expect(sys.getMarkers()[0].label).toBe('')
  })

  it('created 字段正确保存', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ created: 12345 }))
    expect(sys.getMarkers()[0].created).toBe(12345)
  })

  it('负坐标标记可存储', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ x: -50, y: -100 }))
    const m = sys.getMarkers()[0]
    expect(m.x).toBe(-50)
    expect(m.y).toBe(-100)
  })
})

describe('MapMarkerSystem — 边界与额外覆盖', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null)
    _gId = 1
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('getMarkers 每次调用返回新数组（非同一引用）', () => {
    const sys = makeSys()
    const r1 = sys.getMarkers()
    const r2 = sys.getMarkers()
    expect(r1).not.toBe(r2)
  })

  it('pool 全部为 null 时 getMarkers 返回空数组', () => {
    const sys = makeSys()
    for (let i = 0; i < 100; i++) (sys as any).pool[i] = null
    expect(sys.getMarkers()).toHaveLength(0)
  })

  it('id 字段在 load 后被正确恢复', () => {
    const raw = JSON.stringify([
      { id: 77, x: 5, y: 5, type: 'warning', label: 'W', created: 99 }
    ])
    localStorageMock.getItem.mockReturnValue(raw)
    const sys = makeSys()
    expect(sys.getMarkers()[0].id).toBe(77)
  })

  it('load 后 marker x/y 坐标正确', () => {
    const raw = JSON.stringify([
      { id: 1, x: 123, y: 456, type: 'flag', label: 'F', created: 0 }
    ])
    localStorageMock.getItem.mockReturnValue(raw)
    const sys = makeSys()
    const m = sys.getMarkers()[0]
    expect(m.x).toBe(123)
    expect(m.y).toBe(456)
  })

  it('save 后再 load 恢复的 label 正确', () => {
    const sys1 = makeSys()
    injectMarker(sys1, 0, makeMarker({ id: 20, label: 'MyLabel' }))
    sys1.save()

    localStorageMock.getItem.mockReturnValue(_store['worldbox_markers'])
    const sys2 = makeSys()
    expect(sys2.getMarkers()[0].label).toBe('MyLabel')
  })

  it('load 无效 marker（id 非 number）被跳过', () => {
    const raw = JSON.stringify([
      { id: 'bad', x: 0, y: 0, type: 'pin', label: 'X', created: 0 },
      { id: 2, x: 1, y: 1, type: 'pin', label: 'OK', created: 0 }
    ])
    localStorageMock.getItem.mockReturnValue(raw)
    const sys = makeSys()
    // id='bad' 的条目应被跳过，只有1个有效
    expect(sys.getMarkers()).toHaveLength(1)
  })

  it('多次 save 只保留最新的序列化数据', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ id: 1, label: 'First' }))
    sys.save()
    const snap1 = _store['worldbox_markers']

    ;(sys as any).pool[0] = null
    injectMarker(sys, 0, makeMarker({ id: 2, label: 'Second' }))
    sys.save()
    const snap2 = _store['worldbox_markers']

    expect(snap1).not.toBe(snap2)
    expect(snap2).toContain('Second')
  })

  it('save 存储的 JSON 解析出 type 字段', () => {
    const sys = makeSys()
    injectMarker(sys, 0, makeMarker({ type: 'flag' }))
    sys.save()
    const arr = JSON.parse(_store['worldbox_markers'])
    expect(arr[0].type).toBe('flag')
  })
})
