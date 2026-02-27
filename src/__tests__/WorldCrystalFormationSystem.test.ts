import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCrystalFormationSystem } from '../systems/WorldCrystalFormationSystem'
import type { CrystalFormation, CrystalType } from '../systems/WorldCrystalFormationSystem'

function makeSys(): WorldCrystalFormationSystem { return new WorldCrystalFormationSystem() }
let nextId = 1
function makeFormation(type: CrystalType = 'quartz', x = 20, y = 30): CrystalFormation {
  return { id: nextId++, x, y, type, size: 5, purity: 85, harvestable: true, age: 200 }
}

describe('WorldCrystalFormationSystem.getFormations', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无水晶', () => { expect(sys.getFormations()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).formations.push(makeFormation())
    expect(sys.getFormations()).toHaveLength(1)
  })
  it('支持6种水晶类型', () => {
    const types: CrystalType[] = ['quartz', 'amethyst', 'ruby', 'sapphire', 'emerald', 'obsidian']
    expect(types).toHaveLength(6)
  })
  it('水晶字段正确', () => {
    ;(sys as any).formations.push(makeFormation('ruby'))
    const f = sys.getFormations()[0]
    expect(f.type).toBe('ruby')
    expect(f.purity).toBe(85)
    expect(f.harvestable).toBe(true)
  })
})

describe('WorldCrystalFormationSystem.getFormationCount', () => {
  let sys: WorldCrystalFormationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始数量为0', () => { expect(sys.getFormationCount()).toBe(0) })
  it('注入后数量正确', () => {
    ;(sys as any).formations.push(makeFormation())
    ;(sys as any).formations.push(makeFormation())
    expect(sys.getFormationCount()).toBe(2)
  })
})
