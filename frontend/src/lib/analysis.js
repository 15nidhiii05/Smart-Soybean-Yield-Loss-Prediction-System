import { STAGES } from './data'

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))
export const severity = (p) => p < 10 ? { k: 'Low', c: '#5E9B3A' } : p < 25 ? { k: 'Moderate', c: '#C9A227' } : p < 40 ? { k: 'High', c: '#D9772B' } : { k: 'Severe', c: '#B8512E' }

// Rule-based stage risk from the farm inputs. These are indicative thresholds, not model output.
export function stageRisks(f, soilClass) {
  const dry = Math.max(0, (500 - f.rain) / 500), wet = Math.max(0, (f.rain - 1100) / 500), heat = Math.min(1, f.heat / 30)
  const black = soilClass === 'Black Cotton', D = black ? 0.85 : 1.25, W = black ? 1.25 : 0.8
  const raw = {
    sow: dry * 60 * D + wet * 20 * W,
    veg: wet * 70 * W + dry * 30 * D,
    flower: heat * 60 + (f.tmax > 34 ? 25 : 0) + dry * 20 * D,
    pod: dry * 60 * D + heat * 40 + (f.tmin > 24 ? 15 : 0),
    harvest: wet * 50 * W + (black && f.rain > 900 ? 10 : 0),
  }
  return STAGES.map((s) => ({ ...s, risk: clamp(raw[s.id]) }))
}

const EXPLAIN = {
  total_rainfall_mm: (f) => f.rain < 500
    ? { why: `Rainfall of ${f.rain} mm is below the roughly 450–700 mm soybean needs.`, fix: 'Plan protective irrigation at flowering and pod fill, mulch, and sow on broad-bed furrows to hold moisture.' }
    : f.rain > 1100
      ? { why: `Rainfall of ${f.rain} mm is high and raises waterlogging and disease risk.`, fix: 'Cut drainage furrows, avoid low-lying plots, sow on broad beds.' }
      : { why: `Total rainfall of ${f.rain} mm looks adequate, so timing (long dry spells or heavy bursts) is the likely problem.`, fix: 'Watch for 10+ day dry spells at flowering and pod fill and irrigate if they occur.' },
  heat_stress_days: (f) => ({ why: `${f.heat} heat-stress days cause flower and pod drop.`, fix: 'Irrigate in the evening in hot spells, sow early in the window so flowering misses peak heat, pick short-duration varieties.' }),
  avg_max_temp_c: (f) => ({ why: `An average maximum of ${f.tmax} °C stresses the crop in flowering.`, fix: 'Mulch to cool the soil and keep moisture steady during flowering.' }),
  avg_min_temp_c: (f) => ({ why: `Warm nights (${f.tmin} °C) speed up maturity and shorten grain filling.`, fix: 'Choose varieties suited to your district and avoid very late sowing.' }),
  district_name: (f) => ({ why: `${f.district} conditions pull the forecast down in the training data.`, fix: 'Follow your KVK variety and sowing-date advice for the district.' }),
  soil_type: () => ({ why: 'This soil class has lower yields in the training data.', fix: 'Build organic matter (FYM or compost) and use broad-bed furrows for moisture and drainage.' }),
  area: () => ({ why: 'A larger area means more total exposure to one weather event.', fix: 'Stagger sowing dates and split the area across two varieties.' }),
}
export function reasons(xai, f) {
  return (xai || []).filter((x) => +x.impact_tha < 0).sort((a, b) => a.impact_tha - b.impact_tha).slice(0, 3)
    .map((x) => ({ feature: String(x.feature).replace(/_/g, ' '), impact: +x.impact_tha, ...(EXPLAIN[x.feature]?.(f) || { why: 'This factor lowered the forecast.', fix: 'Ask your KVK how to manage it.' }) }))
}
export const GENERAL_FIXES = ['Use certified seed with fungicide, Rhizobium and PSB seed treatment', 'Sow on broad-bed furrows after 75–100 mm of rain', 'Try soybean + pigeonpea intercropping to spread risk', 'Keep one irrigation in reserve for flowering and pod fill', 'Scout fields twice a week and spray only above thresholds']