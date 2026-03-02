import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SoundSystem } from '../systems/SoundSystem'

// ─────────────────────────── AudioContext mock ───────────────────────────
// SoundSystem uses Web Audio API which is unavailable in Node/jsdom.
// We mock it so pure-logic paths (mute, toggle, etc.) can be tested without
// actually creating oscillators.

function makeOscMock() {
  return {
    type: 'sine' as OscillatorType,
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function makeGainMock() {
  return {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }
}

function makeBufferMock(sampleRate = 44100, duration = 0.5) {
  const len = Math.ceil(sampleRate * duration)
  const data = new Float32Array(len)
  return { getChannelData: vi.fn(() => data) }
}

function makeBufferSourceMock() {
  return {
    buffer: null as unknown,
    connect: vi.fn(),
    start: vi.fn(),
  }
}

function makeCtxMock(state: AudioContextState = 'running') {
  const oscMock = makeOscMock()
  const gainMock = makeGainMock()
  const bufferSourceMock = makeBufferSourceMock()
  const bufferMock = makeBufferMock()
  return {
    state,
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createOscillator: vi.fn(() => oscMock),
    createGain: vi.fn(() => gainMock),
    createBuffer: vi.fn(() => bufferMock),
    createBufferSource: vi.fn(() => bufferSourceMock),
    resume: vi.fn().mockResolvedValue(undefined),
    _oscMock: oscMock,
    _gainMock: gainMock,
    _bufferMock: bufferMock,
    _bufferSourceMock: bufferSourceMock,
  }
}

function makeSys() { return new SoundSystem() }

/** Inject a mock ctx and return it */
function injectCtx(sys: SoundSystem, state: AudioContextState = 'running') {
  const ctx = makeCtxMock(state)
  ;(sys as any).ctx = ctx
  return ctx
}

// ─────────────────────────── describe blocks ───────────────────────────

describe('SoundSystem — 初始状态', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('可以实例化', () => { expect(sys).toBeDefined() })
  it('初始 ctx 为 null', () => { expect((sys as any).ctx).toBeNull() })
  it('初始 muted 为 false', () => { expect((sys as any).muted).toBe(false) })
  it('isMuted getter 初始为 false', () => { expect(sys.isMuted).toBe(false) })
  it('多次实例化互不共享 muted 状态', () => {
    const a = makeSys(); const b = makeSys()
    a.toggleMute()
    expect(b.isMuted).toBe(false)
  })
})

describe('SoundSystem — toggleMute 基础逻辑', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('toggleMute 返回切换后的 muted 值', () => {
    const result = sys.toggleMute()
    expect(result).toBe(true)
  })

  it('toggleMute 第一次 → true', () => {
    sys.toggleMute()
    expect(sys.isMuted).toBe(true)
  })

  it('toggleMute 第二次 → false', () => {
    sys.toggleMute(); sys.toggleMute()
    expect(sys.isMuted).toBe(false)
  })

  it('toggleMute 三次 → true', () => {
    sys.toggleMute(); sys.toggleMute(); sys.toggleMute()
    expect(sys.isMuted).toBe(true)
  })

  it('toggleMute 奇数次后 isMuted 为 true', () => {
    for (let i = 0; i < 7; i++) sys.toggleMute()
    expect(sys.isMuted).toBe(true)
  })

  it('toggleMute 偶数次后 isMuted 为 false', () => {
    for (let i = 0; i < 8; i++) sys.toggleMute()
    expect(sys.isMuted).toBe(false)
  })

  it('toggleMute 返回值与 isMuted 一致', () => {
    const returned = sys.toggleMute()
    expect(returned).toBe(sys.isMuted)
  })
})

