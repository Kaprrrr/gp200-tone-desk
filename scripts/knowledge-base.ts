// GP-200 Complete Knowledge Base
// Maps Valeton effect names to real-world pedals they're modeled after
// This data is used by the AI to recommend the correct GP-200 settings

export interface EffectInfo {
  name: string;           // GP-200 display name
  type: string;           // Effect type (Compressor, Boost, Overdrive, etc.)
  basedOn: string;        // Real-world pedal/amp it's modeled after
  description?: string;   // Additional notes
  block: 'PRE' | 'WAH' | 'DST' | 'AMP' | 'CAB' | 'NR' | 'EQ' | 'MOD' | 'DLY' | 'REV';
}

// ============================================
// PRE BLOCK - Compressors, Boosts, Overdrives, Filters, Pitch, Special
// ============================================
export const PRE_EFFECTS: EffectInfo[] = [
  // Compressors
  { name: 'COMP', type: 'Compressor', basedOn: 'Ross Compressor', block: 'PRE' },
  { name: 'COMP4', type: 'Compressor', basedOn: 'Keeley C4 Compressor', block: 'PRE' },
  { name: 'S-Comp', type: 'Compressor', basedOn: 'VALETON', description: 'Flexible, fully adjustable compressor effect', block: 'PRE' },

  // Boosts
  { name: 'Micro Boost', type: 'Boost', basedOn: 'MXR M133 Micro Amp', block: 'PRE' },
  { name: 'AC Boost', type: 'Boost', basedOn: 'Xotic AC Booster', block: 'PRE' },
  { name: 'B-Boost', type: 'Boost', basedOn: 'Xotic BB Preamp', block: 'PRE' },
  { name: 'P-Boost', type: 'Boost', basedOn: 'Xotic RC Booster', block: 'PRE' },
  { name: '14 Boost', type: 'Boost', basedOn: 'Fortin Grind Booster', block: 'PRE' },
  { name: 'FAT BB', type: 'Boost', basedOn: 'Xotic BB Preamp variant', description: 'Boost with low-cut filter and bass/treble control', block: 'PRE' },
  { name: 'Boost', type: 'Boost', basedOn: 'Xotic EP Booster', block: 'PRE' },

  // Overdrives in PRE block
  { name: 'OD 9', type: 'Overdrive', basedOn: 'Ibanez Tube Screamer TS9', block: 'PRE' },
  { name: 'Yellow OD', type: 'Overdrive', basedOn: 'Boss OD-1 Overdrive', block: 'PRE' },
  { name: 'Penesas', type: 'Overdrive', basedOn: 'Klon Centaur', block: 'PRE' },
  { name: 'Super OD', type: 'Overdrive', basedOn: 'Boss Super Overdrive SD-1', block: 'PRE' },
  { name: 'Blues OD', type: 'Overdrive', basedOn: 'Boss Blues Driver BD-2', block: 'PRE' },

  // Acoustic
  { name: 'AC Refiner', type: 'Acoustic', basedOn: 'VALETON', description: 'Acoustic guitar effect', block: 'PRE' },
  { name: 'AC Sim', type: 'Acoustic', basedOn: 'VALETON', description: 'Acoustic Simulator', block: 'PRE' },

  // Filters
  { name: 'T-Wah', type: 'Filter', basedOn: 'VALETON', description: 'Touch Wah', block: 'PRE' },
  { name: 'A-WAH', type: 'Auto Filter', basedOn: 'VALETON', description: 'Auto Wah Effect', block: 'PRE' },
  { name: 'Step Filter', type: 'Filter', basedOn: 'VALETON', description: 'Creates Synth-like sounds', block: 'PRE' },

  // Pitch
  { name: 'OCTA', type: 'Pitch', basedOn: 'VALETON', description: 'Polyphonic octave effect', block: 'PRE' },
  { name: 'Pitch', type: 'Pitch', basedOn: 'VALETON', description: 'Polyphonic pitch shifter/harmonizer', block: 'PRE' },
  { name: 'P-Bend', type: 'Pitch', basedOn: 'VALETON', description: 'Polyphonic pitch shifter with wet and harmony control', block: 'PRE' },
  { name: 'Hammy', type: 'Pitch', basedOn: 'Digitech Whammy', description: 'Monophonic pitch shifter pedal', block: 'PRE' },
  { name: 'Harmonizer 1', type: 'Pitch', basedOn: 'VALETON', description: 'Monophonic single voice automatic harmonizer with one octave shift range', block: 'PRE' },
  { name: 'Harmonizer 2', type: 'Pitch', basedOn: 'VALETON', description: 'Monophonic dual voice automatic harmonizer with one octave shift range', block: 'PRE' },

  // Special
  { name: 'Ring Mod', type: 'Special', basedOn: 'VALETON', description: 'Ring Modulation effect', block: 'PRE' },
  { name: 'Saturate', type: 'Special', basedOn: 'VALETON', description: 'Vintage tape saturation simulator', block: 'PRE' },
  { name: 'Auto Swell', type: 'Special', basedOn: 'VALETON', description: 'Auto swell effect to make the guitar sound like a violin', block: 'PRE' },
  { name: 'Hold', type: 'Special', basedOn: 'VALETON', description: 'Freeze effect to hold the note for a short period like a loop', block: 'PRE' },
];

