// ============================================================
// REAL DATA — Extracted 1:1 from the original index.html
// Tom Holland-inspired Monsoon Cutting Cycle
// ============================================================

export type MealItem = string;

export type Meal = {
  time: string;
  label: string;
  name: string;
  items: MealItem[];
  macros: string;
  office?: boolean;
  timeSensitive?: boolean;
};

export type DayMealPlan = {
  name: string;
  subtitle: string;
  meals: Meal[];
  total: string;
};

// Parse macros string → { kcal, protein }
export function parseMacros(macroStr: string): { kcal: number; protein: number } {
  const kcalMatch = macroStr.match(/~?([\d.]+)\s*kcal/i);
  const proteinMatch = macroStr.match(/~?([\d.]+)\s*g\s*protein/i);
  return {
    kcal: kcalMatch ? parseFloat(kcalMatch[1]) : 0,
    protein: proteinMatch ? parseFloat(proteinMatch[1]) : 0,
  };
}

// Parse item macros for partial tracking — each item gets an equal share of the meal macros
export function itemMacros(meal: Meal, itemCount: number): { kcal: number; protein: number } {
  const total = parseMacros(meal.macros);
  const perItem = {
    kcal: total.kcal / itemCount,
    protein: total.protein / itemCount,
  };
  return perItem;
}

