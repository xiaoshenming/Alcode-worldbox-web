import { describe, it, expect, beforeEach } from 'vitest'
import { WorldLawSystem } from '../systems/WorldLawSystem'

function makeSys(): WorldLawSystem { return new WorldLawSystem() }

// ====================================================================
// 1. 初始状态
// ====================================================================
describe('WorldLawSystem — 初始状态', () => {
  let sys: WorldLawSystem
  beforeEach(() => { sys = makeSys() })

  it('visible 初始为 false', () => {
    expect((sys as any).visible).toBe(false)
  })

  it('activeTab 初始为 0', () => {
    expect((sys as any).activeTab).toBe(0)
  })

  it('categories 初始有 4 个分类', () => {
    expect((sys as any).categories).toHaveLength(4)
  })

  it('_lawIndex 是 Map 实例', () => {
    expect((sys as any)._lawIndex).toBeInstanceOf(Map)
  })

  it('_lawIndex 有 4 个分类键', () => {
    expect((sys as any)._lawIndex.size).toBe(4)
  })

  it('categories[0] 是 physics 分类', () => {
    expect((sys as any).categories[0].key).toBe('physics')
  })
})

// ====================================================================
// 2. getLaw — 默认值和缺失键
// ====================================================================
describe('WorldLawSystem — getLaw 默认值', () => {
  let sys: WorldLawSystem
  beforeEach(() => { sys = makeSys() })

  it('未知分类返回 1.0', () => {
    expect(sys.getLaw('unknown', 'gravity')).toBe(1.0)
  })

  it('已知分类但未知参数返回 1.0', () => {
    expect(sys.getLaw('physics', 'unknown')).toBe(1.0)
  })

  it('physics.gravity 默认值为 1.0', () => {
    expect(sys.getLaw('physics', 'gravity')).toBe(1.0)
  })

  it('physics.moveSpeed 默认值为 1.0', () => {
    expect(sys.getLaw('physics', 'moveSpeed')).toBe(1.0)
  })

  it('creature.reproduction 默认值为 1.0', () => {
    expect(sys.getLaw('creature', 'reproduction')).toBe(1.0)
  })

  it('creature.lifespan 默认值为 1.0', () => {
    expect(sys.getLaw('creature', 'lifespan')).toBe(1.0)
  })

  it('creature.hungerRate 默认值为 1.0', () => {
    expect(sys.getLaw('creature', 'hungerRate')).toBe(1.0)
  })

  it('combat.damage 默认值为 1.0', () => {
    expect(sys.getLaw('combat', 'damage')).toBe(1.0)
  })

  it('combat.defense 默认值为 1.0', () => {
    expect(sys.getLaw('combat', 'defense')).toBe(1.0)
  })

  it('economy.resourceOutput 默认值为 1.0', () => {
    expect(sys.getLaw('economy', 'resourceOutput')).toBe(1.0)
  })

  it('economy.tradeEfficiency 默认值为 1.0', () => {
    expect(sys.getLaw('economy', 'tradeEfficiency')).toBe(1.0)
  })

  it('空字符串分类返回 1.0', () => {
    expect(sys.getLaw('', 'gravity')).toBe(1.0)
  })

  it('空字符串参数名返回 1.0', () => {
    expect(sys.getLaw('physics', '')).toBe(1.0)
  })
})

// ====================================================================
// 3. getLaw — 内部直接修改后再读取
// ====================================================================
describe('WorldLawSystem — getLaw 修改后读取', () => {
  let sys: WorldLawSystem
  beforeEach(() => { sys = makeSys() })

  it('直接修改内部 param.value 后 getLaw 返回新值', () => {
    const paramMap = (sys as any)._lawIndex.get('physics')
    paramMap.get('gravity').value = 2.5
    expect(sys.getLaw('physics', 'gravity')).toBe(2.5)
  })

  it('修改 creature.lifespan 不影响 creature.reproduction', () => {
    const paramMap = (sys as any)._lawIndex.get('creature')
    paramMap.get('lifespan').value = 3.0
    expect(sys.getLaw('creature', 'reproduction')).toBe(1.0)
  })

  it('修改 physics 分类不影响 combat 分类', () => {
    const physMap = (sys as any)._lawIndex.get('physics')
    physMap.get('gravity').value = 5.0
    expect(sys.getLaw('combat', 'damage')).toBe(1.0)
  })
})