// ============================================
// WAH BLOCK
// ============================================
export const WAH_EFFECTS: EffectInfo[] = [
  { name: 'V-Wah', type: 'Wah', basedOn: 'VOX V846 Wah Pedal', block: 'WAH' },
  { name: 'C-Wah', type: 'Wah', basedOn: 'Dunlop Cry Baby Wah Pedal', block: 'WAH' },
  { name: 'P-Wah', type: 'Wah', basedOn: 'Dunlop Cry-Baby JP95 (John Petrucci)', block: 'WAH' },
  { name: 'S-Wah', type: 'Wah', basedOn: 'VALETON', description: 'Classic Wah tone', block: 'WAH' },
  { name: 'B-Wah', type: 'Wah', basedOn: 'VALETON', description: 'Wah for Basses', block: 'WAH' },
  { name: 'Hammy', type: 'Pitch', basedOn: 'Digitech Whammy', description: 'Monophonic pitch shifter pedal', block: 'WAH' },
];

// ============================================
// DST BLOCK - Distortion/Drive
// ============================================
export const DST_EFFECTS: EffectInfo[] = [
  // Overdrives
  { name: 'Green OD', type: 'Overdrive', basedOn: 'Ibanez TS-808 Tube Screamer', block: 'DST' },
  { name: 'OD 9', type: 'Overdrive', basedOn: 'Ibanez Tube Screamer TS9', block: 'DST' },
  { name: 'Yellow OD', type: 'Overdrive', basedOn: 'Boss OD-1 Overdrive', block: 'DST' },
  { name: 'Penesas', type: 'Overdrive', basedOn: 'Klon Centaur', block: 'DST' },
  { name: 'Swarm', type: 'Overdrive', basedOn: 'Providence SOV-2 Stampede Overdrive', block: 'DST' },
  { name: 'Super OD', type: 'Overdrive', basedOn: 'Boss Super Overdrive SD-1', block: 'DST' },
  { name: 'Scream OD', type: 'Overdrive', basedOn: 'VALETON', description: 'Valeton Tube Screamer variant with additional settings', block: 'DST' },
  { name: 'Blues OD', type: 'Overdrive', basedOn: 'Boss Blues Driver BD-2', block: 'DST' },
  { name: 'Force', type: 'Overdrive', basedOn: 'Fulltone OCD', block: 'DST' },
  { name: 'Blues Master', type: 'Overdrive', basedOn: 'Marshall Blues Breaker', block: 'DST' },
  { name: 'Master OD', type: 'Overdrive', basedOn: 'Marshall JCM800', description: 'EQ, Volume and Gain from Clean to well driven JCM800', block: 'DST' },
  { name: 'Tube Clipper', type: 'Overdrive', basedOn: 'BK Butler Tube Driver', block: 'DST' },
  { name: 'TaiChi', type: 'Overdrive', basedOn: 'Hermida Zendrive', block: 'DST' },
  { name: 'Timmy OD', type: 'Overdrive', basedOn: 'Timmy Overdrive V2/V3', description: 'With Distortion mode switch', block: 'DST' },
  { name: 'Precise OD', type: 'Overdrive', basedOn: 'Horizon Devices Precision Drive', block: 'DST' },
  { name: 'Empire OD', type: 'Overdrive', basedOn: 'Analog Man Prince of Tone', block: 'DST' },

  // Fuzz
  { name: 'Lazaro', type: 'Fuzz', basedOn: 'Electro-Harmonix Big Muff Pi', block: 'DST' },
  { name: 'Red Haze', type: 'Fuzz', basedOn: 'Dallas-Arbiter Fuzz Face', block: 'DST' },
  { name: 'Sora Fuzz', type: 'Fuzz', basedOn: 'Sola Sound Tone Bender', block: 'DST' },
  { name: 'Plustortion', type: 'Fuzz', basedOn: 'MXR Distortion+ M104', block: 'DST' },

  // Distortion
  { name: 'SM Dist', type: 'Distortion', basedOn: 'Boss DS-1 Distortion', block: 'DST' },
  { name: 'Darktale', type: 'Distortion', basedOn: 'ProCo RAT (Early LM308 OP-Amp)', block: 'DST' },
  { name: 'Chief', type: 'Distortion', basedOn: 'Marshall Guv\'nor', description: 'Replicates Marshall Tube Amp Sound', block: 'DST' },
  { name: 'Master Dist', type: 'Distortion', basedOn: 'Marshall Shredmaster', block: 'DST' },
  { name: 'La Charger', type: 'Distortion', basedOn: 'MI Audio Crunch Box', block: 'DST' },
  { name: 'Revolt', type: 'Distortion', basedOn: 'Suhr Riot Distortion', block: 'DST' },
  { name: 'Flagman', type: 'Distortion', basedOn: 'Friedman BE-OD', block: 'DST' },

  // Bass Drive
  { name: 'Flex OD', type: 'Bass Drive', basedOn: 'VALETON', description: 'Distortion for guitar and basses', block: 'DST' },
  { name: 'Bass OD', type: 'Bass Drive', basedOn: 'VALETON', description: 'Overdrive, Distortion or Boost for basses', block: 'DST' },
  { name: 'Black Bass', type: 'Bass Preamp', basedOn: 'Darkglass Microtubes B7K', block: 'DST' },
  { name: 'Bass Hammer', type: 'Bass Preamp', basedOn: 'Aguilar Tone Hammer', block: 'DST' },

  // Boosts (also in DST block)
  { name: 'Micro Boost', type: 'Boost', basedOn: 'MXR M133 Micro Amp', block: 'DST' },
  { name: 'AC Boost', type: 'Boost', basedOn: 'Xotic AC Booster', block: 'DST' },
  { name: 'B-Boost', type: 'Boost', basedOn: 'Xotic BB Preamp', block: 'DST' },
  { name: 'P-Boost', type: 'Boost', basedOn: 'Xotic RC Booster', block: 'DST' },
  { name: '14 Boost', type: 'Boost', basedOn: 'Fortin Grind Booster', block: 'DST' },
  { name: 'FAT BB', type: 'Boost', basedOn: 'Xotic BB Preamp variant', block: 'DST' },
  { name: 'Boost', type: 'Boost', basedOn: 'Xotic EP Booster', block: 'DST' },
];

