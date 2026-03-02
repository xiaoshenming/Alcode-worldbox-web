import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MusicSystem } from '../systems/MusicSystem'

function makeSys() { return new MusicSystem() }

// ────────────────────────────────────────────────
// describe 1: 初始状态
// ────────────────────────────────────────────────
describe('MusicSystem — 初始状态', () => {
  let sys: MusicSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('初始 ctx 为 null', () => { expect((sys as any).ctx).toBeNull() })
  it('初始 masterVolume 为 0.3', () => { expect((sys as any).masterVolume).toBe(0.3) })
  it('初始 musicVolume 为 0.5', () => { expect((sys as any).musicVolume).toBe(0.5) })
  it('初始 ambientVolume 为 0.4', () => { expect((sys as any).ambientVolume).toBe(0.4) })
  it('初始 muted 为 false', () => { expect((sys as any).muted).toBe(false) })
  it('初始 currentMood 为 peaceful', () => { expect((sys as any).currentMood).toBe('peaceful') })
  it('初始 targetMood 为 peaceful', () => { expect((sys as any).targetMood).toBe('peaceful') })
  it('初始 barIndex 为 0', () => { expect((sys as any).barIndex).toBe(0) })
  it('初始 started 为 false', () => { expect((sys as any).started).toBe(false) })
  it('初始 activeFade 为 A', () => { expect((sys as any).activeFade).toBe('A') })
  it('初始 nextBarTime 为 0', () => { expect((sys as any).nextBarTime).toBe(0) })
  it('初始 masterGain 为 null', () => { expect((sys as any).masterGain).toBeNull() })
  it('初始 musicGain 为 null', () => { expect((sys as any).musicGain).toBeNull() })
  it('初始 ambientGain 为 null', () => { expect((sys as any).ambientGain).toBeNull() })
  it('初始 windSource 为 null', () => { expect((sys as any).windSource).toBeNull() })
  it('初始 waterSource 为 null', () => { expect((sys as any).waterSource).toBeNull() })
  it('初始 rainSource 为 null', () => { expect((sys as any).rainSource).toBeNull() })
  it('初始 rainGainNode 为 null', () => { expect((sys as any).rainGainNode).toBeNull() })
  it('初始 fadeGainA 为 null', () => { expect((sys as any).fadeGainA).toBeNull() })
  it('初始 fadeGainB 为 null', () => { expect((sys as any).fadeGainB).toBeNull() })
  it('初始 noiseBuffer 为 null', () => { expect((sys as any).noiseBuffer).toBeNull() })
  it('初始 lastBirdTime 为 0', () => { expect((sys as any).lastBirdTime).toBe(0) })
  it('初始 lastInsectTime 为 0', () => { expect((sys as any).lastInsectTime).toBe(0) })
})

// ────────────────────────────────────────────────
// describe 2: setMuted
// ────────────────────────────────────────────────
describe('MusicSystem — setMuted()', () => {
  let sys: MusicSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('setMuted(true) 设置 muted=true', () => {
    sys.setMuted(true)
    expect((sys as any).muted).toBe(true)
  })

  it('setMuted(false) 设置 muted=false（注入假 ctx 绕过 AudioContext）', () => {
    // setMuted(false) 调用 getCtx()，需要注入假 ctx 避免真实 AudioContext
    const fakeCtx = { state: 'running', resume: vi.fn(), currentTime: 0 }
    const fakeGain = { gain: { value: 0, setValueAtTime: vi.fn() } }
    ;(sys as any).ctx = fakeCtx
    ;(sys as any).masterGain = fakeGain
    ;(sys as any).muted = true
    sys.setMuted(false)
    expect((sys as any).muted).toBe(false)
  })

  it('连续 setMuted(true) 幂等', () => {
    sys.setMuted(true)
    sys.setMuted(true)
    expect((sys as any).muted).toBe(true)
  })

  it('ctx 为 null 时 setMuted(true) 不崩溃', () => {
    expect(() => sys.setMuted(true)).not.toThrow()
  })

  it('ctx 为 null 时 setMuted(false) 会尝试创建 AudioContext（Node 环境抛出 ReferenceError）', () => {
    // 这个测试确认：在 Node 环境下调用 setMuted(false) 会因 AudioContext 不存在而抛出
    // 这是环境限制，不是系统 bug
    expect(() => sys.setMuted(false)).toThrow()
  })

  it('setMuted(true) 后 muted 字段持久化', () => {
    sys.setMuted(true)
    // 再读一次，依然是 true
    expect((sys as any).muted).toBe(true)
  })
})

