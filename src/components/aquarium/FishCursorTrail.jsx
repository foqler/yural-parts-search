import { useEffect, useRef, useState } from 'react'
import FishControls from './FishControls'
import { FLUSH_EVENT, RESCUE_EVENT, FISH_CURSOR_RESTORE_EVENT } from './events'

const DESKTOP_QUERY = '(pointer: fine)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
export const FISH_FLUSH_STORAGE_KEY = 'yural:fish-flushed'
const FLUSH_DURATION_MS = 2100
const PIRANHA_INTERVAL_MS = 5000
const STEP_MS = 1000 / 60
const PORTRAIT_SCALE = 0.68
const RESCUE_BOAT_DURATION_MS = 12000
const RESCUE_PIRANHA_VISIBLE_MS = 2000
const COLORS = [
  ['#22d3ee', '#6366f1'],
  ['#8b5cf6', '#22d3ee'],
  ['#10b981', '#22d3ee'],
  ['#a78bfa', '#6366f1'],
  ['#f97316', '#facc15'],
  ['#ec4899', '#8b5cf6'],
  ['#84cc16', '#14b8a6'],
  ['#38bdf8', '#0f766e'],
]

export function applyPointerLeaveScatter(pointer) {
  pointer.active = true
  pointer.down = false
  pointer.scatter = true
  pointer.wander = false
}

export function applyPointerIgnoredHover(pointer) {
  pointer.active = false
  pointer.down = false
  pointer.scatter = false
  pointer.wander = true
}

function useMotionMode() {
  const [mode, setMode] = useState('reduced')

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia(DESKTOP_QUERY)
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)

    function updateEnabled() {
      setMode(reducedMotion.matches ? 'reduced' : query.matches ? 'auto' : 'manual')
    }

    updateEnabled()

    query.addEventListener('change', updateEnabled)
    reducedMotion.addEventListener('change', updateEnabled)
    return () => {
      query.removeEventListener('change', updateEnabled)
      reducedMotion.removeEventListener('change', updateEnabled)
    }
  }, [])

  return mode
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

export function createFishStartPosition(index, width, height) {
  const edge = index % 4
  const y = rand(70, Math.max(160, height - 80))
  const x = rand(70, Math.max(160, width - 70))

  if (edge === 0) return { x: -rand(40, 180), y }
  if (edge === 1) return { x: width + rand(40, 180), y }
  if (edge === 2) return { x, y: -rand(40, 160) }
  return { x, y: height + rand(40, 160) }
}

function createFish(index, width, height) {
  const palette = COLORS[index % COLORS.length]
  const start = createFishStartPosition(index, width, height)
  const centerDx = width * 0.5 - start.x
  const centerDy = height * 0.45 - start.y
  const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy) || 1
  const vx = (centerDx / centerDistance) * rand(0.6, 1.4)
  const vy = (centerDy / centerDistance) * rand(0.4, 1.0)

  return {
    x: start.x,
    y: start.y,
    vx,
    vy,
    size: rand(8, 24),
    wave: rand(0, Math.PI * 2),
    speed: rand(1.1, 2.3),
    heading: Math.atan2(vy, vx),
    primary: palette[0],
    secondary: palette[1],
  }
}

function fishCount(width) {
  return Math.min(12, Math.max(4, Math.round(width / 140)))
}

function createWhale(index, width, height) {
  const direction = index % 2 === 0 ? 1 : -1

  return {
    x: direction === 1 ? -rand(160, 420) : width + rand(160, 420),
    y: rand(110, Math.max(180, height - 120)),
    vx: direction * rand(0.22, 0.38),
    vy: rand(-0.08, 0.08),
    size: rand(42, 56),
    wave: rand(0, Math.PI * 2),
    bubbleSeed: rand(0, Math.PI * 2),
  }
}

function addWhales(whales, width, height) {
  if (whales.length > 0) return

  for (let i = 0; i < 4; i += 1) {
    whales.push(createWhale(i, width, height))
  }
}

export function buildFishObstacles(rects) {
  const visibleRects = rects
    .filter((r) => r.right > r.left && r.bottom > r.top)
    .sort((a, b) => a.top - b.top)

  if (visibleRects.length === 0) return []

  return [
    {
      left: Math.min(...visibleRects.map((r) => r.left)),
      top: 0,
      right: Math.max(...visibleRects.map((r) => r.right)),
      bottom: Math.max(...visibleRects.map((r) => r.bottom)),
    },
  ]
}

function pointInsideObstacle(point, obstacle) {
  return (
    point.x >= obstacle.left &&
    point.x <= obstacle.right &&
    point.y >= obstacle.top &&
    point.y <= obstacle.bottom
  )
}

function segmentIntersectsObstacle(from, to, obstacle) {
  if (pointInsideObstacle(from, obstacle) || pointInsideObstacle(to, obstacle)) return true

  const minX = Math.min(from.x, to.x)
  const maxX = Math.max(from.x, to.x)
  const minY = Math.min(from.y, to.y)
  const maxY = Math.max(from.y, to.y)
  if (
    maxX < obstacle.left ||
    minX > obstacle.right ||
    maxY < obstacle.top ||
    minY > obstacle.bottom
  )
    return false

  const dx = to.x - from.x
  const dy = to.y - from.y
  const checks = [
    { axis: 'x', value: obstacle.left, min: obstacle.top, max: obstacle.bottom },
    { axis: 'x', value: obstacle.right, min: obstacle.top, max: obstacle.bottom },
    { axis: 'y', value: obstacle.top, min: obstacle.left, max: obstacle.right },
    { axis: 'y', value: obstacle.bottom, min: obstacle.left, max: obstacle.right },
  ]

  return checks.some((check) => {
    const divisor = check.axis === 'x' ? dx : dy
    if (Math.abs(divisor) < 0.001) return false

    const t = (check.value - (check.axis === 'x' ? from.x : from.y)) / divisor
    if (t < 0 || t > 1) return false

    const cross = check.axis === 'x' ? from.y + dy * t : from.x + dx * t
    return cross >= check.min && cross <= check.max
  })
}

