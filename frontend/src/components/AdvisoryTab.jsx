import { CalendarDays, Bug, Sprout, Droplets, TrendingUp, CloudRain, Phone } from 'lucide-react'
import { STAGES, PESTS, MANDI } from '../lib/data'
import { Card, Title } from './ui'

export default function AdvisoryTab() {
  return (
    <div className="space-y-6">
      <Card>
        <Title icon={CalendarDays}>Kharif crop calendar</Title>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">{STAGES.map((s) => <div key={s.id} className="rounded-2xl bg-mist p-4"><p className="text-xs font-bold text-pod">{s.period}</p><p className="font-bold">{s.name}</p><p className="mt-2 text-sm">{s.act}</p></div>)}</div>
      </Card>
      <Card className="overflow-x-auto">
        <Title icon={Bug}>Pests and diseases</Title>
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="text-soil/60"><tr><th className="py-2">Problem</th><th>When</th><th>Sign</th><th>What to do</th></tr></thead>
          <tbody className="divide-y divide-monsoon/10">{PESTS.map((p) => <tr key={p[0]}><td className="py-2 font-bold">{p[0]}</td><td>{p[1]}</td><td>{p[2]}</td><td>{p[3]}</td></tr>)}</tbody>
        </table>
        <p className="mt-3 text-xs text-soil/60">Use only products and doses recommended by your KVK or Agriculture Officer.</p>
      </Card>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <Title icon={Sprout}>Seed and nutrients</Title>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Use certified seed of a variety suited to your district (for example JS-335, JS-9305, MAUS-71, MAUS-162, Phule Sangam). Check availability with your KVK.</li>
            <li>Seed rate is roughly 65–75 kg/ha depending on seed size.</li>
            <li>Treat seed with a fungicide, then Rhizobium and PSB culture.</li>
            <li>Base fertiliser on a soil test report.</li>
          </ul>
        </Card>
        <Card>
          <Title icon={Droplets}>Water management</Title>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Broad-bed furrow sowing conserves moisture in dry spells and drains water in heavy rain.</li>
            <li>Keep protective irrigation for flowering and pod fill.</li>
            <li>Mulch to cut evaporation. Cut drainage lines in black soil before heavy rain.</li>
          </ul>
        </Card>
        <Card>
          <Title icon={CloudRain}>Weather and alerts</Title>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Check district forecasts on the IMD Meghdoot app before sowing, spraying and harvest.</li>
            <li>Use the Damini app for lightning alerts.</li>
            <li>Delay spraying if rain is expected within a day.</li>
            <li>Harvest before forecast rain to avoid post-harvest loss.</li>
          </ul>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <Title icon={TrendingUp}>Mandi prices (sample values)</Title>
          <ul className="divide-y divide-monsoon/10">{MANDI.map(([d, p]) => <li key={d} className="flex justify-between py-2"><span>{d}</span><b>{p}/quintal</b></li>)}</ul>
          <p className="mt-3 text-xs text-soil/60">Placeholders until live Agmarknet data is connected. Check Agmarknet or eNAM for today's prices.</p>
        </Card>
        <Card>
          <Title icon={Phone}>Who to contact</Title>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Your nearest Krishi Vigyan Kendra (KVK) for variety, sowing and pest advice</li>
            <li>Taluka Agriculture Officer for panchnama and scheme help</li>
            <li>Kisan Call Centre 1800-180-1551</li>
            <li>Crop insurance helpline 14447</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}