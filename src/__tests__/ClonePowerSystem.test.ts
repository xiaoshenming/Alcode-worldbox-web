import { describe, it, expect, beforeEach } from 'vitest'
import { ClonePowerSystem } from '../systems/ClonePowerSystem'
import type { CreatureStats } from '../systems/ClonePowerSystem'

// ClonePowerSystem 测试：
// - clone()              → 创建克隆，记录血统，返回 CloneData
// - massClone()          → 批量克隆，数量正确
// - getCloneCount()      → 返回总克隆数
// - getGeneration()      → 返回克隆代数，无记录返回 0
// - getCloneLineage()    → 返回血统链
// render() 依赖 CanvasRenderingContext2D，不在此测试。

function makeCPS(): ClonePowerSystem {
  return new ClonePowerSystem()
}

function makeStats(overrides: Partial<CreatureStats> = {}): CreatureStats {
  return {
    species: 'human', health: 100, maxHealth: 100,
    attack: 10, defense: 5, speed: 3, age: 0, traits: [],
    ...overrides,
  }
}

describe('ClonePowerSystem.getCloneCount', () => {
  it('初始克隆数量为 0', () => {
    expect(makeCPS().getCloneCount()).toBe(0)
  })

  it('clone 一次后数量为 1', () => {
    const cps = makeCPS()
    cps.clone(1, makeStats(), 0, 0)
    expect(cps.getCloneCount()).toBe(1)
  })

  it('多次 clone 累加', () => {
    const cps = makeCPS()
    cps.clone(1, makeStats(), 0, 0)
    cps.clone(1, makeStats(), 5, 5)
    cps.clone(1, makeStats(), 10, 10)
    expect(cps.getCloneCount()).toBe(3)
  })
})

describe('ClonePowerSystem.clone', () => {
  let cps: ClonePowerSystem

  beforeEach(() => { cps = makeCPS() })

  it('克隆包含正确的坐标', () => {
    const cd = cps.clone(1, makeStats(), 20, 30)
    expect(cd.x).toBe(20)
    expect(cd.y).toBe(30)
  })

  it('克隆包含源 id', () => {
    const cd = cps.clone(42, makeStats(), 0, 0)
    expect(cd.sourceId).toBe(42)
  })

  it('首次克隆代数为 1（源实体代数为 0）', () => {
    const cd = cps.clone(1, makeStats(), 0, 0)
    expect(cd.generation).toBe(1)
  })

  it('克隆物种与源一致', () => {
    const cd = cps.clone(1, makeStats({ species: 'elf' }), 0, 0)
    expect(cd.species).toBe('elf')
  })

  it('克隆年龄重置为 0', () => {
    const cd = cps.clone(1, makeStats({ age: 50 }), 0, 0)
    expect(cd.age).toBe(0)
  })

  it('clone trait 会被添加', () => {
    const cd = cps.clone(1, makeStats(), 0, 0)
    expect(cd.traits).toContain('clone')
  })

  it('源实体原有 clone trait 不重复添加', () => {
    const cd = cps.clone(1, makeStats({ traits: ['clone'] }), 0, 0)
    expect(cd.traits.filter(t => t === 'clone')).toHaveLength(1)
  })

  it('第 5+ 代克隆添加 unstable trait', () => {
    // 需要链式克隆到第5代
    const cps = makeCPS()
    let id = 100
    let prevId = 1
    for (let gen = 1; gen <= 5; gen++) {
      const cd = cps.clone(prevId, makeStats(), 0, 0)
      // 给新克隆注入 lineage 让下次能正确推导代数
      ;(cps as any).lineage.set(id, { sourceId: prevId, generation: gen })
      prevId = id
      id++
      if (gen === 5) {
        expect(cd.traits).toContain('unstable')
      }
    }
  })

  it('generation 上限为 MAX_CLONE_GENERATION=5', () => {
    const cps = makeCPS()
    // 注入一个代数为 5 的实体
    ;(cps as any).lineage.set(99, { sourceId: 1, generation: 5 })
    const cd = cps.clone(99, makeStats(), 0, 0)
    expect(cd.generation).toBe(5)  // min(6, 5) = 5
  })

  it('colorTint 随代数增加', () => {
    const cd1 = cps.clone(1, makeStats(), 0, 0)  // gen=1
    const cps2 = makeCPS()
    ;(cps2 as any).lineage.set(99, { sourceId: 1, generation: 2 })
    const cd2 = cps2.clone(99, makeStats(), 0, 0)  // gen=3
    expect(cd2.colorTint).toBeGreaterThan(cd1.colorTint)
  })
})

describe('ClonePowerSystem.getGeneration', () => {
  it('未知实体返回 0', () => {
    expect(makeCPS().getGeneration(999)).toBe(0)
  })

  it('通过 clone 创建后返回正确代数', () => {
    const cps = makeCPS()
    const cd = cps.clone(1, makeStats(), 0, 0)
    const cloneId = (cps as any).nextCloneId - 1
    expect(cps.getGeneration(cloneId)).toBe(1)
  })

  it('直接注入 lineage 后可查询', () => {
    const cps = makeCPS()
    ;(cps as any).lineage.set(10, { sourceId: 1, generation: 3 })
    expect(cps.getGeneration(10)).toBe(3)
  })
})

describe('ClonePowerSystem.getCloneLineage', () => {
  it('非克隆实体只包含自身', () => {
    const cps = makeCPS()
    expect(cps.getCloneLineage(1)).toEqual([1])
  })

  it('一代克隆返回 [source, clone]', () => {
    const cps = makeCPS()
    cps.clone(1, makeStats(), 0, 0)
    const cloneId = (cps as any).nextCloneId - 1
    const chain = cps.getCloneLineage(cloneId)
    expect(chain).toHaveLength(2)
    expect(chain[0]).toBe(1)
    expect(chain[chain.length - 1]).toBe(cloneId)
  })

  it('深层血统链正确', () => {
    const cps = makeCPS()
    // 注入 entity1 -> entity2 -> entity3 的血统
    ;(cps as any).lineage.set(2, { sourceId: 1, generation: 1 })
    ;(cps as any).lineage.set(3, { sourceId: 2, generation: 2 })
    const chain = cps.getCloneLineage(3)
    expect(chain[0]).toBe(1)
    expect(chain[1]).toBe(2)
    expect(chain[2]).toBe(3)
  })
})

describe('ClonePowerSystem.massClone', () => {
  it('批量克隆数量正确', () => {
    const cps = makeCPS()
    const clones = cps.massClone(1, makeStats(), 5, 50, 50, 10)
    expect(clones).toHaveLength(5)
    expect(cps.getCloneCount()).toBe(5)
  })

  it('批量克隆 0 个时返回空数组', () => {
    const cps = makeCPS()
    const clones = cps.massClone(1, makeStats(), 0, 0, 0, 10)
    expect(clones).toHaveLength(0)
  })

  it('每个克隆都包含 clone trait', () => {
    const cps = makeCPS()
    const clones = cps.massClone(1, makeStats(), 3, 0, 0, 5)
    for (const c of clones) {
      expect(c.traits).toContain('clone')
    }
  })
})
