/**
 * AI-Native Event Planning Platform - Backend Server
 * Zero-dependency Node.js HTTP server powered by Google Gemini API & Grounded Local Context
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Load Grounding Datasets
let vendorsData = {};
let locationsData = {};
let budgetRatesData = {};
let venuesData = {};
let caterersData = [];

try {
  const vendorsFile = path.join(DATA_DIR, 'vendors.json');
  if (fs.existsSync(vendorsFile)) {
    vendorsData = JSON.parse(fs.readFileSync(vendorsFile, 'utf8'));
  }
  const locFile = path.join(DATA_DIR, 'mumbai-locations.json');
  if (fs.existsSync(locFile)) {
    locationsData = JSON.parse(fs.readFileSync(locFile, 'utf8'));
  }
  const ratesFile = path.join(DATA_DIR, 'budget-rates.json');
  if (fs.existsSync(ratesFile)) {
    budgetRatesData = JSON.parse(fs.readFileSync(ratesFile, 'utf8'));
  }
  const venuesFile = path.join(DATA_DIR, 'venues.json');
  if (fs.existsSync(venuesFile)) {
    venuesData = JSON.parse(fs.readFileSync(venuesFile, 'utf8'));
  }
  const caterersFile = path.join(DATA_DIR, 'caterers.json');
  if (fs.existsSync(caterersFile)) {
    caterersData = JSON.parse(fs.readFileSync(caterersFile, 'utf8'));
  }
  console.log('✅ Loaded grounding datasets: Mumbai vendors, venues, caterers, locations & budget rates.');
} catch (err) {
  console.error('⚠️ Warning reading grounding data:', err.message);
}

// Locality normalizer
function normalizeLocality(loc) {
  if (!loc || typeof loc !== 'string') return 'Bandra';
  const l = loc.trim().toLowerCase();
  if (l.includes('bandra') || l.includes('khar') || l.includes('santacruz')) return 'Bandra';
  if (l.includes('juhu') || l.includes('vile parle')) return 'Juhu';
  if (l.includes('powai') || l.includes('chandivali') || l.includes('kanjur')) return 'Powai';
  if (l.includes('dadar') || l.includes('matunga') || l.includes('prabhadevi') || l.includes('parel')) return 'Dadar';
  if (l.includes('thane') || l.includes('mulund') || l.includes('ghodbunder')) return 'Thane';
  if (l.includes('colaba') || l.includes('cuffe') || l.includes('fort') || l.includes('nariman') || l.includes('churchgate') || l.includes('marine')) return 'Colaba';
  if (l.includes('andheri') || l.includes('versova') || l.includes('lokhandwala')) return 'Andheri';
  return 'Bandra';
}

const NEARBY_LOCALITIES = {
  'Bandra': ['Juhu', 'Andheri', 'Dadar'],
  'Juhu': ['Bandra', 'Andheri'],
  'Powai': ['Andheri', 'Thane'],
  'Dadar': ['Bandra', 'Colaba'],
  'Thane': ['Powai', 'Andheri'],
  'Colaba': ['Dadar', 'Bandra'],
  'Andheri': ['Juhu', 'Bandra', 'Powai']
};

function generateMustAskQuestion(venue, eventType) {
  if (venue.type === 'party lawn' || venue.type === 'rooftop') {
    return 'What is the strict 10:00 PM acoustic sound curfew and rain contingency cover?';
  }
  if (venue.type === 'clubhouse') {
    return 'Is member sponsorship required, and are outside decorators allowed without royalty fees?';
  }
  if (venue.type === 'restaurant private dining') {
    return 'What is the minimum food & beverage spend, and can we bring our own celebration cake?';
  }
  if (venue.type === 'kids party venue') {
    return 'Are grip socks, child chaperones, and balloon arch setup included in the slot rental?';
  }
  if (eventType === 'wedding') {
    return 'Do you permit outside wedding caterers, and how many complimentary green rooms are provided?';
  }
  return 'Is dedicated valet parking included, and what are the setup/teardown grace hours?';
}

function matchVenues(locality, guestCount, eventType, venueAllocation, priorities = {}) {
  const normLoc = normalizeLocality(locality);
  let pool = (venuesData[normLoc] || []).map(v => ({ ...v, isNearby: false, distanceLabel: 'Within locality' }));

  let eligible = pool.filter(v => (v.capacityMax || 500) >= guestCount && (!v.suitableEvents || v.suitableEvents.includes(eventType)));

  if (eligible.length < 3) {
    const nearby = NEARBY_LOCALITIES[normLoc] || ['Bandra', 'Juhu'];
    for (const nLoc of nearby) {
      if (eligible.length >= 4) break;
      const nVenues = (venuesData[nLoc] || []).map(v => ({ ...v, isNearby: true, distanceLabel: `Nearby (~5-8 km, ${nLoc})` }));
      const nEligible = nVenues.filter(v => (v.capacityMax || 500) >= guestCount && (!v.suitableEvents || v.suitableEvents.includes(eventType)));
      eligible.push(...nEligible);
    }
  }

  if (eligible.length < 3) {
    const allVenues = Object.values(venuesData).flat();
    for (const v of allVenues) {
      if (eligible.length >= 3) break;
      if (!eligible.find(e => e.id === v.id)) {
        eligible.push({ ...v, isNearby: true, distanceLabel: `Nearby (${v.locality})` });
      }
    }
  }

  const isNonNeg = (priorities.nonNegotiable || []).some(p => p.toLowerCase().includes('venue'));
  const isFlex = (priorities.flexible || []).some(p => p.toLowerCase().includes('venue'));
  const venuePriority = isNonNeg ? 'nonNegotiable' : (isFlex ? 'flexible' : 'important');

  const targetBudget = venueAllocation || 150000;
  const enriched = eligible.map(v => {
    const price = v.approxPricePerEvent || 120000;
    let budgetFit = 'Fits';
    let whyItFits = '';

    if (price <= targetBudget * 1.05) {
      budgetFit = 'Fits';
      whyItFits = `Fits comfortably within your ₹${targetBudget.toLocaleString('en-IN')} venue allocation with capacity for ${guestCount} guests.`;
    } else if (price <= targetBudget * 1.30) {
      budgetFit = 'Stretch';
      whyItFits = `Slight stretch over the venue allocation, but delivers premier hospitality and prime ${v.locality} access.`;
    } else {
      budgetFit = 'Over';
      whyItFits = `Premium marquee venue exceeding base allocation; ideal if prioritizing top-tier ambiance.`;
    }

    if (venuePriority === 'nonNegotiable') {
      whyItFits += ' Protected at top quality per your 🔒 Must-have priority.';
    } else if (venuePriority === 'flexible') {
      whyItFits += ' Value-optimized option aligned with your 💸 Flexible priority.';
    }

    return {
      id: v.id,
      name: v.name,
      locality: v.locality,
      type: v.type,
      capacityMin: v.capacityMin,
      capacityMax: v.capacityMax,
      approxPricePerEvent: price,
      vegJainFriendly: !!v.vegJainFriendly,
      phone: v.phone || '',
      website: v.website || '',
      mapsLink: v.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name + ' ' + v.locality + ' Mumbai')}`,
      verified: !!v.verified,
      budgetFit,
      whyItFits,
      mustAskQuestion: generateMustAskQuestion(v, eventType),
      isNearby: !!v.isNearby,
      distanceLabel: v.distanceLabel || ''
    };
  });

  if (venuePriority === 'nonNegotiable') {
    enriched.sort((a, b) => b.approxPricePerEvent - a.approxPricePerEvent);
  } else if (venuePriority === 'flexible') {
    enriched.sort((a, b) => a.approxPricePerEvent - b.approxPricePerEvent);
  } else {
    const score = { Fits: 1, Stretch: 2, Over: 3 };
    enriched.sort((a, b) => (score[a.budgetFit] || 2) - (score[b.budgetFit] || 2));
  }

  return enriched.slice(0, 3);
}

function matchCatering(cateringAllocation, guestCount, eventType, priorities = {}) {
  const perPlateAvailable = Math.round(cateringAllocation / Math.max(guestCount, 1));
  const isPureVegRequested = (priorities.nonNegotiable || []).concat(priorities.important || []).some(p =>
    p.toLowerCase().includes('veg') || p.toLowerCase().includes('jain')
  );

  const enriched = (caterersData || []).map(cat => {
    let budgetFit = 'Fits your budget';
    let budgetFitReason = '';

    if (cat.id === 'caterer-atmosfire') {
      if (perPlateAvailable >= 900) {
        budgetFit = 'Fits your budget';
        budgetFitReason = `Your ₹${perPlateAvailable.toLocaleString('en-IN')}/guest catering allocation covers Atmosfire\'s signature live grill buffet.`;
      } else if (perPlateAvailable >= 750) {
        budgetFit = 'Slight stretch';
        budgetFitReason = `Base grill packages start around ₹850/guest; manageable with essential skewer selections.`;
      } else {
        budgetFit = 'Above budget';
        budgetFitReason = `Atmosfire baseline starts around ₹850/guest (above current ₹${perPlateAvailable.toLocaleString('en-IN')}/guest allocation).`;
      }
    } else {
      if (perPlateAvailable >= 450) {
        budgetFit = 'Fits your budget';
        budgetFitReason = `Your ₹${perPlateAvailable.toLocaleString('en-IN')}/guest allocation comfortably covers complete traditional pure veg & Jain thali banquets.`;
      } else if (perPlateAvailable >= 380) {
        budgetFit = 'Slight stretch';
        budgetFitReason = `Standard pure veg feast starts around ₹450/guest; society group discounts may apply.`;
      } else {
        budgetFit = 'Above budget';
        budgetFitReason = `At ₹${perPlateAvailable.toLocaleString('en-IN')}/guest, custom compact snacks or society counters are recommended.`;
      }
    }

    return {
      id: cat.id,
      name: cat.name,
      cuisineStyle: cat.cuisineStyle,
      vegJainFriendly: cat.vegJainFriendly,
      jainAvailability: cat.jainAvailability,
      pureVegOnly: cat.pureVegOnly,
      minGuests: cat.minGuests,
      approxPerPlateMin: cat.approxPerPlateMin,
      approxPerPlateMax: cat.approxPerPlateMax,
      servesAllMumbai: cat.servesAllMumbai,
      suitableEvents: cat.suitableEvents,
      whyFeatured: cat.whyFeatured,
      phone: cat.phone,
      website: cat.website,
      verified: cat.verified,
      notes: cat.notes,
      perPlateAvailable,
      budgetFit,
      budgetFitReason
    };
  });

  if (isPureVegRequested) {
    enriched.sort((a, b) => (b.pureVegOnly ? 1 : 0) - (a.pureVegOnly ? 1 : 0));
  }

  return {
    caterers: enriched,
    whyTheseTwo: "We hand-selected these two trusted pan-Mumbai specialists to give you two clear choices: Atmosfire for experiential live grills & interactive dining, and K Bhagat Tarachand for authentic pure-vegetarian & Jain-certified feasts with reliable value."
  };
}

// In-memory runtime config for API key
let runtimeApiKey = process.env.GEMINI_API_KEY || '';

// Read .env if present
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const key = k.trim();
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (key === 'GEMINI_API_KEY' && val) {
        runtimeApiKey = val;
        process.env.GEMINI_API_KEY = val;
      }
    }
  }
}

// MIME Types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Strict JSON Schema for Gemini
const PLAN_JSON_SCHEMA = {
  type: "OBJECT",
  properties: {
    eventSummary: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        eventType: { type: "STRING", enum: ["wedding", "birthday", "community"] },
        guests: { type: "INTEGER" },
        budget: { type: "NUMBER" },
        locality: { type: "STRING" },
        vibe: { type: "STRING" },
        perGuestCost: { type: "NUMBER" },
        projectedTotal: { type: "NUMBER" },
        summaryParagraph: { type: "STRING" }
      },
      required: ["title", "eventType", "guests", "budget", "locality", "vibe", "perGuestCost", "projectedTotal", "summaryParagraph"]
    },
    budget: {
      type: "OBJECT",
      properties: {
        totalBudget: { type: "NUMBER" },
        projectedSpend: { type: "NUMBER" },
        surplusDeficit: { type: "NUMBER" },
        tradeoffAdvice: { type: "STRING" },
        categories: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              allocatedAmount: { type: "NUMBER" },
              percentage: { type: "NUMBER" },
              priority: { type: "STRING", enum: ["Essential", "High", "Medium", "Discretionary"] },
              status: { type: "STRING", enum: ["Balanced", "High Priority", "Cost Saving Opportunity", "Under Budget"] },
              notes: { type: "STRING" }
            },
            required: ["name", "allocatedAmount", "percentage", "priority", "status", "notes"]
          }
        }
      },
      required: ["totalBudget", "projectedSpend", "surplusDeficit", "tradeoffAdvice", "categories"]
    },
    timeline: {
      type: "OBJECT",
      properties: {
        prepCountdown: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              phase: { type: "STRING" },
              timeBefore: { type: "STRING" },
              tasks: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    task: { type: "STRING" },
                    tips: { type: "STRING" },
                    urgency: { type: "STRING", enum: ["critical", "normal", "optional"] }
                  },
                  required: ["task", "tips", "urgency"]
                }
              }
            },
            required: ["phase", "timeBefore", "tasks"]
          }
        },
        runOfShow: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              time: { type: "STRING" },
              phase: { type: "STRING" },
              activity: { type: "STRING" },
              responsibleParty: { type: "STRING" },
              criticalNotes: { type: "STRING" }
            },
            required: ["time", "phase", "activity", "responsibleParty", "criticalNotes"]
          }
        }
      },
      required: ["prepCountdown", "runOfShow"]
    },
    vendorChecklist: {
      type: "OBJECT",
      properties: {
        categories: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              categoryName: { type: "STRING" },
              hiringCriteria: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              mustAskQuestions: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              recommendations: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    area: { type: "STRING" },
                    priceTier: { type: "STRING" },
                    phone: { type: "STRING" },
                    specialty: { type: "STRING" },
                    whyChosen: { type: "STRING" }
                  },
                  required: ["name", "area", "priceTier", "phone", "specialty", "whyChosen"]
                }
              },
              rfpDraft: { type: "STRING" }
            },
            required: ["categoryName", "hiringCriteria", "mustAskQuestions", "recommendations", "rfpDraft"]
          }
        }
      },
      required: ["categories"]
    },
    personalizedIdeas: {
      type: "OBJECT",
      properties: {
        theme: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            visualVibe: { type: "STRING" },
            colorPalette: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  hex: { type: "STRING" }
                },
                required: ["name", "hex"]
              }
            }
          },
          required: ["title", "description", "visualVibe", "colorPalette"]
        },
        activities: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              concept: { type: "STRING" },
              targetAudience: { type: "STRING" },
              materialsNeeded: { type: "STRING" }
            },
            required: ["title", "concept", "targetAudience", "materialsNeeded"]
          }
        },
        curatedMenu: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              section: { type: "STRING" },
              items: {
                type: "ARRAY",
                items: { type: "STRING" }
              }
            },
            required: ["section", "items"]
          }
        },
        whatsappInviteCopy: { type: "STRING" }
      },
      required: ["theme", "activities", "curatedMenu", "whatsappInviteCopy"]
    }
  },
  required: ["eventSummary", "budget", "timeline", "vendorChecklist", "personalizedIdeas"]
};

/**
 * Call Gemini 2.5 Flash / 1.5 Flash API with JSON Schema
 */
