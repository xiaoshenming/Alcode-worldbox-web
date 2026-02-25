import { World } from './World'
import { Camera } from './Camera'
import { Renderer } from './Renderer'
import { Input } from './Input'
import { Powers } from './Powers'
import { EntityType, TILE_SIZE } from '../utils/Constants'
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
    this.aiSystem.setResourceSystem(this.resources)
    this.aiSystem.setCivManager(this.civManager)
    this.combatSystem.setArtifactSystem(this.artifactSystem)
    this.powers = new Powers(this.world, this.em, this.creatureFactory, this.civManager, this.particles, this.audio)
    this.infoPanel = new InfoPanel('worldInfo', this.world, this.em, this.civManager)
    this.creaturePanel = new CreaturePanel('creaturePanel', this.em, this.civManager)

    // Generate new world
    this.world.generate()
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

        // Escape: close panels / deselect tool
        case 'Escape': {
          const savePanel = document.getElementById('saveLoadPanel')
          const achPanel = document.getElementById('achievementsPanel')
          const tlPanel = document.getElementById('timelinePanel')
          if (savePanel?.style.display !== 'none' && savePanel?.style.display) {
            savePanel.style.display = 'none'
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
    const tooltip = document.getElementById('tooltip')!
    const tileNames = ['Deep Water', 'Shallow Water', 'Sand', 'Grass', 'Forest', 'Mountain', 'Snow', 'Lava']

    this.canvas.addEventListener('mousemove', (e) => {
      const world = this.camera.screenToWorld(e.clientX, e.clientY)
      const tile = this.world.getTile(world.x, world.y)
      if (tile !== null) {
        tooltip.style.display = 'block'
        tooltip.style.left = (e.clientX + 15) + 'px'
        tooltip.style.top = (e.clientY + 15) + 'px'
        tooltip.textContent = `${tileNames[tile]} (${world.x}, ${world.y})`
      } else {
        tooltip.style.display = 'none'
      }
    })

    this.canvas.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none'
    })
  }

  private setupMuteButton(): void {
    const btn = document.getElementById('muteBtn')
    if (btn) {
      btn.addEventListener('click', () => {
        const muted = this.audio.toggleMute()
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
        if (this.world.tick % 60 === 0) {
          this.diplomacySystem.update(this.civManager, this.world, this.em)
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

    this.renderer.render(this.world, this.camera, this.em, this.civManager, this.particles, this.weather.fogAlpha, this.resources, this.caravanSystem, this.cropSystem)
    this.renderer.renderBrushOutline(this.camera, this.input.mouseX, this.input.mouseY, this.powers.getBrushSize())
    this.renderer.renderMinimap(this.world, this.camera, this.em, this.civManager)

    // World event overlays and banners
    const ctx = this.canvas.getContext('2d')!
    this.worldEventSystem.renderScreenOverlay(ctx, this.canvas.width, this.canvas.height)
    this.worldEventSystem.renderEventBanner(ctx, this.canvas.width)
    this.worldEventSystem.renderActiveIndicators(ctx, this.canvas.width)

    if (this.world.tick % 30 === 0) {
      this.infoPanel.update(this.fps)
      this.statsPanel.update()
      this.achievements.updateStats(this.gatherWorldStats())
      this.updateAchievementsButton()
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
