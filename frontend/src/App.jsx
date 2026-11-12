import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion'
import { container, word } from './lib/motion'
import { Sprout, ShieldCheck, TrendingUp, BarChart3, LifeBuoy, Wifi, WifiOff, MapPin, Satellite } from 'lucide-react'
import { checkBackend } from './services/api'
import RiskTab from './components/RiskTab'
import ClaimsTab from './components/ClaimsTab'
import RecoveryTab from './components/RecoveryTab'
import AdvisoryTab from './components/AdvisoryTab'
import Analysis from './components/Analysis'
import SeasonStory from './components/SeasonStory'

const TABS = [['risk', 'Yield risk', Sprout], ['claims', 'Claims & relief', ShieldCheck], ['recovery', 'Recovery', LifeBuoy], ['advice', 'Advisory', TrendingUp], ['models', 'Model analysis', BarChart3]]

export default function App() {
  const [tab, setTab] = useState('risk')
  const [online, setOnline] = useState(null)
  const [f, setF] = useState({ district: 'Latur', soilIdx: 0, area: 5, rain: 780, tmax: 31, tmin: 22, heat: 6, reference: 1.1, price: 4600, useOwnRef: false })
  const [res, setRes] = useState(null)
  useEffect(() => { checkBackend().then(setOnline); const t = setInterval(() => checkBackend().then(setOnline), 8000); return () => clearInterval(t) }, [])
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 25 })
  const go = (t) => { setTab(t); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="min-h-screen">
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-gradient-to-r from-sprout via-pod to-straw" />
      <header className="hero relative overflow-hidden text-white">
        <div className="rain" aria-hidden="true" />
        {[['right-[8%] top-24 h-40 w-40 bg-sprout/30', 6], ['right-[22%] top-52 h-24 w-24 bg-straw/30', 8], ['right-[3%] top-64 h-20 w-20 bg-white/20', 7]].map(([c, d], k) => (
          <motion.div key={k} aria-hidden="true" className={`absolute hidden rounded-full blur-2xl md:block ${c}`} animate={{ y: [0, -24, 0], x: [0, 12, 0] }} transition={{ repeat: Infinity, duration: d, ease: 'easeInOut' }} />
        ))}
        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-8 md:pb-32">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-xl font-bold"><Sprout className="text-sprout" />SoyShield</p>
            <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${online ? 'bg-sprout/25 text-sprout' : 'bg-rust/30 text-straw'}`}>
              {online ? <Wifi size={16} /> : <WifiOff size={16} />}{online === null ? 'Checking service…' : online ? 'Prediction service online' : 'Prediction service offline'}
            </span>
          </div>
          <motion.h1 variants={container} initial="hidden" animate="show" className="mt-12 max-w-3xl font-display text-5xl font-extrabold leading-[1.05] !text-white md:text-7xl">{'Know what the season will cost your soybean crop.'.split(' ').map((w, k) => <motion.span key={k} variants={word} className="mr-3 inline-block">{w}</motion.span>)}</motion.h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">Forecast the yield, see when in the season the loss happens, and get a clear path through claims and recovery.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            {[[MapPin, 'All 36 districts'], [Satellite, 'Open-Meteo weather data'], [BarChart3, 'Every algorithm compared'], [ShieldCheck, 'PMFBY claim and recovery plan']].map(([I, t]) => (
              <motion.span key={t} whileHover={{ y: -3, scale: 1.04 }} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20 backdrop-blur"><I size={16} className="text-sprout" />{t}</motion.span>
            ))}
          </div>
        </div>
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 C240 10 480 90 720 50 C960 10 1200 80 1440 40 L1440 90 L0 90Z" fill="#F1F5EE" /></svg>
      </header>
      <nav className="sticky top-0 z-10 border-b border-monsoon/10 bg-mist/90 backdrop-blur" aria-label="Sections">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3">
          {TABS.map(([id, label, Icon]) => (
            <motion.button key={id} whileTap={{ scale: 0.95 }} onClick={() => setTab(id)} aria-current={tab === id} className={`relative flex shrink-0 items-center gap-2 rounded-full px-5 py-2 font-medium transition-colors ${tab === id ? 'text-white' : 'text-monsoon hover:bg-sprout/40'}`}>{tab === id && <motion.span layoutId="tabpill" className="absolute inset-0 rounded-full bg-monsoon shadow" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}<span className="relative z-10 flex items-center gap-2"><Icon size={18} />{label}</span></motion.button>
          ))}
        </div>
      </nav>
      {tab === 'risk' && <SeasonStory f={f} res={res} />}
      <main className="mx-auto max-w-7xl px-5 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {tab === 'risk' && <RiskTab f={f} setF={setF} res={res} setRes={setRes} goClaims={() => go('claims')} />}
            {tab === 'claims' && <ClaimsTab res={res} f={f} goRecovery={() => go('recovery')} />}
            {tab === 'recovery' && <RecoveryTab />}
            {tab === 'advice' && <AdvisoryTab />}
            {tab === 'models' && <Analysis />}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="mx-auto max-w-7xl px-5 pb-10 text-xs text-soil/60">Forecasts come from a CatBoost model trained on Maharashtra district data and Open-Meteo weather. They are guidance, not a guarantee. Scheme details change, so confirm them with official sources.</footer>
    </div>
  )
}