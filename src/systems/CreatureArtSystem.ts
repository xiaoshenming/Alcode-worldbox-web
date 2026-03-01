// Creature Art System (v2.64) - Artistic expression
// Creatures develop artistic talents and create works of art
// Art influences culture, mood, and civilization prestige

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ArtForm = 'painting' | 'sculpture' | 'music' | 'poetry' | 'dance' | 'weaving' | 'pottery' | 'storytelling'

export interface Artwork {
  id: number
  creatorId: number
  creatorName: string
  form: ArtForm
  quality: number       // 0-100
  fame: number          // 0-100
  createdTick: number
  title: string
}

export interface ArtistData {
  entityId: number
  talent: number        // 0-100
  preferredForm: ArtForm
  worksCreated: number
  inspiration: number   // 0-100
}

const CHECK_INTERVAL = 900
const MAX_ARTWORKS = 80
const CREATE_CHANCE = 0.03
const FAME_DECAY = 0.1

const ART_FORMS: ArtForm[] = ['painting', 'sculpture', 'music', 'poetry', 'dance', 'weaving', 'pottery', 'storytelling']

const ART_TITLES: Record<ArtForm, string[]> = {
  painting: ['Dawn Over Hills', 'The Great Battle', 'Forest Spirits', 'Ocean Dreams'],
  sculpture: ['The Guardian', 'Stone of Ages', 'Eternal Flame', 'Mountain King'],
  music: ['Song of the Wind', 'Battle Hymn', 'Lullaby of Stars', 'River Melody'],
  poetry: ['Ode to the Sun', 'Whispers of War', 'The Lost Kingdom', 'Moonlit Path'],
  dance: ['Fire Dance', 'Rain Ritual', 'Victory Waltz', 'Shadow Steps'],
  weaving: ['Tapestry of Time', 'Golden Thread', 'War Banner', 'Nature Quilt'],
  pottery: ['Sacred Vessel', 'Harvest Urn', 'Dragon Vase', 'Memory Jar'],
  storytelling: ['The First Dawn', 'Legend of Heroes', 'The Great Flood', 'Tales of Old'],
}

export class CreatureArtSystem {
  private artists: Map<number, ArtistData> = new Map()
  private artworks: Artwork[] = []
  private nextArtId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const entities = em.getAllEntities()
    for (const eid of entities) {
      const creature = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!creature) continue

      let artist = this.artists.get(eid)

      // Discover artistic talent
      if (!artist && Math.random() < 0.015) {
        const form = ART_FORMS[Math.floor(Math.random() * ART_FORMS.length)]
        artist = {
          entityId: eid,
          talent: 10 + Math.floor(Math.random() * 50),
          preferredForm: form,
          worksCreated: 0,
          inspiration: 30 + Math.floor(Math.random() * 40),
        }
        this.artists.set(eid, artist)
      }

      if (!artist) continue

      // Build inspiration
      artist.inspiration = Math.min(100, artist.inspiration + Math.random() * 3)

      // Create artwork when inspired
      if (artist.inspiration > 60 && Math.random() < CREATE_CHANCE && this.artworks.length < MAX_ARTWORKS) {
        const form = Math.random() < 0.7 ? artist.preferredForm : ART_FORMS[Math.floor(Math.random() * ART_FORMS.length)]
        const titles = ART_TITLES[form]
        const quality = Math.floor(artist.talent * (0.5 + Math.random() * 0.5))

        this.artworks.push({
          id: this.nextArtId++,
          creatorId: eid,
          creatorName: creature.name ?? `Creature ${eid}`,
          form,
          quality,
          fame: Math.floor(quality * 0.5),
          createdTick: tick,
          title: titles[Math.floor(Math.random() * titles.length)],
        })

        artist.worksCreated++
        artist.inspiration -= 40
        artist.talent = Math.min(100, artist.talent + 1)
      }
    }

    // Decay fame of old artworks
    for (let i = this.artworks.length - 1; i >= 0; i--) {
      this.artworks[i].fame -= FAME_DECAY
      if (this.artworks[i].fame <= 0 && this.artworks.length > 20) {
        this.artworks.splice(i, 1)
      }
    }

    // Clean up dead artists
    for (const [eid] of this.artists) {
      if (!em.getComponent<CreatureComponent>(eid, 'creature')) {
        this.artists.delete(eid)
      }
    }
  }

}