// ============================================
// AMP BLOCK - Amplifiers
// ============================================
export const AMP_MODELS: EffectInfo[] = [
  // Clean Amps - Fender
  { name: 'Tweedy', type: 'Clean', basedOn: 'Fender Tweed Deluxe', block: 'AMP' },
  { name: 'Bellman 59N', type: 'Clean', basedOn: 'Fender 59 Bassman Normal Channel', block: 'AMP' },
  { name: 'Bellman 59B', type: 'Drive', basedOn: 'Fender 59 Bassman Bright Channel', block: 'AMP' },
  { name: 'Dark Twin', type: 'Clean', basedOn: 'Fender 65 Twin Reverb', block: 'AMP' },
  { name: 'Dark DLX', type: 'Clean', basedOn: 'Fender Deluxe Reverb', block: 'AMP' },
  { name: 'Dark Vibra', type: 'Clean', basedOn: 'Fender Vibraverb 1963 6G16', block: 'AMP' },
  { name: 'Silver Twin', type: 'Clean', basedOn: 'Fender Silverface Twin Reverb', block: 'AMP' },

  // Supro
  { name: 'SUPDual CL', type: 'Clean', basedOn: 'Supro Dual Tone 1624T', block: 'AMP' },
  { name: 'SUPDual OD', type: 'Drive', basedOn: 'Supro Dual Tone 1624T', block: 'AMP' },

  // Vox
  { name: 'Foxy 15TB', type: 'Clean', basedOn: 'VOX AC-100 Bass Amp 4x12', block: 'AMP' },
  { name: 'Foxy 30N', type: 'Clean', basedOn: 'VOX AC30HW', block: 'AMP' },
  { name: 'Foxy 30TB', type: 'Drive', basedOn: 'VOX AC30 Top Boost', block: 'AMP' },

  // Roland
  { name: 'J-120 CL', type: 'Clean', basedOn: 'Roland Jazz Chorus JC-120', block: 'AMP' },

  // Boutique
  { name: 'Match CL', type: 'Clean', basedOn: 'Matchless Chieftain 212 Combo', block: 'AMP' },
  { name: 'Match OD', type: 'Drive', basedOn: 'Matchless Chieftain 212 Combo', block: 'AMP' },
  { name: 'L-Star CL', type: 'Clean', basedOn: 'Mesa Boogie Lone Star CH1', block: 'AMP' },
  { name: 'L-Star OD', type: 'Drive', basedOn: 'Mesa Boogie Lone Star CH2', block: 'AMP' },
  { name: 'BogSV CL', type: 'Clean', basedOn: 'Bogner Shiva 20th Anniversary CH1', block: 'AMP' },
  { name: 'BogSV OD', type: 'Drive', basedOn: 'Bogner Shiva 20th Anniversary CH2', block: 'AMP' },
  { name: 'Bog BlueV', type: 'Drive', basedOn: 'Bogner Ecstasy XTC Blue Channel', block: 'AMP' },
  { name: 'Bog BluM', type: 'Drive', basedOn: 'Bogner Ecstasy XTC Blue Channel', block: 'AMP' },
  { name: 'Bog RedV', type: 'Hi Gain', basedOn: 'Bogner Ecstasy XTC Red Channel', block: 'AMP' },
  { name: 'Bog RedM', type: 'Hi Gain', basedOn: 'Bogner Ecstasy XTC Red Channel', block: 'AMP' },
  { name: 'Z38 CL', type: 'Clean', basedOn: 'Dr. Z Maz 38 Sr. Combo', block: 'AMP' },
  { name: 'ZL38 OD', type: 'Drive', basedOn: 'Dr. Z Maz 38 Sr. Combo', block: 'AMP' },
  { name: 'Knights CL', type: 'Clean', basedOn: 'Pendragon Grindrod PG20C', block: 'AMP' },
  { name: 'Knights CL+', type: 'Clean', basedOn: 'Pendragon Grindrod PG20C', block: 'AMP' },
  { name: 'Knights OD', type: 'Drive', basedOn: 'Pendragon Grindrod PG20C', block: 'AMP' },
  { name: 'Bad-KT CL', type: 'Clean', basedOn: 'Bad Cat Hot Cat 30', block: 'AMP' },
  { name: 'Bad-KT OD', type: 'Drive', basedOn: 'Bad Cat Hot Cat 30', block: 'AMP' },

  // Soldano
  { name: 'Solo100 CL', type: 'Clean', basedOn: 'Soldano SLO100 Clean Channel', block: 'AMP' },
  { name: 'Solo100 OD', type: 'Drive', basedOn: 'Soldano SLO100 Crunch Channel', block: 'AMP' },
  { name: 'Solo100 LD', type: 'Hi Gain', basedOn: 'Soldano SLO100 Overdrive Channel', block: 'AMP' },

  // Marshall
  { name: 'UK 45', type: 'Drive', basedOn: 'Marshall JMP45 Plexi', block: 'AMP' },
  { name: 'UK 45+', type: 'Drive', basedOn: 'Marshall JMP45 Plexi', block: 'AMP' },
  { name: 'UK 45JP', type: 'Drive', basedOn: 'Marshall JMP45 Plexi', block: 'AMP' },
  { name: 'UK 50', type: 'Drive', basedOn: 'Marshall JMP50 (1966)', block: 'AMP' },
  { name: 'UK 50+', type: 'Drive', basedOn: 'Marshall JMP50 (1966)', block: 'AMP' },
  { name: 'UK 50JP', type: 'Drive', basedOn: 'Marshall JMP50 (1966)', block: 'AMP' },
  { name: 'UK SLP', type: 'Drive', basedOn: 'Marshall 1959HW Super Lead Plexi', block: 'AMP' },
  { name: 'UK 800', type: 'Drive', basedOn: 'Marshall JCM800', block: 'AMP' },
  { name: 'UK 900', type: 'Hi Gain', basedOn: 'Marshall JCM900', block: 'AMP' },

  // Friedman
  { name: 'Flagman 1', type: 'Drive', basedOn: 'Friedman Brown Eye (BE-100)', block: 'AMP' },
  { name: 'Flagman 2', type: 'Drive', basedOn: 'Friedman Brown Eye (BE-100)', block: 'AMP' },
  { name: 'Flagman+ 1', type: 'Hi Gain', basedOn: 'Friedman Brown Eye (BE-100)', block: 'AMP' },
  { name: 'Flagman+ 2', type: 'Hi Gain', basedOn: 'Friedman Brown Eye (BE-100)', block: 'AMP' },

  // Mesa Boogie
  { name: 'Mess2C+ 1', type: 'Drive', basedOn: 'Mesa/Boogie Mark IIC+', block: 'AMP' },
  { name: 'Mess2C+ 2', type: 'Drive', basedOn: 'Mesa/Boogie Mark IIC+', block: 'AMP' },
  { name: 'Mess2C+ 3', type: 'Drive', basedOn: 'Mesa/Boogie Mark IIC+', block: 'AMP' },
  { name: 'Mess4 LD 1', type: 'Hi Gain', basedOn: 'Mesa/Boogie Mark IV', block: 'AMP' },
  { name: 'Mess4 LD 2', type: 'Hi Gain', basedOn: 'Mesa/Boogie Mark IV', block: 'AMP' },
  { name: 'Mess4 LD 3', type: 'Hi Gain', basedOn: 'Mesa/Boogie Mark IV', block: 'AMP' },
  { name: 'Mess DualV', type: 'Hi Gain', basedOn: 'Mesa/Boogie Dual Rectifier Vintage', block: 'AMP' },
  { name: 'Mess DualM', type: 'Hi Gain', basedOn: 'Mesa/Boogie Dual Rectifier Modern', block: 'AMP' },

  // Orange
  { name: 'Juice30 OD', type: 'Drive', basedOn: 'Orange AD30', block: 'AMP' },
  { name: 'Juice R100', type: 'Hi Gain', basedOn: 'Orange Rockerverb 100', block: 'AMP' },

  // EVH/Peavey
  { name: 'EV 51', type: 'Hi Gain', basedOn: 'Peavey 5150 / EVH 5150', block: 'AMP' },

  // ENGL
  { name: 'Eagle 120', type: 'Hi Gain', basedOn: 'ENGL Savage 120', block: 'AMP' },
  { name: 'Eagle 120+', type: 'Hi Gain', basedOn: 'ENGL Savage 120', block: 'AMP' },
  { name: 'Power LD', type: 'Hi Gain', basedOn: 'ENGL Powerball II E645/2', block: 'AMP' },

  // Diezel
  { name: 'Dizz VH', type: 'Hi Gain', basedOn: 'Diezel VH4', block: 'AMP' },
  { name: 'Dizz VH S', type: 'Hi Gain', basedOn: 'Diezel VH4', block: 'AMP' },
  { name: 'Dizz VH+', type: 'Hi Gain', basedOn: 'Diezel VH4', block: 'AMP' },
  { name: 'Dizz VH+ S', type: 'Hi Gain', basedOn: 'Diezel VH4', block: 'AMP' },

  // Bass Amps
  { name: 'Classic Bass', type: 'Bass', basedOn: 'Ampeg SVT', block: 'AMP' },
  { name: 'Foxy Bass', type: 'Bass', basedOn: 'VOX AC-100 Bass Amp', block: 'AMP' },
  { name: 'Mess Bass', type: 'Bass', basedOn: 'Mesa/Boogie Bass 400', block: 'AMP' },
  { name: 'Mini Bass', type: 'Bass', basedOn: 'Ampeg B-15 Portaflex', block: 'AMP' },
  { name: 'Bass Pre', type: 'Bass', basedOn: 'Alembic F-2B Bass Preamp', block: 'AMP' },

  // Acoustic
  { name: 'AC Pre', type: 'Acoustic', basedOn: 'AER Colourizer 2 (EQ 90-1.6kHz)', block: 'AMP' },
  { name: 'AC Pre 2', type: 'Acoustic', basedOn: 'AER Colourizer 2 (EQ 680Hz-11kHz)', block: 'AMP' },
];

