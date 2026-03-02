import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AmbientSoundMixer, SoundLayer, SoundEvent } from '../systems/AmbientSoundMixer'

function makeSys(fadeTicks?: number) { return new AmbientSoundMixer(fadeTicks) }

const baseCtx = {
  isNight: false,
  season: 'spring',
  weather: 'clear',
  nearestBattleDist: 999,
  nearestCityDist: 999,
  cameraZoom: 1,
}

function makeCtx(overrides: Partial<typeof baseCtx> = {}) {
  return { ...baseCtx, ...overrides }
}

function makeCanvasCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    font: '',
    textBaseline: '',
    fillStyle: '',
    strokeStyle: '',
  } as unknown as CanvasRenderingContext2D
}

describe('AmbientSoundMixer — 初始状态', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('getMasterVolume 返回数字', () => {
    expect(typeof sys.getMasterVolume()).toBe('number')
  })

  it('初始 masterVolume 为 1', () => {
    expect(sys.getMasterVolume()).toBe(1)
  })

  it('初始 _muted 为 false', () => {
    expect((sys as any)._muted).toBe(false)
  })

  it('isMuted() 初始返回 false', () => {
    expect(sys.isMuted()).toBe(false)
  })

  it('初始 _layers 包含 5 个图层', () => {
    expect((sys as any)._layers.size).toBe(5)
  })

  it('初始 nature 图层存在', () => {
    expect((sys as any)._layers.has('nature')).toBe(true)
  })

  it('初始 weather 图层存在', () => {
    expect((sys as any)._layers.has('weather')).toBe(true)
  })

  it('初始 season 图层存在', () => {
    expect((sys as any)._layers.has('season')).toBe(true)
  })

  it('初始 war 图层存在', () => {
    expect((sys as any)._layers.has('war')).toBe(true)
  })

  it('初始 civilization 图层存在', () => {
    expect((sys as any)._layers.has('civilization')).toBe(true)
  })

  it('所有图层初始 volume 为 0', () => {
    const layers = (sys as any)._layers as Map<string, {volume: number}>
    for (const ls of layers.values()) {
      expect(ls.volume).toBe(0)
    }
  })

  it('所有图层初始 targetVolume 为 0', () => {
    const layers = (sys as any)._layers as Map<string, {targetVolume: number}>
    for (const ls of layers.values()) {
      expect(ls.targetVolume).toBe(0)
    }
  })

  it('所有图层初始 muted 为 false', () => {
    const layers = (sys as any)._layers as Map<string, {muted: boolean}>
    for (const ls of layers.values()) {
      expect(ls.muted).toBe(false)
    }
  })

  it('初始 _pendingEvents 为空数组', () => {
    expect((sys as any)._pendingEvents).toHaveLength(0)
  })

  it('构造函数可接受自定义 fadeTicks', () => {
    const s = makeSys(30)
    expect((s as any)._fadeTicks).toBe(30)
  })

  it('默认 fadeTicks 为 60', () => {
    expect((sys as any)._fadeTicks).toBe(60)
  })
})

describe('AmbientSoundMixer — setMasterVolume', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('setMasterVolume(0.5) 后 getMasterVolume() 为 0.5', () => {
    sys.setMasterVolume(0.5)
    expect(sys.getMasterVolume()).toBe(0.5)
  })

  it('setMasterVolume(0) 后 getMasterVolume() 为 0', () => {
    sys.setMasterVolume(0)
    expect(sys.getMasterVolume()).toBe(0)
  })

  it('setMasterVolume(1) 后 getMasterVolume() 为 1', () => {
    sys.setMasterVolume(1)
    expect(sys.getMasterVolume()).toBe(1)
  })

  it('setMasterVolume(2) 被 clamp 到 1', () => {
    sys.setMasterVolume(2)
    expect(sys.getMasterVolume()).toBe(1)
  })

  it('setMasterVolume(-1) 被 clamp 到 0', () => {
    sys.setMasterVolume(-1)
    expect(sys.getMasterVolume()).toBe(0)
  })

  it('setMasterVolume(0.75) 精确存储', () => {
    sys.setMasterVolume(0.75)
    expect(sys.getMasterVolume()).toBe(0.75)
  })

  it('setMasterVolume(0.001) 不被 clamp', () => {
    sys.setMasterVolume(0.001)
    expect(sys.getMasterVolume()).toBeCloseTo(0.001)
  })

  it('setMasterVolume(0.999) 不被 clamp', () => {
    sys.setMasterVolume(0.999)
    expect(sys.getMasterVolume()).toBeCloseTo(0.999)
  })
})

