# Fine-tuning — Dari / Pashto assistant + site-builder model

Implements [`docs/dari-pashto-finetuning.md`](../../docs/dari-pashto-finetuning.md).
This directory holds the runnable pieces; the GPU run happens on a rented card
(A100/L40S), not in this repo.

## Files

| File | Purpose |
| :--- | :--- |
| `prepare-data.mjs` | Converts trilingual examples into chat-format JSONL (or seeds from the site-builder blueprints) |
| `config.yml` | Axolotl QLoRA config (Qwen2.5-7B) |
| `eval.py` | Reference-based (chrF) eval against any OpenAI-compatible endpoint |

## Flow

```bash
# 1. Build the site-builder so the seeder can import its blueprints
pnpm build:services

# 2a. Prepare data from a hand-authored trilingual JSON source
node scripts/finetune/prepare-data.mjs --input data/examples.json --output data/train.jsonl

# 2b. ...or seed site-schema examples from the repo's own sector blueprints
node scripts/finetune/prepare-data.mjs --seed --output data/seed-sites.jsonl

# 3. Fine-tune (on a GPU box with axolotl installed)
pip install axolotl[flash-attn,deepspeed]
accelerate launch -m axolotl.cli.train scripts/finetune/config.yml

# 4. Merge the LoRA adapter into full weights
python -m axolotl.cli.merge_lora scripts/finetune/config.yml

# 5. Serve
vllm serve ./out/aria-qwen-7b-af --dtype bfloat16 --port 8000

# 6. Evaluate against a held-out set
python scripts/finetune/eval.py \
  --eval-set data/eval.jsonl \
  --base-url http://localhost:8000 \
  --model aria-qwen-7b-af \
  --output data/eval-results.jsonl
```

## Data formats

**Input to `prepare-data.mjs`** (`--input`):

```json
[
  { "type": "chat", "instruction": {"fa":"...","ps":"...","en":"..."}, "response": {"fa":"...","ps":"...","en":"..."} },
  { "type": "site", "instruction": "یک دکان آنلاین زعفران", "schema": { "...trilingual schema..." } }
]
```

**Eval set** (`eval.py --eval-set`), one JSONL line each:

```json
{"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."}],"reference":"expected answer"}
```

## The gate

Do not ship the fine-tuned model unless it beats the base model **and** the
frontier baselines on Dari/Pashto, graded by native speakers. chrF in `eval.py`
is a fast regression check, not the decision.