// ────────────────────────────────────────────────
// describe 3: setMasterVolume
// ────────────────────────────────────────────────
describe('MusicSystem — setMasterVolume()', () => {
  let sys: MusicSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('正常值 0.5 写入', () => {
    sys.setMasterVolume(0.5)
    expect((sys as any).masterVolume).toBe(0.5)
  })

  it('传入 0 写入 0', () => {
    sys.setMasterVolume(0)
    expect((sys as any).masterVolume).toBe(0)
  })

  it('传入 1 写入 1', () => {
    sys.setMasterVolume(1)
    expect((sys as any).masterVolume).toBe(1)
  })

  it('传入负数被 clamp 到 0', () => {
    sys.setMasterVolume(-5)
    expect((sys as any).masterVolume).toBe(0)
  })

  it('传入超过 1 被 clamp 到 1', () => {
    sys.setMasterVolume(99)
    expect((sys as any).masterVolume).toBe(1)
  })

  it('ctx 为 null 时 setMasterVolume 不崩溃', () => {
    expect(() => sys.setMasterVolume(0.7)).not.toThrow()
  })

  it('muted 时 setMasterVolume 仍更新字段', () => {
    sys.setMuted(true)
    sys.setMasterVolume(0.8)
    expect((sys as any).masterVolume).toBe(0.8)
  })

  it('多次设置取最后值', () => {
    sys.setMasterVolume(0.2)
    sys.setMasterVolume(0.6)
    expect((sys as any).masterVolume).toBeCloseTo(0.6)
  })
})

// ────────────────────────────────────────────────
// describe 4: dispose
// ────────────────────────────────────────────────
describe('MusicSystem — dispose()', () => {
  let sys: MusicSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('ctx 为 null 时 dispose 不崩溃', () => {
    expect(() => sys.dispose()).not.toThrow()
  })

  it('dispose 后 started 为 false', () => {
    (sys as any).started = true
    sys.dispose()
    expect((sys as any).started).toBe(false)
  })

  it('dispose 后 masterGain 为 null', () => {
    sys.dispose()
    expect((sys as any).masterGain).toBeNull()
  })

  it('dispose 后 musicGain 为 null', () => {
    sys.dispose()
    expect((sys as any).musicGain).toBeNull()
  })

  it('dispose 后 ambientGain 为 null', () => {
    sys.dispose()
    expect((sys as any).ambientGain).toBeNull()
  })

  it('dispose 后 fadeGainA 为 null', () => {
    sys.dispose()
    expect((sys as any).fadeGainA).toBeNull()
  })

  it('dispose 后 fadeGainB 为 null', () => {
    sys.dispose()
    expect((sys as any).fadeGainB).toBeNull()
  })

  it('多次 dispose 不崩溃', () => {
    expect(() => {
      sys.dispose()
      sys.dispose()
      sys.dispose()
    }).not.toThrow()
  })
})

