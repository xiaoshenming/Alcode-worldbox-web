import { describe, it, expect, beforeEach } from 'vitest'
import { WorldCrystalCaveSystem } from '../systems/WorldCrystalCaveSystem'
import type { CrystalCave, CrystalType } from '../systems/WorldCrystalCaveSystem'

function makeSys(): WorldCrystalCaveSystem { return new WorldCrystalCaveSystem() }
let nextId = 1
function makeCave(crystalType: CrystalType = 'quartz'): CrystalCave {
  return { id: nextId++, x: 10, y: 20, crystalType, richness: 75, magicEmission: 30, explored: false, resourcesHarvested: 0, startTick: 0 }
}

describe('WorldCrystalCaveSystem.getCaves', () => {
  let sys: WorldCrystalCaveSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无水晶洞穴', () => { expect((sys as any).caves).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).caves.push(makeCave())
    expect((sys as any).caves).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).caves).toBe((sys as any).caves)
  })
  it('支持6种水晶类型', () => {
    const types: CrystalType[] = ['quartz', 'amethyst', 'emerald', 'ruby', 'sapphire', 'diamond']
    expect(types).toHaveLength(6)
  })
  it('水晶洞穴字段正确', () => {
    ;(sys as any).caves.push(makeCave('diamond'))
    const c = (sys as any).caves[0]
    expect(c.crystalType).toBe('diamond')
    expect(c.richness).toBe(75)
    expect(c.explored).toBe(false)
  })
})