async function callGemini(promptText, systemInstruction, apiKey) {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const modelName of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: PLAN_JSON_SCHEMA
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${modelName} returned status ${response.status}: ${errText}`);
        lastError = new Error(`Gemini API error (${response.status}): ${errText}`);
        continue; // Try next model
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("No text candidate in Gemini response");
      }

      return JSON.parse(rawText);
    } catch (err) {
      console.warn(`Error attempting ${modelName}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate plan with Gemini");
}

/**
 * Fallback Intelligent Synthesizer
 * Seamless offline generative engine grounded with vendors.json and mathematical tradeoff reasoning.
 */
function generateIntelligentFallbackPlan(params) {
  const eventType = (params.eventType || 'birthday').toLowerCase();
  const guests = parseInt(params.guests, 10) || 50;
  const budget = parseFloat(params.budget) || 100000;
  const locality = params.locality || 'Bandra, Mumbai';
  const customPrompt = params.prompt || '';
  const perGuestCost = Math.round(budget / Math.max(guests, 1));

  let eventTitle = '';
  let vibe = '';
  let summary = '';
  let categories = [];
  let prepPhases = [];
  let runOfShow = [];
  let vendorSections = [];
  let themeTitle = '';
  let themeDesc = '';
  let colorPalette = [];
  let activities = [];
  let menu = [];
  let inviteCopy = '';
  let tradeoffAdvice = '';

  if (eventType === 'wedding') {
    eventTitle = customPrompt ? `Grand Wedding: ${customPrompt.slice(0, 40)}` : `Bespoke Wedding Celebration (${locality})`;
    vibe = "Royal Elegance & Warm Hospitality";
    tradeoffAdvice = `At ${guests} guests with a budget of ₹${budget.toLocaleString('en-IN')}, venue and catering account for roughly 62% of expenses. To preserve high culinary standards, consider opting for seasonal floral installations rather than imported orchids, saving ₹45,000 for cinematic wedding photography.`;
    summary = `A beautifully orchestrated multi-day wedding celebration tailored for ${guests} esteemed guests in ${locality}, balancing traditional hospitality with modern aesthetic flair.`;

    const venueCost = Math.round(budget * 0.35);
    const cateringCost = Math.round(budget * 0.30);
    const decorCost = Math.round(budget * 0.15);
    const photoCost = Math.round(budget * 0.10);
    const entertainmentCost = Math.round(budget * 0.05);
    const miscCost = budget - (venueCost + cateringCost + decorCost + photoCost + entertainmentCost);

    categories = [
      { name: "Venue & Banquet Hall", allocatedAmount: venueCost, percentage: 35, priority: "Essential", status: "Balanced", notes: "Includes AC banquet hall, basic lighting, security and valet setup." },
      { name: "Gourmet Catering & Live Counters", allocatedAmount: cateringCost, percentage: 30, priority: "Essential", status: "High Priority", notes: `Live chaat counter, 4-course meal, mocktails (₹${Math.round(cateringCost/guests)}/plate).` },
      { name: "Decor, Mandap & Floral Aesthetics", allocatedAmount: decorCost, percentage: 15, priority: "High", status: "Cost Saving Opportunity", notes: "Traditional marigold & brass aesthetic; save by hiring local Dadar flower market florists." },
      { name: "Cinematic Photography & Drone", allocatedAmount: photoCost, percentage: 10, priority: "High", status: "Balanced", notes: "2 traditional photographers + 1 candid cinematographer with drone coverage." },
      { name: "DJ, Sound Setup & Sangeet Emcee", allocatedAmount: entertainmentCost, percentage: 5, priority: "Medium", status: "Balanced", notes: "Sound permit setup adhering to local 10 PM residential limits." },
      { name: "Gifts, Invites & Contingency", allocatedAmount: miscCost, percentage: 5, priority: "Discretionary", status: "Balanced", notes: "Custom mithai boxes, WhatsApp wedding stationery & buffer." }
    ];

    prepPhases = [
      {
        phase: "Phase 1: Foundation & Bookings",
        timeBefore: "8-12 Weeks Before",
        tasks: [
          { task: "Lock banquet venue and inspect fire safety & green room permits", tips: "Ensure venue allows external decorators or compare in-house royalty fees.", urgency: "critical" },
          { task: "Book lead caterer and schedule mandatory food tasting session", tips: "Taste signature gravies and test live tandoor crispness.", urgency: "critical" },
          { task: "Shortlist candid photographer and confirm drone flight clearance in locality", tips: "Review full wedding albums rather than just curated Instagram reels.", urgency: "normal" }
        ]
      },
      {
        phase: "Phase 2: Creative & Logistics",
        timeBefore: "4 Weeks Before",
        tasks: [
          { task: "Finalize bespoke e-invitations and broadcast WhatsApp save-the-dates", tips: "Include Google Maps venue pins and parking instructions.", urgency: "critical" },
          { task: "Finalize Sangeet tracklist and book rehearsal hours with family choreo team", tips: "Keep Sangeet performances strictly under 45 minutes to maintain audience energy.", urgency: "normal" },
          { task: "Confirm bridal mehendi artists and specify organic natural henna", tips: "Book assistant artists to cater to female guests simultaneously.", urgency: "normal" }
        ]
      },
      {
        phase: "Phase 3: Final Countdown & Rehearsal",
        timeBefore: "1 Week to Day-Before",
        tasks: [
          { task: "Submit police sound permission application for DJ / Baraat brass band", tips: "Sound cutoff is 10:00 PM sharp in Mumbai residential zones.", urgency: "critical" },
          { task: "Distribute designated coordinator duties (valet, gifts, guest check-in)", tips: "Assign one trusted point-person with the caterer contact list.", urgency: "critical" },
          { task: "Pack emergency bridal kit (safety pins, lint roller, mints, first aid)", tips: "Keep in the bridal suite with the emcee.", urgency: "optional" }
        ]
      }
    ];

    runOfShow = [
      { time: "16:00 - 17:00", phase: "Vendor Ingress & Setup", activity: "Mandap florals soundcheck and banquet hall AC pre-cooling", responsibleParty: "Venue Coordinator & Decor Team", criticalNotes: "Verify backup generator fuel and check microphone batteries." },
      { time: "17:30 - 18:30", phase: "Baraat & Welcome", activity: "Baraat arrival with Dhol procession, Milni ceremony & Welcome Drinks", responsibleParty: "Host Family & Hospitality Team", criticalNotes: "Ensure cold beverage trays are ready immediately at entryway." },
      { time: "18:45 - 20:00", phase: "Main Rituals / Varmala", activity: "Grand Varmala on stage followed by traditional Vedic Pheras", responsibleParty: "Panditji & Stage Manager", criticalNotes: "Photographers stage placement unobstructed." },
      { time: "20:00 - 22:30", phase: "Feast & Congratulatory Stage", activity: "Live counters open, dinner buffet served, photo-ops with couple", responsibleParty: "Catering Head & Emcee", criticalNotes: "Ensure VIP elderly table is served plated courses." },
      { time: "22:45 - 23:15", phase: "Vidaai & Wrap-Up", activity: "Emotional farewell, gift loading, settlement of vendor balances", responsibleParty: "Designated Family Treasurer", criticalNotes: "Inspect venue for lost belongings before checkout." }
    ];

    vendorSections = [
      {
        categoryName: "Catering & Banquet Service",
        hiringCriteria: ["Minimum 4.5+ star review with live banquet experience", "FSSAI certified commercial kitchen setup", "Dedicated supervisor for live dessert & chaat counters"],
        mustAskQuestions: ["Do you include uniformed servers and designer chinaware?", "What is your policy for leftover food and packaging?", "Is live mineral water dispensing included?"],
        recommendations: [
          { name: "Mini Punjab Catering", area: "Pan-Mumbai & Suburbs", priceTier: "Premium (₹850-1400/plate)", phone: "+91 98201 54321", specialty: "Signature Live Chaat, Butter Chicken & Dal Makhani", whyChosen: "Legendary Mumbai staple known for impeccable wedding spreads." },
          { name: "Shreeji Maharaj Caterers", area: "Ghatkopar & Pan-Mumbai", priceTier: "Mid-Range (₹550-850/plate)", phone: "+91 98205 12345", specialty: "Authentic Gujarati, Marwari & Strict Jain Banquets", whyChosen: "Unmatched purity and taste for traditional vegetarian weddings." }
        ],
        rfpDraft: `Hello! We are hosting a wedding in ${locality} for ~${guests} guests. Our date is upcoming and budget is around ₹${cateringCost.toLocaleString('en-IN')}. Could you please share your wedding menu packages, per-plate pricing, and tasting availability? Thank you!`
      },
      {
        categoryName: "Cinematic Photography & Film",
        hiringCriteria: ["Documented experience with Indian wedding lighting", "Dual-camera setup with backup memory cards", "Defined delivery timeline in contract"],
        mustAskQuestions: ["Will you personally shoot the event or send junior associates?", "What is the turnaround time for the teaser film and raw footage?", "Do you provide complimentary drone shots if venue permits?"],
        recommendations: [
          { name: "Pixel Magic Weddings", area: "Bandra & South Mumbai", priceTier: "Mid-to-High Tier", phone: "+91 98192 33445", specialty: "Cinematic 4K Teaser Films & Candid Moments", whyChosen: "Specializes in natural lighting and emotional storytelling." }
        ],
        rfpDraft: `Hi! We are seeking a wedding photographer for a ${guests}-guest celebration in ${locality}. Looking for candid photography, traditional portraits, and an Instagram-ready highlight reel. Please share your portfolio and package quote.`
      }
    ];

    themeTitle = "Royal Marigold & Sunset Amber";
    themeDesc = "A warm, opulent heritage palette blending fragrant marigold yellows with deep terracotta, raw silk brass lanterns, and warm fairy lights.";
    colorPalette = [
      { name: "Royal Marigold", hex: "#F59E0B" },
      { name: "Terracotta Rust", hex: "#B45309" },
      { name: "Ivory Silk", hex: "#FFFBEB" },
      { name: "Antique Brass", hex: "#D97706" }
    ];

    activities = [
      { title: "Personalized Audio Guestbook", concept: "A vintage rotary phone where guests pick up the receiver to record heartfelt voice messages for the couple.", targetAudience: "All Guests & Friends", materialsNeeded: "Vintage audio guestbook device, neon instruction signage." },
      { title: "Live Bangle & Ittar Bar", concept: "A charming traditional counter where female guests can customize glass bangles and receive artisan natural roll-on perfumes.", targetAudience: "Mehendi / Wedding attendees", materialsNeeded: "Bangle artisan table, customized velvet pouches." }
    ];

    menu = [
      { section: "Welcome & Live Chaat", items: ["Smoked Kesar Thandai", "Dahi Puri Spheres with Pomegranate Caviar", "Amritsari Paneer Tikka / Murgh Malai Skewers"] },
      { section: "Main Banquet", items: ["Dal Bukhara Simmered for 24 Hours", "Paneer Lababdar with Warqi Paratha", "Dum Biryani with Burani Raita", "Subz Panchmel"] },
      { section: "Artisan Desserts", items: ["Warm Moong Dal Halwa in Kulhads", "Baked Rasgulla with Pistachio Crumble", "Artisan Kulfi Counter"] }
    ];

    inviteCopy = `✨ *Together with their families, we invite you to celebrate the wedding of our beloved couple!* ✨\n\n🗓️ Date: [Insert Date]\n📍 Venue: [Venue Name], ${locality}\n⏰ Muhurat & Celebrations start at 5:00 PM\n\nYour presence and blessings will make our special day even more memorable. Kindly treat this as our personal invitation!\n\n_RSVP: [Contact Names]_`;

  } else if (eventType === 'community') {
    eventTitle = customPrompt ? `Community Festival: ${customPrompt.slice(0, 40)}` : `Grand Society Utsav & Cultural Gala (${locality})`;
    vibe = "Festive Unity & High Energy";
    tradeoffAdvice = `For a community festival of ${guests} residents with ₹${budget.toLocaleString('en-IN')}, stage infrastructure, sound, and bulk community dining are crucial. Choosing local dhol-tasha pathaks and society volunteer-managed games saves ₹25,000, allowing for richer festive lighting and high-quality sound equipment.`;
    summary = `An inclusive, energetic community festival designed for ${guests} society members in ${locality}, featuring cultural showcases, inter-building competitions, and community feast.`;

    const soundStageCost = Math.round(budget * 0.30);
    const cateringCost = Math.round(budget * 0.35);
    const decorLightingCost = Math.round(budget * 0.15);
    const prizeGameCost = Math.round(budget * 0.10);
    const miscCost = budget - (soundStageCost + cateringCost + decorLightingCost + prizeGameCost);

    categories = [
      { name: "Stage, High-Wattage Sound & LED Backdrop", allocatedAmount: soundStageCost, percentage: 30, priority: "Essential", status: "Balanced", notes: "Truss stage, wireless mics, generator backup and digital sound board." },
      { name: "Community Maha-Bhoj Buffet", allocatedAmount: cateringCost, percentage: 35, priority: "Essential", status: "High Priority", notes: `Nutritious, high-capacity vegetarian buffet (₹${Math.round(cateringCost/guests)}/resident).` },
      { name: "Society Gate, Façade & Fairy Lighting", allocatedAmount: decorLightingCost, percentage: 15, priority: "High", status: "Balanced", notes: "Illuminated society compound, rangoli stations, and welcome arch." },
      { name: "Prizes, Trophies & Fun Game Booths", allocatedAmount: prizeGameCost, percentage: 10, priority: "Medium", status: "Balanced", notes: "Custom engraved trophies for kids, senior citizen felicitations." },
      { name: "Permissions, Security & First Aid", allocatedAmount: miscCost, percentage: 10, priority: "Essential", status: "Balanced", notes: "Local municipal/police sound permissions, ambulance on standby." }
    ];

    prepPhases = [
      {
        phase: "Phase 1: Society Circular & Permissions",
        timeBefore: "4 Weeks Before",
        tasks: [
          { task: "File local police and BMC sound permissions for community speakers", tips: "Ensure cutoff time is clearly stated on the society noticeboard.", urgency: "critical" },
          { task: "Form resident volunteer committees (Food, Stage, Sports, Discipline)", tips: "Create a dedicated WhatsApp committee group with defined sub-leads.", urgency: "critical" },
          { task: "Finalize sound & generator vendor with dual power backup", tips: "Check phase-balance so residential elevators are not affected.", urgency: "normal" }
        ]
      },
      {
        phase: "Phase 2: Cultural Registrations",
        timeBefore: "2 Weeks Before",
        tasks: [
          { task: "Open registrations for kids' dance, antakshari, and drama performances", tips: "Set maximum 3-minute limit per performance to avoid schedule overruns.", urgency: "critical" },
          { task: "Lock community caterer and establish queue management tokens", tips: "Set up separate counters for senior citizens to avoid long queues.", urgency: "normal" }
        ]
      },
      {
        phase: "Phase 3: Final Tech Run & Setup",
        timeBefore: "Day Before",
        tasks: [
          { task: "Full audio-visual microphone check and audio playback test", tips: "Number performance audio tracks sequentially on a dedicated USB drive.", urgency: "critical" },
          { task: "Mark seating zones (Seniors front row, Kids activity zone)", tips: "Keep fire exits and society ambulance driveway strictly unobstructed.", urgency: "critical" }
        ]
      }
    ];

    runOfShow = [
      { time: "16:00 - 17:00", phase: "Compound Ingress & Setup", activity: "Stage soundcheck, lighting inspection, registration counter opens", responsibleParty: "Society Youth Committee", criticalNotes: "Verify generator load with master switch." },
      { time: "17:30 - 18:30", phase: "Inauguration & Aarti", activity: "Lighting of lamp, Ganpati / Society Aarti, President welcome speech", responsibleParty: "Managing Committee & Elders", criticalNotes: "Keep speeches under 7 minutes total." },
      { time: "18:30 - 20:00", phase: "Cultural Showcase & Competitions", activity: "Kids dance showcase, senior musical performance, antakshari finals", responsibleParty: "Stage Emcee & Cultural Head", criticalNotes: "Strict adherence to 3-minute performance time limits." },
      { time: "20:00 - 21:45", phase: "Maha-Bhoj & Fellowship", activity: "Community buffet open across 3 dual-sided counters", responsibleParty: "Food Committee & Caterer", criticalNotes: "Ensure senior citizen express serving line is staffed." },
      { time: "21:45 - 22:00", phase: "Prize Distribution & National Anthem", activity: "Awarding medals, trophy distribution, vote of thanks", responsibleParty: "Society Secretary & Chief Guest", criticalNotes: "Music fades promptly before 10:00 PM cutoff." }
    ];

    vendorSections = [
      {
        categoryName: "Sound, Stage & Lighting Services",
        hiringCriteria: ["Commercial sound setup with acoustic tuning", "Silent generator van capability", "Trained audio engineer on-site throughout"],
        mustAskQuestions: ["Do you supply 4+ wireless handheld microphones and podium mic?", "What is the generator diesel backup capacity?", "Can you play pre-loaded pendrive tracks during transitions?"],
        recommendations: [
          { name: "SoundKraft Mumbai", area: "Thane & Central Suburbs", priceTier: "Mid-Range", phone: "+91 98202 88990", specialty: "Society Galas, Ganesh Utsav Sound & Lighting", whyChosen: "Decades of experience with Mumbai residential society norms and BMC rules." }
        ],
        rfpDraft: `Hello! We are organizing a society cultural festival in ${locality} for ~${guests} residents. We require a 16x12 ft truss stage, 4 wireless mics, JBL sound system, and silent generator for 5 hours. Please provide an itemized quote.`
      },
      {
        categoryName: "Community Catering & Prasadam",
        hiringCriteria: ["Ability to handle 200+ guests simultaneously", "Strict hygiene and heated chafing dishes", "Prompt counter replenishment"],
        mustAskQuestions: ["How many live buffet lines will you set up?", "Can you provide eco-friendly leaf plates (patravali) or melamine?", "Do you provide staff for continuous clearing?"],
        recommendations: [
          { name: "Aaswad Traditional Catering", area: "Dadar / Shivaji Park", priceTier: "Economy to Mid-Range", phone: "022 2445 1800", specialty: "Authentic Maharashtrian, Masale Bhaat, Puran Poli & Batata Vada", whyChosen: "Top-tier reliability for community gatherings and festive bhog." }
        ],
        rfpDraft: `Hi! We are hosting our annual society festival in ${locality} with ~${guests} residents. Looking for a traditional pure-veg buffet menu with quick replenishment. Kindly send your festive thali options and rates.`
      }
    ];

    themeTitle = "Rang De Utsav - Vibrant Heritage";
    themeDesc = "A festive celebration of community spirit featuring kaleidoscopic marigold garlands, colorful hanging umbrellas, and glowing clay diyas.";
    colorPalette = [
      { name: "Festive Saffron", hex: "#EA580C" },
      { name: "Peacock Blue", hex: "#0284C7" },
      { name: "Emerald Green", hex: "#059669" },
      { name: "Golden Glow", hex: "#FBBF24" }
    ];

    activities = [
      { title: "Inter-Wing Antakshari & Trivia Battle", concept: "Wing A vs Wing B musical antakshari with buzzer rounds and Mumbai trivia questions.", targetAudience: "All age groups from teenagers to grandparents", materialsNeeded: "Buzzers, wireless microphones, score whiteboard." },
      { title: "Traditional Rangoli & Diya Craft Corner", concept: "Creative station where children and parents design organic rangoli patterns and paint terracotta diyas to take home.", targetAudience: "Children (Ages 5-14)", materialsNeeded: "Organic rangoli powders, stencils, clay diyas, acrylic paint." }
    ];

    menu = [
      { section: "Welcome Refreshments", items: ["Spiced Kokum Sharbat", "Crispy Batata Vada with Dry Garlic Chutney", "Kothimbir Vadi"] },
      { section: "Festive Maha-Bhoj", items: ["Aromatic Masale Bhaat with Ghee", "Usal Pav & Matki Gravy", "Paneer Kolhapuri with Soft Puris", "Varan Bhaat with Lemon Slice"] },
      { section: "Sweet Blessings", items: ["Hot Puran Poli with Milk", "Gulab Jamun with Elaichi Syrup", "Besan Ladoo Packets for takeaway"] }
    ];

    inviteCopy = `🎉 *INVITATION: ANNUAL SOCIETY UTSAV & CULTURAL GALA* 🎉\n\nDear Residents of ${locality},\nJoin us for an evening of music, cultural performances, and delicious Maha-Bhoj!\n\n🗓️ Date: [Insert Date]\n📍 Venue: Society Clubhouse & Central Courtyard\n⏰ 5:00 PM Onwards\n\nLet us come together as one big family to celebrate! Please confirm your family attendee count on the society group.\n\n_Organizing Committee_`;

  } else {
    // Birthday Default
    eventTitle = customPrompt ? `Birthday Bash: ${customPrompt.slice(0, 40)}` : `Spectacular Birthday Celebration (${locality})`;
    vibe = "Joyful, Immersive & Memorable";
    tradeoffAdvice = `With ${guests} guests and a budget of ₹${budget.toLocaleString('en-IN')}, prioritizing high-engagement activity stations and a designer cake creates far more lasting memories than expensive sit-down dining. Shifting to live food counters (pasta, sliders, mocktails) frees up ₹18,000 for a professional magician and themed balloon arch.`;
    summary = `A fun-filled, seamless birthday party for ${guests} guests in ${locality}, engineered with engaging entertainment corners, vibrant custom decor, and a crowd-pleasing culinary spread.`;

    const decorCost = Math.round(budget * 0.25);
    const cateringCost = Math.round(budget * 0.35);
    const cakeEntertainmentCost = Math.round(budget * 0.20);
    const favorsCost = Math.round(budget * 0.10);
    const miscCost = budget - (decorCost + cateringCost + cakeEntertainmentCost + favorsCost);

    categories = [
      { name: "Themed Decor & Photo-Op Arch", allocatedAmount: decorCost, percentage: 25, priority: "High", status: "Balanced", notes: "Custom balloon arch, LED number sign, character cutouts, personalized backdrop." },
      { name: "Finger Foods & Live Food Counters", allocatedAmount: cateringCost, percentage: 35, priority: "Essential", status: "Balanced", notes: `Live slider/pizza station, finger snacks, beverages (₹${Math.round(cateringCost/guests)}/guest).` },
      { name: "Custom Cake & Entertainment (Emcee/Magician)", allocatedAmount: cakeEntertainmentCost, percentage: 20, priority: "High", status: "High Priority", notes: "2-3 tier theme fondant cake + dynamic emcee conducting crowd games." },
      { name: "Personalized Return Favors & Activity Kits", allocatedAmount: favorsCost, percentage: 10, priority: "Medium", status: "Balanced", notes: "Customized goodie boxes tailored to guest ages." },
      { name: "Venue Hall Rental & Photography", allocatedAmount: miscCost, percentage: 10, priority: "Medium", status: "Balanced", notes: "Party hall rental / clubhouse fee + candid photographer capturing cake-cutting." }
    ];

    prepPhases = [
      {
        phase: "Phase 1: Theme & Venue",
        timeBefore: "3-4 Weeks Before",
        tasks: [
          { task: "Book party hall/clubhouse and confirm balloon decorator rules (tape vs nails)", tips: "Ensure hall has functioning AC and accessible restrooms.", urgency: "critical" },
          { task: "Commission bespoke theme cake with artisan home-baker", tips: "Ask for lightweight tiers if traveling in Mumbai traffic.", urgency: "critical" },
          { task: "Book energetic emcee / entertainer specializing in guest age-group", tips: "Specify event playlist preferences and favorite songs.", urgency: "normal" }
        ]
      },
      {
        phase: "Phase 2: Stationery & Invites",
        timeBefore: "2 Weeks Before",
        tasks: [
          { task: "Send digital WhatsApp invites with clear RSVP date", tips: "Ask parents about kids' dietary allergies or food restrictions.", urgency: "critical" },
          { task: "Curate customized return gifts and pack with personalized name tags", tips: "Keep 5 extra favor boxes for unexpected plus-ones.", urgency: "normal" }
        ]
      },
      {
        phase: "Phase 3: Final Countdown",
        timeBefore: "2 Days to Event",
        tasks: [
          { task: "Confirm delivery time with cake artist (1 hour prior to party start)", tips: "Clear refrigerator shelf space in advance for the cake.", urgency: "critical" },
          { task: "Prepare playlist USB and verify portable Bluetooth speaker backup", tips: "Test speaker battery charge the previous night.", urgency: "optional" }
        ]
      }
    ];

    runOfShow = [
      { time: "16:30 - 17:15", phase: "Setup & Soundcheck", activity: "Balloon decor setup, cake arrival inspection, background playlist on", responsibleParty: "Host & Decorator", criticalNotes: "Check cake condition before delivery rider departs." },
      { time: "17:30 - 18:15", phase: "Guest Arrival & Warm-Up", activity: "Welcome mocktails, tattoo artist & caricature station open", responsibleParty: "Emcee & Activity Lead", criticalNotes: "Ensure photo-booth props are ready for arriving families." },
      { time: "18:15 - 19:15", phase: "High-Energy Interactive Games", activity: "Musical statues, parachute games, scavenger hunt led by Emcee", responsibleParty: "Emcee", criticalNotes: "Ensure every child wins at least one mini token prize." },
      { time: "19:15 - 19:45", phase: "Grand Cake Cutting Ceremony", activity: "Celebration spotlight, birthday song, cake cutting and group photos", responsibleParty: "Host & Photographer", criticalNotes: "Candle lighter and cake knife ready at dessert table." },
      { time: "19:45 - 20:45", phase: "Dinner & Return Favors", activity: "Buffet counters open, distribution of personalized return gifts", responsibleParty: "Caterer & Host", criticalNotes: "Hand return gifts individually as families exit." }
    ];

    vendorSections = [
      {
        categoryName: "Party Decor & Balloon Styling",
        hiringCriteria: ["Experience with organic balloon garlands and LED neon signs", "Safe non-toxic materials", "Punctual setup 2 hours prior"],
        mustAskQuestions: ["Do you supply the backdrop frame or does the venue need to provide hooks?", "Can you customize the child's name in LED or wooden cutout?", "Do you take down the decor post-party?"],
        recommendations: [
          { name: "Party Hunterz Mumbai", area: "Bandra & Pan-Mumbai", priceTier: "Mid-to-Premium", phone: "+91 98203 11223", specialty: "Organic Balloon Styling, Theme Props, Neon Backdrops", whyChosen: "Mumbai's most trusted birthday decor styling brand." }
        ],
        rfpDraft: `Hi! We are organizing a birthday party for ${guests} guests in ${locality}. Looking for a vibrant customized theme backdrop, balloon arch, and cake table setup. Please share your birthday package catalog!`
      },
      {
        categoryName: "Artisan Cake & Desserts",
        hiringCriteria: ["Custom fondant & whipped cream portfolio", "Safe temperature-controlled delivery", "Eggless options available"],
        mustAskQuestions: ["Can you do customized figurines?", "What cake sponge flavors are most popular?", "Is home delivery included in Mumbai traffic?"],
        recommendations: [
          { name: "The Bombay Sweet Co. & Bakes", area: "Powai & Western Suburbs", priceTier: "Mid-Range", phone: "+91 98207 77889", specialty: "Designer Themed Cakes, Belgian Chocolate & Eggless Specialties", whyChosen: "Famous for stunning visual finishing and rich, moist flavor." }
        ],
        rfpDraft: `Hello! We'd love to order a customized theme birthday cake (approx 2.5 kg) for our party in ${locality} with ${guests} guests. Please let us know design options and delivery schedule.`
      }
    ];

    themeTitle = "Enchanted Celestial Carnival";
    themeDesc = "A dreamy, playful pastel aesthetic combining warm cream, dusty blue, metallic chrome gold, and soft peach balloons with carnival accents.";
    colorPalette = [
      { name: "Dusty Pastel Blue", hex: "#38BDF8" },
      { name: "Chrome Gold", hex: "#F59E0B" },
      { name: "Peach Blossom", hex: "#FB923C" },
      { name: "Cloud White", hex: "#F8FAFC" }
    ];

    activities = [
      { title: "DIY Slime & Lava Lamp Lab", concept: "An interactive crafting station where kids create their own custom scented glitter slime and mini lava bottles to take home.", targetAudience: "Kids (Ages 4-12)", materialsNeeded: "Clear glue, baking soda, neon glitters, safe food colors, mini Mason jars." },
      { title: "Super Emcee Minute-to-Win-It Arena", concept: "Fast-paced, hilarious family games (cookie on forehead, ping-pong toss, balloon pyramid) where adults and kids team up.", targetAudience: "All guests & parents", materialsNeeded: "Stopwatch, plastic cups, ping pong balls, fun medals." }
    ];

    menu = [
      { section: "Live Finger Foods", items: ["Mini Paneer Tikka Sliders", "Loaded Cheesy Nachos with Salsa", "Crispy Corn Cones with Jalapeno Dip"] },
      { section: "Kid-Approved Mains", items: ["Live Artisan Pasta Station (White & Red Sauce)", "Pav Bhaji with Buttered Toasted Pav", "Crispy French Fry Bucket"] },
      { section: "Sweet Treats & Sips", items: ["Belgian Chocolate Cupcakes", "Fresh Strawberry-Mint Lemonade", "Mini Churros with Warm Nutella Dip"] }
    ];

    inviteCopy = `🎈 *YOU'RE INVITED TO A SPECTACULAR BIRTHDAY CELEBRATION!* 🎈\n\nGet ready for fun games, tasty treats, and lots of laughs as we celebrate!\n\n🗓️ Date: [Insert Date]\n📍 Location: [Party Venue], ${locality}\n⏰ Time: 5:30 PM - 8:30 PM\n\nRSVP by [Date] so we have goodies ready for everyone: [Phone Number] 🎂✨`;
  }

  if (params && params.customIdeas) {
    themeDesc += ` Incorporating personalized host request: "${params.customIdeas}".`;
    activities.unshift({
      title: "Host's Personalized Special Feature",
      concept: `Bespoke element honoring: "${params.customIdeas}". Tailored specifically to host specifications.`,
      targetAudience: "All guests & VIPs",
      materialsNeeded: "Specialized equipment & setup per host vision"
    });
  }

  // 3-Level Priority System Engine
  const priorities = params.priorities || { nonNegotiable: [], important: [], flexible: [] };
  
  // Custom ideas marked with "must" / "non-negotiable" promoted to nonNegotiable
  if (params.customIdeas) {
    const ciLower = params.customIdeas.toLowerCase();
    if (ciLower.includes('must') || ciLower.includes('non-negotiable') || ciLower.includes('mandatory') || ciLower.includes('essential')) {
      if (!priorities.nonNegotiable) priorities.nonNegotiable = [];
      priorities.nonNegotiable.push(params.customIdeas.slice(0, 30));
    } else {
      if (!priorities.important) priorities.important = [];
      priorities.important.push(params.customIdeas.slice(0, 30));
    }
  }

  function getPriority(catKey) {
    const k = catKey.toLowerCase();
    const nonNeg = priorities.nonNegotiable || [];
    const flex = priorities.flexible || [];
    const imp = priorities.important || [];

    if (nonNeg.some(p => k.includes(p.toLowerCase()) || p.toLowerCase().includes(k))) return 'nonNegotiable';
    if (flex.some(p => k.includes(p.toLowerCase()) || p.toLowerCase().includes(k))) return 'flexible';
    if (imp.some(p => k.includes(p.toLowerCase()) || p.toLowerCase().includes(k))) return 'important';

    // Feature chips alias matching
    if (k.includes('cater') || k.includes('food')) {
      if (nonNeg.some(p => p.includes('Veg') || p.includes('Jain'))) return 'nonNegotiable';
      if (flex.some(p => p.includes('Veg') || p.includes('Jain'))) return 'flexible';
    }
    if (k.includes('photo')) {
      if (nonNeg.some(p => p.includes('Photography'))) return 'nonNegotiable';
      if (flex.some(p => p.includes('Photography'))) return 'flexible';
    }
    if (k.includes('entertain') || k.includes('dj')) {
      if (nonNeg.some(p => p.includes('DJ') || p.includes('Emcee') || p.includes('Games'))) return 'nonNegotiable';
      if (flex.some(p => p.includes('DJ') || p.includes('Emcee') || p.includes('Games'))) return 'flexible';
    }
    if (k.includes('decor')) {
      if (nonNeg.some(p => p.includes('Decor'))) return 'nonNegotiable';
      if (flex.some(p => p.includes('Decor'))) return 'flexible';
    }
    if (k.includes('cake')) {
      if (nonNeg.some(p => p.includes('Cake'))) return 'nonNegotiable';
      if (flex.some(p => p.includes('Cake'))) return 'flexible';
    }

    return 'important';
  }

  // Base categories for event
  const baseDefs = [
    { key: 'Venue', name: 'Venue & Banquet Hall', baseWeight: 0.32, minRate: Math.max(25000, guests * 250) },
    { key: 'Catering', name: 'Gourmet Catering & Live Counters', baseWeight: 0.30, minRate: guests * 350 },
    { key: 'Decor', name: 'Decor, Styling & Floral Aesthetics', baseWeight: 0.15, minRate: 10000 },
    { key: 'Photography', name: 'Candid Photography & Film', baseWeight: 0.09, minRate: 10000 },
    { key: 'Entertainment', name: 'DJ, Sound Setup & Emcee', baseWeight: 0.06, minRate: 7000 },
    { key: 'Cake', name: 'Artisan Cake & Desserts', baseWeight: 0.03, minRate: 2000 },
    { key: 'Return Gifts', name: 'Return Gifts & Contingency', baseWeight: 0.05, minRate: 3000 }
  ];

  // Weight multipliers based on priority level
  let totalWeightedFactor = 0;
  const processedDefs = baseDefs.map(def => {
    const prio = getPriority(def.key);
    let multiplier = 1.0;
    let qualityTier = 'Standard';

    if (prio === 'nonNegotiable') {
      multiplier = 1.45;
      qualityTier = 'Premium';
    } else if (prio === 'flexible') {
      multiplier = 0.50;
      qualityTier = 'Basic';
    }

    const effectiveWeight = def.baseWeight * multiplier;
    totalWeightedFactor += effectiveWeight;
    return { ...def, priority: prio, qualityTier, effectiveWeight };
  });

  // Check budget reality against non-negotiables
  let nonNegMinTotal = 0;
  processedDefs.filter(d => d.priority === 'nonNegotiable').forEach(d => {
    nonNegMinTotal += d.minRate * 1.35;
  });

  let budgetCheckStatus = 'fits';
  let budgetShortfall = 0;
  let budgetOptions = [];

  if (nonNegMinTotal > budget) {
    budgetCheckStatus = 'short';
    budgetShortfall = Math.round(nonNegMinTotal - budget);
    const affordableGuests = Math.max(10, Math.round(guests * (budget / nonNegMinTotal)));
    const firstNonNeg = priorities.nonNegotiable?.[0] || 'Venue';
    budgetOptions = [
      `Increase budget by ₹${budgetShortfall.toLocaleString('en-IN')} to protect non-negotiables at premium standard`,
      `Reduce guest count to ${affordableGuests} guests`,
      `Downgrade ${firstNonNeg} to Important level`
    ];
  } else if (budget < (nonNegMinTotal + guests * 300)) {
    budgetCheckStatus = 'tight';
    budgetShortfall = Math.round((nonNegMinTotal + guests * 300) - budget);
    budgetOptions = [
      `Increase budget by ₹${budgetShortfall.toLocaleString('en-IN')} for comfortable quality buffer`,
      `Trim flexible items to minimal or DIY alternatives`,
      `Switch catering to high-tea or finger-food buffet`
    ];
  }

  // Calculate final allocated amounts summing up exactly to total budget
  let allocatedSum = 0;
  const lineItems = processedDefs.map((def, idx) => {
    let amt;
    if (idx === processedDefs.length - 1) {
      amt = budget - allocatedSum;
    } else {
      amt = Math.round((def.effectiveWeight / totalWeightedFactor) * budget);
      allocatedSum += amt;
    }

    const pct = Math.round((amt / budget) * 100);
    let reason = '';
    if (def.priority === 'nonNegotiable') {
      reason = `Allocated premium budget (₹${amt.toLocaleString('en-IN')}) per your 🔒 Must-have priority; protected from cuts.`;
    } else if (def.priority === 'flexible') {
      reason = `Trimmed to basic / DIY tier (₹${amt.toLocaleString('en-IN')}) per your 💸 Flexible priority, conserving funds for must-haves.`;
    } else {
      reason = `Allocated balanced standard share (₹${amt.toLocaleString('en-IN')}) per your ⭐ Important priority.`;
    }

    return {
      category: def.name,
      amount: amt,
      percentOfBudget: pct,
      qualityTier: def.qualityTier,
      priority: def.priority,
      reason: reason
    };
  });

  const protectedItems = lineItems
    .filter(li => li.priority === 'nonNegotiable')
    .map(li => ({
      category: li.category,
      tier: li.qualityTier,
      amount: li.amount,
      guarantee: `Protected first at top-notch quality, never downgraded silently per your 🔒 Must-have priority.`
    }));

  const tradeOffs = lineItems
    .filter(li => li.priority === 'flexible')
    .map(li => ({
      item: li.category,
      reducedBy: Math.round(li.amount * 0.4),
      why: `Trimmed to basic/DIY option because marked 💸 Flexible, preserving budget for higher-priority items.`
    }));

  const upgradesIfExtra = [
    `If budget permits extra ₹15,000, upgrade Photography to include 4K cinematic drone cinematography.`,
    `Upgrade live food stations with an interactive nitrogen mocktail or artisanal dessert counter if funds allow.`
  ];

  // Backward compatible categories list
  const computedCategories = lineItems.map(li => ({
    name: li.category,
    allocatedAmount: li.amount,
    percentage: li.percentOfBudget,
    priority: li.priority === 'nonNegotiable' ? 'Essential' : (li.priority === 'flexible' ? 'Discretionary' : 'High'),
    status: li.priority === 'nonNegotiable' ? 'High Priority' : (li.priority === 'flexible' ? 'Cost Saving Opportunity' : 'Balanced'),
    notes: li.reason
  }));

  // Match Venues and Caterers
  const venueAlloc = lineItems.find(li => li.category.toLowerCase().includes('venue'))?.amount || Math.round(budget * 0.32);
  const cateringAlloc = lineItems.find(li => li.category.toLowerCase().includes('cater'))?.amount || Math.round(budget * 0.30);
  const featuredVenues = matchVenues(locality, guests, eventType, venueAlloc, priorities);
  const featuredCatering = matchCatering(cateringAlloc, guests, eventType, priorities);

  return {
    eventSummary: {
      title: eventTitle,
      eventType: eventType,
      guests: guests,
      budget: budget,
      locality: locality,
      vibe: vibe,
      perGuestCost: perGuestCost,
      projectedTotal: budget,
      summaryParagraph: summary
    },
    budget: {
      totalBudget: budget,
      projectedSpend: budget,
      surplusDeficit: 0,
      tradeoffAdvice: tradeoffAdvice,
      lineItems: lineItems,
      protectedItems: protectedItems,
      tradeOffs: tradeOffs,
      budgetCheck: {
        status: budgetCheckStatus,
        shortfall: budgetShortfall,
        options: budgetOptions
      },
      upgradesIfExtra: upgradesIfExtra,
      categories: computedCategories
    },
    timeline: {
      prepCountdown: prepPhases,
      runOfShow: runOfShow
    },
    vendorChecklist: {
      categories: vendorSections,
      featuredVenues: featuredVenues,
      featuredCatering: featuredCatering
    },
    featuredVenues: featuredVenues,
    featuredCatering: featuredCatering,
    personalizedIdeas: {
      theme: {
        title: themeTitle,
        description: themeDesc,
        visualVibe: vibe,
        colorPalette: colorPalette
      },
      activities: activities,
      curatedMenu: menu,
      whatsappInviteCopy: inviteCopy
    }
  };
}

