import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ClonePowerSystem } from '../systems/ClonePowerSystem'
import type { CreatureStats, CloneEntity } from '../systems/ClonePowerSystem'

function makeCPS(): ClonePowerSystem { return new ClonePowerSystem() }

function makeStats(overrides: Partial<CreatureStats> = {}): CreatureStats {
  return { species: 'human', health: 100, maxHealth: 100, attack: 10, defense: 5, speed: 3, age: 0, traits: [], ...overrides }
}

describe('ClonePowerSystem — 初始状态', () => {
  it('初始克隆数量为 0', () => { expect(makeCPS().getCloneCount()).toBe(0) })
  it('初始 nextCloneId 为 1', () => { expect((makeCPS() as any).nextCloneId).toBe(1) })
  it('初始 totalClones 为 0', () => { expect((makeCPS() as any).totalClones).toBe(0) })
  it('初始 lineage 为空 Map', () => { expect((makeCPS() as any).lineage.size).toBe(0) })
  it('MAX_CLONE_GENERATION 为 5', () => { expect(ClonePowerSystem.MAX_CLONE_GENERATION).toBe(5) })
})

describe('ClonePowerSystem.getCloneCount', () => {
  it('clone 一次后数量为 1', () => {
    const cps = makeCPS(); cps.clone(1, makeStats(), 0, 0)
    expect(cps.getCloneCount()).toBe(1)
  })
  it('多次 clone 累加', () => {
    const cps = makeCPS()
    cps.clone(1, makeStats(), 0, 0); cps.clone(1, makeStats(), 5, 5); cps.clone(1, makeStats(), 10, 10)
    expect(cps.getCloneCount()).toBe(3)
  })
  it('massClone 后计数正确', () => {
    const cps = makeCPS(); cps.massClone(1, makeStats(), 4, 0, 0, 10)
    expect(cps.getCloneCount()).toBe(4)
  })
  it('massClone 0 个后计数不变', () => {
    const cps = makeCPS(); cps.massClone(1, makeStats(), 0, 0, 0, 10)
    expect(cps.getCloneCount()).toBe(0)
  })
  it('连续 clone 10 次后总数为 10', () => {
    const cps = makeCPS()
    for (let i = 0; i < 10; i++) cps.clone(1, makeStats(), i, i)
    expect(cps.getCloneCount()).toBe(10)
  })
})

describe('ClonePowerSystem.clone — 基础属性', () => {
  let cps: ClonePowerSystem
  beforeEach(() => { cps = makeCPS() })

  it('克隆包含正确的坐标', () => { const cd = cps.clone(1, makeStats(), 20, 30); expect(cd.x).toBe(20); expect(cd.y).toBe(30) })
  it('克隆包含源 id', () => { expect(cps.clone(42, makeStats(), 0, 0).sourceId).toBe(42) })
  it('首次克隆代数为 1', () => { expect(cps.clone(1, makeStats(), 0, 0).generation).toBe(1) })
  it('克隆物种与源一致', () => { expect(cps.clone(1, makeStats({ species: 'elf' }), 0, 0).species).toBe('elf') })
  it('克隆年龄重置为 0', () => { expect(cps.clone(1, makeStats({ age: 50 }), 0, 0).age).toBe(0) })
  it('clone trait 会被添加', () => { expect(cps.clone(1, makeStats(), 0, 0).traits).toContain('clone') })
  it('源实体原有 clone trait 不重复', () => { expect(cps.clone(1, makeStats({ traits: ['clone'] }), 0, 0).traits.filter(t => t === 'clone')).toHaveLength(1) })
  it('其他 trait 保留', () => { expect(cps.clone(1, makeStats({ traits: ['brave'] }), 0, 0).traits).toContain('brave') })
  it('克隆 health 大于 0', () => {
    for (let i = 0; i < 5; i++) expect(cps.clone(1, makeStats({ health: 100 }), 0, 0).health).toBeGreaterThan(0)
  })
  it('克隆后 lineage 记录 sourceId 和 generation', () => {
    cps.clone(5, makeStats(), 0, 0)
    const id = (cps as any).nextCloneId - 1
    const e = (cps as any).lineage.get(id)
    expect(e?.sourceId).toBe(5); expect(e?.generation).toBe(1)
  })
})