// ============================================
// CAB BLOCK - Cabinets
// ============================================
export const CAB_MODELS: EffectInfo[] = [
  // Small Cabs
  { name: 'SUP ZEP', type: '1x6"', basedOn: 'Supro 1x6" Cabinet with Oval Speaker', block: 'CAB' },
  { name: 'TWD CP', type: '1x8"', basedOn: 'Fender Champ 1x8" Cabinet', block: 'CAB' },
  { name: 'TWD PRC', type: '1x10"', basedOn: 'Fender Princeton 1x10" Cabinet', block: 'CAB' },
  { name: 'TWD SUP', type: '2x10"', basedOn: 'Fender Tweed 2x10" Cabinet', block: 'CAB' },

  // Fender 1x12
  { name: 'TWD LUX', type: '1x12"', basedOn: 'Fender Tweed Deluxe 1x12" Cabinet', block: 'CAB' },
  { name: 'Dark Lux', type: '1x12"', basedOn: 'Fender Deluxe 1x12" Cabinet', block: 'CAB' },
  { name: 'Dark VIT', type: '1x12"', basedOn: 'Fender Vibrolux 1x12" Cabinet', block: 'CAB' },

  // Fender 2x12
  { name: 'Dark Twin', type: '2x12"', basedOn: 'Fender 65 Twin Reverb 2x12" Cabinet', block: 'CAB' },
  { name: 'Dark CS', type: '2x12"', basedOn: 'Custom Modified Fender 2x12" Cabinet', block: 'CAB' },
  { name: 'Bellman 1', type: '2x12"', basedOn: 'Fender Piggyback Bassman 2x12" Cabinet', block: 'CAB' },
  { name: 'Bellman 2', type: '4x10"', basedOn: 'Fender 59 Bassman 4x10" Cabinet', block: 'CAB' },

  // Roland
  { name: 'J-120', type: '2x12"', basedOn: 'Roland Jazz Chorus 2x12" Cabinet', block: 'CAB' },

  // Marshall
  { name: 'UK G12', type: '1x12"', basedOn: 'Marshall 1x12" Cabinet', block: 'CAB' },
  { name: 'UK GRN 1', type: '2x12"', basedOn: 'Marshall 2550 2x12" Cabinet', block: 'CAB' },
  { name: 'UK LD', type: '4x12"', basedOn: 'Marshall 1960AV 4x12" Cabinet', block: 'CAB' },
  { name: 'UK TD', type: '4x12"', basedOn: 'Marshall 1968 Basketweave 4x12" Cabinet', block: 'CAB' },
  { name: 'UK MD', type: '4x12"', basedOn: 'Custom Modified Marshall 4x12" Cabinet', block: 'CAB' },
  { name: 'UK GRN 2', type: '4x12"', basedOn: 'Marshall 4x12" with Celestion Greenbacks', block: 'CAB' },
  { name: 'UK 75', type: '4x12"', basedOn: 'Marshall 4x12" with Celestion G12T-75', block: 'CAB' },
  { name: 'UK Dark', type: '4x12"', basedOn: '1968 Marshall 4x12" Cabinet', block: 'CAB' },

  // Vox
  { name: 'Foxy 1', type: '1x12"', basedOn: 'VOX AC15 1x12" Cabinet', block: 'CAB' },
  { name: 'Foxy 2', type: '2x12"', basedOn: 'VOX AC30 2x12" Cabinet', block: 'CAB' },

  // Boutique
  { name: 'ROUT', type: '2x12"', basedOn: 'Carr Rambler 1x12" Cabinet', block: 'CAB' },
  { name: 'BogSV', type: '1x12"', basedOn: 'Bogner Shiva 1x12" Cabinet', block: 'CAB' },
  { name: 'Bad-KT', type: '1x12"', basedOn: 'Bad Cat Hot Cat 1x12" Cabinet', block: 'CAB' },
  { name: 'Match', type: '1x12"', basedOn: 'Matchless Chieftain 2x12" Cabinet', block: 'CAB' },
  { name: 'Tom Open', type: '1x12"', basedOn: 'Swart Atomic Space 1x12" Cabinet', block: 'CAB' },
  { name: 'ACE', type: '1x12"', basedOn: 'Morgan AC-20 Delux 1x12" Cabinet', block: 'CAB' },

  // Mesa
  { name: 'Mess', type: '4x12"', basedOn: 'Mesa/Boogie Rectifier 4x12" Cabinet', block: 'CAB' },
  { name: 'D Star', type: '1x12"', basedOn: 'Mesa/Boogie Lonestar 1x12" Cabinet', block: 'CAB' },
  { name: 'SUP Star', type: '2x12"', basedOn: 'Mesa/Boogie Lonestar 2x12" Cabinet', block: 'CAB' },
  { name: 'US STO', type: '1x12"', basedOn: '1980s Mesa/Boogie 1x12" Cabinet', block: 'CAB' },

  // More 2x12
  { name: 'BOUTI', type: '2x12"', basedOn: 'VALETON Custom 2x12" Cabinet', block: 'CAB' },
  { name: 'SUP', type: '2x12"', basedOn: 'Supro 1624T 2x12" Cabinet', block: 'CAB' },
  { name: 'MATT TWD', type: '2x12"', basedOn: 'Matchless 2x12" Cabinet', block: 'CAB' },
  { name: 'Freed', type: '2x12"', basedOn: 'Fryette Deliverance 2x12" Cabinet', block: 'CAB' },
  { name: 'DB Rock', type: '2x12"', basedOn: 'Two-Rock 2x12" Cabinet', block: 'CAB' },
  { name: 'Blue SK', type: '2x12"', basedOn: 'Custom 2x12" with Celestion Alnico Blues', block: 'CAB' },

  // 4x12 High Gain
  { name: 'EV', type: '4x12"', basedOn: 'Peavey 6505 4x12" Cabinet', block: 'CAB' },
  { name: 'Bog', type: '4x12"', basedOn: 'Bogner 4x12" Cabinet', block: 'CAB' },
  { name: 'Eagle', type: '4x12"', basedOn: 'ENGL 4x12" Cabinet', block: 'CAB' },
  { name: 'Uban', type: '4x12"', basedOn: 'Bogner Uberkab 4x12" Cabinet', block: 'CAB' },
  { name: 'Solo', type: '4x12"', basedOn: 'Soldano 4x12" Cabinet', block: 'CAB' },
  { name: 'Juice', type: '4x12"', basedOn: 'Orange PPC412 4x12" Cabinet', block: 'CAB' },
  { name: 'H-WAY', type: '4x12"', basedOn: 'Hiwatt SE4123 4x12" Cabinet', block: 'CAB' },
  { name: 'Way', type: '4x12"', basedOn: 'WEM 4x12" Cabinet', block: 'CAB' },
  { name: 'Dumb', type: '4x12"', basedOn: 'Dumble 4x12" Cabinet', block: 'CAB' },
  { name: 'Dizz', type: '4x12"', basedOn: 'Diezel 4x12" Cabinet', block: 'CAB' },
  { name: 'TRP', type: '4x12"', basedOn: 'Hughes & Kettner Triamp 4x12" Cabinet', block: 'CAB' },
  { name: 'King', type: '4x12"', basedOn: 'Mesa/Boogie Road King 4x12" Cabinet', block: 'CAB' },

  // Bass Cabinets
  { name: 'ADM 1', type: '1x12"', basedOn: 'Eden 1x15" Bass Cabinet', block: 'CAB' },
  { name: 'ADM 2', type: '4x10"', basedOn: 'Eden 4x10" Bass Cabinet', block: 'CAB' },
  { name: 'Workman 1', type: '1x15"', basedOn: 'SWR 1x15" Bass Cabinet', block: 'CAB' },
  { name: 'Workman 2', type: '4x10"', basedOn: 'SWR Workingmans 4x10" Bass Cabinet', block: 'CAB' },
  { name: 'US BASS', type: '2x10"', basedOn: 'Mesa/Boogie 2x10" Bass Cabinet', block: 'CAB' },
  { name: 'MATT', type: '2x10"', basedOn: 'Markbass 2x10" Bass Cabinet', block: 'CAB' },
  { name: 'F-TOP', type: '1x15"', basedOn: 'Ampeg PF-115HE 1x15" Bass Cabinet', block: 'CAB' },
  { name: 'AMPG 1', type: '4x10"', basedOn: 'Ampeg SVT-410HE 4x10" Bass Cabinet', block: 'CAB' },
  { name: 'AMPG 2', type: '8x10"', basedOn: 'Ampeg SVT-810E 8x10" Bass Cabinet', block: 'CAB' },
  { name: 'HACK', type: '4x12"', basedOn: 'Hartke 4x12" Bass Cabinet', block: 'CAB' },

  // Acoustic Simulations
  { name: 'AC', type: 'Acoustic', basedOn: 'Dreadnought Guitar Simulation 1', block: 'CAB' },
  { name: 'AC Dream', type: 'Acoustic', basedOn: 'Dreadnought Guitar Simulation 2', block: 'CAB' },
  { name: 'OM', type: 'Acoustic', basedOn: 'OM Type Acoustic Guitar', block: 'CAB' },
  { name: 'Jumbo', type: 'Acoustic', basedOn: 'Jumbo Acoustic Guitar', block: 'CAB' },
  { name: 'Bird', type: 'Acoustic', basedOn: 'Gibson Hummingbird Acoustic', block: 'CAB' },
  { name: 'GA', type: 'Acoustic', basedOn: 'GA Type Acoustic Guitar', block: 'CAB' },
  { name: 'Classic AC', type: 'Acoustic', basedOn: 'Classical Nylon String Guitar', block: 'CAB' },
  { name: 'Mandolin', type: 'Acoustic', basedOn: 'Mandolin Simulation', block: 'CAB' },
  { name: 'Fretless Bass', type: 'Acoustic', basedOn: 'Fretless Acoustic Bass', block: 'CAB' },
  { name: 'Double Bass', type: 'Acoustic', basedOn: 'Upright Double Bass', block: 'CAB' },
];