export function resolveFishTargetAroundObstacles(from, target, obstacles, index = 0) {
  const margin = 58
  const blocking = obstacles.find((obstacle) => {
    const expanded = {
      left: obstacle.left - margin * 0.35,
      top: obstacle.top - margin * 0.35,
      right: obstacle.right + margin * 0.35,
      bottom: obstacle.bottom + margin * 0.35,
    }
    return segmentIntersectsObstacle(from, target, expanded)
  })

  if (!blocking) return target

  const routes = [
    { y: blocking.top - margin, bias: 0 },
    { y: blocking.bottom + margin, bias: 1 },
  ]
  const bestRoute = routes
    .map((route) => ({
      ...route,
      cost:
        Math.abs(from.y - route.y) +
        Math.abs(target.y - route.y) +
        (index % 2 === route.bias ? 0 : 18) +
        (route.y < 72 ? 10_000 : 0) +
        (obstacles.some((obstacle) => route.y >= obstacle.top && route.y <= obstacle.bottom)
          ? 10_000
          : 0),
    }))
    .sort((a, b) => a.cost - b.cost)[0]

  const sideX =
    from.x < blocking.left
      ? blocking.left - margin
      : from.x > blocking.right
        ? blocking.right + margin
        : from.x

  const fromInsideObstacleWidth = from.x >= blocking.left && from.x <= blocking.right
  const targetLeftOfObstacle = target.x < blocking.left
  const targetRightOfObstacle = target.x > blocking.right
  if (fromInsideObstacleWidth && (targetLeftOfObstacle || targetRightOfObstacle)) {
    return {
      x: targetLeftOfObstacle ? blocking.left - margin : blocking.right + margin,
      y: bestRoute.y,
    }
  }

  const movingAcrossFromLeft = from.x < blocking.left && target.x > blocking.right
  const movingAcrossFromRight = from.x > blocking.right && target.x < blocking.left
  if (movingAcrossFromLeft || movingAcrossFromRight) {
    const startX = movingAcrossFromLeft ? blocking.left - margin : blocking.right + margin
    const exitX = movingAcrossFromLeft ? blocking.right + margin : blocking.left - margin

    if (Math.abs(from.y - bestRoute.y) > 26) {
      return { x: startX, y: bestRoute.y }
    }

    if (
      (movingAcrossFromLeft && from.x < exitX - 18) ||
      (movingAcrossFromRight && from.x > exitX + 18)
    ) {
      return { x: exitX, y: bestRoute.y }
    }
  }

  return {
    x: sideX,
    y: bestRoute.y,
  }
}

function avoidObstacles(fish, obstacles) {
  const AVOID_RADIUS = 72
  const AVOID_FORCE = 0.14

  for (const obs of obstacles) {
    const cx = Math.max(obs.left, Math.min(fish.x, obs.right))
    const cy = Math.max(obs.top, Math.min(fish.y, obs.bottom))
    const dx = fish.x - cx
    const dy = fish.y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist === 0) {
      const toLeft = fish.x - obs.left
      const toRight = obs.right - fish.x
      const toTop = fish.y - obs.top
      const toBottom = obs.bottom - fish.y
      const minD = Math.min(toLeft, toRight, toTop, toBottom)
      if (minD === toLeft) fish.vx -= AVOID_FORCE * 4 * fish.speed
      else if (minD === toRight) fish.vx += AVOID_FORCE * 4 * fish.speed
      else if (minD === toTop) fish.vy -= AVOID_FORCE * 4 * fish.speed
      else fish.vy += AVOID_FORCE * 4 * fish.speed
      continue
    }

    if (dist < AVOID_RADIUS) {
      const strength =
        (1 - dist / AVOID_RADIUS) * (1 - dist / AVOID_RADIUS) * AVOID_FORCE * fish.speed
      fish.vx += (dx / dist) * strength
      fish.vy += (dy / dist) * strength
    }
  }
}

export function keepFishOutsideObstacles(fish, obstacles) {
  for (const obs of obstacles) {
    const margin = Math.max(10, fish.size)
    const expanded = {
      left: obs.left - margin,
      top: obs.top - margin,
      right: obs.right + margin,
      bottom: obs.bottom + margin,
    }

    if (!pointInsideObstacle(fish, expanded)) continue

    const distances = [
      { side: 'left', value: Math.abs(fish.x - expanded.left) },
      { side: 'right', value: Math.abs(expanded.right - fish.x) },
      { side: 'top', value: Math.abs(fish.y - expanded.top) },
      { side: 'bottom', value: Math.abs(expanded.bottom - fish.y) },
    ].sort((a, b) => a.value - b.value)

    const nearest = distances[0]?.side
    if (nearest === 'left') {
      fish.x = expanded.left - 1
      fish.vx = Math.min(fish.vx, -Math.abs(fish.vx) * 0.35 - 0.4)
    } else if (nearest === 'right') {
      fish.x = expanded.right + 1
      fish.vx = Math.max(fish.vx, Math.abs(fish.vx) * 0.35 + 0.4)
    } else if (nearest === 'top') {
      fish.y = expanded.top - 1
      fish.vy = Math.min(fish.vy, -Math.abs(fish.vy) * 0.35 - 0.4)
    } else {
      fish.y = expanded.bottom + 1
      fish.vy = Math.max(fish.vy, Math.abs(fish.vy) * 0.35 + 0.4)
    }
  }
}

function applyScreenEdgeAvoidance(fish, width, height) {
  const margin = 96
  const force = 0.08 * fish.speed

  if (fish.x < margin) fish.vx += ((margin - fish.x) / margin) * force
  if (fish.x > width - margin) fish.vx -= ((fish.x - (width - margin)) / margin) * force
  if (fish.y < margin) fish.vy += ((margin - fish.y) / margin) * force
  if (fish.y > height - margin) fish.vy -= ((fish.y - (height - margin)) / margin) * force
}

export function applyWanderMotion(fish, index, width, height, time, obstacles) {
  fish.vx += Math.sin(time * 0.0011 + index * 1.9 + fish.wave) * 0.035 * fish.speed
  fish.vy += Math.cos(time * 0.0009 + index * 1.3 + fish.wave) * 0.028 * fish.speed
  applyScreenEdgeAvoidance(fish, width, height)
  avoidObstacles(fish, obstacles)

  const speed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy)
  const minSpeed = 0.55 * fish.speed
  if (speed < minSpeed) {
    const heading = fish.wave + index * 2.39996
    fish.vx += Math.cos(heading) * minSpeed
    fish.vy += Math.sin(heading) * minSpeed
  }

  fish.vx *= 0.982
  fish.vy *= 0.982
}

export function smoothFishHeading(fish) {
  const speed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy)
  if (speed < 0.05) return

  const target = Math.atan2(fish.vy, fish.vx)
  const current = fish.heading ?? target
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  const maxTurn = 0.18
  fish.heading = current + Math.max(-maxTurn, Math.min(maxTurn, delta * 0.22))
}

