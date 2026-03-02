// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EnhancedTooltipSystem } from '../systems/EnhancedTooltipSystem'

// ─── Mock 工厂 ────────────────────────────────────────────────────────────────

type MockCamera = {
  screenToWorld: (x: number, y: number) => { x: number; y: number }
}

type MockWorld = {
  getTile: (x: number, y: number) => number | null
  width: number
  height: number
}

type MockEM = {
  getEntitiesWithComponents: (...comps: string[]) => number[]
  getComponent: (id: number, comp: string) => unknown
}

type MockCivManager = {
  civilizations: Map<number, { name: string; color: string }>
}

function makeCamera(override?: Partial<MockCamera>): MockCamera {
  return {
    screenToWorld: (x: number, y: number) => ({ x, y }),
    ...override,
  }
}

function makeWorld(tileValue: number | null = 3, override?: Partial<MockWorld>): MockWorld {
  return {
    getTile: () => tileValue,
    width: 20,
    height: 20,
    ...override,
  }
}

function makeEM(override?: Partial<MockEM>): MockEM {
  return {
    getEntitiesWithComponents: () => [],
    getComponent: () => undefined,
    ...override,
  }
}

function makeCivManager(civs?: Array<{ id: number; name: string; color: string }>): MockCivManager {
  const map = new Map<number, { name: string; color: string }>()
  if (civs) {
    for (const c of civs) map.set(c.id, { name: c.name, color: c.color })
  }
  return { civilizations: map }
}

function makeSys(): EnhancedTooltipSystem {
  return new EnhancedTooltipSystem()
}

// ─── 1. 模块导入与构造 ────────────────────────────────────────────────────────

describe('1. 模块导入与构造', () => {
  afterEach(() => vi.restoreAllMocks())

  it('1-1 模块可以导入，导出 EnhancedTooltipSystem 类', async () => {
    const mod = await import('../systems/EnhancedTooltipSystem')
    expect(mod.EnhancedTooltipSystem).toBeDefined()
  })

  it('1-2 可以正常实例化（jsdom 环境下）', () => {
    expect(() => makeSys()).not.toThrow()
  })

  it('1-3 构造后 DOM 中存在 id=enhancedTooltip 的元素', () => {
    makeSys()
    expect(document.getElementById('enhancedTooltip')).not.toBeNull()
  })

  it('1-4 构造后 tooltip 元素是 DIV', () => {
    makeSys()
    const el = document.getElementById('enhancedTooltip')
    expect(el?.tagName).toBe('DIV')
  })

  it('1-5 构造后 tooltip 初始 display 为 none', () => {
    makeSys()
    const el = document.getElementById('enhancedTooltip') as HTMLDivElement
    expect(el.style.display).toBe('none')
  })

  it('1-6 构造后 tooltip 被挂载到 document.body', () => {
    makeSys()
    const el = document.getElementById('enhancedTooltip')
    expect(document.body.contains(el)).toBe(true)
  })

  it('1-7 连续实例化两次，body 中有两个 tooltip 元素', () => {
    makeSys()
    makeSys()
    const els = document.querySelectorAll('#enhancedTooltip')
    expect(els.length).toBeGreaterThanOrEqual(2)
  })

  it('1-8 tooltip 元素 position style 为 fixed', () => {
    makeSys()
    const el = document.getElementById('enhancedTooltip') as HTMLDivElement
    expect(el.style.position).toBe('fixed')
  })
})

// ─── 2. 初始状态验证 ──────────────────────────────────────────────────────────

describe('2. 初始状态验证', () => {
  let sys: EnhancedTooltipSystem

  beforeEach(() => {
    sys = makeSys()
  })

  afterEach(() => vi.restoreAllMocks())

  it('2-1 visible 初始为 false', () => {
    expect((sys as any).visible).toBe(false)
  })

  it('2-2 lastX 初始为 -1', () => {
    expect((sys as any).lastX).toBe(-1)
  })

  it('2-3 lastY 初始为 -1', () => {
    expect((sys as any).lastY).toBe(-1)
  })

  it('2-4 el 字段存在且是 HTMLDivElement', () => {
    expect((sys as any).el).toBeInstanceOf(HTMLDivElement)
  })

  it('2-5 el.id 为 enhancedTooltip', () => {
    expect((sys as any).el.id).toBe('enhancedTooltip')
  })

  it('2-6 tooltip 样式含有 zIndex 200', () => {
    expect((sys as any).el.style.zIndex).toBe('200')
  })

  it('2-7 tooltip 样式含有 pointerEvents none', () => {
    expect((sys as any).el.style.pointerEvents).toBe('none')
  })

  it('2-8 tooltip maxWidth 为 220px', () => {
    expect((sys as any).el.style.maxWidth).toBe('220px')
  })
})

