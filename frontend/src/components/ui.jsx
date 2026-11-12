import { useState, useEffect } from 'react'
import { motion, animate, useMotionValue, useTransform } from 'framer-motion'
import { item } from '../lib/motion'

export const Card = ({ className = '', children }) => (
  <motion.div variants={item} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} whileHover={{ y: -4 }} className={`card ${className}`}>{children}</motion.div>
)
export function CountUp({ value, decimals = 0, prefix = '', suffix = '' }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => prefix + Number(v).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix)
  useEffect(() => { const c = animate(mv, value, { duration: 1.2, ease: 'easeOut' }); return () => c.stop() }, [value, mv])
  return <motion.span>{text}</motion.span>
}
export const Title = ({ icon: Icon, children }) => <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><Icon size={20} className="text-pod" />{children}</h3>

export function Stat({ label, value, num, decimals, prefix, suffix, tone = 'text-monsoon', note }) {
  return <Card className="!p-5"><p className="text-sm text-soil/70">{label}</p><p className={`mt-1 font-display text-3xl font-bold ${tone}`}>{num !== undefined ? <CountUp value={num} decimals={decimals} prefix={prefix} suffix={suffix} /> : value}</p>{note && <p className="mt-1 text-xs text-soil/60">{note}</p>}</Card>
}
export function Slider({ icon: Icon, label, unit, value, min, max, step = 1, onChange }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-sm font-medium"><span className="flex items-center gap-2"><Icon size={16} className="text-pod" />{label}</span><span className="font-display text-base text-monsoon">{value} {unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  )
}
export function Gauge({ pct, color, label }) {
  const len = 157, v = (Math.min(100, Math.max(0, pct)) / 100) * len
  return (
    <svg viewBox="0 0 120 72" className="w-full max-w-[240px]" role="img" aria-label={`${label}: ${pct.toFixed(0)} percent`}>
      <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="#E3EADF" strokeWidth="12" strokeLinecap="round" />
      <motion.path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={len} initial={{ strokeDashoffset: len }} animate={{ strokeDashoffset: len - v }} transition={{ duration: 1, ease: 'easeOut' }} />
      <text x="60" y="52" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1E3A4C">{pct.toFixed(0)}%</text>
      <text x="60" y="68" textAnchor="middle" fontSize="7" fill="#2A2019">{label}</text>
    </svg>
  )
}
export function useSaved(key, init) {
  const [v, setV] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init } catch { return init } })
  const set = (n) => { setV(n); try { localStorage.setItem(key, JSON.stringify(n)) } catch { /* storage unavailable */ } }
  return [v, set]
}
export function Checklist({ id, items }) {
  const [done, setDone] = useSaved('soy-' + id, [])
  const toggle = (i) => setDone(done.includes(i) ? done.filter((x) => x !== i) : [...done, i])
  const pct = Math.round((done.length / items.length) * 100)
  return (
    <div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-mist"><motion.div className="h-full bg-pod" animate={{ width: `${pct}%` }} /></div>
      <ul className="space-y-2">{items.map((t, i) => (
        <li key={t}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4 accent-pod" checked={done.includes(i)} onChange={() => toggle(i)} /><span className={done.includes(i) ? 'text-soil/50 line-through' : ''}>{t}</span></label></li>
      ))}</ul>
    </div>
  )
}
