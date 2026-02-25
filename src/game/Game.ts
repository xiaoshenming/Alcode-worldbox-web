import { World } from './World'
import { Camera } from './Camera'
import { Renderer } from './Renderer'
import { Input } from './Input'
import { Powers } from './Powers'
import { EntityType, TILE_SIZE, TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'
import { Toolbar } from '../ui/Toolbar'
import { InfoPanel } from '../ui/InfoPanel'
import { CreaturePanel } from '../ui/CreaturePanel'
import { EventPanel } from '../ui/EventPanel'
import { StatsPanel } from '../ui/StatsPanel'
import { ContextMenu, MenuSection } from '../ui/ContextMenu'
import { EntityManager, PositionComponent, CreatureComponent, NeedsComponent, HeroComponent, VelocityComponent, GeneticsComponent } from '../ecs/Entity'
import { AISystem } from '../systems/AISystem'
import { CombatSystem } from '../systems/CombatSystem'
import { ParticleSystem } from '../systems/ParticleSystem'
import { SoundSystem } from '../systems/SoundSystem'
import { WeatherSystem } from '../systems/WeatherSystem'
import { ResourceSystem } from '../systems/ResourceSystem'
import { SaveSystem, SaveSlotMeta } from './SaveSystem'
import { CreatureFactory } from '../entities/CreatureFactory'
import { CivManager } from '../civilization/CivManager'
import { AchievementSystem, WorldStats } from '../systems/AchievementSystem'
import { DisasterSystem } from '../systems/DisasterSystem'
import { TimelineSystem } from '../systems/TimelineSystem'
import { TechSystem } from '../systems/TechSystem'
import { MigrationSystem } from '../systems/MigrationSystem'
import { EventLog } from '../systems/EventLog'
import { ArtifactSystem } from '../systems/ArtifactSystem'
import { DiseaseSystem } from '../systems/DiseaseSystem'
import { WorldEventSystem } from '../systems/WorldEventSystem'
import { CaravanSystem } from '../systems/CaravanSystem'
import { DiplomacySystem } from '../systems/DiplomacySystem'
import { CropSystem } from '../systems/CropSystem'
import { NavalSystem } from '../systems/NavalSystem'
import { QuestSystem } from '../systems/QuestSystem'
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem'
import { EcosystemSystem } from '../systems/EcosystemSystem'
import { FogOfWarSystem } from '../systems/FogOfWarSystem'
import { ReligionSystem } from '../systems/ReligionSystem'
import { AmbientParticleSystem } from '../systems/AmbientParticleSystem'
import { CityPlanningSystem } from '../systems/CityPlanningSystem'
import { ArmySystem } from '../systems/ArmySystem'
import { EraSystem } from '../systems/EraSystem'
import { TechTreePanel } from '../ui/TechTreePanel'
import { TradeEconomySystem } from '../systems/TradeEconomySystem'
import { HeroLegendSystem } from '../systems/HeroLegendSystem'
import { WonderSystem } from '../systems/WonderSystem'
import { ToastSystem } from '../ui/ToastSystem'
import { TickBudgetSystem } from '../systems/TickBudgetSystem'
import { LoyaltySystem } from '../systems/LoyaltySystem'
import { BiomeEvolutionSystem } from '../systems/BiomeEvolutionSystem'
import { EspionageSystem } from '../systems/EspionageSystem'
import { DayNightRenderer } from '../systems/DayNightRenderer'
import { GodPowerSystem } from '../systems/GodPowerSystem'
import { WorldChronicleSystem, WorldSnapshot } from '../systems/WorldChronicleSystem'
import { CultureSystem } from '../systems/CultureSystem'
import { MusicSystem } from '../systems/MusicSystem'
import { MiningSystem } from '../systems/MiningSystem'
import { DisasterChainSystem } from '../systems/DisasterChainSystem'
import { SeasonSystem } from '../systems/SeasonSystem'
import { AnimalMigrationSystem } from '../systems/AnimalMigrationSystem'
import { VolcanoSystem } from '../systems/VolcanoSystem'
import { RiverSystem } from '../systems/RiverSystem'
import { TradeRouteRenderer, TradeRoute } from '../systems/TradeRouteRenderer'
import { RuinsSystem } from '../systems/RuinsSystem'
import { PlagueVisualSystem } from '../systems/PlagueVisualSystem'
import { WorldDecorationSystem } from '../systems/WorldDecorationSystem'
import { EraVisualSystem } from '../systems/EraVisualSystem'
import { WeatherDisasterSystem } from '../systems/WeatherDisasterSystem'
import { FogOfWarRenderer } from '../systems/FogOfWarRenderer'
import { FortificationRenderer, CityFortification } from '../systems/FortificationRenderer'
import { EvolutionSystem } from '../systems/EvolutionSystem'
import { PopulationSystem } from '../systems/PopulationSystem'
import { AllianceSystem } from '../systems/AllianceSystem'
import { TerraformingSystem } from '../systems/TerraformingSystem'
import { StatisticsTracker } from '../systems/StatisticsTracker'
import { SpatialHashSystem } from '../systems/SpatialHashSystem'
import { ObjectPoolSystem } from '../systems/ObjectPoolSystem'
import { MinimapOverlaySystem } from '../systems/MinimapOverlaySystem'
import { PortalSystem } from '../systems/PortalSystem'
import { WaterAnimationSystem } from '../systems/WaterAnimationSystem'
import { MinimapSystem } from '../systems/MinimapSystem'
import { FormationSystem } from '../systems/FormationSystem'
import { AchievementContentSystem, WorldStats as AchContentWorldStats } from '../systems/AchievementContentSystem'
import { ChartPanelSystem } from '../systems/ChartPanelSystem'
import { ClonePowerSystem } from '../systems/ClonePowerSystem'
import { SiegeWarfareSystem } from '../systems/SiegeWarfareSystem'
import { TutorialSystem } from '../systems/TutorialSystem'
import { RenderCullingSystem } from '../systems/RenderCullingSystem'
import { ReputationSystem } from '../systems/ReputationSystem'
import { SiegeSystem } from '../systems/SiegeSystem'
import { DisasterWarningSystem } from '../systems/DisasterWarningSystem'
import { MoodSystem } from '../systems/MoodSystem'
import { WorldAgeSystem } from '../systems/WorldAgeSystem'
import { HelpOverlaySystem } from '../systems/HelpOverlaySystem'
import { BloodMoonSystem } from '../systems/BloodMoonSystem'
import { CreatureAgingSystem } from '../systems/CreatureAgingSystem'
import { ResourceScarcitySystem } from '../systems/ResourceScarcitySystem'
import { LegendaryBattleSystem } from '../systems/LegendaryBattleSystem'
import { WorldBorderSystem } from '../systems/WorldBorderSystem'
import { EnhancedTooltipSystem } from '../systems/EnhancedTooltipSystem'
import { NavalCombatSystem } from '../systems/NavalCombatSystem'
import { ReligionSpreadSystem } from '../systems/ReligionSpreadSystem'
import { GeneticDisplaySystem } from '../systems/GeneticDisplaySystem'

export class Game {
  private world: World
  private camera: Camera
  private renderer: Renderer
  private input: Input
  private powers: Powers
  private toolbar: Toolbar
  private infoPanel: InfoPanel
  private creaturePanel: CreaturePanel
  private eventPanel: EventPanel
  private statsPanel: StatsPanel
  private techTreePanel: TechTreePanel
  private contextMenu: ContextMenu

  em: EntityManager
  private aiSystem: AISystem
  private combatSystem: CombatSystem
  particles: ParticleSystem
  private audio: SoundSystem
  creatureFactory: CreatureFactory
  civManager: CivManager
  private weather: WeatherSystem
  private resources: ResourceSystem
  private achievements: AchievementSystem
  private disasterSystem: DisasterSystem
  private timeline: TimelineSystem
  private techSystem: TechSystem
  private migrationSystem!: MigrationSystem
  private artifactSystem: ArtifactSystem
  private diseaseSystem: DiseaseSystem
  private worldEventSystem: WorldEventSystem
  private caravanSystem: CaravanSystem
  private diplomacySystem: DiplomacySystem
  private cropSystem: CropSystem
  private navalSystem: NavalSystem
  private questSystem: QuestSystem
  private buildingUpgradeSystem: BuildingUpgradeSystem
  private ecosystemSystem: EcosystemSystem
  private fogOfWarSystem: FogOfWarSystem
  private religionSystem: ReligionSystem
  private ambientParticles: AmbientParticleSystem
  private cityPlanningSystem: CityPlanningSystem
  private armySystem: ArmySystem
  private eraSystem: EraSystem
  private tradeEconomySystem: TradeEconomySystem
  private heroLegendSystem: HeroLegendSystem
  private wonderSystem: WonderSystem
  private toastSystem: ToastSystem
  private tickBudget: TickBudgetSystem
  private loyaltySystem: LoyaltySystem
  private biomeEvolution: BiomeEvolutionSystem
  private espionageSystem: EspionageSystem
  private dayNightRenderer: DayNightRenderer
  private godPowerSystem: GodPowerSystem
  private worldChronicle: WorldChronicleSystem
  private cultureSystem: CultureSystem
  private musicSystem!: MusicSystem
  private miningSystem: MiningSystem
  private disasterChainSystem: DisasterChainSystem
  private seasonSystem: SeasonSystem
  private animalMigration: AnimalMigrationSystem
  private volcanoSystem!: VolcanoSystem
  private riverSystem: RiverSystem
  private tradeRouteRenderer: TradeRouteRenderer
  private ruinsSystem: RuinsSystem
  private plagueVisual: PlagueVisualSystem
  private worldDecorations: WorldDecorationSystem
  private eraVisual: EraVisualSystem
  private weatherDisaster: WeatherDisasterSystem
  private fogOfWar: FogOfWarRenderer
  private fortificationRenderer: FortificationRenderer
  private evolutionSystem: EvolutionSystem
  private populationSystem: PopulationSystem
  private allianceSystem: AllianceSystem
  private terraformingSystem: TerraformingSystem
  private statisticsTracker: StatisticsTracker
  private spatialHash: SpatialHashSystem
  private objectPool: ObjectPoolSystem
  private minimapOverlay: MinimapOverlaySystem
  private portalSystem: PortalSystem
  private waterAnimation: WaterAnimationSystem
  private minimapSystem: MinimapSystem
  private formationSystem: FormationSystem
  private achievementContent: AchievementContentSystem
  private chartPanel: ChartPanelSystem
  private clonePower: ClonePowerSystem
  private siegeWarfare: SiegeWarfareSystem
  private tutorial: TutorialSystem
  private renderCulling: RenderCullingSystem
  private reputationSystem: ReputationSystem
  private siegeSystem: SiegeSystem
  private disasterWarning: DisasterWarningSystem
  private moodSystem: MoodSystem
  private worldAge: WorldAgeSystem
  private helpOverlay: HelpOverlaySystem
  private bloodMoon: BloodMoonSystem
  private creatureAging: CreatureAgingSystem
  private resourceScarcity: ResourceScarcitySystem
  private legendaryBattle: LegendaryBattleSystem
  private worldBorder: WorldBorderSystem
  private enhancedTooltip: EnhancedTooltipSystem
  private navalCombat: NavalCombatSystem
  private religionSpread: ReligionSpreadSystem
  private geneticDisplay: GeneticDisplaySystem

  private canvas: HTMLCanvasElement
  private minimapCanvas: HTMLCanvasElement
  private speed: number = 1
  private lastTime: number = 0
  private accumulator: number = 0
  private readonly tickRate: number = 1000 / 60
  private fps: number = 0
  private frameCount: number = 0
  private fpsTime: number = 0

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
    this.minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement

    this.world = new World()
    this.camera = new Camera(window.innerWidth, window.innerHeight)
    this.renderer = new Renderer(this.canvas, this.minimapCanvas)
    this.input = new Input(this.canvas, this.camera)

    this.em = new EntityManager()
    this.creatureFactory = new CreatureFactory(this.em)
    this.civManager = new CivManager(this.em, this.world)
    this.particles = new ParticleSystem()
    this.audio = new SoundSystem()
    this.aiSystem = new AISystem(this.em, this.world, this.particles, this.creatureFactory)
    this.combatSystem = new CombatSystem(this.em, this.civManager, this.particles, this.audio)
    this.weather = new WeatherSystem(this.world, this.particles, this.em)
    this.resources = new ResourceSystem(this.world, this.em, this.civManager, this.particles)
    this.achievements = new AchievementSystem()
    this.disasterSystem = new DisasterSystem(this.world, this.particles, this.em)
    this.timeline = new TimelineSystem()
    this.techSystem = new TechSystem()
    this.migrationSystem = new MigrationSystem()
    this.artifactSystem = new ArtifactSystem()
    this.diseaseSystem = new DiseaseSystem()
    this.worldEventSystem = new WorldEventSystem()
    this.caravanSystem = new CaravanSystem()
    this.diplomacySystem = new DiplomacySystem()
    this.cropSystem = new CropSystem()
    this.navalSystem = new NavalSystem()
    this.questSystem = new QuestSystem()
    this.buildingUpgradeSystem = new BuildingUpgradeSystem()
    this.ecosystemSystem = new EcosystemSystem()
    this.fogOfWarSystem = new FogOfWarSystem()
    this.religionSystem = new ReligionSystem()
    this.ambientParticles = new AmbientParticleSystem()
    this.cityPlanningSystem = new CityPlanningSystem()
    this.armySystem = new ArmySystem()
    this.eraSystem = new EraSystem()
    this.tradeEconomySystem = new TradeEconomySystem()
    this.heroLegendSystem = new HeroLegendSystem()
    this.wonderSystem = new WonderSystem()
    this.toastSystem = new ToastSystem()
    this.tickBudget = new TickBudgetSystem()
    this.loyaltySystem = new LoyaltySystem()
    this.biomeEvolution = new BiomeEvolutionSystem()
    this.espionageSystem = new EspionageSystem()
    this.dayNightRenderer = new DayNightRenderer()
    this.godPowerSystem = new GodPowerSystem()
    this.worldChronicle = new WorldChronicleSystem()
    this.cultureSystem = new CultureSystem()
    this.musicSystem = new MusicSystem()
    this.miningSystem = new MiningSystem()
    this.miningSystem.generateOreMap(this.world.tiles)
    this.disasterChainSystem = new DisasterChainSystem()
    this.disasterChainSystem.setCallbacks({
      triggerEarthquake: (x, y, mag) => {
        const r = Math.ceil(mag * 0.8)
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            if (Math.random() < 0.15) this.world.setTile(tx, ty, TileType.MOUNTAIN)
          }
        }
        this.particles.spawnExplosion(x, y)
      },
      triggerTsunami: (x, y, mag) => {
        const r = Math.ceil(mag * 1.5)
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            const tile = this.world.getTile(tx, ty)
            if (tile === TileType.SAND || tile === TileType.GRASS) {
              if (Math.random() < 0.3) this.world.setTile(tx, ty, TileType.SHALLOW_WATER)
            }
          }
        }
        this.particles.spawnRain(x, y)
      },
      triggerWildfire: (x, y, _mag) => {
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            if (this.world.getTile(tx, ty) === TileType.FOREST && Math.random() < 0.2) {
              this.world.setTile(tx, ty, TileType.SAND)
            }
          }
        }
      },
      triggerDesertification: (x, y, radius) => {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            const tile = this.world.getTile(tx, ty)
            if ((tile === TileType.GRASS || tile === TileType.FOREST) && Math.random() < 0.15) {
              this.world.setTile(tx, ty, TileType.SAND)
            }
          }
        }
      },
      triggerDiseaseOutbreak: (x, y, _mag) => {
        const creatures = this.em.getEntitiesWithComponents('position', 'creature', 'needs')
        for (const id of creatures) {
          const pos = this.em.getComponent<PositionComponent>(id, 'position')!
          if (Math.abs(pos.x - x) < 8 && Math.abs(pos.y - y) < 8) {
            if (Math.random() < 0.3 && !this.em.getComponent(id, 'disease')) {
              this.em.addComponent(id, { type: 'disease', diseaseType: 'fever', severity: 3, duration: 0, contagious: true, immune: false, immuneUntil: 0 })
            }
          }
        }
      },
      triggerBuildingDamage: (x, y, radius, severity) => {
        const buildings = this.em.getEntitiesWithComponents('position', 'building')
        for (const id of buildings) {
          const pos = this.em.getComponent<PositionComponent>(id, 'position')!
          if (Math.abs(pos.x - x) <= radius && Math.abs(pos.y - y) <= radius) {
            if (Math.random() < severity) this.em.removeEntity(id)
          }
        }
      },
      triggerCooling: (_mag) => { /* temperature handled internally */ },
      triggerCropFailure: (x, y, radius, severity) => {
        const crops = this.em.getEntitiesWithComponents('position', 'crop')
        for (const id of crops) {
          const pos = this.em.getComponent<PositionComponent>(id, 'position')!
          if (Math.abs(pos.x - x) <= radius && Math.abs(pos.y - y) <= radius) {
            if (Math.random() < severity) this.em.removeEntity(id)
          }
        }
      },
      setTileAt: (x, y, stage) => {
        if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return
        const current = this.world.getTile(x, y)
        if (stage === 1 && current === TileType.LAVA) this.world.setTile(x, y, TileType.MOUNTAIN)
        else if (stage === 3 && current === TileType.MOUNTAIN) this.world.setTile(x, y, TileType.GRASS)
      },
      isWaterNear: (x, y, radius) => {
        for (let dy = -radius; dy <= radius; dy += 3) {
          for (let dx = -radius; dx <= radius; dx += 3) {
            const tx = x + dx, ty = y + dy
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) continue
            const t = this.world.getTile(tx, ty)
            if (t === TileType.DEEP_WATER || t === TileType.SHALLOW_WATER) return true
          }
        }
        return false
      },
      countForestTiles: () => {
        let count = 0
        for (let y = 0; y < WORLD_HEIGHT; y += 4) {
          for (let x = 0; x < WORLD_WIDTH; x += 4) {
            if (this.world.getTile(x, y) === TileType.FOREST) count++
          }
        }
        return count * 16
      },
      countTotalLand: () => {
        let count = 0
        for (let y = 0; y < WORLD_HEIGHT; y += 4) {
          for (let x = 0; x < WORLD_WIDTH; x += 4) {
            const t = this.world.getTile(x, y)
            if (t !== TileType.DEEP_WATER && t !== TileType.SHALLOW_WATER && t !== null) count++
          }
        }
        return count * 16
      },
      getSpeciesCounts: () => {
        const counts = new Map<string, number>()
        const creatures = this.em.getEntitiesWithComponents('creature')
        for (const id of creatures) {
          const c = this.em.getComponent<CreatureComponent>(id, 'creature')!
          counts.set(c.species, (counts.get(c.species) || 0) + 1)
        }
        return counts
      },
      countWarZones: () => {
        let wars = 0
        for (const [, civ] of this.civManager.civilizations) {
          if ((civ as any).atWar || (civ as any).wars?.length > 0) wars++
        }
        return Math.floor(wars / 2)
      },
    })
    this.seasonSystem = new SeasonSystem()
    this.animalMigration = new AnimalMigrationSystem()
    this.volcanoSystem = new VolcanoSystem()
    this.volcanoSystem.autoPlaceVolcanoes(this.world)
    this.riverSystem = new RiverSystem()
    this.riverSystem.generateRivers(this.world.tiles, WORLD_WIDTH, WORLD_HEIGHT)
    this.tradeRouteRenderer = new TradeRouteRenderer()
    this.ruinsSystem = new RuinsSystem()
    this.plagueVisual = new PlagueVisualSystem()
    this.worldDecorations = new WorldDecorationSystem()
    this.worldDecorations.generate(this.world.tiles, WORLD_WIDTH, WORLD_HEIGHT)
    this.eraVisual = new EraVisualSystem()
    this.weatherDisaster = new WeatherDisasterSystem()
    this.fogOfWar = new FogOfWarRenderer()
    this.fortificationRenderer = new FortificationRenderer()
    this.evolutionSystem = new EvolutionSystem()
    this.populationSystem = new PopulationSystem()
    this.allianceSystem = new AllianceSystem()
    this.terraformingSystem = new TerraformingSystem()
    this.statisticsTracker = new StatisticsTracker()
    this.spatialHash = new SpatialHashSystem(16)
    this.objectPool = new ObjectPoolSystem()
    this.minimapOverlay = new MinimapOverlaySystem()
    this.portalSystem = new PortalSystem()
    this.waterAnimation = new WaterAnimationSystem()
    this.minimapSystem = new MinimapSystem(this.world.width, this.world.height)
    this.formationSystem = new FormationSystem()
    this.achievementContent = new AchievementContentSystem()
    this.chartPanel = new ChartPanelSystem()
    this.clonePower = new ClonePowerSystem()
    this.siegeWarfare = new SiegeWarfareSystem()
    this.tutorial = new TutorialSystem()
    this.renderCulling = new RenderCullingSystem()
    this.reputationSystem = new ReputationSystem()
    this.siegeSystem = new SiegeSystem()
    this.disasterWarning = new DisasterWarningSystem()
    this.moodSystem = new MoodSystem()
    this.worldAge = new WorldAgeSystem()
    this.helpOverlay = new HelpOverlaySystem()
    this.bloodMoon = new BloodMoonSystem()
    this.creatureAging = new CreatureAgingSystem()
    this.resourceScarcity = new ResourceScarcitySystem()
    this.legendaryBattle = new LegendaryBattleSystem()
    this.worldBorder = new WorldBorderSystem()
    this.enhancedTooltip = new EnhancedTooltipSystem()
    this.navalCombat = new NavalCombatSystem()
    this.religionSpread = new ReligionSpreadSystem()
    this.geneticDisplay = new GeneticDisplaySystem()
    this.renderCulling.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
    this.toastSystem.setupEventListeners()
    this.setupAchievementTracking()
    this.setupParticleEventHooks()
    this.setupSoundEventHooks()
    this.aiSystem.setResourceSystem(this.resources)
    this.aiSystem.setCivManager(this.civManager)
    this.combatSystem.setArtifactSystem(this.artifactSystem)

    this.powers = new Powers(this.world, this.em, this.creatureFactory, this.civManager, this.particles, this.audio)
    this.toolbar = new Toolbar('toolbar', this.powers)
    this.infoPanel = new InfoPanel('worldInfo', this.world, this.em, this.civManager)
    this.creaturePanel = new CreaturePanel('creaturePanel', this.em, this.civManager)
    this.eventPanel = new EventPanel('eventPanel')
    this.statsPanel = new StatsPanel('statsPanel', this.em, this.civManager)
    this.techTreePanel = new TechTreePanel('techTreePanel', this.civManager)
    this.contextMenu = new ContextMenu('contextMenu')

    this.setupSpeedControls()
    this.setupBrushControls()
    this.setupInputCallbacks()
    this.setupContextMenu()
    this.setupResize()
    this.setupToolbarButtons()
    this.setupKeyboard()
    this.setupTooltip()
    this.setupMuteButton()
    this.setupMinimapClick()
    this.setupMinimapModeBtn()
    this.renderer.resize(window.innerWidth, window.innerHeight)
  }

  private setupToolbarButtons(): void {
    // New World button
    const newWorldBtn = document.getElementById('newWorldBtn')
    if (newWorldBtn) {
      newWorldBtn.addEventListener('click', () => {
        this.resetWorld()
      })
    }

    // Toggle Territory button
    const toggleTerritoryBtn = document.getElementById('toggleTerritoryBtn')
    if (toggleTerritoryBtn) {
      toggleTerritoryBtn.addEventListener('click', () => {
        this.renderer.showTerritory = !this.renderer.showTerritory
        toggleTerritoryBtn.classList.toggle('active', this.renderer.showTerritory)
      })
      toggleTerritoryBtn.classList.add('active')
    }

    // Save button - opens save panel
    const saveBtn = document.getElementById('saveBtn')
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.showSaveLoadPanel('save')
      })
    }

    // Load button - opens load panel
    const loadBtn = document.getElementById('loadBtn')
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        this.showSaveLoadPanel('load')
      })
    }

    // Achievements button
    const achievementsBtn = document.getElementById('achievementsBtn')
    const achievementsPanel = document.getElementById('achievementsPanel')
    if (achievementsBtn && achievementsPanel) {
      achievementsBtn.addEventListener('click', () => {
        const visible = achievementsPanel.style.display !== 'none'
        achievementsPanel.style.display = visible ? 'none' : 'block'
        if (!visible) this.renderAchievementsPanel()
      })
    }

    // Timeline button
    const timelineBtn = document.getElementById('timelineBtn')
    const timelinePanel = document.getElementById('timelinePanel')
    if (timelineBtn && timelinePanel) {
      timelineBtn.addEventListener('click', () => {
        const visible = timelinePanel.style.display !== 'none'
        timelinePanel.style.display = visible ? 'none' : 'block'
        if (!visible) this.renderTimelinePanel()
      })
    }

    // Stats button
    const statsBtn = document.getElementById('statsBtn')
    if (statsBtn) {
      statsBtn.addEventListener('click', () => {
        this.statsPanel.toggle()
      })
    }

    // Tech Tree button
    const techTreeBtn = document.getElementById('techTreeBtn')
    if (techTreeBtn) {
      techTreeBtn.addEventListener('click', () => {
        this.techTreePanel.toggle()
      })
    }
  }

  private resetWorld(): void {
    // Clear all entities
    for (const id of this.em.getAllEntities()) {
      this.em.removeEntity(id)
    }

    // Reset civilization manager
    this.civManager = new CivManager(this.em, this.world)
    this.aiSystem = new AISystem(this.em, this.world, this.particles, this.creatureFactory)
    this.combatSystem = new CombatSystem(this.em, this.civManager, this.particles, this.audio)
    this.weather = new WeatherSystem(this.world, this.particles, this.em)
    this.resources = new ResourceSystem(this.world, this.em, this.civManager, this.particles)
    this.disasterSystem = new DisasterSystem(this.world, this.particles, this.em)
    this.timeline = new TimelineSystem()
    this.techSystem = new TechSystem()
    this.migrationSystem = new MigrationSystem()
    this.artifactSystem = new ArtifactSystem()
    this.diseaseSystem = new DiseaseSystem()
    this.worldEventSystem = new WorldEventSystem()
    this.caravanSystem = new CaravanSystem()
    this.diplomacySystem = new DiplomacySystem()
    this.cropSystem = new CropSystem()
    this.navalSystem = new NavalSystem()
    this.questSystem = new QuestSystem()
    this.buildingUpgradeSystem = new BuildingUpgradeSystem()
    this.ecosystemSystem = new EcosystemSystem()
    this.fogOfWarSystem = new FogOfWarSystem()
    this.religionSystem = new ReligionSystem()
    this.ambientParticles = new AmbientParticleSystem()
    this.cityPlanningSystem = new CityPlanningSystem()
    this.armySystem = new ArmySystem()
    this.eraSystem = new EraSystem()
    this.tradeEconomySystem = new TradeEconomySystem()
    this.heroLegendSystem = new HeroLegendSystem()
    this.wonderSystem = new WonderSystem()
    this.loyaltySystem = new LoyaltySystem()
    this.biomeEvolution = new BiomeEvolutionSystem()
    this.espionageSystem = new EspionageSystem()
    this.godPowerSystem = new GodPowerSystem()
    this.musicSystem.dispose()
    this.musicSystem = new MusicSystem()
    this.miningSystem = new MiningSystem()
    this.aiSystem.setResourceSystem(this.resources)
    this.aiSystem.setCivManager(this.civManager)
    this.combatSystem.setArtifactSystem(this.artifactSystem)
    this.powers = new Powers(this.world, this.em, this.creatureFactory, this.civManager, this.particles, this.audio)
    this.infoPanel = new InfoPanel('worldInfo', this.world, this.em, this.civManager)
    this.creaturePanel = new CreaturePanel('creaturePanel', this.em, this.civManager)
    this.statsPanel = new StatsPanel('statsPanel', this.em, this.civManager)
    this.techTreePanel = new TechTreePanel('techTreePanel', this.civManager)

    // Generate new world
    this.world.generate()
    this.miningSystem.generateOreMap(this.world.tiles)
    this.riverSystem = new RiverSystem()
    this.riverSystem.generateRivers(this.world.tiles, WORLD_WIDTH, WORLD_HEIGHT)
    this.tradeRouteRenderer = new TradeRouteRenderer()
    this.ruinsSystem = new RuinsSystem()
    this.plagueVisual = new PlagueVisualSystem()
    this.worldDecorations = new WorldDecorationSystem()
    this.worldDecorations.generate(this.world.tiles, WORLD_WIDTH, WORLD_HEIGHT)
    this.eraVisual = new EraVisualSystem()
    this.weatherDisaster = new WeatherDisasterSystem()
    this.fogOfWar = new FogOfWarRenderer()
    this.fortificationRenderer = new FortificationRenderer()
    this.evolutionSystem = new EvolutionSystem()
    this.populationSystem = new PopulationSystem()
    this.allianceSystem = new AllianceSystem()
    this.terraformingSystem = new TerraformingSystem()
    this.statisticsTracker = new StatisticsTracker()
    this.spatialHash = new SpatialHashSystem(16)
    this.achievementContent = new AchievementContentSystem()
    this.chartPanel = new ChartPanelSystem()
    this.clonePower = new ClonePowerSystem()
    this.siegeWarfare = new SiegeWarfareSystem()
    this.tutorial = new TutorialSystem()
    this.renderCulling = new RenderCullingSystem()
    this.reputationSystem = new ReputationSystem()
    this.siegeSystem = new SiegeSystem()
    this.disasterWarning = new DisasterWarningSystem()
    this.moodSystem = new MoodSystem()
    this.worldAge = new WorldAgeSystem()
    this.bloodMoon = new BloodMoonSystem()
    this.creatureAging = new CreatureAgingSystem()
    this.resourceScarcity = new ResourceScarcitySystem()
    this.legendaryBattle = new LegendaryBattleSystem()
    this.worldBorder = new WorldBorderSystem()
    this.renderCulling.setWorldSize(WORLD_WIDTH, WORLD_HEIGHT)
  }

  private setupSpeedControls(): void {
    const buttons = document.querySelectorAll('#speedControls .btn')
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseInt((btn as HTMLElement).dataset.speed || '1')
        this.speed = speed
        buttons.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
      })
    })
  }

  private setupBrushControls(): void {
    const slider = document.getElementById('brushSlider') as HTMLInputElement
    const value = document.getElementById('brushValue') as HTMLElement
    slider.addEventListener('input', () => {
      const size = parseInt(slider.value)
      this.powers.setBrushSize(size)
      value.textContent = String(size)
    })
  }

  private setupInputCallbacks(): void {
    this.input.setOnMouseDown((x, y) => {
      // Check if clicking on a creature (when no power selected)
      if (!this.powers.getPower()) {
        const clicked = this.findCreatureAt(x, y)
        this.creaturePanel.select(clicked)
        return
      }
      this.powers.apply(x, y)
    })
    this.input.setOnMouseMove((x, y) => {
      if (this.input.isMouseDown && this.input.mouseButton === 0) {
        this.powers.applyContinuous(x, y)
      }
    })
  }

  private findCreatureAt(wx: number, wy: number): number | null {
    const entities = this.em.getEntitiesWithComponents('position', 'creature')
    let closest: number | null = null
    let closestDist = 2 // max click distance in tiles

    for (const id of entities) {
      const pos = this.em.getComponent<PositionComponent>(id, 'position')!
      const dx = pos.x - wx
      const dy = pos.y - wy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < closestDist) {
        closestDist = dist
        closest = id
      }
    }
    return closest
  }

  private setupContextMenu(): void {
    const tileNames = ['Deep Water', 'Shallow Water', 'Sand', 'Grass', 'Forest', 'Mountain', 'Snow', 'Lava']

    this.input.setOnRightClick((wx, wy, screenX, screenY) => {
      const sections: MenuSection[] = []

      // Check if clicked on a creature
      const creatureId = this.findCreatureAt(wx, wy)
      if (creatureId !== null) {
        const creature = this.em.getComponent<CreatureComponent>(creatureId, 'creature')!
        const needs = this.em.getComponent<NeedsComponent>(creatureId, 'needs')!
        sections.push({
          header: `${creature.name} (${creature.species})`,
          items: [
            { icon: '\u{1F50D}', label: 'Inspect', action: () => this.creaturePanel.select(creatureId) },
            { icon: '\u{1F49A}', label: 'Heal', action: () => { needs.health = 100; needs.hunger = 0 } },
            { icon: '\u26A1', label: 'Smite', action: () => { needs.health = 0 } },
          ]
        })

        // Hero options
        const hero = this.em.getComponent<HeroComponent>(creatureId, 'hero')
        if (!hero) {
          sections[sections.length - 1].items.push({
            icon: '\u2B50', label: 'Make Hero', action: () => {
              const abilities: ('warrior'|'ranger'|'healer'|'berserker')[] = ['warrior','ranger','healer','berserker']
              const ability = abilities[Math.floor(Math.random() * abilities.length)]
              this.em.addComponent(creatureId, {
                type: 'hero', level: 1, xp: 0, xpToNext: 30, kills: 0,
                title: ability.charAt(0).toUpperCase() + ability.slice(1),
                ability, abilityCooldown: 0
              } as HeroComponent)
            }
          })
        } else {
          sections[sections.length - 1].items.push({
            icon: '\u2B50', label: `Lv.${hero.level} ${hero.title} (${hero.xp}/${hero.xpToNext} XP)`, action: () => {}
          })
        }
      }

      // Terrain operations
      const tile = this.world.getTile(Math.floor(wx), Math.floor(wy))
      if (tile !== null) {
        sections.push({
          header: `Tile: ${tileNames[tile]} (${Math.floor(wx)}, ${Math.floor(wy)})`,
          items: [
            { icon: '\u{1F464}', label: 'Spawn Human', action: () => this.creatureFactory.spawn(EntityType.HUMAN, wx, wy) },
            { icon: '\u{1F43A}', label: 'Spawn Wolf', action: () => this.creatureFactory.spawn(EntityType.WOLF, wx, wy) },
            { icon: '\u{1F409}', label: 'Spawn Dragon', action: () => this.creatureFactory.spawn(EntityType.DRAGON, wx, wy) },
            { icon: '\u26A1', label: 'Lightning', action: () => this.powers.applyAction('lightning', wx, wy) },
            { icon: '\u2604\uFE0F', label: 'Meteor', action: () => this.powers.applyAction('meteor', wx, wy) },
          ]
        })
      }

      if (sections.length > 0) {
        this.contextMenu.show(screenX, screenY, sections)
      }
    })
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.renderer.resize(window.innerWidth, window.innerHeight)
    })
  }

  private setSpeed(speed: number): void {
    this.speed = speed
    const buttons = document.querySelectorAll('#speedControls .btn')
    buttons.forEach(b => {
      const s = parseInt((b as HTMLElement).dataset.speed || '1')
      b.classList.toggle('active', s === speed)
    })
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // Ignore shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        // Speed controls
        case '1': this.setSpeed(1); break
        case '2': this.setSpeed(2); break
        case '3': this.setSpeed(5); break
        case '4': this.setSpeed(0); break
        case ' ':
          e.preventDefault()
          this.setSpeed(this.speed === 0 ? 1 : 0)
          break
        case 'r':
        case 'R':
          this.resetWorld()
          break

        // Tool category switching: Q/W/E/D
        case 'q':
        case 'Q':
          this.toolbar.setCategory('terrain')
          break
        case 'w':
        case 'W':
          this.toolbar.setCategory('creature')
          break
        case 'e':
        case 'E':
          this.toolbar.setCategory('nature')
          break
        case 'd':
        case 'D':
          this.toolbar.setCategory('disaster')
          break

        // Brush size: [ and ]
        case '[': {
          const slider = document.getElementById('brushSlider') as HTMLInputElement
          if (slider) {
            const val = Math.max(1, parseInt(slider.value) - 1)
            slider.value = String(val)
            slider.dispatchEvent(new Event('input'))
          }
          break
        }
        case ']': {
          const slider = document.getElementById('brushSlider') as HTMLInputElement
          if (slider) {
            const val = Math.min(10, parseInt(slider.value) + 1)
            slider.value = String(val)
            slider.dispatchEvent(new Event('input'))
          }
          break
        }

        // Quick save/load: Ctrl+S / Ctrl+L
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            this.showSaveLoadPanel('save')
          }
          break
        case 'l':
        case 'L':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            this.showSaveLoadPanel('load')
          }
          break

        // Toggle mute: M
        case 'm':
        case 'M': {
          const muted = this.audio.toggleMute()
        this.musicSystem.setMuted(muted)
          const muteBtn = document.getElementById('muteBtn')
          if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊'
          break
        }

        // Toggle territory: T
        case 't':
        case 'T': {
          this.renderer.showTerritory = !this.renderer.showTerritory
          const terBtn = document.getElementById('toggleTerritoryBtn')
          if (terBtn) terBtn.classList.toggle('active', this.renderer.showTerritory)
          break
        }

        case 'h':
        case 'H':
          if (!e.ctrlKey && !e.metaKey) this.helpOverlay.toggle()
          break
        case 'F1':
          e.preventDefault()
          this.helpOverlay.toggle()
          break

        // Escape: close panels / deselect tool
        case 'Escape': {
          if (this.helpOverlay.isVisible()) {
            this.helpOverlay.toggle()
            break
          }
          const savePanel = document.getElementById('saveLoadPanel')
          const achPanel = document.getElementById('achievementsPanel')
          const tlPanel = document.getElementById('timelinePanel')
          if (savePanel?.style.display !== 'none' && savePanel?.style.display) {
            savePanel.style.display = 'none'
          } else if (this.techTreePanel.isVisible()) {
            this.techTreePanel.hide()
          } else if (this.statsPanel.isVisible()) {
            this.statsPanel.hide()
          } else if (achPanel?.style.display !== 'none' && achPanel?.style.display) {
            achPanel.style.display = 'none'
          } else if (tlPanel?.style.display !== 'none' && tlPanel?.style.display) {
            tlPanel.style.display = 'none'
          } else {
            this.powers.setPower(null as any)
            this.toolbar.clearSelection()
          }
          break
        }
      }
    })
  }

  private setupTooltip(): void {
    const oldTooltip = document.getElementById('tooltip')
    if (oldTooltip) oldTooltip.style.display = 'none'

    this.canvas.addEventListener('mousemove', (e) => {
      this.enhancedTooltip.update(
        e.clientX, e.clientY,
        this.camera, this.world,
        this.em, this.civManager
      )
    })

    this.canvas.addEventListener('mouseleave', () => {
      this.enhancedTooltip.hide()
    })
  }

  private setupMuteButton(): void {
    const btn = document.getElementById('muteBtn')
    if (btn) {
      btn.addEventListener('click', () => {
        const muted = this.audio.toggleMute()
        this.musicSystem.setMuted(muted)
        btn.textContent = muted ? '🔇' : '🔊'
      })
    }
  }

  private setupMinimapClick(): void {
    this.minimapCanvas.addEventListener('click', (e) => {
      const rect = this.minimapCanvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      // Convert minimap coords to world tile coords
      const scale = this.minimapCanvas.width / this.world.width
      const worldTileX = mx / scale
      const worldTileY = my / scale

      // Center camera on clicked world position
      const halfViewW = (window.innerWidth / this.camera.zoom) / 2
      const halfViewH = (window.innerHeight / this.camera.zoom) / 2
      this.camera.x = worldTileX * TILE_SIZE - halfViewW
      this.camera.y = worldTileY * TILE_SIZE - halfViewH
    })
  }

  private setupMinimapModeBtn(): void {
    const btn = document.getElementById('minimapModeBtn')
    if (!btn) return
    const modes: Array<'normal' | 'territory' | 'heatmap'> = ['normal', 'territory', 'heatmap']
    const labels: Record<string, string> = { normal: 'Normal', territory: 'Territory', heatmap: 'Heatmap' }
    btn.addEventListener('click', () => {
      const idx = modes.indexOf(this.renderer.minimapMode)
      const next = modes[(idx + 1) % modes.length]
      this.renderer.minimapMode = next
      btn.textContent = labels[next]
    })
  }

  private renderSelectedHighlight(): void {
    const id = this.creaturePanel.getSelected()
    if (!id) return
    const pos = this.em.getComponent<PositionComponent>(id, 'position')
    if (!pos) return

    const ctx = this.canvas.getContext('2d')!
    const tileSize = 8 * this.camera.zoom
    const offsetX = -this.camera.x * this.camera.zoom
    const offsetY = -this.camera.y * this.camera.zoom
    const screenX = pos.x * tileSize + offsetX + tileSize / 2
    const screenY = pos.y * tileSize + offsetY + tileSize / 2
    const radius = 6 * this.camera.zoom

    // Pulsing ring
    const pulse = Math.sin(performance.now() * 0.005) * 0.3 + 0.7
    ctx.strokeStyle = `rgba(255, 255, 100, ${pulse})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  private renderAchievementsPanel(): void {
    const panel = document.getElementById('achievementsPanel')
    if (!panel) return
    const all = this.achievements.getAll()
    const progress = this.achievements.getProgress()
    let html = `<div class="title">\u{1F3C6} Achievements (${progress.unlocked}/${progress.total})</div>`
    html += '<div style="display:flex;flex-direction:column;gap:4px">'
    for (const a of all) {
      const opacity = a.unlocked ? '1' : '0.35'
      const bg = a.unlocked ? 'rgba(100,140,200,0.15)' : 'rgba(40,40,60,0.3)'
      const check = a.unlocked ? '\u2705' : '\u{1F512}'
      html += `<div style="opacity:${opacity};background:${bg};padding:6px 10px;border-radius:6px;display:flex;align-items:center;gap:8px">`
      html += `<span style="font-size:18px">${a.icon}</span>`
      html += `<div><div style="font-weight:bold;font-size:12px">${a.name} ${check}</div>`
      html += `<div style="font-size:10px;color:#888">${a.description}</div></div></div>`
    }
    html += '</div>'
    panel.innerHTML = html
  }

  private updateAchievementsButton(): void {
    const btn = document.getElementById('achievementsBtn')
    if (btn) {
      const p = this.achievements.getProgress()
      btn.textContent = `\u{1F3C6} ${p.unlocked}/${p.total}`
    }
  }

  private renderTimelinePanel(): void {
    const panel = document.getElementById('timelinePanel')
    if (!panel) return

    const era = this.timeline.getCurrentEra()
    const progress = this.timeline.getEraProgress(this.world.tick)
    const age = this.timeline.getWorldAge(this.world.tick)
    const eras = this.timeline.getEraDefinitions()
    const history = this.timeline.getHistory()

    let html = `<div style="font-weight:bold;margin-bottom:8px;font-size:13px;border-bottom:1px solid #555;padding-bottom:4px">`
    html += `\u{1F30D} World Timeline - ${age}</div>`

    // Era progress bar
    html += `<div style="margin-bottom:8px">`
    html += `<div style="font-size:11px;color:${era.color};margin-bottom:3px">Current Era: ${era.name}</div>`
    html += `<div style="background:#222;border-radius:4px;height:8px;overflow:hidden">`
    html += `<div style="background:${era.color};height:100%;width:${Math.round(progress * 100)}%;transition:width 0.3s"></div></div>`

    // Era markers
    html += `<div style="display:flex;gap:2px;margin-top:4px">`
    for (let i = 0; i < eras.length; i++) {
      const e = eras[i]
      const active = i <= era.index
      html += `<div style="flex:1;height:4px;border-radius:2px;background:${active ? e.color : '#333'}" title="${e.name}"></div>`
    }
    html += `</div></div>`

    // Historical events (most recent first)
    html += `<div style="color:#aaa;font-size:10px;margin-bottom:3px">HISTORICAL EVENTS</div>`
    html += `<div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:3px">`
    const recent = history.slice(-20).reverse()
    const typeIcons: Record<string, string> = {
      era_change: '\u{1F451}', war: '\u2694\uFE0F', disaster: '\u{1F30B}',
      achievement: '\u{1F3C6}', founding: '\u{1F3F0}', collapse: '\u{1F4A5}'
    }
    for (const ev of recent) {
      const icon = typeIcons[ev.type] || '\u{1F4DC}'
      const yr = this.timeline.getWorldAge(ev.tick)
      html += `<div style="font-size:10px;padding:2px 4px;background:rgba(40,40,60,0.4);border-radius:3px">`
      html += `<span style="color:#666">${yr}</span> ${icon} ${ev.description}</div>`
    }
    html += `</div>`

    panel.innerHTML = html
  }

  private setupAchievementTracking(): void {
    EventLog.onEvent((e) => {
      if (e.type === 'death') this.achievements.recordDeath()
      if (e.type === 'birth') this.achievements.recordBirth()
      if (e.type === 'war') {
        this.achievements.recordWar()
        this.timeline.recordEvent(this.world.tick, 'war', e.message)
      }
      if (e.type === 'combat') this.achievements.recordKill()
      if (e.type === 'disaster') this.timeline.recordEvent(this.world.tick, 'disaster', e.message)
      if (e.type === 'building' && e.message.includes('founded')) this.timeline.recordEvent(this.world.tick, 'founding', e.message)
    })
  }

  /** Hook into EventLog to trigger celebration fireworks on treaty signing */
  private setupParticleEventHooks(): void {
    EventLog.onEvent((e) => {
      if (e.type === 'peace' && e.message.includes('signed')) {
        // Spawn fireworks at a random territory tile of a signing civ
        for (const [, civ] of this.civManager.civilizations) {
          if (e.message.includes(civ.name) && civ.territory.size > 0) {
            const keys = Array.from(civ.territory)
            const key = keys[Math.floor(Math.random() * keys.length)]
            const [tx, ty] = key.split(',').map(Number)
            const colors = ['#ffd700', '#ff4488', '#44ddff', '#44ff88']
            const color = colors[Math.floor(Math.random() * colors.length)]
            this.particles.spawnFirework(tx, ty, color)
            break
          }
        }
      }
    })
  }

  /** Play contextual sound effects based on game events */
  private setupSoundEventHooks(): void {
    let lastAchievementCount = 0
    EventLog.onEvent((e) => {
      if (e.type === 'building') this.audio.playBuild()
      if (e.type === 'peace' || e.type === 'diplomacy') this.audio.playDiplomacy()
      if (e.type === 'trade') this.audio.playTrade()
      // Check for new achievements
      const current = this.achievements.getProgress().unlocked
      if (current > lastAchievementCount) {
        this.audio.playAchievement()
        lastAchievementCount = current
      }
    })
  }

  /** Spawn hero trails and mutation auras each tick */
  private updateVisualEffects(): void {
    // Hero trails — every 3rd tick to avoid particle spam
    if (this.world.tick % 3 === 0) {
      const heroes = this.em.getEntitiesWithComponents('position', 'hero', 'velocity')
      for (const id of heroes) {
        const pos = this.em.getComponent<PositionComponent>(id, 'position')!
        const vel = this.em.getComponent<VelocityComponent>(id, 'velocity')!
        // Only trail when actually moving
        if (Math.abs(vel.vx) > 0.01 || Math.abs(vel.vy) > 0.01) {
          const hero = this.em.getComponent<HeroComponent>(id, 'hero')!
          const trailColors: Record<string, string> = {
            warrior: '#ffd700', ranger: '#44ff44', healer: '#aaaaff', berserker: '#ff4444'
          }
          this.particles.spawnTrail(pos.x, pos.y, trailColors[hero.ability] || '#ffd700')
        }
      }
    }

    // Mutation auras — every 10th tick
    if (this.world.tick % 10 === 0) {
      const mutants = this.em.getEntitiesWithComponents('position', 'genetics')
      for (const id of mutants) {
        const gen = this.em.getComponent<GeneticsComponent>(id, 'genetics')!
        if (gen.mutations.length > 0) {
          const pos = this.em.getComponent<PositionComponent>(id, 'position')!
          this.particles.spawnAura(pos.x, pos.y, '#d4f', 0.6)
        }
      }
    }
  }

  private gatherWorldStats(): WorldStats {
    const creatures = this.em.getEntitiesWithComponents('position', 'creature')
    const heroes = this.em.getEntitiesWithComponents('hero')
    const buildings = this.em.getEntitiesWithComponents('building')
    let maxPop = 0
    let maxTech = 0
    let tradeRoutes = 0
    for (const [, civ] of this.civManager.civilizations) {
      if (civ.population > maxPop) maxPop = civ.population
      if (civ.techLevel > maxTech) maxTech = civ.techLevel
      tradeRoutes += civ.tradeRoutes.length
    }
    return {
      totalPopulation: creatures.length,
      totalCivs: this.civManager.civilizations.size,
      totalBuildings: buildings.length,
      totalDeaths: 0, // tracked incrementally
      totalBirths: 0,
      totalWars: 0,
      maxTechLevel: maxTech,
      maxCivPopulation: maxPop,
      worldTick: this.world.tick,
      totalKills: 0,
      heroCount: heroes.length,
      tradeRouteCount: tradeRoutes
    }
  }

  start(): void {
    this.lastTime = performance.now()
    this.loop()
  }

  private loop = (): void => {
    const now = performance.now()
    const delta = now - this.lastTime
    this.lastTime = now

    // FPS tracking
    this.frameCount++
    this.fpsTime += delta
    if (this.fpsTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.fpsTime = 0
    }

    if (this.speed > 0) {
      this.accumulator += delta * this.speed
      while (this.accumulator >= this.tickRate) {
        this.world.update()
        this.aiSystem.update()
        this.migrationSystem.update(this.em, this.world, this.civManager, this.particles)
        this.combatSystem.update(this.world.tick)
        this.civManager.update()
        this.techSystem.update(this.civManager)
        this.weather.update()
        this.resources.update()
        this.disasterSystem.update()
        this.timeline.update(this.world.tick)
        this.artifactSystem.update(this.em, this.world, this.particles, this.world.tick)
        this.artifactSystem.spawnClaimParticles(this.em, this.particles, this.world.tick)
        this.diseaseSystem.update(this.em, this.world, this.civManager, this.particles)
        this.worldEventSystem.update(this.em, this.world, this.civManager, this.particles, this.timeline)
        this.caravanSystem.update(this.civManager, this.em, this.world, this.particles)
        this.cropSystem.update(this.world, this.civManager, this.em, this.particles)
        this.navalSystem.update(this.em, this.world, this.civManager, this.particles, this.world.tick)
        this.questSystem.update(this.em, this.world, this.civManager, this.particles, this.world.tick)
        this.ecosystemSystem.update(this.em, this.world, this.civManager, this.particles, this.world.tick)
        this.fogOfWarSystem.update(this.em, this.world, this.civManager, this.particles, this.world.tick)
        this.religionSystem.update(this.civManager, this.em, this.world, this.particles, this.world.tick)
        this.armySystem.update(this.em, this.civManager, this.world, this.particles, this.world.tick)
        this.eraSystem.update(this.civManager, this.em, this.particles, this.world.tick, this.timeline)
        this.heroLegendSystem.update(this.em, this.civManager, this.world, this.particles, this.world.tick)
        this.wonderSystem.update(this.civManager, this.em, this.world, this.particles, this.world.tick)
        this.tradeEconomySystem.update(this.civManager, this.em, this.world, this.particles, this.world.tick)
        // Culture system - cultural spread, trait adoption, language diffusion
        {
          const civData = [...this.civManager.civilizations.values()].map(c => {
            const neighbors: number[] = []
            const tradePartners: number[] = []
            for (const [otherId, rel] of c.relations) {
              if (rel > -20) neighbors.push(otherId)
              if (rel > 10) tradePartners.push(otherId)
            }
            return { id: c.id, neighbors, tradePartners, population: c.population }
          })
          this.cultureSystem.update(this.world.tick, civData)
        }
        this.loyaltySystem.update(this.civManager, this.em, this.world, this.particles, this.world.tick)
        this.biomeEvolution.update(this.world, this.civManager, this.em, this.particles, this.world.tick)
        this.espionageSystem.update(this.civManager, this.em, this.world, this.particles, this.world.tick)
        this.godPowerSystem.update(this.world, this.em, this.civManager, this.particles, this.world.tick)
        // Mining system - build civData from civilizations
        {
          const civData = [...this.civManager.civilizations.values()].map(c => {
            const cities: { x: number; y: number }[] = []
            for (const bid of c.buildings) {
              const pos = this.em.getComponent<PositionComponent>(bid, 'position')
              if (pos) cities.push({ x: Math.floor(pos.x), y: Math.floor(pos.y) })
            }
            const creature = this.em.getEntitiesWithComponents('creature', 'civMember')[0]
            const cc = creature ? this.em.getComponent<CreatureComponent>(creature, 'creature') : null
            return { id: c.id, cities, techLevel: c.techLevel, race: cc?.species ?? 'human' }
          })
          this.miningSystem.update(this.world.tick, civData)
        }
        this.disasterChainSystem.update(this.world.tick)
        this.seasonSystem.update(this.world.tick)
        this.animalMigration.update(this.world.tick, this.em, this.world, this.seasonSystem.getCurrentSeason())
        this.volcanoSystem.update(this.world.tick, this.world, this.particles)
        this.ruinsSystem.update(this.world.tick)
        this.plagueVisual.update()
        // Weather disaster linkage - use actual weather and season
        {
          const season = this.seasonSystem.getCurrentSeason()
          const w = this.weather.currentWeather
          const weatherForDisaster: 'clear' | 'rain' | 'storm' | 'snow' =
            w === 'rain' ? 'rain' : w === 'storm' || w === 'tornado' ? 'storm' : w === 'snow' ? 'snow' : 'clear'
          this.weatherDisaster.update(this.world, this.em, this.civManager, this.particles, this.world.tick, season, weatherForDisaster)
        }
        // Era visual sync - track most advanced civ
        {
          let maxEra: 'stone' | 'bronze' | 'iron' | 'medieval' | 'renaissance' = 'stone'
          const eraOrder = ['stone', 'bronze', 'iron', 'medieval', 'renaissance'] as const
          for (const [civId] of this.civManager.civilizations) {
            const era = this.eraSystem.getEra(civId)
            if (eraOrder.indexOf(era) > eraOrder.indexOf(maxEra)) maxEra = era
          }
          this.eraVisual.setEra(maxEra)
        }
        this.eraVisual.update()
        this.fogOfWar.update()
        this.fortificationRenderer.update()
        // Evolution system
        this.evolutionSystem.update(this.em, this.world, this.world.tick)
        // Population dynamics
        this.populationSystem.update(this.em, this.world, this.civManager, this.particles, this.world.tick)
        // Alliance & federation
        this.allianceSystem.update(this.civManager, this.em, this.world, this.particles, this.world.tick)
        // Terraforming visual effects
        this.terraformingSystem.update(this.world, this.particles, this.world.tick)
        // Statistics tracking
        this.statisticsTracker.update(this.world.tick, this.civManager, this.em)
        // Spatial hash rebuild for efficient queries
        this.spatialHash.rebuild(this.em)
        // Object pool maintenance
        this.objectPool.update(this.tickRate / 1000)
        // Portal teleportation
        this.portalSystem.update(this.em, this.world.tick)
        // Water animation update
        this.waterAnimation.update(this.world.tick, this.world)
        // Enhanced minimap update
        if (this.world.tick % 30 === 0) {
          this.minimapSystem.update(this.world, this.civManager, this.em, this.world.tick)
        }
        // Formation system - army formations and morale
        this.formationSystem.update(this.em, this.world, this.world.tick)
        // Achievement content - check extended achievements
        {
          const achStats: AchContentWorldStats = {
            totalCreatures: this.em.getEntitiesWithComponents('creature').length,
            speciesSet: new Set([...this.em.getEntitiesWithComponents('creature')].map(id => this.em.getComponent<CreatureComponent>(id, 'creature')!.species)),
            maxCityPop: Math.max(0, ...[...this.civManager.civilizations.values()].map(c => c.population)),
            filledTilePercent: 0, hasIsland: false,
            totalKills: 0, extinctSpecies: [], scorchedTiles: 0,
            disastersLast60Ticks: 0, nukeUsed: false,
            civsMet: this.civManager.civilizations.size,
            activeTradeRoutes: 0, maxEra: 'stone', peaceTicks: 0,
            maxTerritoryPercent: 0, totalCombats: 0, shipCount: 0,
            citiesCaptured: 0, maxHeroLevel: 0, maxArmySize: 0,
            volcanoEruptions: 0, waterTilesCreatedAtOnce: 0,
            diseasedCivs: 0, evolutionEvents: 0,
            coexistSpecies: 0, coexistTicks: 0,
            totalTicks: this.world.tick, exploredPercent: 0,
            totalCivs: this.civManager.civilizations.size, totalWars: 0,
            clonedCreatures: this.clonePower.getCloneCount(),
            portalPairs: this.portalSystem.getPortals().length / 2,
          }
          this.achievementContent.check(achStats)
        }
        // Chart panel - record data point every 60 ticks
        if (this.world.tick % 60 === 0) {
          let totalTerritory = 0
          let totalTech = 0
          let warCount = 0
          for (const [, civ] of this.civManager.civilizations) {
            totalTerritory += civ.territory.size
            totalTech += civ.techLevel
            for (const [, rel] of civ.relations) { if (rel < -30) warCount++ }
          }
          const civCount = this.civManager.civilizations.size
          this.chartPanel.addDataPoint(this.world.tick, {
            population: this.em.getEntitiesWithComponents('creature').length,
            civCount,
            warCount: Math.floor(warCount / 2),
            avgTechLevel: civCount > 0 ? totalTech / civCount : 0,
            totalTerritory,
          })
        }
        // Clone power - degradation updates
        {
          const cloneEntities = [...this.em.getEntitiesWithComponents('creature', 'position')].map(id => {
            const c = this.em.getComponent<CreatureComponent>(id, 'creature')!
            const needs = this.em.getComponent<NeedsComponent>(id, 'needs')
            return {
              id, isClone: this.clonePower.getGeneration(id) > 0,
              health: needs?.health ?? 100, maxHealth: 100, age: c.age
            }
          })
          const events = this.clonePower.update(this.world.tick, cloneEntities)
          for (const ev of events) {
            const needs = this.em.getComponent<NeedsComponent>(ev.id, 'needs')
            if (needs && ev.type === 'health_loss') needs.health = Math.max(0, needs.health - ev.amount)
          }
        }
        // Siege warfare - update active sieges
        this.siegeWarfare.update(this.world.tick)
        // Reputation system - track civ reputation from actions
        this.reputationSystem.update(this.world.tick, this.civManager, this.em)
        // Enhanced siege system - battering rams, siege towers, wall breaching
        this.siegeSystem.update(this.world.tick, this.em, this.civManager, this.world)
        // Disaster warning system - omens and tremors before disasters
        this.disasterWarning.update(this.world.tick)
        // Mood system - creature happiness affects productivity
        this.moodSystem.update(this.world.tick, this.em, this.world, this.civManager, this.weather.currentWeather, this.spatialHash)
        // World age system - epoch progression and terrain drift
        this.worldAge.update(this.world.tick, this.world)
        // Blood moon event - periodic hostile event
        this.bloodMoon.update(this.world.tick)
        // Creature aging - life stages and visual aging
        this.creatureAging.update(this.world.tick, this.em, this.spatialHash)
        // Resource scarcity - famine, drought effects
        this.resourceScarcity.update(this.world.tick, this.civManager, this.em as any, this.world)
        // Legendary battles - detect and enhance large-scale combat
        this.legendaryBattle.update(this.world.tick, this.em, this.civManager)
        // World border - animate edge effects
        this.worldBorder.update(this.world.tick)
        // Naval combat - ship battles and boarding
        this.navalCombat.update(this.world.tick, this.em, this.civManager)
        // Religion spread - faith influence from temples
        this.religionSpread.update(this.world.tick, this.em, this.civManager)
        // Tutorial system - check step conditions
        this.tutorial.update()
        // Build fortification data from civilizations
        if (this.world.tick % 120 === 0) {
          const forts: CityFortification[] = []
          for (const [civId, civ] of this.civManager.civilizations) {
            if (civ.buildings.length === 0) continue
            const pos = this.em.getComponent<PositionComponent>(civ.buildings[0], 'position')
            if (!pos) continue
            const era = this.eraSystem.getEra(civId)
            const level = era === 'stone' ? 'wooden' as const : era === 'bronze' || era === 'iron' ? 'stone' as const : 'castle' as const
            const hasWar = [...civ.relations.values()].some(r => r < -30)
            forts.push({
              cityId: civ.buildings[0], civId, centerX: Math.floor(pos.x), centerY: Math.floor(pos.y),
              radius: Math.min(8, 3 + Math.floor(civ.territory.size / 50)),
              level, health: 100, maxHealth: 100,
              towerCount: Math.min(4, 1 + Math.floor(civ.techLevel / 2)),
              hasMoat: era === 'iron' || era === 'medieval' || era === 'renaissance',
              isUnderAttack: hasWar, color: civ.color
            })
          }
          this.fortificationRenderer.updateFortifications(forts)
          // Siege-formation linkage: auto-trigger sieges when civs are at war
          for (const [civId, civ] of this.civManager.civilizations) {
            for (const [otherId, rel] of civ.relations) {
              if (rel < -50 && !this.siegeWarfare.getSiegeAt(0, 0)) {
                const other = this.civManager.civilizations.get(otherId)
                if (other && other.buildings.length > 0 && civ.population > 5) {
                  const targetPos = this.em.getComponent<PositionComponent>(other.buildings[0], 'position')
                  if (targetPos) {
                    const existingSiege = this.siegeWarfare.getActiveSieges().find(
                      s => s.attackerCivId === civId && s.defenderCivId === otherId
                    )
                    if (!existingSiege) {
                      this.siegeWarfare.startSiege(civId, otherId, Math.floor(targetPos.x), Math.floor(targetPos.y), Math.min(20, civ.population))
                      // Auto-form army into wedge formation for siege
                      const soldiers = this.em.getEntitiesWithComponents('position', 'creature', 'civMember')
                        .filter(id => {
                          const cm = this.em.getComponent(id, 'civMember') as any
                          return cm?.civId === civId
                        }).slice(0, 12)
                      if (soldiers.length >= 3 && !this.formationSystem.getFormationForEntity(soldiers[0])) {
                        this.formationSystem.createFormation(civId, 'wedge', soldiers)
                      }
                    }
                  }
                }
              }
            }
          }
        }
        // Update trade route visualization from caravan data
        if (this.world.tick % 120 === 0) {
          const routes: TradeRoute[] = []
          for (const [, civ] of this.civManager.civilizations) {
            for (const [otherId, rel] of civ.relations) {
              if (rel > 10) {
                const other = this.civManager.civilizations.get(otherId)
                if (other && civ.buildings.length > 0 && other.buildings.length > 0) {
                  const p1 = this.em.getComponent<PositionComponent>(civ.buildings[0], 'position')
                  const p2 = this.em.getComponent<PositionComponent>(other.buildings[0], 'position')
                  if (p1 && p2) {
                    routes.push({ fromX: Math.floor(p1.x), fromY: Math.floor(p1.y), toX: Math.floor(p2.x), toY: Math.floor(p2.y), volume: Math.min(100, rel), active: true })
                  }
                }
              }
            }
          }
          this.tradeRouteRenderer.setRoutes(routes)
        }
        // World Chronicle - build narrative history from world state
        {
          const civs = [...this.civManager.civilizations.values()].map(c => ({
            id: c.id, name: c.name, population: c.population, cities: c.buildings.length
          }))
          const snapshot: WorldSnapshot = {
            totalPopulation: civs.reduce((s, c) => s + c.population, 0),
            totalCities: civs.reduce((s, c) => s + c.cities, 0),
            activeWars: 0,
            civilizations: civs,
            era: this.timeline.getCurrentEra().name,
          }
          this.worldChronicle.update(this.world.tick, snapshot)
        }
        if (this.world.tick % 60 === 0) {
          this.diplomacySystem.update(this.civManager, this.world, this.em)
          this.buildingUpgradeSystem.update(this.em, this.civManager, this.world.tick)
          this.cityPlanningSystem.update(this.civManager, this.em, this.world, this.particles, this.world.tick)
        }
        // Autosave every 30000 ticks (~8 minutes at 60fps)
        if (this.world.tick > 0 && this.world.tick % 30000 === 0) {
          SaveSystem.save(this.world, this.em, this.civManager, this.resources, 'auto')
        }
        this.updateVisualEffects()
        this.particles.update()
        this.accumulator -= this.tickRate
      }
    }

    // Update render culling viewport
    this.renderCulling.setViewport(this.camera.x, this.camera.y, window.innerWidth, window.innerHeight, this.camera.zoom)

    this.renderer.render(this.world, this.camera, this.em, this.civManager, this.particles, this.weather.fogAlpha, this.resources, this.caravanSystem, this.cropSystem)

    // Water animation overlay (waves, reflections, foam)
    {
      const bounds = this.camera.getVisibleBounds()
      const ctx = this.canvas.getContext('2d')!
      this.waterAnimation.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, bounds.startX, bounds.startY, bounds.endX, bounds.endY, this.world, this.world.dayNightCycle)
    }

    // World decorations (flowers, rocks, etc.)
    {
      const bounds = this.camera.getVisibleBounds()
      this.worldDecorations.render(this.canvas.getContext('2d')!, this.camera.x, this.camera.y, this.camera.zoom, bounds.startX, bounds.startY, bounds.endX, bounds.endY)
    }

    // Trade route overlay
    this.tradeRouteRenderer.render(this.canvas.getContext('2d')!, this.camera.x, this.camera.y, this.camera.zoom)
    // Ambient particles (viewport-based)
    const vpX = this.camera.x / TILE_SIZE
    const vpY = this.camera.y / TILE_SIZE
    const vpW = window.innerWidth / (TILE_SIZE * this.camera.zoom)
    const vpH = window.innerHeight / (TILE_SIZE * this.camera.zoom)
    this.ambientParticles.update(this.world, this.particles, this.world.tick, vpX, vpY, vpW, vpH)
    // Dynamic music & ambient sound
    const hasWar = Array.from(this.civManager.civilizations.values()).some(c => {
      for (const [, rel] of c.relations) { if (rel < -50) return true }
      return false
    })
    this.musicSystem.update({
      isNight: !this.world.isDay(),
      atWar: hasWar,
      disasterActive: this.disasterSystem.getActiveDisasters().length > 0,
      isEpic: this.wonderSystem.getActiveWonders().length > 0,
      isRaining: this.weather.currentWeather === 'rain' || this.weather.currentWeather === 'storm',
    })
    this.renderer.renderBrushOutline(this.camera, this.input.mouseX, this.input.mouseY, this.powers.getBrushSize())
    this.renderer.renderMinimap(this.world, this.camera, this.em, this.civManager)

    // Minimap overlay (political/population/military modes)
    {
      const mCtx = this.minimapCanvas.getContext('2d')
      if (mCtx) {
        const politicalData = [...this.civManager.civilizations.values()].map(c => ({
          color: c.color, territory: new Set([...c.territory].map(t => typeof t === 'string' ? parseInt(t, 10) : t as number))
        }))
        this.minimapOverlay.render(mCtx, this.minimapCanvas.width, this.minimapCanvas.height, {
          political: politicalData, population: [], military: [], resources: [],
          worldWidth: WORLD_WIDTH, worldHeight: WORLD_HEIGHT
        })
      }
    }

    // Portal rendering (rotating rings, glow effects)
    this.portalSystem.render(this.canvas.getContext('2d')!, this.camera.x, this.camera.y, this.camera.zoom)

    // Formation rendering (outlines, morale bars)
    this.formationSystem.render(this.canvas.getContext('2d')!, this.camera.x, this.camera.y, this.camera.zoom)

    // World event overlays and banners
    const ctx = this.canvas.getContext('2d')!

    // Day/night lighting overlay
    this.dayNightRenderer.render(ctx, this.canvas.width, this.canvas.height, this.world.dayNightCycle, this.world.isDay())

    // Plague visual overlay
    this.plagueVisual.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Weather disaster overlay
    this.weatherDisaster.renderOverlay(ctx, this.canvas.width, this.canvas.height, this.world.tick)

    // Era visual overlay & indicator
    this.eraVisual.renderOverlay(ctx, this.canvas.width, this.canvas.height)
    this.eraVisual.renderEraIndicator(ctx, this.canvas.width - 160, 10)

    // Fog of war overlay - connect to actual FogOfWarSystem
    {
      const bounds = this.camera.getVisibleBounds()
      const firstCivId = this.civManager.civilizations.keys().next().value
      this.fogOfWar.render(ctx, this.camera.x, this.camera.y, this.camera.zoom,
        bounds.startX, bounds.startY, bounds.endX, bounds.endY,
        (x: number, y: number) => {
          if (firstCivId === undefined) return 2 as const
          const alpha = this.fogOfWarSystem.getFogAlpha(firstCivId, x, y)
          return (alpha > 0.6 ? 0 : alpha > 0.2 ? 1 : 2) as 0 | 1 | 2
        })
    }

    // Fortification rendering
    {
      const bounds = this.camera.getVisibleBounds()
      this.fortificationRenderer.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, bounds.startX, bounds.startY, bounds.endX, bounds.endY)
    }

    // Terraforming visual effects overlay
    this.terraformingSystem.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Portal visual effects
    this.portalSystem.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    this.worldEventSystem.renderScreenOverlay(ctx, this.canvas.width, this.canvas.height)
    this.worldEventSystem.renderEventBanner(ctx, this.canvas.width)
    this.worldEventSystem.renderActiveIndicators(ctx, this.canvas.width)

    // Toast notifications
    this.toastSystem.update()
    this.toastSystem.render(ctx, this.canvas.width)

    // Chart panel overlay
    if (this.chartPanel.isVisible) {
      this.chartPanel.render(ctx, this.canvas.width - 420, 60, 400, 250)
    }

    // Clone power visual effects
    {
      const clonePositions = [...this.em.getEntitiesWithComponents('position', 'creature')]
        .filter(id => this.clonePower.getGeneration(id) > 0)
        .map(id => {
          const pos = this.em.getComponent<PositionComponent>(id, 'position')!
          return { x: pos.x, y: pos.y, generation: this.clonePower.getGeneration(id) }
        })
      if (clonePositions.length > 0) {
        this.clonePower.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, clonePositions)
      }
    }

    // Formation overlay
    this.formationSystem.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Siege warfare visual effects
    this.siegeWarfare.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // World age epoch color overlay
    {
      const overlay = this.worldAge.getColorOverlay()
      if (overlay.a > 0) {
        ctx.fillStyle = `rgba(${overlay.r},${overlay.g},${overlay.b},${overlay.a})`
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      }
    }

    // Disaster warning visual effects - screen shake and darkening
    {
      const effects = this.disasterWarning.getVisualEffects()
      for (const effect of effects) {
        if (effect.kind === 'SkyDarken') {
          ctx.fillStyle = `rgba(0,0,0,${effect.intensity * 0.4})`
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        }
      }
    }

    // Blood moon overlay and moon rendering
    if (this.bloodMoon.isActive()) {
      this.bloodMoon.render(ctx, this.canvas.width, this.canvas.height, this.world.tick)
    }

    // World border edge effects
    {
      const bounds = this.camera.getVisibleBounds()
      this.worldBorder.render(ctx, this.camera.x, this.camera.y, this.camera.zoom, bounds.startX, bounds.startY, bounds.endX, bounds.endY)
    }

    // Religion spread visualization
    this.religionSpread.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)
    this.religionSpread.renderTemples(ctx, this.camera.x, this.camera.y, this.camera.zoom, this.em)

    // Naval combat effects
    this.navalCombat.render(ctx, this.camera.x, this.camera.y, this.camera.zoom)

    // Tutorial overlay (rendered last for top-most visibility)
    if (this.tutorial.isActive()) {
      this.tutorial.render(ctx, this.canvas.width, this.canvas.height)
    }

    if (this.world.tick % 30 === 0) {
      this.infoPanel.update(this.fps)
      this.statsPanel.update(this.world.tick)
      this.achievements.updateStats(this.gatherWorldStats())
      this.updateAchievementsButton()
      if (this.techTreePanel.isVisible()) {
        this.techTreePanel.render()
      }
    }

    // Achievement notifications
    this.achievements.updateNotifications()
    this.achievements.renderNotifications(this.canvas.getContext('2d')!, this.canvas.width)

    // Real-time creature panel update when selected
    if (this.creaturePanel.getSelected()) {
      this.creaturePanel.update()
      this.renderSelectedHighlight()
    }

    this.updateDayNightIndicator()

    requestAnimationFrame(this.loop)
  }

  private updateDayNightIndicator(): void {
    if (this.world.tick % 30 !== 0) return
    const el = document.getElementById('dayNightIndicator')
    if (!el) return
    const isDay = this.world.isDay()
    const icon = isDay ? '☀️' : '🌙'
    const timeStr = isDay ? 'Day' : 'Night'
    const hour = Math.floor(this.world.dayNightCycle * 24)
    const weatherLabel = this.weather.getWeatherLabel()
    const seasonLabels = { spring: '🌱 Spring', summer: '☀️ Summer', autumn: '🍂 Autumn', winter: '❄️ Winter' }
    const seasonLabel = seasonLabels[this.world.season]
    el.textContent = `${icon} ${timeStr} (${hour}:00) | ${seasonLabel} | ${weatherLabel}`
  }

  private showSaveLoadPanel(mode: 'save' | 'load'): void {
    let panel = document.getElementById('saveLoadPanel')
    if (panel) { panel.remove(); return }

    panel = document.createElement('div')
    panel.id = 'saveLoadPanel'
    panel.className = 'panel'
    Object.assign(panel.style, {
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      width: '320px', zIndex: '350', fontSize: '12px', lineHeight: '1.8', padding: '12px'
    })

    const titleEl = document.createElement('div')
    titleEl.style.cssText = 'font-weight:bold;font-size:14px;margin-bottom:8px;text-align:center'
    titleEl.textContent = mode === 'save' ? 'Save Game' : 'Load Game'
    panel.appendChild(titleEl)

    const metas = SaveSystem.getAllSlotMeta()
    const slots: Array<number | 'auto'> = ['auto', 1, 2, 3]

    for (const slot of slots) {
      const meta = metas.find(m => m.slot === slot)
      const label = slot === 'auto' ? 'Autosave' : `Slot ${slot}`
      const hasSave = SaveSystem.hasSave(slot)
      const info = meta
        ? `${new Date(meta.timestamp).toLocaleString()} | Pop: ${meta.population} | Civs: ${meta.civCount}`
        : (hasSave ? 'Save data found' : 'Empty')

      const row = document.createElement('div')
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:4px 0;padding:4px;background:rgba(255,255,255,0.05);border-radius:4px'

      const infoDiv = document.createElement('div')
      infoDiv.style.flex = '1'
      const labelEl2 = document.createElement('div')
      labelEl2.style.fontWeight = 'bold'
      labelEl2.textContent = label
      const detailEl = document.createElement('div')
      detailEl.style.cssText = 'opacity:0.6;font-size:10px'
      detailEl.textContent = info
      infoDiv.appendChild(labelEl2)
      infoDiv.appendChild(detailEl)
      row.appendChild(infoDiv)

      if (mode === 'save' && slot !== 'auto') {
        const btn = document.createElement('button')
        btn.textContent = 'Save'
        btn.style.cssText = 'padding:2px 8px;cursor:pointer'
        btn.addEventListener('click', () => {
          const ok = SaveSystem.save(this.world, this.em, this.civManager, this.resources, slot)
          btn.textContent = ok ? 'Saved!' : 'Failed'
          setTimeout(() => panel!.remove(), 800)
        })
        row.appendChild(btn)
      } else if (mode === 'load' && hasSave) {
        const loadBtn = document.createElement('button')
        loadBtn.textContent = 'Load'
        loadBtn.style.cssText = 'padding:2px 8px;cursor:pointer'
        loadBtn.addEventListener('click', () => {
          const ok = SaveSystem.load(this.world, this.em, this.civManager, this.resources, slot)
          if (ok) this.world.markFullDirty()
          loadBtn.textContent = ok ? 'Loaded!' : 'Failed'
          setTimeout(() => panel!.remove(), 800)
        })
        row.appendChild(loadBtn)
        if (slot !== 'auto') {
          const delBtn = document.createElement('button')
          delBtn.textContent = 'Del'
          delBtn.style.cssText = 'padding:2px 8px;cursor:pointer;color:#f66'
          delBtn.addEventListener('click', () => {
            SaveSystem.deleteSave(slot)
            panel!.remove()
            this.showSaveLoadPanel(mode)
          })
          row.appendChild(delBtn)
        }
      }
      panel.appendChild(row)
    }

    const closeRow = document.createElement('div')
    closeRow.style.cssText = 'text-align:center;margin-top:8px'
    const closeBtn = document.createElement('button')
    closeBtn.textContent = 'Close'
    closeBtn.style.cssText = 'padding:2px 16px;cursor:pointer'
    closeBtn.addEventListener('click', () => panel!.remove())
    closeRow.appendChild(closeBtn)
    panel.appendChild(closeRow)

    document.body.appendChild(panel)
  }
}
