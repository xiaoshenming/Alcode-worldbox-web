import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldStatsOverviewSystem } from '../systems/WorldStatsOverviewSystem'

// ---- 辅助工厂 ----
function makeSys(): WorldStatsOverviewSystem { return new WorldStatsOverviewSystem() }

/** 构造最小 EntityManager stub */
function makeEM(creatures: Array<{ species: string }> = []) {
  const ids = creatures.map((_, i) => i + 1)
  return {
    getEntitiesWithComponent: vi.fn(() => ids),
    getComponent: vi.fn((_id: number, _comp: string) => {
      const idx = ids.indexOf(_id)
      if (idx === -1) return null
      return { type: 'creature', species: creatures[idx].species }
    }),
  }
}

/** 构造最小 CivManager stub */
function makeCivManager(civs: Array<{
  buildings?: number,
  food?: number, wood?: number, stone?: number, gold?: number,
  relations?: [string, number][]
}> = []) {
  const map = new Map<string, any>()
  civs.forEach((c, i) => {
    map.set(`civ${i}`, {
      buildings: new Array(c.buildings ?? 0),
      resources: { food: c.food ?? 0, wood: c.wood ?? 0, stone: c.stone ?? 0, gold: c.gold ?? 0 },
      relations: new Map<string, number>(c.relations ?? []),
    })
  })
  return { civilizations: map }
}

/** 触发一次 update（tick >= SAMPLE_INTERVAL=60，初始 lastSampleTick=-60） */
function doUpdate(sys: WorldStatsOverviewSystem, em: any, civ: any, tick = 60) {
  sys.update(tick, em, civ)
}

// ============================================================
describe('1. 初始状态', () => {
  let sys: WorldStatsOverviewSystem
  beforeEach(() => { sys = makeSys() })

  it('isVisible() 初始为 false', () => { expect(sys.isVisible()).toBe(false) })
  it('totalPop 初始为 0', () => { expect((sys as any).totalPop).toBe(0) })
  it('civCount 初始为 0', () => { expect((sys as any).civCount).toBe(0) })
  it('buildingCount 初始为 0', () => { expect((sys as any).buildingCount).toBe(0) })
  it('resourceTotal 初始为 0', () => { expect((sys as any).resourceTotal).toBe(0) })
  it('warCount 初始为 0', () => { expect((sys as any).warCount).toBe(0) })
  it('peaceCount 初始为 0', () => { expect((sys as any).peaceCount).toBe(0) })
  it('histCount 初始为 0', () => { expect((sys as any).histCount).toBe(0) })
  it('histHead 初始为 0', () => { expect((sys as any).histHead).toBe(0) })
  it('speciesCounts 初始��空 Map', () => { expect((sys as any).speciesCounts.size).toBe(0) })
  it('_speciesEntriesBuf 初始为空数组', () => { expect((sys as any)._speciesEntriesBuf).toHaveLength(0) })
  it('_warStr 初始值', () => { expect((sys as any)._warStr).toBe('War: 0') })
  it('_peaceStr 初始值', () => { expect((sys as any)._peaceStr).toBe('Peace: 0') })
})

// ============================================================
describe('2. toggle / isVisible', () => {
  let sys: WorldStatsOverviewSystem
  beforeEach(() => { sys = makeSys() })

  it('toggle 一次 → visible=true', () => { sys.toggle(); expect(sys.isVisible()).toBe(true) })
  it('toggle 两次 → visible=false', () => { sys.toggle(); sys.toggle(); expect(sys.isVisible()).toBe(false) })
  it('toggle 三次 → visible=true', () => { sys.toggle(); sys.toggle(); sys.toggle(); expect(sys.isVisible()).toBe(true) })
  it('toggle 四次 → visible=false', () => {
    sys.toggle(); sys.toggle(); sys.toggle(); sys.toggle()
    expect(sys.isVisible()).toBe(false)
  })
  it('多次 isVisible 不改变状态', () => {
    sys.toggle()
    sys.isVisible(); sys.isVisible()
    expect(sys.isVisible()).toBe(true)
  })
})

// ============================================================
describe('3. 节流 — SAMPLE_INTERVAL = 60', () => {
  let sys: WorldStatsOverviewSystem
  let em: any
  let civ: any
  beforeEach(() => {
    sys = makeSys()
    em = makeEM([{ species: 'human' }])
    civ = makeCivManager([])
  })

  it('tick=0 时采样（初始 lastSampleTick=-60，差值=60 恰好通过）', () => {
    sys.update(0, em, civ)
    expect((sys as any).histCount).toBe(1)
  })
  it('tick=59 时采样（初始差值=119 > 60）', () => {
    sys.update(59, em, civ)
    expect((sys as any).histCount).toBe(1)
  })
  it('tick=60 时采样', () => {
    sys.update(60, em, civ)
    expect((sys as any).histCount).toBe(1)
  })
  it('tick=119 时不重复采样', () => {
    sys.update(60, em, civ)
    sys.update(119, em, civ)
    expect((sys as any).histCount).toBe(1)
  })
  it('tick=120 时第二次采样', () => {
    sys.update(60, em, civ)
    sys.update(120, em, civ)
    expect((sys as any).histCount).toBe(2)
  })
  it('lastSampleTick 更新为当前 tick', () => {
    sys.update(60, em, civ)
    expect((sys as any).lastSampleTick).toBe(60)
  })
  it('连续高频调用只采样一次', () => {
    for (let t = 60; t < 75; t++) sys.update(t, em, civ)
    expect((sys as any).histCount).toBe(1)
  })
})