// ─── 3. hide() 方法行为 ───────────────────────────────────────────────────────

describe('3. hide() 方法行为', () => {
  let sys: EnhancedTooltipSystem

  beforeEach(() => {
    sys = makeSys()
  })

  afterEach(() => vi.restoreAllMocks())

  it('3-1 hide() 后 visible 为 false', () => {
    sys.hide()
    expect((sys as any).visible).toBe(false)
  })

  it('3-2 hide() 后 lastX 重置为 -1', () => {
    ;(sys as any).lastX = 5
    sys.hide()
    expect((sys as any).lastX).toBe(-1)
  })

  it('3-3 hide() 后 lastY 重置为 -1', () => {
    ;(sys as any).lastY = 5
    sys.hide()
    expect((sys as any).lastY).toBe(-1)
  })

  it('3-4 hide() 后 el.style.display 为 none', () => {
    ;(sys as any).el.style.display = 'block'
    sys.hide()
    expect((sys as any).el.style.display).toBe('none')
  })

  it('3-5 连续调用 hide() 两次不报错', () => {
    expect(() => {
      sys.hide()
      sys.hide()
    }).not.toThrow()
  })

  it('3-6 hide() 后 visible 依然为 false（幂等性）', () => {
    ;(sys as any).visible = true
    sys.hide()
    sys.hide()
    expect((sys as any).visible).toBe(false)
  })

  it('3-7 hide() 后再 hide()，lastX 仍为 -1', () => {
    sys.hide()
    sys.hide()
    expect((sys as any).lastX).toBe(-1)
  })
})

// ─── 4. update() tile===null 时调用 hide ─────────────────────────────────────

describe('4. update() tile 为 null 时行为', () => {
  let sys: EnhancedTooltipSystem

  beforeEach(() => {
    sys = makeSys()
  })

  afterEach(() => vi.restoreAllMocks())

  it('4-1 getTile 返回 null 时调用 hide，visible=false', () => {
    const world = makeWorld(null)
    ;(sys as any).visible = true
    sys.update(50, 50, makeCamera() as any, world as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).visible).toBe(false)
  })

  it('4-2 getTile 返回 null 时 display 为 none', () => {
    const world = makeWorld(null)
    ;(sys as any).el.style.display = 'block'
    sys.update(50, 50, makeCamera() as any, world as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.style.display).toBe('none')
  })

  it('4-3 getTile 返回 null 时 lastX 重置为 -1', () => {
    const world = makeWorld(null)
    sys.update(50, 50, makeCamera() as any, world as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).lastX).toBe(-1)
  })

  it('4-4 getTile 返回 null 时 lastY 重置为 -1', () => {
    const world = makeWorld(null)
    sys.update(50, 50, makeCamera() as any, world as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).lastY).toBe(-1)
  })

  it('4-5 getTile 返回有效值 0 时不调用 hide，visible=true', () => {
    const world = makeWorld(0)
    sys.update(50, 50, makeCamera() as any, world as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).visible).toBe(true)
  })

  it('4-6 getTile 返回有效值时 el.style.display 为 block', () => {
    const world = makeWorld(3)
    sys.update(50, 50, makeCamera() as any, world as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.style.display).toBe('block')
  })

  it('4-7 getTile 被调用且参数为 floor(worldX), floor(worldY)', () => {
    const getTileSpy = vi.fn().mockReturnValue(3)
    const world = { ...makeWorld(3), getTile: getTileSpy }
    // camera maps (10.7, 20.9) -> floor -> (10, 20)
    const camera = makeCamera({ screenToWorld: () => ({ x: 10.7, y: 20.9 }) })
    sys.update(100, 200, camera as any, world as any, makeEM() as any, makeCivManager() as any)
    expect(getTileSpy).toHaveBeenCalledWith(10, 20)
  })
})

