import { useState } from 'react'
import { FishingRodIcon, PoolIcon, ToiletIcon } from './FishIcons'
import { RESCUE_EVENT } from './events'

export default function FishControls({
  hidden,
  flushing,
  animated,
  canStart,
  onStart,
  onRestore,
  onFlush,
  portrait,
  puff,
}) {
  const [rescued, setRescued] = useState(false)

  function rescue() {
    setRescued(true)
    window.dispatchEvent(new Event(RESCUE_EVENT))
  }

  function pressKey(event, active) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    puff.current = active
  }

  return (
    <div
      role="group"
      aria-label="Анимация рыбок"
      className="relative z-2 flex flex-wrap items-center gap-2"
      data-fish-repel-zone
    >
      {hidden ? (
        <button type="button" className="fish-control" onClick={onRestore}>
          <PoolIcon /> Вернуть рыбок
        </button>
      ) : (
        <>
          <button
            type="button"
            aria-label="Спанч Боб выпускает дым"
            title="Зажми Спанч Боба"
            disabled={!animated || flushing}
            className="shrink-0 rounded-xl"
            onPointerDown={() => {
              puff.current = true
            }}
            onPointerUp={() => {
              puff.current = false
            }}
            onPointerCancel={() => {
              puff.current = false
            }}
            onPointerLeave={() => {
              puff.current = false
            }}
            onBlur={() => {
              puff.current = false
            }}
            onKeyDown={(event) => pressKey(event, true)}
            onKeyUp={(event) => pressKey(event, false)}
          >
            <canvas
              aria-hidden="true"
              ref={portrait}
              width="132"
              height="108"
              className={flushing ? 'invisible' : 'block'}
            />
          </button>
          <div className="flex flex-col items-start gap-1.5">
            {canStart && (
              <button type="button" className="fish-control" onClick={onStart}>
                Включить рыбок
              </button>
            )}
            {animated && !rescued && (
              <button type="button" className="fish-control" disabled={flushing} onClick={rescue}>
                <FishingRodIcon /> Спасти рыбок
              </button>
            )}
            <button
              type="button"
              className="fish-control fish-flush"
              disabled={flushing}
              onClick={(event) =>
                onFlush(event.currentTarget.querySelector('svg').getBoundingClientRect())
              }
            >
              <ToiletIcon /> Смыть рыбок в унитаз
            </button>
          </div>
        </>
      )}
    </div>
  )
}
