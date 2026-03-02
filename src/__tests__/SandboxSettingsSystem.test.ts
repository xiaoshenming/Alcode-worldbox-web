import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SandboxSettingsSystem } from '../systems/SandboxSettingsSystem'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

function makeSys() {
  localStorageMock.clear()
  localStorageMock.getItem.mockReturnValue(null as any)
  return new SandboxSettingsSystem()
}

afterEach(() => vi.restoreAllMocks())

// ─────────────────────────────────────────────
// 初始状态
// ────────────────────���────────────────────────
describe('初始状态', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })

  it('可以实例化', () => {
    expect(sys).toBeDefined()
    expect(sys).toBeInstanceOf(SandboxSettingsSystem)
  })

  it('初始values为对象', () => {
    expect(typeof (sys as any).values).toBe('object')
  })

  it('初始panelOpen为false', () => {
    expect((sys as any).panelOpen).toBe(false)
  })

  it('初始draggingKey为null', () => {
    expect((sys as any).draggingKey).toBeNull()
  })

  it('初始bools为对象', () => {
    expect(typeof (sys as any).bools).toBe('object')
  })

  it('初始valueStrs为对象', () => {
    expect(typeof (sys as any).valueStrs).toBe('object')
  })
})

// ─────────────────────────────────────────────
// get() 默认值
// ─────────────────────────────────────────────
describe('get() - 数值参数默认值', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })

  it('reproductionRate 默认值为1', () => {
    expect(sys.get('reproductionRate')).toBe(1)
  })

  it('warFrequency 默认值为1', () => {
    expect(sys.get('warFrequency')).toBe(1)
  })

  it('disasterChance 默认值为1', () => {
    expect(sys.get('disasterChance')).toBe(1)
  })

  it('resourceAbundance 默认值为1', () => {
    expect(sys.get('resourceAbundance')).toBe(1)
  })

  it('agingSpeed 默认值为1', () => {
    expect(sys.get('agingSpeed')).toBe(1)
  })

  it('techSpeed 默认值为1', () => {
    expect(sys.get('techSpeed')).toBe(1)
  })

  it('maxPopulation 默认值为2000', () => {
    expect(sys.get('maxPopulation')).toBe(2000)
  })

  it('peacefulMode 默认值为false', () => {
    expect(sys.get('peacefulMode')).toBe(false)
  })

  it('未知key返回0', () => {
    expect(sys.get('nonExistentKey')).toBe(0)
  })
})

// ─────────────────────────────────────────────
// set() 修改值
// ─────────────────────────────────────────────
describe('set() - 修改数值参数', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })

  it('set reproductionRate 后 get 返回新值', () => {
    sys.set('reproductionRate', 2)
    expect(sys.get('reproductionRate')).toBe(2)
  })

  it('set warFrequency 后 get 返回新值', () => {
    sys.set('warFrequency', 0.5)
    expect(sys.get('warFrequency')).toBeCloseTo(0.5, 5)
  })

  it('set maxPopulation=5000后正确返回', () => {
    sys.set('maxPopulation', 5000)
    expect(sys.get('maxPopulation')).toBe(5000)
  })

  it('set 超出max时被截断到max', () => {
    // reproductionRate max=5
    sys.set('reproductionRate', 100)
    expect(sys.get('reproductionRate')).toBe(5)
  })

  it('set 低于min时被截断到min', () => {
    // reproductionRate min=0.1
    sys.set('reproductionRate', -5)
    expect(sys.get('reproductionRate')).toBeCloseTo(0.1, 5)
  })

  it('set maxPopulation超过10000被截断', () => {
    sys.set('maxPopulation', 99999)
    expect(sys.get('maxPopulation')).toBe(10000)
  })

  it('set maxPopulation低于100被截断到100', () => {
    sys.set('maxPopulation', 0)
    expect(sys.get('maxPopulation')).toBe(100)
  })

  it('set agingSpeed=1.5后正确返回', () => {
    sys.set('agingSpeed', 1.5)
    expect(sys.get('agingSpeed')).toBeCloseTo(1.5, 5)
  })

  it('set techSpeed=3后正确返回', () => {
    sys.set('techSpeed', 3)
    expect(sys.get('techSpeed')).toBe(3)
  })

  it('连续set多次只保留最后一次值', () => {
    sys.set('reproductionRate', 2)
    sys.set('reproductionRate', 3)
    sys.set('reproductionRate', 1.5)
    expect(sys.get('reproductionRate')).toBeCloseTo(1.5, 5)
  })
})

describe('set() - 布尔参数', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })

  it('set peacefulMode=true后get返回true', () => {
    sys.set('peacefulMode', true)
    expect(sys.get('peacefulMode')).toBe(true)
  })

  it('set peacefulMode=false后get返回false', () => {
    sys.set('peacefulMode', true)
    sys.set('peacefulMode', false)
    expect(sys.get('peacefulMode')).toBe(false)
  })

  it('set peacefulMode=1（truthy）转为boolean true', () => {
    sys.set('peacefulMode', 1 as any)
    expect(sys.get('peacefulMode')).toBe(true)
  })

  it('set peacefulMode=0（falsy）转为boolean false', () => {
    sys.set('peacefulMode', 1 as any)
    sys.set('peacefulMode', 0 as any)
    expect(sys.get('peacefulMode')).toBe(false)
  })
})

