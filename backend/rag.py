import re
import numpy as np
from typing import List, Dict
import requests
import json

# --------- Simple text utilities --------- #

def clean_text(text: str) -> str:
    """Basic cleaning: collapse whitespace, strip."""
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def chunk_text(
    text: str,
    max_chars: int = 1000,
    overlap: int = 200
) -> List[str]:
    """
    Split text into overlapping chunks by characters (simple but works).
    You can later switch to sentence-based splitting if you want.
    """
    text = clean_text(text)
    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        chunk = text[start:end]
        chunks.append(chunk)
        start += max_chars - overlap
    return chunks


# --------- Embeddings --------- #

def embed_chunks(
    chunks: List[str],
    embed_model
) -> np.ndarray:
    """
    Compute embeddings for a list of chunks using a SentenceTransformer model.
    Returns np.ndarray of shape (n_chunks, dim).
    """
    embeddings = embed_model.encode(chunks, convert_to_numpy=True, show_progress_bar=False)
    return embeddings


def embed_query(
    query: str,
    embed_model
) -> np.ndarray:
    """
    Compute embedding vector for a query string.
    """
    return embed_model.encode([query], convert_to_numpy=True, show_progress_bar=False)[0]


def cosine_sim(query_vec: np.ndarray, doc_matrix: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between query_vec (dim,) and doc_matrix (n, dim).
    """
    # Normalize
    q = query_vec / (np.linalg.norm(query_vec) + 1e-10)
    d = doc_matrix / (np.linalg.norm(doc_matrix, axis=1, keepdims=True) + 1e-10)
    sims = d @ q
    return sims


def retrieve_relevant_chunks(
    query: str,
    chunks: List[str],
    embeddings: np.ndarray,
    embed_model,
    top_k: int = 5
) -> List[str]:
    """
    Given a query, retrieve top_k most similar chunks.
    """
    q_vec = embed_query(query, embed_model)
    sims = cosine_sim(q_vec, embeddings)
    # Get indices of top_k sims
    top_idx = np.argsort(-sims)[:top_k]
    return [chunks[i] for i in top_idx]


# --------- LLM via Ollama --------- #

def call_ollama_chat(
    model: str,
    system_prompt: str,
    user_prompt: str,
    url: str = "http://localhost:11434/api/chat"
) -> str:
    """
    Call a local Ollama model via its HTTP chat API.
    We explicitly disable streaming (stream=false) so we get a single JSON object.
    """
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False  # 👈 IMPORTANT: disable streaming
    }

    try:
        resp = requests.post(url, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()  # single JSON object

        # Expected shape: {"model": "...", "message": {"role": "assistant", "content": "..."}, ...}
        message = data.get("message", {})
        content = message.get("content", "")
        return content.strip() if isinstance(content, str) else str(content)
    except Exception as e:
        return f"Error calling local LLM: {e}"


def build_qa_prompt(
    lease_context: str,
    question: str
) -> str:
    """
    Build the actual prompt text sent to the LLM.
    """
    prompt = f"""
You are an assistant that helps a tenant understand their lease agreement.

You will be given EXCERPTS from the lease. 
Your job is to answer the question ONLY using the information in these excerpts.
If something is not clearly stated in the lease text, say you cannot be certain.

LEASE TEXT (EXCERPTS):
\"\"\"{lease_context}\"\"\"

QUESTION:
{question}

INSTRUCTIONS:
- Cite specific phrases or sections from the excerpts when possible (in plain language).
- If the lease text doesn't clearly answer, explicitly say: "The lease text here does not clearly specify this."
- Explain in simple, non-legal language.
"""
    return prompt.strip()


def build_summary_prompt(lease_text: str) -> str:
    """
    Prompt for summarizing the lease into key points.
    """
    prompt = f"""
You are an assistant that summarizes residential lease agreements.

Here is the lease text (it may be partial, but do your best):
\"\"\"{lease_text}\"\"\"

Summarize this lease for a non-expert tenant using bullet points.
Include, if possible:
- Monthly rent and payment schedule
- Lease start and end dates
- Security deposit
- Late fee rules
- Who pays for utilities
- Rules about pets
- Termination / notice requirements
- Any obvious red flags or unusual clauses

Be concise but clear.
"""
    return prompt.strip()


def build_structured_extraction_prompt(lease_text: str) -> str:
    """
    Prompt to extract key fields as strict JSON.
    """
    return f"""
You are an assistant that extracts key information from a residential lease agreement.

Read the lease text below and return a SINGLE JSON object with EXACTLY these keys:

- "monthly_rent"
- "rent_due_date"
- "lease_start"
- "lease_end"
- "security_deposit"
- "late_fee"
- "utilities_tenant"
- "utilities_landlord"
- "pets_allowed"
- "notice_period"
- "property_address"

Rules:
- If a field is not clearly specified, set its value to null.
- All values must be either a string or null.
- Do NOT include any extra keys.
- Do NOT include any surrounding explanation, markdown, or text. Only output the JSON.

LEASE TEXT:
\"\"\"{lease_text}\"\"\"
""".strip()


def parse_structured_extraction_json(raw_output: str) -> Dict[str, object]:
    """
    Try to extract a JSON object from the LLM output.
    Handles cases where the model wraps JSON in ```json ... ``` or adds extra text.
    """
    text = raw_output.strip()

    # If the model wrapped output in triple backticks, extract the inside
    if "```" in text:
        # naive but effective: take the first code block
        parts = text.split("```")
        # parts might look like: ["", "json\n{...}", ""]
        for part in parts:
            part = part.strip()
            if not part:
                continue
            # strip leading "json" or similar
            if part.lower().startswith("json"):
                part = part[4:].strip()
            try:
                return json.loads(part)
            except Exception:
                continue

    # Otherwise, try the whole text as JSON
    try:
        return json.loads(text)
    except Exception:
        # If parsing fails, return empty dict
        return {}
    

def build_red_flag_prompt(lease_text: str) -> str:
    """
    Prompt to detect potentially risky or tenant-unfriendly clauses.
    The model must return a JSON object with a 'flags' array.
    """
    return f"""
You are a cautious assistant that reviews a residential lease agreement
and identifies potentially risky or tenant-unfriendly clauses.

Read the lease text below and return a SINGLE JSON object with EXACTLY this structure:

{{
  "flags": [
    {{
      "id": "short_identifier_like_late_fee_high",
      "title": "Short human-readable name of the issue",
      "severity": "low" | "medium" | "high",
      "clause_text": "Exact or near-exact text from the lease that triggered this flag",
      "explanation": "Plain language explanation of why this might be risky for the tenant"
    }},
    ...
  ]
}}

Rules:
- If there are no obvious issues, return {{ "flags": [] }}.
- Only include clauses that might reasonably disadvantage or surprise a tenant.
- Do NOT add any keys other than "flags".
- Do NOT add any explanation outside of the JSON. Only output JSON.

Examples of possible issues:
- Unusually high late fees or vague "penalties"
- Landlord entry with no notice
- Tenant responsible for all repairs or structural issues
- Automatic rent increases without clear limits
- Very long notice periods for move-out
- Non-refundable "deposits" that are unusual

LEASE TEXT:
\"\"\"{lease_text}\"\"\"
""".strip()


def parse_red_flags_json(raw_output: str) -> Dict[str, object]:
    """
    Try to parse the model output as a JSON object containing 'flags'.
    Similar to parse_structured_extraction_json, but tailored for red flags.
    """
    text = raw_output.strip()

    # Handle ```json ... ``` style output
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if not part:
                continue
            if part.lower().startswith("json"):
                part = part[4:].strip()
            try:
                obj = json.loads(part)
                if isinstance(obj, dict) and "flags" in obj:
                    return obj
            except Exception:
                continue

    # Try whole text
    try:
        obj = json.loads(text)
        if isinstance(obj, dict) and "flags" in obj:
            return obj
    except Exception:
        pass

    # Fallback
    return {"flags": []}