import io
import uuid

from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
from sentence_transformers import SentenceTransformer

from rag import (
    chunk_text, embed_chunks, retrieve_relevant_chunks,
    call_ollama_chat, build_qa_prompt, build_summary_prompt,
    build_structured_extraction_prompt, parse_structured_extraction_json,
    build_red_flag_prompt, parse_red_flags_json
)


# ----------------------------------------------------------
# Flask setup
# ----------------------------------------------------------

app = Flask(__name__)
CORS(app)

# Load embedding model once
EMBED_MODEL = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Which local LLM model to use via Ollama
OLLAMA_MODEL = "llama3"

# Memory store of processed documents
documents = {}

# ----------------------------------------------------------
# Helper: extract text from PDF
# ----------------------------------------------------------

def extract_pdf_text(file_bytes):
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        text_pages = []
        for page in pdf.pages:
            text = page.extract_text() or ""
            text_pages.append(text)
    return "\n".join(text_pages)

# ----------------------------------------------------------
# API: Health check
# ----------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

# ----------------------------------------------------------
# API: Upload PDF
# ----------------------------------------------------------

@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    if "file" not in request.files:
        return jsonify({"error": "file not provided"}), 400

    file = request.files["file"]
    pdf_bytes = file.read()

    try:
        text = extract_pdf_text(pdf_bytes)
    except Exception as e:
        return jsonify({"error": f"PDF extraction failed: {e}"}), 500

    # Chunk + embed
    chunks = chunk_text(text, max_chars=1200, overlap=200)
    embeddings = embed_chunks(chunks, EMBED_MODEL)

    doc_id = str(uuid.uuid4())
    documents[doc_id] = {
        "raw_text": text,
        "chunks": chunks,
        "embeddings": embeddings,
    }

    return jsonify({
        "document_id": doc_id,
        "preview": text[:500] + ("..." if len(text) > 500 else ""),
        "num_chunks": len(chunks),
    }), 200

# ----------------------------------------------------------
# API: Summarize lease
# ----------------------------------------------------------

@app.route("/api/summary", methods=["POST"])
def summary():
    data = request.get_json(force=True)
    doc_id = data.get("document_id")

    if not doc_id or doc_id not in documents:
        return jsonify({"error": "invalid document_id"}), 400

    # Truncate long lease text so prompt isn't too long
    raw_text = documents[doc_id]["raw_text"]

    # Clip to avoid sending an enormous prompt (helps speed + avoids timeouts)
    max_chars = 8000
    clipped = raw_text[:max_chars]

    prompt = build_summary_prompt(clipped)
    system_prompt = "You are an assistant that summarizes residential leases."

    summary_text = call_ollama_chat(
        model=OLLAMA_MODEL,
        system_prompt=system_prompt,
        user_prompt=prompt,
        timeout=240,  # give more room than the previous 120s
    )

    return jsonify({"summary": summary_text}), 200

# ----------------------------------------------------------
# API: Answer questions about the lease
# ----------------------------------------------------------

@app.route("/api/ask", methods=["POST"])
def ask():
    data = request.get_json(force=True)
    doc_id = data.get("document_id")
    question = data.get("question", "").strip()

    if not doc_id or doc_id not in documents:
        return jsonify({"error": "invalid document_id"}), 400
    if not question:
        return jsonify({"error": "question required"}), 400

    doc = documents[doc_id]
    chunks = doc["chunks"]
    embeddings = doc["embeddings"]

    # Retrieve relevant chunks (RAG)
    relevant_chunks = retrieve_relevant_chunks(
        question, chunks, embeddings, EMBED_MODEL, top_k=5
    )

    context_text = "\n\n---\n\n".join(relevant_chunks)

    prompt = build_qa_prompt(context_text, question)

    answer = call_ollama_chat(
        model=OLLAMA_MODEL,
        system_prompt="You analyze leases.",
        user_prompt=prompt,
    )

    return jsonify({
        "answer": answer,
        "context_snippets": relevant_chunks,
    }), 200

@app.route("/api/extract_terms", methods=["POST"])
def extract_terms():
    """
    Body: { "document_id": str }
    Returns: { "terms": { ... }, "raw": str, "error": str | null }
    """
    data = request.get_json(force=True)
    doc_id = data.get("document_id")

    if not doc_id or doc_id not in documents:
        return jsonify({"error": "invalid document_id"}), 400

    raw_text = documents[doc_id]["raw_text"]

    # Clip to avoid huge prompts
    max_chars = 7000
    clipped = raw_text[:max_chars]

    # Build prompt for structured extraction
    user_prompt = build_structured_extraction_prompt(clipped)
    system_prompt = "You extract structured JSON data from residential leases."

    raw_output = call_ollama_chat(
        model=OLLAMA_MODEL,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )

    terms = parse_structured_extraction_json(raw_output)

    # If parsing failed, terms will be {}
    error_msg = None
    if not terms:
        error_msg = "Could not parse model output as JSON."

    return jsonify({
        "terms": terms,
        "raw": raw_output,
        "error": error_msg,
    }), 200

@app.route("/api/red_flags", methods=["POST"])
def red_flags():
    """
    Body: { "document_id": str }
    Returns: { "flags": [...], "raw": str, "error": str | null }
    """
    data = request.get_json(force=True)
    doc_id = data.get("document_id")

    if not doc_id or doc_id not in documents:
        return jsonify({"error": "invalid document_id"}), 400

    raw_text = documents[doc_id]["raw_text"]

    # Clip text so prompt isn't massive
    max_chars = 7000
    clipped = raw_text[:max_chars]

    user_prompt = build_red_flag_prompt(clipped)
    system_prompt = "You carefully identify potentially risky lease clauses as JSON."

    raw_output = call_ollama_chat(
        model=OLLAMA_MODEL,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )

    parsed = parse_red_flags_json(raw_output)
    flags = parsed.get("flags", [])

    error_msg = None
    if not isinstance(flags, list):
        error_msg = "Model returned unexpected format for flags."
        flags = []

    return jsonify({
        "flags": flags,
        "raw": raw_output,
        "error": error_msg,
    }), 200

# ----------------------------------------------------------
# Main: Run Flask
# ----------------------------------------------------------

if __name__ == "__main__":
    print("Starting LeaseWise backend on port 5000...")
    app.run(port=5000, debug=True)