describe('AmbientSoundMixer — toggleMute / isMuted', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('toggleMute 后 isMuted() 变为 true', () => {
    sys.toggleMute()
    expect(sys.isMuted()).toBe(true)
  })

  it('toggleMute 两次后 isMuted() 恢复 false', () => {
    sys.toggleMute()
    sys.toggleMute()
    expect(sys.isMuted()).toBe(false)
  })

  it('toggleMute 三次后 isMuted() 为 true', () => {
    sys.toggleMute()
    sys.toggleMute()
    sys.toggleMute()
    expect(sys.isMuted()).toBe(true)
  })

  it('isMuted() 与私有字段 _muted 一致', () => {
    expect(sys.isMuted()).toBe((sys as any)._muted)
    sys.toggleMute()
    expect(sys.isMuted()).toBe((sys as any)._muted)
  })
})

describe('AmbientSoundMixer — update 基本调用', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update 不抛出异常', () => {
    expect(() => sys.update(0, makeCtx())).not.toThrow()
  })

  it('update 多次不抛出异常', () => {
    expect(() => {
      for (let i = 0; i < 100; i++) sys.update(i, makeCtx())
    }).not.toThrow()
  })

  it('update 后 nature 图层 targetVolume 为白天值 0.8', () => {
    sys.update(0, makeCtx({ isNight: false }))
    const nature = (sys as any)._layers.get('nature')
    expect(nature.targetVolume).toBe(0.8)
  })

  it('update 后 nature 图层夜晚 targetVolume 为 0.6', () => {
    sys.update(0, makeCtx({ isNight: true }))
    const nature = (sys as any)._layers.get('nature')
    expect(nature.targetVolume).toBe(0.6)
  })

  it('白天 nature activeSound 为 birdsong', () => {
    sys.update(0, makeCtx({ isNight: false }))
    const nature = (sys as any)._layers.get('nature')
    expect(nature.activeSound).toBe('birdsong')
  })

  it('夜晚 nature activeSound 为 crickets', () => {
    sys.update(0, makeCtx({ isNight: true }))
    const nature = (sys as any)._layers.get('nature')
    expect(nature.activeSound).toBe('crickets')
  })
})

describe('AmbientSoundMixer — update 天气音效', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('rain 天气 weather 图层 targetVolume 为 0.7', () => {
    sys.update(0, makeCtx({ weather: 'rain' }))
    expect((sys as any)._layers.get('weather').targetVolume).toBe(0.7)
  })

  it('storm 天气 weather 图层 targetVolume 为 0.9', () => {
    sys.update(0, makeCtx({ weather: 'storm' }))
    expect((sys as any)._layers.get('weather').targetVolume).toBe(0.9)
  })

  it('snow 天气 weather 图层 targetVolume 为 0.4', () => {
    sys.update(0, makeCtx({ weather: 'snow' }))
    expect((sys as any)._layers.get('weather').targetVolume).toBe(0.4)
  })

  it('clear 天气 weather 图层 targetVolume 为 0.1', () => {
    sys.update(0, makeCtx({ weather: 'clear' }))
    expect((sys as any)._layers.get('weather').targetVolume).toBe(0.1)
  })

  it('rain 天气 weather activeSound 为 rain', () => {
    sys.update(0, makeCtx({ weather: 'rain' }))
    expect((sys as any)._layers.get('weather').activeSound).toBe('rain')
  })

  it('storm 天气 weather activeSound 为 thunder_storm', () => {
    sys.update(0, makeCtx({ weather: 'storm' }))
    expect((sys as any)._layers.get('weather').activeSound).toBe('thunder_storm')
  })

  it('snow 天气 weather activeSound 为 wind_snow', () => {
    sys.update(0, makeCtx({ weather: 'snow' }))
    expect((sys as any)._layers.get('weather').activeSound).toBe('wind_snow')
  })

  it('其他天气 weather activeSound 为 wind_light', () => {
    sys.update(0, makeCtx({ weather: 'foggy' }))
    expect((sys as any)._layers.get('weather').activeSound).toBe('wind_light')
  })
})

