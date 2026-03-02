import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PowerFavoriteSystem } from '../systems/PowerFavoriteSystem'

// mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get store() { return store },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

function makeSys() {
  localStorageMock.clear()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  return new PowerFavoriteSystem()
}

describe('PowerFavoriteSystem 初始状态', () => {
  let sys: PowerFavoriteSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('getSelectedPower 初始返回 null', () => {
    expect(sys.getSelectedPower()).toBeNull()
  })

  it('selectedIndex 初始为 -1', () => {
    expect((sys as any).selectedIndex).toBe(-1)
  })

  it('slots 初始长度为 8', () => {
    expect((sys as any).slots.length).toBe(8)
  })

  it('slots 所有槽位初始为 null', () => {
    const slots: (unknown | null)[] = (sys as any).slots
    expect(slots.every(s => s === null)).toBe(true)
  })

  it('构造时调用 localStorage.getItem', () => {
    expect(localStorageMock.getItem).toHaveBeenCalled()
  })
})

describe('PowerFavoriteSystem addFavorite', () => {
  let sys: PowerFavoriteSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('addFavorite 在有效槽位写入数据', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    const slot = (sys as any).slots[0]
    expect(slot).not.toBeNull()
    expect(slot.powerId).toBe('fire')
    expect(slot.label).toBe('Fire')
    expect(slot.color).toBe('#ff0000')
  })

  it('addFavorite 在最后一个槽位（7）写入数据', () => {
    sys.addFavorite(7, 'water', 'Water', '#0000ff')
    const slot = (sys as any).slots[7]
    expect(slot).not.toBeNull()
    expect(slot.powerId).toBe('water')
  })

  it('addFavorite 后 getSelectedPower 仍为 null（未选中）', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    expect(sys.getSelectedPower()).toBeNull()
  })

  it('addFavorite 超出范围的负数槽位不崩溃', () => {
    expect(() => sys.addFavorite(-1, 'fire', 'Fire', '#ff0000')).not.toThrow()
  })

  it('addFavorite 超出范围的正数槽位不崩溃', () => {
    expect(() => sys.addFavorite(99, 'fire', 'Fire', '#ff0000')).not.toThrow()
  })

  it('addFavorite 到越界槽位后 slots 不被修改', () => {
    sys.addFavorite(8, 'fire', 'Fire', '#ff0000')
    const slots: unknown[] = (sys as any).slots
    expect(slots.every(s => s === null)).toBe(true)
  })

  it('addFavorite 后调用 localStorage.setItem（持久化）', () => {
    localStorageMock.setItem.mockClear()
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('addFavorite 可覆盖已有槽位', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    sys.addFavorite(0, 'ice', 'Ice', '#00ffff')
    const slot = (sys as any).slots[0]
    expect(slot.powerId).toBe('ice')
  })

  it('addFavorite 到槽位 1-5 均正常写入', () => {
    for (let i = 1; i <= 5; i++) {
      sys.addFavorite(i, `power${i}`, `Power${i}`, '#ffffff')
      expect((sys as any).slots[i]).not.toBeNull()
    }
  })
})

describe('PowerFavoriteSystem removeFavorite', () => {
  let sys: PowerFavoriteSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('removeFavorite 移除存在的槽位后该槽为 null', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    sys.removeFavorite(0)
    expect((sys as any).slots[0]).toBeNull()
  })

  it('removeFavorite 不存在的槽位不崩溃', () => {
    expect(() => sys.removeFavorite(0)).not.toThrow()
  })

  it('removeFavorite 负数槽位不崩溃', () => {
    expect(() => sys.removeFavorite(-1)).not.toThrow()
  })

  it('removeFavorite 超界槽位不崩溃', () => {
    expect(() => sys.removeFavorite(99)).not.toThrow()
  })

  it('removeFavorite 被选中的槽位后 selectedIndex 变为 -1', () => {
    sys.addFavorite(2, 'fire', 'Fire', '#ff0000')
    sys.handleKey('3') // 选中槽位 2
    expect((sys as any).selectedIndex).toBe(2)
    sys.removeFavorite(2)
    expect((sys as any).selectedIndex).toBe(-1)
  })

  it('removeFavorite 非选中槽位不改变 selectedIndex', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    sys.addFavorite(1, 'ice', 'Ice', '#00ffff')
    sys.handleKey('1') // 选中槽位 0
    sys.removeFavorite(1) // 移除槽位 1
    expect((sys as any).selectedIndex).toBe(0)
  })

  it('removeFavorite 后调用 localStorage.setItem', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    localStorageMock.setItem.mockClear()
    sys.removeFavorite(0)
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('removeFavorite 移除后 getSelectedPower 返回 null', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    sys.handleKey('1') // 选中槽位 0
    sys.removeFavorite(0)
    expect(sys.getSelectedPower()).toBeNull()
  })
})

