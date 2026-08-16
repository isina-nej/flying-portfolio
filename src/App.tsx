import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Cloud, Clouds, Html, Sky, Stars } from '@react-three/drei'
import * as THREE from 'three'

type Project = {
  title: string
  kind: string
  description: string
  color: string
  position: [number, number, number]
}

const projects: Project[] = [
  { title: 'Tide UI', kind: 'PRODUCT DESIGN', description: 'سیستم طراحی برای تجربه‌های دیجیتال سریع.', color: '#f4a261', position: [-14, 5, -22] },
  { title: 'Nava', kind: 'WEB APP', description: 'داشبورد زنده برای تصمیم‌های ساده از داده پیچیده.', color: '#76c893', position: [2, 7, -36] },
  { title: 'Moj', kind: 'EXPERIMENT', description: 'آزمایشگاه رابط‌هایی که حرکت می‌کنند.', color: '#7bdff2', position: [18, 5, -16] },
  { title: 'Shabnam', kind: 'MOBILE', description: 'تجربه لمسی برای دستگاه‌های همراه.', color: '#ffafcc', position: [-22, 8, -40] },
  { title: 'Caspian', kind: 'PLATFORM', description: 'پلتفرم مدیریت کار برای تیم‌های کوچک.', color: '#bdb2ff', position: [24, 9, -44] },
]

const eulerLook = new THREE.Euler(0, 0, 0, 'YXZ')

function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
}

function FlightController({
  flying,
  setFlying,
}: {
  flying: boolean
  setFlying: Dispatch<SetStateAction<boolean>>
}) {
  const { camera, gl } = useThree()
  const velocity = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const pitch = useRef(-0.12)
  const thrust = useRef(0)
  const touch = useRef<{ id: number; x: number; y: number } | null>(null)
  const dir = useRef(new THREE.Vector3())
  const flyingRef = useRef(flying)
  flyingRef.current = flying

  useEffect(() => {
    const canvas = gl.domElement
    const start = () => {
      if (!flyingRef.current) {
        flyingRef.current = true
        setFlying(true)
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      start()
      thrust.current += e.deltaY * 0.018
      thrust.current = THREE.MathUtils.clamp(thrust.current, -28, 36)
    }

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return
      start()
      touch.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
      if (!isTouchDevice()) {
        canvas.requestPointerLock?.()
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (document.pointerLockElement === canvas) {
        yaw.current -= e.movementX * 0.0024
        pitch.current -= e.movementY * 0.0024
        pitch.current = Math.max(-1.15, Math.min(1.15, pitch.current))
        return
      }
      if (!touch.current || touch.current.id !== e.pointerId) return
      const dx = e.clientX - touch.current.x
      const dy = e.clientY - touch.current.y
      touch.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
      yaw.current -= dx * 0.005
      pitch.current -= dy * 0.004
      pitch.current = Math.max(-1.15, Math.min(1.15, pitch.current))
      // vertical drag also flies a little so one-finger scroll works on phones
      thrust.current += dy * 0.08
      thrust.current = THREE.MathUtils.clamp(thrust.current, -28, 36)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (touch.current?.id === e.pointerId) touch.current = null
    }

    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      yaw.current -= e.movementX * 0.0024
      pitch.current -= e.movementY * 0.0024
      pitch.current = Math.max(-1.15, Math.min(1.15, pitch.current))
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    document.addEventListener('mousemove', onMouse)
    return () => {
      window.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      document.removeEventListener('mousemove', onMouse)
    }
  }, [gl, setFlying])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    eulerLook.set(pitch.current, yaw.current, 0)
    dir.current.set(0, 0, -1).applyEuler(eulerLook)
    const target = dir.current.multiplyScalar(thrust.current * dt)
    velocity.current.lerp(target, 1 - Math.exp(-8 * dt))
    camera.position.add(velocity.current)
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -80, 80)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -80, 80)
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.4, 42)
    camera.quaternion.setFromEuler(eulerLook)
    thrust.current *= Math.exp(-2.2 * dt)
  })

  return null
}

function Ocean() {
  const meshRef = useRef<THREE.Mesh>(null)
  const segs = typeof window !== 'undefined' && window.innerWidth < 700 ? 48 : 96
  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const geo = mesh.geometry as THREE.PlaneGeometry
    const pos = geo.attributes.position
    const t = clock.elapsedTime
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z =
        Math.sin(x * 0.12 + t * 1.1) * 0.55 +
        Math.sin(y * 0.09 + t * 0.7) * 0.4 +
        Math.sin((x + y) * 0.05 + t * 0.35) * 0.7
      pos.setZ(i, z)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[220, 220, segs, segs]} />
      <meshPhysicalMaterial
        color="#0c6a7a"
        roughness={0.12}
        metalness={0.35}
        iridescence={0.3}
        iridescenceIOR={1.3}
        clearcoat={0.6}
        clearcoatRoughness={0.25}
      />
    </mesh>
  )
}

