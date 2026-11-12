// Static reference data. Region groupings and stage windows are for Kharif soybean in Maharashtra.
// Each district is [value sent to the model, label shown]. Values use the older names that datasets usually carry.
export const REGIONS = {
  Konkan: [['Mumbai City'], ['Mumbai Suburban'], ['Thane'], ['Palghar'], ['Raigad'], ['Ratnagiri'], ['Sindhudurg']],
  'Western Maharashtra': [['Pune'], ['Satara'], ['Sangli'], ['Kolhapur'], ['Solapur']],
  'North Maharashtra': [['Nashik'], ['Dhule'], ['Nandurbar'], ['Jalgaon'], ['Ahmednagar', 'Ahilyanagar (Ahmednagar)']],
  Marathwada: [['Aurangabad', 'Chhatrapati Sambhajinagar (Aurangabad)'], ['Jalna'], ['Beed'], ['Latur'], ['Osmanabad', 'Dharashiv (Osmanabad)'], ['Nanded'], ['Parbhani'], ['Hingoli']],
  Vidarbha: [['Buldhana'], ['Akola'], ['Washim'], ['Amravati'], ['Yavatmal'], ['Wardha'], ['Nagpur'], ['Bhandara'], ['Gondia'], ['Chandrapur'], ['Gadchiroli']],
}

// [label, class the trained model understands, approximated?]
export const SOILS = [
  ['Deep Black (Regur)', 'Black Cotton', false],
  ['Medium Black', 'Black Cotton', false],
  ['Alluvial (river valleys)', 'Black Cotton', true],
  ['Red soil', 'Red/Laterite', false],
  ['Laterite (Konkan)', 'Red/Laterite', false],
  ['Shallow Black / Murum', 'Red/Laterite', true],
  ['Coastal sandy / saline', 'Red/Laterite', true],
]
export const SOIL_NOTE = {
  'Black Cotton': 'Black soil holds water well but cracks in long dry spells and waterlogs in heavy rain.',
  'Red/Laterite': 'Red and laterite soils drain fast and hold little water, so dry spells hurt sooner. They are also low in organic matter.',
}

export const STAGES = [
  { id: 'sow', name: 'Sowing & germination', period: 'mid-Jun to Jul', what: 'Delayed monsoon, dry spell after sowing, or crust after heavy rain gives a thin plant stand.', act: 'Sow only after 75–100 mm of rain. Use treated seed. Re-sow within 10 days if the stand is below about 60%.' },
  { id: 'veg', name: 'Vegetative growth', period: 'Jul to Aug', what: 'Waterlogging, girdle beetle, stem fly and yellow mosaic virus.', act: 'Cut drainage furrows. Scout twice a week. Remove virus-infected plants early.' },
  { id: 'flower', name: 'Flowering', period: 'Aug', what: 'Heat above about 35 °C and dry spells cause flower drop.', act: 'Give protective irrigation if rain stops for 10+ days. Irrigate in the evening during hot spells.' },
  { id: 'pod', name: 'Pod filling', period: 'Sep', what: 'The most drought-sensitive stage. Warm nights shorten grain filling. Rust and defoliators peak.', act: 'Do not let the field dry out. Irrigate once or twice if needed. Spray only above pest thresholds.' },
  { id: 'harvest', name: 'Maturity & harvest', period: 'Oct', what: 'Untimely rain causes pod shattering and sprouting. Cut crop lying in the field is exposed.', act: 'Harvest at 90–95% brown pods. Dry and store under cover. Report unseasonal-rain damage within 72 hours.' },
]

