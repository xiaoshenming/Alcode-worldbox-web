// Dynamic music & ambient sound system via Web Audio API (procedural, no audio files)
type Mood = 'peaceful' | 'war' | 'disaster' | 'night' | 'epic'
const VALID_MOODS: Mood[] = ['peaceful', 'war', 'disaster', 'night', 'epic']

const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
}

const CHORD_PROGRESSIONS: Record<Mood, number[][]> = {
  peaceful: [[NOTE.C4, NOTE.E4, NOTE.G4], [NOTE.A3, NOTE.C4, NOTE.E4], [NOTE.F3, NOTE.A3, NOTE.C4], [NOTE.G3, NOTE.B3, NOTE.D4]],
  war:      [[NOTE.D3, NOTE.F3, NOTE.A3], [NOTE.A3, NOTE.C4, NOTE.E4], [NOTE.E3, NOTE.G3, NOTE.B3], [NOTE.A3, NOTE.C4, NOTE.E4]],
  disaster: [[NOTE.C3, NOTE.E3, NOTE.A3], [NOTE.D3, NOTE.F3, NOTE.B3], [NOTE.E3, NOTE.G3, NOTE.C4], [NOTE.F3, NOTE.A3, NOTE.D4]],
  night:    [[NOTE.A3, NOTE.E4, NOTE.A4], [NOTE.F3, NOTE.C4, NOTE.A4], [NOTE.G3, NOTE.D4, NOTE.B4], [NOTE.E3, NOTE.B3, NOTE.G4]],
  epic:     [[NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4], [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4]],
}

const MELODY_SCALES: Record<Mood, number[]> = {
  peaceful: [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A4, NOTE.G4],
  war:      [NOTE.A3, NOTE.C4, NOTE.D4, NOTE.E4, NOTE.F4, NOTE.A4],
  disaster: [NOTE.C4, NOTE.D4, NOTE.F4, NOTE.G4, NOTE.A4, NOTE.B4],
  night:    [NOTE.E4, NOTE.G4, NOTE.A4, NOTE.B4, NOTE.E5],
  epic:     [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.A4, NOTE.D5, NOTE.G4],
}

const MOOD_CONFIG: Record<Mood, { oscType: OscillatorType; barDuration: number; drumVol: number; melodyVol: number; chordVol: number }> = {
  peaceful: { oscType: 'sine',     barDuration: 2.4, drumVol: 0.02, melodyVol: 0.06, chordVol: 0.04 },
  war:      { oscType: 'sawtooth', barDuration: 1.6, drumVol: 0.08, melodyVol: 0.05, chordVol: 0.05 },
  disaster: { oscType: 'square',   barDuration: 1.8, drumVol: 0.06, melodyVol: 0.04, chordVol: 0.06 },
  night:    { oscType: 'sine',     barDuration: 3.0, drumVol: 0.01, melodyVol: 0.04, chordVol: 0.03 },
  epic:     { oscType: 'triangle', barDuration: 2.0, drumVol: 0.07, melodyVol: 0.07, chordVol: 0.06 },
}

export class MusicSystem {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private ambientGain: GainNode | null = null
  private masterVolume: number = 0.3
  private musicVolume: number = 0.5
  private ambientVolume: number = 0.4
  private muted: boolean = false
  private currentMood: Mood = 'peaceful'
  private targetMood: Mood = 'peaceful'
  private nextBarTime: number = 0
  private barIndex: number = 0
  private started: boolean = false
  private windSource: AudioBufferSourceNode | null = null
  private windFilter: BiquadFilterNode | null = null
  private waterSource: AudioBufferSourceNode | null = null
  private waterFilter: BiquadFilterNode | null = null
  private rainSource: AudioBufferSourceNode | null = null
  private rainFilter: BiquadFilterNode | null = null
  private rainGainNode: GainNode | null = null
  private lastBirdTime: number = 0
  private lastInsectTime: number = 0
  private fadeGainA: GainNode | null = null
  private fadeGainB: GainNode | null = null
  private activeFade: 'A' | 'B' = 'A'
  private noiseBuffer: AudioBuffer | null = null

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this.masterVolume
      this.masterGain.connect(this.ctx.destination)

      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = this.musicVolume
      this.musicGain.connect(this.masterGain)

      this.ambientGain = this.ctx.createGain()
      this.ambientGain.gain.value = this.ambientVolume
      this.ambientGain.connect(this.masterGain)