function Island({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={[position[0], 0.2, position[2]]}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <icosahedronGeometry args={[2.4, 0]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.85} />
      </mesh>
      <mesh position={[0.8, 0.15, 0.6]} castShadow>
        <icosahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color="#40916c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 3.2, 8]} />
        <meshStandardMaterial color="#d8f3dc" />
      </mesh>
      <mesh position={[0, 4.2, 0]} castShadow>
        <boxGeometry args={[3.2, 2.1, 0.18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} roughness={0.35} metalness={0.15} />
      </mesh>
    </group>
  )
}

function ProjectBeacon({ project }: { project: Project }) {
  const ringRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ringRef.current) return
    ringRef.current.rotation.y = clock.elapsedTime * 0.5
    ringRef.current.position.y = 4.2 + Math.sin(clock.elapsedTime * 1.4) * 0.12
  })
  return (
    <group position={project.position}>
      <Island position={[0, 0, 0]} color={project.color} />
      <mesh ref={ringRef} position={[0, 4.2, 0]}>
        <torusGeometry args={[2.1, 0.04, 12, 64]} />
        <meshBasicMaterial color={project.color} />
      </mesh>
      <pointLight color={project.color} intensity={2} distance={14} position={[0, 5, 1]} />
      <Html center distanceFactor={14} position={[0, 6.4, 0]} occlude={false}>
        <div className="beacon-label">{project.title}</div>
      </Html>
    </group>
  )
}

function Experience({ flying, setFlying }: { flying: boolean; setFlying: Dispatch<SetStateAction<boolean>> }) {
  return (
    <>
      <color attach="background" args={['#9ad4e0']} />
      <fog attach="fog" args={['#9ad4e0', 28, 110]} />
      <hemisphereLight args={['#fff1c9', '#1b4965', 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[28, 42, 18]}
        intensity={2.4}
        color="#fff3c4"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <Sky sunPosition={[28, 18, 18]} turbidity={2.2} rayleigh={0.55} mieCoefficient={0.006} mieDirectionalG={0.8} />
      <Stars radius={160} depth={40} count={500} factor={2} fade speed={0.4} />
      <Clouds material={THREE.MeshLambertMaterial}>
        <Cloud position={[-18, 18, -30]} bounds={[18, 4, 8]} volume={12} color="#ffffff" opacity={0.45} speed={0.15} />
        <Cloud position={[22, 16, -48]} bounds={[16, 3, 8]} volume={10} color="#e8f6ff" opacity={0.4} speed={0.12} />
        <Cloud position={[0, 20, -70]} bounds={[24, 4, 10]} volume={14} color="#ffffff" opacity={0.35} speed={0.1} />
      </Clouds>
      <Ocean />
      {projects.map((project) => (
        <ProjectBeacon key={project.title} project={project} />
      ))}
      <FlightController flying={flying} setFlying={setFlying} />
    </>
  )
}

export default function App() {
  const [flying, setFlying] = useState(false)
  const [selected, setSelected] = useState<Project | null>(null)

  return (
    <main>
      <Canvas
        shadows
        camera={{ position: [0, 8, 16], fov: 68, near: 0.1, far: 250 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Experience flying={flying} setFlying={setFlying} />
      </Canvas>

      <header className="hud topbar">
        <span className="mark">≈</span>
        <span>ARASH / CREATIVE DEVELOPER</span>
        <span className="status">
          <i /> {flying ? 'FLYING' : 'READY'}
        </span>
      </header>

      {!flying && (
        <section className="hud intro">
          <p className="eyebrow">OCEAN STUDIO</p>
          <h1>
            پرتفولیو را
            <br />
            <em>پرواز کن.</em>
          </h1>
          <p className="lead">اسکرول کن تا جلو بروی. روی صفحه بکش تا نگاه بچرخد. فقط با اسکرول پرواز می‌کنی.</p>
        </section>
      )}

      <div className="hud hint">
        <div>
          <strong>اسکرول</strong>
          <span>پرواز جلو / عقب</span>
        </div>
        <div>
          <strong>کشیدن</strong>
          <span>چرخش نگاه</span>
        </div>
      </div>

      {selected && (
        <aside className="hud project-card">
          <button type="button" className="close" onClick={() => setSelected(null)} aria-label="بستن">
            ×
          </button>
          <p className="eyebrow">{selected.kind}</p>
          <h2>{selected.title}</h2>
          <p>{selected.description}</p>
        </aside>
      )}

      <footer className="hud" id="contact">
        <span>۵ جزیره در افق</span>
        <span>تهران · ایران</span>
        <a href="mailto:hello@example.com">hello@example.com</a>
      </footer>
    </main>
  )
}