export const PMFBY_COVERS = [
  ['Prevented sowing', 'Deficit rain or adverse season stops you sowing across the notified area.'],
  ['Mid-season adversity', 'Drought, long dry spell or flood during the season. A notified area can get an on-account payout.'],
  ['Localized calamity', 'Hailstorm, landslide, inundation, cloudburst or natural fire on your own plot. Report within 72 hours.'],
  ['Post-harvest loss', 'Hail, cyclone or unseasonal rain on harvested crop drying in the field, for up to 14 days after harvest. Report within 72 hours.'],
  ['Yield loss', 'Final payout is based on crop-cutting experiments for your notified area, not on your single plot.'],
]
export const CLAIM_STEPS = [
  ['Enrol before the cut-off', 'Kharif cut-off dates are announced each season (usually July). Farmers with crop loans are enrolled through the bank unless they opt out. Others enrol at the bank, a CSC centre or pmfby.gov.in. The farmer premium for Kharif oilseeds is 2% of sum insured.'],
  ['Know what is covered', 'Check the cover types above and the notified area and crop for your village.'],
  ['Report within 72 hours', 'Use the Crop Insurance app, call 14447, or tell your bank or Agriculture Officer. Give crop, survey number, date and cause.'],
  ['Photograph the damage', 'Take dated, geo-tagged photos of the field and keep the crop standing until the survey is done.'],
  ['Survey and panchnama', 'The insurer, the Agriculture Department and revenue staff assess the loss. Ask for a copy of the panchnama.'],
  ['Yield assessment', 'Crop-cutting experiments set the area yield, and payouts follow from it.'],
  ['Payout and grievance', 'Money goes to your bank account. If it is delayed or short, raise a grievance on the PMFBY portal or with the District Level Grievance Redressal Committee.'],
]
export const DOCS = ['Aadhaar and bank passbook', '7/12 extract and 8A', 'Sowing certificate or self-declaration', 'Policy number or application receipt', 'Dated, geo-tagged photos of damage', 'Loss intimation reference (app, call or bank)', 'Panchnama copy']
export const OTHER_RELIEF = [
  ['State and central disaster relief', 'After a disaster declaration, input subsidy is paid from SDRF/NDRF based on the panchnama. Make sure your plot is on the survey list at the tahsil office.'],
  ['Drought concessions', 'In declared drought areas the state can offer land revenue relief, crop-loan restructuring and electricity bill relief. Ask your tahsildar and bank.'],
  ['Loan restructuring', 'Ask your bank to reschedule crop loans after crop loss. Keep the panchnama and insurance claim reference.'],
  ['Kisan Credit Card', 'Use it for next-season working capital with the interest subvention for timely repayment.'],
  ['Income support', 'Check your PM-KISAN and state income-support instalments are reaching your account.'],
  ['Sell smart', 'Compare mandi price with the MSP procurement centre. Salvaged soybean in good moisture condition can fetch more.'],
]
export const RECOVERY = [
  ['Day 0–3: Secure and report', ['Photograph the field with date and location', 'Report loss: app, 14447 or bank (within 72 hours)', 'Do not plough or clear the crop before the survey', 'Note survey numbers and affected area']],
  ['Week 1–2: Document and claim', ['Get the panchnama copy from the revenue/agriculture office', 'File claim with all documents', 'Inform your bank about the loss', 'Write down your claim reference number']],
  ['Week 2–6: Salvage and stabilise', ['Harvest whatever is salvageable and dry it properly', 'Keep good grain as seed for next season', 'Compare mandi price with MSP procurement', 'Follow up the claim; escalate to the grievance committee if delayed']],
  ['Before next season: Rebuild', ['Do a soil test and fix organic matter and drainage', 'Ask the bank to restructure loans if needed', 'Plan a short-duration rabi crop if soil moisture allows (check with your KVK)', 'Enrol in crop insurance early next Kharif', 'Plan broad-bed furrow sowing and timely sowing next season']],
]
export const PESTS = [
  ['Girdle beetle', 'Jul–Aug', 'Wilting tops, ring cuts on stem', 'Remove and destroy infested plants; follow KVK spray advice'],
  ['Stem fly', 'Seedling stage', 'Seedlings wilt and die early', 'Treat seed, sow on time, keep plant population right'],
  ['Defoliators (semilooper, tobacco caterpillar)', 'Aug–Sep', 'Holes in leaves, stripped plants', 'Scout; spray only above threshold'],
  ['Yellow mosaic virus', 'Jul–Aug', 'Yellow patches on leaves, spread by whitefly', 'Rogue early, use resistant varieties, manage whitefly'],
  ['Rust', 'Sep', 'Rusty spots under leaves in humid weather', 'Scout after long humid spells; use KVK-approved fungicide'],
  ['Charcoal rot', 'Dry spells', 'Plants dry up with black dots at the collar', 'Improve moisture, avoid water stress at pod fill'],
]
export const MANDI = [['Latur', '₹4,720'], ['Yavatmal', '₹4,610'], ['Akola', '₹4,680'], ['Nanded', '₹4,590'], ['Amravati', '₹4,650']]