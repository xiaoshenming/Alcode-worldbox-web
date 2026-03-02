import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldHeatmapSystem } from '../systems/WorldHeatmapSystem'

function makeSys(): WorldHeatmapSystem { return new WorldHeatmapSystem() }

describe('WorldHeatmapSystem - 模式管理', () => {
  let sys: WorldHeatmapSystem
  beforeEach(() => { sys = makeSys() })

  it('初始模式为off', () => { expect(sys.currentMode).toBe('off') })
  it('modeIndex=1时currentMode为population', () => {
    ;(sys as any).modeIndex = 1
    expect(sys.currentMode).toBe('population')
  })
  it('modeIndex=2时currentMode为resource', () => {
    ;(sys as any).modeIndex = 2
    expect(sys.currentMode).toBe('resource')
  })
  it('modeIndex=3时currentMode为war', () => {
    ;(sys as any).modeIndex = 3
    expect(sys.currentMode).toBe('war')
  })
  it('modeIndex=4时currentMode为territory', () => {
    ;(sys as any).modeIndex = 4
    expect(sys.currentMode).toBe('territory')
  })
})

describe('WorldHeatmapSystem - cycleMode via handleKey', () => {
  let sys: WorldHeatmapSystem
  beforeEach(() => { sys = makeSys() })

  it('handleKey(m)从off循环到population', () => {
    sys.handleKey('m')
    expect(sys.currentMode).toBe('population')
  })
  it('handleKey(m)连续两次到达resource', () => {
    sys.handleKey('m')
    sys.handleKey('m')
    expect(sys.currentMode).toBe('resource')
  })
  it('handleKey(m)三次到达war', () => {
    sys.handleKey('m')
    sys.handleKey('m')
    sys.handleKey('m')
    expect(sys.currentMode).toBe('war')
  })
  it('handleKey(m)四次到达territory', () => {
    sys.handleKey('m')
    sys.handleKey('m')
    sys.handleKey('m')
    sys.handleKey('m')
    expect(sys.currentMode).toBe('territory')
  })
  it('handleKey(m)五次循环回off', () => {
    for (let i = 0; i < 5; i++) sys.handleKey('m')
    expect(sys.currentMode).toBe('off')
  })
  it('handleKey大写M也生效', () => {
    sys.handleKey('M')
    expect(sys.currentMode).toBe('population')
  })
  it('handleKey非m键返回false', () => {
    expect(sys.handleKey('k')).toBe(false)
  })
  it('handleKey(m)返回true', () => {
    expect(sys.handleKey('m')).toBe(true)
  })
  it('非m键不改变模式', () => {
    sys.handleKey('k')
    expect(sys.currentMode).toBe('off')
  })
})

describe('WorldHeatmapSystem - grids初始化', () => {
  let sys: WorldHeatmapSystem
  beforeEach(() => { sys = makeSys() })

  it('grids包含population', () => { expect((sys as any).grids.has('population')).toBe(true) })
  it('grids包含resource', () => { expect((sys as any).grids.has('resource')).toBe(true) })
  it('grids包含war', () => { expect((sys as any).grids.has('war')).toBe(true) })
  it('grids包含territory', () => { expect((sys as any).grids.has('territory')).toBe(true) })
  it('grids不包含off', () => { expect((sys as any).grids.has('off')).toBe(false) })
  it('grids中population为Float32Array', () => {
    expect((sys as any).grids.get('population')).toBeInstanceOf(Float32Array)
  })
  it('grids中war为Float32Array', () => {
    expect((sys as any).grids.get('war')).toBeInstanceOf(Float32Array)
  })
  it('grids中territory为Float32Array', () => {
    expect((sys as any).grids.get('territory')).toBeInstanceOf(Float32Array)
  })
})

describe('WorldHeatmapSystem - maxValues初始化', () => {
  let sys: WorldHeatmapSystem
  beforeEach(() => { sys = makeSys() })

  it('maxValues初始population=0', () => { expect((sys as any).maxValues.get('population')).toBe(0) })
  it('maxValues初始resource=0', () => { expect((sys as any).maxValues.get('resource')).toBe(0) })
  it('maxValues初始war=0', () => { expect((sys as any).maxValues.get('war')).toBe(0) })
  it('maxValues初始territory=0', () => { expect((sys as any).maxValues.get('territory')).toBe(0) })
})

describe('WorldHeatmapSystem - update()', () => {
  let sys: WorldHeatmapSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('update(0)不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => sys.update(0)).not.toThrow()
  })
  it('update(9999)不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => sys.update(9999)).not.toThrow()
  })
  it('多次update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 10; i++) expect(() => sys.update(i)).not.toThrow()
  })
  it('update不改变currentMode', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(100)
    expect(sys.currentMode).toBe('off')
  })
})
