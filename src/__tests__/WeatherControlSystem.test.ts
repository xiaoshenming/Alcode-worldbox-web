import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WeatherControlSystem } from '../systems/WeatherControlSystem'

function makeSys() { return new WeatherControlSystem() }

// ── 1. 初始状态 ───────────────────────────────────────────────────────────────
describe('WeatherControlSystem — 初始状态', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })

  it('weatherType 初始为 clear', () => {
    expect((sys as any).weatherType).toBe('clear')
  })

  it('intensity 初始为 0.5', () => {
    expect((sys as any).intensity).toBe(0.5)
  })

  it('duration 初始为 0', () => {
    expect((sys as any).duration).toBe(0)
  })

  it('remaining 初始为 0', () => {
    expect((sys as any).remaining).toBe(0)
  })

  it('locked 初始为 false', () => {
    expect((sys as any).locked).toBe(false)
  })

  it('panelOpen 初始为 false', () => {
    expect((sys as any).panelOpen).toBe(false)
  })

  it('getIntensity() 返回 0.5', () => {
    expect(sys.getIntensity()).toBe(0.5)
  })

  it('isLocked() 返回 false', () => {
    expect(sys.isLocked()).toBe(false)
  })

  it('isPanelOpen() 返回 false', () => {
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('_intensityStr 初始为 "0.50"', () => {
    expect((sys as any)._intensityStr).toBe('0.50')
  })
})

// ── 2. setWeather ─────────────────────────────────────────────────────────────
describe('WeatherControlSystem — setWeather', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })

  it('setWeather("rain") → weatherType = rain', () => {
    sys.setWeather('rain')
    expect((sys as any).weatherType).toBe('rain')
  })

  it('setWeather("storm") → weatherType = storm', () => {
    sys.setWeather('storm')
    expect((sys as any).weatherType).toBe('storm')
  })

  it('setWeather("snow") → weatherType = snow', () => {
    sys.setWeather('snow')
    expect((sys as any).weatherType).toBe('snow')
  })

  it('setWeather("fog") → weatherType = fog', () => {
    sys.setWeather('fog')
    expect((sys as any).weatherType).toBe('fog')
  })

  it('setWeather("tornado") → weatherType = tornado', () => {
    sys.setWeather('tornado')
    expect((sys as any).weatherType).toBe('tornado')
  })

  it('setWeather("heatwave") → weatherType = heatwave', () => {
    sys.setWeather('heatwave')
    expect((sys as any).weatherType).toBe('heatwave')
  })

  it('setWeather("clear") → weatherType = clear', () => {
    sys.setWeather('rain')
    sys.setWeather('clear')
    expect((sys as any).weatherType).toBe('clear')
  })

  it('无效天气类型不修改 weatherType', () => {
    sys.setWeather('invalid_weather')
    expect((sys as any).weatherType).toBe('clear')
  })

  it('空字符串不修改 weatherType', () => {
    sys.setWeather('')
    expect((sys as any).weatherType).toBe('clear')
  })

  it('setWeather 后 remaining 重置为 duration', () => {
    ;(sys as any).duration = 600
    ;(sys as any).remaining = 300
    sys.setWeather('rain')
    expect((sys as any).remaining).toBe(600)
  })

  it('setWeather 后 _weatherTypeStr 更新（含图标）', () => {
    sys.setWeather('rain')
    const str: string = (sys as any)._weatherTypeStr
    expect(str).toContain('Rain')
  })
})

// ── 3. setIntensity ───────────────────────────────────────────────────────────
describe('WeatherControlSystem — setIntensity', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })

  it('setIntensity(0.8) → getIntensity() = 0.8', () => {
    sys.setIntensity(0.8)
    expect(sys.getIntensity()).toBe(0.8)
  })

  it('setIntensity(0) → getIntensity() = 0', () => {
    sys.setIntensity(0)
    expect(sys.getIntensity()).toBe(0)
  })

  it('setIntensity(1) → getIntensity() = 1', () => {
    sys.setIntensity(1)
    expect(sys.getIntensity()).toBe(1)
  })

  it('setIntensity(-0.5) 被夹到 0', () => {
    sys.setIntensity(-0.5)
    expect(sys.getIntensity()).toBe(0)
  })

  it('setIntensity(1.5) 被夹到 1', () => {
    sys.setIntensity(1.5)
    expect(sys.getIntensity()).toBe(1)
  })

  it('setIntensity(0.3) 后 _intensityStr = "0.30"', () => {
    sys.setIntensity(0.3)
    expect((sys as any)._intensityStr).toBe('0.30')
  })

  it('setIntensity(1.0) 后 _intensityStr = "1.00"', () => {
    sys.setIntensity(1.0)
    expect((sys as any)._intensityStr).toBe('1.00')
  })

  it('setIntensity 后 _weatherTypeStr 包含新强度', () => {
    sys.setIntensity(0.75)
    const str: string = (sys as any)._weatherTypeStr
    expect(str).toContain('0.75')
  })
})

// ── 4. togglePanel / isPanelOpen ─────────────────────────────────────────────
describe('WeatherControlSystem — togglePanel', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })

  it('togglePanel() 一次后 isPanelOpen() = true', () => {
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })

  it('togglePanel() 两次后 isPanelOpen() = false', () => {
    sys.togglePanel()
    sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(false)
  })

  it('反复切换状态正确', () => {
    for (let i = 0; i < 5; i++) sys.togglePanel()
    expect(sys.isPanelOpen()).toBe(true)
  })
})