describe('SoundSystem — toggleMute 与 AudioContext 交互', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('mute → unmute 且 ctx 为 suspended 时调用 ctx.resume()', () => {
    const ctx = injectCtx(sys, 'suspended')
    sys.toggleMute() // mute
    sys.toggleMute() // unmute
    expect(ctx.resume).toHaveBeenCalledTimes(1)
  })

  it('mute → unmute 且 ctx 为 running 时不调用 ctx.resume()', () => {
    const ctx = injectCtx(sys, 'running')
    sys.toggleMute()
    sys.toggleMute()
    expect(ctx.resume).not.toHaveBeenCalled()
  })

  it('ctx 为 null 时 toggleMute 不崩溃', () => {
    expect(() => { sys.toggleMute(); sys.toggleMute() }).not.toThrow()
  })

  it('unmute 时 ctx 状态为 closed 不调用 resume', () => {
    const ctx = injectCtx(sys, 'closed')
    sys.toggleMute()
    sys.toggleMute()
    // closed !== 'suspended' → no resume
    expect(ctx.resume).not.toHaveBeenCalled()
  })
})

describe('SoundSystem — playTone (private) muted 拦截', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('muted 时 playTerrain 不调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute() // mute
    sys.playTerrain()
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })

  it('unmuted 时 playTerrain 调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.playTerrain()
    expect(ctx.createOscillator).toHaveBeenCalled()
  })

  it('muted 时 playSpawn 不调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute()
    sys.playSpawn()
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })

  it('unmuted 时 playSpawn 调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.playSpawn()
    expect(ctx.createOscillator).toHaveBeenCalled()
  })

  it('muted 时 playDeath 不调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute()
    sys.playDeath()
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })

  it('unmuted 时 playDeath 调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.playDeath()
    expect(ctx.createOscillator).toHaveBeenCalled()
  })

  it('muted 时 playDiplomacy 不调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute()
    sys.playDiplomacy()
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })

  it('unmuted 时 playDiplomacy 调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.playDiplomacy()
    expect(ctx.createOscillator).toHaveBeenCalled()
  })

  it('muted 时 playAchievement 不调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute()
    sys.playAchievement()
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })

  it('unmuted 时 playAchievement 调用 createOscillator 4次（4音符）', () => {
    const ctx = injectCtx(sys)
    sys.playAchievement()
    expect(ctx.createOscillator).toHaveBeenCalledTimes(4)
  })
})

describe('SoundSystem — playNoise (private) muted 拦截', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('muted 时 playExplosion 不调用 createBuffer', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute()
    sys.playExplosion()
    expect(ctx.createBuffer).not.toHaveBeenCalled()
  })

  it('unmuted 时 playExplosion 调用 createBuffer', () => {
    const ctx = injectCtx(sys)
    sys.playExplosion()
    expect(ctx.createBuffer).toHaveBeenCalled()
  })

  it('muted 时 playRain 不调用 createBuffer', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute()
    sys.playRain()
    expect(ctx.createBuffer).not.toHaveBeenCalled()
  })

  it('unmuted 时 playRain 调用 createBuffer', () => {
    const ctx = injectCtx(sys)
    sys.playRain()
    expect(ctx.createBuffer).toHaveBeenCalled()
  })

  it('muted 时 playCombat 不调用 createBuffer', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute()
    sys.playCombat()
    expect(ctx.createBuffer).not.toHaveBeenCalled()
  })
})

describe('SoundSystem — 各 play 方法不崩溃 (muted mode)', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys(); sys.toggleMute() })
  afterEach(() => { vi.restoreAllMocks() })

  it('muted 时 playTerrain 不崩溃', () => { expect(() => sys.playTerrain()).not.toThrow() })
  it('muted 时 playSpawn 不崩溃', () => { expect(() => sys.playSpawn()).not.toThrow() })
  it('muted 时 playExplosion 不崩溃', () => { expect(() => sys.playExplosion()).not.toThrow() })
  it('muted 时 playRain 不崩溃', () => { expect(() => sys.playRain()).not.toThrow() })
  it('muted 时 playCombat 不崩溃', () => { expect(() => sys.playCombat()).not.toThrow() })
  it('muted 时 playDeath 不崩溃', () => { expect(() => sys.playDeath()).not.toThrow() })
  it('muted 时 playBuild 不崩溃', () => { expect(() => sys.playBuild()).not.toThrow() })
  it('muted 时 playTrade 不崩溃', () => { expect(() => sys.playTrade()).not.toThrow() })
  it('muted 时 playDiplomacy 不崩溃', () => { expect(() => sys.playDiplomacy()).not.toThrow() })
  it('muted 时 playAchievement 不崩溃', () => { expect(() => sys.playAchievement()).not.toThrow() })
})

