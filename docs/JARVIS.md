# JARVIS: proposal

Status: **proposal; nothing paid is turned on.** This needs your approval and an Anthropic API key before it is built.

## What it does

JARVIS is the in-app guide. Tap a pillar, an evidence item or a verse, or type a question, and JARVIS explains it in plain language. It answers **only** from this app's data and cites what it used. If the data doesn't answer the question, it says so. This keeps the "no hallucination" promise.

## How it works

```
App  ──question──▶  /api/jarvis (Vercel Function, this project)
                      1. check rate limit and question length
                      2. find the best passages in our own data packs
                         (verses, journeys, evidence items, Q&A)
                      3. ask Claude: answer only from these passages, cite [P1]…
                      4. reject any answer that cites a passage it wasn't given
App  ◀──answer + citations──
```

- **Retrieval runs on the server**, from the same data packs the app uses. It uses the same keyword search the app already has (BM25), so there is no database or vector search to pay for at first. A browser can't send its own "sources", so the endpoint can't be used as a free general chatbot.
- **One Claude call per question.** The call carries a fixed, cached instruction block and about 8 passages, roughly 3,000 tokens in and 400 out.
- **Citations are checked.** Every `[P#]` in the answer must be one of the passages sent, otherwise the answer is replaced with "I couldn't find that in our sources."

## Cost

Prices per million tokens, from Anthropic's current price list. The estimate assumes about 3,000 input and 400 output tokens per answer. Thinking adds output tokens, so the upper figure allows for that.

| Model | Price (input / output per 1M tokens) | Per answer | 1,000 answers | 10,000 answers / month |
|---|---|---|---|---|
| Claude Haiku 5.5 | $0.10 / $0.50 | about $0.0005–0.001 | about $0.50–1 | about $5–10 |
| Claude Sonnet 5.5 | $2 / $10 | about $0.01–0.02 | about $10–20 | about $100–200 |
| Claude Opus 5.5 | $4 / $20 | about $0.02–0.04 | about $20–40 | about $200–400 |

**Recommendation:** you asked for the lowest-cost safe option, which is **Claude Haiku 5.5**, because answers are short and grounded in passages we supply. Opus 5.5 is Anthropic's standard recommendation and writes the strongest explanations, at about 40 times the cost. We can measure answer quality on a fixed set of 30 real questions before choosing.

Other costs:

- **Hosting:** none extra. The function runs in the existing Vercel project. Vercel's free Hobby plan is for non-commercial personal use; if the app is published by a ministry or organisation, the Pro plan ($20 per month per member) may be required. Please check Vercel's terms for your case.
- **Database:** none at first. Supabase is only needed later, for accounts and saved notes.

## Safety and limits

- **A hard spending cap:** set a monthly spend limit for the API key in the Claude Console, so costs can never run away.
- **Per-visitor rate limit**, for example 20 questions an hour, plus a maximum question length (500 characters) and answer length.
- **Grounding:** the instructions require answers only from the supplied passages, with citations. Debated items must be presented as debated, with both sides from their sources.
- **Privacy:** questions are sent to Anthropic to generate the answer. No accounts, and nothing kept beyond the rate-limit window. The privacy policy, Google's Data safety form and Apple's App Privacy answers must say this.
- **The key stays on the server** (a Vercel environment variable), never in the app.

## What I need from you to build it

1. Approve the approach and choose a model (Haiku 5.5 recommended for cost).
2. Create an Anthropic API key with a monthly spend limit, and add it in Vercel as `ANTHROPIC_API_KEY`. Please don't paste the key in chat.
3. Confirm which Vercel plan the project should be on.
