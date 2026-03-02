import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { KeybindSystem } from '../systems/KeybindSystem'

function makeSys() { return new KeybindSystem() }

describe('KeybindSystem — 初始状态', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('isPanelOpen 初始为 false', () => {
    expect(sys.isPanelOpen()).toBe(false)
  })
  it('waitingForKey 初始为 null', () => {
    expect((sys as any).waitingForKey).toBeNull()
  })
  it('scrollOffset 初始为 0', () => {
    expect((sys as any).scrollOffset).toBe(0)
  })
  it('bindings 是 Map 实例', () => {
    expect((sys as any).bindings).toBeInstanceOf(Map)
  })
  it('bindings 包含默认绑定数量 >= 10', () => {
    expect((sys as any).bindings.size).toBeGreaterThanOrEqual(10)
  })
})

describe('KeybindSystem — 默认绑定', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getKey pause = Space', () => {
    expect(sys.getKey('pause')).toBe('Space')
  })
  it('getKey speed1 = 1', () => {
    expect(sys.getKey('speed1')).toBe('1')
  })
  it('getKey speed2 = 2', () => {
    expect(sys.getKey('speed2')).toBe('2')
  })
  it('getKey speed5 = 3', () => {
    expect(sys.getKey('speed5')).toBe('3')
  })
  it('getKey save = Ctrl+S', () => {
    expect(sys.getKey('save')).toBe('Ctrl+S')
  })
  it('getKey load = Ctrl+L', () => {
    expect(sys.getKey('load')).toBe('Ctrl+L')
  })
  it('getKey undo = Ctrl+Z', () => {
    expect(sys.getKey('undo')).toBe('Ctrl+Z')
  })
  it('getKey toggleGrid = G', () => {
    expect(sys.getKey('toggleGrid')).toBe('G')
  })
  it('getKey toggleFog = F', () => {
    expect(sys.getKey('toggleFog')).toBe('F')
  })
  it('getKey togglePerf = F3', () => {
    expect(sys.getKey('togglePerf')).toBe('F3')
  })
  it('getKey help = F1', () => {
    expect(sys.getKey('help')).toBe('F1')
  })
  it('getKey screenshot = F12', () => {
    expect(sys.getKey('screenshot')).toBe('F12')
  })
  it('未注册 action 的 getKey 返回空字符串', () => {
    expect(sys.getKey('unknown_action')).toBe('')
  })
})

describe('KeybindSystem — getAction', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getAction Space 返回 pause', () => {
    expect(sys.getAction('Space')).toBe('pause')
  })
  it('getAction 1 返回 speed1', () => {
    expect(sys.getAction('1')).toBe('speed1')
  })
  it('getAction 2 返回 speed2', () => {
    expect(sys.getAction('2')).toBe('speed2')
  })
  it('getAction 3 返回 speed5', () => {
    expect(sys.getAction('3')).toBe('speed5')
  })
  it('getAction Ctrl+S 返回 save', () => {
    expect(sys.getAction('Ctrl+S')).toBe('save')
  })
  it('getAction G 返回 toggleGrid', () => {
    expect(sys.getAction('G')).toBe('toggleGrid')
  })
  it('getAction F 返回 toggleFog', () => {
    expect(sys.getAction('F')).toBe('toggleFog')
  })
  it('getAction F1 返回 help', () => {
    expect(sys.getAction('F1')).toBe('help')
  })
  it('getAction F3 返回 togglePerf', () => {
    expect(sys.getAction('F3')).toBe('togglePerf')
  })
  it('getAction F12 返回 screenshot', () => {
    expect(sys.getAction('F12')).toBe('screenshot')
  })
  it('getAction 未知键返回 null', () => {
    expect(sys.getAction('UnknownKey999')).toBeNull()
  })
  it('getAction 空字符串返回 null', () => {
    expect(sys.getAction('')).toBeNull()
  })
})

describe('KeybindSystem — togglePanel', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('一次 toggle 后 isPanelOpen 为 true', () => {
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })
  it('两次 toggle 后回到 false', () => {
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })
  it('三次 toggle 后为 true', () => {
    sys.togglePanel()
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })
  it('togglePanel 重置 waitingForKey 为 null', () => {
    ;(sys as any).waitingForKey = 'pause'
    sys.togglePanel()
    expect((sys as any).waitingForKey).toBeNull()
  })
  it('togglePanel 重置 scrollOffset 为 0', () => {
    ;(sys as any).scrollOffset = 100
    sys.togglePanel()
    expect((sys as any).scrollOffset).toBe(0)
  })
})

describe('KeybindSystem — rebind', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('rebind 成功返回 true', () => {
    expect(sys.rebind('pause', 'P')).toBe(true)
  })
  it('rebind 后 getKey 返回新键', () => {
    sys.rebind('pause', 'P')
    expect(sys.getKey('pause')).toBe('P')
  })
  it('rebind 后旧键不再映射到该 action', () => {
    sys.rebind('pause', 'P')
    expect(sys.getAction('Space')).toBeNull()
  })
  it('rebind 后新键正确映射到 action', () => {
    sys.rebind('pause', 'P')
    expect(sys.getAction('P')).toBe('pause')
  })
  it('rebind 到已被占用的键返回 false', () => {
    expect(sys.rebind('pause', '1')).toBe(false)
  })
  it('rebind 未注册的 action 返回 false', () => {
    expect(sys.rebind('nonexistent', 'X')).toBe(false)
  })
  it('rebind 到相同键成功（自身占用）', () => {
    expect(sys.rebind('pause', 'Space')).toBe(true)
  })
  it('rebind 保留其他 action 不受影响', () => {
    sys.rebind('pause', 'P')
    expect(sys.getKey('speed1')).toBe('1')
  })
  it('rebind normalizeKey: ctrl+s 规范化为 Ctrl+S', () => {
    sys.rebind('pause', 'ctrl+p')
    expect(sys.getKey('pause')).toBe('Ctrl+P')
  })
  it('rebind 多次修改最终值正确', () => {
    sys.rebind('pause', 'P')
    sys.rebind('pause', 'Q')
    expect(sys.getKey('pause')).toBe('Q')
  })
})

