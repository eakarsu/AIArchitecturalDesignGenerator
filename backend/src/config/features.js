const features = {
  'building-designs': {
    key: 'building-designs',
    tableName: 'building_designs',
    name: 'Building Design Generator',
    description: 'Generate comprehensive architectural building designs with AI assistance',
    icon: '\ud83c\udfe2',
    fields: [
      { name: 'building_type', label: 'Building Type', type: 'select', required: true, options: ['residential', 'commercial', 'industrial', 'institutional', 'mixed-use'] },
      { name: 'area_sqft', label: 'Area (sq ft)', type: 'number', required: true },
      { name: 'stories', label: 'Number of Stories', type: 'number', required: true },
      { name: 'style', label: 'Architectural Style', type: 'select', required: true, options: ['modern', 'traditional', 'contemporary', 'minimalist', 'art-deco', 'brutalist'] },
      { name: 'budget', label: 'Budget Range', type: 'select', required: true, options: ['economy', 'standard', 'premium', 'luxury'] },
      { name: 'requirements', label: 'Special Requirements', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Design a ${d.building_type || 'residential'} building with the following specifications:
- Total area: ${d.area_sqft || 'not specified'} square feet
- Number of stories: ${d.stories || 'not specified'}
- Architectural style: ${d.style || 'modern'}
- Budget range: ${d.budget || 'standard'}
- Special requirements: ${d.requirements || 'none'}
- Project name: ${item.name}

Provide a comprehensive architectural design including:
1. Design concept and philosophy
2. Space planning and layout recommendations
3. Exterior design elements and facade treatment
4. Structural system recommendations
5. Material palette suggestions
6. Sustainability features
7. Estimated timeline and key milestones

Return as JSON with keys: concept, spacePlanning, exteriorDesign, structuralSystem, materials, sustainability, timeline.`;
    },
  },

  'compliance-checks': {
    key: 'compliance-checks',
    tableName: 'compliance_checks',
    name: 'Code Compliance Checker',
    description: 'Verify building designs against applicable codes and regulations',
    icon: '\u2705',
    fields: [
      { name: 'building_type', label: 'Building Type', type: 'select', required: true, options: ['residential', 'commercial', 'industrial', 'institutional', 'healthcare', 'educational'] },
      { name: 'location', label: 'Location', type: 'text', required: true },
      { name: 'code_type', label: 'Code Type', type: 'select', required: true, options: ['IBC', 'IRC', 'NFPA', 'ADA', 'local'] },
      { name: 'year_built', label: 'Year Built / Planned', type: 'number', required: false },
      { name: 'occupancy_type', label: 'Occupancy Type', type: 'select', required: true, options: ['A-Assembly', 'B-Business', 'E-Educational', 'F-Factory', 'H-Hazardous', 'I-Institutional', 'M-Mercantile', 'R-Residential', 'S-Storage', 'U-Utility'] },
      { name: 'description', label: 'Project Description', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Perform a building code compliance check for the following project:
- Building type: ${d.building_type || 'commercial'}
- Location: ${d.location || 'not specified'}
- Applicable code: ${d.code_type || 'IBC'}
- Year built/planned: ${d.year_built || 'new construction'}
- Occupancy classification: ${d.occupancy_type || 'B-Business'}
- Description: ${d.description || item.description || 'none'}

Analyze compliance across these areas:
1. Fire and life safety requirements
2. Structural requirements
3. Accessibility (ADA) compliance
4. Egress requirements
5. Plumbing and mechanical codes
6. Energy code compliance
7. Zoning requirements

Return as JSON with keys: fireSafety, structural, accessibility, egress, mechanical, energyCode, zoning, overallStatus, recommendations.`;
    },
  },

  'energy-models': {
    key: 'energy-models',
    tableName: 'energy_models',
    name: 'Energy Modeling',
    description: 'Analyze and optimize building energy performance',
    icon: '\u26a1',
    fields: [
      { name: 'climate_zone', label: 'Climate Zone', type: 'select', required: true, options: ['1A-Very Hot Humid', '2A-Hot Humid', '3A-Warm Humid', '3B-Warm Dry', '4A-Mixed Humid', '4B-Mixed Dry', '5A-Cool Humid', '5B-Cool Dry', '6A-Cold Humid', '7-Very Cold', '8-Subarctic'] },
      { name: 'building_area', label: 'Building Area (sq ft)', type: 'number', required: true },
      { name: 'building_type', label: 'Building Type', type: 'select', required: true, options: ['office', 'retail', 'school', 'hospital', 'residential', 'warehouse'] },
      { name: 'envelope_type', label: 'Envelope Type', type: 'select', required: true, options: ['curtain-wall', 'masonry', 'metal-panel', 'precast', 'wood-frame', 'SIPs'] },
      { name: 'hvac_system', label: 'HVAC System', type: 'select', required: false, options: ['VAV', 'VRF', 'chilled-beam', 'geothermal', 'packaged-unit', 'split-system'] },
      { name: 'target_certification', label: 'Target Certification', type: 'select', required: false, options: ['none', 'LEED-Silver', 'LEED-Gold', 'LEED-Platinum', 'ENERGY-STAR', 'Passive-House', 'Net-Zero'] },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Create an energy model analysis for the following building:
- Climate zone: ${d.climate_zone || '4A-Mixed Humid'}
- Building area: ${d.building_area || 'not specified'} sq ft
- Building type: ${d.building_type || 'office'}
- Envelope type: ${d.envelope_type || 'curtain-wall'}
- HVAC system: ${d.hvac_system || 'VAV'}
- Target certification: ${d.target_certification || 'none'}

Provide detailed energy analysis including:
1. Annual energy consumption estimate (kBtu/sqft/yr)
2. Heating and cooling load calculations
3. Envelope performance analysis (U-values, R-values)
4. HVAC efficiency analysis
5. Lighting power density recommendations
6. Renewable energy potential
7. Cost-benefit analysis for energy improvements

Return as JSON with keys: annualConsumption, heatingCooling, envelopePerformance, hvacEfficiency, lightingDensity, renewables, costBenefit, eui.`;
    },
  },

  'material-estimations': {
    key: 'material-estimations',
    tableName: 'material_estimations',
    name: 'Material Estimation',
    description: 'Estimate construction materials and quantities',
    icon: '\ud83e\uddf1',
    fields: [
      { name: 'project_type', label: 'Project Type', type: 'select', required: true, options: ['new-construction', 'renovation', 'addition', 'tenant-improvement', 'demolition'] },
      { name: 'structure_type', label: 'Structure Type', type: 'select', required: true, options: ['steel-frame', 'concrete', 'wood-frame', 'masonry', 'hybrid'] },
      { name: 'area_sqft', label: 'Total Area (sq ft)', type: 'number', required: true },
      { name: 'stories', label: 'Number of Stories', type: 'number', required: true },
      { name: 'finish_level', label: 'Finish Level', type: 'select', required: true, options: ['basic', 'standard', 'high-end', 'luxury'] },
      { name: 'special_materials', label: 'Special Materials / Notes', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Estimate materials for the following construction project:
- Project type: ${d.project_type || 'new-construction'}
- Structure type: ${d.structure_type || 'steel-frame'}
- Total area: ${d.area_sqft || 'not specified'} sq ft
- Stories: ${d.stories || 1}
- Finish level: ${d.finish_level || 'standard'}
- Special materials: ${d.special_materials || 'none'}

Provide a detailed material estimation including:
1. Structural materials (steel, concrete, lumber quantities)
2. Foundation materials
3. Envelope materials (cladding, insulation, glazing)
4. Interior finish materials (drywall, flooring, ceiling)
5. MEP rough-in materials
6. Estimated material costs by category
7. Waste factor and contingency recommendations

Return as JSON with keys: structural, foundation, envelope, interiorFinish, mep, costsByCategory, wasteContingency, totalEstimate.`;
    },
  },

  'floor-plans': {
    key: 'floor-plans',
    tableName: 'floor_plans',
    name: 'Floor Plan Generator',
    description: 'Generate optimized floor plans and space layouts',
    icon: '\ud83d\udccf',
    fields: [
      { name: 'building_type', label: 'Building Type', type: 'select', required: true, options: ['single-family', 'multi-family', 'office', 'retail', 'restaurant', 'medical', 'educational'] },
      { name: 'total_area', label: 'Total Area (sq ft)', type: 'number', required: true },
      { name: 'num_rooms', label: 'Number of Rooms', type: 'number', required: true },
      { name: 'accessibility', label: 'Accessibility Level', type: 'select', required: true, options: ['standard', 'enhanced', 'full-ADA', 'universal-design'] },
      { name: 'open_plan_ratio', label: 'Open Plan Ratio', type: 'select', required: false, options: ['mostly-open', 'balanced', 'mostly-enclosed', 'fully-enclosed'] },
      { name: 'special_spaces', label: 'Special Spaces Required', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Generate a floor plan layout for:
- Building type: ${d.building_type || 'office'}
- Total area: ${d.total_area || 'not specified'} sq ft
- Number of rooms: ${d.num_rooms || 'not specified'}
- Accessibility: ${d.accessibility || 'standard'}
- Open plan ratio: ${d.open_plan_ratio || 'balanced'}
- Special spaces: ${d.special_spaces || 'none'}

Provide detailed floor plan recommendations:
1. Room-by-room layout with dimensions
2. Circulation and corridor planning
3. Core placement (stairs, elevators, restrooms)
4. Natural light optimization
5. Adjacency relationships
6. Furniture layout suggestions
7. Code-required clearances and egress paths

Return as JSON with keys: roomLayouts, circulation, corePlacement, naturalLight, adjacencies, furnitureLayout, egressPaths.`;
    },
  },

  'structural-analyses': {
    key: 'structural-analyses',
    tableName: 'structural_analyses',
    name: 'Structural Analysis',
    description: 'Analyze structural systems and load calculations',
    icon: '\ud83c\udfd7\ufe0f',
    fields: [
      { name: 'structure_type', label: 'Structure Type', type: 'select', required: true, options: ['steel-moment-frame', 'steel-braced-frame', 'concrete-frame', 'wood-frame', 'masonry-bearing-wall', 'post-tensioned'] },
      { name: 'stories', label: 'Number of Stories', type: 'number', required: true },
      { name: 'seismic_zone', label: 'Seismic Design Category', type: 'select', required: true, options: ['A', 'B', 'C', 'D', 'E', 'F'] },
      { name: 'wind_speed', label: 'Design Wind Speed (mph)', type: 'number', required: true },
      { name: 'soil_type', label: 'Soil Classification', type: 'select', required: true, options: ['A-Hard Rock', 'B-Rock', 'C-Dense Soil', 'D-Stiff Soil', 'E-Soft Clay', 'F-Special'] },
      { name: 'special_loads', label: 'Special Loading Conditions', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Perform structural analysis for:
- Structure type: ${d.structure_type || 'steel-moment-frame'}
- Stories: ${d.stories || 1}
- Seismic design category: ${d.seismic_zone || 'C'}
- Design wind speed: ${d.wind_speed || 115} mph
- Soil classification: ${d.soil_type || 'D-Stiff Soil'}
- Special loads: ${d.special_loads || 'none'}

Provide comprehensive structural analysis:
1. Gravity load analysis (dead, live, roof loads)
2. Lateral force analysis (seismic and wind)
3. Foundation recommendations
4. Member sizing guidelines
5. Connection design considerations
6. Drift and deflection limits
7. Special inspection requirements

Return as JSON with keys: gravityLoads, lateralForces, foundation, memberSizing, connections, driftLimits, specialInspections, recommendations.`;
    },
  },

  'cost-estimations': {
    key: 'cost-estimations',
    tableName: 'cost_estimations',
    name: 'Cost Estimation',
    description: 'Generate detailed construction cost estimates',
    icon: '\ud83d\udcb0',
    fields: [
      { name: 'project_type', label: 'Project Type', type: 'select', required: true, options: ['new-construction', 'renovation', 'addition', 'fit-out', 'restoration'] },
      { name: 'building_type', label: 'Building Type', type: 'select', required: true, options: ['residential', 'commercial-office', 'retail', 'industrial', 'healthcare', 'educational', 'hospitality'] },
      { name: 'area_sqft', label: 'Gross Area (sq ft)', type: 'number', required: true },
      { name: 'location', label: 'Location / City', type: 'text', required: true },
      { name: 'quality_level', label: 'Quality Level', type: 'select', required: true, options: ['economy', 'standard', 'above-average', 'premium', 'luxury'] },
      { name: 'site_conditions', label: 'Site Conditions / Notes', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Create a construction cost estimate for:
- Project type: ${d.project_type || 'new-construction'}
- Building type: ${d.building_type || 'commercial-office'}
- Gross area: ${d.area_sqft || 'not specified'} sq ft
- Location: ${d.location || 'not specified'}
- Quality level: ${d.quality_level || 'standard'}
- Site conditions: ${d.site_conditions || 'standard conditions'}

Provide detailed cost breakdown:
1. Site work and foundations
2. Structural system
3. Building envelope
4. Interior construction and finishes
5. Mechanical (HVAC, plumbing, fire protection)
6. Electrical systems
7. General conditions and fees
8. Contingency and escalation

Return as JSON with keys: siteWork, structural, envelope, interiorFinish, mechanical, electrical, generalConditions, contingency, totalCost, costPerSqFt.`;
    },
  },

  'site-analyses': {
    key: 'site-analyses',
    tableName: 'site_analyses',
    name: 'Site Analysis',
    description: 'Analyze site conditions, constraints, and opportunities',
    icon: '\ud83d\udccd',
    fields: [
      { name: 'site_area', label: 'Site Area (acres)', type: 'number', required: true },
      { name: 'location', label: 'Location / Address', type: 'text', required: true },
      { name: 'zoning', label: 'Current Zoning', type: 'select', required: true, options: ['R-1 Single Family', 'R-2 Multi Family', 'C-1 Commercial', 'C-2 General Commercial', 'M-1 Light Industrial', 'M-2 Heavy Industrial', 'PUD Planned Unit', 'Mixed Use'] },
      { name: 'topography', label: 'Topography', type: 'select', required: true, options: ['flat', 'gentle-slope', 'moderate-slope', 'steep', 'varied'] },
      { name: 'existing_conditions', label: 'Existing Conditions', type: 'select', required: false, options: ['vacant-land', 'existing-structure', 'brownfield', 'greenfield', 'infill'] },
      { name: 'constraints', label: 'Known Constraints', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Perform a site analysis for:
- Site area: ${d.site_area || 'not specified'} acres
- Location: ${d.location || 'not specified'}
- Zoning: ${d.zoning || 'C-1 Commercial'}
- Topography: ${d.topography || 'flat'}
- Existing conditions: ${d.existing_conditions || 'vacant-land'}
- Known constraints: ${d.constraints || 'none specified'}

Provide comprehensive site analysis:
1. Zoning analysis (setbacks, FAR, height limits, parking requirements)
2. Environmental considerations (drainage, wetlands, protected areas)
3. Solar orientation and prevailing wind analysis
4. Access and circulation opportunities
5. Utility infrastructure availability
6. View corridors and visual impact
7. Development potential and recommendations

Return as JSON with keys: zoningAnalysis, environmental, solarWind, accessCirculation, utilities, viewCorridors, developmentPotential, recommendations.`;
    },
  },

  'sustainability-assessments': {
    key: 'sustainability-assessments',
    tableName: 'sustainability_assessments',
    name: 'Sustainability Assessment',
    description: 'Evaluate and improve building sustainability performance',
    icon: '\ud83c\udf3f',
    fields: [
      { name: 'certification_target', label: 'Certification Target', type: 'select', required: true, options: ['LEED-Certified', 'LEED-Silver', 'LEED-Gold', 'LEED-Platinum', 'WELL', 'Living-Building-Challenge', 'BREEAM', 'Passive-House', 'none'] },
      { name: 'building_type', label: 'Building Type', type: 'select', required: true, options: ['office', 'residential', 'retail', 'educational', 'healthcare', 'hospitality', 'mixed-use'] },
      { name: 'area_sqft', label: 'Building Area (sq ft)', type: 'number', required: true },
      { name: 'climate_zone', label: 'Climate Zone', type: 'select', required: true, options: ['hot-humid', 'hot-dry', 'mixed-humid', 'mixed-dry', 'cool-humid', 'cool-dry', 'cold', 'very-cold'] },
      { name: 'renewable_interest', label: 'Renewable Energy Interest', type: 'select', required: false, options: ['solar-PV', 'solar-thermal', 'wind', 'geothermal', 'biomass', 'multiple', 'none'] },
      { name: 'priorities', label: 'Sustainability Priorities', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Perform a sustainability assessment for:
- Certification target: ${d.certification_target || 'LEED-Gold'}
- Building type: ${d.building_type || 'office'}
- Area: ${d.area_sqft || 'not specified'} sq ft
- Climate zone: ${d.climate_zone || 'mixed-humid'}
- Renewable energy interest: ${d.renewable_interest || 'solar-PV'}
- Priorities: ${d.priorities || 'energy efficiency and occupant comfort'}

Provide detailed sustainability assessment:
1. Energy performance strategies
2. Water conservation measures
3. Material selection and lifecycle analysis
4. Indoor environmental quality
5. Site sustainability and land use
6. Carbon footprint analysis
7. Certification credit pathway

Return as JSON with keys: energyStrategies, waterConservation, materialLifecycle, indoorQuality, siteSustainability, carbonFootprint, certificationPathway, estimatedScore.`;
    },
  },

  'lighting-designs': {
    key: 'lighting-designs',
    tableName: 'lighting_designs',
    name: 'Lighting Design',
    description: 'Design comprehensive lighting systems for buildings',
    icon: '\ud83d\udca1',
    fields: [
      { name: 'space_type', label: 'Space Type', type: 'select', required: true, options: ['office', 'retail', 'gallery', 'residential', 'healthcare', 'educational', 'industrial', 'hospitality', 'exterior'] },
      { name: 'area_sqft', label: 'Area (sq ft)', type: 'number', required: true },
      { name: 'ceiling_height', label: 'Ceiling Height (ft)', type: 'number', required: true },
      { name: 'daylight_access', label: 'Daylight Access', type: 'select', required: true, options: ['full-perimeter', 'partial', 'minimal', 'none'] },
      { name: 'color_temperature', label: 'Preferred Color Temperature', type: 'select', required: false, options: ['2700K-warm', '3000K-warm-white', '3500K-neutral', '4000K-cool-white', '5000K-daylight', 'tunable'] },
      { name: 'special_requirements', label: 'Special Requirements', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Design a lighting system for:
- Space type: ${d.space_type || 'office'}
- Area: ${d.area_sqft || 'not specified'} sq ft
- Ceiling height: ${d.ceiling_height || 9} ft
- Daylight access: ${d.daylight_access || 'partial'}
- Color temperature: ${d.color_temperature || '3500K-neutral'}
- Special requirements: ${d.special_requirements || 'none'}

Provide comprehensive lighting design:
1. Recommended illuminance levels (foot-candles)
2. Fixture types and placement
3. Control system design (dimming, occupancy, daylight harvesting)
4. Emergency and egress lighting
5. Lighting power density (LPD) calculation
6. Energy code compliance (ASHRAE 90.1)
7. Estimated fixture schedule and costs

Return as JSON with keys: illuminanceLevels, fixtures, controlSystem, emergencyLighting, lpd, codeCompliance, fixtureSchedule, estimatedCost.`;
    },
  },

  'hvac-designs': {
    key: 'hvac-designs',
    tableName: 'hvac_designs',
    name: 'HVAC Design',
    description: 'Design heating, ventilation, and air conditioning systems',
    icon: '\u2744\ufe0f',
    fields: [
      { name: 'building_type', label: 'Building Type', type: 'select', required: true, options: ['office', 'retail', 'residential', 'healthcare', 'laboratory', 'data-center', 'restaurant', 'warehouse'] },
      { name: 'area_sqft', label: 'Building Area (sq ft)', type: 'number', required: true },
      { name: 'climate_zone', label: 'Climate Zone', type: 'select', required: true, options: ['1A-Very Hot Humid', '2A-Hot Humid', '3A-Warm Humid', '4A-Mixed Humid', '5A-Cool Humid', '6A-Cold Humid', '7-Very Cold'] },
      { name: 'system_preference', label: 'System Preference', type: 'select', required: true, options: ['VAV', 'VRF', 'chilled-beam', 'DOAS', 'geothermal', 'packaged-rooftop', 'split-system', 'radiant'] },
      { name: 'ventilation_standard', label: 'Ventilation Standard', type: 'select', required: false, options: ['ASHRAE-62.1', 'ASHRAE-170', 'enhanced-filtration', 'MERV-13', 'HEPA'] },
      { name: 'special_conditions', label: 'Special Conditions', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Design an HVAC system for:
- Building type: ${d.building_type || 'office'}
- Area: ${d.area_sqft || 'not specified'} sq ft
- Climate zone: ${d.climate_zone || '4A-Mixed Humid'}
- System preference: ${d.system_preference || 'VAV'}
- Ventilation standard: ${d.ventilation_standard || 'ASHRAE-62.1'}
- Special conditions: ${d.special_conditions || 'none'}

Provide comprehensive HVAC design:
1. Heating and cooling load calculations (tons, BTU/hr)
2. Equipment selection and sizing
3. Ductwork / piping layout considerations
4. Ventilation and indoor air quality strategy
5. Controls and Building Automation System
6. Energy efficiency measures
7. Estimated equipment and installation costs

Return as JSON with keys: loadCalculations, equipmentSelection, distribution, ventilationStrategy, controls, energyEfficiency, estimatedCosts, maintenancePlan.`;
    },
  },

  'interior-designs': {
    key: 'interior-designs',
    tableName: 'interior_designs',
    name: 'Interior Design',
    description: 'Generate interior design concepts and specifications',
    icon: '\ud83c\udfa8',
    fields: [
      { name: 'space_type', label: 'Space Type', type: 'select', required: true, options: ['living-room', 'bedroom', 'kitchen', 'bathroom', 'office', 'lobby', 'restaurant', 'retail', 'conference-room', 'open-office'] },
      { name: 'design_style', label: 'Design Style', type: 'select', required: true, options: ['modern', 'contemporary', 'traditional', 'transitional', 'industrial', 'scandinavian', 'mid-century', 'bohemian', 'minimalist', 'biophilic'] },
      { name: 'area_sqft', label: 'Area (sq ft)', type: 'number', required: true },
      { name: 'budget_level', label: 'Budget Level', type: 'select', required: true, options: ['budget', 'mid-range', 'high-end', 'luxury'] },
      { name: 'color_palette', label: 'Color Palette Preference', type: 'select', required: false, options: ['neutral-warm', 'neutral-cool', 'bold-vibrant', 'earth-tones', 'monochromatic', 'pastel', 'jewel-tones'] },
      { name: 'special_needs', label: 'Special Needs / Preferences', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Create an interior design concept for:
- Space type: ${d.space_type || 'living-room'}
- Design style: ${d.design_style || 'modern'}
- Area: ${d.area_sqft || 'not specified'} sq ft
- Budget level: ${d.budget_level || 'mid-range'}
- Color palette: ${d.color_palette || 'neutral-warm'}
- Special needs: ${d.special_needs || 'none'}

Provide comprehensive interior design recommendations:
1. Design concept and mood description
2. Color scheme with specific paint/material colors
3. Furniture selection and layout
4. Material and finish specifications
5. Lighting integration
6. Art and accessories recommendations
7. Estimated budget breakdown

Return as JSON with keys: designConcept, colorScheme, furnitureLayout, materials, lightingIntegration, accessories, budgetBreakdown, moodDescription.`;
    },
  },

  'landscape-designs': {
    key: 'landscape-designs',
    tableName: 'landscape_designs',
    name: 'Landscape Design',
    description: 'Design exterior landscapes, gardens, and outdoor spaces',
    icon: '\ud83c\udf33',
    fields: [
      { name: 'site_area', label: 'Site Area (acres)', type: 'number', required: true },
      { name: 'climate', label: 'Climate Region', type: 'select', required: true, options: ['tropical', 'subtropical', 'mediterranean', 'temperate', 'continental', 'arid', 'subarctic'] },
      { name: 'style', label: 'Landscape Style', type: 'select', required: true, options: ['formal', 'naturalistic', 'japanese', 'mediterranean', 'contemporary', 'xeriscape', 'cottage', 'tropical'] },
      { name: 'water_feature', label: 'Water Features', type: 'select', required: false, options: ['none', 'fountain', 'pond', 'stream', 'pool', 'rain-garden', 'multiple'] },
      { name: 'irrigation', label: 'Irrigation System', type: 'select', required: false, options: ['drip', 'sprinkler', 'smart-irrigation', 'rainwater-harvest', 'none'] },
      { name: 'requirements', label: 'Special Requirements', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Design a landscape plan for:
- Site area: ${d.site_area || 'not specified'} acres
- Climate: ${d.climate || 'temperate'}
- Style: ${d.style || 'contemporary'}
- Water features: ${d.water_feature || 'none'}
- Irrigation: ${d.irrigation || 'smart-irrigation'}
- Requirements: ${d.requirements || 'none'}

Provide comprehensive landscape design:
1. Plant palette and planting plan
2. Hardscape design (paths, patios, walls)
3. Grading and drainage plan
4. Irrigation system design
5. Outdoor lighting plan
6. Sustainability and native planting strategy
7. Maintenance schedule and estimated costs

Return as JSON with keys: plantPalette, hardscape, gradingDrainage, irrigationDesign, outdoorLighting, sustainability, maintenancePlan, estimatedCost.`;
    },
  },

  'construction-timelines': {
    key: 'construction-timelines',
    tableName: 'construction_timelines',
    name: 'Construction Timeline',
    description: 'Generate detailed construction schedules and milestones',
    icon: '\ud83d\udcc5',
    fields: [
      { name: 'project_type', label: 'Project Type', type: 'select', required: true, options: ['residential', 'commercial', 'industrial', 'institutional', 'mixed-use', 'renovation'] },
      { name: 'area_sqft', label: 'Total Area (sq ft)', type: 'number', required: true },
      { name: 'stories', label: 'Number of Stories', type: 'number', required: true },
      { name: 'construction_method', label: 'Construction Method', type: 'select', required: true, options: ['traditional', 'modular', 'prefabricated', 'tilt-up', 'steel-erection', 'design-build'] },
      { name: 'start_season', label: 'Planned Start Season', type: 'select', required: false, options: ['spring', 'summer', 'fall', 'winter'] },
      { name: 'constraints', label: 'Schedule Constraints', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Create a construction timeline for:
- Project type: ${d.project_type || 'commercial'}
- Total area: ${d.area_sqft || 'not specified'} sq ft
- Stories: ${d.stories || 1}
- Construction method: ${d.construction_method || 'traditional'}
- Planned start: ${d.start_season || 'spring'}
- Constraints: ${d.constraints || 'none'}

Provide detailed construction schedule:
1. Pre-construction phase (permits, procurement)
2. Site preparation and foundation
3. Structural framing timeline
4. Envelope and weather-tightness
5. MEP rough-in schedule
6. Interior finishes timeline
7. Commissioning and closeout
8. Critical path analysis

Return as JSON with keys: preConstruction, sitePrep, structuralFraming, envelope, mepRoughIn, interiorFinishes, commissioning, criticalPath, totalDuration, milestones.`;
    },
  },

  'parking-designs': {
    key: 'parking-designs',
    tableName: 'parking_designs',
    name: 'Parking Design',
    description: 'Design parking structures, lots, and traffic flow systems',
    icon: '\ud83c\udd7f\ufe0f',
    fields: [
      { name: 'parking_type', label: 'Parking Type', type: 'select', required: true, options: ['surface-lot', 'parking-garage', 'underground', 'automated', 'mixed'] },
      { name: 'capacity', label: 'Target Capacity (spaces)', type: 'number', required: true },
      { name: 'vehicle_types', label: 'Vehicle Types', type: 'select', required: true, options: ['cars-only', 'cars-and-trucks', 'mixed-fleet', 'ev-priority', 'bicycle-included'] },
      { name: 'ev_percentage', label: 'EV Charging (%)', type: 'number', required: false },
      { name: 'ada_spaces', label: 'ADA Accessible Spaces', type: 'number', required: false },
      { name: 'special_requirements', label: 'Special Requirements', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Design a parking facility for:
- Parking type: ${d.parking_type || 'parking-garage'}
- Target capacity: ${d.capacity || 'not specified'} spaces
- Vehicle types: ${d.vehicle_types || 'cars-only'}
- EV charging: ${d.ev_percentage || 10}%
- ADA spaces: ${d.ada_spaces || 'per code'}
- Requirements: ${d.special_requirements || 'none'}

Provide comprehensive parking design:
1. Layout and space configuration
2. Traffic flow and circulation patterns
3. Structural system (if garage)
4. Lighting and security design
5. Signage and wayfinding
6. EV charging infrastructure
7. ADA compliance and accessibility
8. Estimated cost analysis

Return as JSON with keys: layoutConfig, trafficFlow, structuralSystem, lightingSecurity, signage, evInfrastructure, adaCompliance, costAnalysis, totalArea.`;
    },
  },

  'acoustic-analyses': {
    key: 'acoustic-analyses',
    tableName: 'acoustic_analyses',
    name: 'Acoustic Analysis',
    description: 'Analyze and design acoustic environments for buildings',
    icon: '\ud83d\udd0a',
    fields: [
      { name: 'space_type', label: 'Space Type', type: 'select', required: true, options: ['concert-hall', 'theater', 'classroom', 'office', 'restaurant', 'residential', 'recording-studio', 'worship', 'conference-room'] },
      { name: 'area_sqft', label: 'Area (sq ft)', type: 'number', required: true },
      { name: 'ceiling_height', label: 'Ceiling Height (ft)', type: 'number', required: true },
      { name: 'noise_criteria', label: 'Target Noise Criteria', type: 'select', required: true, options: ['NC-15 (studio)', 'NC-20 (concert)', 'NC-25 (church)', 'NC-30 (classroom)', 'NC-35 (office)', 'NC-40 (restaurant)', 'NC-45 (retail)'] },
      { name: 'adjacent_noise', label: 'Adjacent Noise Sources', type: 'select', required: false, options: ['highway', 'railway', 'airport', 'mechanical-equipment', 'nightclub', 'quiet-neighborhood', 'urban-street'] },
      { name: 'requirements', label: 'Acoustic Requirements', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Perform an acoustic analysis for:
- Space type: ${d.space_type || 'office'}
- Area: ${d.area_sqft || 'not specified'} sq ft
- Ceiling height: ${d.ceiling_height || 10} ft
- Target noise criteria: ${d.noise_criteria || 'NC-35 (office)'}
- Adjacent noise: ${d.adjacent_noise || 'urban-street'}
- Requirements: ${d.requirements || 'none'}

Provide comprehensive acoustic analysis:
1. Reverberation time (RT60) analysis
2. Sound transmission class (STC) requirements
3. Wall and floor assembly recommendations
4. Acoustic treatment materials
5. HVAC noise control measures
6. Impact insulation class (IIC) requirements
7. Speech privacy and intelligibility analysis

Return as JSON with keys: reverberationTime, stcRequirements, wallAssemblies, acousticTreatments, hvacNoiseControl, iicRequirements, speechPrivacy, recommendations.`;
    },
  },

  'fire-safety-analyses': {
    key: 'fire-safety-analyses',
    tableName: 'fire_safety_analyses',
    name: 'Fire Safety Analysis',
    description: 'Comprehensive fire protection and life safety analysis',
    icon: '\ud83d\udd25',
    fields: [
      { name: 'building_type', label: 'Building Type', type: 'select', required: true, options: ['high-rise', 'mid-rise', 'low-rise', 'industrial', 'assembly', 'healthcare', 'educational', 'residential'] },
      { name: 'construction_type', label: 'Construction Type', type: 'select', required: true, options: ['Type-I-Fire-Resistive', 'Type-II-Non-Combustible', 'Type-III-Ordinary', 'Type-IV-Heavy-Timber', 'Type-V-Wood-Frame'] },
      { name: 'area_sqft', label: 'Total Area (sq ft)', type: 'number', required: true },
      { name: 'occupant_load', label: 'Estimated Occupant Load', type: 'number', required: true },
      { name: 'sprinkler_system', label: 'Sprinkler System', type: 'select', required: false, options: ['NFPA-13', 'NFPA-13R', 'NFPA-13D', 'none', 'partial'] },
      { name: 'special_hazards', label: 'Special Hazards', type: 'textarea', required: false },
    ],
    aiPromptTemplate: (item) => {
      const d = item.data || {};
      return `Perform fire safety analysis for:
- Building type: ${d.building_type || 'mid-rise'}
- Construction type: ${d.construction_type || 'Type-II-Non-Combustible'}
- Total area: ${d.area_sqft || 'not specified'} sq ft
- Occupant load: ${d.occupant_load || 'not specified'}
- Sprinkler system: ${d.sprinkler_system || 'NFPA-13'}
- Special hazards: ${d.special_hazards || 'none'}

Provide comprehensive fire safety analysis:
1. Fire resistance rating requirements
2. Means of egress analysis (exit capacity, travel distance)
3. Fire suppression system design
4. Fire alarm and detection system
5. Smoke control and management
6. Fire department access requirements
7. Emergency lighting and signage
8. Code compliance checklist

Return as JSON with keys: fireResistance, egressAnalysis, suppressionSystem, alarmDetection, smokeControl, fireDeptAccess, emergencyLighting, complianceChecklist, overallRating.`;
    },
  },
};

module.exports = features;
