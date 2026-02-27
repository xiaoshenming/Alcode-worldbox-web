import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureEnchantingSystem } from '../systems/CreatureEnchantingSystem'
import type { Enchantment, EnchantType } from '../systems/CreatureEnchantingSystem'

let nextId = 1
function makeSys(): CreatureEnchantingSystem { return new CreatureEnchantingSystem() }
function makeEnchant(target: number, type: EnchantType = 'sharpness'): Enchantment {
  return { id: nextId++, type, power: 50, target, duration: 100, tick: 0 }
}

describe('CreatureEnchantingSystem.getEnchantments', () => {
  let sys: CreatureEnchantingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无附魔', () => { expect(sys.getEnchantments()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).enchantments.push(makeEnchant(1, 'frost'))
    expect(sys.getEnchantments()[0].type).toBe('frost')
  })

  it('返回内部引用', () => {
    ;(sys as any).enchantments.push(makeEnchant(1))
    expect(sys.getEnchantments()).toBe((sys as any).enchantments)
  })

  it('支持所有 6 种附魔类型', () => {
    const types: EnchantType[] = ['sharpness', 'protection', 'swiftness', 'vitality', 'flame', 'frost']
    types.forEach((t, i) => { ;(sys as any).enchantments.push(makeEnchant(i + 1, t)) })
    const all = sys.getEnchantments()
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
})

describe('CreatureEnchantingSystem.getSkill', () => {
  let sys: CreatureEnchantingSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 0', () => { expect(sys.getSkill(999)).toBe(0) })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 88)
    expect(sys.getSkill(42)).toBe(88)
  })
})