// ────────────────────────────────────────────────
// describe 5: update() 无 AudioContext 时的行为
// ────────────────────────────────────────────────
describe('MusicSystem — update() 无 AudioContext', () => {
  let sys: MusicSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  const baseState = {
    isNight: false, atWar: false, disasterActive: false, isEpic: false, isRaining: false
  }

  it('ctx 为 null 时 update 不崩溃 — peaceful', () => {
    expect(() => sys.update({ ...baseState })).not.toThrow()
  })

  it('ctx 为 null 时 update 不崩溃 — atWar=true', () => {
    expect(() => sys.update({ ...baseState, atWar: true })).not.toThrow()
  })

  it('ctx 为 null 时 update 不崩溃 — isNight=true', () => {
    expect(() => sys.update({ ...baseState, isNight: true })).not.toThrow()
  })

  it('ctx 为 null 时 update 不崩溃 — disasterActive=true', () => {
    expect(() => sys.update({ ...baseState, disasterActive: true })).not.toThrow()
  })

  it('ctx 为 null 时 update 不崩溃 — isEpic=true', () => {
    expect(() => sys.update({ ...baseState, isEpic: true })).not.toThrow()
  })

  it('ctx 为 null 时 update 不崩溃 — isRaining=true', () => {
    expect(() => sys.update({ ...baseState, isRaining: true })).not.toThrow()
  })

  it('ctx 为 null 时多次 update 不崩溃', () => {
    expect(() => {
      for (let i = 0; i < 10; i++) sys.update({ ...baseState })
    }).not.toThrow()
  })
})