// ============================================
// NR BLOCK - Noise Reduction
// ============================================
export const NR_EFFECTS: EffectInfo[] = [
  { name: 'Gate 1', type: 'Gate', basedOn: 'ISP Decimator', block: 'NR' },
  { name: 'Gate 2', type: 'Gate', basedOn: 'VALETON', description: 'Flexible noise gate with attack and release control', block: 'NR' },
  { name: 'Auto Swell', type: 'Special', basedOn: 'VALETON', description: 'Auto swell effect to make the guitar sound like a violin', block: 'NR' },
];

// ============================================
// EQ BLOCK - Equalizers
// ============================================
export const EQ_EFFECTS: EffectInfo[] = [
  { name: 'Guitar EQ 1', type: 'EQ', basedOn: 'VALETON', description: '5 Band Equalizer for Guitar', block: 'EQ' },
  { name: 'Guitar EQ 2', type: 'EQ', basedOn: 'VALETON', description: '5 Band Equalizer for Guitar', block: 'EQ' },
  { name: 'Bass EQ 1', type: 'EQ', basedOn: 'VALETON', description: '5 Band Equalizer for Bass', block: 'EQ' },
  { name: 'Bass EQ 2', type: 'EQ', basedOn: 'VALETON', description: '5 Band Equalizer for Bass', block: 'EQ' },
  { name: 'Mess EQ', type: 'EQ', basedOn: 'Mesa/Boogie 5-Band EQ', description: '5 Band EQ Based on Mesa/Boogie amp module', block: 'EQ' },
  { name: 'Hyper EQ', type: 'EQ', basedOn: 'VALETON', description: '10 Band Equalizer for Guitar and Bass', block: 'EQ' },
];