// ====================================================================
// 4. handleKey — 键盘事件处理
// ====================================================================
describe('WorldLawSystem — handleKey', () => {
  let sys: WorldLawSystem
  beforeEach(() => { sys = makeSys() })

  it("按 'w' 键切换 visible 为 true", () => {
    sys.handleKey('w')
    expect((sys as any).visible).toBe(true)
  })

  it("按 'W' 键切换 visible 为 true", () => {
    sys.handleKey('W')
    expect((sys as any).visible).toBe(true)
  })

  it("连续按 'w' 两次，visible 回到 false", () => {
    sys.handleKey('w')
    sys.handleKey('w')
    expect((sys as any).visible).toBe(false)
  })

  it("按 'w' 键返回 true（事件已消费）", () => {
    expect(sys.handleKey('w')).toBe(true)
  })

  it("按 'W' 键返回 true", () => {
    expect(sys.handleKey('W')).toBe(true)
  })

  it("visible=false 时按 Escape，返回 false（未消费）", () => {
    expect(sys.handleKey('Escape')).toBe(false)
  })

  it("visible=true 时按 Escape，关闭面板", () => {
    sys.handleKey('w')
    sys.handleKey('Escape')
    expect((sys as any).visible).toBe(false)
  })

  it("visible=true 时按 Escape，返回 true（已消费）", () => {
    sys.handleKey('w')
    expect(sys.handleKey('Escape')).toBe(true)
  })

  it("其他按键不影响 visible，返回 false", () => {
    sys.handleKey('a')
    expect((sys as any).visible).toBe(false)
    expect(sys.handleKey('Enter')).toBe(false)
  })

  it("大写字母 'A' 不消费事件", () => {
    expect(sys.handleKey('A')).toBe(false)
  })
})

// ====================================================================
// 5. render — 不可见时不渲染
// ====================================================================
describe('WorldLawSystem — render 可见性控制', () => {
  let sys: WorldLawSystem
  beforeEach(() => { sys = makeSys() })

  function makeMockCtx() {
    return {
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      arc: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
    } as any
  }

  it('visible=false 时 render 不调用 ctx.save', () => {
    const ctx = makeMockCtx()
    let saveCalled = false
    ctx.save = () => { saveCalled = true }
    sys.render(ctx, 800, 600)
    expect(saveCalled).toBe(false)
  })

  it('visible=true 时 render 调用 ctx.save', () => {
    sys.handleKey('w')
    const ctx = makeMockCtx()
    let saveCalled = false
    ctx.save = () => { saveCalled = true }
    sys.render(ctx, 800, 600)
    expect(saveCalled).toBe(true)
  })

  it('render 不抛出异常（visible=false）', () => {
    const ctx = makeMockCtx()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })

  it('render 不抛出异常（visible=true）', () => {
    sys.handleKey('w')
    const ctx = makeMockCtx()
    expect(() => sys.render(ctx, 800, 600)).not.toThrow()
  })
})

// ====================================================================
// 6. categories 结构验证
// ====================================================================
describe('WorldLawSystem — categories 结构', () => {
  let sys: WorldLawSystem
  beforeEach(() => { sys = makeSys() })

  it('physics 分类有 2 个参数', () => {
    const cat = (sys as any).categories.find((c: any) => c.key === 'physics')
    expect(cat.params).toHaveLength(2)
  })

  it('creature 分类有 3 个参数', () => {
    const cat = (sys as any).categories.find((c: any) => c.key === 'creature')
    expect(cat.params).toHaveLength(3)
  })

  it('combat 分类有 2 个参数', () => {
    const cat = (sys as any).categories.find((c: any) => c.key === 'combat')
    expect(cat.params).toHaveLength(2)
  })

  it('economy 分类有 2 个参数', () => {
    const cat = (sys as any).categories.find((c: any) => c.key === 'economy')
    expect(cat.params).toHaveLength(2)
  })

  it('每个 LawParam 的 defaultValue 都为 1.0', () => {
    const cats: any[] = (sys as any).categories
    for (const cat of cats) {
      for (const p of cat.params) {
        expect(p.defaultValue).toBe(1.0)
      }
    }
  })

  it('每个 LawParam 的 min=0.1, max=5.0', () => {
    const cats: any[] = (sys as any).categories
    for (const cat of cats) {
      for (const p of cat.params) {
        expect(p.min).toBe(0.1)
        expect(p.max).toBe(5.0)
      }
    }
  })

  it('每个 LawParam 的 valueStr 初始为 "1.00"', () => {
    const cats: any[] = (sys as any).categories
    for (const cat of cats) {
      for (const p of cat.params) {
        expect(p.valueStr).toBe('1.00')
      }
    }
  })
})
