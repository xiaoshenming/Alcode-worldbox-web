// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HelpOverlaySystem } from '../systems/HelpOverlaySystem'

function makeSys() { return new HelpOverlaySystem() }

// ─── 初始化状态 ──────────────────────────────────────────────────────────────

describe('HelpOverlaySystem — 初始化', () => {
  let sys: HelpOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 visible 为 false', () => {
    expect((sys as any).visible).toBe(false)
  })

  it('isVisible() 初始返回 false', () => {
    expect(sys.isVisible()).toBe(false)
  })

  it('isVisible() 返回 boolean', () => {
    expect(typeof sys.isVisible()).toBe('boolean')
  })

  it('初始 el 为 null', () => {
    expect((sys as any).el).toBeNull()
  })

  it('shortcuts 列表非空', () => {
    expect((sys as any).shortcuts.length).toBeGreaterThan(0)
  })

  it('shortcuts 至���包含 11 个条目', () => {
    expect((sys as any).shortcuts.length).toBeGreaterThanOrEqual(11)
  })

  it('每个 shortcut 有 key 字段', () => {
    for (const s of (sys as any).shortcuts) {
      expect(s).toHaveProperty('key')
    }
  })

  it('每个 shortcut 有 desc 字段', () => {
    for (const s of (sys as any).shortcuts) {
      expect(s).toHaveProperty('desc')
    }
  })

  it('key 字段为 string', () => {
    for (const s of (sys as any).shortcuts) {
      expect(typeof s.key).toBe('string')
    }
  })

  it('desc 字段为 string', () => {
    for (const s of (sys as any).shortcuts) {
      expect(typeof s.desc).toBe('string')
    }
  })
})

// ─── toggle 行为 ──────────────────────────────────────────────────────────────

describe('HelpOverlaySystem — toggle()', () => {
  let sys: HelpOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('toggle() 后 isVisible() 变为 true', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })

  it('toggle() 两次后 isVisible() 恢复为 false', () => {
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })

  it('toggle() 三次后 isVisible() 为 true', () => {
    sys.toggle()
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })

  it('toggle() 后 visible 内部字段为 true', () => {
    sys.toggle()
    expect((sys as any).visible).toBe(true)
  })

  it('toggle() 两次后 visible 内部字段为 false', () => {
    sys.toggle()
    sys.toggle()
    expect((sys as any).visible).toBe(false)
  })

  it('第一次 toggle() 后 el 被创建（非 null）', () => {
    sys.toggle()
    expect((sys as any).el).not.toBeNull()
  })

  it('第二次 toggle() 后 el 仍存在（复用）', () => {
    sys.toggle()
    const el1 = (sys as any).el
    sys.toggle()
    const el2 = (sys as any).el
    expect(el1).toBe(el2) // same element reused
  })
})

// ─── show(): DOM 结构 ─────────────────────────────────────────────────────────

describe('HelpOverlaySystem — show(): DOM 结构', () => {
  let sys: HelpOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => {
    // cleanup DOM
    const el = document.getElementById('helpOverlay')
    if (el) el.remove()
    vi.restoreAllMocks()
  })

  it('show() 后 el.id 为 helpOverlay', () => {
    sys.toggle()
    expect((sys as any).el!.id).toBe('helpOverlay')
  })

  it('show() 后 document.body 包含 helpOverlay', () => {
    sys.toggle()
    expect(document.getElementById('helpOverlay')).not.toBeNull()
  })

  it('show() 后 el.style.display 为 flex', () => {
    sys.toggle()
    expect((sys as any).el!.style.display).toBe('flex')
  })

  it('show() 后 el.style.position 为 fixed', () => {
    sys.toggle()
    expect((sys as any).el!.style.position).toBe('fixed')
  })

  it('show() 后 el 包含标题文字', () => {
    sys.toggle()
    expect((sys as any).el!.textContent).toContain('Keyboard Shortcuts')
  })

  it('show() 后 el 包含 F1 / H 提示', () => {
    sys.toggle()
    expect((sys as any).el!.textContent).toContain('F1')
  })

  it('show() 后 el 包含 Space shortcut', () => {
    sys.toggle()
    expect((sys as any).el!.textContent).toContain('Space')
  })

  it('show() 后 el 包含 Ctrl+S shortcut', () => {
    sys.toggle()
    expect((sys as any).el!.textContent).toContain('Ctrl+S')
  })

  it('show() 后 el 包含 Ctrl+L shortcut', () => {
    sys.toggle()
    expect((sys as any).el!.textContent).toContain('Ctrl+L')
  })

  it('show() 后 el 包含 Escape shortcut', () => {
    sys.toggle()
    expect((sys as any).el!.textContent).toContain('Escape')
  })

  it('show() 后 el 包含 "Toggle pause" 描述', () => {
    sys.toggle()
    expect((sys as any).el!.textContent).toContain('Toggle pause')
  })

  it('show() 后 el 包含 "Save game" 描述', () => {
    sys.toggle()
    expect((sys as any).el!.textContent).toContain('Save game')
  })

  it('show() 后 el 包含 "Reset world" 描述', () => {
    sys.toggle()
    expect((sys as any).el!.textContent).toContain('Reset world')
  })
})

// ─── hide(): DOM 隐藏 ─────────────────────────────────────────────────────────