// ============================================================
describe('4. 人口与物种统计', () => {
  let sys: WorldStatsOverviewSystem
  let civ: any
  beforeEach(() => { sys = makeSys(); civ = makeCivManager([]) })

  it('无生物时 totalPop=0', () => {
    doUpdate(sys, makeEM([]), civ)
    expect((sys as any).totalPop).toBe(0)
  })
  it('3个人类 totalPop=3', () => {
    doUpdate(sys, makeEM([{ species: 'human' }, { species: 'human' }, { species: 'human' }]), civ)
    expect((sys as any).totalPop).toBe(3)
  })
  it('混合物种 totalPop=4', () => {
    doUpdate(sys, makeEM([
      { species: 'human' }, { species: 'elf' }, { species: 'dwarf' }, { species: 'orc' }
    ]), civ)
    expect((sys as any).totalPop).toBe(4)
  })
  it('物种计数：2人类', () => {
    doUpdate(sys, makeEM([{ species: 'human' }, { species: 'human' }, { species: 'elf' }]), civ)
    expect((sys as any).speciesCounts.get('human')).toBe(2)
  })
  it('物种计数：1精灵', () => {
    doUpdate(sys, makeEM([{ species: 'human' }, { species: 'elf' }]), civ)
    expect((sys as any).speciesCounts.get('elf')).toBe(1)
  })
  it('speciesCounts 在第二次采样后清空重计', () => {
    doUpdate(sys, makeEM([{ species: 'human' }, { species: 'human' }]), civ)
    doUpdate(sys, makeEM([{ species: 'elf' }]), civ, 120)
    expect((sys as any).speciesCounts.get('human')).toBeUndefined()
    expect((sys as any).speciesCounts.get('elf')).toBe(1)
  })
  it('_speciesEntriesBuf 按数量降序排列', () => {
    doUpdate(sys, makeEM([
      { species: 'elf' }, { species: 'human' }, { species: 'human' }, { species: 'human' }
    ]), civ)
    const buf: [string, number][] = (sys as any)._speciesEntriesBuf
    expect(buf[0][0]).toBe('human')
    expect(buf[0][1]).toBe(3)
  })
  it('_speciesCountStrs 缓存数字字符串', () => {
    doUpdate(sys, makeEM([{ species: 'human' }, { species: 'human' }]), civ)
    expect((sys as any)._speciesCountStrs.get('human')).toBe('2')
  })
  it('_speciesBarLabelStrs 格式正确', () => {
    doUpdate(sys, makeEM([{ species: 'orc' }, { species: 'orc' }]), civ)
    expect((sys as any)._speciesBarLabelStrs.get('orc')).toBe('orc 2')
  })
})

// ============================================================
describe('5. 文明聚合字段', () => {
  let sys: WorldStatsOverviewSystem
  let em: any
  beforeEach(() => { sys = makeSys(); em = makeEM([]) })

  it('civCount 等于文明数量', () => {
    doUpdate(sys, em, makeCivManager([{}, {}]))
    expect((sys as any).civCount).toBe(2)
  })
  it('buildingCount 累加所有文明建筑', () => {
    doUpdate(sys, em, makeCivManager([{ buildings: 3 }, { buildings: 5 }]))
    expect((sys as any).buildingCount).toBe(8)
  })
  it('resourceTotal = food+wood+stone+gold', () => {
    doUpdate(sys, em, makeCivManager([{ food: 10, wood: 20, stone: 5, gold: 5 }]))
    expect((sys as any).resourceTotal).toBe(40)
  })
  it('多文明资源相加', () => {
    doUpdate(sys, em, makeCivManager([
      { food: 10, wood: 0, stone: 0, gold: 0 },
      { food: 0, wood: 5, stone: 5, gold: 0 },
    ]))
    expect((sys as any).resourceTotal).toBe(20)
  })
  it('无文明时 civCount=0', () => {
    doUpdate(sys, em, makeCivManager([]))
    expect((sys as any).civCount).toBe(0)
  })
  it('无文明时 buildingCount=0', () => {
    doUpdate(sys, em, makeCivManager([]))
    expect((sys as any).buildingCount).toBe(0)
  })
})