export const MEAL_DAYS: DayMealPlan[] = [
  { name: "Sunday", subtitle: "Rest day — relaxed home meal, still on plan",
    meals: [
      { time: "8:00 AM", label: "Breakfast", office: false,
        name: "Masala Omelette + Paratha",
        items: [
          "3 whole eggs, beaten with salt, pepper, green chilli, coriander",
          "1 medium onion (60g), finely chopped",
          "1 medium tomato (80g), deseeded, diced",
          "½ capsicum (50g), diced",
          "1 tsp ghee or oil for pan",
          "1 multigrain paratha (80g dough ball, cooked in ½ tsp ghee)",
          "100g curd (plain dahi) on the side",
        ],
        macros: "~38g protein · ~580 kcal · ~18g fat" },
      { time: "10:30 AM", label: "Mid-Morning", office: false,
        name: "Seasonal Fruit + Nuts",
        items: [
          "½ medium pomegranate, arils removed (~80g)",
          "1 small pear (100g) or 1 guava",
          "6 soaked almonds",
          "2 walnut halves",
        ],
        macros: "~5g protein · ~190 kcal · ~9g fat" },
      { time: "1:00 PM", label: "Lunch", office: false,
        name: "Rajma + Jeera Rice + Curd + Salad",
        items: [
          "1 cup cooked rajma (kidney beans, ~120g cooked, from 50g dry)",
          "¾ cup cooked jeera rice (~130g cooked, from 50g raw rice)",
          "1 medium lauki (bottle gourd, 150g), cooked with onion-tomato masala",
          "1 tsp ghee over rice",
          "150g curd (dahi)",
          "Salad: ½ cucumber (80g) sliced, 1 small onion (40g), lemon juice, chaat masala",
        ],
        macros: "~28g protein · ~620 kcal · ~10g fat" },
      { time: "5:00 PM", label: "Evening", office: false,
        name: "Roasted Makhana + Masala Chai",
        items: [
          "40g roasted makhana (fox nuts, about 2 handfuls), tossed with ¼ tsp ghee + chaat masala",
          "1 cup masala chai with 80ml milk, no sugar or 1 tsp jaggery",
        ],
        macros: "~6g protein · ~170 kcal · ~4g fat" },
      { time: "8:00 PM", label: "Dinner", office: false,
        name: "Moong Dal + Bhindi Sabzi + 1 Roti",
        items: [
          "¾ cup cooked moong dal (yellow, ~100g cooked, from 40g dry)",
          "200g bhindi (okra), washed, dried, sliced — sautéed in 1 tsp oil with cumin, onion",
          "1 medium multigrain roti (30g dough)",
          "½ tsp ghee on roti",
        ],
        macros: "~22g protein · ~440 kcal · ~10g fat" },
      { time: "9:30 PM", label: "Before Bed", office: false, timeSensitive: true,
        name: "Turmeric Milk",
        items: [
          "250ml warm full-fat milk",
          "¼ tsp turmeric powder",
          "Small pinch black pepper (helps absorb curcumin)",
          "No sugar",
        ],
        macros: "~8g protein · ~160 kcal · ~8g fat" },
    ], total: "≈2,160 kcal · ~107g protein (rest day, slightly lower)" },

  { name: "Monday", subtitle: "Post-Push morning — major protein refuel before office",
    meals: [
      { time: "6:00 AM", label: "Pre-Workout (before 6:30 AM)", office: false, timeSensitive: true,
        name: "Light Pre-Workout Snack",
        items: [
          "6 soaked almonds (soak overnight, peel in morning)",
          "2 walnut halves",
          "1 glass (200ml) warm water with juice of ½ lemon",
        ],
        macros: "~4g protein · ~100 kcal · ~8g fat" },
      { time: "8:45 AM", label: "Breakfast (post-workout)", office: false,
        name: "Egg Bhurji (3 eggs) + 2 Besan Chillas + Curd",
        items: [
          "3 whole eggs, scrambled with 1 tsp oil",
          "½ medium onion (40g), ½ tomato (50g), ½ capsicum (40g) for bhurji",
          "2 besan chillas: 100g besan (gram flour), ½ tsp ajwain, salt, water — thin batter",
          "1 tsp oil for chillas",
          "150g curd on the side",
        ],
        macros: "~38g protein · ~540 kcal · ~18g fat" },
      { time: "11:00 AM", label: "MAJOR LUNCH (before office)", office: false,
        name: "Paneer Bhurji + 2 Rotis + Moong Dal + Lauki Sabzi + Salad",
        items: [
          "120g paneer, crumbled — cooked with 1 tsp oil, onion, tomato, turmeric, garam masala",
          "1 medium onion (80g) + 1 medium tomato (80g) for paneer masala",
          "¾ cup cooked moong dal (from 35g dry), seasoned with jeera tadka",
          "150g lauki, diced and cooked with 1 tsp oil, cumin, coriander powder",
          "2 medium multigrain rotis (35g dough each)",
          "Salad: ½ cucumber (70g), 5–6 radish slices, lemon juice",
          "1 tsp ghee on dal",
        ],
        macros: "~40g protein · ~680 kcal · ~20g fat" },
      { time: "4:30 PM", label: "Office Snack", office: true,
        name: "Roasted Soya Chaat",
        items: [
          "50g dry roasted soya chunks (nutrela) — pre-pack these at home",
          "1 small cucumber, carry whole and slice at office",
          "Squeeze of lemon, pinch of chaat masala (carry in small box)",
        ],
        macros: "~26g protein · ~240 kcal · ~4g fat" },
      { time: "8:00 PM", label: "Dinner", office: false,
        name: "Soya Chaap Tikka + Bhindi + 1 Roti + Curd",
        items: [
          "100g fresh soya chaap, marinated in curd-spice mix, pan-grilled or air-fried",
          "200g bhindi, dry-roasted in 1 tsp oil with coriander powder, amchur",
          "1 multigrain roti (35g dough)",
          "100g curd on the side",
        ],
        macros: "~32g protein · ~460 kcal · ~14g fat" },
      { time: "9:30 PM", label: "Before Bed", office: false, timeSensitive: true,
        name: "Warm Turmeric Milk",
        items: [
          "250ml warm full-fat milk",
          "¼ tsp turmeric + pinch black pepper",
        ],
        macros: "~8g protein · ~160 kcal · ~8g fat" },
    ], total: "≈2,180 kcal · ~148g protein" },

  { name: "Tuesday", subtitle: "HIIT day — quick-digesting breakfast, major lunch before office",
    meals: [
      { time: "6:00 AM", label: "Pre-Workout", office: false, timeSensitive: true,
        name: "Dates + Almonds",
        items: [
          "3 Medjool dates (or 5 smaller Deglet dates, ~40g total)",
          "6 soaked almonds",
        ],
        macros: "~3g protein · ~150 kcal · ~4g fat" },
      { time: "8:45 AM", label: "Breakfast (post-HIIT)", office: false,
        name: "Vegetable Poha + 2 Boiled Eggs",
        items: [
          "80g dry poha (flattened rice), rinsed and drained",
          "½ medium onion (50g), mustard seeds, curry leaves, turmeric",
          "1 medium potato (80g), diced small — or skip for lower carb",
          "30g roasted peanuts (small handful)",
          "1 tsp oil, lemon juice, coriander to finish",
          "2 whole eggs, hard boiled",
        ],
        macros: "~24g protein · ~490 kcal · ~16g fat" },
      { time: "11:00 AM", label: "MAJOR LUNCH (before office)", office: false,
        name: "Soya Chunk Curry + 2 Rotis + Turai Sabzi + Curd + Salad",
        items: [
          "60g dry soya chunks, soaked 20 min in warm water, squeezed → cooked in onion-tomato gravy",
          "1 large onion (100g) + 2 medium tomatoes (160g) for curry base",
          "200g turai (ridge gourd), peeled, diced, cooked with jeera and garlic",
          "2 garlic cloves + 1 inch ginger (grated) in curry",
          "2 medium multigrain rotis (35g dough each)",
          "150g curd",
          "Salad: ½ cucumber, ½ small beetroot (40g) boiled, lemon",
        ],
        macros: "~38g protein · ~660 kcal · ~14g fat" },
      { time: "4:30 PM", label: "Office Snack", office: true,
        name: "Paneer Cubes + Fruit",
        items: [
          "75g paneer, cubed at home, sprinkled with chaat masala — carry in box",
          "1 medium pear (100g) or 1 small banana",
          "No heating needed",
        ],
        macros: "~16g protein · ~250 kcal · ~12g fat" },
      { time: "8:00 PM", label: "Dinner", office: false,
        name: "Egg Curry + Small Jeera Rice + Cucumber Raita",
        items: [
          "2 whole eggs, hard boiled, added to onion-tomato-garam masala gravy",
          "1 medium onion (80g) + 1 medium tomato (80g) for gravy",
          "½ cup cooked jeera rice (~90g cooked, from 35g raw rice)",
          "Raita: 100g curd, ½ cucumber (60g) grated, roasted jeera powder, salt",
        ],
        macros: "~24g protein · ~470 kcal · ~14g fat" },
      { time: "9:30 PM", label: "Before Bed", office: false, timeSensitive: true,
        name: "Warm Plain Milk",
        items: [
          "250ml warm full-fat milk",
          "No flavourings needed — eat a piece of jaggery (5g) separately if you need sweetness",
        ],
        macros: "~8g protein · ~150 kcal · ~8g fat" },
    ], total: "≈2,170 kcal · ~113g protein" },

  { name: "Wednesday", subtitle: "Post-Pull day — major lunch before office",
    meals: [
      { time: "6:00 AM", label: "Pre-Workout", office: false, timeSensitive: true,
        name: "Walnuts + Half Banana",
        items: [
          "4 walnut halves (~15g)",
          "1 small banana (80g, not fully ripe — lower glycemic)",
        ],
        macros: "~3g protein · ~130 kcal · ~8g fat" },
      { time: "8:45 AM", label: "Breakfast (post-Pull)", office: false,
        name: "2 Stuffed Besan Cheelas + Curd",
        items: [
          "100g besan, 1 tsp ajwain, ½ tsp turmeric, salt — make thin pancake batter with water",
          "Filling: 60g paneer, crumbled + 1 tbsp chopped onion + coriander + green chilli",
          "1 tsp oil per cheela × 2 cheelas",
          "200g curd on the side",
        ],
        macros: "~28g protein · ~470 kcal · ~14g fat" },
      { time: "11:00 AM", label: "MAJOR LUNCH (before office)", office: false,
        name: "Moong Dal + Bhindi Sabzi + Soya Pulao + Salad",
        items: [
          "½ cup cooked moong dal (from 25g dry, with tadka of ghee + jeera)",
          "150g bhindi, sliced, dry-roasted in 1 tsp oil with coriander-cumin powder, amchur",
          "Soya pulao: 50g raw rice cooked with 25g dry soya chunks + whole spices (bay leaf, cloves, cinnamon)",
          "1 small onion (60g) + 1 tomato (80g) for pulao masala",
          "Salad: ½ cucumber (70g), 1 small tomato (60g), lemon, black salt",
        ],
        macros: "~32g protein · ~590 kcal · ~10g fat" },
      { time: "4:30 PM", label: "Office Snack", office: true,
        name: "2 Boiled Eggs + Cucumber Sticks",
        items: [
          "2 whole eggs, hard boiled (boil batch at home on Sunday or Monday night)",
          "½ cucumber (80g) sliced into sticks — carry in a box",
          "Small sachet chaat masala or black salt",
        ],
        macros: "~14g protein · ~160 kcal · ~10g fat" },
      { time: "8:00 PM", label: "Dinner", office: false,
        name: "Paneer Tikka + Sautéed Spinach + 1 Roti",
        items: [
          "100g paneer, cubed — marinated in 2 tbsp curd + tandoori masala, cooked in pan/OTG",
          "150g fresh spinach (palak), sautéed in ½ tsp oil with garlic (3 cloves) + pinch nutmeg",
          "1 multigrain roti (35g dough)",
          "½ tsp ghee on roti",
        ],
        macros: "~28g protein · ~430 kcal · ~18g fat" },
      { time: "9:30 PM", label: "Before Bed", office: false, timeSensitive: true,
        name: "Warm Turmeric Milk",
        items: [
          "250ml warm full-fat milk",
          "¼ tsp turmeric + pinch black pepper",
        ],
        macros: "~8g protein · ~160 kcal · ~8g fat" },
    ], total: "≈1,940 kcal · ~113g protein" },

  { name: "Thursday", subtitle: "Post-Legs day — heavier lunch, office afternoon",
    meals: [
      { time: "6:00 AM", label: "Pre-Workout", office: false, timeSensitive: true,
        name: "Almonds + Dates",
        items: [
          "8 soaked almonds (soak overnight)",
          "2 dates (~20g)",
        ],
        macros: "~3g protein · ~130 kcal · ~6g fat" },
      { time: "8:45 AM", label: "Breakfast (post-Legs)", office: false,
        name: "3-Egg Veggie Omelette + Multigrain Toast",
        items: [
          "3 whole eggs beaten with salt, pepper, chilli flakes",
          "½ capsicum (50g) + 5–6 mushrooms (50g) or spinach — sautéed in ½ tsp oil as filling",
          "1 tsp oil/butter in pan for omelette",
          "2 slices multigrain bread (toasted), ~60g total",
        ],
        macros: "~28g protein · ~480 kcal · ~20g fat" },
      { time: "11:00 AM", label: "MAJOR LUNCH (before office)", office: false,
        name: "Paneer Bhurji + Lauki-Chana Dal + 2 Rotis + Salad + Curd",
        items: [
          "120g paneer crumbled — bhurji with 1 tsp oil, ½ onion (50g), 1 tomato (80g), cumin, coriander",
          "½ cup lauki-chana dal: 30g chana dal + 100g lauki cubed, cooked together with tadka",
          "2 medium rotis (35g dough each)",
          "150g curd",
          "Salad: ½ cucumber, ½ carrot (50g) grated, lemon, chaat masala",
        ],
        macros: "~42g protein · ~680 kcal · ~20g fat" },
      { time: "4:30 PM", label: "Office Snack", office: true,
        name: "Roasted Soya Chunks + Fruit",
        items: [
          "40g dry roasted soya chunks (pre-pack at home — these are crunchy and dry, no prep needed)",
          "1 medium apple (130g) or 1 guava",
          "Carry in a small zip-lock bag + fruit separately",
        ],
        macros: "~22g protein · ~240 kcal · ~3g fat" },
      { time: "8:00 PM", label: "Dinner", office: false,
        name: "Soya Chaap Curry + Small Jeera Rice + Salad",
        items: [
          "100g fresh soya chaap, cut into pieces — cooked in onion-tomato-curd gravy",
          "1 large onion (100g) + 1 medium tomato (80g) for gravy",
          "½ cup cooked jeera rice (~90g, from 35g raw rice)",
          "Salad: ½ cucumber, 1 small tomato, lemon",
        ],
        macros: "~28g protein · ~440 kcal · ~10g fat" },
      { time: "9:30 PM", label: "Before Bed", office: false, timeSensitive: true,
        name: "Warm Plain Milk",
        items: ["250ml warm full-fat milk"],
        macros: "~8g protein · ~150 kcal · ~8g fat" },
    ], total: "≈2,120 kcal · ~131g protein" },

  { name: "Friday", subtitle: "Evening boxing session — lighter daytime, big post-workout dinner",
    meals: [
      { time: "7:30 AM", label: "Breakfast", office: false,
        name: "Oats Porridge + 2 Boiled Eggs",
        items: [
          "60g rolled oats (dry weight), cooked in 250ml full-fat milk",
          "1 small banana (80g), sliced on top",
          "1 tsp honey or 5g jaggery",
          "8 soaked almonds, chopped in",
          "2 whole eggs, hard boiled on the side",
        ],
        macros: "~24g protein · ~540 kcal · ~16g fat" },
      { time: "10:30 AM", label: "Mid-Morning", office: true,
        name: "Paneer Paratha + Curd (if at home) / Carry Snack (if at office)",
        items: [
          "1 small paneer paratha (80g dough + 40g paneer stuffing), cooked in ½ tsp ghee",
          "OR (office): 75g paneer cubes in box + 1 banana",
          "100g curd on the side at home",
        ],
        macros: "~16g protein · ~360 kcal · ~14g fat" },
      { time: "1:00 PM", label: "MAJOR Lunch", office: true,
        name: "Moong Dal Khichdi + Curd (easy to digest before evening session)",
        items: [
          "40g raw rice + 30g moong dal (yellow) — cook together into soft khichdi",
          "150g mixed vegetables in khichdi: 80g lauki + ½ carrot (50g), diced",
          "1 tsp ghee, ½ tsp turmeric, 1 tsp cumin seeds, 1 inch ginger",
          "150g curd on the side",
          "This is lighter than usual lunch — intentional before the evening boxing session",
        ],
        macros: "~18g protein · ~430 kcal · ~8g fat" },
      { time: "4:30 PM", label: "Pre-Workout (90 min before training)", office: true, timeSensitive: true,
        name: "Banana + Roasted Chana",
        items: [
          "1 large banana (120g)",
          "40g roasted chana (Bengal gram) — pre-packed",
        ],
        macros: "~8g protein · ~270 kcal · ~4g fat" },
      { time: "8:30 PM", label: "Post-Workout Dinner", office: false,
        name: "Soya Chunk Masala + 2 Rotis + Salad",
        items: [
          "70g dry soya chunks, soaked and cooked in rich onion-tomato-curd masala",
          "1 large onion (100g) + 2 tomatoes (160g) + 1 tsp kashmiri red chilli for gravy",
          "2 tsp oil for cooking",
          "2 medium multigrain rotis (35g dough each)",
          "Salad: 1 cucumber, ½ onion, green chilli, lemon",
        ],
        macros: "~36g protein · ~560 kcal · ~12g fat" },
      { time: "9:45 PM", label: "Before Bed", office: false, timeSensitive: true,
        name: "Warm Turmeric Milk",
        items: ["250ml warm milk + ¼ tsp turmeric + pinch black pepper"],
        macros: "~8g protein · ~160 kcal · ~8g fat" },
    ], total: "≈2,320 kcal · ~110g protein (higher carbs to fuel boxing session)" },

  { name: "Saturday", subtitle: "Evening full-body session — relaxed morning, refuel after training",
    meals: [
      { time: "7:30 AM", label: "Breakfast", office: false,
        name: "Vegetable Daliya + 2 Boiled Eggs",
        items: [
          "60g broken wheat (daliya), dry weight — cooked in 300ml water with:",
          "1 small carrot (60g), diced; 50g peas (fresh or frozen)",
          "½ onion (50g), 1 medium tomato (70g), 1 tsp oil, cumin, turmeric",
          "2 whole eggs, hard boiled on the side",
        ],
        macros: "~22g protein · ~460 kcal · ~12g fat" },
      { time: "10:30 AM", label: "Mid-Morning", office: false,
        name: "Roasted Soya Nuts + Seasonal Fruit",
        items: [
          "40g dry roasted soya chunks or soya nuts (can buy ready-roasted)",
          "1 guava (100g) or ½ pomegranate",
          "5–6 almonds",
        ],
        macros: "~22g protein · ~250 kcal · ~8g fat" },
      { time: "1:00 PM", label: "MAJOR Lunch (home Saturday)", office: false,
        name: "Paneer Curry + 2 Rotis + Seasonal Sabzi + Salad",
        items: [
          "120g paneer, cubed — in onion-tomato-cashew (10g cashews) gravy",
          "1 large onion (100g) + 2 medium tomatoes (160g) + 1 tsp kashmiri chilli for curry",
          "200g seasonal sabzi: bhindi or turai or corn + onion sautéed in 1 tsp oil",
          "2 medium multigrain rotis (35g dough each)",
          "Salad: 1 medium cucumber, 1 small onion, 1 small tomato, chaat masala, lemon",
        ],
        macros: "~32g protein · ~620 kcal · ~20g fat" },
      { time: "4:30 PM", label: "Pre-Workout (90 min before training)", office: false, timeSensitive: true,
        name: "Dates + Almonds",
        items: [
          "4 dates (~35g)",
          "10 almonds (~15g)",
        ],
        macros: "~4g protein · ~180 kcal · ~8g fat" },
      { time: "8:30 PM", label: "Post-Workout Dinner", office: false,
        name: "Egg Curry + Jeera Rice + Cucumber Raita",
        items: [
          "3 whole eggs, hard boiled — in onion-tomato-garam masala curry",
          "1 medium onion (80g) + 2 medium tomatoes (150g) for curry",
          "½ cup cooked jeera rice (~90g cooked, from 35g raw rice) + 1 tsp ghee",
          "Raita: 100g curd, ½ cucumber (60g) grated, roasted jeera, black salt",
        ],
        macros: "~28g protein · ~530 kcal · ~18g fat" },
      { time: "9:45 PM", label: "Before Bed", office: false, timeSensitive: true,
        name: "Warm Plain Milk",
        items: ["250ml warm milk"],
        macros: "~8g protein · ~150 kcal · ~8g fat" },
    ], total: "≈2,190 kcal · ~116g protein" },
];

