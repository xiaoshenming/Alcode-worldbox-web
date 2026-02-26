
/** 天气控制面板 - 手动控制天气类型、强度、持续时间 */

type ControlWeatherType = 'clear' | 'rain' | 'storm' | 'snow' | 'fog' | 'tornado' | 'heatwave'

const WEATHER_TYPES: ControlWeatherType[] = ['clear', 'rain', 'storm', 'snow', 'fog', 'tornado', 'heatwave']
const WEATHER_LABELS: Record<ControlWeatherType, string> = {
  clear: 'Clear', rain: 'Rain', storm: 'Storm', snow: 'Snow',
  fog: 'Fog', tornado: 'Tornado', heatwave: 'HeatWave',
}
const WEATHER_ICONS: Record<ControlWeatherType, string> = {
  clear: '\u2600', rain: '\u{1F327}', storm: '\u26C8', snow: '\u2744',
  fog: '\u{1F32B}', tornado: '\u{1F32A}', heatwave: '\u{1F525}',
}

interface Preset { label: string; type: ControlWeatherType; intensity: number; duration: number }
const PRESETS: Preset[] = [
  { label: 'Light Rain', type: 'rain', intensity: 0.3, duration: 600 },
  { label: 'Blizzard', type: 'snow', intensity: 1.0, duration: 1200 },
  { label: 'Thunderstorm', type: 'storm', intensity: 0.8, duration: 900 },
  { label: 'Dense Fog', type: 'fog', intensity: 0.7, duration: 800 },
]

const PW = 280
const PH = 340
const BG = 'rgba(10,15,25,0.88)'
const ACCENT = '#4fc3f7'
const BTN_H = 24
const BTN_GAP = 4

export class WeatherControlSystem {
  private weatherType: ControlWeatherType = 'clear'
  private intensity = 0.5
  private duration = 0 // 0 = infinite
  private remaining = 0
  private locked = false
  private panelOpen = false
  private px = 0
  private py = 0

  constructor() { /* no deps needed */ }

  setWeather(type: string): void {
    if (WEATHER_TYPES.includes(type as ControlWeatherType)) {
      this.weatherType = type as ControlWeatherType
      this.remaining = this.duration
    }
  }

  getWeather(): string { return this.weatherType }

  setIntensity(value: number): void {
    this.intensity = Math.max(0, Math.min(1, value))
  }

  getIntensity(): number { return this.intensity }

  setDuration(ticks: number): void {
    this.duration = Math.max(0, ticks)
    this.remaining = this.duration
  }

  isLocked(): boolean { return this.locked }
  toggleLock(): void { this.locked = !this.locked }
  togglePanel(): void { this.panelOpen = !this.panelOpen }
  isPanelOpen(): boolean { return this.panelOpen }