// ────────────────────────────────────────────────
// describe 6: mood 优先级逻辑（不依赖 AudioContext）
// ────────────────────────────────────────────────
describe('MusicSystem — Mood 优先级判定', () => {
  let sys: MusicSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 注入假 ctx，阻止真实 Web Audio 被调用
  function injectFakeCtx() {
    const makeGain = () => ({
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })
    const fakeCtx = {
      state: 'running',
      currentTime: 100,
      createGain: vi.fn(() => makeGain()),
      createOscillator: vi.fn(() => ({
        type: '',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          value: 440,
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createBiquadFilter: vi.fn(() => ({
        type: '',
        frequency: { value: 0 },
        Q: { value: 0 },
        connect: vi.fn(),
      })),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        loop: false,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createBuffer: vi.fn(() => ({ getChannelData: vi.fn(() => new Float32Array(1)) })),
      sampleRate: 44100,
      destination: {},
      close: vi.fn(),
    }
    const fakeGain = makeGain()
    ;(sys as any).ctx = fakeCtx
    ;(sys as any).masterGain = fakeGain
    ;(sys as any).musicGain = fakeGain
    ;(sys as any).ambientGain = fakeGain
    ;(sys as any).fadeGainA = fakeGain
    ;(sys as any).fadeGainB = fakeGain
    ;(sys as any).rainGainNode = fakeGain
    ;(sys as any).started = true
    // lastBirdTime/lastInsectTime 设得足够大，保证时间差 < 阈值（避免触发 playBirdChirp/playInsectChirp）
    ;(sys as any).lastBirdTime = 1000
    ;(sys as any).lastInsectTime = 1000
    ;(sys as any).nextBarTime = 200  // 确保不触发 scheduleBar
    return fakeCtx
  }

  it('isEpic=true → targetMood 应为 epic（最高优先级）', () => {
    injectFakeCtx()
    sys.update({ isNight: true, atWar: true, disasterActive: true, isEpic: true, isRaining: false })
    expect((sys as any).targetMood).toBe('epic')
  })

  it('disasterActive=true, isEpic=false → targetMood=disaster', () => {
    injectFakeCtx()
    sys.update({ isNight: true, atWar: true, disasterActive: true, isEpic: false, isRaining: false })
    expect((sys as any).targetMood).toBe('disaster')
  })

  it('atWar=true, 无 disaster/epic → targetMood=war', () => {
    injectFakeCtx()
    sys.update({ isNight: true, atWar: true, disasterActive: false, isEpic: false, isRaining: false })
    expect((sys as any).targetMood).toBe('war')
  })

  it('isNight=true, 无 war/disaster/epic → targetMood=night', () => {
    injectFakeCtx()
    sys.update({ isNight: true, atWar: false, disasterActive: false, isEpic: false, isRaining: false })
    expect((sys as any).targetMood).toBe('night')
  })

  it('全部 false → targetMood=peaceful', () => {
    injectFakeCtx()
    sys.update({ isNight: false, atWar: false, disasterActive: false, isEpic: false, isRaining: false })
    expect((sys as any).targetMood).toBe('peaceful')
  })

  it('mood 未变时不触发 crossfadeToNewMood（barIndex 保持）', () => {
    injectFakeCtx()
    ;(sys as any).currentMood = 'peaceful'
    ;(sys as any).targetMood = 'peaceful'
    const prevBarIndex = (sys as any).barIndex
    sys.update({ isNight: false, atWar: false, disasterActive: false, isEpic: false, isRaining: false })
    // barIndex 不因 crossfade 重置
    expect((sys as any).barIndex).toBe(prevBarIndex)
  })
})

// ────────────────────────────────────────────────
// describe 7: crossfadeToNewMood（私有方法）
// ────────────────────────────────────────────────
describe('MusicSystem — crossfadeToNewMood()', () => {
  let sys: MusicSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function injectFakeCtxForCrossfade() {
    const makeGain = () => ({
      gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
    })
    const fakeCtx = { currentTime: 5, state: 'running' }
    ;(sys as any).ctx = fakeCtx
    ;(sys as any).fadeGainA = makeGain()
    ;(sys as any).fadeGainB = makeGain()
    return fakeCtx
  }

  it('A→B: crossfade 后 activeFade 变为 B', () => {
    injectFakeCtxForCrossfade()
    ;(sys as any).activeFade = 'A'
    ;(sys as any).targetMood = 'war'
    ;(sys as any).crossfadeToNewMood()
    expect((sys as any).activeFade).toBe('B')
  })

  it('B→A: crossfade 后 activeFade 变为 A', () => {
    injectFakeCtxForCrossfade()
    ;(sys as any).activeFade = 'B'
    ;(sys as any).targetMood = 'night'
    ;(sys as any).crossfadeToNewMood()
    expect((sys as any).activeFade).toBe('A')
  })

  it('crossfade 后 currentMood 等于 targetMood', () => {
    injectFakeCtxForCrossfade()
    ;(sys as any).targetMood = 'epic'
    ;(sys as any).crossfadeToNewMood()
    expect((sys as any).currentMood).toBe('epic')
  })

  it('crossfade 后 barIndex 重置为 0', () => {
    injectFakeCtxForCrossfade()
    ;(sys as any).barIndex = 7
    ;(sys as any).crossfadeToNewMood()
    expect((sys as any).barIndex).toBe(0)
  })

  it('ctx 为 null 时 crossfade 不崩溃', () => {
    expect(() => (sys as any).crossfadeToNewMood()).not.toThrow()
  })
})

// ────────────────────────────────────────────────
// describe 8: getActiveFadeGain（私有方法）
// ────────────────────────────────────────────────
describe('MusicSystem — getActiveFadeGain()', () => {
  let sys: MusicSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('activeFade=A 时返回 fadeGainA', () => {
    const fakeA = { gain: { value: 1 } }
    const fakeB = { gain: { value: 0 } }
    ;(sys as any).fadeGainA = fakeA
    ;(sys as any).fadeGainB = fakeB
    ;(sys as any).activeFade = 'A'
    expect((sys as any).getActiveFadeGain()).toBe(fakeA)
  })

  it('activeFade=B 时返回 fadeGainB', () => {
    const fakeA = { gain: { value: 1 } }
    const fakeB = { gain: { value: 0 } }
    ;(sys as any).fadeGainA = fakeA
    ;(sys as any).fadeGainB = fakeB
    ;(sys as any).activeFade = 'B'
    expect((sys as any).getActiveFadeGain()).toBe(fakeB)
  })

  it('fadeGainA/B 为 null 时返回 null', () => {
    ;(sys as any).activeFade = 'A'
    expect((sys as any).getActiveFadeGain()).toBeNull()
  })
})
