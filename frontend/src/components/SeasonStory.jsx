import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Play, Pause } from 'lucide-react'
import { STAGES, SOILS } from '../lib/data'
import { stageRisks, severity } from '../lib/analysis'

// One entry per stage: sky colour, sun position/size/colour, rain amount, crop growth (0-1), stem colour.
const SCENE = [
  { sky: '#A9BFCB', sx: 90, sy: 70, sr: 22, sc: '#F4E3A8', rain: 0.5, grow: 0.15, stem: '#7FB24A' },
  { sky: '#6F8FA3', sx: 180, sy: 60, sr: 18, sc: '#D8DDE0', rain: 1, grow: 0.5, stem: '#5E9B3A' },
  { sky: '#F2C879', sx: 300, sy: 40, sr: 34, sc: '#F08A24', rain: 0, grow: 0.75, stem: '#5E9B3A' },
  { sky: '#BCD3DC', sx: 420, sy: 55, sr: 22, sc: '#F7E7A1', rain: 0.3, grow: 1, stem: '#4F8A32' },
  { sky: '#E8C98D', sx: 520, sy: 85, sr: 26, sc: '#F4B860', rain: 0.15, grow: 0.95, stem: '#B8913A' },
]

export default function SeasonStory({ f, res }) {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(!reduce)
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setI((p) => (p + 1) % STAGES.length), 4500)
    return () => clearInterval(t)
  }, [playing])

  const soil = SOILS[f.soilIdx][1]
  const risks = stageRisks(f, soil)
  const s = STAGES[i], sc = SCENE[i], risk = risks[i].risk
  const sev = severity(risk)
  const shrink = res ? 1 - risk / 250 : 1 // plants look weaker in the stages where your risk is high

  return (
    <section id="season" className="mx-auto max-w-7xl px-5 pt-8" aria-label="Season story">
      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-monsoon/10 md:grid md:grid-cols-[1.5fr_1fr]">
        <div className="relative">
          <svg viewBox="0 0 600 260" className="block w-full" role="img" aria-label={`Animated field in the ${s.name} stage`}>
            <motion.rect width="600" height="260" animate={{ fill: sc.sky }} transition={{ duration: 1.2 }} />
            <motion.circle animate={{ cx: sc.sx, cy: sc.sy, r: sc.sr, fill: sc.sc }} transition={{ duration: 1.4, ease: 'easeInOut' }} />
            {i === 2 && <motion.circle cx={sc.sx} cy={sc.sy} fill="none" stroke="#F08A24" strokeWidth="2" initial={{ r: 34, opacity: 0.8 }} animate={{ r: 70, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.8 }} />}
            {[0, 1, 2].map((c) => (
              <motion.g key={c} animate={{ x: [-120, 700] }} transition={{ repeat: Infinity, duration: 38 + c * 12, ease: 'linear', delay: -c * 14 }}>
                <ellipse cx="0" cy={40 + c * 28} rx="46" ry="14" fill="#fff" opacity={i === 1 ? 0.85 : 0.55} />
                <ellipse cx="24" cy={34 + c * 28} rx="30" ry="12" fill="#fff" opacity={i === 1 ? 0.85 : 0.55} />
              </motion.g>
            ))}
            <motion.g animate={{ opacity: sc.rain }} transition={{ duration: 0.8 }}>
              {Array.from({ length: 28 }).map((_, k) => (
                <motion.line key={k} x1={20 + k * 21} x2={14 + k * 21} y1="0" y2="14" stroke="#EAF4FA" strokeWidth="1.6" strokeLinecap="round"
                  animate={{ y: [-20, 215] }} transition={{ repeat: Infinity, duration: 0.8 + (k % 5) * 0.12, delay: (k % 7) * 0.1, ease: 'linear' }} />
              ))}
            </motion.g>
            <rect y="215" width="600" height="45" fill="#2A2019" />
            <rect y="215" width="600" height="5" fill={soil === 'Black Cotton' ? '#3a2d22' : '#8c4a2c'} />
            {Array.from({ length: 10 }).map((_, k) => {
              const x = 40 + k * 58, h = (30 + (k * 13) % 14 + sc.grow * 110) * shrink
              return (
                <motion.g key={k} animate={{ scaleY: Math.max(0.1, sc.grow * shrink) }} initial={false} transition={{ duration: 1.2, type: 'spring', damping: 14 }} style={{ originX: `${x}px`, originY: '215px' }}>
                  <motion.line x1={x} x2={x} y1="215" y2={215 - 110} strokeWidth="5" strokeLinecap="round" animate={{ stroke: sc.stem }} />
                  <motion.ellipse cx={x - 12} cy={215 - 50} rx="14" ry="6" transform={`rotate(-25 ${x - 12} ${165})`} animate={{ fill: i === 4 ? '#D9B45B' : '#8DC15A' }} />
                  <motion.ellipse cx={x + 12} cy={215 - 75} rx="14" ry="6" transform={`rotate(25 ${x + 12} ${140})`} animate={{ fill: i === 4 ? '#D9B45B' : '#8DC15A' }} />
                  {i >= 3 && [0, 1, 2].map((p) => <circle key={p} cx={x + (p % 2 ? 6 : -6)} cy={215 - 30 - p * 16} r="4" fill={i === 4 ? '#8a6a3a' : '#6BA03A'} />)}
                </motion.g>
              )
            })}
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex gap-1 p-3">
            {STAGES.map((st, k) => <button key={st.id} onClick={() => { setI(k); setPlaying(false) }} aria-label={st.name} className="h-2 flex-1 overflow-hidden rounded-full bg-white/50"><motion.div className="h-full bg-monsoon" animate={{ width: k < i ? '100%' : k === i ? '100%' : '0%', opacity: k === i ? 1 : 0.5 }} /></button>)}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-pod">Season story · {s.period}</p>
            <h2 className="mt-1 text-2xl font-extrabold">{s.name}</h2>
            <p className="mt-2 text-sm">{s.what}</p>
            <p className="mt-2 rounded-xl bg-mist p-3 text-sm"><b>What to do:</b> {s.act}</p>
          </div>
          <div>
            <p className="rounded-xl p-3 text-sm font-bold text-white" style={{ background: res ? sev.c : '#1E3A4C' }}>
              {res ? `Your ${f.district} risk at this stage: ${risk}/100 (${sev.k})` : 'Run a prediction to see your own risk at each stage.'}
            </p>
            <button onClick={() => setPlaying(!playing)} className="mt-3 flex items-center gap-2 rounded-full bg-monsoon px-5 py-2 font-bold text-white hover:bg-pod">
              {playing ? <><Pause size={16} />Pause</> : <><Play size={16} />Play the season</>}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}