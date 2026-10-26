export interface TermDefinition {
  term: string;
  definition: string;
}

export const MEDICAL_TERM_DEFINITIONS: Record<string, string> = {
  glucose: 'A simple sugar that provides the main source of energy for the body’s cells.',
  creatinine: 'A natural chemical waste product produced by normal muscle breakdown and filtered by the kidneys.',
  egfr: 'Estimated Glomerular Filtration Rate: a calculation estimating how efficiently the kidneys filter blood.',
  bun: 'Blood Urea Nitrogen: a waste product formed when the liver breaks down dietary proteins.',
  sodium: 'An essential electrolyte that controls water balance and fluid volume in body tissues.',
  potassium: 'A vital mineral that conducts electrical impulses necessary for heart rhythm and muscle contraction.',
  calcium: 'An essential mineral required for bone density, nerve impulses, and cellular signaling.',
  albumin: 'The most abundant protein in blood plasma, keeping fluid from leaking out of blood vessels.',
  globulin: 'A group of proteins in blood serum that includes antibodies and transport proteins.',
  bilirubin: 'A yellowish substance made during the normal breakdown of red blood cells.',
  hemoglobin: 'The iron-rich protein in red blood cells that transports oxygen from lungs to body tissues.',
  hematocrit: 'The proportion of total blood volume made up of red blood cells, expressed as a percentage.',
  platelets: 'Small cellular fragments in the bloodstream that clump together to help form blood clots.',
  mcv: 'Mean Corpuscular Volume: a measure of the average physical size of individual red blood cells.',
  cholesterol: 'A lipid molecule needed for building cell membranes and manufacturing steroid hormones.',
  triglycerides: 'The primary form of fat circulating in the bloodstream and stored in fat cells.',
  hdl: 'High-Density Lipoprotein: often called "protective" cholesterol because it carries excess lipids back to the liver.',
  ldl: 'Low-Density Lipoprotein: carries cholesterol to cells, which can accumulate along blood vessel walls if elevated.',
  tsh: 'Thyroid-Stimulating Hormone: produced by the pituitary gland to control hormone output from the thyroid.',
  thyroxine: 'The primary hormone secreted by the thyroid gland, regulating cellular metabolism.',
  enzymes: 'Specialized protein molecules that speed up biological chemical reactions in body organs.',
  electrolytes: 'Minerals in body fluids that carry an electric charge necessary for nerve and muscle function.',
};
