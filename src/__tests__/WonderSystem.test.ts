import { describe, it, expect, beforeEach } from 'vitest'
import { WonderSystem } from '../systems/WonderSystem'
import type { ActiveWonder } from '../systems/WonderSystem'

function makeWS(): WonderSystem { return new WonderSystem() }

function makeActiveWonder(defId: string, civId: number, entityId = 1, x = 0, y = 0): ActiveWonder {
  return { defId, civId, entityId, x, y, completedAt: 0 }
}

describe('WonderSystem.getActiveWonders', () => {
  let ws: WonderSystem
  beforeEach(() => { ws = makeWS() })

  it('初始为空', () => { expect(ws.getActiveWonders()).toHaveLength(0) })
  it('注入奇观后可查询到', () => {
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.getActiveWonders()).toHaveLength(1)
    expect(ws.getActiveWonders()[0].defId).toBe('great_library')
  })
  it('多个奇观都能查询到', () => {
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    ws.getActiveWonders().push(makeActiveWonder('colosseum', 2))
    expect(ws.getActiveWonders()).toHaveLength(2)
  })
  it('返回相同引用（直接访问内部数组）', () => {
    expect(ws.getActiveWonders()).toBe(ws.getActiveWonders())
  })
  it('奇观对象有 defId、civId、entityId、x、y、completedAt 字段', () => {
    ws.getActiveWonders().push(makeActiveWonder('colosseum', 3))
    const w = ws.getActiveWonders()[0]
    expect(w).toHaveProperty('defId')
    expect(w).toHaveProperty('civId')
    expect(w).toHaveProperty('entityId')
    expect(w).toHaveProperty('x')
    expect(w).toHaveProperty('y')
    expect(w).toHaveProperty('completedAt')
  })
})

describe('WonderSystem.getAvailableWonders', () => {
  let ws: WonderSystem
  beforeEach(() => { ws = makeWS() })

  it('初始时 5 个奇观全部可用', () => { expect(ws.getAvailableWonders()).toHaveLength(5) })
  it('建成一个奇观后可用数减少', () => {
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.getAvailableWonders()).toHaveLength(4)
    expect(ws.getAvailableWonders().every((d: any) => d.id !== 'great_library')).toBe(true)
  })
  it('在建设中的奇观也从可用列表移除', () => {
    ;(ws as any).constructions.push({ defId: 'colosseum', civId: 1, startedAt: 0 })
    expect(ws.getAvailableWonders()).toHaveLength(4)
    expect(ws.getAvailableWonders().every((d: any) => d.id !== 'colosseum')).toBe(true)
  })
  it('全部奇观建成后返回空数组', () => {
    const ids = ['great_library', 'colosseum', 'grand_bazaar', 'world_tree', 'sky_fortress']
    ids.forEach(id => ws.getActiveWonders().push(makeActiveWonder(id, 1)))
    expect(ws.getAvailableWonders()).toHaveLength(0)
  })
  it('建成 colosseum 后 getAvailableWonders 不含 colosseum', () => {
    ws.getActiveWonders().push(makeActiveWonder('colosseum', 1))
    expect(ws.getAvailableWonders().some((d: any) => d.id === 'colosseum')).toBe(false)
  })
  it('每个可用奇观有 id、name、techRequired 字段', () => {
    ws.getAvailableWonders().forEach((d: any) => {
      expect(d).toHaveProperty('id')
      expect(d).toHaveProperty('name')
      expect(d).toHaveProperty('techRequired')
    })
  })
  it('在建和建成同时排除', () => {
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    ;(ws as any).constructions.push({ defId: 'colosseum', civId: 1, startedAt: 0 })
    expect(ws.getAvailableWonders()).toHaveLength(3)
  })
})

describe('WonderSystem.hasWonder', () => {
  let ws: WonderSystem
  beforeEach(() => { ws = makeWS() })

  it('无奇观时返回 false', () => { expect(ws.hasWonder(1, 'great_library')).toBe(false) })
  it('文明拥有奇观时返回 true', () => {
    ws.getActiveWonders().push(makeActiveWonder('great_library', 5))
    expect(ws.hasWonder(5, 'great_library')).toBe(true)
  })
  it('文明 id 不匹配时返回 false', () => {
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.hasWonder(2, 'great_library')).toBe(false)
  })
  it('奇观 id 不匹配时返回 false', () => {
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.hasWonder(1, 'colosseum')).toBe(false)
  })
  it('多次查询同一奇观结果一致', () => {
    ws.getActiveWonders().push(makeActiveWonder('grand_bazaar', 2))
    expect(ws.hasWonder(2, 'grand_bazaar')).toBe(true)
    expect(ws.hasWonder(2, 'grand_bazaar')).toBe(true)
  })
  it('_activeWonderCivSet 缓存被使用', () => {
    ws.getActiveWonders().push(makeActiveWonder('colosseum', 3))
    ws.hasWonder(3, 'colosseum') // 第一次触发 lazy sync
    expect((ws as any)._activeWonderCivSet.has('3_colosseum')).toBe(true)
  })
})

