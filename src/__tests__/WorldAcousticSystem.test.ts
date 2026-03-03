import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAcousticSystem } from '../systems/WorldAcousticSystem'
import type { SoundSource, SoundType } from '../systems/WorldAcousticSystem'

const CHECK_INTERVAL = 700
const EFFECT_INTERVAL = 500
const MAX_SOUNDS = 50
const SOUND_DECAY = 5

let nextId = 1
function makeSys(): WorldAcousticSystem { return new WorldAcousticSystem() }
function makeSound(overrides: Partial<SoundSource> = {}): SoundSource {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    type: 'nature',
    volume: 50,
    radius: 10,
    startedAt: 0,
    duration: 500,
    ...overrides,
  }
}

const makeEm = () => ({
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
}) as any

describe('WorldAcousticSystem', () => {
  let sys: WorldAcousticSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ────────────────────────────────
  it('初始sounds数组为空', () => {
    expect((sys as any).sounds).toHaveLength(0)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lastEffect初始为0', () => {
    expect((sys as any).lastEffect).toBe(0)
  })

  it('sounds是数组类型', () => {
    expect(Array.isArray((sys as any).sounds)).toBe(true)
  })

  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).sounds.push(makeSound())
    expect((s2 as any).sounds).toHaveLength(0)
  })

  // ── CHECK_INTERVAL节�� ────────────────────────
  it('tick < CHECK_INTERVAL时不执行detectSounds，lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick < EFFECT_INTERVAL时不执行applySoundEffects，lastEffect不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeEm(), EFFECT_INTERVAL - 1)
    expect((sys as any).lastEffect).toBe(0)
  })

  it('tick >= EFFECT_INTERVAL时更新lastEffect', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeEm(), EFFECT_INTERVAL)
    expect((sys as any).lastEffect).toBe(EFFECT_INTERVAL)
  })

  it('多次update后lastCheck持续递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeEm(), CHECK_INTERVAL)
    sys.update(1, makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('第二次间隔不足CHECK_INTERVAL时lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeEm(), CHECK_INTERVAL)
    sys.update(1, makeEm(), CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('lastEffect和lastCheck分开控制', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeEm(), EFFECT_INTERVAL)  // 只触发effect
    expect((sys as any).lastEffect).toBe(EFFECT_INTERVAL)
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── cleanup（过期声音删除）──────────────────
  it('声音过期（tick-startedAt >= duration）时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sounds.push(makeSound({ startedAt: 0, duration: 100 }))
    sys.update(1, makeEm(), 700)
    expect((sys as any).sounds).toHaveLength(0)
  })

  it('未过期的声音保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sounds.push(makeSound({ startedAt: 600, duration: 500 }))
    sys.update(1, makeEm(), 700)
    expect((sys as any).sounds).toHaveLength(1)
  })

  it('混合过期和未过期：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).sounds.push(makeSound({ startedAt: 0, duration: 100 }))
    ;(sys as any).sounds.push(makeSound({ startedAt: 600, duration: 500 }))
    sys.update(1, makeEm(), 700)
    expect((sys as any).sounds).toHaveLength(1)
    expect((sys as any).sounds[0].startedAt).toBe(600)
  })

  it('所有声音都过期时全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) {
      ;(sys as any).sounds.push(makeSound({ startedAt: 0, duration: 100 }))
    }
    sys.update(1, makeEm(), 700)
    expect((sys as any).sounds).toHaveLength(0)
  })

  // ── volume衰减 ─────────────────────────���──────
  it('applySoundEffects触发后volume衰减SOUND_DECAY', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sound = makeSound({ volume: 50, startedAt: 0, duration: 9999 })
    ;(sys as any).sounds.push(sound)
    sys.update(1, makeEm(), EFFECT_INTERVAL)
    expect((sys as any).sounds[0].volume).toBe(45)
  })

  it('volume不低于0（衰减到0不为负数）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sound = makeSound({ volume: 3, startedAt: 0, duration: 9999 })
    ;(sys as any).sounds.push(sound)
    sys.update(1, makeEm(), EFFECT_INTERVAL)
    expect((sys as any).sounds[0].volume).toBe(0)
  })

  it('volume=0时不变为负数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sound = makeSound({ volume: 0, startedAt: 0, duration: 9999 })
    ;(sys as any).sounds.push(sound)
    sys.update(1, makeEm(), EFFECT_INTERVAL)
    expect((sys as any).sounds[0].volume).toBe(0)
  })

  it('多个sounds都衰减SOUND_DECAY', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).sounds.push(makeSound({ volume: 50, startedAt: 0, duration: 9999 }))
    }
    sys.update(1, makeEm(), EFFECT_INTERVAL)
    for (const s of (sys as any).sounds) {
      expect(s.volume).toBe(45)
    }
  })

  // ── getActiveSounds ────────────────────────────
  it('getActiveSounds只返回volume > 0的声音', () => {
    ;(sys as any).sounds.push(makeSound({ volume: 50 }))
    ;(sys as any).sounds.push(makeSound({ volume: 0 }))
    expect(sys.getActiveSounds()).toHaveLength(1)
  })

  it('getActiveSounds全为0时返回空数组', () => {
    ;(sys as any).sounds.push(makeSound({ volume: 0 }))
    ;(sys as any).sounds.push(makeSound({ volume: 0 }))
    expect(sys.getActiveSounds()).toHaveLength(0)
  })

  it('getActiveSounds全volume>0时全部返回', () => {
    ;(sys as any).sounds.push(makeSound({ volume: 10 }))
    ;(sys as any).sounds.push(makeSound({ volume: 80 }))
    ;(sys as any).sounds.push(makeSound({ volume: 1 }))
    expect(sys.getActiveSounds()).toHaveLength(3)
  })

  it('getActiveSounds复用内部缓冲（返回同一引用）', () => {
    const r1 = sys.getActiveSounds()
    const r2 = sys.getActiveSounds()
    expect(r1).toBe(r2)
  })

  it('getActiveSounds空sounds时返回空', () => {
    expect(sys.getActiveSounds()).toHaveLength(0)
  })

  it('getActiveSounds混合volume结果正确', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).sounds.push(makeSound({ volume: i }))
    }
    // volume: 0,1,2,3,4 → 4 active
    expect(sys.getActiveSounds()).toHaveLength(4)
  })

  // ── 手动注入 ────────────────────────────────
  it('手动注入后长度正确', () => {
    ;(sys as any).sounds.push(makeSound())
    expect((sys as any).sounds).toHaveLength(1)
  })

  it('注入多个声音后长度正确', () => {
    for (let i = 0; i < 5; i++) (sys as any).sounds.push(makeSound())
    expect((sys as any).sounds).toHaveLength(5)
  })

  it('手动注入sound的字段可读取', () => {
    const s = makeSound({ volume: 77, type: 'battle' })
    ;(sys as any).sounds.push(s)
    expect((sys as any).sounds[0].volume).toBe(77)
    expect((sys as any).sounds[0].type).toBe('battle')
  })

  // ── 声音类型覆盖 ────────────────────────────
  it('支持全部6种SoundType', () => {
    const types: SoundType[] = ['battle', 'construction', 'nature', 'music', 'thunder', 'eruption']
    expect(types).toHaveLength(6)
    types.forEach(t => {
      const s = makeSound({ type: t })
      expect(s.type).toBe(t)
    })
  })

  it('battle类型声音可创建', () => {
    const s = makeSound({ type: 'battle' })
    expect(s.type).toBe('battle')
  })

  it('thunder类型声音可创建', () => {
    const s = makeSound({ type: 'thunder' })
    expect(s.type).toBe('thunder')
  })

  it('eruption类型声音可创建', () => {
    const s = makeSound({ type: 'eruption' })
    expect(s.type).toBe('eruption')
  })

  // ── setWorldSize不报错 ──────────────────────
  it('setWorldSize调用不报错', () => {
    expect(() => sys.setWorldSize(200, 200)).not.toThrow()
  })

  it('setWorldSize不同参数不报错', () => {
    expect(() => sys.setWorldSize(100, 150)).not.toThrow()
    expect(() => sys.setWorldSize(0, 0)).not.toThrow()
  })

  // ── 边界条件 ────────────────────────────────
  it('tick=0时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).lastEffect).toBe(0)
  })

  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeEm(), 9999999)).not.toThrow()
  })
})