// ─────────────────────────────────────────────
// resetToDefaults()
// ─────────────────────────────────────────────
describe('resetToDefaults()', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })

  it('reset后reproductionRate恢复为1', () => {
    sys.set('reproductionRate', 4.5)
    sys.resetToDefaults()
    expect(sys.get('reproductionRate')).toBe(1)
  })

  it('reset后maxPopulation恢复为2000', () => {
    sys.set('maxPopulation', 9900)
    sys.resetToDefaults()
    expect(sys.get('maxPopulation')).toBe(2000)
  })

  it('reset后peacefulMode恢复为false', () => {
    sys.set('peacefulMode', true)
    sys.resetToDefaults()
    expect(sys.get('peacefulMode')).toBe(false)
  })

  it('reset后所有数值参数恢复默认', () => {
    const keys = ['reproductionRate', 'warFrequency', 'disasterChance',
      'resourceAbundance', 'agingSpeed', 'techSpeed']
    for (const k of keys) sys.set(k, 4.9)
    sys.resetToDefaults()
    for (const k of keys) expect(sys.get(k)).toBe(1)
  })

  it('reset后maxPopulation恢复2000', () => {
    sys.set('maxPopulation', 5000)
    sys.resetToDefaults()
    expect(sys.get('maxPopulation')).toBe(2000)
  })
})

// ─────────────────────────────────────────────
// togglePanel / isPanelOpen
// ─────────────────────────────────────────────
describe('面板开关控制', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })

  it('isPanelOpen 初始为false', () => {
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('togglePanel 一次后变为true', () => {
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('togglePanel 两次后回到false', () => {
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('togglePanel 奇数次后为true', () => {
    for (let i = 0; i < 5; i++) sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('togglePanel 偶数次后为false', () => {
    for (let i = 0; i < 6; i++) sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('panelOpen 字段与 isPanelOpen() 同步', () => {
    sys.togglePanel()
    expect((sys as any).panelOpen).toBe(sys.isPanelOpen())
    sys.togglePanel()
    expect((sys as any).panelOpen).toBe(sys.isPanelOpen())
  })
})

// ─────────────────────────────────────────────
// endDrag()
// ─────────────────────────────────────────────
describe('endDrag()', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })

  it('endDrag后draggingKey为null', () => {
    ;(sys as any).draggingKey = 'reproductionRate'
    sys.endDrag()
    expect((sys as any).draggingKey).toBeNull()
  })

  it('初始调用endDrag不崩溃', () => {
    expect(() => sys.endDrag()).not.toThrow()
  })

  it('多次调用endDrag不崩溃', () => {
    sys.endDrag()
    sys.endDrag()
    sys.endDrag()
    expect((sys as any).draggingKey).toBeNull()
  })
})

// ─────────────────────────────────────────────
// localStorage 持久化
// ─────────────────────────────────────────────
describe('localStorage 持久化', () => {
  beforeEach(() => {
    localStorageMock.clear()
    localStorageMock.getItem.mockReturnValue(null as any)
  })

  it('构造时调用localStorage.getItem', () => {
    const spy = vi.spyOn(localStorageMock, 'getItem')
    new SandboxSettingsSystem()
    expect(spy).toHaveBeenCalled()
  })

  it('set()调用localStorage.setItem保存数据', () => {
    const spy = vi.spyOn(localStorageMock, 'setItem')
    const sys = new SandboxSettingsSystem()
    spy.mockClear()
    sys.set('reproductionRate', 2.5)
    expect(spy).toHaveBeenCalled()
  })

  it('resetToDefaults()调用localStorage.setItem', () => {
    const spy = vi.spyOn(localStorageMock, 'setItem')
    const sys = new SandboxSettingsSystem()
    spy.mockClear()
    sys.resetToDefaults()
    expect(spy).toHaveBeenCalled()
  })

  it('localStorage损坏时不崩溃（异常时保留默认值）', () => {
    localStorageMock.getItem.mockReturnValue('{ invalid json !!!}')
    const sys = new SandboxSettingsSystem()
    expect(sys.get('reproductionRate')).toBe(1)
  })

  it('localStorage返回null时保持默认值', () => {
    localStorageMock.getItem.mockReturnValue(null as any)
    const sys = new SandboxSettingsSystem()
    expect(sys.get('reproductionRate')).toBe(1)
  })
})

// ─────────────────────────────────────────────
// 内部布局辅助（私有访问）
// ─────────────────────────────────────────────
describe('内部 panelRect 缓存', () => {
  let sys: SandboxSettingsSystem
  beforeEach(() => { sys = makeSys() })

  it('_panelRect 初始为对象', () => {
    expect(typeof (sys as any)._panelRect).toBe('object')
  })

  it('_panelRect.w 为 PANEL_W=280', () => {
    expect((sys as any)._panelRect.w).toBe(280)
  })

  it('_panelSW 和 _panelSH 初始为0', () => {
    expect((sys as any)._panelSW).toBe(0)
    expect((sys as any)._panelSH).toBe(0)
  })

  it('_sliderRect 初始为对象', () => {
    expect(typeof (sys as any)._sliderRect).toBe('object')
  })
})
