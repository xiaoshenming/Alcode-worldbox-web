import { World } from './World'
import { Camera } from './Camera'
import { Renderer } from './Renderer'
import { Input } from './Input'
import { Powers } from './Powers'
import { EntityType } from '../utils/Constants'
import { Toolbar } from '../ui/Toolbar'
import { CreaturePanel } from '../ui/CreaturePanel'
import { StatsPanel } from '../ui/StatsPanel'
import { ContextMenu, MenuSection } from '../ui/ContextMenu'
import { EntityManager, PositionComponent, CreatureComponent, NeedsComponent, HeroComponent } from '../ecs/Entity'
import { CreatureFactory } from '../entities/CreatureFactory'
import { SoundSystem } from '../systems/SoundSystem'
import { MusicSystem } from '../systems/MusicSystem'
import { TechTreePanel } from '../ui/TechTreePanel'
import { HistoryReplaySystem } from '../systems/HistoryReplaySystem'
import { ScreenshotModeSystem } from '../systems/ScreenshotModeSystem'
import { NotificationCenterSystem } from '../systems/NotificationCenterSystem'
import { SandboxSettingsSystem } from '../systems/SandboxSettingsSystem'
import { MiniMapModeSystem } from '../systems/MiniMapModeSystem'
import { CameraBookmarkSystem } from '../systems/CameraBookmarkSystem'
import { EntityInspectorSystem } from '../systems/EntityInspectorSystem'
import { HelpOverlaySystem } from '../systems/HelpOverlaySystem'
import { CreatureMemorySystem } from '../systems/CreatureMemorySystem'
import { PollutionSystem } from '../systems/PollutionSystem'
import { ProphecySystem } from '../systems/ProphecySystem'
import { CreatureSkillSystem } from '../systems/CreatureSkillSystem'
import { WorldNarratorSystem } from '../systems/WorldNarratorSystem'
import { MythologySystem } from '../systems/MythologySystem'
import { CreatureTamingSystem } from '../systems/CreatureTamingSystem'
import { PlagueMutationSystem } from '../systems/PlagueMutationSystem'
import { MonumentSystem } from '../systems/MonumentSystem'
import { CreaturePersonalitySystem } from '../systems/CreaturePersonalitySystem'

/** Subset of Game fields needed by GameInputManager */
export interface GameInputContext {
  speed: number
  world: World
  camera: Camera
  renderer: Renderer
  input: Input
  powers: Powers
  toolbar: Toolbar
  creaturePanel: CreaturePanel
  statsPanel: StatsPanel
  techTreePanel: TechTreePanel
  contextMenu: ContextMenu
  em: EntityManager
  creatureFactory: CreatureFactory
  audio: SoundSystem
  musicSystem: MusicSystem
  helpOverlay: HelpOverlaySystem
  notificationCenter: NotificationCenterSystem
  sandboxSettings: SandboxSettingsSystem
  screenshotMode: ScreenshotModeSystem
  cameraBookmarks: CameraBookmarkSystem
  entityInspector: EntityInspectorSystem
  minimapMode: MiniMapModeSystem
  historyReplay: HistoryReplaySystem
  creatureMemory: CreatureMemorySystem
  pollution: PollutionSystem
  prophecy: ProphecySystem
  creatureSkill: CreatureSkillSystem
  worldNarrator: WorldNarratorSystem
  mythology: MythologySystem
  creatureTaming: CreatureTamingSystem
  plagueMutation: PlagueMutationSystem
  monument: MonumentSystem
  creaturePersonality: CreaturePersonalitySystem
  showSaveLoadPanel: (mode: 'save' | 'load') => void
  resetWorld: () => void
}

/**
 * Manages keyboard shortcuts, speed controls, brush controls,
 * input callbacks, and context menu for the game.
 */
export class GameInputManager {
  private ctx: GameInputContext

  constructor(ctx: GameInputContext) {
    this.ctx = ctx
  }

