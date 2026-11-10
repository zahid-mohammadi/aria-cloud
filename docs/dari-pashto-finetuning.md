# Dari / Pashto Model Fine-Tuning Plan

**Status:** plan — the single highest-leverage moat against frontier models.
Pashto and Dari are global weaknesses of ChatGPT/Gemini/Claude; owning a model
that is genuinely better on *Afghan-language* tasks is how AriaCloud wins
without out-spending them. This document is the concrete first step.

---

## 1. Goal

Fine-tune a small open-weight model so it is **better than the frontier models on
Dari and Pashto** for the two workloads that matter:

1. **Assistant** — customer support, translation, study help, product copy.
2. **Site-builder content** — realistic business/doctor/course/product data in
   trilingual `{ fa, ps, en }` shape.

The model is a commodity; the **fine-tuned checkpoint + the human-reviewed
Pashto/Dari data** is the moat.

---

## 2. Model choice

| Candidate | Why | Footprint |
| :--- | :--- | :--- |
| **Qwen2.5-7B / 14B** | best multilingual coverage incl. Arabic-script, Apache-2.0 | 7B fits 24 GB, 14B fits 48 GB |
| DeepSeek-R1-Distill-7B/14B | strong reasoning, cheap | same |

**Start with Qwen2.5-7B** (or 14B if a 48 GB GPU is available). Both are
self-hostable and already behind the plan to drop Bedrock.

---

## 3. Data strategy (this is the moat)

Three sources, in order of value:

1. **Human-reviewed Afghan instruction data** — the differentiator. Native Dari
   and Pashto speakers author + review instruction→response pairs for the
   assistant and site-content tasks. Start with **500–2,000 high-quality pairs**
   rather than tens of thousands of noisy ones.
2. **Translation pairs** — English↔Dari↔Pashto from public sets (Flores-200,
   NLLB, Tatoeba) to strengthen cross-lingual transfer.
3. **Domain corpora** — business listings, product descriptions, clinic/school
   material, synthesized and human-corrected.

**Rule:** quality over quantity. Pashto data is scarce, so every reviewed pair
is disproportionately valuable. Keep a held-out eval set *before* fine-tuning.

---

## 4. Method

- **QLoRA / LoRA** on a single A100/H100 (or 48 GB card) — parameter-efficient,
  no full-model training cost.
- **Supervised fine-tuning (SFT)** on the instruction pairs; add a small DPO pass
  only if the SFT model needs preference shaping.
- Frameworks: Hugging Face `transformers` + PEFT + `trl` (SFT), or Axolotl.

---

## 5. Evaluation

Build a **Dari/Pashto eval set** (held out, human-graded) covering:

- translation (en↔fa↔ps)
- summarization
- open chat
- site-content JSON generation (the site-builder schema shape)

Score the fine-tuned model **against the base model and against ChatGPT/Gemini**
on the *same* tasks, with native speakers grading. **The fine-tuned model only
ships if it beats the baseline on Dari/Pashto** — even if it loses in English.

---

## 6. Serving & integration

- Serve with **vLLM** (OpenAI-compatible) behind the model-router abstraction,
  so `packages/api/src/studio.ts` (assistant) and the site-builder can point at
  either the self-hosted endpoint or Bedrock via an env var.
- Keep Bedrock as fallback for English/quality-critical work; route Dari/Pashto
  to the fine-tuned model.

---

## 7. Phasing

1. **Phase 0 — benchmark** (1–2 weeks): build the eval set, measure ChatGPT/Qwen
   baselines on Dari/Pashto. Decide *is fine-tuning worth it* with data, not vibes.
2. **Phase 1 — data** (2–4 weeks): author + review 500–2,000 instruction pairs.
3. **Phase 2 — train** (1 week): QLoRA SFT on Qwen2.5-7B/14B.
4. **Phase 3 — evaluate** (1 week): graded vs. baseline; iterate or ship.
5. **Phase 4 — integrate** (1 week): model router + fallback, deploy to the
   assistant and site-builder.

---

## 8. Cost & risks

- **Compute:** QLoRA on a 7B ≈ a few dollars–$50 on rented A100/H100. Not the
  bottleneck.
- **The real cost is human data review** — budget for native-speaker reviewers;
  this is where the moat is and where cutting corners kills the effort.
- **Risks:** Pashto data scarcity, catastrophic forgetting (mitigate with LoRA +
  mixing English data), and eval quality (mitigate with native graders + a held-out set).

**Decision gate:** do not fine-tune until Phase 0 shows a measurable gap on
Dari/Pashto. If a frontier model already handles your eval set well, spend the
effort on data + distribution instead.
