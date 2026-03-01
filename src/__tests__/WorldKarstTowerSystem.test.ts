import { describe, it, expect, beforeEach } from 'vitest'
import { WorldKarstTowerSystem } from '../systems/WorldKarstTowerSystem'
import type { KarstTower } from '../systems/WorldKarstTowerSystem'

function makeSys(): WorldKarstTowerSystem { return new WorldKarstTowerSystem() }
let nextId = 1
function makeTower(): KarstTower {
  return { id: nextId++, x: 20, y: 30, radius: 5, height: 20, erosionRate: 2, vegetationCover: 40, caveCount: 3, stability: 70, tick: 0 }
}

describe('WorldKarstTowerSystem.getTowers', () => {
  let sys: WorldKarstTowerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无岩溶塔', () => { expect((sys as any).towers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).towers.push(makeTower())
    expect((sys as any).towers).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).towers).toBe((sys as any).towers)
  })
  it('岩溶塔字段正确', () => {
    ;(sys as any).towers.push(makeTower())
    const t = (sys as any).towers[0]
    expect(t.height).toBe(20)
    expect(t.caveCount).toBe(3)
    expect(t.stability).toBe(70)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
})