// ============================================
// MOD BLOCK - Modulation
// ============================================
export const MOD_EFFECTS: EffectInfo[] = [
  // Chorus
  { name: 'G-Chorus', type: 'Chorus', basedOn: 'Roland Chorus Ensemble CE-1', block: 'MOD' },
  { name: 'C-Chorus', type: 'Chorus', basedOn: 'Boss Dimension C DC-2', block: 'MOD' },
  { name: 'M-Chorus', type: 'Chorus', basedOn: 'Boss Chorus Ensemble CE-5', block: 'MOD' },

  // Flanger
  { name: 'Jet', type: 'Flanger', basedOn: 'Boss Flanger BF-2', block: 'MOD' },
  { name: 'B-Jet', type: 'Flanger', basedOn: 'Boss Flanger BF-2', block: 'MOD' },
  { name: 'N-Jet', type: 'Flanger', basedOn: 'Boss Flanger BF-2', block: 'MOD' },
  { name: 'Trem Jet', type: 'Flanger', basedOn: 'VALETON', description: 'Combined Flanger and Tremolo', block: 'MOD' },

  // Vibrato
  { name: 'V-Roto', type: 'Vibrato', basedOn: 'Boss Vibrato VB-2', block: 'MOD' },
  { name: 'G-Roto', type: 'Vibrato', basedOn: 'Roland Chorus Ensemble Vibrato Mode', block: 'MOD' },
  { name: 'Vibrato', type: 'Vibrato', basedOn: 'Boss Vibrato VB-2', description: 'With wider range selectable', block: 'MOD' },
  { name: 'Vibrato T', type: 'Vibrato', basedOn: 'VALETON', description: 'Touch-sensitive pitch modulation', block: 'MOD' },

  // Phaser
  { name: 'O-Phase', type: 'Phaser', basedOn: 'MXR M101 Phase 90', block: 'MOD' },
  { name: 'G-Phase', type: 'Phaser', basedOn: 'Boss Phaser PH-1', block: 'MOD' },
  { name: 'S-Phaser', type: 'Phaser', basedOn: 'Electro-Harmonix Small Stone Phaser', block: 'MOD' },
  { name: 'Pan Phase', type: 'Phaser', basedOn: 'VALETON', description: 'Subtle phaser with tremolo/pan variations', block: 'MOD' },
  { name: 'M-Vibe', type: 'Phaser', basedOn: 'Voodoo Lab Micro Vibe / Uni-Vibe', block: 'MOD' },
  { name: 'Vibe', type: 'Phaser', basedOn: 'Shin-Ei Uni-Vibe', block: 'MOD' },

  // Tremolo
  { name: 'O-Trem', type: 'Tremolo', basedOn: 'Demeter TRM-1 Tremulator', block: 'MOD' },
  { name: 'Sine Trem', type: 'Tremolo', basedOn: 'VALETON', description: 'Sine Wave Tremolo with wide range', block: 'MOD' },
  { name: 'Triangle Trem', type: 'Tremolo', basedOn: 'VALETON', description: 'Triangle Wave Tremolo with wide range', block: 'MOD' },
  { name: 'Bias Trem', type: 'Tremolo', basedOn: 'VALETON', description: 'Bias Tremolo Wave with wide range', block: 'MOD' },

  // Special MOD
  { name: 'Detune', type: 'Pitch', basedOn: 'VALETON', description: 'Creates chorus-like tone by combining shifted signal with original', block: 'MOD' },
  { name: 'Bit Smash', type: 'Special', basedOn: 'VALETON', description: 'Sample reducing/bitcrusher effect', block: 'MOD' },
  { name: 'Auto Swell', type: 'Special', basedOn: 'VALETON', description: 'Auto swell for violin-like sounds', block: 'MOD' },
  { name: 'Hold', type: 'Special', basedOn: 'VALETON', description: 'Freeze effect like a loop', block: 'MOD' },
  { name: 'Saturate', type: 'Special', basedOn: 'VALETON', description: 'Freeze effect holding sound at activation', block: 'MOD' },
];

