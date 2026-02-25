import { World } from './World'
import { Camera } from './Camera'
import { Renderer } from './Renderer'
import { Input } from './Input'
import { Powers } from './Powers'
import { EntityType } from '../utils/Constants'
import { Toolbar } from '../ui/Toolbar'
import { InfoPanel } from '../ui/InfoPanel'
import { CreaturePanel } from '../ui/CreaturePanel'
import { EventPanel } from '../ui/EventPanel'
import { StatsPanel } from '../ui/StatsPanel'
import { ContextMenu, MenuSection } from '../ui/ContextMenu'
import { EntityManager, PositionComponent, CreatureComponent, NeedsComponent } from '../ecs/Entity'
import { AISystem } from '../systems/AISystem'
import { CombatSystem } from '../systems/CombatSystem'
import { ParticleSystem } from '../systems/ParticleSystem'
import { SoundSystem } from '../systems/SoundSystem'
import { WeatherSystem } from '../systems/WeatherSystem'
import { ResourceSystem } from '../systems/ResourceSystem'
import { SaveSystem } from './SaveSystem'
import { CreatureFactory } from '../entities/CreatureFactory'
import { CivManager } from '../civilization/CivManager'

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
    this.aiSystem.setResourceSystem(this.resources)

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

    // Save button
    const saveBtn = document.getElementById('saveBtn')
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const ok = SaveSystem.save(this.world, this.em, this.civManager, this.resources)
        saveBtn.textContent = ok ? 'Saved!' : 'Failed'
        setTimeout(() => { saveBtn.textContent = 'Save' }, 1500)
      })
    }

    // Load button
    const loadBtn = document.getElementById('loadBtn')
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        const ok = SaveSystem.load(this.world, this.em, this.civManager, this.resources)
        if (ok) {
          this.world.markFullDirty()
          loadBtn.textContent = 'Loaded!'
        } else {
          loadBtn.textContent = 'No Save'
        }
        setTimeout(() => { loadBtn.textContent = 'Load' }, 1500)
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
    this.aiSystem.setResourceSystem(this.resources)
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
      switch (e.key) {
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
        this.combatSystem.update(this.world.tick)
        this.civManager.update()
        this.weather.update()
        this.resources.update()
        this.particles.update()
        this.accumulator -= this.tickRate
      }
    }

    this.renderer.render(this.world, this.camera, this.em, this.civManager, this.particles, this.weather.fogAlpha, this.resources)
    this.renderer.renderBrushOutline(this.camera, this.input.mouseX, this.input.mouseY, this.powers.getBrushSize())
    this.renderer.renderMinimap(this.world, this.camera)

    if (this.world.tick % 30 === 0) {
      this.infoPanel.update(this.fps)
      this.statsPanel.update()
    }

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
    el.textContent = `${icon} ${timeStr} (${hour}:00) | ${weatherLabel}`
  }
}
