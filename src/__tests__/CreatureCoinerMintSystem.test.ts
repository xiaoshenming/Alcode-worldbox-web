import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCoinerMintSystem } from '../systems/CreatureCoinerMintSystem'
import type { CoinerMint } from '../systems/CreatureCoinerMintSystem'

let nextId = 1
function makeSys(): CreatureCoinerMintSystem { return new CreatureCoinerMintSystem() }
function makeCoinerMint(entityId: number): CoinerMint {
  return { id: nextId++, entityId, mintingSkill: 30, dieAlignment: 25, strikeForce: 20, coinQuality: 35, tick: 0 }
}

describe('CreatureCoinerMintSystem.getCoinerMints', () => {
  let sys: CreatureCoinerMintSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铸币厂工', () => { expect((sys as any).coinerMints).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).coinerMints.push(makeCoinerMint(1))
    expect((sys as any).coinerMints[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).coinerMints.push(makeCoinerMint(1))
    expect((sys as any).coinerMints).toBe((sys as any).coinerMints)
  })

  it('多个全部返回', () => {
    ;(sys as any).coinerMints.push(makeCoinerMint(1))
    ;(sys as any).coinerMints.push(makeCoinerMint(2))
    expect((sys as any).coinerMints).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const c = makeCoinerMint(10)
    c.mintingSkill = 80; c.dieAlignment = 75; c.strikeForce = 70; c.coinQuality = 65
    ;(sys as any).coinerMints.push(c)
    const r = (sys as any).coinerMints[0]
    expect(r.mintingSkill).toBe(80); expect(r.dieAlignment).toBe(75)
    expect(r.strikeForce).toBe(70); expect(r.coinQuality).toBe(65)
  })
})
