# 🏠 LeaseWise

**LeaseWise** is a full-stack, fully local AI-powered lease analysis system designed to help tenants understand residential lease agreements with clarity and confidence.

Unlike many AI demos that rely on external APIs, managed vector databases, or cloud inference, LeaseWise implements a custom Retrieval-Augmented Generation (RAG) pipeline from scratch — running entirely on the user’s machine with zero external dependencies.

Built to demonstrate real systems-level understanding of modern LLM workflows, LeaseWise combines semantic retrieval, structured extraction, red-flag detection, and natural-language reasoning into a cohesive AI application.

---

## 🚀 What It Does

Upload a residential lease PDF and instantly:

- 📄 Extract structured key terms (rent, dates, deposit, utilities, notice periods)
- ⚠️ Detect potentially tenant-unfriendly or high-risk clauses
- 🧠 Generate plain-language summaries
- 💬 Ask natural-language questions grounded strictly in the lease text

All processing happens locally using open-source models.

---

## 🧠 Core Technical Architecture

LeaseWise does **not** use LangChain, FAISS, Chroma, or external vector database services.

Instead, it implements a custom in-memory RAG pipeline:

### 1️⃣ PDF Processing
- Extracts raw lease text using `pdfplumber`
- Cleans and normalizes formatting artifacts

### 2️⃣ Semantic Chunking
- Splits text into overlapping fixed-length chunks
- Preserves contextual continuity across legal sections

### 3️⃣ Embedding Generation
- Uses `sentence-transformers` (MiniLM)
- Converts each chunk into dense vector embeddings locally

### 4️⃣ Custom Similarity Retrieval
- Computes cosine similarity using NumPy
- Selects Top-K relevant chunks for query grounding
- Stores embeddings in memory (no vector DB)

### 5️⃣ LLM-Orchestrated Reasoning
- Sends retrieved context to a local LLM via **Ollama** (e.g., Llama 3)
- Uses structured prompt engineering
- Enforces JSON-mode responses for deterministic extraction
- Implements timeout handling and safe response parsing

---

## 📦 Features

### 🗂 Structured Lease Term Extraction
Extracts machine-readable fields such as:
- Monthly rent
- Lease start & end dates
- Security deposit
- Utility responsibilities
- Notice requirements

Implemented using JSON-constrained prompting with robust parsing safeguards.

---

### ⚠️ Red Flag Clause Detection
Identifies clauses that may be:
- Excessively punitive
- Vague or ambiguous
- Potentially tenant-disadvantaging

Uses LLM-based classification with structured severity labeling.

---

### 🧾 Plain-Language Summarization
Transforms dense legal language into a concise, human-readable overview.

---

### 💬 Context-Grounded Q&A
Users can ask:
- “Can the landlord enter without notice?”
- “Who pays for internet?”
- “What happens if rent is late?”

Responses are generated strictly from retrieved lease context to reduce hallucination.

---

## 🏗️ Tech Stack

**Frontend**
- React (Vite)
- Custom UI (no component libraries)
- Fetch-based API integration

**Backend**
- Python
- Flask
- pdfplumber
- NumPy
- sentence-transformers (MiniLM)

**LLM Runtime**
- Ollama (local LLM runtime)
- Llama 3 (or compatible open-source models)
- JSON-mode structured prompting

**Architecture Concepts**
- Retrieval-Augmented Generation (RAG)
- Semantic embeddings
- Cosine similarity search
- Context window management
- Deterministic response parsing

---

## 🔒 Local-First Design Philosophy

- No OpenAI API  
- No Hugging Face inference endpoints  
- No vector database services  
- No AWS or cloud infrastructure  
- Zero API cost  
- Full document privacy  

All processing runs locally.

---

## 🛠️ How to Run

### 1️⃣ Backend Setup

    cd backend
    python -m venv venv

    # Windows PowerShell only:
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\venv\Scripts\activate

    pip install -r requirements.txt
    python app.py

Backend runs at:
http://localhost:5000

---

### 2️⃣ Install Ollama

Download from:
https://ollama.com

Pull a model:

    ollama pull llama3

Ensure Ollama is running:

    ollama list

---

### 3️⃣ Frontend Setup

    cd frontend
    npm install
    npm run dev

Frontend runs at:
http://localhost:5173

---

## 📈 Why This Project Stands Out

LeaseWise demonstrates:

- Full-stack engineering (React + Flask)
- Custom RAG system implementation
- Embedding-based semantic retrieval
- Local LLM orchestration
- Structured prompt engineering
- Robust JSON parsing and error handling
- Real-world document AI application design

This is not a wrapper around an AI API — it is a ground-up implementation of a modern LLM-powered system.

---