// ─── 5. update() 位置相同时短路 ──────────────────────────────────────────────

describe('5. update() 位置相同时不重建内容', () => {
  let sys: EnhancedTooltipSystem

  beforeEach(() => {
    sys = makeSys()
  })

  afterEach(() => vi.restoreAllMocks())

  it('5-1 同一位置第二次 update 时 getTile 只被调用一次', () => {
    const getTileSpy = vi.fn().mockReturnValue(3)
    const world = { ...makeWorld(3), getTile: getTileSpy }
    const em = makeEM()
    const cm = makeCivManager()
    sys.update(50, 50, makeCamera() as any, world as any, em as any, cm as any)
    sys.update(50, 50, makeCamera() as any, world as any, em as any, cm as any)
    expect(getTileSpy).toHaveBeenCalledTimes(1)
  })

  it('5-2 同一位置第二次 update 时 getEntitiesWithComponents 只被调用一次', () => {
    const spy = vi.fn().mockReturnValue([])
    const em = { ...makeEM(), getEntitiesWithComponents: spy }
    const world = makeWorld(3)
    sys.update(50, 50, makeCamera() as any, world as any, em as any, makeCivManager() as any)
    sys.update(50, 50, makeCamera() as any, world as any, em as any, makeCivManager() as any)
    expect(spy).toHaveBeenCalledTimes(2) // 每次 update 调用两次(creature/building)，但第二次update被短路所以是2
  })

  it('5-3 位置变化时 getTile 被再次调用', () => {
    const getTileSpy = vi.fn().mockReturnValue(3)
    const world = { ...makeWorld(3), getTile: getTileSpy }
    const em = makeEM()
    const cm = makeCivManager()
    const cam1 = makeCamera({ screenToWorld: () => ({ x: 5, y: 5 }) })
    const cam2 = makeCamera({ screenToWorld: () => ({ x: 6, y: 6 }) })
    sys.update(50, 50, cam1 as any, world as any, em as any, cm as any)
    sys.update(60, 60, cam2 as any, world as any, em as any, cm as any)
    expect(getTileSpy).toHaveBeenCalledTimes(2)
  })

  it('5-4 第一次 update 后 lastX 被设置', () => {
    const camera = makeCamera({ screenToWorld: () => ({ x: 7.3, y: 4.1 }) })
    sys.update(50, 50, camera as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).lastX).toBe(7)
  })

  it('5-5 第一次 update 后 lastY 被设置', () => {
    const camera = makeCamera({ screenToWorld: () => ({ x: 7.3, y: 4.9 }) })
    sys.update(50, 50, camera as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).lastY).toBe(4)
  })

  it('5-6 第二次 update 相同位置时 visible 仍为 true', () => {
    const em = makeEM()
    const cm = makeCivManager()
    sys.update(50, 50, makeCamera() as any, makeWorld(3) as any, em as any, cm as any)
    sys.update(50, 50, makeCamera() as any, makeWorld(3) as any, em as any, cm as any)
    expect((sys as any).visible).toBe(true)
  })

  it('5-7 visible=false 时相同位置不短路（需要重建）', () => {
    const getTileSpy = vi.fn().mockReturnValue(3)
    const world = { ...makeWorld(3), getTile: getTileSpy }
    const em = makeEM()
    const cm = makeCivManager()
    // 先 update 再 hide 再 update 相同坐标
    sys.update(50, 50, makeCamera() as any, world as any, em as any, cm as any)
    sys.hide()
    sys.update(50, 50, makeCamera() as any, world as any, em as any, cm as any)
    // hide 会重置 lastX/lastY，所以坐标不再相同，会再次调用 getTile
    expect(getTileSpy).toHaveBeenCalledTimes(2)
  })
})

// ─── 6. TILE_NAMES 常量验证 ───────────────────────────────────────────────────