describe('WonderSystem bonus methods', () => {
  let ws: WonderSystem
  beforeEach(() => { ws = makeWS() })

  it('无 great_library 时 hasWonder 返回 false', () => { expect(ws.hasWonder(1, 'great_library')).toBe(false) })
  it('有 great_library 时 hasWonder 返回 true', () => {
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    expect(ws.hasWonder(1, 'great_library')).toBe(true)
  })
  it('有 colosseum 时 hasWonder 返回 true', () => {
    ws.getActiveWonders().push(makeActiveWonder('colosseum', 1))
    expect(ws.hasWonder(1, 'colosseum')).toBe(true)
    expect(ws.hasWonder(2, 'colosseum')).toBe(false)
  })
  it('colosseum 属于文明3', () => {
    ws.getActiveWonders().push(makeActiveWonder('colosseum', 3))
    expect(ws.hasWonder(3, 'colosseum')).toBe(true)
    expect(ws.hasWonder(1, 'colosseum')).toBe(false)
  })
  it('grand_bazaar 属于文明2', () => {
    ws.getActiveWonders().push(makeActiveWonder('grand_bazaar', 2))
    expect(ws.hasWonder(2, 'grand_bazaar')).toBe(true)
    expect(ws.hasWonder(1, 'grand_bazaar')).toBe(false)
  })
  it('grand_bazaar 资源加成前提', () => {
    ws.getActiveWonders().push(makeActiveWonder('grand_bazaar', 2))
    expect(ws.hasWonder(2, 'grand_bazaar')).toBe(true)
  })
  it('world_tree 属于文明4', () => {
    ws.getActiveWonders().push(makeActiveWonder('world_tree', 4))
    expect(ws.hasWonder(4, 'world_tree')).toBe(true)
    expect(ws.hasWonder(1, 'world_tree')).toBe(false)
  })
  it('world_tree 人口上限加成前提', () => {
    ws.getActiveWonders().push(makeActiveWonder('world_tree', 4))
    expect(ws.hasWonder(4, 'world_tree')).toBe(true)
  })
  it('sky_fortress 属于文明5', () => {
    ws.getActiveWonders().push(makeActiveWonder('sky_fortress', 5))
    expect(ws.hasWonder(5, 'sky_fortress')).toBe(true)
    expect(ws.hasWonder(1, 'sky_fortress')).toBe(false)
  })
  it('sky_fortress 防御加成前提', () => {
    ws.getActiveWonders().push(makeActiveWonder('sky_fortress', 5))
    expect(ws.hasWonder(5, 'sky_fortress')).toBe(true)
  })
  it('同一文明拥有多个奇观时各自独立', () => {
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    ws.getActiveWonders().push(makeActiveWonder('colosseum', 1))
    expect(ws.hasWonder(1, 'great_library')).toBe(true)
    expect(ws.hasWonder(1, 'colosseum')).toBe(true)
    expect(ws.hasWonder(1, 'world_tree')).toBe(false)
  })
})

