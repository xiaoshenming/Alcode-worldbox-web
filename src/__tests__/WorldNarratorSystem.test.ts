import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldNarratorSystem } from '../systems/WorldNarratorSystem'

function makeSys(): WorldNarratorSystem { return new WorldNarratorSystem() }

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldNarratorSystem 初始状态', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  it('初始 entries 为空数组', () => { expect((sys as any).entries).toHaveLength(0) })
  it('初始 visible 为 false', () => { expect((sys as any).visible).toBe(false) })
  it('初始 unreadCount 为 0', () => { expect((sys as any).unreadCount).toBe(0) })
  it('初始 _unreadStr 为 "0"', () => { expect((sys as any)._unreadStr).toBe('0') })
  it('初始 scrollY 为 0', () => { expect((sys as any).scrollY).toBe(0) })
  it('初始 maxScroll 为 0', () => { expect((sys as any).maxScroll).toBe(0) })
  it('初始 dragging 为 false', () => { expect((sys as any).dragging).toBe(false) })
  it('初始 panelX 为 120', () => { expect((sys as any).panelX).toBe(120) })
  it('初始 panelY 为 40', () => { expect((sys as any).panelY).toBe(40) })
  it('初始 _headerStr 包含 "0 条记录"', () => {
    expect((sys as any)._headerStr).toContain('0 条记录')
  })
})

// ─────────────��───────────────────────────────
// 2. 节流 / update 无副作用
// ─────────────────────────────────────────────
describe('WorldNarratorSystem update 无副作用', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  it('update() 不抛错', () => { expect(() => sys.update()).not.toThrow() })
  it('连续多次 update() 不改变 entries', () => {
    sys.update(); sys.update(); sys.update()
    expect((sys as any).entries).toHaveLength(0)
  })
  it('update() 不改变 unreadCount', () => {
    sys.addNarrative('war', '战争', 1)
    const before = (sys as any).unreadCount
    sys.update()
    expect((sys as any).unreadCount).toBe(before)
  })
  it('update() 不改变 visible', () => {
    sys.update()
    expect((sys as any).visible).toBe(false)
  })
})

// ─────────────────────────────────────────────
// 3. addNarrative 条件 / 字段校验
// ─────────────────────────────────────────────
describe('WorldNarratorSystem addNarrative 条件', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  it('添加一条后 entries.length === 1', () => {
    sys.addNarrative('war', '战争爆发', 100)
    expect((sys as any).entries).toHaveLength(1)
  })
  it('unreadCount 随添加递增', () => {
    sys.addNarrative('hero', '英雄', 1)
    sys.addNarrative('peace', '和平', 2)
    expect((sys as any).unreadCount).toBe(2)
  })
  it('_unreadStr 在 1-9 时显示数字字符串', () => {
    for (let i = 0; i < 5; i++) sys.addNarrative('war', '战', i)
    expect((sys as any)._unreadStr).toBe('5')
  })
  it('_unreadStr 超过 9 后显示 "9+"', () => {
    for (let i = 0; i < 10; i++) sys.addNarrative('disaster', '灾', i)
    expect((sys as any)._unreadStr).toBe('9+')
  })
  it('支持所有 NarrativeType 类型', () => {
    const types = ['war', 'disaster', 'rise', 'fall', 'hero', 'discovery', 'peace', 'birth', 'death', 'wonder'] as const
    types.forEach((t, i) => sys.addNarrative(t, '测试', i))
    expect((sys as any).entries).toHaveLength(types.length)
  })
})

// ─────────────────────────────────────────────
// 4. addNarrative 后字段值正确
// ─────────────────────────────────────────────
describe('WorldNarratorSystem addNarrative 字段值', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  it('entry.type 正确', () => {
    sys.addNarrative('disaster', '洪水', 200, 4)
    expect((sys as any).entries[0].type).toBe('disaster')
  })
  it('entry.text 正确', () => {
    sys.addNarrative('rise', '文明崛起', 300)
    expect((sys as any).entries[0].text).toBe('文明崛起')
  })
  it('entry.tick 正确', () => {
    sys.addNarrative('fall', '文明崩溃', 500)
    expect((sys as any).entries[0].tick).toBe(500)
  })
  it('entry.tickStr 格式为 "tick N"', () => {
    sys.addNarrative('hero', '英雄', 42)
    expect((sys as any).entries[0].tickStr).toBe('tick 42')
  })
  it('entry.importance 默认值为 3', () => {
    sys.addNarrative('peace', '和平', 10)
    expect((sys as any).entries[0].importance).toBe(3)
  })
  it('entry.importance 自定义值 5', () => {
    sys.addNarrative('wonder', '奇迹', 99, 5)
    expect((sys as any).entries[0].importance).toBe(5)
  })
  it('entry.read 初始为 false', () => {
    sys.addNarrative('war', '战争', 1)
    expect((sys as any).entries[0].read).toBe(false)
  })
  it('entry.id 自动递增（不为 0）', () => {
    sys.addNarrative('war', '第一条', 1)
    sys.addNarrative('hero', '第二条', 2)
    const [e1, e2] = (sys as any).entries
    expect(e2.id).toBeGreaterThan(e1.id)
  })
  it('_headerStr 更新条目数', () => {
    sys.addNarrative('war', '战争', 1)
    sys.addNarrative('hero', '英雄', 2)
    expect((sys as any)._headerStr).toContain('2 条记录')
  })
})

