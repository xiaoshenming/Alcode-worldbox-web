import { defineConfig, createLogger } from 'vite'

const logger = createLogger()
const originalWarn = logger.warn.bind(logger)
logger.warn = (msg, options) => {
  // Suppress false-positive circular chunk warnings. Game.ts (index chunk) simultaneously
  // imports sys-combat and sys-core modules — Vite/Rollup misidentifies this as a cycle.
  if (msg.includes('Circular chunk')) return
  originalWarn(msg, options)
}

export default defineConfig({
  customLogger: logger,
  test: {
    environment: 'node',
  },
  server: { port: 5174 },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/src/systems/')) return
          // Shared low-level utilities (used by multiple chunks — must come first)
          // Use exact filename matches to avoid catching WeatherParticleSystem etc.
          if (/\/(?:SpatialHashSystem|EventLog|SoundSystem|ParticleSystem)\.ts/.test(id)) return 'sys-shared'
          // ArtifactSystem only used by CombatSystem — keep it in combat chunk
          if (/ArtifactSystem/.test(id)) return 'sys-combat'
          // Creature* systems
          if (id.includes('Creature')) return 'sys-creature'
          // World* systems
          if (id.includes('World')) return 'sys-world'
          // Diplomatic* systems
          if (id.includes('Diplomatic')) return 'sys-diplomatic'
          // Visual / Renderer systems
          if (/(?:Renderer|Visual|Particle|Animation|Fog|Minimap|LOD|Decoration|DayNight|Season(?:Visual|Festival)|Culling|Overlay)/.test(id))
            return 'sys-visual'
          // Combat / Military systems
          if (/(?:Combat|Army|Siege|Battle|Formation|Flocking|Naval|LegendaryBattle|BloodMoon)/.test(id))
            return 'sys-combat'
          // Economy / Trade systems
          if (/(?:Trade|Caravan|Resource|Economy|Mining|Crop|Scarcity|Flow)/.test(id))
            return 'sys-economy'
          // UI / Tool systems
          if (/(?:Chart|Inspector|Search|Screenshot|Tooltip|Notification|Sandbox|Bookmark|Speed|Help|Tutorial|Editor|Keybind|Achievement|Monitor|AutoSave|Export|Indicator|Favorite|Mode|Heatmap|Zone|Dashboard)/.test(id))
            return 'sys-ui'
          // Remaining core systems
          return 'sys-core'
        }
      }
    }
  }
})
