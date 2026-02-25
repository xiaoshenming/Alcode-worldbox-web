/**
 * SeasonSystem - Four seasons cycle affecting weather, crops, animal behavior, and visuals
 * v1.23
 */

export enum Season {
  Spring = 'spring',
  Summer = 'summer',
  Autumn = 'autumn',
  Winter = 'winter',
}

export interface SeasonConfig {
  name: string
  season: Season
  growthMultiplier: number    // crop growth rate modifier
  temperatureOffset: number   // base temp modifier (-20 to +15)
  rainChance: number          // 0-1
  snowChance: number          // 0-1
  dayLengthRatio: number      // fraction of day that is "daytime" (0.3-0.7)
  tileColorShift: { r: number; g: number; b: number }  // color overlay for grass/trees
  animalActivityMultiplier: number  // movement/reproduction rate
}

const SEASON_CONFIGS: Record<Season, SeasonConfig> = {
  [Season.Spring]: {
    name: '春',
    season: Season.Spring,
    growthMultiplier: 1.5,
    temperatureOffset: 5,
    rainChance: 0.4,
    snowChance: 0,
    dayLengthRatio: 0.55,
    tileColorShift: { r: -10, g: 20, b: -5 },
    animalActivityMultiplier: 1.3,
  },
  [Season.Summer]: {
    name: '夏',
    season: Season.Summer,
    growthMultiplier: 1.2,
    temperatureOffset: 15,
    rainChance: 0.2,
    snowChance: 0,
    dayLengthRatio: 0.7,
    tileColorShift: { r: 10, g: 10, b: -10 },
    animalActivityMultiplier: 1.0,
  },
  [Season.Autumn]: {
    name: '秋',
    season: Season.Autumn,
    growthMultiplier: 0.6,
    temperatureOffset: -5,
    rainChance: 0.3,
    snowChance: 0.05,
    dayLengthRatio: 0.5,
    tileColorShift: { r: 30, g: -10, b: -20 },
    animalActivityMultiplier: 0.8,
  },
  [Season.Winter]: {
    name: '冬',
    season: Season.Winter,
    growthMultiplier: 0.1,
    temperatureOffset: -20,
    rainChance: 0.15,
    snowChance: 0.5,
    dayLengthRatio: 0.3,
    tileColorShift: { r: -15, g: -15, b: 20 },
    animalActivityMultiplier: 0.4,
  },
}

const TICKS_PER_SEASON = 3600  // ~60 seconds at 60fps per season

export class SeasonSystem {
  private currentSeason: Season = Season.Spring
  private seasonTick: number = 0
  private yearCount: number = 0
  private transitionProgress: number = 0  // 0-1, smooth blend between seasons

  private static TRANSITION_TICKS = 300  // ticks to blend between seasons

  getCurrentSeason(): Season {
    return this.currentSeason
  }

  getConfig(): SeasonConfig {
    return SEASON_CONFIGS[this.currentSeason]
  }

  getYear(): number {
    return this.yearCount
  }

  getSeasonProgress(): number {
    return this.seasonTick / TICKS_PER_SEASON
  }

  getTransitionProgress(): number {
    return this.transitionProgress
  }

  getGrowthMultiplier(): number {
    const current = SEASON_CONFIGS[this.currentSeason]
    if (this.transitionProgress < 1) {
      const prev = SEASON_CONFIGS[this.getPreviousSeason()]
      return prev.growthMultiplier + (current.growthMultiplier - prev.growthMultiplier) * this.transitionProgress
    }
    return current.growthMultiplier
  }

  getTemperatureOffset(): number {
    const current = SEASON_CONFIGS[this.currentSeason]
    if (this.transitionProgress < 1) {
      const prev = SEASON_CONFIGS[this.getPreviousSeason()]
      return prev.temperatureOffset + (current.temperatureOffset - prev.temperatureOffset) * this.transitionProgress
    }
    return current.temperatureOffset
  }

  getRainChance(): number {
    return this.getConfig().rainChance
  }

  getSnowChance(): number {
    return this.getConfig().snowChance
  }

  getAnimalActivityMultiplier(): number {
    const current = SEASON_CONFIGS[this.currentSeason]
    if (this.transitionProgress < 1) {
      const prev = SEASON_CONFIGS[this.getPreviousSeason()]
      return prev.animalActivityMultiplier + (current.animalActivityMultiplier - prev.animalActivityMultiplier) * this.transitionProgress
    }
    return current.animalActivityMultiplier
  }

  getTileColorShift(): { r: number; g: number; b: number } {
    const current = SEASON_CONFIGS[this.currentSeason]
    if (this.transitionProgress < 1) {
      const prev = SEASON_CONFIGS[this.getPreviousSeason()]
      return {
        r: prev.tileColorShift.r + (current.tileColorShift.r - prev.tileColorShift.r) * this.transitionProgress,
        g: prev.tileColorShift.g + (current.tileColorShift.g - prev.tileColorShift.g) * this.transitionProgress,
        b: prev.tileColorShift.b + (current.tileColorShift.b - prev.tileColorShift.b) * this.transitionProgress,
      }
    }
    return { ...current.tileColorShift }
  }

  getDayLengthRatio(): number {
    return this.getConfig().dayLengthRatio
  }

  private getPreviousSeason(): Season {
    const order = [Season.Spring, Season.Summer, Season.Autumn, Season.Winter]
    const idx = order.indexOf(this.currentSeason)
    return order[(idx + 3) % 4]
  }

  private getNextSeason(): Season {
    const order = [Season.Spring, Season.Summer, Season.Autumn, Season.Winter]
    const idx = order.indexOf(this.currentSeason)
    return order[(idx + 1) % 4]
  }

  update(tick: number): void {
    this.seasonTick++

    // Handle transition blending
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + 1 / SeasonSystem.TRANSITION_TICKS)
    }

    // Season change
    if (this.seasonTick >= TICKS_PER_SEASON) {
      this.seasonTick = 0
      this.transitionProgress = 0
      const nextSeason = this.getNextSeason()

      if (nextSeason === Season.Spring) {
        this.yearCount++
      }

      this.currentSeason = nextSeason
    }
  }

  /** Serialize for save system */
  serialize(): object {
    return {
      currentSeason: this.currentSeason,
      seasonTick: this.seasonTick,
      yearCount: this.yearCount,
      transitionProgress: this.transitionProgress,
    }
  }

  /** Deserialize from save */
  deserialize(data: any): void {
    if (!data) return
    this.currentSeason = data.currentSeason ?? Season.Spring
    this.seasonTick = data.seasonTick ?? 0
    this.yearCount = data.yearCount ?? 0
    this.transitionProgress = data.transitionProgress ?? 1
  }
}