function moveFish(fish, index, pointer, flush, width, height, time, obstacles = []) {
  if (flush.active) {
    drainPosition(fish, flush, time, index * 1.7)
    smoothFishHeading(fish)
    fish.wave += 0.24
    return
  }
  if (pointer.wander) {
    applyWanderMotion(fish, index, width, height, time, obstacles)
  } else {
    const scatter = pointer.active && pointer.scatter
    const targetX = pointer.active
      ? pointer.x
      : width * (0.5 + Math.sin(time * 0.00018 + index) * 0.38)
    const targetY = pointer.active
      ? pointer.y
      : height * (0.45 + Math.cos(time * 0.00014 + index) * 0.24)
    const resolvedTarget = scatter
      ? { x: targetX, y: targetY }
      : resolveFishTargetAroundObstacles(fish, { x: targetX, y: targetY }, obstacles, index)
    const dx = resolvedTarget.x - fish.x
    const dy = resolvedTarget.y - fish.y
    const distance = Math.sqrt(dx * dx + dy * dy) || 1
    let pull = pointer.down ? 0.07 : 0.026

    if (pointer.active && !scatter && distance < 36 && !pointer.down) {
      pull = -0.09
    }

    if (scatter) {
      const scatterAngle = index * 2.39996 + Math.sin(time * 0.00022 + fish.wave) * 0.35
      fish.vx += Math.cos(scatterAngle) * 0.045 * fish.speed
      fish.vy += Math.sin(scatterAngle) * 0.035 * fish.speed
    } else {
      fish.vx += (dx / distance) * pull * fish.speed
      fish.vy += (dy / distance) * pull * fish.speed
    }

    fish.vx += Math.sin(time * 0.001 + fish.wave) * 0.024
    fish.vy += Math.cos(time * 0.0012 + fish.wave) * 0.02
    fish.vx *= 0.975
    fish.vy *= 0.975

    avoidObstacles(fish, obstacles)
  }

  const maxSpeed = pointer.down ? 6.4 : 4.4
  const currentSpeed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy) || 1
  if (currentSpeed > maxSpeed) {
    fish.vx = (fish.vx / currentSpeed) * maxSpeed
    fish.vy = (fish.vy / currentSpeed) * maxSpeed
  }

  fish.x += fish.vx
  fish.y += fish.vy
  keepFishOutsideObstacles(fish, obstacles)
  smoothFishHeading(fish)
  fish.wave += 0.24 + currentSpeed * 0.05

  if (fish.x < -50 && fish.vx < 0) fish.x = width + 50
  if (fish.x > width + 50 && fish.vx > 0) fish.x = -50
  if (fish.y < 35 && fish.vy < 0) fish.y = 35
  if (fish.y > height - 35 && fish.vy > 0) fish.y = height - 35
}

function drawFish(ctx, fish, opacity, scale, blend) {
  const size = fish.size
  if (!fish.body) {
    const tile = document.createElement('canvas')
    tile.width = Math.ceil(size * 2.2) + 2
    tile.height = Math.ceil(size * 1.1) + 2
    const brush = tile.getContext('2d')
    brush.translate(tile.width / 2, tile.height / 2)
    const body = brush.createLinearGradient(-size, 0, size, 0)
    body.addColorStop(0, fish.secondary)
    body.addColorStop(1, fish.primary)
    brush.fillStyle = body
    brush.beginPath()
    brush.ellipse(0, 0, size * 1.05, size * 0.48, 0, 0, Math.PI * 2)
    brush.fill()
    brush.fillStyle = 'rgba(255,255,255,0.82)'
    brush.beginPath()
    brush.arc(size * 0.48, -size * 0.12, Math.max(1.2, size * 0.09), 0, Math.PI * 2)
    brush.fill()
    fish.body = tile
  }

  const x = fish.x + (fish.prevX - fish.x) * (1 - blend)
  const y = fish.y + (fish.prevY - fish.y) * (1 - blend)
  const wave = fish.prevWave + (fish.wave - fish.prevWave) * blend
  const tail = Math.sin(wave) * size * 0.22
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(fish.prevHeading + (fish.heading - fish.prevHeading) * blend)
  ctx.scale(scale, scale)
  ctx.globalAlpha = opacity
  ctx.fillStyle = fish.secondary
  ctx.beginPath()
  ctx.moveTo(-size * 0.9, 0)
  ctx.lineTo(-size * 1.62, -size * 0.5 + tail)
  ctx.lineTo(-size * 1.45, 0)
  ctx.lineTo(-size * 1.62, size * 0.5 + tail)
  ctx.closePath()
  ctx.fill()
  ctx.drawImage(fish.body, -fish.body.width / 2, -fish.body.height / 2)
  ctx.restore()
}

function spawnPiranha(piranha, school, width, height) {
  if (piranha.disabled || piranha.active || school.length === 0) return

  const direction = Math.random() > 0.5 ? 1 : -1
  const targetIndex = Math.floor(Math.random() * school.length)
  const target = school[targetIndex]

  piranha.active = true
  piranha.spawnedAt = Date.now()
  piranha.satiationTarget =
    piranha.satiationTarget || Math.max(1, Math.ceil((school.length + piranha.eatenCount) / 2))
  piranha.direction = direction
  piranha.x = direction === 1 ? -90 : width + 90
  piranha.y = Math.min(height - 60, Math.max(60, target.y + rand(-60, 60)))
  piranha.vx = direction * 3.8
  piranha.vy = 0
  piranha.targetIndex = targetIndex
  piranha.phase = 'hunting'
  piranha.eaten = false
  piranha.prey = null
}

export function getPiranhaDisplaySize(eatenCount) {
  return Math.min(72, 30 + eatenCount * 5)
}

export function shouldRevealSpongeAfterBoatLeaves(boat, width, time) {
  return (
    boat.caughtPiranha &&
    (time - boat.startedAt > RESCUE_BOAT_DURATION_MS || boat.x < -220 || boat.x > width + 220)
  )
}

function launchRescueBoat(boat, piranha, width, height) {
  if (!boat.requested || boat.active || !piranha.active) return
  if (Date.now() - piranha.spawnedAt < RESCUE_PIRANHA_VISIBLE_MS) return

  boat.active = true
  boat.startedAt = performance.now()
  boat.x = piranha.x > width / 2 ? width + 180 : -180
  boat.y = Math.min(height - 112, Math.max(84, piranha.y - 90))
  boat.vx = boat.x > piranha.x ? -10 : 10
  boat.vy = 0
  boat.caughtPiranha = false
  boat.caughtPiranhaSize = getPiranhaDisplaySize(piranha.eatenCount)
  boat.caughtX = 0
  boat.caughtY = 0
  boat.leavingDirection = boat.x < width / 2 ? 1 : -1
}

