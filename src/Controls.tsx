import type { CylinderParams } from './App'

// ── Slider ────────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  disabled?: boolean
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step, unit = '', disabled, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={`ctrl-row${disabled ? ' ctrl-disabled' : ''}`}>
      <div className="ctrl-header">
        <span className="ctrl-label">{label}</span>
        <span className="ctrl-value">{value.toFixed(2)}{unit}</span>
      </div>
      <input
        type="range"
        className="ctrl-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  )
}

// ── Segmented button ──────────────────────────────────────────────────────────

interface SegmentProps {
  label: string
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}

function Segment({ label, options, value, onChange }: SegmentProps) {
  return (
    <div className="ctrl-row ctrl-row-inline">
      <span className="ctrl-label">{label}</span>
      <div className="ctrl-seg">
        {options.map(opt => (
          <button
            key={opt.id}
            className={`seg-btn${value === opt.id ? ' seg-active' : ''}`}
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
}

const FACE_OPTIONS = [
  { id: 'closed', label: 'Closed' },
  { id: 'open',   label: 'Open'   },
]

const HOLE_FACE_OPTIONS = [
  { id: 'top',    label: 'Top'    },
  { id: 'bottom', label: 'Bottom' },
]

export default function Controls({ params, onChange }: Props) {
  const set = <K extends keyof CylinderParams>(key: K) =>
    (value: CylinderParams[K]) => onChange({ ...params, [key]: value })

  const holeFaceIsOpen = params.holeFace === 'top' ? params.topOpen : params.bottomOpen

  return (
    <aside className="ctrl-panel">
      {/* Header */}
      <header className="ctrl-title">
        <span className="ctrl-brand">AO.</span>
        <span className="ctrl-subtitle">Cylinder</span>
      </header>

      {/* Geometry */}
      <div className="ctrl-section">
        <p className="ctrl-section-heading">Geometry</p>
        <Slider
          label="Wall Thickness"
          value={params.wallThickness}
          min={0.02}
          max={0.97}
          step={0.01}
          onChange={set('wallThickness')}
        />
        <Slider
          label="Height"
          value={params.height}
          min={0.2}
          max={4.0}
          step={0.05}
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
          onChange={v => set('topOpen')(v === 'open')}
        />
        <Segment
          label="Bottom"
          options={FACE_OPTIONS}
          value={params.bottomOpen ? 'open' : 'closed'}
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
          onChange={v => set('holeFace')(v as 'top' | 'bottom')}
        />
        <Slider
          label="Diameter"
          value={params.holeDiameter}
          min={0}
          max={1.9}
          step={0.01}
          disabled={holeFaceIsOpen}
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
