import { useState, type ComponentProps } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei'
import { EffectComposer, SSAO } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import HollowCylinder from './HollowCylinder'
import Controls from './Controls'

export interface CylinderParams {
  wallThickness: number
  height: number
  topOpen: boolean
  bottomOpen: boolean
  holeDiameter: number
  holeFace: 'top' | 'bottom'
}

const DEFAULT_PARAMS: CylinderParams = {
  wallThickness: 0.18,
  height: 1.8,
  topOpen: false,
  bottomOpen: false,
  holeDiameter: 0,
  holeFace: 'top',
}

const ssaoProps = {
  blendFunction: BlendFunction.MULTIPLY,
  samples: 24,
  radius: 0.06,
  intensity: 14,
  luminanceInfluence: 0.4,
  bias: 0.025,
} as ComponentProps<typeof SSAO>

export default function App() {
  const [params, setParams] = useState<CylinderParams>(DEFAULT_PARAMS)

  const shadowY = -(params.height / 2 + 0.02)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
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

        <HollowCylinder params={params} />

        <ContactShadows
          position={[0, shadowY, 0]}
          opacity={0.70}
          scale={7}
          blur={3.0}
          far={2.5}
          color="#000018"
          frames={1}
        />

        <EffectComposer>
          <SSAO {...ssaoProps} />
        </EffectComposer>

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

      <Controls params={params} onChange={setParams} />
    </div>
  )
}