  /** Wire up all input handlers. Call once during Game init. */
  setupAll(): void {
    this.setupSpeedControls()
    this.setupBrushControls()
    this.setupInputCallbacks()
    this.setupContextMenu()
    this.setupKeyboard()
  }

  private setupSpeedControls(): void {
    const buttons = document.querySelectorAll('#speedControls .btn')
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseInt((btn as HTMLElement).dataset.speed || '1', 10)
        this.ctx.speed = speed
        buttons.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
      })
    })
  }

  private setupBrushControls(): void {
    const slider = document.getElementById('brushSlider') as HTMLInputElement
    const value = document.getElementById('brushValue') as HTMLElement
    slider.addEventListener('input', () => {
      const size = parseInt(slider.value, 10)
      this.ctx.powers.setBrushSize(size)
      value.textContent = String(size)
    })
  }

  private setupInputCallbacks(): void {
    this.ctx.input.setOnMouseDown((x, y) => {
      // Check if clicking on a creature (when no power selected)
      if (!this.ctx.powers.getPower()) {
        const clicked = this.findCreatureAt(x, y)
        this.ctx.creaturePanel.select(clicked)
        return
      }
      this.ctx.powers.apply(x, y)
    })
    this.ctx.input.setOnMouseMove((x, y) => {
      if (this.ctx.input.isMouseDown && this.ctx.input.mouseButton === 0) {
        this.ctx.powers.applyContinuous(x, y)
      }
    })
  }

  findCreatureAt(wx: number, wy: number): number | null {
    const entities = this.ctx.em.getEntitiesWithComponents('position', 'creature')
    let closest: number | null = null
    let closestDist = 2 // max click distance in tiles

    for (const id of entities) {
      const pos = this.ctx.em.getComponent<PositionComponent>(id, 'position')
      if (!pos) continue
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

    this.ctx.input.setOnRightClick((wx, wy, screenX, screenY) => {
      const sections: MenuSection[] = []

      // Check if clicked on a creature
      const creatureId = this.findCreatureAt(wx, wy)
      if (creatureId !== null) {
        const creature = this.ctx.em.getComponent<CreatureComponent>(creatureId, 'creature')
        const needs = this.ctx.em.getComponent<NeedsComponent>(creatureId, 'needs')
        if (!creature || !needs) return
        sections.push({
          header: `${creature.name} (${creature.species})`,
          items: [
            { icon: '\u{1F50D}', label: 'Inspect', action: () => this.ctx.creaturePanel.select(creatureId) },
            { icon: '\u{1F49A}', label: 'Heal', action: () => { needs.health = 100; needs.hunger = 0 } },
            { icon: '\u26A1', label: 'Smite', action: () => { needs.health = 0 } },
          ]
        })

        // Hero options
        const hero = this.ctx.em.getComponent<HeroComponent>(creatureId, 'hero')
        if (!hero) {
          sections[sections.length - 1].items.push({
            icon: '\u2B50', label: 'Make Hero', action: () => {
              const abilities: ('warrior'|'ranger'|'healer'|'berserker')[] = ['warrior','ranger','healer','berserker']
              const ability = abilities[Math.floor(Math.random() * abilities.length)]
              this.ctx.em.addComponent(creatureId, {
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
      const tile = this.ctx.world.getTile(Math.floor(wx), Math.floor(wy))
      if (tile !== null) {
        sections.push({
          header: `Tile: ${tileNames[tile]} (${Math.floor(wx)}, ${Math.floor(wy)})`,
          items: [
            { icon: '\u{1F464}', label: 'Spawn Human', action: () => this.ctx.creatureFactory.spawn(EntityType.HUMAN, wx, wy) },
            { icon: '\u{1F43A}', label: 'Spawn Wolf', action: () => this.ctx.creatureFactory.spawn(EntityType.WOLF, wx, wy) },
            { icon: '\u{1F409}', label: 'Spawn Dragon', action: () => this.ctx.creatureFactory.spawn(EntityType.DRAGON, wx, wy) },
            { icon: '\u26A1', label: 'Lightning', action: () => this.ctx.powers.applyAction('lightning', wx, wy) },
            { icon: '\u2604\uFE0F', label: 'Meteor', action: () => this.ctx.powers.applyAction('meteor', wx, wy) },
          ]
        })
      }

      if (sections.length > 0) {
        this.ctx.contextMenu.show(screenX, screenY, sections)
      }
    })
  }

  setSpeed(speed: number): void {
    this.ctx.speed = speed
    const buttons = document.querySelectorAll('#speedControls .btn')
    buttons.forEach(b => {
      const s = parseInt((b as HTMLElement).dataset.speed || '1', 10)
      b.classList.toggle('active', s === speed)
    })
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // Ignore shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Delegate to v1.91-v1.95 systems (Shift+ combos)
      if (this.ctx.creatureMemory.handleKeyDown(e)) return
      if (this.ctx.pollution.handleKeyDown(e)) return
      if (this.ctx.prophecy.handleKeyDown(e)) return
      if (this.ctx.creatureSkill.handleKeyDown(e)) return
      if (this.ctx.worldNarrator.handleKeyDown(e)) return
      if (this.ctx.mythology.handleKeyDown(e)) return
      if (this.ctx.creatureTaming.handleKeyDown(e)) return
      if (this.ctx.plagueMutation.handleKeyDown(e)) return
      if (this.ctx.monument.handleKeyDown(e)) return
      if (this.ctx.creaturePersonality.handleKeyDown(e)) return

      switch (e.key) {
        // Speed controls (plain) / Camera bookmarks (Ctrl=save, Alt=jump)
        case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9': {
          const slot = parseInt(e.key, 10) - 1
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            this.ctx.cameraBookmarks.save(slot, this.ctx.camera.x, this.ctx.camera.y, this.ctx.camera.zoom)
          } else if (e.altKey) {
            e.preventDefault()
            const bm = this.ctx.cameraBookmarks.get(slot)
            if (bm) { this.ctx.camera.x = bm.x; this.ctx.camera.y = bm.y; this.ctx.camera.zoom = bm.zoom }
          } else {
            // Original speed controls for 1-4
            if (e.key === '1') this.setSpeed(1)
            else if (e.key === '2') this.setSpeed(2)
            else if (e.key === '3') this.setSpeed(5)
            else if (e.key === '4') this.setSpeed(0)
          }
          break
        }
        case ' ':
          e.preventDefault()
          this.setSpeed(this.ctx.speed === 0 ? 1 : 0)
          break

        // Tool category switching: Q/W/E/D
        case 'q':
        case 'Q':
          this.ctx.toolbar.setCategory('terrain')
          break
        case 'w':
        case 'W':
          this.ctx.toolbar.setCategory('creature')
          break
        case 'e':
        case 'E':
          this.ctx.toolbar.setCategory('nature')
          break
        case 'd':
        case 'D':
          this.ctx.toolbar.setCategory('disaster')
          break

        // Brush size: [ and ]
        case '[': {
          const slider = document.getElementById('brushSlider') as HTMLInputElement
          if (slider) {
            const val = Math.max(1, parseInt(slider.value, 10) - 1)
            slider.value = String(val)
            slider.dispatchEvent(new Event('input'))
          }
          break
        }
        case ']': {
          const slider = document.getElementById('brushSlider') as HTMLInputElement
          if (slider) {
            const val = Math.min(10, parseInt(slider.value, 10) + 1)
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
            this.ctx.showSaveLoadPanel('save')
          }
          break
        case 'l':
        case 'L':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            this.ctx.showSaveLoadPanel('load')
          }
          break

        // Toggle mute: M
        case 'm':
        case 'M': {
          const muted = this.ctx.audio.toggleMute()
          this.ctx.musicSystem.setMuted(muted)
          const muteBtn = document.getElementById('muteBtn')
          if (muteBtn) muteBtn.textContent = muted ? '\u{1F507}' : '\u{1F50A}'
          break
        }

        // Toggle territory: T
        case 't':
        case 'T': {
          this.ctx.renderer.showTerritory = !this.ctx.renderer.showTerritory
          const terBtn = document.getElementById('toggleTerritoryBtn')
          if (terBtn) terBtn.classList.toggle('active', this.ctx.renderer.showTerritory)
          break
        }

        case 'h':
        case 'H':
          if (!e.ctrlKey && !e.metaKey) this.ctx.helpOverlay.toggle()
          break
        case 'F1':
          e.preventDefault()
          this.ctx.helpOverlay.toggle()
          break

        // Notification history: N
        case 'n':
        case 'N':
          if (!e.ctrlKey && !e.metaKey) this.ctx.notificationCenter.toggleHistory()
          break

        // Sandbox settings: P
        case 'p':
        case 'P':
          if (!e.ctrlKey && !e.metaKey) this.ctx.sandboxSettings.togglePanel()
          break

        // Screenshot: F12
        case 'F12':
          e.preventDefault()
          this.ctx.screenshotMode.enterScreenshotMode(1)
          break

        // Camera bookmarks panel: B
        case 'b':
        case 'B':
          if (!e.ctrlKey && !e.metaKey) this.ctx.cameraBookmarks.togglePanel()
          break

        // Entity inspector: I
        case 'i':
        case 'I':
          if (!e.ctrlKey && !e.metaKey) this.ctx.entityInspector.togglePanel()
          break

        // Minimap mode cycle: V
        case 'v':
        case 'V':
          if (!e.ctrlKey && !e.metaKey) this.ctx.minimapMode.cycleMode()
          break

        // History replay toggle / Reset world (Ctrl+R)
        case 'r':
        case 'R':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            this.ctx.resetWorld()
          } else {
            if (this.ctx.historyReplay.isReplaying()) this.ctx.historyReplay.stopReplay()
            else this.ctx.historyReplay.startReplay()
          }
          break
        case 'ArrowLeft':
          if (this.ctx.historyReplay.isReplaying()) this.ctx.historyReplay.step(-1)
          break
        case 'ArrowRight':
          if (this.ctx.historyReplay.isReplaying()) this.ctx.historyReplay.step(1)
          break

        // Escape: close panels / deselect tool
        case 'Escape': {
          if (this.ctx.entityInspector.isPanelOpen()) {
            this.ctx.entityInspector.close()
            break
          }
          if (this.ctx.cameraBookmarks.isPanelOpen()) {
            this.ctx.cameraBookmarks.togglePanel()
            break
          }
          if (this.ctx.sandboxSettings.isPanelOpen()) {
            this.ctx.sandboxSettings.togglePanel()
            break
          }
          if (this.ctx.notificationCenter.isHistoryOpen()) {
            this.ctx.notificationCenter.toggleHistory()
            break
          }
          if (this.ctx.historyReplay.isReplaying()) {
            this.ctx.historyReplay.stopReplay()
            break
          }
          if (this.ctx.helpOverlay.isVisible()) {
            this.ctx.helpOverlay.toggle()
            break
          }
          const savePanel = document.getElementById('saveLoadPanel')
          const achPanel = document.getElementById('achievementsPanel')
          const tlPanel = document.getElementById('timelinePanel')
          if (savePanel?.style.display !== 'none' && savePanel?.style.display) {
            savePanel.style.display = 'none'
          } else if (this.ctx.techTreePanel.isVisible()) {
            this.ctx.techTreePanel.hide()
          } else if (this.ctx.statsPanel.isVisible()) {
            this.ctx.statsPanel.hide()
          } else if (achPanel?.style.display !== 'none' && achPanel?.style.display) {
            achPanel.style.display = 'none'
          } else if (tlPanel?.style.display !== 'none' && tlPanel?.style.display) {
            tlPanel.style.display = 'none'
          } else {
            this.ctx.powers.setPower(null)
            this.ctx.toolbar.clearSelection()
          }
          break
        }
      }
    })
  }
}
