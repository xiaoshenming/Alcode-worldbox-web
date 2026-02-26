import { EventLog, WorldEvent } from '../systems/EventLog'

export class EventPanel {
  private el: HTMLElement
  private events: WorldEvent[] = []
  private maxVisible: number = 8

  constructor(elementId: string) {
    this.el = document.getElementById(elementId)!

    EventLog.onEvent((e) => {
      this.events.push(e)
      if (this.events.length > this.maxVisible) {
        this.events.shift()
      }
      this.render()
    })
  }

  render(): void {
    // Clear existing children
    while (this.el.firstChild) {
      this.el.removeChild(this.el.firstChild)
    }

    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i]
      const alpha = 0.4 + (i / Math.max(1, this.events.length - 1)) * 0.6
      const div = document.createElement('div')
      div.style.color = e.color
      div.style.opacity = alpha.toFixed(2)
      div.style.marginBottom = '2px'
      div.style.whiteSpace = 'nowrap'
      div.style.overflow = 'hidden'
      div.style.textOverflow = 'ellipsis'
      div.textContent = e.message
      this.el.appendChild(div)
    }
  }
}