describe('6. TILE_NAMES 常量验证', () => {
  afterEach(() => vi.restoreAllMocks())

  const TILE_NAMES = ['Deep Water', 'Shallow Water', 'Sand', 'Grass', 'Forest', 'Mountain', 'Snow', 'Lava']

  it('6-1 tile 0 显示 Deep Water', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(0) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Deep Water')
  })

  it('6-2 tile 1 显示 Shallow Water', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(1) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Shallow Water')
  })

  it('6-3 tile 2 显示 Sand', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(2) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Sand')
  })

  it('6-4 tile 3 显示 Grass', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Grass')
  })

  it('6-5 tile 4 显示 Forest', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(4) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Forest')
  })

  it('6-6 tile 5 显示 Mountain', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(5) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Mountain')
  })

  it('6-7 tile 6 显示 Snow', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(6) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Snow')
  })

  it('6-8 tile 7 显示 Lava', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(7) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Lava')
  })

  it('6-9 TILE_NAMES 共 8 种（0-7）', () => {
    expect(TILE_NAMES).toHaveLength(8)
  })

  it('6-10 tile 坐标信息包含在内容中', () => {
    const sys = makeSys()
    const camera = makeCamera({ screenToWorld: () => ({ x: 3, y: 7 }) })
    sys.update(50, 50, camera as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('3, 7')
  })
})

// ─── 7. update() 生物信息渲染 ─────────────────────────────────────────────────

describe('7. update() 生物信息渲染', () => {
  afterEach(() => vi.restoreAllMocks())

  function makeCreatureEM(
    creatureData: Record<string, unknown> = {},
    needsData?: Record<string, unknown> | null,
    heroData?: Record<string, unknown> | null,
    civMemberData?: { civId: number } | null
  ): MockEM {
    const creature = {
      name: 'Aldric',
      species: 'Human',
      age: 25,
      damage: 10,
      speed: 1.5,
      ...creatureData,
    }
    return {
      getEntitiesWithComponents: (comp1: string) => {
        if (comp1 === 'position') return [1]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (id !== 1) return undefined
        if (comp === 'creature') return creature
        if (comp === 'needs') return needsData !== undefined ? needsData : { health: 80, hunger: 20 }
        if (comp === 'hero') return heroData !== undefined ? heroData : null
        if (comp === 'civMember') return civMemberData !== undefined ? civMemberData : null
        if (comp === 'position') return { x: 50.5, y: 50.5 }
        return undefined
      },
    }
  }

  it('7-1 有生物时显示其名称', () => {
    const sys = makeSys()
    const em = makeCreatureEM({ name: 'Aldric' })
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Aldric')
  })

  it('7-2 有生物时显示物种和年龄', () => {
    const sys = makeSys()
    const em = makeCreatureEM({ species: 'Elf', age: 120 })
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Elf')
    expect((sys as any).el.textContent).toContain('120')
  })

  it('7-3 有生物且有 needs 时显示 HP 和 Hunger', () => {
    const sys = makeSys()
    const em = makeCreatureEM({}, { health: 75, hunger: 30 })
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('HP')
    expect((sys as any).el.textContent).toContain('75')
  })

  it('7-4 有英雄组件时显示等级', () => {
    const sys = makeSys()
    const em = makeCreatureEM({}, null, { title: 'Champion', level: 5 })
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Champion')
    expect((sys as any).el.textContent).toContain('5')
  })

  it('7-5 有文明成员时显示文明名称', () => {
    const sys = makeSys()
    const em = makeCreatureEM({}, null, null, { civId: 42 })
    const cm = makeCivManager([{ id: 42, name: 'Elven Empire', color: '#0f0' }])
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, cm as any)
    expect((sys as any).el.textContent).toContain('Elven Empire')
  })

  it('7-6 有生物时显示 ATK 和 SPD', () => {
    const sys = makeSys()
    const em = makeCreatureEM({ damage: 15, speed: 2.0 })
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('ATK')
    expect((sys as any).el.textContent).toContain('15')
  })

  it('7-7 无生物时不显示 HP', () => {
    const sys = makeSys()
    const em = makeEM() // 无生物
    sys.update(50, 50, makeCamera() as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).not.toContain('HP')
  })

  it('7-8 生物无 creature 组件时调用 hide', () => {
    const sys = makeSys()
    const em: MockEM = {
      getEntitiesWithComponents: (comp1: string) => {
        if (comp1 === 'position') return [1]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (comp === 'position') return { x: 50.5, y: 50.5 }
        if (comp === 'creature') return undefined // 没有 creature 组件
        return undefined
      },
    }
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    // 生物找到但 creature 组件为 null -> hide()
    expect((sys as any).visible).toBe(false)
  })
})

