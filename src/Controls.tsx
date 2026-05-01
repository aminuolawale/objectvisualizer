import type { CSSProperties } from 'react'
import type { CylinderParams } from './App'

// ── Slider ────────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  decimals?: number
  disabled?: boolean
  readOnly?: boolean
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step, unit = '', decimals = 1, disabled, readOnly, onChange }: SliderProps) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0
  const inputDisabled = disabled || readOnly
  const stateClass = disabled ? ' ctrl-disabled' : readOnly ? ' ctrl-readonly' : ''

  const handleNumberChange = (rawValue: string) => {
    if (rawValue === '') return

    const nextValue = Number(rawValue)
    if (Number.isFinite(nextValue)) {
      onChange(nextValue)
    }
  }

  return (
    <div className={`ctrl-row${stateClass}`}>
      <div className="ctrl-header">
        <span className="ctrl-label">{label}</span>
        <label className="ctrl-number-wrap">
          <input
            type="number"
            className="ctrl-number"
            min={min}
            max={max}
            step={step}
            value={value.toFixed(decimals)}
            disabled={inputDisabled}
            readOnly={readOnly}
            onChange={e => handleNumberChange(e.target.value)}
          />
          <span className="ctrl-unit">{unit.trim()}</span>
        </label>
      </div>
      <input
        type="range"
        className="ctrl-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={inputDisabled}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as CSSProperties}
      />
    </div>
  )
}

// ── Segmented button ──────────────────────────────────────────────────────────

interface SegmentProps {
  label: string
  options: { id: string; label: string }[]
  value: string
  disabled?: boolean
  readOnly?: boolean
  onChange: (id: string) => void
}

function Segment({ label, options, value, disabled, readOnly, onChange }: SegmentProps) {
  const buttonDisabled = disabled || readOnly
  const stateClass = disabled ? ' ctrl-disabled' : readOnly ? ' ctrl-readonly' : ''

  return (
    <div className={`ctrl-row ctrl-row-inline${stateClass}`}>
      <span className="ctrl-label">{label}</span>
      <div className="ctrl-seg">
        {options.map(opt => (
          <button
            key={opt.id}
            className={`seg-btn${value === opt.id ? ' seg-active' : ''}`}
            disabled={buttonDisabled}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main controls panel ───────────────────────────────────────────────────────

interface Props {
  params: CylinderParams
  onChange: (p: CylinderParams) => void
  mobileHidden?: boolean
  readOnly?: boolean
  showDimensions: boolean
  onToggleDimensions: () => void
}

const FACE_OPTIONS = [
  { id: 'closed', label: 'Closed' },
  { id: 'open',   label: 'Open'   },
]

const HOLE_FACE_OPTIONS = [
  { id: 'top',    label: 'Top'    },
  { id: 'bottom', label: 'Bottom' },
]

const DIMENSION_OPTIONS = [
  { id: 'on',  label: 'On'  },
  { id: 'off', label: 'Off' },
]

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export default function Controls({
  params,
  onChange,
  mobileHidden = false,
  readOnly = false,
  showDimensions,
  onToggleDimensions,
}: Props) {
  const maxWallThickness = Math.max(0.1, params.diameter / 2 - 0.1)
  const maxHoleDiameter = Math.max(0, params.diameter - 0.2)

  const set = <K extends keyof CylinderParams>(key: K) =>
    (value: CylinderParams[K]) => {
      const next = { ...params, [key]: value }

      if (key === 'diameter') {
        const diameter = value as number
        next.wallThickness = clamp(params.wallThickness, 0.1, Math.max(0.1, diameter / 2 - 0.1))
        next.holeDiameter = clamp(params.holeDiameter, 0, Math.max(0, diameter - 0.2))
      }

      if (key === 'wallThickness') {
        next.wallThickness = clamp(value as number, 0.1, maxWallThickness)
      }

      if (key === 'holeDiameter') {
        next.holeDiameter = clamp(value as number, 0, maxHoleDiameter)
      }

      onChange(next)
    }

  const holeFaceIsOpen = params.holeFace === 'top' ? params.topOpen : params.bottomOpen

  return (
    <aside className={`ctrl-panel${mobileHidden ? ' ctrl-panel-mobile-hidden' : ''}`}>
      {/* Header */}
      <header className="ctrl-title">
        <div>
          <span className="ctrl-brand">AO.</span>
          <span className="ctrl-subtitle">Cylinder</span>
        </div>
        {readOnly && <span className="ctrl-badge">Preview</span>}
      </header>

      {/* Geometry */}
      <div className="ctrl-section">
        <p className="ctrl-section-heading">Geometry</p>
        <Segment
          label="Dimensions"
          options={DIMENSION_OPTIONS}
          value={showDimensions ? 'on' : 'off'}
          onChange={id => {
            if ((id === 'on') !== showDimensions) {
              onToggleDimensions()
            }
          }}
        />
        <Slider
          label="Diameter"
          value={params.diameter}
          min={2}
          max={20}
          step={0.1}
          unit=" cm"
          readOnly={readOnly}
          onChange={set('diameter')}
        />
        <Slider
          label="Wall Thickness"
          value={params.wallThickness}
          min={0.1}
          max={maxWallThickness}
          step={0.1}
          unit=" cm"
          readOnly={readOnly}
          onChange={set('wallThickness')}
        />
        <Slider
          label="Height"
          value={params.height}
          min={1}
          max={20}
          step={0.1}
          unit=" cm"
          readOnly={readOnly}
          onChange={set('height')}
        />
      </div>

      <div className="ctrl-divider" />

      {/* Faces */}
      <div className="ctrl-section">
        <p className="ctrl-section-heading">Faces</p>
        <Segment
          label="Top"
          options={FACE_OPTIONS}
          value={params.topOpen ? 'open' : 'closed'}
          readOnly={readOnly}
          onChange={v => set('topOpen')(v === 'open')}
        />
        <Segment
          label="Bottom"
          options={FACE_OPTIONS}
          value={params.bottomOpen ? 'open' : 'closed'}
          readOnly={readOnly}
          onChange={v => set('bottomOpen')(v === 'open')}
        />
      </div>

      <div className="ctrl-divider" />

      {/* Hole */}
      <div className="ctrl-section">
        <p className="ctrl-section-heading">Hole</p>
        <Segment
          label="Face"
          options={HOLE_FACE_OPTIONS}
          value={params.holeFace}
          readOnly={readOnly}
          onChange={v => set('holeFace')(v as 'top' | 'bottom')}
        />
        <Slider
          label="Diameter"
          value={params.holeDiameter}
          min={0}
          max={maxHoleDiameter}
          step={0.1}
          unit=" cm"
          disabled={holeFaceIsOpen}
          readOnly={readOnly}
          onChange={set('holeDiameter')}
        />
        {holeFaceIsOpen && (
          <p className="ctrl-note">Face is open — close it to cut a hole</p>
        )}
      </div>

      {/* Hint */}
      <p className="ctrl-hint">drag · scroll · double-click to reset</p>
    </aside>
  )
}