describe('ClonePowerSystem.clone — generation 与 unstable', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('generation 上限为 5', () => {
    const cps = makeCPS()
    ;(cps as any).lineage.set(99, { sourceId: 1, generation: 5 })
    expect(cps.clone(99, makeStats(), 0, 0).generation).toBe(5)
  })
  it('第 5+ 代克隆添加 unstable trait', () => {
    const cps = makeCPS()
    ;(cps as any).lineage.set(99, { sourceId: 1, generation: 5 })
    expect(cps.clone(99, makeStats(), 0, 0).traits).toContain('unstable')
  })
  it('第 4 代克隆不含 unstable', () => {
    const cps = makeCPS()
    ;(cps as any).lineage.set(99, { sourceId: 1, generation: 3 })
    expect(cps.clone(99, makeStats(), 0, 0).traits).not.toContain('unstable')
  })
  it('colorTint = 180 + gen*15', () => {
    const cps = makeCPS()
    const cd = cps.clone(1, makeStats(), 0, 0)
    expect(cd.colorTint).toBe(180 + 1 * 15)
  })
  it('gen=2 colorTint = 210', () => {
    const cps = makeCPS()
    ;(cps as any).lineage.set(88, { sourceId: 1, generation: 1 })
    const cd = cps.clone(88, makeStats(), 0, 0)
    expect(cd.colorTint).toBe(180 + 2 * 15)
  })
})

describe('ClonePowerSystem.getGeneration', () => {
  it('未知实体返回 0', () => { expect(makeCPS().getGeneration(999)).toBe(0) })
  it('clone 后返回正确代数', () => {
    const cps = makeCPS(); cps.clone(1, makeStats(), 0, 0)
    expect(cps.getGeneration((cps as any).nextCloneId - 1)).toBe(1)
  })
  it('直接注入 lineage 后可查询', () => {
    const cps = makeCPS()
    ;(cps as any).lineage.set(10, { sourceId: 1, generation: 3 })
    expect(cps.getGeneration(10)).toBe(3)
  })
  it('注入代数 5 可查询', () => {
    const cps = makeCPS()
    ;(cps as any).lineage.set(77, { sourceId: 1, generation: 5 })
    expect(cps.getGeneration(77)).toBe(5)
  })
})

describe('ClonePowerSystem lineage数据验证', () => {
  it('非克隆实体 lineage 中不存在', () => { expect((makeCPS() as any).lineage.has(1)).toBe(false) })
  it('一代克隆 lineage 记录正确', () => {
    const cps = makeCPS(); cps.clone(1, makeStats(), 0, 0)
    const id = (cps as any).nextCloneId - 1
    const e = (cps as any).lineage.get(id)
    expect(e?.sourceId).toBe(1); expect(e?.generation).toBe(1)
  })
  it('深层血统链 lineage 正确', () => {
    const cps = makeCPS()
    ;(cps as any).lineage.set(2, { sourceId: 1, generation: 1 })
    ;(cps as any).lineage.set(3, { sourceId: 2, generation: 2 })
    expect((cps as any).lineage.get(3).sourceId).toBe(2)
    expect((cps as any).lineage.get(2).sourceId).toBe(1)
  })
  it('lineage 是 Map 类型', () => { expect((makeCPS() as any).lineage).toBeInstanceOf(Map) })
  it('多次 clone 后 lineage 大小正确', () => {
    const cps = makeCPS(); cps.clone(1, makeStats(), 0, 0); cps.clone(2, makeStats(), 0, 0)
    expect((cps as any).lineage.size).toBe(2)
  })
})

