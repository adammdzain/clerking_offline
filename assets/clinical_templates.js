/**
 * ED DOC - CENTRALIZED CLINICAL TEMPLATES CONFIGURATION
 * Edit menus, submenus, parameters, and chip buttons directly in this file!
 * Changes made here will automatically render in the app and format clinical notes.
 */

const CLINICAL_TEMPLATES = [
  {
    "category": "Patient Demographic",
    "containerId": "demographic-container",
    "noAccordion": true,
    "submenus": [
      {
        "id": "demographic-section",
        "title": "Patient Demographic",
        "noteHeader": "Patient Demographics",
        "fields": [
          {
            "id": "patientName",
            "label": "Name",
            "prefix": "Name",
            "placeholder": "Patient full name"
          },
          {
            "id": "patientID",
            "label": "IC / Passport",
            "prefix": "IC / Passport",
            "placeholder": "e.g., 901010-14-1234 (auto-calculates age)"
          },
          {
            "id": "patientAge",
            "label": "Calculated Age",
            "prefix": "Calculated Age",
            "customInput": "age-builder",
            "placeholder": "e.g., 25y 3m"
          },
          {
            "id": "patientGender",
            "label": "Gender",
            "prefix": "Gender",
            "chips": [
              "Male",
              "Female",
              "Other"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "patientHospitalID",
            "label": "Hospital RN / MRN",
            "prefix": "Hospital RN / MRN",
            "placeholder": "Hospital Registration No"
          },
          {
            "id": "patientPhone",
            "label": "Phone number",
            "prefix": "Phone number",
            "placeholder": "Contact number"
          },
          {
            "id": "patientAddress",
            "label": "Address",
            "prefix": "Address",
            "placeholder": "Residential address"
          }
        ]
      }
    ]
  },
  {
    "category": "Medical History",
    "containerId": "history-container",
    "noAccordion": true,
    "submenus": [
      {
        "id": "history-section",
        "title": "Medical History",
        "noteHeader": "Medical History",
        "fields": [
          {
            "id": "historyUnderlying",
            "label": "Underlying Medical Conditions",
            "prefix": "Underlying Medical Conditions",
            "chips": [
              "DM",
              "HTN",
              "HLD",
              "STROKE",
              "IHD",
              "CKD",
              "ESRF",
              "ASTHMA",
              "COPD"
            ],
            "multi": true,
            "placeholder": "Tap buttons or type additional conditions (e.g., Asthma)..."
          },
          {
            "id": "historyAllergy",
            "label": "Allergies (Drug / Food)",
            "prefix": "Allergies (Drug / Food)",
            "placeholder": "e.g., Penicillin (Anaphylaxis), NKDA"
          },
          {
            "id": "historyMedication",
            "label": "Current Medications",
            "prefix": "Current Medications",
            "placeholder": "e.g., Metformin 500mg BD, Amlodipine 10mg OD"
          },
          {
            "id": "historySurgical",
            "label": "Surgical History",
            "prefix": "Surgical History",
            "placeholder": "e.g., Appendectomy (2018), TKR"
          },
          {
            "id": "historyImmunization",
            "label": "Immunization Status",
            "prefix": "Immunization Status",
            "chips": [
              "Up-to-date / Full",
              "Partial / Incomplete",
              "Unimmunized / Nil",
              "Unknown"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "historyBirth",
            "label": "Birth History (Paediatric)",
            "prefix": "Birth History (Paediatric)",
            "placeholder": "e.g., SVD at term, BW 3.2kg, uncomplicated"
          },
          {
            "id": "historyGynaecological",
            "label": "Gynaecological / Obstetric History",
            "prefix": "Gynaecological / Obstetric History",
            "placeholder": "e.g., LNMP 14/05, G2P1, regular cycles"
          }
        ]
      }
    ]
  },
  {
    "category": "HOPI",
    "containerId": "sections-container",
    "submenus": [
      {
        "id": "fever-section",
        "title": "Fever",
        "noteHeader": "Fever",
        "fields": [
          {
            "id": "feverDuration",
            "label": "Duration",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "feverOnset",
            "label": "Onset",
            "prefix": "onset",
            "chips": [
              "Acute (< 24h)",
              "Sudden",
              "Gradual"
            ],
            "placeholder": "e.g., Acute, yesterday evening"
          },
          {
            "id": "feverPattern",
            "label": "Pattern",
            "prefix": "pattern",
            "chips": [
              "High grade",
              "Low grade",
              "Continuous",
              "Intermittent",
              "Chills / Rigors"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "feverlastPCM",
            "label": "Last Antipyretic / PCM",
            "prefix": "last antipyretic",
            "chips": [
              "< 2 hours ago",
              "4-6 hours ago",
              "> 6 hours ago",
              "None today"
            ],
            "placeholder": "e.g., PCM 1g taken 2 hours ago"
          },
          {
            "id": "feverassociation",
            "label": "Associated symptoms",
            "prefix": "associated with",
            "chips": [
              "Chills / Rigors",
              "Myalgia",
              "Headache",
              "Retro-orbital pain",
              "Arthralgia",
              "Nausea",
              "Vomiting",
              "Poor oral intake"
            ],
            "placeholder": "e.g., Chills, rigors, body ache, headache"
          }
        ]
      },
      {
        "id": "rash-section",
        "title": "Rash",
        "noteHeader": "Rash",
        "fields": [
          {
            "id": "rashDuration",
            "label": "Duration",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "rashLocation",
            "label": "Location & Appearance",
            "prefix": "location/appearance",
            "chips": [
              "Maculopapular",
              "Erythematous",
              "Pruritic / Itchy",
              "Trunk & limbs",
              "Face & neck",
              "Petechiae / Purpura",
              "Vesicular / Blisters",
              "Non-blanching"
            ],
            "placeholder": "e.g., Maculopapular over trunk, intensely pruritic"
          }
        ]
      },
      {
        "id": "cough-section",
        "title": "Cough",
        "noteHeader": "Cough",
        "fields": [
          {
            "id": "coughDuration",
            "label": "Duration",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "coughProductive",
            "label": "Nature / Type",
            "prefix": "nature",
            "chips": [
              "Productive cough",
              "Dry cough",
              "Barking cough",
              "Paroxysmal nocturnal",
              "Post-tussive emesis"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "coughSputum",
            "label": "Sputum Details",
            "prefix": "sputum",
            "chips": [
              "Whitish / Clear",
              "Yellowish",
              "Greenish / Purulent",
              "Blood-streaked / Hemoptysis",
              "Thick tenacious",
              "Copious amount",
              "Scanty amount"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "coughAssociation",
            "label": "Associated Symptoms",
            "prefix": "associated with",
            "chips": [
              "Shortness of breath",
              "Wheezing",
              "Chest discomfort",
              "Sore throat",
              "Rhinorrhea",
              "Fever"
            ],
            "placeholder": "e.g., SOB, chest tightness, sore throat"
          }
        ]
      },
      {
        "id": "sob-section",
        "title": "Shortness of Breath",
        "noteHeader": "Shortness of Breath",
        "fields": [
          {
            "id": "SOBDuration",
            "label": "Duration",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "SOBExertion",
            "label": "Severity / Trigger",
            "prefix": "severity",
            "chips": [
              "At rest",
              "On mild exertion",
              "On moderate exertion",
              "Walking uphill/stairs",
              "Sudden onset acute",
              "Gradual worsening"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "SOBAssociation",
            "label": "Associated Features",
            "prefix": "orthopnea/PND/features",
            "chips": [
              "Orthopnea (2 pillows)",
              "Orthopnea (3 pillows)",
              "PND (+)",
              "Bilateral pedal edema",
              "Chest tightness",
              "Wheezing",
              "Stridor",
              "Palpitations"
            ],
            "placeholder": "Tap buttons or type custom value..."
          }
        ]
      },
      {
        "id": "pain-section",
        "title": "Pain (SOCRATES)",
        "noteHeader": "Pain (SOCRATES)",
        "fields": [
          {
            "id": "painLocation",
            "label": "Site / Region (S)",
            "prefix": "region",
            "chips": [
              "Epigastric",
              "Right Upper Quadrant (RUQ)",
              "Right Lower Quadrant (RLQ)",
              "Left Lower Quadrant (LLQ)",
              "Retrosternal / Precordial",
              "Lower back / Lumbar",
              "Right flank",
              "Left flank"
            ],
            "placeholder": "Tap buttons or type region..."
          },
          {
            "id": "painSite",
            "label": "Specific Details",
            "prefix": "specific site",
            "chips": [
              "Localized",
              "Diffuse",
              "Superficial",
              "Deep visceral"
            ],
            "placeholder": "e.g., localized to RLQ McBurney point"
          },
          {
            "id": "painOnset",
            "label": "Onset (O)",
            "prefix": "onset",
            "chips": [
              "Sudden acute",
              "Gradual insidious",
              "Woke up from sleep",
              "Post-prandial",
              "Post-trauma"
            ],
            "placeholder": "Tap buttons or type onset..."
          },
          {
            "id": "painCharacter",
            "label": "Character (C)",
            "prefix": "character",
            "chips": [
              "Colicky / Cramping",
              "Dull aching",
              "Sharp / Stabbing",
              "Burning",
              "Crushing / Heaviness",
              "Throbbing"
            ],
            "placeholder": "Tap buttons or type character..."
          },
          {
            "id": "painRadiation",
            "label": "Radiation (R)",
            "prefix": "radiation",
            "chips": [
              "No radiation",
              "Radiates to back",
              "Radiates to right shoulder",
              "Radiates to left shoulder/jaw",
              "Radiates to groin"
            ],
            "placeholder": "Tap buttons or type radiation..."
          },
          {
            "id": "painDuration",
            "label": "Duration / Timing (T)",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "painExacerb",
            "label": "Exacerbating / Relieving (E)",
            "prefix": "aggravating/relieving factors",
            "chips": [
              "Worse with movement",
              "Worse with food / meals",
              "Relieved by antacids",
              "Relieved by leaning forward",
              "Relieved by rest",
              "No relieving factors"
            ],
            "placeholder": "Tap buttons or type factors..."
          },
          {
            "id": "painScore",
            "label": "Pain Score (S: 1-10)",
            "prefix": "pain score",
            "suffix": "/10",
            "chips": [
              "2/10 (Mild)",
              "4/10 (Moderate)",
              "6/10 (Moderate-Severe)",
              "8/10 (Severe)",
              "10/10 (Worst ever)"
            ],
            "placeholder": "e.g., 7"
          }
        ]
      },
      {
        "id": "gi-section",
        "title": "Gastrointestinal Symptoms",
        "noteHeader": "Gastrointestinal Symptoms",
        "fields": [
          {
            "id": "giDuration",
            "label": "Duration",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "vomitingFrequency",
            "label": "Vomiting Frequency & Nature",
            "prefix": "vomiting",
            "chips": [
              "None",
              "1-2 times",
              "3-5 times",
              "> 5 times",
              "Food particles",
              "Bilious / Green",
              "Coffee-ground / Blood-stained",
              "Non-projectile",
              "Projectile"
            ],
            "placeholder": "e.g., 3x postprandial, bilious, no hematemesis"
          },
          {
            "id": "diarrheaFrequency",
            "label": "Diarrhea Frequency & Stool Nature",
            "prefix": "diarrhea",
            "chips": [
              "None",
              "2-3 times/day",
              "4-6 times/day",
              "> 6 times/day",
              "Watery",
              "Loose stool",
              "Mucoid",
              "Blood-stained / Dysentery",
              "Melena (black tarry)"
            ],
            "placeholder": "e.g., 4x watery stool, no blood, no mucus"
          },
          {
            "id": "giHydration",
            "label": "Oral Intake & Hydration",
            "prefix": "hydration/intake",
            "chips": [
              "Tolerating orally well",
              "Poor oral intake",
              "Cannot tolerate fluids / vomiting everything",
              "Normal urine output",
              "Reduced urine output / concentrated"
            ],
            "placeholder": "e.g., Poor oral intake, reduced urine output"
          }
        ]
      },
      {
        "id": "syncope-section",
        "title": "Syncope / Collapse",
        "noteHeader": "Syncope / Collapse",
        "fields": [
          {
            "id": "syncopeDuration",
            "label": "Duration / Timing",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "syncopeCircumstance",
            "label": "Circumstance & Prodrome",
            "prefix": "circumstance",
            "chips": [
              "Sudden standing (Orthostatic)",
              "Prolonged standing",
              "Exertional",
              "Post-micturition / Vasovagal",
              "Lightheadedness / Tunnel vision prodrome",
              "No warning / Sudden drop",
              "Preceding palpitations",
              "Preceding chest pain"
            ],
            "placeholder": "e.g., Upon standing from bed, lightheadedness prodrome"
          },
          {
            "id": "syncopeRecovery",
            "label": "Event & Recovery",
            "prefix": "recovery",
            "chips": [
              "Brief LOC (< 1 min)",
              "Rapid spontaneous recovery",
              "No confusion / oriented immediately",
              "No limb twitching",
              "No tongue bite / incontinence",
              "Head strike during fall"
            ],
            "placeholder": "e.g., Unconscious ~30 secs, prompt complete recovery"
          }
        ]
      },
      {
        "id": "ams-section",
        "title": "Altered Mental Status",
        "noteHeader": "Altered Mental Status",
        "fields": [
          {
            "id": "amsOnset",
            "label": "Onset & Duration",
            "prefix": "onset",
            "chips": [
              "Acute (< 24h)",
              "Fluctuating over days",
              "Progressive decline over weeks",
              "Sudden acute confusion",
              "Post-fall / Trauma"
            ],
            "placeholder": "e.g., Acute onset confusion since this morning"
          },
          {
            "id": "amsBaseline",
            "label": "Baseline Functional Status",
            "prefix": "baseline",
            "chips": [
              "Premorbid independent ADL",
              "Premorbid dementia / mild cognitive impairment",
              "Wheelchair-bound / Semi-dependent",
              "Bedbound / Total dependent"
            ],
            "placeholder": "e.g., Independent ADL at baseline, talks normally"
          },
          {
            "id": "amsFeatures",
            "label": "Associated Features",
            "prefix": "features",
            "chips": [
              "Disoriented to time/place",
              "Lethargic / Drowsy",
              "Agitated / Restless",
              "Visual / Auditory hallucinations",
              "Fever / Neck stiffness",
              "Hypoglycemia recorded",
              "No focal neurological deficit"
            ],
            "placeholder": "e.g., Drowsy, disoriented, responding to simple verbal commands"
          }
        ]
      },
      {
        "id": "bleeding-section",
        "title": "Bleeding Manifestations",
        "noteHeader": "Bleeding",
        "fields": [
          {
            "id": "bleedingDuration",
            "label": "Duration",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "bleedingSite",
            "label": "Site / Source",
            "prefix": "site",
            "chips": [
              "Epistaxis (Nosebleed)",
              "Gum bleeding",
              "Hemoptysis",
              "Hematemesis (Vomiting blood)",
              "Melena (Black stool)",
              "Hematochezia (Fresh PR bleed)",
              "Hematuria (Blood in urine)",
              "Ecchymosis / Petechiae"
            ],
            "placeholder": "e.g., Bilateral epistaxis, gum bleeding"
          },
          {
            "id": "bleedingAmount",
            "label": "Amount & Nature",
            "prefix": "amount",
            "chips": [
              "Minimal / Scanty",
              "Moderate (~half cup)",
              "Copious / Profuse",
              "Fresh red blood",
              "Altered dark blood / Clots",
              "Active oozing present",
              "Spontaneously arrested"
            ],
            "placeholder": "e.g., Moderate amount, spontaneously arrested after compression"
          }
        ]
      },
      {
        "id": "vision-section",
        "title": "Visual Disturbances",
        "noteHeader": "Blurry Vision",
        "fields": [
          {
            "id": "visionEye",
            "label": "Eye(s) Involved",
            "prefix": "eye involved",
            "chips": [
              "Right eye only",
              "Left eye only",
              "Bilateral eyes",
              "Monocular loss",
              "Binocular diplopia (double vision)"
            ],
            "placeholder": "e.g., Right eye"
          },
          {
            "id": "visionOnset",
            "label": "Onset & Duration",
            "prefix": "onset/duration",
            "chips": [
              "Sudden painless visual loss",
              "Sudden painful visual loss",
              "Gradual progressive blurring",
              "Transient amaurosis fugax (< 1h)",
              "Persistent since yesterday"
            ],
            "placeholder": "e.g., Sudden onset 2 hours ago, painless"
          },
          {
            "id": "visionAssociated",
            "label": "Associated Features",
            "prefix": "associated features",
            "chips": [
              "Eye pain / Headache",
              "Eye redness / Conjunctival injection",
              "Halos around lights",
              "Floaters & Flashes",
              "Diplopia",
              "Photophobia",
              "Focal neurological deficit"
            ],
            "placeholder": "e.g., Severe right peri-orbital pain, seeing halos"
          }
        ]
      },
      {
        "id": "dizziness-section",
        "title": "Dizziness / Vertigo",
        "noteHeader": "Dizziness",
        "fields": [
          {
            "id": "dizzinessDuration",
            "label": "Duration",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "dizzinessType",
            "label": "Type / Sensation",
            "prefix": "type",
            "chips": [
              "True spinning vertigo (room spinning)",
              "Lightheadedness / Faint sensation",
              "Disequilibrium / Unsteadiness",
              "Giddiness on standing (Orthostatic)"
            ],
            "placeholder": "Tap buttons or type sensation..."
          },
          {
            "id": "dizzinessTriggers",
            "label": "Triggers & Associated Features",
            "prefix": "triggers/associations",
            "chips": [
              "Triggered by head movement (BPPV-like)",
              "Continuous constant spinning",
              "Associated nausea & vomiting",
              "Hearing loss / Tinnitus",
              "Ear fullness",
              "No focal neurological signs",
              "Ataxic gait"
            ],
            "placeholder": "e.g., Triggered by turning head to right, nausea (+)"
          }
        ]
      },
      {
        "id": "headache-section",
        "title": "Headache",
        "noteHeader": "Headache",
        "fields": [
          {
            "id": "headacheOnset",
            "label": "Onset & Severity",
            "prefix": "onset",
            "chips": [
              "Sudden thunderclap (< 1 min to peak)",
              "Acute onset (< 24h)",
              "Subacute over days",
              "Worst headache of life",
              "Gradual worsening"
            ],
            "placeholder": "e.g., Sudden severe onset 3 hours ago"
          },
          {
            "id": "headacheLocation",
            "label": "Location & Character",
            "prefix": "location/character",
            "chips": [
              "Unilateral (Hemicranial)",
              "Bilateral (Band-like)",
              "Occipital / Neck",
              "Frontal / Retro-orbital",
              "Throbbing / Pulsating",
              "Dull tightness",
              "Stabbing"
            ],
            "placeholder": "e.g., Right throbbing hemicranial, severe"
          },
          {
            "id": "headacheFeatures",
            "label": "Associated Red Flags",
            "prefix": "features",
            "chips": [
              "Photophobia & Phonophobia",
              "Nausea & Vomiting",
              "Neck stiffness / Meningism",
              "Focal neurological deficit",
              "Fever",
              "Visual aura",
              "No red flags"
            ],
            "placeholder": "e.g., Photophobia, nausea, neck stiffness negative"
          }
        ]
      },
      {
        "id": "fit-section",
        "title": "Seizure / Fit Episode",
        "noteHeader": "Fit Episode",
        "fields": [
          {
            "id": "fitDuration",
            "label": "Duration",
            "prefix": "duration",
            "chips": [
              "1 day",
              "2 days",
              "3 days",
              "4 days",
              "5 days",
              "6 days",
              "1 week",
              "2 weeks",
              "3 weeks",
              "1 month"
            ],
            "placeholder": "Tap buttons or type custom value..."
          },
          {
            "id": "fitType",
            "label": "Semiology / Type",
            "prefix": "type/description",
            "chips": [
              "Generalized tonic-clonic (GTC)",
              "Focal seizure with motor signs",
              "Absence / Staring episode",
              "Single episode",
              "Multiple recurrent episodes",
              "Status epilepticus (> 5 min)"
            ],
            "placeholder": "e.g., Generalized jerky movements of all 4 limbs"
          },
          {
            "id": "fitPostIctal",
            "label": "Associated & Post-ictal State",
            "prefix": "post-ictal/associated",
            "chips": [
              "Upward rolling of eyes",
              "Tongue biting (lateral border)",
              "Urinary incontinence",
              "Post-ictal confusion (15-30 mins)",
              "Todd's paresis",
              "Fever present (Febrile fit)",
              "Full recovery"
            ],
            "placeholder": "e.g., Upward eye rolling, tongue bite, 30 min confusion"
          }
        ]
      }
    ]
  },
  {
    "category": "Regular & Routine cases",
    "containerId": "routine-container",
    "submenus": [
      {
        "id": "nnj-section",
        "title": "Neonatal Jaundice (NNJ)",
        "noteHeader": "Neonatal Jaundice (NNJ)",
        "fields": [
          {
            "id": "nnjAge",
            "label": "Age (hours of life at TSB)",
            "prefix": "Age",
            "customInput": "nnj-age",
            "sectionHeader": "Baby"
          },
          {
            "id": "nnjBornAt",
            "label": "Born at (gestation)",
            "prefix": "Born at",
            "customInput": "nnj-ga"
          },
          {
            "id": "nnjBirthWeight",
            "label": "Birth weight (kg)",
            "prefix": "Birth weight",
            "suffix": " kg",
            "placeholder": "e.g., 3.1",
            "grid": "grid-3"
          },
          {
            "id": "nnjWeight",
            "label": "Current weight (kg)",
            "prefix": "Current weight",
            "suffix": " kg",
            "placeholder": "e.g., 2.9",
            "grid": "grid-3"
          },
          {
            "id": "nnjWeightLoss",
            "label": "Weight loss",
            "prefix": "Weight loss",
            "placeholder": "Fills itself from the weights",
            "grid": "grid-3"
          },
          {
            "id": "nnjRiskFactors",
            "label": "Risk factors for significant NNJ",
            "prefix": "Risk factors",
            "multi": true,
            "chips": [
              "No risk factors",
              "Prematurity",
              "Down syndrome",
              "Mother blood group O / Rh negative",
              "G6PD deficiency",
              "Cephalohaematoma / bruises",
              "Infant of diabetic mother",
              "Lactation failure (EBF)",
              "High predischarge bilirubin",
              "Sibling with severe NNJ / kernicterus",
              "Sibling with neonatal death",
              "Sibling with G6PD deficiency"
            ],
            "placeholder": "Tap all that apply",
            "sectionHeader": "History"
          },
          {
            "id": "nnjMotherBG",
            "label": "Mother's blood group",
            "prefix": "Mother's blood group",
            "chips": [
              "O Rh+",
              "A Rh+",
              "B Rh+",
              "AB Rh+",
              "Rh negative",
              "Unknown"
            ],
            "placeholder": "e.g., O Rh+"
          },
          {
            "id": "nnjG6PD",
            "label": "G6PD",
            "prefix": "G6PD",
            "chips": [
              "Normal",
              "Deficient",
              "Pending"
            ],
            "placeholder": "Normal / Deficient / Pending",
            "grid": "grid-2"
          },
          {
            "id": "nnjCTSH",
            "label": "CTSH",
            "prefix": "CTSH",
            "chips": [
              "Normal",
              "Pending",
              "Abnormal"
            ],
            "placeholder": "e.g., 8.2 mIU/L",
            "grid": "grid-2"
          },
          {
            "id": "nnjSymptoms",
            "label": "Symptoms",
            "prefix": "Symptoms",
            "multi": true,
            "chips": [
              "Active, feeding well",
              "Apnoea",
              "Poor feeding",
              "Feed intolerance / vomiting",
              "Temperature instability",
              "Lethargy",
              "Fever"
            ],
            "placeholder": "e.g., no apnoea, feeding well"
          },
          {
            "id": "nnjFeeding",
            "label": "Feeding",
            "prefix": "Feeding",
            "multi": true,
            "chips": [
              "Exclusive breastfeeding",
              "Formula feeding",
              "Mixed feeding",
              "2-3 hourly",
              "Good suckling",
              "Poor suckling"
            ],
            "placeholder": "e.g., EBF 2-3 hourly, good suckling"
          },
          {
            "id": "nnjOE",
            "label": "General condition",
            "prefix": "o/e",
            "multi": true,
            "chips": [
              "Active, alert, good cry",
              "Lethargic, weak cry",
              "Pink, well hydrated",
              "Dehydrated",
              "Signs of sepsis"
            ],
            "placeholder": "e.g., active, pink, well hydrated",
            "sectionHeader": "Examination"
          },
          {
            "id": "nnjAbdomen",
            "label": "Per abdomen",
            "prefix": "Per abdomen",
            "chips": [
              "Soft, non-distended, no HSM",
              "Hepatomegaly",
              "Splenomegaly"
            ],
            "placeholder": "e.g., soft, no HSM"
          },
          {
            "id": "nnjJaundiceLevel",
            "label": "Level of jaundice (Kramer)",
            "prefix": "Jaundice",
            "chips": [
              "Kramer 1 (head & neck)",
              "Kramer 2 (upper trunk, above umbilicus)",
              "Kramer 3 (lower trunk & thighs)",
              "Kramer 4 (arms & lower legs)",
              "Kramer 5 (palms & soles)",
              "None"
            ],
            "placeholder": "e.g., Kramer 3"
          },
          {
            "id": "nnjBindScore",
            "label": "BIND score",
            "prefix": "BIND score",
            "customInput": "bind-score",
            "placeholder": "Tap one in each row"
          },
          {
            "id": "nnjNeuroRisk",
            "label": "Neurotoxicity risk factors",
            "prefix": "Neurotoxicity risk factors",
            "customInput": "nnj-neuro",
            "sectionHeader": "Serum bilirubin"
          },
          {
            "id": "nnjThresholds",
            "label": "PT and ET thresholds",
            "prefix": "Thresholds",
            "customInput": "nnj-thresholds"
          },
          {
            "id": "nnjCalc",
            "label": "Bilirubin value",
            "prefix": "Bilirubin",
            "customInput": "nnj-calc",
            "placeholder": ""
          }
        ]
      },
      {
        "id": "urti-section",
        "title": "Upper Respiratory Tract Infection (URTI)",
        "noteHeader": "URTI",
        "fields": [
          {
            "id": "urtiSymptoms",
            "label": "Symptoms",
            "prefix": "Symptoms",
            "chips": [
              "Fever x 2 days",
              "Cough & Cold x 3 days",
              "Rhinorrhea / Stuffy nose",
              "Sore throat",
              "No shortness of breath",
              "No wheezing"
            ],
            "placeholder": "e.g., Runny nose, sore throat, cough"
          },
          {
            "id": "urtiExam",
            "label": "Examination",
            "prefix": "Examination",
            "chips": [
              "Throat injected / mildly hyperemic",
              "Tonsils not enlarged (grade 1)",
              "No tonsillar exudates",
              "Lungs clear bilaterally, no creps/rhonchi",
              "Tympanic membranes normal"
            ],
            "placeholder": "e.g., Erythematous throat, clear lungs"
          }
        ]
      },
      {
        "id": "asthma-section",
        "title": "Asthma",
        "noteHeader": "Asthma",
        "fields": [
          {
            "id": "asthmaSymptoms",
            "label": "Symptoms",
            "prefix": "Symptoms",
            "chips": [
              "Shortness of breath & wheezing",
              "Dry cough worse at night",
              "Triggered by cold weather / dust",
              "Mild exacerbation",
              "Moderate exacerbation",
              "Able to speak in full sentences"
            ],
            "placeholder": "e.g., Shortness of breath, wheezing"
          },
          {
            "id": "asthmaExam",
            "label": "Examination",
            "prefix": "Examination",
            "chips": [
              "Bilateral generalized rhonchi / wheezing",
              "Prolonged expiratory phase",
              "Tachypneic, no subcostal recession",
              "Air entry fair bilaterally",
              "SpO2 96% on room air"
            ],
            "placeholder": "e.g., Widespread rhonchi, prolonged expiration"
          },
          {
            "id": "asthmaTreatment",
            "label": "Treatment Given",
            "prefix": "Treatment",
            "chips": [
              "Neb Salbutamol 5mg x 1",
              "Neb Salbutamol + Ipratropium x 1",
              "Neb Combivent x 2",
              "IV Hydrocortisone 100mg",
              "Oral Prednisolone 30mg",
              "Good response post neb: lungs clear"
            ],
            "placeholder": "e.g., Neb Salbutamol x 1"
          }
        ]
      }
    ]
  },
  {
    "category": "Vital Signs",
    "containerId": "vitals-container",
    "noAccordion": true,
    "submenus": [
      {
        "id": "vital-signs-section",
        "title": "Vital Signs",
        "noteHeader": "Vital Signs",
        "fields": [
          {
            "id": "vitalBP",
            "label": "BP (mmHg)",
            "prefix": "BP",
            "suffix": " mmHg",
            "group": "vitals",
            "slider": {
              "type": "dual",
              "min": 30,
              "max": 300,
              "reversed": true,
              "defaultSys": 120,
              "defaultDia": 80,
              "unit": "mmHg"
            },
            "placeholder": "120/80"
          },
          {
            "id": "vitalHR",
            "label": "HR (bpm)",
            "prefix": "HR",
            "suffix": " bpm",
            "group": "vitals",
            "slider": {
              "type": "single",
              "min": 30,
              "max": 300,
              "reversed": false,
              "defaultVal": 80,
              "unit": "bpm"
            },
            "placeholder": "80"
          },
          {
            "id": "vitalRR",
            "label": "RR (/min)",
            "prefix": "RR",
            "suffix": " /min",
            "group": "vitals",
            "slider": {
              "type": "single",
              "min": 0,
              "max": 70,
              "reversed": false,
              "defaultVal": 18,
              "unit": "/min"
            },
            "placeholder": "18"
          },
          {
            "id": "vitalTemp",
            "label": "Temp (\u00b0C)",
            "prefix": "Temp",
            "suffix": "\u00b0C",
            "group": "vitals",
            "slider": {
              "type": "single",
              "min": 35.0,
              "max": 42.0,
              "step": 0.1,
              "reversed": false,
              "defaultVal": 37.0,
              "unit": "\u00b0C"
            },
            "placeholder": "37.0"
          },
          {
            "id": "vitalSpO2",
            "label": "SpO\u2082 (%)",
            "prefix": "SpO\u2082",
            "group": "vitals",
            "slider": {
              "type": "single",
              "min": 30,
              "max": 100,
              "step": 1,
              "reversed": false,
              "defaultVal": 98,
              "unit": "%"
            },
            "placeholder": "98%"
          }
        ]
      }
    ]
  },
  {
    "category": "Physical Examination",
    "containerId": "exam-sections-container",
    "submenus": [
      {
        "id": "exam-general-section",
        "title": "General Examination",
        "noteHeader": "Physical Examination - General",
        "fields": [
          {
            "id": "genAppearance",
            "label": "General Appearance",
            "prefix": "General appearance",
            "chips": [
              "Alert, conscious, comfortable",
              "Lethargic / Ill-looking",
              "Tachypneic, in respiratory distress",
              "Pale / Anemic",
              "Jaundiced",
              "Cyanosed",
              "Pink, not pale"
            ],
            "placeholder": "e.g., Alert, conscious, comfortable / tachypneic"
          },
          {
            "id": "genPerfusion",
            "label": "Perfusion / Hydration",
            "prefix": "Perfusion",
            "chips": [
              "Warm peripheries, CRT < 2s, pink",
              "Cold clammy peripheries, CRT > 2s",
              "Good pulse volume",
              "Moist mucous membranes, well hydrated",
              "Dry oral mucosa, sunken eyes"
            ],
            "placeholder": "e.g., Warm peripheries, CRT < 2s, pink, not dehydrated"
          }
        ]
      },
      {
        "id": "exam-neuro-section",
        "title": "Neurological System",
        "noteHeader": "Physical Examination - Neurological",
        "fields": [
          {
            "id": "vitalGCS",
            "label": "GCS",
            "prefix": "GCS",
            "customInput": "gcs-evm",
            "placeholder": "e.g., E4V5M6"
          },
          {
            "id": "neuroPupils",
            "label": "Pupils",
            "prefix": "Pupils",
            "chips": [
              "3mm/3mm, equal, round and reactive to light (PEARL)",
              "PEARL 3mm/3mm bilaterally",
              "Right pupil 4mm sluggish, left 3mm reactive",
              "Left pupil 4mm sluggish, right 3mm reactive",
              "Bilateral pinpoint pupils (1-2mm)",
              "Bilateral dilated fixed pupils (6mm)"
            ],
            "placeholder": "e.g., 3mm/3mm, equal, round and reactive to light (PEARL)"
          },
          {
            "id": "neuroMotor",
            "label": "Motor Power & Tone",
            "prefix": "Motor power",
            "chips": [
              "Power 5/5 in all 4 limbs, normal tone throughout",
              "Power 5/5 upper and lower limbs bilaterally",
              "Right hemiparesis: Upper 3/5, Lower 3/5",
              "Left hemiparesis: Upper 3/5, Lower 3/5",
              "Normal tone and reflexes throughout",
              "Hyperreflexia / Babinski upgoing right",
              "Hyperreflexia / Babinski upgoing left"
            ],
            "placeholder": "e.g., Power 5/5 in all 4 limbs, normal tone throughout"
          },
          {
            "id": "neuroCranial",
            "label": "Cranial Nerves / Sensation",
            "prefix": "Cranial nerves / Sensation",
            "chips": [
              "CN II-XII grossly intact, sensation intact, neck supple",
              "CN II-XII grossly intact",
              "Facial asymmetry / Right facial droop",
              "Facial asymmetry / Left facial droop",
              "Sensation intact throughout",
              "Neck supple, Kernig negative, Brudzinski negative"
            ],
            "placeholder": "e.g., CN II-XII grossly intact, sensation intact, neck supple"
          },
          {
            "id": "neuroCerebellar",
            "label": "Cerebellar / Gait",
            "prefix": "Cerebellar / Gait",
            "chips": [
              "No dysdiadochokinesia, finger-nose test normal",
              "Past pointing present",
              "Normal steady gait",
              "Ataxic / unsteady gait",
              "Romberg negative"
            ],
            "placeholder": "e.g., No dysdiadochokinesia, finger-nose test normal"
          }
        ]
      }
    ]
  },
  {
    "category": "Impression and Plan",
    "containerId": "impression-container",
    "noAccordion": true,
    "submenus": [
      {
        "id": "impression-section",
        "title": "Impression and Plan",
        "noteHeader": "Impression and Plan",
        "fields": [
          {
            "id": "finalDiagnosis",
            "label": "Impression / Working Diagnosis",
            "prefix": "Impression",
            "placeholder": "e.g., Acute appendicitis"
          },
          {
            "id": "impressionDifferentials",
            "label": "Differential Diagnoses",
            "prefix": "Differentials",
            "placeholder": "e.g., Ureteric colic, ovarian torsion"
          },
          {
            "id": "impressionPlan",
            "label": "Plan",
            "prefix": "Plan",
            "line": "Plan:\n{value}",
            "long": true,
            "placeholder": "One item per line, e.g.\n1. Keep NBM\n2. IV NS 1 pint 8 hourly\n3. Refer surgical team"
          }
        ]
      }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.CLINICAL_TEMPLATES = CLINICAL_TEMPLATES;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CLINICAL_TEMPLATES;
}
