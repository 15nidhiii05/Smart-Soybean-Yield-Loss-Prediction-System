import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, Cell } from 'recharts'
import { Trophy, Loader2, TerminalSquare } from 'lucide-react'
import { getModelAnalysis, explain } from './services/api'

const COLORS = { r2: '#5E9B3A', rmse: '#1E3A4C', mae: '#B8512E' }

export default function Analysis() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [pick, setPick] = useState(null)

  useEffect(() => {
    getModelAnalysis().then((d) => { setData(d); setPick(d.models[0].name) }).catch((e) => setErr(e.response?.status === 404 ? 'missing' : explain(e)))
  }, [])

  if (err === 'missing') return (
    <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-monsoon/10">
      <h2 className="flex items-center gap-2 text-xl font-bold"><TerminalSquare className="text-pod" />Run the comparison once</h2>
      <p className="mt-2">The results file does not exist yet. From the project root run:</p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-soil p-4 text-sm text-sprout">python ml/src/models/compare_models.py</pre>
      <p className="mt-3 text-sm text-soil/70">Then refresh this tab.</p>
    </div>
  )
  if (err) return <p role="alert" className="rounded-xl bg-rust/10 p-4 text-rust">{err}</p>
  if (!data) return <p className="flex items-center gap-2"><Loader2 className="animate-spin" />Loading model results…</p>

  const models = [...data.models].sort((a, b) => b.r2 - a.r2)
  const best = models[0]
  const sel = models.find((m) => m.name === pick) || best
  const line = (sel.actual || []).map((a, i) => ({ i: i + 1, Actual: a, Predicted: sel.predicted[i] }))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-monsoon to-pod p-6 text-white shadow-lg">
        <p className="flex items-center gap-2 text-sm text-white/80"><Trophy size={18} className="text-straw" />Best on held-out years</p>
        <h2 className="mt-1 text-3xl font-extrabold !text-white">{best.name}</h2>
        <p className="mt-1 text-white/85">R² {best.r2.toFixed(3)} · RMSE {best.rmse.toFixed(3)} t/ha · MAE {best.mae.toFixed(3)} t/ha</p>
        <p className="mt-2 text-xs text-white/70">{models.length} algorithms, same features, same chronological 80/20 split ({data.train_rows} train rows, {data.test_rows} test rows).</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-monsoon/10">
          <h3 className="text-lg font-bold">Accuracy (R², higher is better)</h3>
          <div style={{ height: models.length * 38 + 40 }}>
            <ResponsiveContainer><BarChart data={models} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" domain={['auto', 1]} tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => (+v).toFixed(3)} />
              <Bar dataKey="r2" name="R²" radius={6}>{models.map((m, i) => <Cell key={m.name} fill={i === 0 ? COLORS.r2 : '#9DB8A0'} />)}</Bar>
            </BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-monsoon/10">
          <h3 className="text-lg font-bold">Error in t/ha (lower is better)</h3>
          <div style={{ height: models.length * 38 + 40 }}>
            <ResponsiveContainer><BarChart data={models} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => (+v).toFixed(3)} /><Legend />
              <Bar dataKey="rmse" name="RMSE" fill={COLORS.rmse} radius={4} /><Bar dataKey="mae" name="MAE" fill={COLORS.mae} radius={4} />
            </BarChart></ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-monsoon/10">
        <h3 className="text-lg font-bold">Actual vs predicted yield on test years</h3>
        <div className="my-3 flex flex-wrap gap-2">
          {models.map((m) => <button key={m.name} onClick={() => setPick(m.name)} aria-pressed={m.name === sel.name} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${m.name === sel.name ? 'bg-monsoon text-white' : 'bg-mist text-monsoon hover:bg-sprout/40'}`}>{m.name}</button>)}
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer><LineChart data={line} margin={{ right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="i" tick={{ fontSize: 12 }} label={{ value: 'Test sample', position: 'insideBottom', offset: -4 }} /><YAxis tick={{ fontSize: 12 }} unit=" t" />
            <Tooltip formatter={(v) => `${(+v).toFixed(2)} t/ha`} /><Legend />
            <Line dataKey="Actual" stroke="#2A2019" dot={false} strokeWidth={2} /><Line dataKey="Predicted" stroke="#5E9B3A" dot={false} strokeWidth={2} />
          </LineChart></ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-lg ring-1 ring-monsoon/10">
        <h3 className="mb-3 text-lg font-bold">Leaderboard</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-soil/60"><tr><th className="py-2">Algorithm</th><th>R²</th><th>RMSE</th><th>MAE</th><th>Train time</th></tr></thead>
          <tbody className="divide-y divide-monsoon/10">{models.map((m, i) => (
            <tr key={m.name} className={i === 0 ? 'font-bold text-pod' : ''}><td className="py-2">{m.name}</td><td>{m.r2.toFixed(3)}</td><td>{m.rmse.toFixed(3)}</td><td>{m.mae.toFixed(3)}</td><td>{m.train_seconds.toFixed(2)} s</td></tr>
          ))}</tbody>
        </table>
      </div>
    </motion.div>
  )
}