describe('ClonePowerSystem.massClone', () => {
  it('批量克隆数量正确', () => {
    const cps = makeCPS()
    expect(cps.massClone(1, makeStats(), 5, 50, 50, 10)).toHaveLength(5)
    expect(cps.getCloneCount()).toBe(5)
  })
  it('批量克隆 0 个返回空数组', () => { expect(makeCPS().massClone(1, makeStats(), 0, 0, 0, 10)).toHaveLength(0) })
  it('每个克隆都含 clone trait', () => {
    for (const c of makeCPS().massClone(1, makeStats(), 3, 0, 0, 5)) expect(c.traits).toContain('clone')
  })
  it('所有克隆 sourceId 相同', () => {
    for (const c of makeCPS().massClone(7, makeStats(), 3, 0, 0, 5)) expect(c.sourceId).toBe(7)
  })
  it('所有克隆 generation 为 1', () => {
    for (const c of makeCPS().massClone(100, makeStats(), 3, 0, 0, 5)) expect(c.generation).toBe(1)
  })
})

describe('ClonePowerSystem.update', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('无实体时返回空数组', () => { expect(makeCPS().update(0, [])).toHaveLength(0) })
  it('非克隆实体被跳过', () => {
    const e: CloneEntity[] = [{ id: 1, isClone: false, health: 100, maxHealth: 100, age: 0 }]
    expect(makeCPS().update(0, e)).toHaveLength(0)
  })
  it('random > chance 时无退化事件', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const cps = makeCPS()
    const e: CloneEntity[] = [{ id: 1, isClone: true, health: 100, maxHealth: 100, age: 0 }]
    expect(cps.update(0, e)).toHaveLength(0)
  })
  it('update 不崩溃', () => {
    const cps = makeCPS()
    expect(() => cps.update(0, [])).not.toThrow()
  })
  it('多个非克隆实体全部跳过', () => {
    const es: CloneEntity[] = [
      { id: 1, isClone: false, health: 100, maxHealth: 100, age: 0 },
      { id: 2, isClone: false, health: 50, maxHealth: 100, age: 10 },
    ]
    expect(makeCPS().update(0, es)).toHaveLength(0)
  })
})

describe('ClonePowerSystem — 边界与综合', () => {
  it('nextCloneId 随 clone 递增', () => {
    const cps = makeCPS()
    cps.clone(1, makeStats(), 0, 0)
    expect((cps as any).nextCloneId).toBe(2)
    cps.clone(1, makeStats(), 0, 0)
    expect((cps as any).nextCloneId).toBe(3)
  })
  it('克隆 attack 大于 0', () => {
    for (let i = 0; i < 5; i++) expect(makeCPS().clone(1, makeStats({ attack: 10 }), 0, 0).attack).toBeGreaterThan(0)
  })
  it('克隆 defense 大于 0', () => {
    for (let i = 0; i < 5; i++) expect(makeCPS().clone(1, makeStats({ defense: 5 }), 0, 0).defense).toBeGreaterThan(0)
  })
  it('克隆 speed 大于 0', () => {
    for (let i = 0; i < 5; i++) expect(makeCPS().clone(1, makeStats({ speed: 3 }), 0, 0).speed).toBeGreaterThan(0)
  })
  it('gen=5 时 colorTint = 255', () => {
    const cps = makeCPS()
    ;(cps as any).lineage.set(99, { sourceId: 1, generation: 4 })
    const cd = cps.clone(99, makeStats(), 0, 0)
    expect(cd.colorTint).toBe(180 + 5 * 15)
  })
})

describe('ClonePowerSystem — 补充测试', () => {
  it('getCloneCount 返回数字类型', () => { expect(typeof makeCPS().getCloneCount()).toBe('number') })
  it('lineage 在 clone 后包含新 id', () => {
    const cps = makeCPS(); cps.clone(1, makeStats(), 0, 0)
    expect((cps as any).lineage.has(1)).toBe(true)
  })
})
