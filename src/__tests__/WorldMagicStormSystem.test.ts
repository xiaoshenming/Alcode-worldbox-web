import { describe, it, expect, beforeEach } from 'vitest'
import { WorldMagicStormSystem } from '../systems/WorldMagicStormSystem'
import type { MagicStorm, EnchantedZone, MagicStormType } from '../systems/WorldMagicStormSystem'

function makeSys(): WorldMagicStormSystem { return new WorldMagicStormSystem() }
let nextId = 1
function makeStorm(type: MagicStormType = 'arcane'): MagicStorm {
  return { id: nextId++, type, x: 50, y: 50, radius: 10, intensity: 7, dx: 0.5, dy: 0.3, age: 0, maxAge: 3000, mutationsApplied: 0 }
}
function makeZone(type: MagicStormType = 'void'): EnchantedZone {
  return { x: 20, y: 20, radius: 8, type, power: 60, decayAt: 5000 }
}

describe('WorldMagicStormSystem.getStorms', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无魔法风暴', () => { expect(sys.getStorms()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).storms.push(makeStorm())
    expect(sys.getStorms()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getStorms()).toBe((sys as any).storms)
  })
  it('支持5种魔法风暴类型', () => {
    const types: MagicStormType[] = ['arcane', 'void', 'elemental', 'spirit', 'chaos']
    expect(types).toHaveLength(5)
  })
})

describe('WorldMagicStormSystem.getEnchantedZones', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys() })

  it('初始无魔法区域', () => { expect(sys.getEnchantedZones()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).enchantedZones.push(makeZone())
    expect(sys.getEnchantedZones()).toHaveLength(1)
  })
})

describe('WorldMagicStormSystem.getStormCount', () => {
  let sys: WorldMagicStormSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始为0', () => { expect(sys.getStormCount()).toBe(0) })
  it('注入后增加', () => {
    ;(sys as any).storms.push(makeStorm('chaos'))
    ;(sys as any).storms.push(makeStorm('spirit'))
    expect(sys.getStormCount()).toBe(2)
  })
})
