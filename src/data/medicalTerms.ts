export interface TermDefinition {
  term: string;
  definition: string;
  category?: string;
  whyTested?: string;
  typicalContext?: string;
}

export const MEDICAL_TERM_DEFINITIONS: Record<string, string> = {
  // Blood / Hematology
  hemoglobin: 'The iron-rich protein in red blood cells that transports oxygen from your lungs to the rest of your body.',
  hematocrit: 'The proportion of your total blood volume that consists of red blood cells, expressed as a percentage.',
  rbc: 'Red Blood Cells (Erythrocytes): cells that deliver oxygen to bodily tissues and return carbon dioxide to the lungs.',
  wbc: 'White Blood Cells (Leukocytes): immune defense cells that protect the body against infections, viruses, and inflammation.',
  platelets: 'Small disc-shaped cell fragments circulating in the blood that clump together to form clots and stop bleeding.',
  mcv: 'Mean Corpuscular Volume: measures the average physical size of individual red blood cells, helping differentiate types of anemia.',
  mch: 'Mean Corpuscular Hemoglobin: the average amount of hemoglobin contained inside an individual red blood cell.',
  mchc: 'Mean Corpuscular Hemoglobin Concentration: the concentration of hemoglobin relative to the total size of a red blood cell.',
  rdw: 'Red Cell Distribution Width: measures the variation in size and volume among red blood cells.',
  neutrophils: 'The most abundant type of white blood cell, acting as the first responders to bacterial infections and acute injury.',
  lymphocytes: 'White blood cells including T-cells and B-cells that produce antibodies and maintain long-term immune memory.',
  monocytes: 'White blood cells that transform into macrophages to ingest foreign pathogens and clean up cellular debris.',
  eosinophils: 'White blood cells that activate primarily during allergic reactions, asthma, and parasitic infections.',
  basophils: 'A rare type of white blood cell involved in immediate inflammatory and allergic reactions, releasing histamine.',
  esr: 'Erythrocyte Sedimentation Rate: measures how fast red blood cells settle, acting as a general marker of systemic inflammation.',

  // Metabolic & Renal
  glucose: 'A simple sugar that serves as the body’s primary energy fuel, heavily regulated by the hormone insulin.',
  hba1c: 'Hemoglobin A1c: measures the percentage of red blood cells coated with sugar, reflecting average blood glucose over the past 2-3 months.',
  creatinine: 'A natural chemical waste byproduct of normal muscle wear-and-tear that healthy kidneys filter out through urine.',
  egfr: 'Estimated Glomerular Filtration Rate: a calculated estimate of how many milliliters of blood the kidneys cleanse per minute.',
  bun: 'Blood Urea Nitrogen: a waste product created when the liver breaks down dietary proteins, filtered and eliminated by kidneys.',
  sodium: 'An essential electrolyte that controls water balance, blood pressure, and normal muscle and nerve function.',
  potassium: 'A vital electrolyte critical for regulating heart rhythm, nerve transmissions, and muscle contractions.',
  chloride: 'An electrolyte that works alongside sodium and potassium to maintain electrical neutrality and fluid equilibrium.',
  bicarbonate: 'An electrolyte that helps maintain the body’s delicate acid-base (pH) balance.',
  calcium: 'A mineral vital for strong bones and teeth, blood clotting, muscle contraction, and cardiac electrical conduction.',

  // Liver & Enzymes
  albumin: 'The most abundant protein synthesized by the liver, preventing fluids from leaking out of blood vessels into tissues.',
  globulin: 'A family of proteins produced by the liver and immune system, including enzymes and antibody immunoglobulins.',
  bilirubin: 'A yellowish pigment generated during the normal breakdown of aged red blood cells, processed and excreted by the liver.',
  alp: 'Alkaline Phosphatase: an enzyme found in high concentrations in bile ducts, liver tissue, and rapidly growing bone.',
  alt: 'Alanine Aminotransferase (SGPT): an enzyme primarily located inside liver cells; elevated levels can signal liver irritation.',
  ast: 'Aspartate Aminotransferase (SGOT): an enzyme present in the liver, heart, and skeletal muscle tissue.',
  ggt: 'Gamma-Glutamyl Transferase: a sensitive enzyme reflecting bile duct integrity and liver function.',

  // Lipids / Cardiovascular
  cholesterol: 'A lipid molecule essential for building cellular membranes, insulating nerves, and synthesizing vitamin D and hormones.',
  triglycerides: 'The most common type of fat circulating in the bloodstream, storing unburned calories for future energy use.',
  hdl: 'High-Density Lipoprotein: often called "protective" or "good" cholesterol because it scavenges excess cholesterol back to the liver.',
  ldl: 'Low-Density Lipoprotein: often referred to as "bad" cholesterol because elevated amounts can form plaques in arterial walls.',
  vldl: 'Very-Low-Density Lipoprotein: particles that carry triglycerides from the liver throughout body tissues.',

  // Thyroid & Endocrine
  tsh: 'Thyroid-Stimulating Hormone: produced by the pituitary gland in the brain to signal the thyroid to produce metabolic hormones.',
  t3: 'Triiodothyronine: the active thyroid hormone responsible for regulating metabolic rate, temperature, and cardiac speed.',
  t4: 'Thyroxine: the primary storage hormone produced by the thyroid gland, later converted into active T3 as needed.',

  // Vitamins & Nutrients
  vitamind: 'A fat-soluble nutrient that enables the intestines to absorb dietary calcium, supporting bone strength and immune defense.',
  vitaminb12: 'An essential B vitamin critical for healthy nerve tissue function, brain health, and red blood cell production.',
  ferritin: 'A cellular protein that stores iron in the body and releases it in a controlled manner.',
  iron: 'An essential trace mineral required to synthesize hemoglobin and myoglobin for cellular oxygen delivery.',
  uricacid: 'A waste byproduct formed when the body digests purines found in certain foods and beverages.',

  // General terms
  enzymes: 'Specialized biological catalysts that accelerate chemical reactions inside body organs.',
  electrolytes: 'Electrically charged minerals that conduct electrical impulses for muscles, heart, and hydration.',
};