// ── 5. locked 状态 ────────────────────────────────────────────────────────────
describe('WeatherControlSystem — locked', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })

  it('手动设置 locked=true 后 isLocked() = true', () => {
    ;(sys as any).locked = true
    expect(sys.isLocked()).toBe(true)
  })

  it('locked=true 时 update 不减少 remaining', () => {
    ;(sys as any).locked = true
    ;(sys as any).duration = 600
    ;(sys as any).remaining = 500
    sys.update(1)
    expect((sys as any).remaining).toBe(500)
  })

  it('locked=false 时 update 正常倒计时', () => {
    ;(sys as any).duration = 600
    ;(sys as any).remaining = 600
    sys.update(1)
    expect((sys as any).remaining).toBe(599)
  })
})

// ── 6. update — 倒计时逻辑 ───────────────────────────────────────────────────
describe('WeatherControlSystem — update 倒计时', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })

  it('duration=0（无限）时 update 不改变 remaining', () => {
    ;(sys as any).duration = 0
    ;(sys as any).remaining = 0
    sys.update(1)
    expect((sys as any).remaining).toBe(0)
  })

  it('每次 update remaining 减少 1', () => {
    ;(sys as any).duration = 600
    ;(sys as any).remaining = 600
    sys.update(1)
    expect((sys as any).remaining).toBe(599)
    sys.update(2)
    expect((sys as any).remaining).toBe(598)
  })

  it('remaining 到达 0 后 weatherType 变为 clear', () => {
    ;(sys as any).duration = 2
    ;(sys as any).remaining = 1
    sys.update(1) // remaining → 0
    expect((sys as any).weatherType).toBe('clear')
  })

  it('remaining 到达 0 后 intensity 变为 0', () => {
    ;(sys as any).duration = 2
    ;(sys as any).remaining = 1
    sys.update(1)
    expect((sys as any).intensity).toBe(0)
  })

  it('remaining 到达 0 后 _intensityStr 变为 "0.00"', () => {
    ;(sys as any).duration = 2
    ;(sys as any).remaining = 1
    sys.update(1)
    expect((sys as any)._intensityStr).toBe('0.00')
  })

  it('_durStr 格式为 "remaining/duration"', () => {
    ;(sys as any).duration = 600
    ;(sys as any).remaining = 600
    sys.update(1)
    expect((sys as any)._durStr).toBe('599/600')
  })

  it('_statusStr 在倒计时中包含 remaining/duration', () => {
    ;(sys as any).duration = 300
    ;(sys as any).remaining = 300
    sys.update(1)
    const status: string = (sys as any)._statusStr
    expect(status).toContain('299/300')
  })

  it('_statusStr 在 duration=0 时包含 Infinite', () => {
    ;(sys as any).duration = 0
    ;(sys as any).remaining = 0
    // Force rebuild
    ;(sys as any)._rebuildStatusStr()
    const status: string = (sys as any)._statusStr
    expect(status).toContain('Infinite')
  })

  it('_statusStr 在 locked 时包含 [LOCKED]', () => {
    ;(sys as any).locked = true
    ;(sys as any).duration = 0
    ;(sys as any)._rebuildStatusStr()
    const status: string = (sys as any)._statusStr
    expect(status).toContain('[LOCKED]')
  })
})

// ── 7. _rebuildWeatherTypeStr ─────────────────────────────────────────────────
describe('WeatherControlSystem — _rebuildWeatherTypeStr', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })

  it('包含天气标签', () => {
    sys.setWeather('snow')
    const str: string = (sys as any)._weatherTypeStr
    expect(str).toContain('Snow')
  })

  it('包含强度字符串', () => {
    sys.setIntensity(0.42)
    const str: string = (sys as any)._weatherTypeStr
    expect(str).toContain('0.42')
  })

  it('包含天气图标字符', () => {
    sys.setWeather('clear')
    const str: string = (sys as any)._weatherTypeStr
    expect(str.length).toBeGreaterThan(0)
  })

  it('storm 天气 label 为 Storm', () => {
    sys.setWeather('storm')
    const str: string = (sys as any)._weatherTypeStr
    expect(str).toContain('Storm')
  })

  it('tornado 天气 label 为 Tornado', () => {
    sys.setWeather('tornado')
    const str: string = (sys as any)._weatherTypeStr
    expect(str).toContain('Tornado')
  })
})

// ── 8. 多次操作组合场景 ──────────────────────────────────────────────────────
describe('WeatherControlSystem — 组合场景', () => {
  let sys: WeatherControlSystem
  beforeEach(() => { sys = makeSys() })

  it('设置天气 + 强度 + 倒计时综合流程', () => {
    ;(sys as any).duration = 5
    sys.setWeather('storm')
    sys.setIntensity(0.9)
    ;(sys as any).remaining = 5
    for (let i = 0; i < 5; i++) sys.update(i)
    expect((sys as any).weatherType).toBe('clear')
    expect((sys as any).intensity).toBe(0)
  })

  it('locked 期间切换天气不影响倒计时', () => {
    ;(sys as any).duration = 100
    ;(sys as any).remaining = 100
    ;(sys as any).locked = true
    sys.setWeather('rain')
    sys.update(1)
    expect((sys as any).remaining).toBe(100) // locked, no countdown
  })

  it('多次 setIntensity 最终值为最后一次', () => {
    sys.setIntensity(0.3)
    sys.setIntensity(0.7)
    sys.setIntensity(0.55)
    expect(sys.getIntensity()).toBe(0.55)
  })
})
