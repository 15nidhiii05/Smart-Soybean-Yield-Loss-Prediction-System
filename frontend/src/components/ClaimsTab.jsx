import { motion } from 'framer-motion'
import { container, item } from '../lib/motion'
import { ShieldCheck, FileText, Phone, ListChecks, HandCoins, AlertTriangle } from 'lucide-react'
import { PMFBY_COVERS, CLAIM_STEPS, DOCS, OTHER_RELIEF } from '../lib/data'
import { Card, Title, Checklist } from './ui'

const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN')

export default function ClaimsTab({ res, f, goRecovery }) {
  return (
    <div className="space-y-6">
      {res && (
        <div className="rounded-3xl bg-gradient-to-r from-monsoon to-pod p-6 text-white shadow-lg">
          <p className="text-sm text-white/80">Your latest estimate</p>
          <p className="font-display text-2xl font-extrabold">{res.lossPct.toFixed(1)}% yield loss · about {inr(res.lossInr)} at risk · {f.area} ha in {f.district}</p>
          <p className="mt-2 text-sm text-white/80">This is a model estimate. Insurance pays on notified-area yield or assessed damage, so the real payout can differ.</p>
        </div>
      )}
      <Card>
        <Title icon={ShieldCheck}>What PMFBY covers</Title>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{PMFBY_COVERS.map(([t, d]) => <div key={t} className="rounded-2xl bg-mist p-4"><p className="font-bold">{t}</p><p className="mt-1 text-sm">{d}</p></div>)}</div>
      </Card>
      <Card>
        <Title icon={ListChecks}>Claim process, step by step</Title>
        <motion.ol variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-4">{CLAIM_STEPS.map(([t, d], i) => (
          <motion.li variants={item} key={t} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-monsoon font-display font-bold text-white">{i + 1}</span><div><p className="font-bold">{t}</p><p className="text-sm">{d}</p></div></motion.li>
        ))}</motion.ol>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><Title icon={FileText}>Documents checklist</Title><Checklist id="docs" items={DOCS} /></Card>
        <Card>
          <Title icon={Phone}>Call for help</Title>
          <div className="flex flex-wrap gap-3">
            <a href="tel:14447" className="rounded-2xl bg-monsoon px-5 py-3 font-bold text-white hover:bg-pod">Crop insurance 14447</a>
            <a href="tel:18001801551" className="rounded-2xl bg-sprout px-5 py-3 font-bold text-soil hover:bg-straw">Kisan Call Centre 1800-180-1551</a>
          </div>
          <p className="mt-3 text-xs text-soil/60">Confirm numbers, dates and premium rates on pmfby.gov.in. They can change each season.</p>
          <button onClick={goRecovery} className="mt-4 rounded-full border-2 border-pod px-5 py-2 font-bold text-pod hover:bg-pod hover:text-white">Go to recovery plan</button>
        </Card>
      </div>
      <Card>
        <Title icon={HandCoins}>Other relief and support beyond insurance</Title>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{OTHER_RELIEF.map(([t, d]) => <div key={t} className="rounded-2xl bg-mist p-4"><p className="font-bold">{t}</p><p className="mt-1 text-sm">{d}</p></div>)}</div>
        <p className="mt-3 flex items-center gap-2 text-xs text-soil/60"><AlertTriangle size={14} />Scheme rules vary by year and district. Verify with your Agriculture Officer or bank.</p>
      </Card>
    </div>
  )
}