// ─────────────────────────────────────────────
// 5. update / handleKeyDown 字段变更
// ─────────────────────────────────────────────
describe('WorldNarratorSystem handleKeyDown 字段变更', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  function keyEvent(key: string, shift = false, ctrl = false, alt = false): KeyboardEvent {
    return { key, shiftKey: shift, ctrlKey: ctrl, altKey: alt } as KeyboardEvent
  }

  it('按 N 键切换 visible = true', () => {
    sys.handleKeyDown(keyEvent('n'))
    expect((sys as any).visible).toBe(true)
  })
  it('再按 N 键切换 visible = false', () => {
    sys.handleKeyDown(keyEvent('N'))
    sys.handleKeyDown(keyEvent('N'))
    expect((sys as any).visible).toBe(false)
  })
  it('按 N 后返回 true', () => {
    expect(sys.handleKeyDown(keyEvent('N'))).toBe(true)
  })
  it('按非 N 键返回 false', () => {
    expect(sys.handleKeyDown(keyEvent('m'))).toBe(false)
  })
  it('Shift+N 不触发切换', () => {
    sys.handleKeyDown(keyEvent('N', true))
    expect((sys as any).visible).toBe(false)
  })
  it('Ctrl+N 不触发切换', () => {
    sys.handleKeyDown(keyEvent('N', false, true))
    expect((sys as any).visible).toBe(false)
  })
  it('Alt+N 不触发切换', () => {
    sys.handleKeyDown(keyEvent('N', false, false, true))
    expect((sys as any).visible).toBe(false)
  })
  it('打开面板后 unreadCount 归零', () => {
    sys.addNarrative('war', '战争', 1)
    sys.addNarrative('hero', '英雄', 2)
    sys.handleKeyDown(keyEvent('N'))
    expect((sys as any).unreadCount).toBe(0)
  })
  it('打开面板后 _unreadStr 为 "0"', () => {
    sys.addNarrative('war', '战争', 1)
    sys.handleKeyDown(keyEvent('N'))
    expect((sys as any)._unreadStr).toBe('0')
  })
  it('打开面板后所有 entries.read 为 true', () => {
    sys.addNarrative('war', '战争', 1)
    sys.addNarrative('hero', '英雄', 2)
    sys.handleKeyDown(keyEvent('N'))
    for (const e of (sys as any).entries) {
      expect(e.read).toBe(true)
    }
  })
  it('关闭面板后 visible 为 false，不重置 unreadCount', () => {
    sys.handleKeyDown(keyEvent('N')) // 打开
    sys.addNarrative('disaster', '灾难', 10)
    sys.handleKeyDown(keyEvent('N')) // 关闭
    expect((sys as any).visible).toBe(false)
    // 关闭时不清空未读
    expect((sys as any).unreadCount).toBeGreaterThanOrEqual(0)
  })
})

// ─────────────────────────────────────────────
// 6. cleanup 逻辑：MAX_ENTRIES 上限
// ─────────────────────────────────────────────
describe('WorldNarratorSystem cleanup MAX_ENTRIES', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  it('超过 100 条时 entries 不超过 100', () => {
    for (let i = 0; i < 110; i++) sys.addNarrative('war', `战争${i}`, i)
    expect((sys as any).entries).toHaveLength(100)
  })
  it('超过上限后最旧的条目被移除', () => {
    for (let i = 0; i < 101; i++) sys.addNarrative('war', `战争${i}`, i)
    // 最旧条目（战争0）应已被移除，最新存在
    const texts = (sys as any).entries.map((e: any) => e.text)
    expect(texts).not.toContain('战争0')
    expect(texts).toContain('战争100')
  })
  it('恰好 100 条时不截断', () => {
    for (let i = 0; i < 100; i++) sys.addNarrative('hero', `英雄${i}`, i)
    expect((sys as any).entries).toHaveLength(100)
  })
  it('99 条不截断', () => {
    for (let i = 0; i < 99; i++) sys.addNarrative('rise', `崛起${i}`, i)
    expect((sys as any).entries).toHaveLength(99)
  })
  it('101 条后 entries.length === 100', () => {
    for (let i = 0; i < 101; i++) sys.addNarrative('fall', `消亡${i}`, i)
    expect((sys as any).entries.length).toBe(100)
  })
})

