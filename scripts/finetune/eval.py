#!/usr/bin/env python3
"""
Reference-based eval harness for the fine-tuned Dari/Pashto model.

Scores a model (any OpenAI-compatible endpoint: vLLM, ChatGPT, Gemini via a
gateway) against a held-out eval set using chrF, and writes per-example output
so native speakers can grade quality. The chrF number is a quick regression
signal; the human grade is the real gate.

Eval set format (JSONL), one line per example:
  {"messages": [{"role":"system","content":...},{"role":"user","content":...}],
   "reference": "expected assistant text"}

Usage:
  python scripts/finetune/eval.py \
    --eval-set data/eval.jsonl \
    --base-url http://localhost:8000 \
    --model aria-qwen-7b-af \
    --api-key $OPENAI_API_KEY \
    --output data/eval-results.jsonl
"""
import argparse
import json
import sys
import urllib.request
from collections import Counter


def chrf(reference, hypothesis, n=6, beta=2.0):
    """Character n-gram F-score — a dependency-free chrF approximation."""
    def ngrams(s, k):
        return [s[i : i + k] for i in range(len(s) - k + 1)] if len(s) >= k else []

    if not reference or not hypothesis:
        return 0.0

    prec_total = 0.0
    rec_total = 0.0
    for k in range(1, n + 1):
        ref_ng = Counter(ngrams(reference, k))
        hyp_ng = Counter(ngrams(hypothesis, k))
        if not ref_ng or not hyp_ng:
            continue
        matched = sum((ref_ng & hyp_ng).values())
        hyp_len = sum(hyp_ng.values())
        ref_len = sum(ref_ng.values())
        prec = matched / hyp_len if hyp_len else 0.0
        rec = matched / ref_len if ref_len else 0.0
        prec_total += prec
        rec_total += rec

    p = prec_total / n
    r = rec_total / n
    if p + r == 0:
        return 0.0
    return (1 + beta**2) * p * r / (beta**2 * p + r)


def call_endpoint(base_url, api_key, model, messages, max_tokens=512):
    url = base_url.rstrip("/") + "/v1/chat/completions"
    body = json.dumps(
        {"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": 0}
    ).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--eval-set", required=True)
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--model", required=True)
    ap.add_argument("--api-key", default=os_environ("OPENAI_API_KEY", ""))
    ap.add_argument("--output", default="data/eval-results.jsonl")
    args = ap.parse_args()

    with open(args.eval_set, "r", encoding="utf-8") as f:
        examples = [json.loads(line) for line in f if line.strip()]

    scores = []
    results = []
    for i, ex in enumerate(examples):
        try:
            reply = call_endpoint(args.base_url, args.api_key, args.model, ex["messages"])
        except Exception as err:  # noqa: BLE001
            print(f"example {i}: ERROR {err}", file=sys.stderr)
            reply = ""
        score = chrf(ex.get("reference", ""), reply)
        scores.append(score)
        results.append({**ex, "hypothesis": reply, "chrf": round(score, 4)})

    with open(args.output, "w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    avg = sum(scores) / len(scores) if scores else 0.0
    print(f"chrF avg: {avg:.4f} over {len(scores)} examples")
    print(f"results → {args.output}")
    print("Note: chrF is a regression signal only — grade a sample by hand before shipping.")


def os_environ(name, default):
    import os

    return os.environ.get(name, default)


if __name__ == "__main__":
    main()
