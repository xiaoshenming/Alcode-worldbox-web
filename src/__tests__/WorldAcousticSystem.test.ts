import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldAcousticSystem } from '../systems/WorldAcousticSystem'
import type { SoundSource, SoundType } from '../systems/WorldAcousticSystem'

// 常量镜像
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

// em mock：阻止detectSounds产生新声音
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

  // ── CHECK_INTERVAL节流 ────────────────────────
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

  // ── cleanup（过期声音删除）──────────────────
  it('声音过期（tick-startedAt >= duration）时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // startedAt=0, duration=100；tick=200 → 200-0=200 >= 100 → 过期
    ;(sys as any).sounds.push(makeSound({ startedAt: 0, duration: 100 }))
    sys.update(1, makeEm(), 200)
    // cleanup在detectSounds里触发（tick=200 >= CHECK_INTERVAL=700? 不触发）
    // 需要tick >= CHECK_INTERVAL才会调detectSounds
    // 所以用tick=700，startedAt=0, duration=100 → 700-0>=100 → 删除
    sys.update(1, makeEm(), 700)
    expect((sys as any).sounds).toHaveLength(0)
  })

  it('未过期的声音保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // startedAt=600, duration=500；tick=700 → 700-600=100 < 500 → 未过期
    ;(sys as any).sounds.push(makeSound({ startedAt: 600, duration: 500 }))
    sys.update(1, makeEm(), 700)
    expect((sys as any).sounds).toHaveLength(1)
  })

  it('混合过期和未过期：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // 过期：startedAt=0, duration=100
    ;(sys as any).sounds.push(makeSound({ startedAt: 0, duration: 100 }))
    // 未过期：startedAt=600, duration=500
    ;(sys as any).sounds.push(makeSound({ startedAt: 600, duration: 500 }))
    sys.update(1, makeEm(), 700)
    expect((sys as any).sounds).toHaveLength(1)
    expect((sys as any).sounds[0].startedAt).toBe(600)
  })

  // ── volume衰减 ────────────────────────────────
  it('applySoundEffects触发后volume衰减SOUND_DECAY', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sound = makeSound({ volume: 50, startedAt: 0, duration: 9999 })
    ;(sys as any).sounds.push(sound)
    // EFFECT_INTERVAL=500，tick=500 触发applySoundEffects
    sys.update(1, makeEm(), EFFECT_INTERVAL)
    // volume -= SOUND_DECAY = 5 → 45
    expect((sys as any).sounds[0].volume).toBe(45)
  })

  it('volume不低于0（衰减到0不为负数）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const sound = makeSound({ volume: 3, startedAt: 0, duration: 9999 })
    ;(sys as any).sounds.push(sound)
    sys.update(1, makeEm(), EFFECT_INTERVAL)
    expect((sys as any).sounds[0].volume).toBe(0)
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

  // ── 手动注入 ────────────────────────────────
  it('手动注入后长度正确', () => {
    ;(sys as any).sounds.push(makeSound())
    expect((sys as any).sounds).toHaveLength(1)
  })

  it('注入多个声音后长度正确', () => {
    for (let i = 0; i < 5; i++) (sys as any).sounds.push(makeSound())
    expect((sys as any).sounds).toHaveLength(5)
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

  // ── setWorldSize不报错 ──────────────────────
  it('setWorldSize调用不报错', () => {
    expect(() => sys.setWorldSize(200, 200)).not.toThrow()
  })
})