/**
 * Searches the medical terms dictionary with smart alias matching
 */
export function lookupMedicalTerm(query: string): { term: string; definition: string } | null {
  const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Exact match
  if (MEDICAL_TERM_DEFINITIONS[cleanQuery]) {
    return { term: cleanQuery, definition: MEDICAL_TERM_DEFINITIONS[cleanQuery] };
  }

  // Common aliases
  const aliasMap: Record<string, string> = {
    'sugar': 'glucose',
    'bloodsugar': 'glucose',
    'fastingbloodglucose': 'glucose',
    'fbs': 'glucose',
    'a1c': 'hba1c',
    'hemoglobina1c': 'hba1c',
    'glycatedhemoglobin': 'hba1c',
    'kidneyfunction': 'egfr',
    'gfr': 'egfr',
    'platelet': 'platelets',
    'whitecells': 'wbc',
    'whitebloodcell': 'wbc',
    'redcells': 'rbc',
    'redbloodcell': 'rbc',
    'hb': 'hemoglobin',
    'hgb': 'hemoglobin',
    'hct': 'hematocrit',
    'sedrate': 'esr',
    'liverenzyme': 'alt',
    'sgpt': 'alt',
    'sgot': 'ast',
    'alkphos': 'alp',
    'alkalinephosphatase': 'alp',
    'thyroid': 'tsh',
    'goodcholesterol': 'hdl',
    'badcholesterol': 'ldl',
    'vitamind3': 'vitamind',
    'b12': 'vitaminb12',
    'cobalamin': 'vitaminb12',
  };

  if (aliasMap[cleanQuery] && MEDICAL_TERM_DEFINITIONS[aliasMap[cleanQuery]]) {
    const canonical = aliasMap[cleanQuery];
    return { term: canonical, definition: MEDICAL_TERM_DEFINITIONS[canonical] };
  }

  // Substring match in dictionary
  for (const [key, definition] of Object.entries(MEDICAL_TERM_DEFINITIONS)) {
    if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
      return { term: key, definition };
    }
  }

  return null;
}
