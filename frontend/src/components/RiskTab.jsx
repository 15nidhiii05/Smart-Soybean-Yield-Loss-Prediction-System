import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CloudRain, Thermometer, Flame, MapPin, Loader2, AlertTriangle, Lightbulb, ShieldCheck, Clock, Wrench } from 'lucide-react'
import { predictYield, getOptions, getMeta, explain } from '../services/api'
import { REGIONS, SOILS, SOIL_NOTE, STAGES } from '../lib/data'
import { stageRisks, severity, reasons, GENERAL_FIXES } from '../lib/analysis'
import { Card, Title, Stat, Slider, Gauge } from './ui'

const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN')
const normalise = (d) => ({
  yield: d.predicted_yield_tha ?? d.predicted_yield ?? 0,
  lo: d.predicted_yield_low ?? null,
  hi: d.predicted_yield_high ?? null,
  ref: d.reference_yield_tha ?? null,
  refSource: d.reference_source ?? '',
  production: d.predicted_production ?? d.predicted_production_tonnes ?? 0,
  lossPct: d.yield_loss_pct ?? 0,
  lossInr: d.gross_revenue_loss_inr ?? 0,
  lossBest: d.revenue_loss_best_inr ?? 0,
  lossWorst: d.revenue_loss_worst_inr ?? 0,
  coverage: d.interval?.test_coverage ?? 0,
  stageImpact: d.stage_impact ?? null,
  warnings: [...(d.warnings || []), ...(d._v1 ? ['Using the original model because v2 is not ready, so there is no range or per-stage analysis.'] : [])],
  xai: d.xai ?? d.shap_values ?? d.explanation ?? [],
})

function StageImpact({ impact }) {
  const rows = STAGES.map((s) => ({ ...s, v: impact[s.id] ?? 0 }))
  const max = Math.max(0.05, ...rows.map((r) => Math.abs(r.v)))
  const worst = [...rows].sort((a, b) => a.v - b.v).filter((r) => r.v < -0.01).slice(0, 2)
  return (
    <Card>
      <Title icon={Clock}>When the loss happens, stage by stage</Title>
      <p className="mb-4 text-sm text-soil/70">From your trained model: how much each stage's weather moved the yield (t/ha). Red lowered it, green raised it.</p>
      <div className="space-y-3">{rows.map((r) => (
        <div key={r.id}>
          <div className="flex justify-between text-sm"><span className="font-medium">{r.name} <span className="text-soil/60">({r.period})</span></span><span className="font-bold" style={{ color: r.v < 0 ? '#B8512E' : '#5E9B3A' }}>{r.v > 0 ? '+' : ''}{r.v.toFixed(3)}</span></div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-mist"><motion.div className="h-full rounded-full" style={{ background: r.v < 0 ? '#B8512E' : '#5E9B3A' }} initial={{ width: 0 }} animate={{ width: `${(Math.abs(r.v) / max) * 100}%` }} transition={{ duration: 0.8 }} /></div>
        </div>
      ))}</div>
      {worst.map((r) => <p key={r.id} className="mt-3 rounded-xl bg-mist p-3 text-sm"><b>{r.name}:</b> {r.what}<br /><b>Direction:</b> {r.act}</p>)}
    </Card>
  )
}

function Field({ ratio }) {
  const r = Math.max(0.15, Math.min(ratio, 1.3)), ok = ratio >= 0.9
  return (
    <svg viewBox="0 0 360 170" className="w-full" role="img" aria-label={`Field health ${Math.round(ratio * 100)} percent of reference yield`}>
      {Array.from({ length: 24 }).map((_, i) => {
        const h = (30 + ((i * 37) % 22)) * r + 14, x = 14 + i * 14.5
        return (
          <motion.g key={i} initial={{ scaleY: 0.1 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.025, type: 'spring', stiffness: 90, damping: 14 }} style={{ originY: '150px', originX: `${x}px` }}>
            <line x1={x} y1="150" x2={x} y2={150 - h} stroke={ok ? '#5E9B3A' : '#B8512E'} strokeWidth="3" strokeLinecap="round" />
            <ellipse cx={x - 5} cy={150 - h * 0.6} rx="5" ry="2.6" fill={ok ? '#B7D96B' : '#E8D49B'} transform={`rotate(-30 ${x - 5} ${150 - h * 0.6})`} />
            <ellipse cx={x + 5} cy={150 - h * 0.8} rx="5" ry="2.6" fill={ok ? '#B7D96B' : '#E8D49B'} transform={`rotate(30 ${x + 5} ${150 - h * 0.8})`} />
            <circle cx={x} cy={150 - h} r="3.2" fill={ok ? '#2A2019' : '#8a6a3a'} />
          </motion.g>
        )
      })}
      <rect x="0" y="150" width="360" height="20" rx="4" fill="#2A2019" />
    </svg>
  )
}