      // Crossfade nodes for music
      this.fadeGainA = this.ctx.createGain()
      this.fadeGainA.gain.value = 1
      this.fadeGainA.connect(this.musicGain)
      this.fadeGainB = this.ctx.createGain()
      this.fadeGainB.gain.value = 0
      this.fadeGainB.connect(this.musicGain)
      this.createNoiseBuffer()
      this.startAmbientLayers()
    }
    return this.ctx
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const len = ctx.sampleRate * 2
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }

  private makeNoiseSource(loop: boolean = true): AudioBufferSourceNode | null {
    if (!this.ctx) return null
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer ?? null
    src.loop = loop
    return src
  }

  private startAmbientLayers(): void {
    if (!this.ctx || !this.ambientGain) return
    const ctx = this.ctx
    // Wind: filtered white noise
    this.windSource = this.makeNoiseSource()
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'lowpass'
    this.windFilter.frequency.value = 400
    this.windFilter.Q.value = 0.5
    const windGain = ctx.createGain()
    windGain.gain.value = 0.15
    this.windSource?.connect(this.windFilter)
    this.windFilter.connect(windGain)
    windGain.connect(this.ambientGain)
    this.windSource?.start()
    // Water: very low frequency filtered noise
    this.waterSource = this.makeNoiseSource()
    this.waterFilter = ctx.createBiquadFilter()
    this.waterFilter.type = 'bandpass'
    this.waterFilter.frequency.value = 200
    this.waterFilter.Q.value = 1.0
    const waterGain = ctx.createGain()
    waterGain.gain.value = 0.08
    this.waterSource?.connect(this.waterFilter)
    this.waterFilter.connect(waterGain)
    waterGain.connect(this.ambientGain)
    this.waterSource?.start()
    // Rain: prepared but silent until needed
    this.rainSource = this.makeNoiseSource()
    this.rainFilter = ctx.createBiquadFilter()
    this.rainFilter.type = 'highpass'
    this.rainFilter.frequency.value = 2000
    this.rainFilter.Q.value = 0.3
    this.rainGainNode = ctx.createGain()
    this.rainGainNode.gain.value = 0
    this.rainSource?.connect(this.rainFilter)
    this.rainFilter.connect(this.rainGainNode)
    this.rainGainNode.connect(this.ambientGain)
    this.rainSource?.start()
  }

  private playBirdChirp(): void {
    if (this.muted || !this.ctx || !this.ambientGain) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const freq = 1800 + Math.random() * 1200
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 0.05)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 0.12)
    gain.gain.setValueAtTime(0.03, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    osc.connect(gain)
    gain.connect(this.ambientGain)
    osc.start(now)
    osc.stop(now + 0.15)
  }

  private playInsectChirp(): void {
    if (this.muted || !this.ctx || !this.ambientGain) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const freq = 3000 + Math.random() * 2000
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    // Rapid on-off for cricket-like sound
    for (let i = 0; i < 4; i++) {
      gain.gain.setValueAtTime(0.02, now + i * 0.06)
      gain.gain.setValueAtTime(0.001, now + i * 0.06 + 0.03)
    }
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain)
    gain.connect(this.ambientGain)
    osc.start(now)
    osc.stop(now + 0.3)
  }

  private getActiveFadeGain(): GainNode | null {
    return this.activeFade === 'A' ? this.fadeGainA : this.fadeGainB
  }

  private scheduleBar(): void {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const config = MOOD_CONFIG[this.currentMood]
    const chords = CHORD_PROGRESSIONS[this.currentMood]
    const scale = MELODY_SCALES[this.currentMood]
    const chord = chords[this.barIndex % chords.length]
    const t = this.nextBarTime
    const dur = config.barDuration
    const fadeGain = this.getActiveFadeGain()
    if (!fadeGain) return
    for (const freq of chord) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = config.oscType
      osc.frequency.setValueAtTime(freq, t)
      g.gain.setValueAtTime(config.chordVol, t)
      g.gain.setValueAtTime(config.chordVol * 0.8, t + dur * 0.5)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur - 0.05)
      osc.connect(g)
      g.connect(fadeGain)
      osc.start(t)
      osc.stop(t + dur)
    }
    // Drum hits (noise bursts)
    const beats = this.currentMood === 'war' ? 8 : this.currentMood === 'night' ? 2 : 4
    const beatLen = dur / beats
    for (let i = 0; i < beats; i++) {
      const src = this.makeNoiseSource(false)
      if (!src) continue
      const g = ctx.createGain()
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = this.currentMood === 'war' ? 300 : 200
      const bt = t + i * beatLen
      g.gain.setValueAtTime(config.drumVol, bt)
      g.gain.exponentialRampToValueAtTime(0.001, bt + 0.08)
      src.connect(f)
      f.connect(g)
      g.connect(fadeGain)
      src.start(bt)
      src.stop(bt + 0.1)
    }
    // Melody: pick 2-4 random notes from scale
    const noteCount = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < noteCount; i++) {
      const noteTime = t + (i / noteCount) * dur * 0.8 + Math.random() * 0.1
      const freq = scale[Math.floor(Math.random() * scale.length)]
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteTime)
      const noteDur = 0.2 + Math.random() * 0.3
      g.gain.setValueAtTime(config.melodyVol, noteTime)
      g.gain.exponentialRampToValueAtTime(0.001, noteTime + noteDur)
      osc.connect(g)
      g.connect(fadeGain)
      osc.start(noteTime)
      osc.stop(noteTime + noteDur)
    }

    this.nextBarTime += dur
    this.barIndex++
  }

  private crossfadeToNewMood(): void {
    if (!this.ctx) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const fadeDur = 2.0
    const outGain = this.activeFade === 'A' ? this.fadeGainA : this.fadeGainB
    const inGain = this.activeFade === 'A' ? this.fadeGainB : this.fadeGainA
    if (!outGain || !inGain) return
    outGain.gain.setValueAtTime(outGain.gain.value, now)
    outGain.gain.linearRampToValueAtTime(0, now + fadeDur)
    inGain.gain.setValueAtTime(inGain.gain.value, now)
    inGain.gain.linearRampToValueAtTime(1, now + fadeDur)

    this.activeFade = this.activeFade === 'A' ? 'B' : 'A'
    this.currentMood = this.targetMood
    this.barIndex = 0
  }

  update(gameState: {
    isNight: boolean
    atWar: boolean
    disasterActive: boolean
    isEpic: boolean
    isRaining: boolean
  }): void {
    if (!this.ctx) return
    const ctx = this.ctx
    if (ctx.state === 'suspended') return
    // Determine target mood from game state
    let mood: Mood = 'peaceful'
    if (gameState.isEpic) mood = 'epic'
    else if (gameState.disasterActive) mood = 'disaster'
    else if (gameState.atWar) mood = 'war'
    else if (gameState.isNight) mood = 'night'

    if (mood !== this.targetMood) {
      this.targetMood = mood
      this.crossfadeToNewMood()
    }
    // Schedule upcoming bars
    if (!this.started) {
      this.nextBarTime = ctx.currentTime + 0.1
      this.started = true
    }
    while (this.nextBarTime < ctx.currentTime + 2) {
      this.scheduleBar()
    }
    // Bird chirps (daytime, random interval)
    const now = ctx.currentTime
    if (!gameState.isNight && now - this.lastBirdTime > 2 + Math.random() * 5) {
      this.playBirdChirp()
      this.lastBirdTime = now
    }
    // Insect chirps (nighttime)
    if (gameState.isNight && now - this.lastInsectTime > 1.5 + Math.random() * 3) {
      this.playInsectChirp()
      this.lastInsectTime = now
    }
    // Rain layer volume
    if (this.rainGainNode) {
      const target = gameState.isRaining ? 0.2 : 0
      const cur = this.rainGainNode.gain.value
      const step = (target - cur) * 0.05
      this.rainGainNode.gain.setValueAtTime(cur + step, now)
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (!muted) {
      // User interaction: safe to create/resume AudioContext
      const ctx = this.getCtx()
      if (ctx.state === 'suspended') ctx.resume()
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime)
    }
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v))
    if (this.masterGain && !this.muted && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime)
    }
  }

  dispose(): void {
    try { this.windSource?.stop() } catch (_) { /* already stopped */ }
    try { this.waterSource?.stop() } catch (_) { /* already stopped */ }
    try { this.rainSource?.stop() } catch (_) { /* already stopped */ }
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
    this.started = false
    this.masterGain = null
    this.musicGain = null
    this.ambientGain = null
    this.fadeGainA = null
    this.fadeGainB = null
  }
}
