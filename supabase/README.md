# StudyMate local backend (Supabase)

Everything needed to run StudyMate independently of the Base44 hosted backend.

## What lives here

- `functions/studymate-ai/` — Supabase Edge Function that powers the AI assistant with **Groq**. It is a direct port of the Base44 `studyMateAI` function: loads the student's real records from Supabase, interprets the message with the LLM, parses structured actions, executes them, and returns the conversational response.
- `rls-policies.sql` — per-user RLS policies tied to Supabase Auth (`auth.uid()`), required for the browser to access tables directly. Read the header comments before running: existing rows store Base44 user ids.

## Deploy (once)

```bash
npm install -g supabase        # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>

# deploy the AI function
supabase functions deploy studymate-ai

# set the Groq secret (get a free key at console.groq.com)
supabase secrets set GROQ_API_KEY=gsk_your_key_here
# optional, defaults to llama-3.3-70b-versatile
supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile
```

Then run `rls-policies.sql` once in the Supabase SQL editor.

## Environment variables

| Variable | Where | Notes |
|---|---|---|
| `SUPABASE_URL` | Edge Function | auto-injected by Supabase at deploy |
| `SUPABASE_ANON_KEY` | Edge Function | auto-injected by Supabase at deploy |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function | auto-injected by Supabase at deploy — never expose it to the browser |
| `GROQ_API_KEY` | Edge Function secret | `supabase secrets set GROQ_API_KEY=...` — server-side only |
| `GROQ_MODEL` | Edge Function secret | optional, default `llama-3.3-70b-versatile` |
| `VITE_SUPABASE_URL` | frontend `.env` | project settings → API |
| `VITE_SUPABASE_ANON_KEY` | frontend `.env` | the public/anon key — safe in the browser, protected by RLS |

## Architecture (local mode)

Student message/voice → AI interpretation (Groq, in the Edge Function, key never in the browser) → structured action → action validation (whitelisted types, duplicate checks, confirmation for deletes) → Supabase database operation (service role, always filtered by the caller's user id) → response to the student.