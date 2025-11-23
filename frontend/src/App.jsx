import React, { useState } from "react";

const API_BASE = "http://localhost:5000/api";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [preview, setPreview] = useState("");
  const [numChunks, setNumChunks] = useState(null);

  const [summary, setSummary] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [contextSnippets, setContextSnippets] = useState([]);

  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [loadingRedFlags, setLoadingRedFlags] = useState(false);

  const [terms, setTerms] = useState(null);
  const [extractError, setExtractError] = useState("");
  const [rawExtraction, setRawExtraction] = useState("");

  const [redFlags, setRedFlags] = useState([]);
  const [redFlagError, setRedFlagError] = useState("");
  const [rawRedFlags, setRawRedFlags] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoadingUpload(true);
    setSummary("");
    setAnswer("");
    setContextSnippets([]);
    setTerms(null);
    setExtractError("");
    setRawExtraction("");
    setRedFlags([]);
    setRedFlagError("");
    setRawRedFlags("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const resp = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();

      if (!resp.ok) {
        alert(data.error || "Upload failed");
        return;
      }

      setDocumentId(data.document_id);
      setPreview(data.preview || "");
      setNumChunks(data.num_chunks || null);
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleSummarize = async () => {
    if (!documentId) {
      alert("Upload a lease first.");
      return;
    }
    setLoadingSummary(true);
    setSummary("");
    try {
      const resp = await fetch(`${API_BASE}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Failed to summarize");
        return;
      }
      setSummary(data.summary || "");
    } catch (err) {
      console.error(err);
      alert("Error summarizing lease");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAsk = async () => {
    if (!documentId) {
      alert("Upload a lease first.");
      return;
    }
    if (!question.trim()) return;

    setLoadingAsk(true);
    setAnswer("");
    setContextSnippets([]);

    try {
      const resp = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          question,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Failed to get answer");
        return;
      }
      setAnswer(data.answer || "");
      setContextSnippets(data.context_snippets || []);
    } catch (err) {
      console.error(err);
      alert("Error contacting backend");
    } finally {
      setLoadingAsk(false);
    }
  };

  const handleExtractTerms = async () => {
    if (!documentId) {
      alert("Upload a lease first.");
      return;
    }

    setLoadingExtract(true);
    setTerms(null);
    setExtractError("");
    setRawExtraction("");

    try {
      const resp = await fetch(`${API_BASE}/extract_terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Failed to extract terms");
        return;
      }

      setTerms(data.terms || null);
      setExtractError(data.error || "");
      setRawExtraction(data.raw || "");
    } catch (err) {
      console.error(err);
      alert("Error extracting terms");
    } finally {
      setLoadingExtract(false);
    }
  };

  const handleCheckRedFlags = async () => {
    if (!documentId) {
      alert("Upload a lease first.");
      return;
    }

    setLoadingRedFlags(true);
    setRedFlags([]);
    setRedFlagError("");
    setRawRedFlags("");

    try {
      const resp = await fetch(`${API_BASE}/red_flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Failed to check red flags");
        return;
      }

      setRedFlags(Array.isArray(data.flags) ? data.flags : []);
      setRedFlagError(data.error || "");
      setRawRedFlags(data.raw || "");
    } catch (err) {
      console.error(err);
      alert("Error checking red flags");
    } finally {
      setLoadingRedFlags(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <div style={styles.logoRow}>
            <div style={styles.logoDot} />
            <h1 style={styles.title}>LeaseWise</h1>
          </div>
          <p style={styles.subtitle}>
            Local lease assistant — summarize, extract terms, and scan for risky clauses
            directly on your machine.
          </p>
        </div>
        <div style={styles.headerStatus}>
          <div style={styles.statusPill(documentId ? "ready" : "idle")}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "999px",
                marginRight: 6,
                backgroundColor: documentId ? "#22c55e" : "#6b7280",
              }}
            />
            {documentId ? "Lease loaded" : "No lease loaded"}
          </div>
          {numChunks != null && (
            <div style={styles.statusText}>Chunks: {numChunks}</div>
          )}
        </div>
      </header>

      {/* LAYOUT GRID */}
      <main style={styles.main}>
        {/* LEFT COLUMN: DOCUMENT & OVERVIEW */}
        <div style={styles.column}>
          {/* Upload */}
          <section style={styles.card}>
            <div style={styles.cardHeaderRow}>
              <h2 style={styles.sectionTitle}>1. Upload lease</h2>
              {selectedFile && (
                <span style={styles.chip}>
                  Selected:{" "}
                  <span style={{ fontWeight: 500 }}>{selectedFile.name}</span>
                </span>
              )}
            </div>
            <p style={styles.sectionHint}>
              Upload a PDF copy of your lease. Everything runs locally using your own
              models.
            </p>
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={styles.fileInput}
              />
              <button
                onClick={handleUpload}
                disabled={!selectedFile || loadingUpload}
                style={styles.buttonPrimary}
              >
                {loadingUpload ? "Processing…" : "Upload & process"}
              </button>
            </div>

            {documentId && (
              <div style={styles.infoBox}>
                <p style={styles.infoLabel}>Document ID</p>
                <p style={styles.infoValue}>{documentId}</p>
                {preview && (
                  <>
                    <p style={{ ...styles.infoLabel, marginTop: "0.5rem" }}>Preview</p>
                    <p style={styles.preview}>{preview}</p>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Extract Key Terms */}
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>2. Key lease terms</h2>
            <p style={styles.sectionHint}>
              Automatically extract important fields like rent, dates, deposit,
              utilities, and notice periods.
            </p>
            <button
              onClick={handleExtractTerms}
              disabled={!documentId || loadingExtract}
              style={styles.buttonSecondary}
            >
              {loadingExtract ? "Extracting…" : "Extract key terms"}
            </button>

            {extractError && (
              <p style={styles.errorText}>{extractError}</p>
            )}

            {terms && (
              <div style={styles.box}>
                <h3 style={styles.boxTitle}>Lease summary sheet</h3>
                <table style={styles.table}>
                  <tbody>
                    {Object.entries(terms).map(([key, value]) => (
                      <tr key={key}>
                        <td style={styles.tableKey}>{key}</td>
                        <td style={styles.tableValue}>
                          {value === null ? "—" : String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {rawExtraction && !terms && (
              <div style={styles.box}>
                <h3 style={styles.boxTitle}>Raw extraction output</h3>
                <p style={styles.monoText}>{rawExtraction}</p>
              </div>
            )}
          </section>

          {/* Summary */}
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>4. Natural language summary</h2>
            <p style={styles.sectionHint}>
              Get a human-readable overview of the lease in plain language.
            </p>
            <button
              onClick={handleSummarize}
              disabled={!documentId || loadingSummary}
              style={styles.buttonSecondary}
            >
              {loadingSummary ? "Summarizing…" : "Summarize lease"}
            </button>
            {summary && (
              <div style={styles.box}>
                <h3 style={styles.boxTitle}>Summary</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{summary}</p>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: RISK & Q&A */}
        <div style={styles.column}>
          {/* Red Flag Check */}
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>3. Red flag scan</h2>
            <p style={styles.sectionHint}>
              Scan for clauses that might be risky or unusually strict for tenants.
            </p>
            <button
              onClick={handleCheckRedFlags}
              disabled={!documentId || loadingRedFlags}
              style={styles.buttonAccent}
            >
              {loadingRedFlags ? "Analyzing…" : "Scan for risky clauses"}
            </button>

            {redFlagError && (
              <p style={styles.errorText}>{redFlagError}</p>
            )}

            {redFlags && redFlags.length > 0 && (
              <div style={styles.box}>
                <h3 style={styles.boxTitle}>Potential red flags</h3>
                <p style={styles.subtleText}>
                  These are not legal advice — just items you might want to review more closely.
                </p>
                <div style={{ marginTop: "0.5rem" }}>
                  {redFlags.map((flag, idx) => (
                    <div key={idx} style={styles.flagCard}>
                      <div style={styles.flagHeaderRow}>
                        <div>
                          <div style={styles.flagId}>
                            {flag.id || `flag_${idx}`}
                          </div>
                          <div style={styles.flagTitle}>
                            {flag.title || "Potential issue"}
                          </div>
                        </div>
                        <div style={styles.severityBadge(flag.severity)}>
                          {flag.severity || "unknown"}
                        </div>
                      </div>
                      {flag.clause_text && (
                        <div style={styles.flagClause}>
                          <div style={styles.flagLabel}>Clause</div>
                          <div style={styles.flagText}>{flag.clause_text}</div>
                        </div>
                      )}
                      {flag.explanation && (
                        <div style={styles.flagExplanation}>
                          <div style={styles.flagLabel}>Why it might be risky</div>
                          <div style={styles.flagText}>{flag.explanation}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rawRedFlags && redFlags.length === 0 && (
              <div style={styles.box}>
                <h3 style={styles.boxTitle}>Raw red flag output</h3>
                <p style={styles.monoText}>{rawRedFlags}</p>
              </div>
            )}
          </section>

          {/* Q&A */}
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>5. Ask questions</h2>
            <p style={styles.sectionHint}>
              Ask about specific rights, fees, or rules. Answers are grounded in your lease.
            </p>
            <textarea
              rows={3}
              placeholder="e.g., Can my landlord increase rent during the lease?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={styles.textarea}
            />
            <button
              onClick={handleAsk}
              disabled={!documentId || loadingAsk || !question.trim()}
              style={styles.buttonPrimary}
            >
              {loadingAsk ? "Thinking…" : "Ask LeaseWise"}
            </button>

            {answer && (
              <div style={styles.box}>
                <h3 style={styles.boxTitle}>Answer</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{answer}</p>
              </div>
            )}

            {contextSnippets.length > 0 && (
              <div style={styles.box}>
                <h3 style={styles.boxTitle}>Relevant lease snippets</h3>
                {contextSnippets.map((c, idx) => (
                  <div key={idx} style={styles.snippet}>
                    <p style={{ whiteSpace: "pre-wrap" }}>{c}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/* --------- styles --------- */

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: "1.5rem",
    background:
      "radial-gradient(circle at top left, #1f2937 0, #020617 42%, #000 100%)",
    color: "#f9fafb",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    maxWidth: 1100,
    margin: "0 auto 1.5rem auto",
    display: "flex",
    justifyContent: "space-between",
    gap: "1.5rem",
    alignItems: "flex-start",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  logoDot: {
    width: 22,
    height: 22,
    borderRadius: "999px",
    background:
      "conic-gradient(from 140deg, #22c55e, #a855f7, #22c55e, #22c55e)",
    boxShadow: "0 0 18px rgba(34,197,94,0.7)",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  subtitle: {
    marginTop: "0.3rem",
    fontSize: "0.9rem",
    color: "#9ca3af",
    maxWidth: 520,
  },
  headerStatus: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.3rem",
    fontSize: "0.8rem",
  },
  statusPill: (state) => ({
    padding: "0.2rem 0.7rem",
    borderRadius: "999px",
    border: "1px solid rgba(148,163,184,0.5)",
    backgroundColor: state === "ready" ? "rgba(22,163,74,0.15)" : "transparent",
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  }),
  statusText: {
    color: "#9ca3af",
  },
  main: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
    gap: "1rem",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.96)",
    borderRadius: "1rem",
    padding: "0.9rem 1rem",
    boxShadow: "0 18px 40px rgba(15,23,42,0.9)",
    border: "1px solid #1f2937",
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.5rem",
    alignItems: "center",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 600,
  },
  sectionHint: {
    marginTop: "0.35rem",
    fontSize: "0.8rem",
    color: "#9ca3af",
  },
  chip: {
    borderRadius: "999px",
    padding: "0.15rem 0.6rem",
    border: "1px solid #1f2937",
    backgroundColor: "#020617",
    fontSize: "0.75rem",
    color: "#9ca3af",
    maxWidth: 220,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  fileInput: {
    fontSize: "0.8rem",
    maxWidth: "260px",
  },
  buttonBase: {
    marginTop: "0.5rem",
    padding: "0.42rem 0.95rem",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  buttonPrimary: {
    marginTop: "0.5rem",
    padding: "0.42rem 0.95rem",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    background: "linear-gradient(120deg, #22c55e, #4ade80)",
    color: "#022c22",
  },
  buttonSecondary: {
    marginTop: "0.5rem",
    padding: "0.42rem 0.95rem",
    borderRadius: "999px",
    border: "1px solid #334155",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    backgroundColor: "#020617",
    color: "#e5e7eb",
  },
  buttonAccent: {
    marginTop: "0.5rem",
    padding: "0.42rem 0.95rem",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    background: "linear-gradient(120deg, #f97316, #ea580c)",
    color: "#fff7ed",
  },
  infoBox: {
    marginTop: "0.8rem",
    padding: "0.7rem",
    borderRadius: "0.75rem",
    backgroundColor: "#020617",
    border: "1px solid #1f2937",
    fontSize: "0.85rem",
  },
  infoLabel: {
    fontSize: "0.75rem",
    color: "#9ca3af",
  },
  infoValue: {
    fontSize: "0.85rem",
    wordBreak: "break-all",
  },
  preview: {
    fontSize: "0.8rem",
    marginTop: "0.25rem",
    whiteSpace: "pre-wrap",
    color: "#e5e7eb",
  },
  box: {
    marginTop: "0.75rem",
    padding: "0.65rem 0.75rem",
    borderRadius: "0.75rem",
    backgroundColor: "#020617",
    border: "1px solid #1f2937",
    fontSize: "0.9rem",
  },
  boxTitle: {
    margin: 0,
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  subtleText: {
    marginTop: "0.25rem",
    fontSize: "0.78rem",
    color: "#9ca3af",
  },
  errorText: {
    marginTop: "0.5rem",
    fontSize: "0.8rem",
    color: "#f97373",
  },
  monoText: {
    whiteSpace: "pre-wrap",
    fontSize: "0.8rem",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "0.5rem",
    fontSize: "0.85rem",
  },
  tableKey: {
    padding: "0.3rem 0.4rem",
    borderBottom: "1px solid #1e293b",
    color: "#9ca3af",
    width: "40%",
    verticalAlign: "top",
  },
  tableValue: {
    padding: "0.3rem 0.4rem",
    borderBottom: "1px solid #1e293b",
    verticalAlign: "top",
  },
  textarea: {
    width: "100%",
    marginTop: "0.5rem",
    padding: "0.5rem",
    borderRadius: "0.6rem",
    border: "1px solid #334155",
    backgroundColor: "#020617",
    color: "#f9fafb",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: "0.9rem",
  },
  snippet: {
    marginTop: "0.5rem",
    padding: "0.45rem 0.5rem",
    borderRadius: "0.5rem",
    backgroundColor: "#020617",
    border: "1px solid #1f2937",
    fontSize: "0.8rem",
  },
  flagCard: {
    borderRadius: "0.75rem",
    border: "1px solid #1f2937",
    padding: "0.65rem 0.75rem",
    marginBottom: "0.55rem",
    backgroundColor: "#020617",
  },
  flagHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "0.6rem",
    alignItems: "flex-start",
  },
  flagId: {
    fontSize: "0.72rem",
    color: "#9ca3af",
  },
  flagTitle: {
    marginTop: "0.15rem",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  flagClause: {
    marginTop: "0.5rem",
    padding: "0.4rem 0.45rem",
    borderRadius: "0.5rem",
    backgroundColor: "#020617",
    border: "1px dashed #1e293b",
  },
  flagExplanation: {
    marginTop: "0.45rem",
    padding: "0.4rem 0.45rem",
    borderRadius: "0.5rem",
    backgroundColor: "#020617",
    border: "1px solid #1e293b",
  },
  flagLabel: {
    fontSize: "0.72rem",
    color: "#9ca3af",
    marginBottom: "0.15rem",
  },
  flagText: {
    fontSize: "0.85rem",
    whiteSpace: "pre-wrap",
  },
  severityBadge: (severity) => {
    let bg = "#4b5563";
    let text = "#e5e7eb";

    if (severity === "high") {
      bg = "#b91c1c";
      text = "#fee2e2";
    } else if (severity === "medium") {
      bg = "#d97706";
      text = "#fffbeb";
    } else if (severity === "low") {
      bg = "#15803d";
      text = "#dcfce7";
    }

    return {
      alignSelf: "flex-start",
      padding: "0.15rem 0.65rem",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: 600,
      backgroundColor: bg,
      color: text,
      textTransform: "uppercase",
    };
  },
};

export default App;