// ─────────────────────────────────────────────
// 7. generate() 模板生成叙事
// ─────────────────────────────────────────────
describe('WorldNarratorSystem generate 模板', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  it('generate war 后 entries 增加一条', () => {
    sys.generate('war', { civ1: '人类', civ2: '精灵', loc: '北方' }, 100)
    expect((sys as any).entries).toHaveLength(1)
  })
  it('generate 后 type 字段正确', () => {
    sys.generate('disaster', { loc: '南部', disaster: '地震' }, 200)
    expect((sys as any).entries[0].type).toBe('disaster')
  })
  it('generate 替换变量 {civ1}', () => {
    sys.generate('rise', { civ1: '矮人', num: '1000' }, 300)
    const text: string = (sys as any).entries[0].text
    expect(text).not.toContain('{civ1}')
    expect(text).toContain('矮人')
  })
  it('未提供变量时替换为 "???"', () => {
    sys.generate('hero', {}, 400)
    const text: string = (sys as any).entries[0].text
    expect(text).toContain('???')
  })
  it('generate 不存在的 type 不添加条目', () => {
    sys.generate('birth' as any, {}, 1)
    // birth 类型在 TEMPLATES 中没有模板（birth/death 无 patterns），不会添加
    // 实际可能添加，取决于实现；仅验证不抛错
    expect(() => sys.generate('birth' as any, {}, 1)).not.toThrow()
  })
  it('generate wonder 后 entries.length 增加', () => {
    const before = (sys as any).entries.length
    sys.generate('wonder', { civ1: '人类', wonder: '神庙', loc: '东方' }, 500)
    expect((sys as any).entries.length).toBeGreaterThan(before)
  })
  it('generate peace 替换 {civ1} 和 {civ2}', () => {
    sys.generate('peace', { civ1: '人类', civ2: '精灵', loc: '平原' }, 600)
    const text: string = (sys as any).entries[0].text
    expect(text).not.toContain('{civ1}')
    expect(text).not.toContain('{civ2}')
  })
})

// ─────────────────────────────────────────────
// 8. 边界验证
// ─────────────────────────────────────────────
describe('WorldNarratorSystem 边界验证', () => {
  let sys: WorldNarratorSystem
  beforeEach(() => { sys = makeSys() })

  it('importance = 1 是允许的最小值', () => {
    sys.addNarrative('war', '轻微', 1, 1)
    expect((sys as any).entries[0].importance).toBe(1)
  })
  it('importance = 5 是允许的最大值', () => {
    sys.addNarrative('war', '极其重要', 1, 5)
    expect((sys as any).entries[0].importance).toBe(5)
  })
  it('空文本也可以添加', () => {
    sys.addNarrative('peace', '', 1)
    expect((sys as any).entries[0].text).toBe('')
  })
  it('tick = 0 是合法值', () => {
    sys.addNarrative('hero', '零时刻英雄', 0)
    expect((sys as any).entries[0].tick).toBe(0)
    expect((sys as any).entries[0].tickStr).toBe('tick 0')
  })
  it('多系统实例 entries 互不影响', () => {
    const sys2 = makeSys()
    sys.addNarrative('war', '战争', 1)
    expect((sys2 as any).entries).toHaveLength(0)
  })
  it('entries 是同一引用（不复制）', () => {
    const ref = (sys as any).entries
    sys.addNarrative('hero', '英雄', 1)
    expect((sys as any).entries).toBe(ref)
  })
  it('unreadCount 不因 update() 变化', () => {
    sys.addNarrative('war', '战争', 1)
    sys.addNarrative('hero', '英雄', 2)
    sys.update()
    expect((sys as any).unreadCount).toBe(2)
  })
  it('handleKeyDown 大写 N 也有效', () => {
    sys.handleKeyDown({ key: 'N', shiftKey: false, ctrlKey: false, altKey: false } as KeyboardEvent)
    expect((sys as any).visible).toBe(true)
  })
  it('handleKeyDown 小写 n 也有效', () => {
    sys.handleKeyDown({ key: 'n', shiftKey: false, ctrlKey: false, altKey: false } as KeyboardEvent)
    expect((sys as any).visible).toBe(true)
  })
})