describe('KeybindSystem — resetToDefaults', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('修改后 resetToDefaults 恢复 pause 到 Space', () => {
    sys.rebind('pause', 'P')
    sys.resetToDefaults()
    expect(sys.getKey('pause')).toBe('Space')
  })
  it('修改多个后 resetToDefaults 全部恢复', () => {
    sys.rebind('pause', 'P')
    sys.rebind('toggleGrid', 'H')
    sys.resetToDefaults()
    expect(sys.getKey('pause')).toBe('Space')
    expect(sys.getKey('toggleGrid')).toBe('G')
  })
  it('resetToDefaults 后 getAction Space 仍返回 pause', () => {
    sys.rebind('pause', 'P')
    sys.resetToDefaults()
    expect(sys.getAction('Space')).toBe('pause')
  })
})

describe('KeybindSystem — register', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('注册新 action 后 getKey 可查询', () => {
    sys.register('myAction', 'M', 'My custom action')
    expect(sys.getKey('myAction')).toBe('M')
  })
  it('注册新 action 后 getAction 可反查', () => {
    sys.register('myAction', 'M', 'My custom action')
    expect(sys.getAction('M')).toBe('myAction')
  })
  it('重复 register 同一 action 不覆盖', () => {
    sys.register('pause', 'Z', 'Override attempt')
    expect(sys.getKey('pause')).toBe('Space')
  })
})

describe('KeybindSystem — getAllBindings', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getAllBindings 返回数组', () => {
    expect(Array.isArray(sys.getAllBindings())).toBe(true)
  })
  it('getAllBindings 数量与 bindings Map 一致', () => {
    expect(sys.getAllBindings()).toHaveLength((sys as any).bindings.size)
  })
  it('getAllBindings 每项包含 action', () => {
    for (const b of sys.getAllBindings()) {
      expect(b).toHaveProperty('action')
    }
  })
  it('getAllBindings 每项包含 key', () => {
    for (const b of sys.getAllBindings()) {
      expect(b).toHaveProperty('key')
    }
  })
  it('getAllBindings 每项包含 description', () => {
    for (const b of sys.getAllBindings()) {
      expect(b).toHaveProperty('description')
    }
  })
  it('getAllBindings 包含 pause action', () => {
    const pause = sys.getAllBindings().find(b => b.action === 'pause')
    expect(pause).toBeDefined()
  })
  it('rebind 后 getAllBindings 反映新键', () => {
    sys.rebind('pause', 'P')
    const pause = sys.getAllBindings().find(b => b.action === 'pause')
    expect(pause!.key).toBe('P')
  })
})

describe('KeybindSystem — normalizeKey 私有方法', () => {
  let sys: KeybindSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('normalizeKey 空字符串返回空字符串', () => {
    expect((sys as any).normalizeKey('')).toBe('')
  })
  it('normalizeKey 单字母首字母大写', () => {
    expect((sys as any).normalizeKey('p')).toBe('P')
  })
  it('normalizeKey 组合键规范化', () => {
    expect((sys as any).normalizeKey('ctrl+s')).toBe('Ctrl+S')
  })
  it('normalizeKey 带空格的组合键', () => {
    expect((sys as any).normalizeKey('ctrl + s')).toBe('Ctrl+S')
  })
  it('normalizeKey 已大写不变', () => {
    expect((sys as any).normalizeKey('Space')).toBe('Space')
  })
  it('normalizeKey F 键保持', () => {
    expect((sys as any).normalizeKey('F3')).toBe('F3')
  })
})

describe('KeybindSystem — localStorage 持久化', () => {
  let sys: KeybindSystem
  const store: Record<string, string> = {}
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { store[k] = v }),
      removeItem: vi.fn((k: string) => { delete store[k] }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    })
    Object.keys(store).forEach(k => delete store[k])
    sys = makeSys()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rebind 后 saveToStorage 被调用', () => {
    sys.rebind('pause', 'P')
    expect(localStorage.setItem).toHaveBeenCalled()
  })
  it('resetToDefaults 后 localStorage.removeItem 被调用', () => {
    sys.resetToDefaults()
    expect(localStorage.removeItem).toHaveBeenCalled()
  })
  it('loadFromStorage: 损坏 JSON 不崩溃', () => {
    store['worldbox_keybinds'] = 'INVALID{'
    expect(() => new KeybindSystem()).not.toThrow()
  })
  it('loadFromStorage: 持久化后重建系统恢复自定义键', () => {
    sys.rebind('pause', 'P')
    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls
    store['worldbox_keybinds'] = calls[calls.length - 1][1]
    const sys2 = new KeybindSystem()
    expect(sys2.getKey('pause')).toBe('P')
  })
  it('只有非默认键写入 storage（节约存储）', () => {
    sys.rebind('pause', 'P')
    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls
    const data = JSON.parse(calls[calls.length - 1][1])
    expect(Object.keys(data)).toContain('pause')
    expect(Object.keys(data)).not.toContain('speed1')
  })
})