// ============================================================
describe('6. 战争/和平统计', () => {
  let sys: WorldStatsOverviewSystem
  let em: any
  beforeEach(() => { sys = makeSys(); em = makeEM([]) })

  it('无关系时 warCount=0, peaceCount=0', () => {
    doUpdate(sys, em, makeCivManager([{}]))
    expect((sys as any).warCount).toBe(0)
    expect((sys as any).peaceCount).toBe(0)
  })
  it('关系=-60 算作战争', () => {
    doUpdate(sys, em, makeCivManager([{ relations: [['civ2', -60]] }]))
    // 双向计数 >> 1: raw wars=1 -> wc=0（单条关系去重）
    expect((sys as any).warCount).toBe(0)
  })
  it('两条对称关系=-60, warCount=1', () => {
    doUpdate(sys, em, makeCivManager([
      { relations: [['civ2', -60], ['civ3', -60]] },
    ]))
    // raw=2 >> 1 = 1
    expect((sys as any).warCount).toBe(1)
  })
  it('关系=80 算作和平', () => {
    doUpdate(sys, em, makeCivManager([
      { relations: [['civ2', 80], ['civ3', 80]] },
    ]))
    expect((sys as any).peaceCount).toBe(1)
  })
  it('关系=-50 恰好在边界为战争', () => {
    doUpdate(sys, em, makeCivManager([{ relations: [['c', -50], ['d', -50]] }]))
    expect((sys as any).warCount).toBe(1)
  })
  it('关系=50 不算和平（需 >50）', () => {
    doUpdate(sys, em, makeCivManager([{ relations: [['c', 50], ['d', 50]] }]))
    expect((sys as any).peaceCount).toBe(0)
  })
  it('_warStr 随 warCount 更新', () => {
    doUpdate(sys, em, makeCivManager([{ relations: [['c', -60], ['d', -60]] }]))
    expect((sys as any)._warStr).toBe('War: 1')
  })
  it('_peaceStr 随 peaceCount 更新', () => {
    doUpdate(sys, em, makeCivManager([{ relations: [['c', 80], ['d', 80]] }]))
    expect((sys as any)._peaceStr).toBe('Peace: 1')
  })
})

// ============================================================
describe('7. 环形��冲区 (popHistory)', () => {
  let sys: WorldStatsOverviewSystem
  let civ: any
  beforeEach(() => { sys = makeSys(); civ = makeCivManager([]) })

  it('第1次采样 histCount=1', () => {
    doUpdate(sys, makeEM([{ species: 'human' }]), civ, 60)
    expect((sys as any).histCount).toBe(1)
  })
  it('popHistory[0] 存储正确人口', () => {
    doUpdate(sys, makeEM([{ species: 'human' }, { species: 'elf' }]), civ, 60)
    expect((sys as any).popHistory[0]).toBe(2)
  })
  it('连续 200 次采样 histCount=200', () => {
    for (let i = 0; i < 200; i++) sys.update(60 + i * 60, makeEM([{ species: 'human' }]), civ)
    expect((sys as any).histCount).toBe(200)
  })
  it('第 201 次采样 histCount 仍为 200', () => {
    for (let i = 0; i <= 200; i++) sys.update(60 + i * 60, makeEM([{ species: 'human' }]), civ)
    expect((sys as any).histCount).toBe(200)
  })
  it('超过 MAX_HISTORY 后 histHead 前进', () => {
    for (let i = 0; i <= 200; i++) sys.update(60 + i * 60, makeEM([{ species: 'human' }]), civ)
    expect((sys as any).histHead).toBe(1)
  })
  it('第 202 次采样 histHead=2', () => {
    for (let i = 0; i <= 201; i++) sys.update(60 + i * 60, makeEM([{ species: 'human' }]), civ)
    expect((sys as any).histHead).toBe(2)
  })
})

// ============================================================
describe('8. _statsRow 缓存优化', () => {
  let sys: WorldStatsOverviewSystem
  let civ: any
  beforeEach(() => { sys = makeSys(); civ = makeCivManager([]) })

  it('_statsRow 初始 v 字段为 -1', () => {
    const row = (sys as any)._statsRow
    for (const s of row) expect(s.v).toBe(-1)
  })
  it('_statsRow 有 4 个元素', () => {
    expect((sys as any)._statsRow).toHaveLength(4)
  })
  it('_statsRow[0].l 为 Pop', () => {
    expect((sys as any)._statsRow[0].l).toBe('Pop')
  })
  it('_statsRow[1].l 为 Civs', () => {
    expect((sys as any)._statsRow[1].l).toBe('Civs')
  })
  it('_statsRow[2].l 为 Bldg', () => {
    expect((sys as any)._statsRow[2].l).toBe('Bldg')
  })
  it('_statsRow[3].l 为 Res', () => {
    expect((sys as any)._statsRow[3].l).toBe('Res')
  })
  it('_statsRow 颜色字段存在', () => {
    const colors = (sys as any)._statsRow.map((s: any) => s.c)
    expect(colors).toContain('#4fc3f7')
    expect(colors).toContain('#aed581')
    expect(colors).toContain('#ffb74d')
    expect(colors).toContain('#ce93d8')
  })
})
