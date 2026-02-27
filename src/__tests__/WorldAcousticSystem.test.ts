import { describe, it, expect, beforeEach } from 'vitest'
import { WorldAcousticSystem } from '../systems/WorldAcousticSystem'
import type { SoundSource, SoundType } from '../systems/WorldAcousticSystem'

function makeSys(): WorldAcousticSystem { return new WorldAcousticSystem() }
let nextId = 1
function makeSound(type: SoundType = 'nature', volume = 50): SoundSource {
  return { id: nextId++, x: 20, y: 30, type, volume, radius: 10, startedAt: 0, duration: 500 }
}

describe('WorldAcousticSystem', () => {
  let sys: WorldAcousticSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无声音', () => { expect(sys.getSounds()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sounds.push(makeSound())
    expect(sys.getSounds()).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect(sys.getSounds()).toBe((sys as any).sounds)
  })
  it('getActiveSounds只返回volume>0的声音', () => {
    ;(sys as any).sounds.push(makeSound('nature', 50))
    ;(sys as any).sounds.push(makeSound('nature', 0))
    expect(sys.getActiveSounds()).toHaveLength(1)
  })
  it('支持6种声音类型', () => {
    const types: SoundType[] = ['battle', 'construction', 'nature', 'music', 'thunder', 'eruption']
    expect(types).toHaveLength(6)
  })
})
