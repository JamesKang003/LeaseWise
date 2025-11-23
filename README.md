LeaseWise — Local AI Lease Analyzer

LeaseWise is a full-stack, fully local AI tool for analyzing residential lease agreements.
Upload a lease PDF and instantly:

Extract key terms (rent, deposit, dates, utilities, notice periods)

Scan for potential red flags

Generate a clean natural-language summary

Ask natural-language questions grounded in your lease using RAG

All powered by local models using Ollama, with zero API costs

Everything runs 100% on your machine — no cloud, no external servers.

Features:
1. Upload & Process PDFs

Parse multi-page leases using pdfplumber.

Automatically chunk text + embed it for search.

2. Extract Key Lease Terms

Automatically extracts structured data such as:

Monthly rent

Security deposit

Lease start & end dates

Utility responsibilities

Late fee policy

Notice requirements

Pet rules

Returned as clean, machine-readable JSON.

3. Red Flag Scanner

Uses AI to identify clauses that may be:

Tenant-unfriendly

Vague or overly broad

Excessively punitive

Problematic compared to standard practices

Highlights severity (low/medium/high), clause text, and explanation.

4. Local AI Summary

Generate friendly, human-readable summaries of long leases.

5. Question Answering (RAG)

Ask any question about your lease:

“Can the landlord enter without notice?”

“Who pays for internet?”

Answers come from your lease, not hallucinations.