describe('WonderSystem — WonderDef 结构', () => {
  let ws: WonderSystem
  beforeEach(() => { ws = makeWS() })

  it('great_library techRequired 为 3', () => {
    const def = ws.getAvailableWonders().find((d: any) => d.id === 'great_library')
    expect(def?.techRequired).toBe(3)
  })
  it('sky_fortress techRequired 为 5', () => {
    const def = ws.getAvailableWonders().find((d: any) => d.id === 'sky_fortress')
    expect(def?.techRequired).toBe(5)
  })
  it('每个 WonderDef 有 effects 数组', () => {
    ws.getAvailableWonders().forEach((d: any) => { expect(Array.isArray(d.effects)).toBe(true) })
  })
  it('每个 WonderDef 有 color 字段', () => {
    ws.getAvailableWonders().forEach((d: any) => { expect(typeof d.color).toBe('string') })
  })
  it('grand_bazaar resourceCost 包含 gold', () => {
    const def = ws.getAvailableWonders().find((d: any) => d.id === 'grand_bazaar')
    expect(def?.resourceCost).toHaveProperty('gold')
  })
  it('colosseum resourceCost 包含 stone', () => {
    const def = ws.getAvailableWonders().find((d: any) => d.id === 'colosseum')
    expect(def?.resourceCost).toHaveProperty('stone')
  })
  it('WonderDef id 唯一', () => {
    const ids = ws.getAvailableWonders().map((d: any) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('WonderSystem — 综合边界测试', () => {
  it('getActiveWonders 初始返回数组实例', () => { expect(Array.isArray(makeWS().getActiveWonders())).toBe(true) })
  it('getAvailableWonders 初始返回数组实例', () => { expect(Array.isArray(makeWS().getAvailableWonders())).toBe(true) })
  it('建成 4 个奇观后可用 1 个', () => {
    const ws = makeWS()
    const ids = ['great_library', 'colosseum', 'grand_bazaar', 'world_tree']
    ids.forEach(id => ws.getActiveWonders().push(makeActiveWonder(id, 1)))
    expect(ws.getAvailableWonders()).toHaveLength(1)
  })
  it('hasWonder 对不存在的 defId 返回 false', () => { expect(makeWS().hasWonder(1, 'nonexistent')).toBe(false) })
  it('不同文明分别拥有不同奇观', () => {
    const ws = makeWS()
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    ws.getActiveWonders().push(makeActiveWonder('colosseum', 2))
    expect(ws.hasWonder(1, 'great_library')).toBe(true)
    expect(ws.hasWonder(2, 'colosseum')).toBe(true)
    expect(ws.hasWonder(1, 'colosseum')).toBe(false)
    expect(ws.hasWonder(2, 'great_library')).toBe(false)
  })
  it('constructions 注入后 getAvailableWonders 正确排除', () => {
    const ws = makeWS()
    ;(ws as any).constructions.push({ defId: 'world_tree', civId: 1, startedAt: 0 })
    ;(ws as any).constructions.push({ defId: 'sky_fortress', civId: 1, startedAt: 0 })
    expect(ws.getAvailableWonders()).toHaveLength(3)
  })
  it('同时在建和已建成时可用数正确', () => {
    const ws = makeWS()
    ws.getActiveWonders().push(makeActiveWonder('great_library', 1))
    ;(ws as any).constructions.push({ defId: 'colosseum', civId: 1, startedAt: 0 })
    ws.getActiveWonders().push(makeActiveWonder('world_tree', 1))
    expect(ws.getAvailableWonders()).toHaveLength(2)
  })
  it('getActiveWonders 中每个元素 entityId 为正整数', () => {
    const ws = makeWS()
    ws.getActiveWonders().push(makeActiveWonder('colosseum', 1, 42))
    expect(ws.getActiveWonders()[0].entityId).toBe(42)
  })
  it('getActiveWonders completedAt 字段可为 0', () => {
    const ws = makeWS()
    ws.getActiveWonders().push(makeActiveWonder('sky_fortress', 1))
    expect(ws.getActiveWonders()[0].completedAt).toBe(0)
  })
  it('hasWonder 对 civId=0 不崩溃', () => { expect(() => makeWS().hasWonder(0, 'great_library')).not.toThrow() })
  it('5 个奇观各有不同 techRequired', () => {
    const ws = makeWS()
    const techs = ws.getAvailableWonders().map((d: any) => d.techRequired)
    expect(techs.some(t => t === 3)).toBe(true)
    expect(techs.some(t => t === 4)).toBe(true)
    expect(techs.some(t => t === 5)).toBe(true)
  })
  it('great_library preferredCulture 为 scholar', () => {
    const ws = makeWS()
    const def = ws.getAvailableWonders().find((d: any) => d.id === 'great_library')
    expect(def?.preferredCulture).toBe('scholar')
  })
  it('world_tree color 为绿色系', () => {
    const ws = makeWS()
    const def = ws.getAvailableWonders().find((d: any) => d.id === 'world_tree')
    expect(def?.color).toBe('#2ecc71')
  })
  it('sky_fortress resourceCost 包含 stone 和 gold', () => {
    const ws = makeWS()
    const def = ws.getAvailableWonders().find((d: any) => d.id === 'sky_fortress')
    expect(def?.resourceCost).toHaveProperty('stone')
    expect(def?.resourceCost).toHaveProperty('gold')
  })
})