function movePiranha(piranha, school, width) {
  if (!piranha.active) return

  const target = school[piranha.targetIndex]

  if (school.length === 0 && piranha.phase !== 'sated') {
    piranha.phase = 'sated'
    piranha.vx = piranha.direction * 1.2
    piranha.vy *= 0.2
  }

  if (piranha.phase === 'hunting' && target) {
    const dx = target.x - piranha.x
    const dy = target.y - piranha.y
    const distance = Math.sqrt(dx * dx + dy * dy) || 1

    piranha.vx += (dx / distance) * 0.36
    piranha.vy += (dy / distance) * 0.28

    if (distance < 28) {
      piranha.prey = {
        size: target.size,
        primary: target.primary,
        secondary: target.secondary,
      }
      school.splice(piranha.targetIndex, 1)
      piranha.eaten = true
      piranha.eatenCount += 1
      if (piranha.eatenCount >= piranha.satiationTarget) {
        piranha.phase = 'sated'
        piranha.vx = piranha.direction * 1.2
        piranha.vy *= 0.2
      } else if (school.length > 0) {
        piranha.phase = 'leaving'
        piranha.vx = piranha.direction * 5.4
        piranha.vy *= 0.3
      } else {
        piranha.phase = 'sated'
        piranha.vx = piranha.direction * 1.2
        piranha.vy *= 0.2
      }
    }
  } else if (piranha.phase === 'sated') {
    piranha.vx += Math.sin(Date.now() * 0.0011) * 0.035
    piranha.vy += Math.cos(Date.now() * 0.0009) * 0.028
    piranha.vx *= 0.985
    piranha.vy *= 0.985
  } else {
    piranha.phase = 'leaving'
    piranha.vx += piranha.direction * 0.18
    piranha.vy *= 0.94
  }

  const speed = Math.sqrt(piranha.vx * piranha.vx + piranha.vy * piranha.vy) || 1
  const maxSpeed = piranha.phase === 'sated' ? 2.0 : piranha.phase === 'hunting' ? 7.2 : 8.5
  if (speed > maxSpeed) {
    piranha.vx = (piranha.vx / speed) * maxSpeed
    piranha.vy = (piranha.vy / speed) * maxSpeed
  }

  piranha.x += piranha.vx
  piranha.y += piranha.vy

  if (piranha.phase === 'sated') {
    if (piranha.x < 70 || piranha.x > width - 70) {
      piranha.vx *= -1
      piranha.x = Math.min(width - 70, Math.max(70, piranha.x))
    }
    if (piranha.y < 60 || piranha.y > window.innerHeight - 70) {
      piranha.vy *= -1
      piranha.y = Math.min(window.innerHeight - 70, Math.max(60, piranha.y))
    }
  }

  if (piranha.phase === 'leaving' && (piranha.x < -140 || piranha.x > width + 140)) {
    piranha.active = false
  }
}

