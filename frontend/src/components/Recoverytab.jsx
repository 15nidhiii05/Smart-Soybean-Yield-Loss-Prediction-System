import { LifeBuoy } from 'lucide-react'
import { RECOVERY } from '../lib/data'
import { Card, Title, Checklist } from './ui'

export default function RecoveryTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-pod to-monsoon p-6 text-white shadow-lg">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold !text-white"><LifeBuoy />Recovery plan after crop loss</h2>
        <p className="mt-1 text-white/85">Four phases from the first three days to the next season. Your ticks are saved on this device.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {RECOVERY.map(([t, items], i) => <Card key={t}><Title icon={LifeBuoy}>{t}</Title><Checklist id={`rec${i}`} items={items} /></Card>)}
      </div>
    </div>
  )
}