describe('HelpOverlaySystem — hide(): DOM 隐藏', () => {
  let sys: HelpOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => {
    const el = document.getElementById('helpOverlay')
    if (el) el.remove()
    vi.restoreAllMocks()
  })

  it('hide() 后 el.style.display 为 none', () => {
    sys.toggle() // show
    sys.toggle() // hide
    expect((sys as any).el!.style.display).toBe('none')
  })

  it('hide() 后 visible 为 false', () => {
    sys.toggle()
    sys.toggle()
    expect((sys as any).visible).toBe(false)
  })

  it('hide() 后 isVisible() 返回 false', () => {
    sys.toggle()
    sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })

  it('再次 show() 后 el.style.display 重新变为 flex', () => {
    sys.toggle() // show
    sys.toggle() // hide
    sys.toggle() // show again
    expect((sys as any).el!.style.display).toBe('flex')
  })
})

// ─── click 关闭 ───────────────────────────────────────────────────────────────

describe('HelpOverlaySystem — click 关闭', () => {
  let sys: HelpOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => {
    const el = document.getElementById('helpOverlay')
    if (el) el.remove()
    vi.restoreAllMocks()
  })

  it('点击 el 触发 toggle (visible 变 false)', () => {
    sys.toggle() // now visible
    const el = (sys as any).el as HTMLDivElement
    el.click()
    expect(sys.isVisible()).toBe(false)
  })

  it('点击后 el.style.display 为 none', () => {
    sys.toggle()
    const el = (sys as any).el as HTMLDivElement
    el.click()
    expect(el.style.display).toBe('none')
  })
})

// ─── shortcuts 内容校验 ───────────────────────────────────────────────────────

describe('HelpOverlaySystem — shortcuts 内容校验', () => {
  let sys: HelpOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('包含 Speed 相关 shortcut', () => {
    const shortcuts: Array<{key: string; desc: string}> = (sys as any).shortcuts
    expect(shortcuts.some(s => s.desc.includes('Speed'))).toBe(true)
  })

  it('包含 Toggle territory overlay shortcut', () => {
    const shortcuts: Array<{key: string; desc: string}> = (sys as any).shortcuts
    expect(shortcuts.some(s => s.desc.includes('territory'))).toBe(true)
  })

  it('包含 Toggle mute shortcut', () => {
    const shortcuts: Array<{key: string; desc: string}> = (sys as any).shortcuts
    expect(shortcuts.some(s => s.desc.includes('mute'))).toBe(true)
  })

  it('key 字段不包含空字符串', () => {
    const shortcuts: Array<{key: string; desc: string}> = (sys as any).shortcuts
    expect(shortcuts.every(s => s.key.trim().length > 0)).toBe(true)
  })

  it('desc 字段不包含空字符串', () => {
    const shortcuts: Array<{key: string; desc: string}> = (sys as any).shortcuts
    expect(shortcuts.every(s => s.desc.trim().length > 0)).toBe(true)
  })

  it('shortcuts 为 Array', () => {
    expect(Array.isArray((sys as any).shortcuts)).toBe(true)
  })

  it('包含 Brush size shortcut ([ / ])', () => {
    const shortcuts: Array<{key: string; desc: string}> = (sys as any).shortcuts
    expect(shortcuts.some(s => s.key.includes('['))).toBe(true)
  })

  it('包含 Load game 描述', () => {
    const shortcuts: Array<{key: string; desc: string}> = (sys as any).shortcuts
    expect(shortcuts.some(s => s.desc.includes('Load game'))).toBe(true)
  })

  it('包含 territory 描述', () => {
    const shortcuts: Array<{key: string; desc: string}> = (sys as any).shortcuts
    expect(shortcuts.some(s => s.desc.toLowerCase().includes('territory'))).toBe(true)
  })
})

// ─── isVisible 与 toggle 一致性 ───────────────────────────────────────────────

describe('HelpOverlaySystem — isVisible 与 toggle 一致性', () => {
  let sys: HelpOverlaySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => {
    const el = document.getElementById('helpOverlay')
    if (el) el.remove()
    vi.restoreAllMocks()
  })

  it('toggle 后 isVisible 与 visible 内部字段一致', () => {
    sys.toggle()
    expect(sys.isVisible()).toBe((sys as any).visible)
  })

  it('10 次 toggle 后 visible=false (偶数次)', () => {
    for (let i = 0; i < 10; i++) sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })

  it('11 次 toggle 后 visible=true (奇数次)', () => {
    for (let i = 0; i < 11; i++) sys.toggle()
    expect(sys.isVisible()).toBe(true)
  })

  it('show 后 sys 内部 el 不为 null', () => {
    sys.toggle()
    expect((sys as any).el).not.toBeNull()
  })

  it('hide 后 isVisible 为 false', () => {
    sys.toggle() // show
    sys.toggle() // hide
    expect(sys.isVisible()).toBe(false)
  })

  it('el 的 zIndex 为 500', () => {
    sys.toggle()
    expect((sys as any).el!.style.zIndex).toBe('500')
  })

  it('el 背景色包含 rgba', () => {
    sys.toggle()
    const bg = (sys as any).el!.style.background
    expect(bg).toContain('rgba')
  })
})