// ─── 8. update() 建筑信息渲染 ─────────────────────────────────────────────────

describe('8. update() 建筑信息渲染', () => {
  afterEach(() => vi.restoreAllMocks())

  function makeBuildingEM(
    buildingData: { buildingType?: string; civId?: number } = {},
    posData: { x: number; y: number } = { x: 50, y: 50 }
  ): MockEM {
    return {
      getEntitiesWithComponents: (comp1: string, comp2?: string) => {
        if (comp2 === 'building') return [2]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (id !== 2) return undefined
        if (comp === 'position') return posData
        if (comp === 'building') return buildingData
        return undefined
      },
    }
  }

  it('8-1 有建筑时显示建筑类型', () => {
    const sys = makeSys()
    const em = makeBuildingEM({ buildingType: 'Barracks' })
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Barracks')
  })

  it('8-2 建筑无 buildingType 时显示默认 Building', () => {
    const sys = makeSys()
    const em = makeBuildingEM({})
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Building')
  })

  it('8-3 建筑有 civId 时显示文明名称', () => {
    const sys = makeSys()
    const em = makeBuildingEM({ buildingType: 'Farm', civId: 7 })
    const cm = makeCivManager([{ id: 7, name: 'Dwarven Clan', color: '#a52' }])
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, cm as any)
    expect((sys as any).el.textContent).toContain('Dwarven Clan')
  })

  it('8-4 建筑不在当前 tile 时不渲染建筑信息', () => {
    const sys = makeSys()
    // 建筑在 (10, 10)，但当前 tile 在 (50, 50)
    const em = makeBuildingEM({ buildingType: 'Tower' }, { x: 10, y: 10 })
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).not.toContain('Tower')
  })
})

// ─── 9. position() 与定位逻辑 ─────────────────────────────────────────────────

