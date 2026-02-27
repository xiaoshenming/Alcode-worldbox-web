import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLullabySystem } from '../systems/CreatureLullabySystem'
import type { Lullaby } from '../systems/CreatureLullabySystem'

let nextId = 1
function makeSys(): CreatureLullabySystem { return new CreatureLullabySystem() }
function makeLullaby(singerId: number, targetId: number): Lullaby {
  return { id: nextId++, singerId, targetId, melody: 'la-la-la', soothingPower: 60, bondsFormed: 2, tick: 0 }
}

describe('CreatureLullabySystem.getLullabies', () => {
  let sys: CreatureLullabySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无摇篮曲', () => { expect(sys.getLullabies()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).lullabies.push(makeLullaby(1, 2))
    expect(sys.getLullabies()[0].singerId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).lullabies.push(makeLullaby(1, 2))
    expect(sys.getLullabies()).toBe((sys as any).lullabies)
  })
  it('多个全部返回', () => {
    ;(sys as any).lullabies.push(makeLullaby(1, 2))
    ;(sys as any).lullabies.push(makeLullaby(3, 4))
    expect(sys.getLullabies()).toHaveLength(2)
  })
})

describe('CreatureLullabySystem.getBySinger', () => {
  let sys: CreatureLullabySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('无匹配返回空', () => {
    ;(sys as any).lullabies.push(makeLullaby(1, 2))
    expect(sys.getBySinger(999)).toHaveLength(0)
  })
  it('过滤特定歌者', () => {
    ;(sys as any).lullabies.push(makeLullaby(1, 2))
    ;(sys as any).lullabies.push(makeLullaby(1, 3))
    ;(sys as any).lullabies.push(makeLullaby(2, 3))
    expect(sys.getBySinger(1)).toHaveLength(2)
  })
})
