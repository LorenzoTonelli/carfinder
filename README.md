# CarFinder — AI Car Recommendation App

CarFinder is a web app that chats with the user to understand what they need in a car, then recommends the top 3 matching vehicles with an explanation of pros and cons.

---

## What the app does (the user experience)

1. User lands on the home page and clicks **Start the conversation**
2. An AI chatbot asks questions about their budget, lifestyle, and priorities (takes ~5 minutes)
3. Once the AI has enough info, the user is automatically taken to a results page
4. The results page shows the **top 3 matching cars**, each with:
   - Things they will like (matched to their priorities)
   - Things they might not like (honest tradeoffs)
   - A short AI explanation of why this car was picked
5. There is a **side chat** where they can ask follow-up questions about the recommendations

---

## How to run it locally

**Step 1 — Install dependencies** (only needed once):
```bash
npm install
```

**Step 2 — Add your API key:**

Open the file `.env.local` and paste your Google AI API key:
```
GOOGLE_AI_API_KEY=your_key_here
```
Get a free key at [aistudio.google.com](https://aistudio.google.com).

**Step 3 — Start the app:**
```bash
npm run dev
```

**Step 4 — Open your browser at:**
```
http://localhost:3000
```

The app reloads automatically whenever you save a file — you don't need to restart it.

---

## Folder structure — what each file does

```
carfinder/
│
├── app/                        ← All the pages and server logic
│   ├── page.tsx                ← The landing page ("Find your perfect car")
│   ├── chat/page.tsx           ← Page 1: the chat interface
│   ├── recommendations/page.tsx← Page 2: the results + side chat
│   ├── layout.tsx              ← Wraps every page (sets dark background, font, etc.)
│   ├── globals.css             ← Global CSS styles
│   │
│   └── api/                   ← Server-side code (the AI calls happen here)
│       ├── chat/route.ts       ← Handles messages during the profiling conversation
│       ├── recommend/route.ts  ← Runs the scoring engine + generates explanations
│       └── followup/route.ts   ← Handles messages in the side chat on results page
│
├── lib/                        ← Shared logic (used by the API routes above)
│   ├── llm.ts                  ← Talks to the AI (Google Gemini). Swap AI here.
│   ├── scoring.ts              ← The math that picks the top 3 cars
│   ├── priorities.ts           ← Converts a ranked list into numbers the scorer uses
│   └── vehicles.ts             ← Loads the car catalog from the JSON file
│
├── data/
│   └── vehicles.json           ← The car catalog (10 cars for now)
│
├── types/
│   └── index.ts                ← TypeScript type definitions (shapes of data objects)
│
├── .env.local                  ← Your secret API key (never commit this to git)
└── .env.local.example          ← Template showing which keys are needed
```

---

## How the pieces connect (the data flow)

Here is what happens from the moment a user sends a chat message:

```
Browser (user types a message)
  │
  ▼
app/chat/page.tsx          ← Sends the message history to the server
  │
  ▼
app/api/chat/route.ts      ← Calls the AI with the conversation so far
  │
  ▼
lib/llm.ts                 ← Makes the actual request to Google Gemini
  │
  ▼
Google Gemini API          ← Generates a response, streams it back word by word
  │
  ▼
app/chat/page.tsx          ← Displays words as they arrive (streaming)
  │
  │   (after enough info is collected, the AI includes a hidden profile block)
  ▼
sessionStorage             ← The user profile is saved in the browser
  │
  ▼
app/recommendations/page.tsx  ← Reads the profile, calls /api/recommend
  │
  ▼
app/api/recommend/route.ts    ← Scores all cars, picks top 3, asks AI to explain
  │  │
  │  ├─ lib/scoring.ts        ← Filters and scores cars against the profile
  │  ├─ lib/vehicles.ts       ← Loads car data from vehicles.json
  │  └─ lib/llm.ts            ← Asks AI to write explanations for each car
  │
  ▼
app/recommendations/page.tsx  ← Shows the 3 cards + opens the side chat
```

---

## How the AI knows when to stop asking questions

The AI is given a system prompt (a set of instructions it always follows). The prompt tells it:

> "Once you have collected the user's budget, body style, fuel preference, number of passengers, daily miles, and priorities — include a special `<profile_ready>` block at the end of your message."

When our code detects that block in the response, it extracts the user's profile as structured data and redirects to the results page. The user never sees the `<profile_ready>` block — it's stripped before being displayed.

---

## How the car scoring works

Each car in `vehicles.json` has 8 pre-scored dimensions (0 to 1):

| Dimension     | Example: RAV4 Hybrid |
|---------------|----------------------|
| Safety        | 0.94                 |
| Fuel economy  | 0.92                 |
| Reliability   | 0.88                 |
| Cargo         | 0.72                 |
| Comfort       | 0.70                 |
| Performance   | 0.48                 |
| Tech          | 0.72                 |
| Value         | 0.82                 |

The user tells us their priorities in order (e.g. "safety first, then fuel economy, then reliability"). The scoring engine converts that ranking into weights using exponential decay — rank 1 gets twice as much weight as rank 2, rank 2 gets twice as much as rank 3, and so on.

Then it multiplies each car's scores by those weights and adds them up. The 3 highest-scoring cars (with no two from the same brand if possible) become the recommendations.

---

## How to add more cars

Open `data/vehicles.json` and add a new entry. Follow the same format as the existing ones. Each score should be a number between 0 and 1, where 1 is the best in the market for that dimension.

Example entry:
```json
{
  "id": "honda-civic-2026",
  "make": "Honda",
  "model": "Civic",
  "year": 2026,
  "trim": "Sport",
  "body_style": "sedan",
  "fuel_type": "gas",
  "msrp": 26000,
  "seats": 5,
  "mpg_combined": 36,
  "range_miles": null,
  "cargo_cuft": 14.8,
  "horsepower": 158,
  "scores": {
    "safety": 0.88,
    "fuel_economy": 0.82,
    "reliability": 0.86,
    "cargo": 0.50,
    "comfort": 0.72,
    "performance": 0.60,
    "tech": 0.74,
    "value": 0.90
  },
  "features": ["apple_carplay", "android_auto", "fwd", "lane_keep", "blind_spot"]
}
```

---

## How to change the AI model

Open `lib/llm.ts` and change the `MODEL` constant on line 9:

```typescript
const MODEL = 'gemini-2.5-flash'   // ← change this
```

Available models (from cheapest to most capable):
- `gemini-2.0-flash-lite` — fastest, cheapest, highest free limits
- `gemini-2.0-flash` — balanced
- `gemini-2.5-flash` — current default, latest Flash model
- `gemini-2.5-pro` — most capable, slowest, most expensive

---

## How to deploy to Vercel

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repository
3. In the Vercel dashboard, go to **Settings → Environment Variables** and add `GOOGLE_AI_API_KEY` with your key
4. Click **Deploy**

Your app will be live at a URL like `carfinder.vercel.app`.

> Do not commit `.env.local` to git — it contains your secret API key. It is already listed in `.gitignore` so this is handled automatically.