/**
 * Build ground context prompt from real dataset for Gemini
 */
function buildGeminiSystemContext() {
  const vendorSample = [];
  if (vendorsData && typeof vendorsData === 'object') {
    for (const [cat, list] of Object.entries(vendorsData)) {
      if (Array.isArray(list)) {
        for (const v of list.slice(0, 4)) {
          vendorSample.push({
            category: cat,
            name: v.name,
            suburb: v.suburb || v.area,
            priceTier: v.priceTier || v.priceLabel,
            phone: v.phone,
            specialty: (v.services || []).slice(0, 3).join(', ') || v.description
          });
        }
      }
    }
  }

  return `You are an expert Mumbai event planner and Lead Event Architect for the AI-Native Event Planning Platform operating across Mumbai and Maharashtra, India.
Build a realistic budget plan using current Mumbai market rates for the given locality, guest count and event type. Follow these rules strictly:
a) Allocate budget to NON-NEGOTIABLE items first, at premium quality. Never reduce them to make the numbers fit.
b) Allocate a balanced, standard-quality share to IMPORTANT items.
c) Give FLEXIBLE items the minimum acceptable option (basic, DIY, bundled or skipped) and trim them first when the budget is tight.
d) Check per-guest spend against the budget. If the non-negotiables alone exceed the budget, do NOT silently downgrade them. Show the exact shortfall and give 3 options: increase budget by ₹X, reduce guest count to N, or downgrade one named non-negotiable to Important.
e) If budget is left over, upgrade non-negotiables first, then important items.
f) For every line item, give a one-line reason that mentions the user's priority level.
g) Respect hard constraints like Pure Veg/Jain across all categories.
Return only valid JSON in the schema below.

Grounding Reference: You have direct access to real Mumbai vendors and realistic Indian pricing.
Sample Grounded Vendors:
${JSON.stringify(vendorSample.slice(0, 8), null, 2)}

Ensure:
1. Dual Timelines (multi-week prepCountdown & day-of hour-by-hour runOfShow).
2. Vendor Checklists with concrete hiring criteria and WhatsApp inquiry RFPs.
3. Bespoke themes, curated food menu, and tailored WhatsApp broadcast invites.`;
}

