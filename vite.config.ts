import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 5174 },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/src/systems/')) return
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