function drawPiranha(ctx, piranha, time) {
  if (!piranha.active) return

  const angle = Math.atan2(piranha.vy, piranha.vx)
  const size = getPiranhaDisplaySize(piranha.eatenCount)
  const chomp = Math.sin(time * 0.026) * 4

  ctx.save()
  ctx.translate(piranha.x, piranha.y)
  ctx.rotate(angle)
  ctx.globalAlpha = 0.94

  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 1.35, size * 0.68, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#991b1b'
  ctx.beginPath()
  ctx.moveTo(-size * 1.05, 0)
  ctx.lineTo(-size * 1.9, -size * 0.72)
  ctx.lineTo(-size * 1.58, 0)
  ctx.lineTo(-size * 1.9, size * 0.72)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#fee2e2'
  ctx.beginPath()
  ctx.moveTo(size * 1.0, -size * 0.25)
  ctx.lineTo(size * 1.55, chomp)
  ctx.lineTo(size * 1.0, size * 0.25)
  ctx.closePath()
  ctx.fill()

  if (piranha.prey) {
    const preySize = Math.max(5, piranha.prey.size * 0.62)
    ctx.save()
    ctx.translate(size * 1.15, 0)
    ctx.rotate(Math.sin(time * 0.018) * 0.22)

    const preyBody = ctx.createLinearGradient(-preySize, 0, preySize, 0)
    preyBody.addColorStop(0, piranha.prey.secondary)
    preyBody.addColorStop(1, piranha.prey.primary)
    ctx.fillStyle = preyBody
    ctx.beginPath()
    ctx.ellipse(0, 0, preySize * 1.05, preySize * 0.48, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = piranha.prey.secondary
    ctx.beginPath()
    ctx.moveTo(-preySize * 0.9, 0)
    ctx.lineTo(-preySize * 1.55, -preySize * 0.5)
    ctx.lineTo(-preySize * 1.35, 0)
    ctx.lineTo(-preySize * 1.55, preySize * 0.5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(size * 0.52, -size * 0.2, size * 0.09, 0, Math.PI * 2)
  ctx.fill()

  if (piranha.phase === 'sated') {
    ctx.save()
    ctx.rotate(-0.12)

    ctx.fillStyle = '#111827'
    ctx.fillRect(-size * 0.18, -size * 1.18, size * 0.66, size * 0.42)
    ctx.fillRect(-size * 0.32, -size * 0.78, size * 0.96, size * 0.12)

    ctx.strokeStyle = '#facc15'
    ctx.lineWidth = Math.max(1.5, size * 0.045)
    ctx.beginPath()
    ctx.arc(size * 0.72, -size * 0.2, size * 0.18, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(size * 0.56, -size * 0.12)
    ctx.lineTo(size * 0.34, size * 0.18)
    ctx.stroke()

    ctx.restore()
  }

  ctx.restore()
}

function moveRescueBoat(boat, piranha, whales, spongeScene, width, height, time) {
  if (!boat.active) return

  if (piranha.active && !boat.caughtPiranha) {
    const targetX = piranha.x - 86
    const targetY = Math.min(height - 100, Math.max(72, piranha.y - 82))
    const dx = targetX - boat.x
    const dy = targetY - boat.y
    const distance = Math.sqrt(dx * dx + dy * dy) || 1

    boat.vx += (dx / distance) * 1.1
    boat.vy += (dy / distance) * 0.85
    boat.leavingDirection = boat.x < piranha.x ? 1 : -1

    const hookX = boat.x + 118
    const hookY = boat.y + 34
    const hookDx = piranha.x - hookX
    const hookDy = piranha.y - hookY
    const hookDistance = Math.sqrt(hookDx * hookDx + hookDy * hookDy)

    if (hookDistance < 64 || distance < 42) {
      boat.caughtPiranha = true
      boat.caughtPiranhaSize = getPiranhaDisplaySize(piranha.eatenCount)
      boat.caughtX = piranha.x
      boat.caughtY = piranha.y
      boat.leavingDirection = boat.x < width / 2 ? 1 : -1
      piranha.active = false
      piranha.disabled = true
      addWhales(whales, width, height)
    }
  } else if (boat.caughtPiranha) {
    boat.vx += boat.leavingDirection * 0.28
    boat.vy += (height - 190 - boat.y) * 0.015
    boat.caughtX = boat.x + 118
    boat.caughtY = boat.y + 128 + Math.sin(time * 0.012) * 7
  } else {
    boat.vx += boat.leavingDirection * 0.45
  }

  boat.vx *= 0.96
  boat.vy *= 0.94

  const speed = Math.sqrt(boat.vx * boat.vx + boat.vy * boat.vy) || 1
  const maxSpeed = boat.caughtPiranha ? 4.4 : 16
  if (speed > maxSpeed) {
    boat.vx = (boat.vx / speed) * maxSpeed
    boat.vy = (boat.vy / speed) * maxSpeed
  }

  boat.x += boat.vx
  boat.y = Math.min(height - 150, Math.max(72, boat.y + boat.vy))

  if (shouldRevealSpongeAfterBoatLeaves(boat, width, time)) {
    spongeScene.happyUntil = time + 1800
    boat.active = false
    boat.caughtPiranha = false
  } else if (time - boat.startedAt > RESCUE_BOAT_DURATION_MS) {
    boat.active = false
  }
}

function drawCaughtPiranha(ctx, x, y, size) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.PI / 2)
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 1.35, size * 0.68, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#991b1b'
  ctx.beginPath()
  ctx.moveTo(-size * 1.05, 0)
  ctx.lineTo(-size * 1.9, -size * 0.72)
  ctx.lineTo(-size * 1.58, 0)
  ctx.lineTo(-size * 1.9, size * 0.72)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fee2e2'
  ctx.beginPath()
  ctx.moveTo(size * 1.0, -size * 0.25)
  ctx.lineTo(size * 1.55, 0)
  ctx.lineTo(size * 1.0, size * 0.25)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function moveWhale(whale, width, height, time) {
  whale.x += whale.vx
  whale.y += whale.vy + Math.sin(time * 0.0008 + whale.wave) * 0.08
  whale.wave += 0.015

  if (whale.y < 90 || whale.y > height - 80) {
    whale.vy *= -1
  }

  if (whale.vx > 0 && whale.x > width + whale.size * 2) {
    whale.x = -whale.size * 2
    whale.y = rand(110, Math.max(180, height - 120))
  }

  if (whale.vx < 0 && whale.x < -whale.size * 2) {
    whale.x = width + whale.size * 2
    whale.y = rand(110, Math.max(180, height - 120))
  }
}

function drainPosition(actor, flush, time, phase) {
  const t = Math.min(1, Math.max(0, (time - flush.startedAt) / FLUSH_DURATION_MS))
  const ease = t * t * (3 - 2 * t)
  const radius = Math.sin(t * Math.PI) * 38
  const angle = phase + t * Math.PI * 5
  const x = actor.flushX + (flush.x - actor.flushX) * ease + Math.cos(angle) * radius
  const y = actor.flushY + (flush.y - actor.flushY) * ease + Math.sin(angle) * radius
  actor.vx = x - actor.x
  actor.vy = y - actor.y
  actor.x = x
  actor.y = y
}

function drawWhale(ctx, whale, time, opacity = 0.76, scale = 1) {
  const direction = whale.vx >= 0 ? 1 : -1
  const size = whale.size * scale
  const tailWave = Math.sin(time * 0.003 + whale.wave) * size * 0.18

  ctx.save()
  ctx.translate(whale.x, whale.y)
  ctx.scale(direction, 1)
  ctx.globalAlpha = opacity

  ctx.fillStyle = '#60a5fa'
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 1.45, size * 0.58, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#2563eb'
  ctx.beginPath()
  ctx.moveTo(-size * 1.2, 0)
  ctx.lineTo(-size * 2.0, -size * 0.62 + tailWave)
  ctx.lineTo(-size * 1.72, 0)
  ctx.lineTo(-size * 2.0, size * 0.62 + tailWave)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#93c5fd'
  ctx.beginPath()
  ctx.ellipse(size * 0.12, size * 0.35, size * 0.64, size * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(size * 0.72, -size * 0.18, Math.max(2, size * 0.055), 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#bfdbfe'
  for (let i = 0; i < 5; i += 1) {
    const rise = (time * 0.025 + i * 18 + whale.bubbleSeed * 8) % 115
    const bubbleX = whale.x + direction * (size * 0.75 + i * 9)
    const bubbleY = whale.y - size * 0.55 - rise
    const radius = (4 + (i % 3) * 2) * scale
    ctx.beginPath()
    ctx.arc(bubbleX, bubbleY, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawSpongeScene(ctx, scene, time, opacity = 1, scale = 1) {
  if (!scene.active) return

  const t = time - scene.startedAt
  const puff = Math.sin(t * 0.006)
  const smokeMultiplier = scene.puffing ? 3 : 1
  const isHappy = scene.puffing
  const x = scene.x
  const y = scene.y + Math.sin(t * 0.002) * 4

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.globalAlpha = opacity

  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(18, 70)
  ctx.lineTo(108, 70)
  ctx.moveTo(30, 70)
  ctx.lineTo(22, 112)
  ctx.moveTo(94, 70)
  ctx.lineTo(104, 112)
  ctx.moveTo(96, 70)
  ctx.lineTo(96, 18)
  ctx.stroke()

  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.moveTo(34, 0)
  ctx.lineTo(92, 4)
  ctx.lineTo(86, 70)
  ctx.lineTo(28, 66)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#fde047'
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath()
    ctx.arc(38 + (i % 4) * 13, 12 + Math.floor(i / 4) * 28, 3 + (i % 2), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(49, 26, 9, 0, Math.PI * 2)
  ctx.arc(70, 26, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(51, 27, 3, 0, Math.PI * 2)
  ctx.arc(68, 27, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#7c2d12'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(60, isHappy ? 38 : 42, isHappy ? 16 : 10 + puff * 2, 0.1, Math.PI - 0.1)
  ctx.stroke()
  if (isHappy) {
    ctx.fillStyle = '#7c2d12'
    ctx.beginPath()
    ctx.arc(55, 45, 2, 0, Math.PI * 2)
    ctx.arc(66, 45, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(32, 54, 52, 11)
  ctx.fillStyle = '#78350f'
  ctx.fillRect(32, 65, 52, 13)
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.moveTo(58, 55)
  ctx.lineTo(65, 55)
  ctx.lineTo(62, 70)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#facc15'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(44, 78)
  ctx.lineTo(36 + puff * 3, 98)
  ctx.moveTo(73, 78)
  ctx.lineTo(86 - puff * 3, 98)
  ctx.stroke()

  const handX = 104 + puff * 4
  const handY = 35 - Math.abs(puff) * 5
  ctx.strokeStyle = '#facc15'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(84, 42)
  ctx.lineTo(handX, handY)
  ctx.stroke()

  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(handX, handY)
  ctx.lineTo(142, 50)
  ctx.lineTo(154, 86)
  ctx.stroke()

  ctx.fillStyle = '#38bdf8'
  ctx.beginPath()
  ctx.ellipse(158, 92, 15, 18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(158, 74)
  ctx.lineTo(158, 42)
  ctx.moveTo(146, 42)
  ctx.lineTo(170, 42)
  ctx.stroke()
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.arc(158, 36, 9, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#e5e7eb'
  for (let i = 0; i < 6 * smokeMultiplier; i += 1) {
    const rise = (t * 0.035 + i * 13) % 145
    const smokeX = 158 + Math.sin(t * 0.004 + i) * (18 + smokeMultiplier * 4)
    const smokeY = 32 - rise
    const radius = 7 + (i % 3) * 3 + Math.sin(t * 0.005 + i) * 2 + (smokeMultiplier - 1)
    ctx.globalAlpha = Math.max(0, 0.58 + smokeMultiplier * 0.06 - rise / 240)
    ctx.beginPath()
    ctx.arc(smokeX, smokeY, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function drawRescueBoat(ctx, boat, time) {
  if (!boat.active) return

  const bob = Math.sin(time * 0.004) * 4
  const x = boat.x
  const y = boat.y + bob
  const scale = 2
  const movingRight = boat.vx >= 0
  const cast = Math.sin((time - boat.startedAt) * 0.011)
  const rodTipX = x + (136 + cast * 18) * scale
  const rodTipY = y + (-34 + Math.cos((time - boat.startedAt) * 0.009) * 12) * scale
  const hookX = boat.caughtPiranha ? boat.caughtX : x + (126 + cast * 42) * scale
  const hookY = boat.caughtPiranha ? boat.caughtY : y + (74 + Math.abs(cast) * 24) * scale

  ctx.save()
  ctx.globalAlpha = 0.42
  ctx.fillStyle = '#93c5fd'
  const sternX = movingRight ? x - 12 : x + 142 * scale + 12
  for (let i = 0; i < 7; i += 1) {
    const drift = (time * 0.035 + i * 19) % 95
    const bubbleX = sternX + (movingRight ? -drift : drift)
    const bubbleY = y + (32 + Math.sin(time * 0.006 + i) * 18) * scale
    const radius = 3 + (i % 3) * 2
    ctx.beginPath()
    ctx.arc(bubbleX, bubbleY, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)

  ctx.strokeStyle = '#3f1f12'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(50, -58)
  ctx.lineTo(50, 24)
  ctx.moveTo(90, -48)
  ctx.lineTo(90, 24)
  ctx.stroke()

  ctx.fillStyle = '#020617'
  ctx.beginPath()
  ctx.moveTo(52, -56)
  ctx.quadraticCurveTo(24, -34, 50, -8)
  ctx.quadraticCurveTo(70, -32, 52, -56)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(92, -46)
  ctx.quadraticCurveTo(120, -24, 92, -2)
  ctx.quadraticCurveTo(72, -24, 92, -46)
  ctx.fill()

  ctx.strokeStyle = '#f8fafc'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(38, -26)
  ctx.lineTo(62, -26)
  ctx.moveTo(82, -20)
  ctx.lineTo(106, -20)
  ctx.stroke()

  const hull = ctx.createLinearGradient(0, 18, 0, 62)
  hull.addColorStop(0, '#5b2c16')
  hull.addColorStop(0.58, '#3f1f12')
  hull.addColorStop(1, '#111827')

  ctx.fillStyle = hull
  ctx.beginPath()
  ctx.moveTo(-2, 18)
  ctx.quadraticCurveTo(72, 2, 150, 18)
  ctx.lineTo(130, 49)
  ctx.quadraticCurveTo(72, 70, 14, 49)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#020617'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(10, 25)
  ctx.quadraticCurveTo(72, 39, 140, 25)
  ctx.stroke()

  ctx.fillStyle = '#facc15'
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath()
    ctx.arc(32 + i * 24, 34, 4.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1e3a8a'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  ctx.fillStyle = '#7c2d12'
  ctx.fillRect(112, 4, 8, 25)
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.moveTo(120, 7)
  ctx.lineTo(144, 15)
  ctx.lineTo(120, 23)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#f8fafc'
  ctx.font = 'bold 13px sans-serif'
  ctx.fillText('СПАСИ РЫБУ', 28, 43)

  const captainBob = Math.sin((time - boat.startedAt) * 0.014)
  ctx.strokeStyle = '#3f1f12'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(56, -16)
  ctx.lineTo(48 + captainBob * 3, 8)
  ctx.moveTo(84, -16)
  ctx.lineTo(92 - captainBob * 3, 8)
  ctx.stroke()

  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(70, -18, 11, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#dc2626'
  ctx.fillRect(58, -28, 24, 5)
  ctx.fillStyle = '#020617'
  ctx.beginPath()
  ctx.moveTo(47, -30)
  ctx.quadraticCurveTo(70, -48, 94, -30)
  ctx.lineTo(86, -18)
  ctx.quadraticCurveTo(70, -24, 54, -18)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.arc(70, -31, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#7c2d12'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(58, -9)
  ctx.quadraticCurveTo(70, 1 + captainBob, 82, -9)
  ctx.stroke()
  ctx.strokeStyle = '#020617'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(66, -20)
  ctx.lineTo(56, -22)
  ctx.moveTo(73, -20)
  ctx.arc(76, -20, 3, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = '#7c2d12'
  ctx.beginPath()
  ctx.ellipse(70, 4, 14, 20, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(80, -2)
  ctx.lineTo(105 + cast * 12, -15 + cast * 8)
  ctx.stroke()

  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(62, 24)
  ctx.lineTo(52 + cast * 8, 38)
  ctx.moveTo(78, 24)
  ctx.lineTo(90 + cast * 8, 38)
  ctx.stroke()

  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(104 + cast * 12, -15 + cast * 8)
  ctx.lineTo((rodTipX - x) / scale, (rodTipY - y) / scale)
  ctx.stroke()

  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo((rodTipX - x) / scale, (rodTipY - y) / scale)
  ctx.lineTo((hookX - x) / scale, (hookY - y) / scale)
  ctx.stroke()

  ctx.restore()

  if (boat.caughtPiranha) {
    drawCaughtPiranha(ctx, hookX, hookY, boat.caughtPiranhaSize)
  }
}

export function FishCursorTrail() {
  const mode = useMotionMode()
  const [started, setStarted] = useState(false)
  const animated = mode === 'auto' || (mode === 'manual' && started)
  return (
    <FishScene
      animated={animated}
      canStart={mode === 'manual' && !started}
      onStart={() => setStarted(true)}
    />
  )
}

function paintPortrait(portrait, time, puffing) {
  if (!portrait || !window.CanvasRenderingContext2D) return
  const ctx = portrait.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, portrait.width, portrait.height)
  drawSpongeScene(
    ctx,
    { active: true, x: 4, y: 27, startedAt: 0, puffing },
    time,
    1,
    PORTRAIT_SCALE,
  )
}

function FishScene({ animated, canStart, onStart }) {
  const portrait = useRef(null)
  const puff = useRef(false)
  const [isFlushed, setIsFlushed] = useState(() => {
    try {
      return localStorage.getItem(FISH_FLUSH_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [isFlushing, setIsFlushing] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!animated && isFlushing) setIsFlushed(true)
  }, [animated, isFlushing])

  useEffect(() => {
    function handleRestore() {
      puff.current = false
      try {
        localStorage.removeItem(FISH_FLUSH_STORAGE_KEY)
      } catch {}
      setIsFlushing(false)
      setIsFlushed(false)
    }

    window.addEventListener(FISH_CURSOR_RESTORE_EVENT, handleRestore)
    return () => window.removeEventListener(FISH_CURSOR_RESTORE_EVENT, handleRestore)
  }, [])

  useEffect(() => {
    if (isFlushed) return
    if (!animated) {
      paintPortrait(portrait.current, 0, false)
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const canvasElement = canvas
    const context = ctx

    const pointer = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.38,
      active: false,
      down: false,
      scatter: false,
      wander: false,
    }
    const flush = {
      active: false,
      startedAt: 0,
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.82,
    }
    const school = []
    const whales = []
    const piranha = {
      active: false,
      disabled: false,
      spawnedAt: 0,
      satiationTarget: 0,
      prey: null,
      x: -90,
      y: window.innerHeight * 0.5,
      vx: 0,
      vy: 0,
      targetIndex: 0,
      phase: 'hunting',
      eaten: false,
      eatenCount: 0,
      direction: 1,
    }
    const rescueBoat = {
      requested: false,
      active: false,
      startedAt: 0,
      x: -180,
      y: window.innerHeight - 110,
      vx: 0,
      vy: 0,
      caughtPiranha: false,
      caughtPiranhaSize: 30,
      caughtX: 0,
      caughtY: 0,
      leavingDirection: 1,
    }
    const spongeScene = { active: true, startedAt: 0, x: 0, y: 0, puffing: false, happyUntil: 0 }
    let width = 0
    let height = 0
    let animationFrame = 0
    let flushTimeout = 0
    let lastPaint = null
    let accumulator = 0
    let lastPortrait = -Infinity
    let portraitVisible = true
    let nextPiranha = performance.now() + PIRANHA_INTERVAL_MS
    let obstacles = []
    let obstaclesChanged = true
    const ignoreElements = [...document.querySelectorAll('[data-fish-ignore]')]

    function invalidateObstacles() {
      obstaclesChanged = true
    }

    function clipObstacles(obstacles) {
      if (!obstacles.length) return
      context.save()
      context.beginPath()
      context.rect(0, 0, width, height)
      for (const { left, top, right, bottom } of obstacles) {
        context.rect(left, top, right - left, bottom - top)
      }
      context.clip('evenodd')
    }

    function resize() {
      const oldWidth = width
      const oldHeight = height
      width = window.innerWidth
      height = window.innerHeight
      const scale = Math.min(1, 1280 / width, 800 / height)
      canvasElement.width = Math.floor(width * scale)
      canvasElement.height = Math.floor(height * scale)
      context.setTransform(scale, 0, 0, scale, 0, 0)
      invalidateObstacles()

      if (oldWidth) {
        for (const fish of school) {
          fish.x *= width / oldWidth
          fish.y *= height / oldHeight
          fish.prevX = fish.x
          fish.prevY = fish.y
        }
      } else {
        for (let i = 0; i < fishCount(width); i++) school.push(createFish(i, width, height))
      }
    }

    function tick(time) {
      animationFrame = requestAnimationFrame(tick)
      accumulator +=
        lastPaint === null ? STEP_MS : Math.max(0, Math.min(time - lastPaint, 3 * STEP_MS))
      lastPaint = time
      if (!flush.active && time >= nextPiranha) {
        spawnPiranha(piranha, school, width, height)
        nextPiranha = time + PIRANHA_INTERVAL_MS
      }
      context.clearRect(0, 0, width, height)
      const flushProgress = flush.active
        ? Math.min(1, Math.max(0, (time - flush.startedAt) / FLUSH_DURATION_MS))
        : 0

      if (obstaclesChanged) {
        const portraitRect = portrait.current.getBoundingClientRect()
        portraitVisible = portraitRect.bottom > 0 && portraitRect.top < height
        obstacles = buildFishObstacles(
          ignoreElements
            .map((el) => el.getBoundingClientRect())
            .filter((rect) => rect.width > 0 && rect.bottom > 0 && rect.top < height),
        )
        obstaclesChanged = false
      }

      while (accumulator + 0.0001 >= STEP_MS) {
        accumulator = Math.max(0, accumulator - STEP_MS)
        const stepTime = time - accumulator
        school.forEach((fish, index) => {
          fish.prevX = fish.x
          fish.prevY = fish.y
          fish.prevWave = fish.wave
          fish.prevHeading = fish.heading
          moveFish(fish, index, pointer, flush, width, height, stepTime, obstacles)
          if (Math.abs(fish.prevX - fish.x) > width / 2) fish.prevX = fish.x
        })
        if (flush.active) {
          whales.forEach((whale) => drainPosition(whale, flush, stepTime, whale.bubbleSeed))
          drainPosition(spongeScene, flush, stepTime, 0)
        } else {
          whales.forEach((whale) => moveWhale(whale, width, height, time))
          movePiranha(piranha, school, width)
          launchRescueBoat(rescueBoat, piranha, width, height)
          moveRescueBoat(rescueBoat, piranha, whales, spongeScene, width, height, time)
        }
      }

      if (!flush.active) clipObstacles(obstacles)
      for (let i = 0; i < school.length; i += 1) {
        drawFish(
          context,
          school[i],
          0.78 * (1 - flushProgress),
          1 - flushProgress * 0.94,
          accumulator / STEP_MS,
        )
      }
      if (flush.active) {
        for (let i = 0; i < whales.length; i += 1) {
          drawWhale(
            context,
            whales[i],
            time,
            0.76 * (1 - flushProgress * 0.82),
            1 - flushProgress * 0.45,
          )
        }
        drawSpongeScene(
          context,
          spongeScene,
          time,
          1 - flushProgress * 0.9,
          PORTRAIT_SCALE * (1 - flushProgress * 0.95),
        )
      } else {
        for (let i = 0; i < whales.length; i += 1) {
          drawWhale(context, whales[i], time)
        }
        drawPiranha(context, piranha, time)
        drawRescueBoat(context, rescueBoat, time)
        if (portraitVisible && time - lastPortrait >= 32) {
          paintPortrait(portrait.current, time, puff.current || time < spongeScene.happyUntil)
          lastPortrait = time
        }
      }

      if (!flush.active && obstacles.length) context.restore()
    }

    function handlePointerMove(event) {
      const target = event.target instanceof Element ? event.target : null
      const isIgnored = Boolean(target?.closest('[data-fish-ignore]'))
      const isRepelled = Boolean(target?.closest('[data-fish-repel-zone]'))

      pointer.x = event.clientX
      pointer.y = event.clientY

      if (isIgnored) {
        applyPointerIgnoredHover(pointer)
      } else {
        pointer.active = true
        pointer.scatter = isRepelled
        pointer.wander = false
      }
    }

    function handlePointerDown(event) {
      if (event.target instanceof Element && event.target.closest('[data-fish-ignore]')) {
        applyPointerIgnoredHover(pointer)
        return
      }

      pointer.down = true
      pointer.active = true
      pointer.wander = false
    }

    function handlePointerUp() {
      pointer.down = false
    }

    function handlePointerLeave() {
      applyPointerLeaveScatter(pointer)
    }

    function handleFlush(event) {
      try {
        localStorage.setItem(FISH_FLUSH_STORAGE_KEY, 'true')
      } catch {}
      const detail = event.detail
      if (flush.active) return
      const rect = portrait.current.getBoundingClientRect()
      spongeScene.x = rect.left + 4
      spongeScene.y = rect.top + 27
      spongeScene.puffing = puff.current
      for (const actor of [...school, ...whales, spongeScene]) {
        actor.flushX = actor.x
        actor.flushY = actor.y
      }
      flush.active = true
      flush.startedAt = performance.now()
      flush.x = detail?.x ?? width * 0.5
      flush.y = detail?.y ?? height * 0.82
      pointer.active = false
      pointer.down = false
      pointer.scatter = false
      pointer.wander = false
      setIsFlushing(true)
      window.clearTimeout(flushTimeout)
      flushTimeout = window.setTimeout(() => {
        setIsFlushed(true)
      }, FLUSH_DURATION_MS)
    }

    function handleRescue() {
      rescueBoat.requested = true
      launchRescueBoat(rescueBoat, piranha, width, height)
    }

    function syncVisibility() {
      cancelAnimationFrame(animationFrame)
      lastPaint = null
      accumulator = 0
      if (!document.hidden) animationFrame = requestAnimationFrame(tick)
    }

    resize()
    const observer = window.ResizeObserver && new ResizeObserver(invalidateObstacles)
    ignoreElements.forEach((element) => observer?.observe(element))
    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    window.addEventListener('scroll', invalidateObstacles, { passive: true })
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('pointerup', handlePointerUp, { passive: true })
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true })
    window.addEventListener(FLUSH_EVENT, handleFlush)
    window.addEventListener(RESCUE_EVENT, handleRescue)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.clearTimeout(flushTimeout)
      observer?.disconnect()
      document.removeEventListener('visibilitychange', syncVisibility)
      window.removeEventListener('scroll', invalidateObstacles)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointerleave', handlePointerLeave)
      window.removeEventListener(FLUSH_EVENT, handleFlush)
      window.removeEventListener(RESCUE_EVENT, handleRescue)
    }
  }, [isFlushed, animated])

  return (
    <>
      {animated && !isFlushed && (
        <canvas
          ref={canvasRef}
          id="fishCursorCanvas"
          aria-hidden="true"
          data-testid="fish-cursor-trail"
          className={`fixed inset-0 z-[1] h-screen w-screen pointer-events-none select-none opacity-90 ${
            isFlushing ? 'transition-opacity duration-[2100ms]' : ''
          }`}
        />
      )}
      <FishControls
        key={String(isFlushed)}
        hidden={isFlushed}
        flushing={isFlushing}
        animated={animated}
        canStart={canStart}
        onStart={onStart}
        portrait={portrait}
        puff={puff}
        onRestore={() => window.dispatchEvent(new Event(FISH_CURSOR_RESTORE_EVENT))}
        onFlush={(rect) => {
          if (animated) {
            window.dispatchEvent(
              new CustomEvent(FLUSH_EVENT, {
                detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
              }),
            )
          } else {
            try {
              localStorage.setItem(FISH_FLUSH_STORAGE_KEY, 'true')
            } catch {}
            setIsFlushed(true)
          }
        }}
      />
    </>
  )
}
