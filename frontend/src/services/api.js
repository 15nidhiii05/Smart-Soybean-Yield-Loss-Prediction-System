import axios from 'axios'

// Relative URLs go through the Vite dev-server proxy (see vite.config.js), so the browser never makes a cross-origin call and CORS cannot block it.
const client = axios.create({ baseURL: '/api/v1', timeout: 20000 })

export async function predictYield(f) {
  const { data } = await client.post('/v2/predict', {
    district_name: f.district, soil_type: f.soil,
    total_rainfall_mm: f.rain, avg_max_temp_c: f.tmax, avg_min_temp_c: f.tmin, heat_stress_days: f.heat,
    area_hectares: f.area, price_per_quintal: f.price,
    reference_yield: f.useOwnRef ? f.reference : null,
    stage_weather: f.stage && Object.keys(f.stage).length ? f.stage : null,
  })
  return data
}
export const getMeta = async () => (await client.get('/v2/meta')).data
export const getModelAnalysis = async () => (await client.get('/analysis/models')).data
export const getOptions = async () => (await client.get('/analysis/options')).data
export const checkBackend = async () => { try { await axios.get('/openapi.json', { timeout: 3000 }); return true } catch { return false } }

export function explain(e) {
  if (e.response) {
    const s = e.response.status, d = e.response.data?.detail
    if (s === 404 && d === 'Not Found') return 'The v2 route is not registered. Add "app.include_router(predictions_v2.router)" to backend/app/main.py and restart the backend.'
    if (!d && [500, 502, 503, 504].includes(s)) return 'The dev server could not reach the backend on 127.0.0.1:8000. Check that uvicorn is running.'
    const msg = Array.isArray(d) ? d.map((x) => `${(x.loc || []).slice(1).join('.')}: ${x.msg}`).join('; ') : d || e.response.statusText
    return `The backend answered ${s}: ${msg}`
  }
  return 'No response. Make sure you opened the app through "npm run dev" and the backend is running.'
}