  update(tick: number): void {
    if (this.locked || this.duration === 0) return
    if (this.remaining > 0) {
      this.remaining--
      if (this.remaining <= 0) {
        this.weatherType = 'clear'
        this.intensity = 0
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, screenW: number, screenH: number): void {
    if (!this.panelOpen) return

    this.px = Math.floor((screenW - PW) / 2)
    this.py = Math.floor((screenH - PH) / 2)

    ctx.save()

    // Background
    ctx.fillStyle = BG
    ctx.strokeStyle = 'rgba(100,120,160,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(this.px, this.py, PW, PH, 10)
    ctx.fill()
    ctx.stroke()

    // Title
    ctx.fillStyle = '#dde4f0'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('Weather Control', this.px + 12, this.py + 18)

    // Close button
    ctx.fillStyle = '#ff6666'
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('X', this.px + PW - 18, this.py + 18)

    let cy = this.py + 40

    // Current status
    const icon = WEATHER_ICONS[this.weatherType]
    const label = WEATHER_LABELS[this.weatherType]
    ctx.fillStyle = ACCENT
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`${icon} ${label}  Int:${this.intensity.toFixed(2)}`, this.px + 12, cy)
    cy += 16
    const durText = this.duration === 0 ? 'Infinite' : `${this.remaining}/${this.duration}`
    const lockText = this.locked ? ' [LOCKED]' : ''
    ctx.fillStyle = '#aabbcc'
    ctx.fillText(`Dur: ${durText}${lockText}`, this.px + 12, cy)
    cy += 22

    // Weather type buttons (2 rows)
    ctx.font = '11px monospace'
    const bw = Math.floor((PW - 24 - BTN_GAP * 3) / 4)
    for (let i = 0; i < WEATHER_TYPES.length; i++) {
      const col = i % 4
      const row = Math.floor(i / 4)
      const bx = this.px + 12 + col * (bw + BTN_GAP)
      const by = cy + row * (BTN_H + BTN_GAP)
      const active = WEATHER_TYPES[i] === this.weatherType
      ctx.fillStyle = active ? 'rgba(79,195,247,0.35)' : 'rgba(40,50,70,0.7)'
      ctx.fillRect(bx, by, bw, BTN_H)
      ctx.fillStyle = active ? '#fff' : '#99aabb'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(WEATHER_LABELS[WEATHER_TYPES[i]], bx + bw / 2, by + BTN_H / 2)
    }
    cy += Math.ceil(WEATHER_TYPES.length / 4) * (BTN_H + BTN_GAP) + 10

    // Intensity slider
    ctx.fillStyle = '#8899aa'
    ctx.textAlign = 'left'
    ctx.fillText('Intensity', this.px + 12, cy)
    const sliderX = this.px + 80
    const sliderW = PW - 92
    ctx.fillStyle = 'rgba(40,50,70,0.8)'
    ctx.fillRect(sliderX, cy - 5, sliderW, 10)
    ctx.fillStyle = ACCENT
    ctx.fillRect(sliderX, cy - 5, sliderW * this.intensity, 10)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'right'
    ctx.fillText(this.intensity.toFixed(2), this.px + PW - 12, cy)
    cy += 22

    // Duration buttons
    ctx.textAlign = 'left'
    ctx.fillStyle = '#8899aa'
    ctx.fillText('Duration', this.px + 12, cy)
    const durOpts = [0, 300, 600, 1200]
    const durLabels = ['Inf', '300', '600', '1200']
    const dw = Math.floor((PW - 100) / 4)
    for (let i = 0; i < durOpts.length; i++) {
      const dx = this.px + 80 + i * (dw + 3)
      const active = this.duration === durOpts[i]
      ctx.fillStyle = active ? 'rgba(79,195,247,0.35)' : 'rgba(40,50,70,0.7)'
      ctx.fillRect(dx, cy - 9, dw, 18)
      ctx.fillStyle = active ? '#fff' : '#99aabb'
      ctx.textAlign = 'center'
      ctx.fillText(durLabels[i], dx + dw / 2, cy)
    }
    cy += 24

    // Lock toggle
    ctx.fillStyle = this.locked ? 'rgba(239,83,80,0.4)' : 'rgba(40,50,70,0.7)'
    ctx.fillRect(this.px + 12, cy - 9, PW - 24, 20)
    ctx.fillStyle = this.locked ? '#ff8888' : '#99aabb'
    ctx.textAlign = 'center'
    ctx.fillText(this.locked ? 'Unlock Weather' : 'Lock Weather', this.px + PW / 2, cy + 1)
    cy += 28

    // Presets
    ctx.fillStyle = '#8899aa'
    ctx.textAlign = 'left'
    ctx.fillText('Presets', this.px + 12, cy)
    cy += 14
    const pw = Math.floor((PW - 24 - BTN_GAP) / 2)
    for (let i = 0; i < PRESETS.length; i++) {
      const col = i % 2
      const row = Math.floor(i / 2)
      const bx = this.px + 12 + col * (pw + BTN_GAP)
      const by = cy + row * (BTN_H + BTN_GAP)
      ctx.fillStyle = 'rgba(50,60,80,0.7)'
      ctx.fillRect(bx, by, pw, BTN_H)
      ctx.fillStyle = '#bbccdd'
      ctx.textAlign = 'center'
      ctx.fillText(PRESETS[i].label, bx + pw / 2, by + BTN_H / 2)
    }

    ctx.restore()
  }

  handleClick(x: number, y: number, screenW: number, screenH: number): boolean {
    if (!this.panelOpen) return false
    const px = Math.floor((screenW - PW) / 2)
    const py = Math.floor((screenH - PH) / 2)

    if (x < px || x > px + PW || y < py || y > py + PH) return false

    // Close button
    if (x >= px + PW - 30 && y <= py + 32) { this.panelOpen = false; return true }

    let cy = py + 40 + 16 + 22 // after status lines

    // Weather type buttons
    const bw = Math.floor((PW - 24 - BTN_GAP * 3) / 4)
    for (let i = 0; i < WEATHER_TYPES.length; i++) {
      const col = i % 4
      const row = Math.floor(i / 4)
      const bx = px + 12 + col * (bw + BTN_GAP)
      const by = cy + row * (BTN_H + BTN_GAP)
      if (x >= bx && x <= bx + bw && y >= by && y <= by + BTN_H) {
        this.setWeather(WEATHER_TYPES[i])
        return true
      }
    }
    cy += Math.ceil(WEATHER_TYPES.length / 4) * (BTN_H + BTN_GAP) + 10

    // Intensity slider
    const sliderX = px + 80
    const sliderW = PW - 92
    if (x >= sliderX && x <= sliderX + sliderW && y >= cy - 8 && y <= cy + 8) {
      this.intensity = Math.max(0, Math.min(1, (x - sliderX) / sliderW))
      return true
    }
    cy += 22

    // Duration buttons
    const durOpts = [0, 300, 600, 1200]
    const dw = Math.floor((PW - 100) / 4)
    for (let i = 0; i < durOpts.length; i++) {
      const dx = px + 80 + i * (dw + 3)
      if (x >= dx && x <= dx + dw && y >= cy - 9 && y <= cy + 9) {
        this.setDuration(durOpts[i])
        return true
      }
    }
    cy += 24

    // Lock toggle
    if (x >= px + 12 && x <= px + PW - 12 && y >= cy - 9 && y <= cy + 11) {
      this.toggleLock()
      return true
    }
    cy += 28 + 14

    // Presets
    const pw = Math.floor((PW - 24 - BTN_GAP) / 2)
    for (let i = 0; i < PRESETS.length; i++) {
      const col = i % 2
      const row = Math.floor(i / 2)
      const bx = px + 12 + col * (pw + BTN_GAP)
      const by = cy + row * (BTN_H + BTN_GAP)
      if (x >= bx && x <= bx + pw && y >= by && y <= by + BTN_H) {
        const p = PRESETS[i]
        this.weatherType = p.type
        this.intensity = p.intensity
        this.setDuration(p.duration)
        return true
      }
    }

    return true // consume clicks inside panel
  }
}