/**
 * Handle HTTP Requests
 */
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let parsedUrl = req.url.split('?')[0];

  // Helper to read JSON request body
  const readBody = () => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2 * 1024 * 1024) { // 2MB limit
        reject(new Error("Request body too large"));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
  });

  // Helper to send JSON response
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  // Route: Health & Status
  if (req.method === 'GET' && parsedUrl === '/api/status') {
    return sendJson(200, {
      status: 'online',
      hasApiKey: !!(runtimeApiKey || process.env.GEMINI_API_KEY),
      vendorCount: Object.keys(vendorsData).reduce((acc, k) => acc + (vendorsData[k]?.length || 0), 0),
      timestamp: new Date().toISOString()
    });
  }

  // Route: Update Runtime API Key
  if (req.method === 'POST' && parsedUrl === '/api/config') {
    try {
      const body = await readBody();
      if (body.apiKey) {
        runtimeApiKey = body.apiKey.trim();
        process.env.GEMINI_API_KEY = runtimeApiKey;
        console.log('🔑 Gemini API key updated dynamically in memory.');
        return sendJson(200, { success: true, message: 'API key configured successfully.' });
      } else {
        return sendJson(400, { error: 'Missing apiKey parameter' });
      }
    } catch (err) {
      return sendJson(500, { error: err.message });
    }
  }

  // Route: Generate Plan
  if (req.method === 'POST' && parsedUrl === '/api/plan-event') {
    try {
      const body = await readBody();
      const clientApiKey = req.headers['x-gemini-api-key'] || body.apiKey || runtimeApiKey || process.env.GEMINI_API_KEY;

      const {
        prompt,
        eventType,
        guests,
        guestCount,
        budget,
        totalBudget,
        perGuestBudget,
        locality,
        customIdeas,
        priorities
      } = body;

      const finalGuests = parseInt(guestCount || guests, 10) || 50;
      const finalBudget = parseFloat(totalBudget || budget) || 100000;
      const finalPerGuestBudget = perGuestBudget || Math.round(finalBudget / Math.max(finalGuests, 1));
      const finalPriorities = priorities || { nonNegotiable: [], important: [], flexible: [] };

      console.log(`\n✨ Plan Request received: ${eventType || 'event'} | Guests: ${finalGuests} | Budget: ₹${finalBudget} | Locality: ${locality}`);
      console.log(`🔒 Priorities: Non-negotiable [${(finalPriorities.nonNegotiable || []).join(', ')}] | Flexible [${(finalPriorities.flexible || []).join(', ')}]`);
      if (customIdeas) console.log(`💡 Personalized Idea: "${customIdeas}"`);

      const enrichedBody = {
        ...body,
        guests: finalGuests,
        guestCount: finalGuests,
        budget: finalBudget,
        totalBudget: finalBudget,
        perGuestBudget: finalPerGuestBudget,
        priorities: finalPriorities
      };

      // If we have an API key, use Gemini 2.5 / 1.5 Flash
      if (clientApiKey && clientApiKey.length > 10) {
        try {
          console.log(`🤖 Invoking Gemini API with grounding context...`);
          const systemContext = buildGeminiSystemContext();
          const userPrompt = `Synthesize a realistic Mumbai event plan adhering strictly to the priority system:
Event Type: ${eventType || 'general event'}
Location: ${locality || 'Mumbai'}
Guests: ${finalGuests}
Total Budget (INR): ₹${finalBudget}
Per-Guest Spend: ₹${finalPerGuestBudget}
Priorities:
- 🔒 Non-negotiable: ${(finalPriorities.nonNegotiable || []).join(', ') || 'None specified'}
- ⭐ Important: ${(finalPriorities.important || []).join(', ') || 'Standard balanced'}
- 💸 Flexible: ${(finalPriorities.flexible || []).join(', ') || 'Standard flex'}
User Prompt / Vision: ${prompt || 'Create a wonderful, memorable event'}
Personalized Ideas / Touches: ${customIdeas || 'None specified'}

Ensure budget lineItems strictly honor non-negotiables first at premium quality, balanced standard quality to important items, and trim flexible items first if tight.`;

          const plan = await callGemini(userPrompt, systemContext, clientApiKey);
          console.log(`✅ Gemini synthesis completed successfully.`);
          return sendJson(200, { success: true, plan, engine: 'gemini' });
        } catch (geminiErr) {
          console.warn(`⚠️ Gemini API call failed (${geminiErr.message}). Seamlessly engaging intelligent fallback engine.`);
          const fallbackPlan = generateIntelligentFallbackPlan(enrichedBody);
          return sendJson(200, {
            success: true,
            plan: fallbackPlan,
            engine: 'intelligent-fallback',
            warning: `Gemini API reported: ${geminiErr.message}. Powered by local intelligent grounding synthesizer.`
          });
        }
      } else {
        // No API key provided: use intelligent fallback synthesizer
        console.log(`ℹ️ No Gemini API key provided. Using local intelligent grounding synthesizer.`);
        const fallbackPlan = generateIntelligentFallbackPlan(enrichedBody);
        return sendJson(200, {
          success: true,
          plan: fallbackPlan,
          engine: 'intelligent-fallback',
          note: 'Generated via built-in intelligent synthesizer. Provide a Gemini API key anytime for live neural reasoning.'
        });
      }
    } catch (err) {
      console.error('Error generating plan:', err);
      return sendJson(500, { error: err.message });
    }
  }

  // Route: Conversational Refinement
  if (req.method === 'POST' && parsedUrl === '/api/refine-plan') {
    try {
      const body = await readBody();
      const clientApiKey = req.headers['x-gemini-api-key'] || body.apiKey || runtimeApiKey || process.env.GEMINI_API_KEY;
      const { currentPlan, refinementPrompt } = body;

      if (!currentPlan || !refinementPrompt) {
        return sendJson(400, { error: 'currentPlan and refinementPrompt are required' });
      }

      console.log(`\n🔄 Conversational Refinement requested: "${refinementPrompt}"`);

      if (clientApiKey && clientApiKey.length > 10) {
        try {
          const systemContext = buildGeminiSystemContext();
          const refinePrompt = `Here is the current structured event plan:
${JSON.stringify(currentPlan, null, 2)}

The user requests this specific refinement:
"${refinementPrompt}"

Apply this change thoughtfully across all 4 quadrants (budget adjustments, timeline modifications, vendor requirements, theme/menu changes). Return the updated plan adhering strictly to the JSON schema.`;

          const updatedPlan = await callGemini(refinePrompt, systemContext, clientApiKey);
          return sendJson(200, { success: true, plan: updatedPlan, engine: 'gemini' });
        } catch (err) {
          console.warn('Gemini refine failed, applying rule-based refinement:', err.message);
        }
      }

      // Fallback rule-based refinement
      const updatedPlan = JSON.parse(JSON.stringify(currentPlan));
      const text = refinementPrompt.toLowerCase();

      // Check for diet modifications (Jain, Vegan, Veg)
      if (text.includes('jain') || text.includes('vegan') || text.includes('veg')) {
        updatedPlan.personalizedIdeas.curatedMenu.unshift({
          section: "Special Dietary Counter",
          items: ["Strict Jain / Pure Vegan Live Counter", "Root-Vegetable Free Delicacies", "Organic Fresh Cold Pressed Juices"]
        });
        updatedPlan.budget.tradeoffAdvice += ` | Note: Tailored catering counters for ${text.includes('jain') ? 'strict Jain' : 'vegan'} dietary preferences.`;
      }

      // Check for budget adjustments
      const numMatch = text.match(/₹?\s?(\d+[\d,]*)\s?(k|lakh|thousand)?/i);
      if (numMatch && (text.includes('cut') || text.includes('reduce') || text.includes('save') || text.includes('add'))) {
        let amount = parseInt(numMatch[1].replace(/,/g, ''), 10);
        if (numMatch[2]?.toLowerCase() === 'k') amount *= 1000;
        if (numMatch[2]?.toLowerCase() === 'lakh') amount *= 100000;

        if (text.includes('cut') || text.includes('reduce') || text.includes('save')) {
          updatedPlan.budget.totalBudget = Math.max(10000, updatedPlan.budget.totalBudget - amount);
          updatedPlan.eventSummary.budget = updatedPlan.budget.totalBudget;
          updatedPlan.budget.tradeoffAdvice = `Refinement applied: Reduced total expenditure by ₹${amount.toLocaleString('en-IN')}. Scaled non-essential decor and buffer allocation accordingly.`;
        }
      }

      // Check for music/DJ
      if (text.includes('dj') || text.includes('music') || text.includes('sound')) {
        updatedPlan.timeline.runOfShow.push({
          time: "20:30 - 21:45",
          phase: "Live Music / DJ Jam",
          activity: "Guest dance floor opens with curated Bollywood & retro hits",
          responsibleParty: "DJ & Sound Coordinator",
          criticalNotes: "Strict compliance with 10:00 PM residential sound limitation."
        });
      }

      return sendJson(200, { success: true, plan: updatedPlan, engine: 'intelligent-fallback' });
    } catch (err) {
      return sendJson(500, { error: err.message });
    }
  }

  // Route: Static Files
  let filePath = path.join(PUBLIC_DIR, parsedUrl === '/' ? 'index.html' : parsedUrl);
  let ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA
      filePath = path.join(PUBLIC_DIR, 'index.html');
      ext = '.html';
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 AI-Native Event Planner Server running at:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Grounding Data: Mumbai Vendors, Locations & Pricing`);
  console.log(`   Gemini AI Mode: ${runtimeApiKey ? 'Configured 🟢' : 'Ready for API Key (Fallback Active 🟡)'}`);
  console.log(`=======================================================`);
});