describe('9. position() 与定位逻辑', () => {
  afterEach(() => vi.restoreAllMocks())

  it('9-1 update 成功后 el.style.left 被设置', () => {
    const sys = makeSys()
    sys.update(100, 200, makeCamera() as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.style.left).not.toBe('')
  })

  it('9-2 update 成功后 el.style.top 被设置', () => {
    const sys = makeSys()
    sys.update(100, 200, makeCamera() as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.style.top).not.toBe('')
  })

  it('9-3 正常位置时 left 为 screenX + 15', () => {
    const sys = makeSys()
    // jsdom 中 offsetWidth/Height 均为 0，window.innerWidth/Height 默认 1024x768
    sys.update(100, 200, makeCamera() as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.style.left).toBe('115px')
  })

  it('9-4 正常位置时 top 为 screenY + 15', () => {
    const sys = makeSys()
    sys.update(100, 200, makeCamera() as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.style.top).toBe('215px')
  })

  it('9-5 第二次 update 相同位置时仍更新 left/top（position 被调用）', () => {
    const sys = makeSys()
    sys.update(100, 200, makeCamera() as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    // 移动鼠标但 world 坐标相同
    sys.update(110, 210, makeCamera() as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.style.left).toBe('125px')
    expect((sys as any).el.style.top).toBe('225px')
  })
})

// ─── 10. findCreatureAt / findBuildingAt 内部逻辑 ────────────────────────────

describe('10. findCreatureAt / findBuildingAt 内部逻辑', () => {
  afterEach(() => vi.restoreAllMocks())

  it('10-1 距离超出 1.5 时不选中生物', () => {
    // 生物在 (50.5, 50.5)，tile 中心在 (10.5, 10.5)，距离很远
    const em: MockEM = {
      getEntitiesWithComponents: (comp1: string) => {
        if (comp1 === 'position') return [1]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (comp === 'position') return { x: 50.5, y: 50.5 }
        if (comp === 'creature') return { name: 'Far', species: 'Human', age: 1, damage: 1, speed: 1 }
        return undefined
      },
    }
    const sys = makeSys()
    const camera = makeCamera({ screenToWorld: () => ({ x: 10, y: 10 }) })
    sys.update(100, 100, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).not.toContain('Far')
  })

  it('10-2 距离在 1.5 以内时选中生物', () => {
    // 生物在 (10.6, 10.6)，tile (10, 10) 中心在 (10.5, 10.5)，距离 ≈ 0.14
    const em: MockEM = {
      getEntitiesWithComponents: (comp1: string) => {
        if (comp1 === 'position') return [1]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (comp === 'position') return { x: 10.6, y: 10.6 }
        if (comp === 'creature') return { name: 'Near', species: 'Human', age: 1, damage: 1, speed: 1 }
        if (comp === 'needs') return null
        if (comp === 'hero') return null
        if (comp === 'civMember') return null
        return undefined
      },
    }
    const sys = makeSys()
    const camera = makeCamera({ screenToWorld: () => ({ x: 10, y: 10 }) })
    sys.update(100, 100, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('Near')
  })

  it('10-3 多个生物时选择最近的', () => {
    // 生物 1 在 (10.6, 10.6), 生物 2 在 (10.3, 10.3)，tile (10, 10)
    const em: MockEM = {
      getEntitiesWithComponents: (comp1: string) => {
        if (comp1 === 'position') return [1, 2]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (comp === 'position') {
          if (id === 1) return { x: 10.6, y: 10.6 } // dist ≈ 0.14
          if (id === 2) return { x: 10.3, y: 10.3 } // dist ≈ 0.28 closer to center (10.5,10.5)
        }
        if (comp === 'creature') {
          if (id === 1) return { name: 'Farther', species: 'Human', age: 1, damage: 1, speed: 1 }
          if (id === 2) return { name: 'Closer', species: 'Human', age: 1, damage: 1, speed: 1 }
        }
        if (comp === 'needs') return null
        if (comp === 'hero') return null
        if (comp === 'civMember') return null
        return undefined
      },
    }
    const sys = makeSys()
    const camera = makeCamera({ screenToWorld: () => ({ x: 10, y: 10 }) })
    sys.update(100, 100, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    // id=1 dist = sqrt((10.6-10.5)^2 + (10.6-10.5)^2) = sqrt(0.02) ≈ 0.141
    // id=2 dist = sqrt((10.3-10.5)^2 + (10.3-10.5)^2) = sqrt(0.08) ≈ 0.283
    // id=1 is closer to center (10.5, 10.5)
    expect((sys as any).el.textContent).toContain('Farther')
    expect((sys as any).el.textContent).not.toContain('Closer')
  })

  it('10-4 建筑位置匹配采用 floor 对比', () => {
    // 建筑在 (10.7, 10.9)，floor -> (10, 10)，当前 tile (10, 10)
    const em: MockEM = {
      getEntitiesWithComponents: (_comp1: string, comp2?: string) => {
        if (comp2 === 'building') return [99]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (id !== 99) return undefined
        if (comp === 'position') return { x: 10.7, y: 10.9 }
        if (comp === 'building') return { buildingType: 'FloorBuilding' }
        return undefined
      },
    }
    const sys = makeSys()
    const camera = makeCamera({ screenToWorld: () => ({ x: 10, y: 10 }) })
    sys.update(100, 100, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).toContain('FloorBuilding')
  })

  it('10-5 position 组件缺失时跳过该生物', () => {
    const em: MockEM = {
      getEntitiesWithComponents: (comp1: string) => {
        if (comp1 === 'position') return [1]
        return []
      },
      getComponent: (_id: number, comp: string) => {
        if (comp === 'position') return undefined // 缺失
        return undefined
      },
    }
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    // 不崩溃，也不显示生物���息
    expect((sys as any).visible).toBe(true) // tile 仍然显示
  })

  it('10-6 position 组件缺失时跳过该建筑', () => {
    const em: MockEM = {
      getEntitiesWithComponents: (_comp1: string, comp2?: string) => {
        if (comp2 === 'building') return [5]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (id !== 5) return undefined
        if (comp === 'position') return undefined // 缺失
        if (comp === 'building') return { buildingType: 'House' }
        return undefined
      },
    }
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    expect((sys as any).el.textContent).not.toContain('House')
  })
})

// ─── 11. 综合与边界测试 ───────────────────────────────────────────────────────

describe('11. 综合与边界测试', () => {
  afterEach(() => vi.restoreAllMocks())

  it('11-1 update 后 textContent 不为空字符串', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.textContent).not.toBe('')
  })

  it('11-2 多次 hide/update 交替不崩溃', () => {
    const sys = makeSys()
    const em = makeEM()
    const cm = makeCivManager()
    expect(() => {
      for (let i = 0; i < 10; i++) {
        sys.update(i * 10, i * 10, makeCamera() as any, makeWorld(i % 8) as any, em as any, cm as any)
        sys.hide()
      }
    }).not.toThrow()
  })

  it('11-3 update 坐标为负值时不崩溃', () => {
    const sys = makeSys()
    const camera = makeCamera({ screenToWorld: () => ({ x: -5, y: -3 }) })
    expect(() => {
      sys.update(-50, -30, camera as any, makeWorld(null) as any, makeEM() as any, makeCivManager() as any)
    }).not.toThrow()
  })

  it('11-4 update 坐标为极大值时不崩溃', () => {
    const sys = makeSys()
    const camera = makeCamera({ screenToWorld: () => ({ x: 9999, y: 9999 }) })
    expect(() => {
      sys.update(9999, 9999, camera as any, makeWorld(null) as any, makeEM() as any, makeCivManager() as any)
    }).not.toThrow()
  })

  it('11-5 civManager.civilizations 中 civId 不存在时不显示文明', () => {
    const sys = makeSys()
    const em: MockEM = {
      getEntitiesWithComponents: (comp1: string) => {
        if (comp1 === 'position') return [1]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (comp === 'position') return { x: 50.5, y: 50.5 }
        if (comp === 'creature') return { name: 'Loner', species: 'Human', age: 1, damage: 1, speed: 1 }
        if (comp === 'needs') return null
        if (comp === 'hero') return null
        if (comp === 'civMember') return { civId: 999 } // civId 不存在
        return undefined
      },
    }
    const cm = makeCivManager() // 空文明表
    const camera = makeCamera({ screenToWorld: () => ({ x: 50, y: 50 }) })
    sys.update(500, 500, camera as any, makeWorld(3) as any, em as any, cm as any)
    // 不应崩溃，不显示文明名
    expect((sys as any).visible).toBe(true)
  })

  it('11-6 tile 值为 0（Deep Water）时 visible=true', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(0) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).visible).toBe(true)
  })

  it('11-7 tile 值为 7（Lava）时 visible=true', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(7) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).visible).toBe(true)
  })

  it('11-8 update 后 el.children 至少有一个子节点', () => {
    const sys = makeSys()
    sys.update(50, 50, makeCamera() as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect((sys as any).el.children.length).toBeGreaterThan(0)
  })

  it('11-9 camera.screenToWorld 以 screenX, screenY 为参数被调用', () => {
    const sys = makeSys()
    const screenToWorld = vi.fn().mockReturnValue({ x: 5, y: 5 })
    const camera = { screenToWorld }
    sys.update(123, 456, camera as any, makeWorld(3) as any, makeEM() as any, makeCivManager() as any)
    expect(screenToWorld).toHaveBeenCalledWith(123, 456)
  })

  it('11-10 同时有生物和建筑时两者信息都显示', () => {
    const sys = makeSys()
    // 生物在 (10.5, 10.5)，建筑也在 tile (10, 10)
    const em: MockEM = {
      getEntitiesWithComponents: (comp1: string, comp2?: string) => {
        if (comp2 === 'building') return [2]
        if (comp1 === 'position') return [1]
        return []
      },
      getComponent: (id: number, comp: string) => {
        if (id === 1) {
          if (comp === 'position') return { x: 10.5, y: 10.5 }
          if (comp === 'creature') return { name: 'Warrior', species: 'Human', age: 30, damage: 12, speed: 1.2 }
          if (comp === 'needs') return null
          if (comp === 'hero') return null
          if (comp === 'civMember') return null
        }
        if (id === 2) {
          if (comp === 'position') return { x: 10, y: 10 }
          if (comp === 'building') return { buildingType: 'Forge' }
        }
        return undefined
      },
    }
    const camera = makeCamera({ screenToWorld: () => ({ x: 10, y: 10 }) })
    sys.update(100, 100, camera as any, makeWorld(3) as any, em as any, makeCivManager() as any)
    const text = (sys as any).el.textContent as string
    expect(text).toContain('Warrior')
    expect(text).toContain('Forge')
  })
})