// ============================================================
// WORKOUT DAYS — full Tom Holland plan from original index.html
// ============================================================

export type Exercise = [string, string]; // [name, sets/duration]

export type WorkoutBlock = {
  label: string;
  ex: Exercise[];
};

export type WorkoutDay = {
  name: string;
  time: string;
  focus: string;
  rest: boolean;
  note?: string;
  warmup?: WorkoutBlock;
  blocks?: WorkoutBlock[];
  cooldown?: WorkoutBlock;
};

export const WORKOUT_DAYS: WorkoutDay[] = [
  // ── Sunday ─────────────────────────────────────────────────────────────────
  { name: "Sunday", time: "20–30 min", focus: "Rest + Flexibility", rest: true,
    note: "Active recovery only. Work through all 4 flows below at a relaxed pace.",
    warmup: { label: "Hip Flow (8 min)", ex: [
      ["90/90 switches", "8 reps/side"],
      ["Pigeon pose", "1 × 60 sec/side"],
      ["Couch stretch", "1 × 60 sec/side"],
    ]},
    blocks: [
      { label: "Shoulder Flow (6 min)", ex: [
        ["Shoulder dislocates — band or towel overhead to behind", "10 slow reps"],
        ["Wall slides", "10 reps"],
        ["Thread-the-needle", "8 reps/side"],
      ]},
      { label: "Spine Flow (5 min)", ex: [
        ["Cat-cow", "10 slow reps"],
        ["Thoracic rotations", "8 reps/side"],
        ["Cobra hold", "1 × 30 sec"],
      ]},
    ],
    cooldown: { label: "Posterior Chain (5 min)", ex: [
      ["Standing forward fold", "1 × 60 sec"],
      ["Seated straddle", "1 × 60 sec"],
    ]},
  },

  // ── Monday ─────────────────────────────────────────────────────────────────
  { name: "Monday", time: "~75 min", focus: "Push — Strength", rest: false,
    warmup: { label: "Warm-up (8–10 min)", ex: [
      ["Light cardio", "5 min"],
      ["Shoulder CARs (Controlled Articular Rotations)", "5 reps/side"],
      ["Thoracic CARs", "5 reps/side"],
      ["Barbell bench press ramp-up sets", "2 × 5 (light)"],
    ]},
    blocks: [
      { label: "Main Strength (rest 90–120 sec)", ex: [
        ["Barbell / Dumbbell Bench Press", "4 × 5"],
        ["Standing Overhead Press", "4 × 6"],
        ["Weighted Dips", "3 × 6–8"],
        ["Incline Dumbbell Press", "3 × 10"],
        ["Lateral Raises", "3 × 15"],
        ["Overhead Triceps Extension", "3 × 12"],
      ]},
      { label: "Core (rest 45 sec)", ex: [
        ["Hanging Leg Raises", "3 × 12"],
        ["Pallof Press", "3 × 10/side"],
      ]},
      { label: "Forearm / Wrist", ex: [
        ["Reverse Wrist Curls (extensor balance)", "3 × 15"],
      ]},
    ],
    cooldown: { label: "Cooldown (10 min)", ex: [
      ["Doorway chest stretch", "1 × 45 sec/side"],
      ["Shoulder CARs", "5 reps/side"],
      ["Thoracic extension over bench", "1 × 60 sec"],
    ]},
  },

  // ── Tuesday ────────────────────────────────────────────────────────────────
  { name: "Tuesday", time: "~75 min", focus: "Pull — Strength", rest: false,
    warmup: { label: "Warm-up", ex: [
      ["Light cardio", "5 min"],
      ["Band pull-aparts", "15 reps"],
      ["Hip hinge drill (slow Romanian deadlift bodyweight)", "10 reps"],
    ]},
    blocks: [
      { label: "Main Strength (rest 90–120 sec)", ex: [
        ["Romanian Deadlift", "4 × 5"],
        ["Weighted / Assisted Pull-ups", "4 × 6"],
        ["Barbell / Dumbbell Bent-over Row", "3 × 8"],
        ["Chest-Supported Row", "3 × 10"],
        ["Face Pulls", "3 × 15"],
        ["Dumbbell Curls", "3 × 12"],
      ]},
      { label: "Core (rest 45 sec)", ex: [
        ["Hollow Body Hold", "3 × 30 sec"],
        ["Dead Bug", "3 × 10/side"],
        ["Weighted Cable Crunch", "3 × 12–15"],
        ["Ab Wheel Rollout", "3 × 8–10"],
      ]},
      { label: "Forearm / Wrist", ex: [
        ["Farmer's Carries (heavy)", "3 × 40m"],
        ["Dead Hangs — max hold", "3 × max"],
      ]},
    ],
    cooldown: { label: "Cooldown", ex: [
      ["Lat stretch (arm overhead, lean to side)", "1 × 45 sec/side"],
      ["90/90 hip stretch", "1 × 45 sec/side"],
      ["Supine spinal twist", "1 × 45 sec/side"],
    ]},
  },

  // ── Wednesday ──────────────────────────────────────────────────────────────
  { name: "Wednesday", time: "~75 min", focus: "Legs — Strength", rest: false,
    warmup: { label: "Warm-up", ex: [
      ["Light cardio", "5 min"],
      ["Bodyweight squats", "15 reps"],
      ["Leg swings (front-back)", "10/side"],
      ["Leg swings (side-to-side)", "10/side"],
    ]},
    blocks: [
      { label: "Main Strength (rest 90–120 sec)", ex: [
        ["Back Squat", "4 × 5"],
        ["Romanian Deadlift (lighter)", "3 × 8"],
        ["Weighted Walking Lunges", "3 × 10/leg"],
        ["Leg Curl", "3 × 12"],
        ["Calf Raises", "4 × 15"],
        ["Side Plank / Copenhagen Plank", "3 × 20 sec/side"],
      ]},
      { label: "Core (rest 45 sec)", ex: [
        ["Weighted Plank", "3 × 45 sec"],
      ]},
      { label: "Forearm / Wrist", ex: [
        ["Wrist Roller — flexion direction", "2 reps"],
        ["Wrist Roller — extension direction", "2 reps"],
      ]},
    ],
    cooldown: { label: "Cooldown (12 min)", ex: [
      ["Couch stretch", "1 × 60 sec/side"],
      ["Pigeon pose", "1 × 60 sec/side"],
      ["Deep squat hold", "1 × 60 sec"],
    ]},
  },

  // ── Thursday ───────────────────────────────────────────────────────────────
  { name: "Thursday", time: "~70 min", focus: "Push — Hypertrophy", rest: false,
    warmup: { label: "Warm-up (same as Monday, lighter)", ex: [
      ["Light cardio", "5 min"],
      ["Shoulder CARs", "5 reps/side"],
      ["Thoracic CARs", "5 reps/side"],
    ]},
    blocks: [
      { label: "Hypertrophy (rest 60–90 sec)", ex: [
        ["Incline Dumbbell Press", "4 × 10"],
        ["Dumbbell / Machine Shoulder Press", "3 × 12"],
        ["Cable Flyes", "3 × 15"],
        ["Lateral Raises (drop set on final set)", "4 × 15"],
        ["Triceps Rope Pushdown", "3 × 15"],
        ["Diamond Push-ups — AMRAP", "2 × AMRAP"],
      ]},
      { label: "Core (rest 45 sec)", ex: [
        ["Weighted Sit-ups", "3 × 15"],
      ]},
      { label: "Forearm / Wrist", ex: [
        ["Barbell Wrist Curls", "3 × 15"],
        ["Reverse Curls", "3 × 12"],
      ]},
    ],
    cooldown: { label: "Cooldown (same as Monday)", ex: [
      ["Doorway chest stretch", "1 × 45 sec/side"],
      ["Shoulder CARs", "5 reps/side"],
      ["Thoracic extension over bench", "1 × 60 sec"],
    ]},
  },

  // ── Friday ─────────────────────────────────────────────────────────────────
  { name: "Friday", time: "~70 min (PM)", focus: "Pull — Hypertrophy", rest: false,
    warmup: { label: "Warm-up", ex: [
      ["Shoulder CARs", "5 reps/side"],
      ["Band pull-aparts", "15 reps"],
      ["Light cardio", "5 min"],
    ]},
    blocks: [
      { label: "Hypertrophy (rest 60–90 sec)", ex: [
        ["Lat Pulldown / Wide-grip Pull-up", "4 × 10"],
        ["Single-arm Dumbbell Row", "3 × 12/side"],
        ["Cable Row (varied grip)", "3 × 12"],
        ["Rear Delt Flyes", "3 × 15"],
        ["Hammer Curls", "3 × 12"],
        ["Face Pulls", "3 × 20"],
      ]},
      { label: "Core (rest 45 sec)", ex: [
        ["Cable Woodchoppers", "3 × 12/side"],
        ["Weighted Decline Sit-up", "3 × 12"],
      ]},
      { label: "Forearm / Wrist", ex: [
        ["Plate Pinch Hold", "3 × 25 sec"],
      ]},
    ],
    cooldown: { label: "Cooldown (~10 min)", ex: [
      ["Lat stretch", "1 × 45 sec/side"],
      ["90/90 hip stretch", "1 × 45 sec/side"],
      ["Supine spinal twist", "1 × 45 sec/side"],
    ]},
  },

  // ── Saturday ───────────────────────────────────────────────────────────────
  { name: "Saturday", time: "~85 min (PM)", focus: "Legs (Hypertrophy) + Conditioning", rest: false,
    warmup: { label: "Warm-up", ex: [
      ["Light cardio", "5 min"],
      ["Bodyweight squats", "15 reps"],
      ["Leg swings (front-back)", "10/side"],
    ]},
    blocks: [
      { label: "Hypertrophy (rest 60–90 sec)", ex: [
        ["Front Squat or Leg Press", "4 × 10"],
        ["Bulgarian Split Squats", "3 × 10/leg"],
        ["Leg Extension", "3 × 15"],
        ["Leg Curl", "3 × 15"],
        ["Standing Calf Raise", "4 × 15"],
        ["Glute Bridge / Hip Thrust", "3 × 12"],
      ]},
      { label: "Forearm / Wrist", ex: [
        ["Farmer's Carries (heavy)", "3 × 40m"],
      ]},
      { label: "Conditioning Finisher — Scaled Cindy AMRAP", ex: [
        ["Pull-ups (or banded / ring rows)", "5 reps"],
        ["Push-ups", "10 reps"],
        ["Air squats", "15 reps"],
      ]},
    ],
    cooldown: { label: "Cooldown", ex: [
      ["Couch stretch", "1 × 60 sec/side"],
      ["Pigeon pose", "1 × 60 sec/side"],
      ["Standing forward fold", "1 × 60 sec"],
    ]},
  },
];

