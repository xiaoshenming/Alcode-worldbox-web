import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBountySystem } from '../systems/CreatureBountySystem'
import type { Bounty } from '../systems/CreatureBountySystem'

let nextId = 1
function makeSys(): CreatureBountySystem { return new CreatureBountySystem() }
function makeBounty(targetId: number, claimed = false): Bounty {
  return {
    id: nextId++, targetId, posterId: 1, reward: 100,
    reason: 'enemy', postedTick: 0, claimed, claimedBy: null, expiresAt: 9999, displayStr: '#1 - 100g - enemy'
  }
}

describe('CreatureBountySystem.getActiveBounties', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无悬赏', () => { expect((sys as any).bounties.filter((b: {claimed: boolean}) => !b.claimed)).toHaveLength(0) })

  it('未认领的悬赏被返回', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    expect((sys as any).bounties.filter((b: {claimed: boolean}) => !b.claimed)).toHaveLength(1)
  })

  it('已认领的悬赏不被返回', () => {
    ;(sys as any).bounties.push(makeBounty(1, true))
    expect((sys as any).bounties.filter((b: {claimed: boolean}) => !b.claimed)).toHaveLength(0)
  })

  it('混合时只返回未认领', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    ;(sys as any).bounties.push(makeBounty(2, true))
    ;(sys as any).bounties.push(makeBounty(3, false))
    expect((sys as any).bounties.filter((b: {claimed: boolean}) => !b.claimed)).toHaveLength(2)
  })
})

describe('CreatureBountySystem.getBountyOn', () => {
  let sys: CreatureBountySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无悬赏时返回 null', () => {
    expect(sys.getBountyOn(999)).toBeNull()
  })

  it('存在未认领悬赏时返回', () => {
    ;(sys as any).bounties.push(makeBounty(42, false))
    const b = sys.getBountyOn(42)
    expect(b).not.toBeNull()
    expect(b!.targetId).toBe(42)
  })

  it('已认领悬赏返回 null', () => {
    ;(sys as any).bounties.push(makeBounty(42, true))
    expect(sys.getBountyOn(42)).toBeNull()
  })

  it('多个目标时只返回匹配的', () => {
    ;(sys as any).bounties.push(makeBounty(1, false))
    ;(sys as any).bounties.push(makeBounty(2, false))
    expect(sys.getBountyOn(2)!.targetId).toBe(2)
  })
})
