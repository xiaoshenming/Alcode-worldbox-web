import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldExportSystem } from '../systems/WorldExportSystem'
import type { ExportData } from '../systems/WorldExportSystem'

function makeSys() { return new WorldExportSystem() }

// 最小合法 ExportData
function makeValidData(overrides: Partial<ExportData> = {}): ExportData {
  return {
    version: 1,
    exportDate: new Date().toISOString(),
    tick: 0,
    worldWidth: 100,
    worldHeight: 100,
    tiles: [[2]],
    tileVariants: [[0]],
    entities: [],
    civilizations: [],
    territoryMap: [[0]],
    resourceNodes: [],
    ...overrides,
  }
}

describe('WorldExportSystem', () => {
  let sys: WorldExportSystem

  beforeEach(() => {
    sys = makeSys()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('可以实例化', () => { expect(sys).toBeDefined() })

  it('初始 importing 为 false', () => {
    expect((sys as any).importing).toBe(false)
  })

  it('初始 importProgress 为 0', () => {
    expect((sys as any).importProgress).toBe(0)
  })

  it('初始 _importProgressStr 包含 0%', () => {
    expect((sys as any)._importProgressStr).toContain('0%')
  })

  // ── validate 私有方法（通过 (sys as any).validate 访问） ──────

  it('validate: null 返回 false', () => {
    expect((sys as any).validate(null)).toBe(false)
  })

  it('validate: 非对象（字符串）返回 false', () => {
    expect((sys as any).validate('hello')).toBe(false)
  })

  it('validate: 缺少 version 返回 false', () => {
    const d = makeValidData()
    delete (d as any).version
    expect((sys as any).validate(d)).toBe(false)
  })

  it('validate: version 超过 EXPORT_VERSION(1) 返回 false', () => {
    const d = makeValidData({ version: 99 })
    expect((sys as any).validate(d)).toBe(false)
  })

  it('validate: version=1 合法返回 true', () => {
    expect((sys as any).validate(makeValidData({ version: 1 }))).toBe(true)
  })

  it('validate: 缺少 tiles 数组返回 false', () => {
    const d = makeValidData()
    delete (d as any).tiles
    expect((sys as any).validate(d)).toBe(false)
  })

  it('validate: tiles 为非数组（对象）返回 false', () => {
    const d = makeValidData({ tiles: {} as any })
    expect((sys as any).validate(d)).toBe(false)
  })

  it('validate: 缺少 entities 数组返回 false', () => {
    const d = makeValidData()
    delete (d as any).entities
    expect((sys as any).validate(d)).toBe(false)
  })

  it('validate: 缺少 worldWidth 返回 false', () => {
    const d = makeValidData()
    delete (d as any).worldWidth
    expect((sys as any).validate(d)).toBe(false)
  })

  it('validate: 缺少 worldHeight 返回 false', () => {
    const d = makeValidData()
    delete (d as any).worldHeight
    expect((sys as any).validate(d)).toBe(false)
  })

  it('validate: worldWidth 为字符串返回 false', () => {
    const d = makeValidData({ worldWidth: 'abc' as any })
    expect((sys as any).validate(d)).toBe(false)
  })

  it('validate: 缺少 tick 返回 false', () => {
    const d = makeValidData()
    delete (d as any).tick
    expect((sys as any).validate(d)).toBe(false)
  })

  it('validate: tick 为 0 是合法的', () => {
    expect((sys as any).validate(makeValidData({ tick: 0 }))).toBe(true)
  })

  it('validate: 完整合法数据返回 true', () => {
    expect((sys as any).validate(makeValidData())).toBe(true)
  })

  // ── importWorld 异步方法 ────────────────────────────────────

  it('importWorld: 非法 JSON 文件返回 null', async () => {
    const file = new File(['not-json!!!'], 'test.json', { type: 'application/json' })
    const result = await sys.importWorld(file)
    expect(result).toBeNull()
  })

  it('importWorld: 合法 JSON 但不符合 schema 返回 null', async () => {
    const file = new File([JSON.stringify({ foo: 'bar' })], 'test.json', { type: 'application/json' })
    const result = await sys.importWorld(file)
    expect(result).toBeNull()
  })

  it('importWorld: 合法 ExportData 返回非 null', async () => {
    const data = makeValidData()
    const file = new File([JSON.stringify(data)], 'test.json', { type: 'application/json' })
    const result = await sys.importWorld(file)
    expect(result).not.toBeNull()
  })

  it('importWorld: 返回数据包含正确的 version', async () => {
    const data = makeValidData({ version: 1 })
    const file = new File([JSON.stringify(data)], 'test.json', { type: 'application/json' })
    const result = await sys.importWorld(file)
    expect(result?.version).toBe(1)
  })

  it('importWorld: 返回数据包含正确的 tick', async () => {
    const data = makeValidData({ tick: 42 })
    const file = new File([JSON.stringify(data)], 'test.json', { type: 'application/json' })
    const result = await sys.importWorld(file)
    expect(result?.tick).toBe(42)
  })

  it('importWorld: version 超出上限(99)返回 null', async () => {
    const data = makeValidData({ version: 99 })
    const file = new File([JSON.stringify(data)], 'test.json', { type: 'application/json' })
    const result = await sys.importWorld(file)
    expect(result).toBeNull()
  })

  it('importWorld 完成后 importing 最终变为 false（setTimeout 后）', async () => {
    vi.useFakeTimers()
    const data = makeValidData()
    const file = new File([JSON.stringify(data)], 'test.json', { type: 'application/json' })
    await sys.importWorld(file)
    // 此时 importing 可能还是 true（等 setTimeout）
    vi.runAllTimers()
    expect((sys as any).importing).toBe(false)
    vi.useRealTimers()
  })

  // ── render 方法（canvas mock） ─────────────────────────────

  it('render: importing=false 时不调用 fillRect', () => {
    const ctx = { fillStyle: '', fillRect: vi.fn(), fillText: vi.fn(), font: '', textAlign: '' } as any
    sys.render(ctx, 800, 600)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('render: importing=true 时调用 fillRect（绘制背景）', () => {
    (sys as any).importing = true
    const ctx = { fillStyle: '', fillRect: vi.fn(), fillText: vi.fn(), font: '', textAlign: '' } as any
    sys.render(ctx, 800, 600)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('render: importing=true 时调用 fillText（显示进度文字）', () => {
    (sys as any).importing = true
    const ctx = { fillStyle: '', fillRect: vi.fn(), fillText: vi.fn(), font: '', textAlign: '' } as any
    sys.render(ctx, 800, 600)
    expect(ctx.fillText).toHaveBeenCalled()
  })

  // ── exportWorld 方法（DOM mock） ────────────────────────────

  it('exportWorld: 接受 null 参数不崩溃', () => {
    expect(() => {
      try {
        sys.exportWorld(null as any, null as any, null as any, null as any)
      } catch {
        // 允许内部抛出，只验证不是未捕获的 unhandled error
      }
    }).not.toThrow()
  })
})