// ============================================
// DLY BLOCK - Delay
// ============================================
export const DLY_EFFECTS: EffectInfo[] = [
  { name: 'BBD Delay S', type: 'Delay', basedOn: 'Boss DM-3 Analog Delay', description: 'Bucket Brigade analog delay with degrading repeats', block: 'DLY' },
  { name: 'Digital Delay S', type: 'Delay', basedOn: 'Boss DD-3 Digital Delay', description: 'Stereo digital delay with clean repeats', block: 'DLY' },
  { name: 'Tape Delay S', type: 'Delay', basedOn: 'Roland Space Echo RE-201', block: 'DLY' },
  { name: 'Ambience 1', type: 'Delay', basedOn: 'Electro-Harmonix Deluxe Memory Man', block: 'DLY' },
  { name: 'Ambience 2', type: 'Delay', basedOn: 'Electro-Harmonix Deluxe Memory Man', block: 'DLY' },
  { name: 'Pure', type: 'Delay', basedOn: 'Solid State Tape Echo', block: 'DLY' },
  { name: 'Analog', type: 'Delay', basedOn: 'Solid State Tape Echo', block: 'DLY' },
  { name: 'Tape', type: 'Delay', basedOn: 'Solid State Tape Echo', block: 'DLY' },
  { name: 'Ping Pong', type: 'Delay', basedOn: 'Solid State Tape Echo', description: 'Stereo ping-pong delay', block: 'DLY' },
  { name: 'Slapback', type: 'Delay', basedOn: 'VALETON', description: 'Short slapback delay', block: 'DLY' },
  { name: 'Sweep Echo', type: 'Delay', basedOn: 'VALETON', description: 'Delay with filter sweep', block: 'DLY' },
  { name: 'Ring Echo', type: 'Delay', basedOn: 'VALETON', description: 'Delay with ring modulation', block: 'DLY' },
  { name: 'Tube', type: 'Delay', basedOn: 'Binson Echorec', description: 'Tube-driven tape delay machine', block: 'DLY' },
  { name: 'M-Echo', type: 'Delay', basedOn: 'Boss DM-2 Analog Delay', description: 'First Boss Bucket Brigade delay', block: 'DLY' },
  { name: 'Sweet Echo', type: 'Delay', basedOn: 'Maxon AD999 Analog Delay', block: 'DLY' },
  { name: '999 Echo', type: 'Delay', basedOn: 'MXR Digital Delay Rack', block: 'DLY' },
  { name: 'Vintage Rack', type: 'Delay', basedOn: 'MXR Digital Delay Rack', block: 'DLY' },
  { name: 'Lofi Echo', type: 'Delay', basedOn: 'VALETON', description: 'Delay with lo-fi degraded repeats', block: 'DLY' },
  { name: 'Rev Echo', type: 'Delay', basedOn: 'VALETON', description: 'Reverse delay effect', block: 'DLY' },
  { name: 'Dual Echo', type: 'Delay', basedOn: 'Keeley Halo', description: 'Dual delay for Andy Timmons Halo-style tones', block: 'DLY' },
  { name: 'Ice Delay', type: 'Delay', basedOn: 'VALETON', description: 'Shimmer/octave delay effect', block: 'DLY' },
];