describe('SoundSystem — playBuild / playTrade 使用 setTimeout (unmuted)', () => {
  let sys: SoundSystem
  beforeEach(() => {
    sys = makeSys()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('unmuted 时 playBuild 调用 createOscillator 至少 1 次（第一音）', () => {
    const ctx = injectCtx(sys)
    sys.playBuild()
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1)
    // Advance timers to trigger setTimeout callbacks
    vi.advanceTimersByTime(200)
    expect(ctx.createOscillator).toHaveBeenCalledTimes(3)
  })

  it('muted 时 playBuild 不调用 createOscillator（含 setTimeout）', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute()
    sys.playBuild()
    vi.advanceTimersByTime(200)
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })

  it('unmuted 时 playTrade 第一音立即调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.playTrade()
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(200)
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2)
  })

  it('muted 时 playTrade 不调用 createOscillator', () => {
    const ctx = injectCtx(sys)
    sys.toggleMute()
    sys.playTrade()
    vi.advanceTimersByTime(200)
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })
})

describe('SoundSystem — osc.start / osc.stop 确认', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('playTerrain 调用 osc.start()', () => {
    const ctx = injectCtx(sys)
    sys.playTerrain()
    expect(ctx._oscMock.start).toHaveBeenCalled()
  })

  it('playTerrain 调用 osc.stop()', () => {
    const ctx = injectCtx(sys)
    sys.playTerrain()
    expect(ctx._oscMock.stop).toHaveBeenCalled()
  })

  it('playSpawn 调用 osc.start()', () => {
    const ctx = injectCtx(sys)
    sys.playSpawn()
    expect(ctx._oscMock.start).toHaveBeenCalled()
  })

  it('playDeath 调用 osc.start()', () => {
    const ctx = injectCtx(sys)
    sys.playDeath()
    expect(ctx._oscMock.start).toHaveBeenCalled()
  })

  it('playDiplomacy 调用 osc.start()', () => {
    const ctx = injectCtx(sys)
    sys.playDiplomacy()
    expect(ctx._oscMock.start).toHaveBeenCalled()
  })

  it('playExplosion 调用 bufferSource.start()', () => {
    const ctx = injectCtx(sys)
    sys.playExplosion()
    expect(ctx._bufferSourceMock.start).toHaveBeenCalled()
  })
})

describe('SoundSystem — gain 连接到 destination', () => {
  let sys: SoundSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('playTerrain 将 gain 连接到 ctx.destination', () => {
    const ctx = injectCtx(sys)
    sys.playTerrain()
    expect(ctx._gainMock.connect).toHaveBeenCalledWith(ctx.destination)
  })

  it('playSpawn 将 gain 连接到 ctx.destination', () => {
    const ctx = injectCtx(sys)
    sys.playSpawn()
    expect(ctx._gainMock.connect).toHaveBeenCalledWith(ctx.destination)
  })

  it('playDeath 将 gain 连接到 ctx.destination', () => {
    const ctx = injectCtx(sys)
    sys.playDeath()
    expect(ctx._gainMock.connect).toHaveBeenCalledWith(ctx.destination)
  })
})

describe('SoundSystem — getCtx 懒初始化', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('初次调用 playTerrain 后 ctx 不为 null', () => {
    const ctxMock = makeCtxMock()
    function FakeAudioContext() { return ctxMock }
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const sys = makeSys()
    sys.playTerrain()
    expect((sys as any).ctx).not.toBeNull()
  })

  it('连续两次调用 playTerrain 只创建一个 AudioContext', () => {
    const ctxMock = makeCtxMock()
    let callCount = 0
    function FakeAudioContext() { callCount++; return ctxMock }
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const sys = makeSys()
    sys.playTerrain()
    sys.playTerrain()
    expect(callCount).toBe(1)
  })

  it('muted 时不创建 AudioContext', () => {
    let callCount = 0
    function FakeAudioContext() { callCount++; return makeCtxMock() }
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const sys = makeSys()
    sys.toggleMute()
    sys.playTerrain()
    expect(callCount).toBe(0)
  })
})
