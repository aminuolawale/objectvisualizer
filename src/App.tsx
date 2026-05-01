import { useState, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter'
import HollowCylinder from './HollowCylinder'
import Controls from './Controls'

export interface CylinderParams {
  diameter: number
  wallThickness: number
  height: number
  topOpen: boolean
  bottomOpen: boolean
  holeDiameter: number
  holeFace: 'top' | 'bottom'
}

export const CM_TO_SCENE_UNIT = 0.2

const DEFAULT_PARAMS: CylinderParams = {
  diameter: 10,
  wallThickness: 0.9,
  height: 9,
  topOpen: false,
  bottomOpen: false,
  holeDiameter: 0,
  holeFace: 'top',
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function sanitizeParams(params: CylinderParams): CylinderParams {
  const diameter = clamp(params.diameter, 2, 20)
  const wallThickness = clamp(params.wallThickness, 0.1, Math.max(0.1, diameter / 2 - 0.1))
  const height = clamp(params.height, 1, 20)
  const holeDiameter = clamp(params.holeDiameter, 0, Math.max(0, diameter - 0.2))

  return {
    diameter,
    wallThickness,
    height,
    topOpen: params.topOpen,
    bottomOpen: params.bottomOpen,
    holeDiameter,
    holeFace: params.holeFace,
  }
}

function numberParam(searchParams: URLSearchParams, key: string, fallback: number) {
  const value = Number(searchParams.get(key))
  return Number.isFinite(value) ? value : fallback
}

function paramsFromUrl(): { params: CylinderParams; readOnly: boolean; showDimensions: boolean } {
  const searchParams = new URLSearchParams(window.location.search)

  if (searchParams.size === 0) {
    return { params: DEFAULT_PARAMS, readOnly: false, showDimensions: true }
  }

  return {
    readOnly: searchParams.get('preview') === '1',
    showDimensions: searchParams.get('dims') !== '0',
    params: sanitizeParams({
      diameter: numberParam(searchParams, 'd', DEFAULT_PARAMS.diameter),
      wallThickness: numberParam(searchParams, 'w', DEFAULT_PARAMS.wallThickness),
      height: numberParam(searchParams, 'h', DEFAULT_PARAMS.height),
      topOpen: searchParams.get('top') === 'open',
      bottomOpen: searchParams.get('bottom') === 'open',
      holeDiameter: numberParam(searchParams, 'hole', DEFAULT_PARAMS.holeDiameter),
      holeFace: searchParams.get('face') === 'bottom' ? 'bottom' : 'top',
    }),
  }
}

function buildPreviewUrl(params: CylinderParams, showDimensions: boolean) {
  const url = new URL(window.location.href)
  const safeParams = sanitizeParams(params)

  url.search = ''
  url.searchParams.set('preview', '1')
  url.searchParams.set('d', safeParams.diameter.toFixed(1))
  url.searchParams.set('w', safeParams.wallThickness.toFixed(1))
  url.searchParams.set('h', safeParams.height.toFixed(1))
  url.searchParams.set('top', safeParams.topOpen ? 'open' : 'closed')
  url.searchParams.set('bottom', safeParams.bottomOpen ? 'open' : 'closed')
  url.searchParams.set('hole', safeParams.holeDiameter.toFixed(1))
  url.searchParams.set('face', safeParams.holeFace)
  url.searchParams.set('dims', showDimensions ? '1' : '0')

  return url.toString()
}

export default function App() {
  const initialPreview = paramsFromUrl()
  const [params, setParams] = useState<CylinderParams>(initialPreview.params)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [showDimensions, setShowDimensions] = useState(initialPreview.showDimensions)
  const [shareStatus, setShareStatus] = useState('')
  const readOnly = initialPreview.readOnly
  const modelRef = useRef<THREE.Group>(null)

  const sceneHeight = params.height * CM_TO_SCENE_UNIT
  const sceneDiameter = params.diameter * CM_TO_SCENE_UNIT
  const shadowY = -(sceneHeight / 2 + 0.02)
  const shadowScale = Math.max(7, sceneDiameter * 2.1)

  const handleShare = async () => {
    const previewUrl = buildPreviewUrl(params, showDimensions)

    try {
      await navigator.clipboard.writeText(previewUrl)
      setShareStatus('Copied')
    } catch {
      window.prompt('Preview link', previewUrl)
      setShareStatus('Ready')
    }

    window.setTimeout(() => setShareStatus(''), 1800)
  }

  const handleExport = (format: 'stl' | 'obj') => {
    if (!modelRef.current) return

    let data: string | Uint8Array
    let filename = `cylinder-${params.diameter}x${params.height}`
    let mimeType = 'text/plain'

    if (format === 'stl') {
      const exporter = new STLExporter()
      data = exporter.parse(modelRef.current, { binary: true })
      filename += '.stl'
      mimeType = 'application/octet-stream'
    } else {
      const exporter = new OBJExporter()
      data = exporter.parse(modelRef.current)
      filename += '.obj'
      mimeType = 'text/plain'
    }

    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`app-shell${controlsVisible ? '' : ' controls-hidden'}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [3.4, 2.4, 3.4], fov: 42 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.68,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Night HDR as background — dark enough to preserve the navy mood */}
        <Environment preset="night" background backgroundBlurriness={0.05} />

        {/* Key light — dominant, warm, casts shadows */}
        <directionalLight
          castShadow
          position={[5, 8, 3]}
          intensity={2.4}
          color="#fff4e8"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={30}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
          shadow-bias={-0.0004}
        />
        {/* Cool rim light from behind-left — separates the form from the background */}
        <directionalLight position={[-5, 3, -4]} intensity={0.45} color="#7090ff" />
        {/* Very faint warm bounce from below */}
        <directionalLight position={[0, -4, 3]} intensity={0.08} color="#ffc890" />
        {/* Near-zero ambient so shadows are actually dark */}
        <ambientLight intensity={0.03} />

        <HollowCylinder ref={modelRef} params={params} showDimensions={showDimensions} />

        <ContactShadows
          position={[0, shadowY, 0]}
          opacity={0.70}
          scale={shadowScale}
          blur={3.0}
          far={2.5}
          color="#000018"
          frames={1}
        />

        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={9}
          minPolarAngle={0.08}
          maxPolarAngle={Math.PI * 0.86}
          enableDamping
          dampingFactor={0.07}
          rotateSpeed={0.75}
        />
      </Canvas>

      <div className="app-toolbar">
        <button
          type="button"
          className="ctrl-mobile-toggle"
          aria-expanded={controlsVisible}
          onClick={() => setControlsVisible(visible => !visible)}
        >
          {controlsVisible ? 'Hide Controls' : 'Show Controls'}
        </button>

        {!readOnly && (
          <button
            type="button"
            className="ctrl-share-icon"
            aria-label={shareStatus || 'Copy preview link'}
            title={shareStatus || 'Copy preview link'}
            onClick={handleShare}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
            </svg>
          </button>
        )}
      </div>

      <Controls
        params={params}
        onChange={setParams}
        mobileHidden={!controlsVisible}
        readOnly={readOnly}
        showDimensions={showDimensions}
        onToggleDimensions={() => setShowDimensions(visible => !visible)}
        onExport={handleExport}
      />
    </div>
  )
}