// ============================================================
// GROCERY DATA — from original index.html
// ============================================================

export type GroceryGroup = {
  group: string;
  items: { item: string; qty: string }[];
};

export const GROCERY: GroceryGroup[] = [
  { group: "Protein — Eggs & Dairy", items: [
    { item: "Eggs", qty: "2 dozen (24 eggs)" },
    { item: "Paneer (fresh)", qty: "~800g total" },
    { item: "Curd / Dahi", qty: "~2 kg (buy 2× 1kg tubs)" },
    { item: "Full-fat milk", qty: "~2.5 litres" },
    { item: "Soya chunks (dry, Nutrela or similar)", qty: "500g pack" },
    { item: "Soya chaap (fresh)", qty: "~300g (Fri + Sat)" },
  ]},
  { group: "Dals & Grains", items: [
    { item: "Moong dal (yellow split)", qty: "500g" },
    { item: "Chana dal", qty: "250g" },
    { item: "Rajma (red kidney beans)", qty: "250g" },
    { item: "Multigrain atta", qty: "1 kg" },
    { item: "Rice (for pulao + khichdi)", qty: "500g" },
    { item: "Poha (flattened rice)", qty: "250g" },
    { item: "Rolled oats", qty: "500g" },
    { item: "Daliya (broken wheat)", qty: "500g" },
    { item: "Besan (gram flour)", qty: "500g" },
    { item: "Roasted chana", qty: "300g" },
  ]},
  { group: "Vegetables (Monsoon Seasonal)", items: [
    { item: "Bhindi (okra)", qty: "~700g (for 3 meals)" },
    { item: "Lauki (bottle gourd)", qty: "2 medium, ~700g total" },
    { item: "Turai (ridge gourd)", qty: "2 medium, ~500g total" },
    { item: "Spinach (palak, cooked)", qty: "~300g" },
    { item: "Capsicum (green)", qty: "3 medium (~300g)" },
    { item: "Seasonal corn (bhutta)", qty: "2 ears (~300g)" },
    { item: "Carrot", qty: "4 medium (~350g)" },
    { item: "Onion", qty: "1 kg" },
    { item: "Tomato", qty: "1.5 kg" },
    { item: "Cucumber", qty: "6 medium (~700g)" },
    { item: "Ginger root", qty: "1 large piece (~80g)" },
    { item: "Garlic", qty: "1 full head" },
  ]},
  { group: "Fruits & Nuts", items: [
    { item: "Almonds (raw, to soak)", qty: "200g" },
    { item: "Walnuts (halves)", qty: "100g" },
    { item: "Dates (Medjool or Deglet)", qty: "200g" },
    { item: "Roasted makhana (fox nuts)", qty: "200g" },
    { item: "Pomegranate", qty: "2 medium" },
    { item: "Pear or Guava (seasonal)", qty: "4–5 pieces" },
    { item: "Banana", qty: "1 dozen (green-ripe)" },
  ]},
  { group: "Pantry & Spices", items: [
    { item: "Ghee (pure desi)", qty: "250g tub" },
    { item: "Cooking oil (groundnut/mustard)", qty: "500ml" },
    { item: "Turmeric powder", qty: "100g" },
    { item: "Cumin seeds (jeera)", qty: "100g" },
    { item: "Coriander powder", qty: "100g" },
    { item: "Chaat masala", qty: "50g" },
    { item: "Garam masala", qty: "50g" },
    { item: "Kashmiri red chilli powder", qty: "50g" },
    { item: "Multigrain bread (for Thursday)", qty: "1 loaf (10 slices)" },
    { item: "Jaggery (gur) — for milk / occasional sweetness", qty: "100g" },
  ]},
];