export default function RiskTab({ f, setF, res, setRes, goClaims }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [known, setKnown] = useState(null)
  const [meta, setMeta] = useState(null)
  const [stage, setStage] = useState({})
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))
  const soil = SOILS[f.soilIdx]
  useEffect(() => { getMeta().then((m) => { setMeta(m); setKnown(m.districts.map((d) => d.toLowerCase())) }).catch(() => getOptions().then((o) => o.districts?.length && setKnown(o.districts.map((d) => d.toLowerCase()))).catch(() => {})) }, [])
  useEffect(() => { if (meta?.stage_features?.length) setStage(meta.stage_medians?.[f.district] || meta.stage_global_median || {}) }, [meta, f.district])
  const refAuto = meta ? (meta.reference_yields?.[f.district] ?? meta.global_reference) : null
  const untrained = known && !known.includes(f.district.toLowerCase())

  const run = async () => {
    setBusy(true); setErr('')
    try { setRes(normalise(await predictYield({ ...f, soil: soil[1], stage }))) } catch (e) { setErr(explain(e)) } finally { setBusy(false) }
  }
  const ratio = res ? res.yield / (res.ref || f.reference) : 1
  const sev = res ? severity(res.lossPct) : null
  const stages = res ? stageRisks(f, soil[1]) : []
  const top = [...stages].sort((a, b) => b.risk - a.risk).slice(0, 2)
  const why = res ? reasons(res.xai, f) : []
  const chart = (res?.xai ?? []).map((x) => ({ name: String(x.feature).replace(/_/g, ' '), v: +x.impact_tha }))
  const field = 'mt-1 w-full rounded-xl border border-monsoon/20 bg-mist p-2.5'

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      <Card className="h-fit space-y-5 lg:sticky lg:top-20">
        <h2 className="text-xl font-bold">Describe your farm</h2>
        <label className="block text-sm font-medium">District (all 36)
          <select value={f.district} onChange={(e) => set('district')(e.target.value)} className={field}>
            {Object.entries(REGIONS).map(([r, ds]) => <optgroup key={r} label={r}>{ds.map(([v, l]) => <option key={v} value={v}>{l || v}</option>)}</optgroup>)}
          </select>
        </label>
        {untrained && <p className="rounded-xl bg-straw/50 p-3 text-xs">This district is not in the model's training data, so the forecast is a rough estimate.</p>}
        <label className="block text-sm font-medium">Soil type
          <select value={f.soilIdx} onChange={(e) => set('soilIdx')(+e.target.value)} className={field}>{SOILS.map((s, i) => <option key={s[0]} value={i}>{s[0]}</option>)}</select>
        </label>
        <p className="rounded-xl bg-mist p-3 text-xs">{SOIL_NOTE[soil[1]]}{soil[2] && meta?.soil_check?.soil_in_data !== false && ` The model only knows "${soil[1]}", so this soil is approximated as that class. Add more soil classes to the training data for better accuracy.`}</p>
        {meta && meta.soil_check?.soil_in_data === false && <p className="rounded-xl bg-straw/50 p-3 text-xs">Your training data has no soil column, so soil does not change the forecast. It only drives the stage-risk and advice rules.</p>}
        <Slider icon={MapPin} label="Farm area (used for production and money only)" unit="ha" value={f.area} min={0.5} max={50} step={0.5} onChange={set('area')} />
        <Slider icon={CloudRain} label="Kharif rainfall (Jun–Oct)" unit="mm" value={f.rain} min={200} max={1600} step={10} onChange={set('rain')} />
        <Slider icon={Thermometer} label="Average max temperature" unit="°C" value={f.tmax} min={24} max={40} step={0.5} onChange={set('tmax')} />
        <Slider icon={Thermometer} label="Average min temperature" unit="°C" value={f.tmin} min={14} max={28} step={0.5} onChange={set('tmin')} />
        <Slider icon={Flame} label="Heat-stress days" unit="days" value={f.heat} min={0} max={60} onChange={set('heat')} />
        {meta?.stage_features?.length > 0 && (
          <details className="rounded-xl bg-mist p-3 text-sm">
            <summary className="cursor-pointer font-medium">Weather by crop stage (optional)</summary>
            <p className="mt-2 text-xs">Pre-filled with this district's typical values. Change them if you know your season.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">{meta.stage_features.map((k) => (
              <label key={k} className="text-xs">{k.replace(/_/g, ' ')}<input type="number" value={stage[k] ?? ''} onChange={(e) => setStage((p) => ({ ...p, [k]: +e.target.value }))} className={field} /></label>
            ))}</div>
          </details>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm font-medium">
          <div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-pod" checked={f.useOwnRef} onChange={(e) => set('useOwnRef')(e.target.checked)} />Use my own reference yield</label>
            {f.useOwnRef ? <input type="number" step="0.05" value={f.reference} onChange={(e) => set('reference')(+e.target.value)} className={field} />
              : <p className="mt-1 rounded-xl bg-mist p-2.5 text-xs">{refAuto ? `${refAuto.toFixed(2)} t/ha, district average of ${meta.reference_years[0]}–${meta.reference_years[meta.reference_years.length - 1]}` : 'Set automatically from history after the v2 model is trained'}</p>}
          </div>
          <label>Price per quintal (₹)<input type="number" value={f.price} onChange={(e) => set('price')(+e.target.value)} className={field} /></label>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={run} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-monsoon to-pod py-3.5 font-display text-lg font-bold text-white shadow-lg disabled:opacity-60">
          {busy ? <><Loader2 className="animate-spin" size={20} />Reading the season…</> : 'Predict my yield'}
        </motion.button>
        {err && <p role="alert" className="flex gap-2 break-words rounded-xl bg-rust/10 p-3 text-sm text-rust [overflow-wrap:anywhere]"><AlertTriangle size={18} className="shrink-0" />{err}</p>}
      </Card>

      <section className="space-y-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-sprout/40 via-white to-white p-6 shadow-lg ring-1 ring-monsoon/10">
          <p className="text-sm font-medium text-soil/70">{res ? `${f.district} · ${soil[0]} · Kharif season` : 'Your field at the reference yield'}</p>
          <Field ratio={ratio} />
          {!res && <p className="mt-2 font-display text-lg font-bold text-monsoon">Fill in your farm details and run a prediction.</p>}
        </div>

        {res && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid items-center gap-4 sm:grid-cols-[240px_1fr]">
              <Card className="flex flex-col items-center !p-4"><Gauge pct={res.lossPct} color={sev.c} label={`${sev.k} yield loss`} /></Card>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Predicted yield" num={res.yield} decimals={2} suffix=" t/ha" />
                <Stat label="Production" num={res.production} decimals={1} suffix=" t" note={`on ${f.area} ha`} />
                <Stat label="Revenue at risk" num={res.lossInr} prefix="₹" tone={res.lossInr > 0 ? 'text-rust' : 'text-pod'} note={`at ${inr(f.price)}/quintal`} />
              </div>
            </div>

            {(res.lo != null || res.warnings.length > 0) && (
              <Card className="!p-5">
                {res.lo != null && <>
                  <p className="text-sm text-soil/70">Likely yield range (80% interval)</p>
                  <p className="font-display text-2xl font-bold text-monsoon">{res.lo.toFixed(2)} to {res.hi.toFixed(2)} t/ha</p>
                  <p className="mt-1 text-sm">Revenue at risk between {inr(res.lossBest)} and {inr(res.lossWorst)}. Reference yield {res.ref.toFixed(2)} t/ha ({res.refSource}).</p>
                  <p className="mt-1 text-xs text-soil/60">A district-level estimate, not a guarantee for a single plot. On past test years, {Math.round(res.coverage * 100)}% of actual yields fell inside this kind of range.</p>
                </>}
                {res.warnings.map((w) => <p key={w} className="mt-2 rounded-xl bg-straw/60 p-2 text-xs">{w}</p>)}
              </Card>
            )}

            {res.lossPct >= 25 ? (
              <div className="rounded-3xl bg-gradient-to-r from-rust to-[#8c3a1f] p-6 text-white shadow-lg">
                <h3 className="flex items-center gap-2 text-xl font-bold !text-white"><AlertTriangle />{sev.k} loss: act now</h3>
                <p className="mt-1 text-white/90">You may lose about {inr(res.lossInr)}. Start your insurance claim and relief plan now. Report within 72 hours if damage came from hail, flood or unseasonal rain.</p>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goClaims} className="mt-4 rounded-full bg-white px-6 py-2.5 font-bold text-rust">Open claims & relief plan</motion.button>
              </div>
            ) : res.lossPct >= 10 && (
              <p className="flex items-center gap-2 rounded-2xl bg-straw/60 p-4"><ShieldCheck className="shrink-0 text-monsoon" />Moderate loss. Keep your insurance documents ready, and see the improvement steps below.</p>
            )}

            {res.stageImpact && <StageImpact impact={res.stageImpact} />}
            {!res.stageImpact && <Card>
              <Title icon={Clock}>When the loss happens, stage by stage</Title>
              <p className="mb-4 text-sm text-soil/70">Indicative risk from your rainfall, temperature, heat days and {soil[1]} soil. This is a rule-based guide, not a model output.</p>
              <div className="space-y-3">{stages.map((s) => {
                const c = severity(s.risk).c, hot = top.some((t) => t.id === s.id && t.risk >= 25)
                return (
                  <div key={s.id}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{s.name} <span className="text-soil/60">({s.period})</span></span><span className="font-bold" style={{ color: c }}>{s.risk}</span></div>
                    <div className="mt-1 h-3 overflow-hidden rounded-full bg-mist"><motion.div className="h-full rounded-full" style={{ background: c }} initial={{ width: 0 }} animate={{ width: `${s.risk}%` }} transition={{ duration: 0.8 }} /></div>
                    {hot && <p className="mt-2 rounded-xl bg-mist p-3 text-sm"><b>What happens:</b> {s.what}<br /><b>Direction:</b> {s.act}</p>}
                  </div>
                )
              })}</div>
            </Card>}

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <Title icon={AlertTriangle}>Why the yield dropped</Title>
                {why.length ? <ul className="space-y-3">{why.map((r) => <li key={r.feature}><p className="font-bold capitalize">{r.feature} <span className="text-rust">({r.impact.toFixed(2)} t/ha)</span></p><p className="text-sm">{r.why}</p></li>)}</ul> : <p className="text-sm">No single factor is pulling the yield down strongly.</p>}
              </Card>
              <Card>
                <Title icon={Wrench}>How to improve</Title>
                <ul className="space-y-3 text-sm">{why.map((r) => <li key={r.feature}><b className="capitalize">{r.feature}:</b> {r.fix}</li>)}</ul>
                <p className="mt-4 flex items-center gap-2 text-sm font-bold"><Lightbulb size={16} className="text-pod" />Good practice for every season</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{GENERAL_FIXES.map((g) => <li key={g}>{g}</li>)}</ul>
              </Card>
            </div>

            <Card>
              <Title icon={Lightbulb}>What moved your yield (model explanation)</Title>
              <p className="mb-3 text-sm text-soil/70">Green bars raised the prediction, red bars lowered it (tonnes per hectare).</p>
              <div style={{ height: Math.max(220, chart.length * 44) }}>
                <ResponsiveContainer><BarChart data={chart} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v > 0 ? '+' : ''}${(+v).toFixed(3)} t/ha`} /><ReferenceLine x={0} stroke="#2A2019" />
                  <Bar dataKey="v" radius={6}>{chart.map((c, i) => <Cell key={i} fill={c.v >= 0 ? '#5E9B3A' : '#B8512E'} />)}</Bar>
                </BarChart></ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        )}
      </section>
    </div>
  )
}