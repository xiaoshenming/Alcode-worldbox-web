import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePotterySystem } from '../systems/CreaturePotterySystem'
import type { Pottery, PotteryStyle, PotteryUse } from '../systems/CreaturePotterySystem'

let nextId = 1
function makeSys(): CreaturePotterySystem { return new CreaturePotterySystem() }
function makePottery(crafterId: number, style: PotteryStyle = 'coiled', use: PotteryUse = 'storage'): Pottery {
  return { id: nextId++, crafterId, style, use, quality: 70, durability: 65, tradeValue: 20, tick: 0 }
}

describe('CreaturePotterySystem.getPottery', () => {
  let sys: CreaturePotterySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无陶器', () => { expect((sys as any).pottery).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).pottery.push(makePottery(1, 'wheel-thrown', 'cooking'))
    expect((sys as any).pottery[0].style).toBe('wheel-thrown')
  })
  it('返回内部引用', () => {
    ;(sys as any).pottery.push(makePottery(1))
    expect((sys as any).pottery).toBe((sys as any).pottery)
  })
  it('支持所有6种风格', () => {
    const styles: PotteryStyle[] = ['coiled', 'wheel-thrown', 'slab-built', 'pinched', 'molded', 'glazed']
    styles.forEach((s, i) => { ;(sys as any).pottery.push(makePottery(i + 1, s)) })
    expect((sys as any).pottery).toHaveLength(6)
  })
  it('多个全部返回', () => {
    ;(sys as any).pottery.push(makePottery(1))
    ;(sys as any).pottery.push(makePottery(2))
    expect((sys as any).pottery).toHaveLength(2)
  })
})
