import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FISH_FLUSH_STORAGE_KEY,
  FishCursorTrail,
  applyPointerIgnoredHover,
  applyPointerLeaveScatter,
  applyWanderMotion,
  buildFishObstacles,
  createFishStartPosition,
  getPiranhaDisplaySize,
  keepFishOutsideObstacles,
  resolveFishTargetAroundObstacles,
  shouldRevealSpongeAfterBoatLeaves,
  smoothFishHeading,
} from './FishCursorTrail'
import { FISH_CURSOR_RESTORE_EVENT } from './events'

function mockDesktopMedia(matches) {
  const listeners = new Set()

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion') ? false : matches,
      media: query,
      onchange: null,
      addEventListener: (_type, listener) => {
        listeners.add(listener)
      },
      removeEventListener: (_type, listener) => {
        listeners.delete(listener)
      },
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })

  return {
    setMatches(nextMatches) {
      const event = { matches: nextMatches }
      listeners.forEach((listener) => listener(event))
    },
  }
}

describe('FishCursorTrail', () => {
  let context
  let animationFrames
  let fillStyles

  beforeEach(() => {
    localStorage.clear()
    animationFrames = []
    fillStyles = []
    context = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fill: vi.fn(),
    }
    Object.defineProperty(context, 'fillStyle', {
      set(value) {
        fillStyles.push(value)
      },
    })

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrames.push(callback)
      return animationFrames.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders fish only on desktop viewports', () => {
    mockDesktopMedia(true)

    render(<FishCursorTrail />)

    expect(screen.getByTestId('fish-cursor-trail')).toBeInTheDocument()
  })

  it('does not render on touch-sized viewports', () => {
    mockDesktopMedia(false)

    render(<FishCursorTrail />)

    expect(screen.queryByTestId('fish-cursor-trail')).not.toBeInTheDocument()
  })

  it('draws animated fish on canvas after pointer movement', () => {
    mockDesktopMedia(true)

    render(<FishCursorTrail />)
    fireEvent.pointerMove(window, { clientX: 320, clientY: 180 })

    act(() => {
      animationFrames[0]?.(16)
    })

    expect(screen.getByTestId('fish-cursor-trail')).toHaveAttribute('id', 'fishCursorCanvas')
    expect(context.clearRect).toHaveBeenCalled()
    expect(context.ellipse).toHaveBeenCalled()
  })

  it('moves fish between simulation steps and reuses their painted bodies', () => {
    mockDesktopMedia(true)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    render(<FishCursorTrail />)
    const frames = []
    for (const time of [0, 8, 16]) {
      context.translate.mockClear()
      context.drawImage.mockClear()
      act(() => animationFrames.at(-1)(time))
      frames.push({
        position: context.translate.mock.calls.at(-1),
        body: context.drawImage.mock.calls[0][0],
      })
    }
    expect(frames[1].body).toBe(frames[0].body)
    expect(frames[2].body).toBe(frames[0].body)
    expect(frames[1].position).not.toEqual(frames[0].position)
    for (const axis of [0, 1]) {
      expect(frames[1].position[axis]).toBeCloseTo(
        (frames[0].position[axis] + frames[2].position[axis]) / 2,
      )
    }
  })

  it('scatters fish instead of drawing a cursor target inside repel zones', () => {
    mockDesktopMedia(true)

    const repelZone = document.createElement('div')
    repelZone.setAttribute('data-fish-repel-zone', 'true')
    document.body.appendChild(repelZone)

    render(<FishCursorTrail />)
    fireEvent.pointerMove(repelZone, { clientX: 320, clientY: 180 })

    act(() => {
      animationFrames[0]?.(16)
    })

    expect(context.ellipse).toHaveBeenCalled()
    expect(context.createRadialGradient).not.toHaveBeenCalled()

    repelZone.remove()
  })

  it('keeps fish visible during the flush animation before hiding them', () => {
    vi.useFakeTimers({
      toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    })
    mockDesktopMedia(true)

    render(<FishCursorTrail />)
    expect(screen.getByTestId('fish-cursor-trail')).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new CustomEvent('fish-cursor-flush'))
    })

    expect(screen.getByTestId('fish-cursor-trail')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(screen.queryByTestId('fish-cursor-trail')).not.toBeInTheDocument()
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('stays hidden after reload when fish were flushed', () => {
    mockDesktopMedia(true)
    localStorage.setItem(FISH_FLUSH_STORAGE_KEY, 'true')

    render(<FishCursorTrail />)

    expect(screen.queryByTestId('fish-cursor-trail')).not.toBeInTheDocument()
  })

  it('restores fish when the pool restore event is dispatched', () => {
    mockDesktopMedia(true)
    localStorage.setItem(FISH_FLUSH_STORAGE_KEY, 'true')

    render(<FishCursorTrail />)
    expect(screen.queryByTestId('fish-cursor-trail')).not.toBeInTheDocument()

    act(() => {
      localStorage.removeItem(FISH_FLUSH_STORAGE_KEY)
      window.dispatchEvent(new CustomEvent(FISH_CURSOR_RESTORE_EVENT))
    })

    expect(screen.getByTestId('fish-cursor-trail')).toBeInTheDocument()
  })

  it('draws a larger red piranha after five seconds', () => {
    vi.useFakeTimers({
      toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    })
    mockDesktopMedia(true)

    render(<FishCursorTrail />)

    act(() => {
      vi.advanceTimersByTime(5000)
      animationFrames.at(-1)?.(5000)
    })

    expect(context.ellipse).toHaveBeenCalledWith(
      0,
      0,
      expect.any(Number),
      expect.any(Number),
      0,
      0,
      Math.PI * 2,
    )
    expect(fillStyles).toContain('#dc2626')
  })

  it('waits for the next piranha before drawing the rescue boat', () => {
    vi.useFakeTimers({
      toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    })
    mockDesktopMedia(true)

    render(<FishCursorTrail />)

    act(() => {
      window.dispatchEvent(new CustomEvent('fish-cursor-rescue'))
      animationFrames.at(-1)?.(1200)
    })

    expect(context.fillText).not.toHaveBeenCalledWith(
      'СПАСИ РЫБУ',
      expect.any(Number),
      expect.any(Number),
    )

    act(() => {
      vi.advanceTimersByTime(5000)
      animationFrames.at(-1)?.(5000)
    })

    expect(context.fillText).not.toHaveBeenCalledWith(
      'СПАСИ РЫБУ',
      expect.any(Number),
      expect.any(Number),
    )

    act(() => {
      vi.advanceTimersByTime(2000)
      animationFrames.at(-1)?.(7000)
    })

    expect(context.fillText).toHaveBeenCalledWith(
      'СПАСИ РЫБУ',
      expect.any(Number),
      expect.any(Number),
    )
    expect(context.stroke).toHaveBeenCalled()
    expect(fillStyles).toContain('#020617')
    expect(fillStyles).toContain('#7c2d12')
  })

  it('uses the same piranha size before and after rescue catch', () => {
    expect(getPiranhaDisplaySize(4)).toBe(50)
  })

  it('waits until the rescue boat leaves before revealing SpongeBob', () => {
    expect(
      shouldRevealSpongeAfterBoatLeaves({ caughtPiranha: true, x: 400, startedAt: 0 }, 900, 8000),
    ).toBe(false)
    expect(
      shouldRevealSpongeAfterBoatLeaves({ caughtPiranha: true, x: 1121, startedAt: 0 }, 900, 8000),
    ).toBe(true)
  })

  it('scatters fish when the pointer leaves the window', () => {
    const pointer = { x: 320, y: 180, active: true, down: true, scatter: false, wander: false }

    applyPointerLeaveScatter(pointer)

    expect(pointer).toMatchObject({ active: true, down: false, scatter: true })
  })

  it('switches to random wander when pointer is over a form', () => {
    const pointer = { x: 320, y: 180, active: true, down: true, scatter: true, wander: false }

    applyPointerIgnoredHover(pointer)

    expect(pointer).toMatchObject({ active: false, down: false, scatter: false, wander: true })
  })

  it('keeps fish moving forward during random wander', () => {
    const fish = {
      x: 420,
      y: 520,
      vx: 0,
      vy: 0,
      size: 12,
      wave: 0,
      speed: 1.4,
      primary: '#fff',
      secondary: '#000',
    }

    applyWanderMotion(fish, 2, 1024, 768, 1200, [])

    expect(Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy)).toBeGreaterThan(0.45)
  })

  it('turns fish body smoothly toward wander direction', () => {
    const fish = {
      x: 420,
      y: 520,
      vx: 0,
      vy: 1,
      size: 12,
      wave: 0,
      speed: 1.4,
      primary: '#fff',
      secondary: '#000',
      heading: 0,
    }

    smoothFishHeading(fish)

    expect(fish.heading).toBeGreaterThan(0)
    expect(fish.heading).toBeLessThan(0.35)
  })

  it('routes fish around a form when cursor is on the opposite side', () => {
    const target = resolveFishTargetAroundObstacles(
      { x: 180, y: 160 },
      { x: 620, y: 160 },
      [{ left: 300, top: 100, right: 500, bottom: 300 }],
      0,
    )

    expect(target.x).toBeLessThan(300)
    expect(target.y).toBeGreaterThan(300)
  })

  it('avoids the gap between the header and first form', () => {
    const target = resolveFishTargetAroundObstacles(
      { x: 180, y: 160 },
      { x: 620, y: 160 },
      [
        { left: 300, top: 0, right: 500, bottom: 100 },
        { left: 300, top: 100, right: 500, bottom: 300 },
      ],
      0,
    )

    expect(target.x).toBeLessThan(300)
    expect(target.y).toBeGreaterThan(300)
  })

  it('continues along the form edge instead of spinning at the first waypoint', () => {
    const target = resolveFishTargetAroundObstacles(
      { x: 242, y: 358 },
      { x: 620, y: 160 },
      [
        { left: 300, top: 0, right: 500, bottom: 100 },
        { left: 300, top: 100, right: 500, bottom: 300 },
      ],
      0,
    )

    expect(target.x).toBeGreaterThan(500)
    expect(target.y).toBeGreaterThan(300)
  })

  it('moves from below the form toward the cursor-side edge instead of spinning underneath', () => {
    const target = resolveFishTargetAroundObstacles(
      { x: 700, y: 650 },
      { x: 80, y: 420 },
      [{ left: 160, top: 0, right: 860, bottom: 560 }],
      0,
    )

    expect(target.x).toBeLessThan(160)
    expect(target.y).toBeGreaterThan(560)
  })

  it('uses the bottom route when there is no room above the form', () => {
    const target = resolveFishTargetAroundObstacles(
      { x: 80, y: 42 },
      { x: 940, y: 120 },
      [{ left: 160, top: 0, right: 860, bottom: 560 }],
      0,
    )

    expect(target.y).toBeGreaterThan(560)
  })

  it('treats the whole form column as one no-fish obstacle', () => {
    const obstacles = buildFishObstacles([
      { left: 140, top: 48, right: 760, bottom: 340 },
      { left: 140, top: 356, right: 760, bottom: 500 },
    ])

    expect(obstacles).toEqual([{ left: 140, top: 0, right: 760, bottom: 500 }])
  })

  it('starts fish from the screen edges after page refresh', () => {
    const start = createFishStartPosition(0, 1024, 768)

    expect(start.x).toBeLessThan(0)
    expect(start.y).toBeGreaterThanOrEqual(70)
    expect(start.y).toBeLessThanOrEqual(688)
  })

  it('keeps fish outside form obstacles', () => {
    const fish = {
      x: 360,
      y: 180,
      vx: 1,
      vy: 1,
      size: 12,
      wave: 0,
      speed: 1,
      primary: '#fff',
      secondary: '#000',
    }

    keepFishOutsideObstacles(fish, [{ left: 300, top: 100, right: 500, bottom: 300 }])

    expect(fish.x < 288 || fish.x > 512 || fish.y < 88 || fish.y > 312).toBe(true)
  })
})