// ============================================================
// FAQ
// ============================================================
export const FAQ = [
  { q: "Will this exact workout give me Tom Holland's body?",
    a: "Honestly, not on its own — and it's worth being honest about that. His training for a role is his full-time job for months: multiple sessions a day, a personal trainer, a private chef, and recovery support like physio and massage that most people don't have access to. On top of that, the leanest 'shirtless scene' look you see on screen is often dialed in with short-term water and carb manipulation, applied oil, and professional lighting designed for that one shot — not his everyday walking-around condition. What this plan will genuinely do, run consistently, is build real strength, conditioning and a leaner, athletic physique over months — just on a realistic timeline for someone with college, an internship and one training window a day." },
  { q: "Is 2 hours of training every day too much?",
    a: "More than you need, yes. Past about 90–100 minutes of focused, intense work, quality drops and recovery starts to suffer — that applies to almost everyone, not just beginners. The structured ~95-minute session in the Workout section fits comfortably inside your window. If time remains, spend it on mobility, stretching or a slow walk rather than more sets. More volume isn't the lever that gets you leaner here — your calorie deficit and consistency are." },
  { q: "Why is lunch at 11 AM?",
    a: "Because your day forces it — you leave for office after roughly 11:30 AM and can't eat rotis, hot dal or a full meal there. Front-loading your biggest, highest-protein meal before you leave means you've covered ~35–40g protein and ~600+ kcal before your work day begins. Your office snack is designed to be zero-prep and carry-friendly (boiled eggs, paneer cubes, roasted chana, or dry soya chunks). Your dinner restores the remaining protein and energy after you return." },
  { q: "Why no whey in this plan?",
    a: "You don't need it. At ~130–148g protein/day, eggs, paneer, soya chunks, soya chaap, moong dal and full-fat dairy comfortably cover your target — the meal plan is built to hit those numbers without any protein powder." },
  { q: "What if my weight loss stalls?",
    a: "Expect non-linear weeks — water retention, sleep quality, the monsoon humidity and hormonal fluctuations all move the scale independently of actual fat loss. If your rolling 7-day average weight genuinely stalls for two consecutive weeks with consistent training and diet, drop your target intake by ~150 kcal (cut one roti or reduce rice portion) and reassess in another two weeks before making another change." },
  { q: "Can I swap meals around?",
    a: "Yes — the daily protein and calorie totals matter more than the exact meal composition. Swap paneer for soya or eggs for the equivalent protein amount freely across the week. The one thing to keep consistent is the 11 AM major lunch structure on weekdays, since that's built around your schedule constraint." },
];

// ============================================================
// Constants
// ============================================================
export const DAILY_KCAL = 2180;
export const DAILY_PROTEIN = 140;
export const DAILY_WATER = 10;
export const CYCLE_START = "2026-07-23"; // adjust to your actual start date
export const CYCLE_WEEKS = 12;