describe('AmbientSoundMixer — update 季节音效', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('spring 季节 targetVolume 为 0.5', () => {
    sys.update(0, makeCtx({ season: 'spring' }))
    expect((sys as any)._layers.get('season').targetVolume).toBe(0.5)
  })

  it('summer 季节 targetVolume 为 0.6', () => {
    sys.update(0, makeCtx({ season: 'summer' }))
    expect((sys as any)._layers.get('season').targetVolume).toBe(0.6)
  })

  it('autumn 季节 targetVolume 为 0.4', () => {
    sys.update(0, makeCtx({ season: 'autumn' }))
    expect((sys as any)._layers.get('season').targetVolume).toBe(0.4)
  })

  it('winter 季节 targetVolume 为 0.3', () => {
    sys.update(0, makeCtx({ season: 'winter' }))
    expect((sys as any)._layers.get('season').targetVolume).toBe(0.3)
  })

  it('spring 季节 activeSound 为 spring_birds', () => {
    sys.update(0, makeCtx({ season: 'spring' }))
    expect((sys as any)._layers.get('season').activeSound).toBe('spring_birds')
  })

  it('summer 季节 activeSound 为 summer_cicadas', () => {
    sys.update(0, makeCtx({ season: 'summer' }))
    expect((sys as any)._layers.get('season').activeSound).toBe('summer_cicadas')
  })

  it('autumn 季节 activeSound 为 autumn_wind', () => {
    sys.update(0, makeCtx({ season: 'autumn' }))
    expect((sys as any)._layers.get('season').activeSound).toBe('autumn_wind')
  })

  it('winter 季节 activeSound 为 winter_howl', () => {
    sys.update(0, makeCtx({ season: 'winter' }))
    expect((sys as any)._layers.get('season').activeSound).toBe('winter_howl')
  })

  it('未知季节 targetVolume 为 0.3 (默认)', () => {
    sys.update(0, makeCtx({ season: 'unknown' }))
    expect((sys as any)._layers.get('season').targetVolume).toBe(0.3)
  })
})

describe('AmbientSoundMixer — update 战争与城市', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('战斗很近时 war 图层 targetVolume 接近 0.9', () => {
    sys.update(0, makeCtx({ nearestBattleDist: 0 }))
    const war = (sys as any)._layers.get('war')
    expect(war.targetVolume).toBeCloseTo(0.9, 3)
  })

  it('战斗很远时 war 图层 targetVolume 接近 0', () => {
    sys.update(0, makeCtx({ nearestBattleDist: 999 }))
    const war = (sys as any)._layers.get('war')
    expect(war.targetVolume).toBeCloseTo(0, 3)
  })

  it('城市很近时 civilization 图层 targetVolume 接近 0.6', () => {
    sys.update(0, makeCtx({ nearestCityDist: 0 }))
    const civ = (sys as any)._layers.get('civilization')
    expect(civ.targetVolume).toBeCloseTo(0.6, 3)
  })

  it('城市距离 < 30 时 activeSound 为 market_bustle', () => {
    sys.update(0, makeCtx({ nearestCityDist: 10 }))
    const civ = (sys as any)._layers.get('civilization')
    expect(civ.activeSound).toBe('market_bustle')
  })

  it('城市距离 30-79 时 activeSound 为 hammering', () => {
    sys.update(0, makeCtx({ nearestCityDist: 50 }))
    const civ = (sys as any)._layers.get('civilization')
    expect(civ.activeSound).toBe('hammering')
  })

  it('城市距离 >= 80 时 activeSound 为 distant_bells', () => {
    sys.update(0, makeCtx({ nearestCityDist: 100 }))
    const civ = (sys as any)._layers.get('civilization')
    expect(civ.activeSound).toBe('distant_bells')
  })

  it('战斗接近度 > 0.5 时 war activeSound 为 war_drums_close', () => {
    // nearestBattleDist = 0 → prox=1 > 0.5
    sys.update(0, makeCtx({ nearestBattleDist: 0 }))
    const war = (sys as any)._layers.get('war')
    expect(war.activeSound).toBe('war_drums_close')
  })

  it('战斗接近度 0~0.5 时 war activeSound 为 distant_battle', () => {
    // nearestBattleDist = 120 → prox = 1 - 120/200 = 0.4 < 0.5
    sys.update(0, makeCtx({ nearestBattleDist: 120 }))
    const war = (sys as any)._layers.get('war')
    expect(war.activeSound).toBe('distant_battle')
  })

  it('zoom > 1 时远处音量被缩减（zoomDampen < 1）', () => {
    sys.update(0, makeCtx({ nearestBattleDist: 0, cameraZoom: 2 }))
    const war = (sys as any)._layers.get('war')
    // zoomDampen = clamp01(1/2) = 0.5, so targetVolume = 1 * 0.5 * 0.9 = 0.45
    expect(war.targetVolume).toBeCloseTo(0.45, 3)
  })
})