// ============================================
// REV BLOCK - Reverb
// ============================================
export const REV_EFFECTS: EffectInfo[] = [
  { name: 'Room', type: 'Reverb', basedOn: 'VALETON', description: 'Small room reverb', block: 'REV' },
  { name: 'Hall', type: 'Reverb', basedOn: 'VALETON', description: 'Concert hall reverb', block: 'REV' },
  { name: 'Church', type: 'Reverb', basedOn: 'VALETON', description: 'Large cathedral reverb', block: 'REV' },
  { name: 'Plate', type: 'Reverb', basedOn: 'VALETON', description: 'Classic plate reverb', block: 'REV' },
  { name: 'Spring', type: 'Reverb', basedOn: 'VALETON', description: 'Spring tank reverb', block: 'REV' },
  { name: 'Tube Spring', type: 'Reverb', basedOn: '1960s Fender Tube Reverb Unit', block: 'REV' },
  { name: 'Amp Sprint', type: 'Reverb', basedOn: 'Solid State Combo Amp Reverb', block: 'REV' },
  { name: 'Studio', type: 'Reverb', basedOn: 'VALETON', description: 'Studio recording reverb', block: 'REV' },
  { name: 'Club', type: 'Reverb', basedOn: 'VALETON', description: 'Small club venue reverb', block: 'REV' },
  { name: 'Concert', type: 'Reverb', basedOn: 'VALETON', description: 'Concert venue reverb', block: 'REV' },
  { name: 'Arena', type: 'Reverb', basedOn: 'VALETON', description: 'Large arena reverb', block: 'REV' },
  { name: 'N-Star', type: 'Reverb', basedOn: 'VALETON', description: 'Night star ambient reverb', block: 'REV' },
  { name: 'Deepsea', type: 'Reverb', basedOn: 'VALETON', description: 'Deep underwater reverb', block: 'REV' },
  { name: 'Sweet Space', type: 'Reverb', basedOn: 'VALETON', description: 'Lush ambient reverb', block: 'REV' },
  { name: 'Shimmer', type: 'Reverb', basedOn: 'VALETON', description: 'Reverb with pitch-shifted trails', block: 'REV' },
];

// ============================================
// COMBINED EXPORTS
// ============================================
export const ALL_EFFECTS = [
  ...PRE_EFFECTS,
  ...WAH_EFFECTS,
  ...DST_EFFECTS,
  ...AMP_MODELS,
  ...CAB_MODELS,
  ...NR_EFFECTS,
  ...EQ_EFFECTS,
  ...MOD_EFFECTS,
  ...DLY_EFFECTS,
  ...REV_EFFECTS,
];

// Helper function to find effect by real-world pedal name
export function findByRealPedal(pedalName: string): EffectInfo[] {
  const searchTerm = pedalName.toLowerCase();
  return ALL_EFFECTS.filter(e =>
    e.basedOn.toLowerCase().includes(searchTerm)
  );
}

// Helper function to find effect by GP-200 name
export function findByGP200Name(name: string): EffectInfo | undefined {
  return ALL_EFFECTS.find(e => e.name.toLowerCase() === name.toLowerCase());
}

// Get all effects for a specific block
export function getEffectsByBlock(block: EffectInfo['block']): EffectInfo[] {
  return ALL_EFFECTS.filter(e => e.block === block);
}

// Generate system prompt with all GP-200 knowledge
export function generateGP200SystemPrompt(): string {
  const formatEffects = (effects: EffectInfo[]) =>
    effects.map(e => `  - ${e.name}: ${e.basedOn}${e.description ? ` (${e.description})` : ''}`).join('\n');

  return `You are an expert guitar tone consultant specializing in the Valeton GP-200 multi-effects processor.

Your knowledge includes ALL GP-200 effects and their real-world equivalents:

## PRE BLOCK (Compressors, Boosts, Overdrives, Filters, Pitch):
${formatEffects(PRE_EFFECTS)}

## WAH BLOCK:
${formatEffects(WAH_EFFECTS)}

## DST BLOCK (Drive/Distortion):
${formatEffects(DST_EFFECTS)}

## AMP BLOCK:
${formatEffects(AMP_MODELS)}

## CAB BLOCK:
${formatEffects(CAB_MODELS)}

## NR BLOCK (Noise Reduction):
${formatEffects(NR_EFFECTS)}

## EQ BLOCK:
${formatEffects(EQ_EFFECTS)}

## MOD BLOCK (Modulation):
${formatEffects(MOD_EFFECTS)}

## DLY BLOCK (Delay):
${formatEffects(DLY_EFFECTS)}

## REV BLOCK (Reverb):
${formatEffects(REV_EFFECTS)}

When a user asks for a tone, you should:
1. Identify the genre, artist, or song style
2. Recommend the appropriate GP-200 amp and cab combination
3. Suggest drive/distortion pedals if needed
4. Add appropriate modulation, delay, and reverb
5. Provide specific parameter values (gain, EQ, etc.)
6. Explain why each choice matches the requested tone

Always use the exact GP-200 effect names, not the real-world pedal names.`;
}