describe('PowerFavoriteSystem handleKey', () => {
  let sys: PowerFavoriteSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('handleKey "1" 对应槽位有内容时返回 true', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    expect(sys.handleKey('1')).toBe(true)
  })

  it('handleKey "1" 对应槽位无内容时返回 false', () => {
    expect(sys.handleKey('1')).toBe(false)
  })

  it('handleKey "8" 对应槽位有内容时选中该槽', () => {
    sys.addFavorite(7, 'wind', 'Wind', '#aaffaa')
    sys.handleKey('8')
    expect((sys as any).selectedIndex).toBe(7)
  })

  it('handleKey "0" 无效键返回 false', () => {
    expect(sys.handleKey('0')).toBe(false)
  })

  it('handleKey "9" 无效键返回 false', () => {
    expect(sys.handleKey('9')).toBe(false)
  })

  it('handleKey "a" 字母键返回 false', () => {
    expect(sys.handleKey('a')).toBe(false)
  })

  it('handleKey 再次按同一键取消选中（toggle 行为）', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    sys.handleKey('1')
    expect((sys as any).selectedIndex).toBe(0)
    sys.handleKey('1')
    expect((sys as any).selectedIndex).toBe(-1)
  })

  it('handleKey 切换不同槽位', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    sys.addFavorite(1, 'ice', 'Ice', '#00ffff')
    sys.handleKey('1')
    sys.handleKey('2')
    expect((sys as any).selectedIndex).toBe(1)
  })

  it('handleKey 后 getSelectedPower 返回对应 powerId', () => {
    sys.addFavorite(2, 'lightning', 'Lightning', '#ffff00')
    sys.handleKey('3')
    expect(sys.getSelectedPower()).toBe('lightning')
  })

  it('handleKey 空字符串不崩溃并返回 false', () => {
    expect(() => sys.handleKey('')).not.toThrow()
    expect(sys.handleKey('')).toBe(false)
  })
})

describe('PowerFavoriteSystem getSelectedPower', () => {
  let sys: PowerFavoriteSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('无选中时返回 null', () => {
    expect(sys.getSelectedPower()).toBeNull()
  })

  it('selectedIndex 合法但槽位为 null 时返回 null', () => {
    ;(sys as any).selectedIndex = 0
    // slots[0] 为 null
    expect(sys.getSelectedPower()).toBeNull()
  })

  it('selectedIndex 为 -1 时返回 null', () => {
    ;(sys as any).selectedIndex = -1
    expect(sys.getSelectedPower()).toBeNull()
  })

  it('selectedIndex >= MAX_SLOTS 时返回 null', () => {
    ;(sys as any).selectedIndex = 8
    expect(sys.getSelectedPower()).toBeNull()
  })

  it('选中有效槽位时返回对应 powerId', () => {
    sys.addFavorite(3, 'meteor', 'Meteor', '#ff8800')
    ;(sys as any).selectedIndex = 3
    expect(sys.getSelectedPower()).toBe('meteor')
  })

  it('选中后取消选中返回 null', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    sys.handleKey('1')
    sys.handleKey('1') // toggle off
    expect(sys.getSelectedPower()).toBeNull()
  })
})

describe('PowerFavoriteSystem localStorage 持久化', () => {
  afterEach(() => vi.restoreAllMocks())

  it('构造时从 localStorage 加载数据', () => {
    const data = [
      { powerId: 'fire', label: 'Fire', color: '#ff0000' },
      null, null, null, null, null, null, null
    ]
    localStorageMock.store['worldbox_power_favorites'] = JSON.stringify(data)
    localStorageMock.getItem.mockImplementation((key: string) =>
      localStorageMock.store[key] ?? null
    )
    const sys = new PowerFavoriteSystem()
    expect((sys as any).slots[0]).not.toBeNull()
    expect((sys as any).slots[0].powerId).toBe('fire')
  })

  it('localStorage 数据损坏时不崩溃', () => {
    localStorageMock.store['worldbox_power_favorites'] = 'invalid_json{{{'
    localStorageMock.getItem.mockImplementation((key: string) =>
      localStorageMock.store[key] ?? null
    )
    expect(() => new PowerFavoriteSystem()).not.toThrow()
  })

  it('localStorage 数据非数组时忽略', () => {
    localStorageMock.store['worldbox_power_favorites'] = JSON.stringify({ foo: 'bar' })
    localStorageMock.getItem.mockImplementation((key: string) =>
      localStorageMock.store[key] ?? null
    )
    const sys = new PowerFavoriteSystem()
    const slots: unknown[] = (sys as any).slots
    expect(slots.every(s => s === null)).toBe(true)
  })

  it('addFavorite 后 localStorage 包含正确序列化数据', () => {
    localStorageMock.clear()
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      localStorageMock.store[key] = value
    })
    const sys = new PowerFavoriteSystem()
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    const stored = JSON.parse(localStorageMock.store['worldbox_power_favorites'])
    expect(stored[0]).toMatchObject({ powerId: 'fire', label: 'Fire', color: '#ff0000' })
  })
})

describe('PowerFavoriteSystem render 方法', () => {
  let sys: PowerFavoriteSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  function makeMockCtx() {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fillText: vi.fn(),
      set fillStyle(_v: string) {},
      set strokeStyle(_v: string) {},
      set globalAlpha(_v: number) {},
      set lineWidth(_v: number) {},
      set font(_v: string) {},
      set textAlign(_v: CanvasTextAlign) {},
      set textBaseline(_v: CanvasTextBaseline) {},
    } as unknown as CanvasRenderingContext2D
  }

  it('render 不崩溃（空槽位）', () => {
    const ctx = makeMockCtx()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render 调用 ctx.save 和 ctx.restore', () => {
    const ctx = makeMockCtx()
    const save = vi.spyOn(ctx, 'save')
    const restore = vi.spyOn(ctx, 'restore')
    sys.render(ctx, 800, 600)
    expect(save).toHaveBeenCalled()
    expect(restore).toHaveBeenCalled()
  })

  it('render 有收藏时不崩溃', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    const ctx = makeMockCtx()
    expect(() => sys.render(ctx, 1280, 720)).not.toThrow()
  })

  it('render 选中状态不崩溃', () => {
    sys.addFavorite(0, 'fire', 'Fire', '#ff0000')
    sys.handleKey('1')
    const ctx = makeMockCtx()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render 长标签被截断（>6字符）不崩溃', () => {
    sys.addFavorite(0, 'fire', 'VeryLongLabelName', '#ff0000')
    const ctx = makeMockCtx()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })
})