describe('AmbientSoundMixer — triggerEvent', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('triggerEvent 将事件加入 _pendingEvents', () => {
    sys.triggerEvent('battle_start')
    expect((sys as any)._pendingEvents).toHaveLength(1)
  })

  it('triggerEvent 冷却内重复触发不重复添加', () => {
    sys.triggerEvent('battle_start')
    sys.triggerEvent('battle_start')
    expect((sys as any)._pendingEvents).toHaveLength(1)
  })

  it('triggerEvent 不同事件可以分别加入', () => {
    sys.triggerEvent('battle_start')
    sys.triggerEvent('building_complete')
    expect((sys as any)._pendingEvents).toHaveLength(2)
  })

  it('triggerEvent volume 被 clamp 到 1', () => {
    sys.triggerEvent('disaster', 5)
    const ev = (sys as any)._pendingEvents[0]
    expect(ev.volume).toBe(1)
  })

  it('triggerEvent volume 被 clamp 到 0', () => {
    sys.triggerEvent('disaster', -1)
    const ev = (sys as any)._pendingEvents[0]
    expect(ev.volume).toBe(0)
  })

  it('triggerEvent 默认 volume 为 1', () => {
    sys.triggerEvent('achievement')
    const ev = (sys as any)._pendingEvents[0]
    expect(ev.volume).toBe(1)
  })
})

describe('AmbientSoundMixer — renderVolumeIndicator', () => {
  let sys: AmbientSoundMixer
  let ctx: CanvasRenderingContext2D
  beforeEach(() => { sys = makeSys(); ctx = makeCanvasCtx() })
  afterEach(() => vi.restoreAllMocks())

  it('renderVolumeIndicator 不抛出异常', () => {
    expect(() => sys.renderVolumeIndicator(ctx, 10, 10)).not.toThrow()
  })

  it('renderVolumeIndicator 调用 ctx.save', () => {
    sys.renderVolumeIndicator(ctx, 0, 0)
    expect(ctx.save).toHaveBeenCalled()
  })

  it('renderVolumeIndicator 调用 ctx.restore', () => {
    sys.renderVolumeIndicator(ctx, 0, 0)
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('renderVolumeIndicator 绘制 fillRect 至少 6 次（master + 5 layers）', () => {
    sys.renderVolumeIndicator(ctx, 0, 0)
    // 每个 bar 绘制 2 fillRect（背景 + 填充），共 6 条 = 12 次
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(12)
  })
})

describe('AmbientSoundMixer — 音量插值', () => {
  let sys: AmbientSoundMixer
  beforeEach(() => { sys = makeSys(1) })  // fadeTicks=1 使插值立即收敛
  afterEach(() => vi.restoreAllMocks())

  it('fadeTicks=1 时 update 后 volume 立即达到 targetVolume', () => {
    sys.update(0, makeCtx({ weather: 'rain' }))
    const wl = (sys as any)._layers.get('weather')
    // volume 应等于 targetVolume（0.7）因为 t=1
    expect(wl.volume).toBeCloseTo(wl.targetVolume, 5)
  })

  it('fadeTicks=1 时 nature 图层 volume 直接跳到目标', () => {
    sys.update(0, makeCtx({ isNight: false }))
    const nature = (sys as any)._layers.get('nature')
    expect(nature.volume).toBeCloseTo(0.8, 5)
  })
})
