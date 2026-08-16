import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import * as THREE from 'three'

type Project = { title: string; kind: string; description: string; color: string; position: [number, number, number] }

const projects: Project[] = [
  { title: 'Tide UI', kind: 'PRODUCT DESIGN', description: 'یک سیستم طراحی برای تجربه‌های دیجیتال سریع و انسانی.', color: '#f4a261', position: [-10, 4, -16] },
  { title: 'Nava', kind: 'WEB APP', description: 'داشبوردی زنده برای تبدیل داده‌های پیچیده به تصمیم‌های ساده.', color: '#76c893', position: [4, 6, -28] },
  { title: 'Moj', kind: 'EXPERIMENT', description: 'آزمایشگاهی برای ساختن رابط‌هایی که حرکت می‌کنند.', color: '#90dbf4', position: [18, 4, -10] },
  { title: 'Tide UI 2', kind: 'PRODUCT DESIGN', description: 'تجربه‌های لمسی برای دستگاه‌های همراه.', color: '#ffafcc', position: [-18, 7, -30] },
  { title: 'Caspian', kind: 'WEB APP', description: 'پلتفرم مدیریت پروژه برای تیم‌های کوچک.', color: '#bdb2ff', position: [22, 9, -36] },
]

const speed = { base: 0.18, sprint: 0.45 }
const bounds = 60

function FlightController() {
  const { camera } = useThree()
  const keys = useRef({ forward: false, back: false, left: false, right: false, up: false, down: false, sprint: false })
  const velocity = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const pitch = useRef(0)
  const tmp = useRef(new THREE.Vector3())
  const forwardVec = useRef(new THREE.Vector3())
  const rightVec = useRef(new THREE.Vector3())

  useEffect(() => {
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.current.forward = down; break
        case 'KeyS': case 'ArrowDown': keys.current.back = down; break
        case 'KeyA': case 'ArrowLeft': keys.current.left = down; break
        case 'KeyD': case 'ArrowRight': keys.current.right = down; break
        case 'Space': keys.current.up = down; break
        case 'ShiftLeft': case 'ShiftRight': keys.current.sprint = down; break
        case 'ControlLeft': case 'ControlRight': keys.current.down = down; break
      }
    }
    const onMouse = (e: MouseEvent) => {
      yaw.current -= e.movementX * 0.0022
      pitch.current -= e.movementY * 0.0022
      pitch.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch.current))
    }
    const kd = onKey(true), ku = onKey(false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('mousemove', onMouse)
    camera.position.set(0, 6, 10)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('mousemove', onMouse) }
  }, [camera])

  useFrame((_, delta) => {
    const k = keys.current
    const move = (k.sprint ? speed.sprint : speed.base) * delta * 60
    forwardVec.current.set(0, 0, -1).applyEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
    rightVec.current.set(1, 0, 0).applyEuler(new THREE.Euler(0, yaw.current, 0, 'YXZ'))
    const target = tmp.current.set(0, 0, 0)
    if (k.forward) target.add(forwardVec.current)
    if (k.back) target.sub(forwardVec.current)
    if (k.right) target.add(rightVec.current)
    if (k.left) target.sub(rightVec.current)
    if (k.up) target.y += 1
    if (k.down) target.y -= 1
    if (target.lengthSq() > 0) target.normalize().multiplyScalar(move)
    velocity.current.lerp(target, 0.18)
    camera.position.add(velocity.current)
    camera.position.x = Math.max(-bounds, Math.min(bounds, camera.position.x))
    camera.position.z = Math.max(-bounds, Math.min(bounds, camera.position.z))
    camera.position.y = Math.max(1, Math.min(40, camera.position.y))
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
  })
  return null
}

function Ocean() {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    meshRef.current.position.y = -1.6 + Math.sin(t * 0.3) * 0.15
  })
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, -30]} receiveShadow>
      <planeGeometry args={[160, 160, 80, 80]} />
      <meshStandardMaterial color="#0a4a5c" roughness={0.4} metalness={0.5} />
    </mesh>
  )
}

function ProjectBeacon({ project }: { project: Project }) {
  const ringRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = clock.elapsedTime * 0.4
      ringRef.current.position.y = -0.6 + Math.sin(clock.elapsedTime * 1.2) * 0.15
    }
  })
  return (
    <group position={project.position}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2, 0.4]} />
        <meshStandardMaterial color={project.color} emissive={project.color} emissiveIntensity={0.25} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh ref={ringRef} position={[0, -0.6, 0]}>
        <torusGeometry args={[1.8, 0.05, 12, 64]} />
        <meshBasicMaterial color={project.color} />
      </mesh>
      <pointLight color={project.color} intensity={1.4} distance={8} position={[0, 1, 1]} />
    </group>
  )
}

function App() {
  const [hasInteracted, setHasInteracted] = useState(false)
  useEffect(() => {
    const onAnyKey = () => { if (!hasInteracted) setHasInteracted(true) }
    window.addEventListener('keydown', onAnyKey)
    return () => window.removeEventListener('keydown', onAnyKey)
  }, [hasInteracted])
  return <main>
    <Canvas shadows camera={{ position: [0, 6, 10], fov: 70 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#bce6f0']} />
      <hemisphereLight args={['#fff5d6', '#1a4f63', 0.8]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[20, 30, 10]} intensity={2.2} color="#fff5d6" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Sky sunPosition={[20, 30, 10]} turbidity={0.4} rayleigh={0.8} />
      <Stars radius={120} depth={30} count={600} factor={1.4} fade />
      <Ocean />
      {projects.map((project) => <ProjectBeacon key={project.title} project={project} />)}
      <FlightController />
    </Canvas>
    <header className="topbar"><span className="mark">≈</span><span>ARASH / CREATIVE DEVELOPER</span><span className="status"><i /> ONLINE</span></header>
    <section className="intro">
      <p className="eyebrow">WELCOME ABOARD</p>
      <h1>پرتفولیو را<br /><em>پرواز کن.</em></h1>
      <p className="lead">اینجا صفحه‌ها اسکرول نمی‌شوند.<br />با ماوس و کلیدها در کارهای من پرواز کن.</p>
      <p className="instruction">{hasInteracted ? 'در حال پرواز آزاد...' : 'برای شروع، یک کلید بزن.'}</p>
    </section>
    <div className="hint">
      <div><strong>W A S D</strong><span>حرکت</span></div>
      <div><strong>Space</strong><span>بالا</span></div>
      <div><strong>Ctrl</strong><span>پایین</span></div>
      <div><strong>Shift</strong><span>سرعت</span></div>
      <div><strong>ماوس</strong><span>نگاه کردن</span></div>
    </div>
    <footer id="contact"><span>۵ پروژه در افق</span><span>تهران · ایران</span><a href="mailto:hello@example.com">hello@example.com</a></footer>
  </main>
}

export default App