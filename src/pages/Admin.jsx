import { useState, useEffect, useRef } from "react";
import "../admin.css";
import { supabase, isConfigured } from "../lib/supabase";
import { vocabulary } from "../data";

const CATEGORIES = [
  "lunfardo", "vulgar", "voseo", "expressions", "culture",
  "places", "sports", "time", "weather", "nature",
  "modern", "emotions", "money", "family", "verbs",
];

// ─── CSV helpers ──────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (line[i] === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

function exportCSV() {
  const headers = "spanish,english,context,category";
  const rows = vocabulary.map((w) =>
    [w.spanish, w.english, w.context || "", w.category]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: "che_words.csv",
  });
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Login form ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
      } else {
        onLogin();
      }
    } catch (err) {
      setError("Login failed. Check your credentials.");
    }
    setLoading(false);
  }

  return (
    <div className="admin-login">
      <div className="admin-login-box">
        <div className="admin-login-title">Admin Panel</div>
        <div className="admin-login-subtitle">Che Boludo! Dashboard</div>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div>
            <label>Email</label>
            <input
              className="admin-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label>Password</label>
            <input
              className="admin-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <div className="admin-error">{error}</div>}
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ onLogout }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importData, setImportData] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [addValues, setAddValues] = useState({
    spanish: "",
    english: "",
    context: "",
    category: "lunfardo",
  });
  const fileInputRef = useRef(null);

  async function loadWords() {
    setLoading(true);
    const { data, error } = await supabase.from("Che_words").select("*").order("spanish");
    if (!error && data) {
      setWords(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadWords();
  }, []);

  function showStatus(text, type = "success") {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: "", type: "" }), 4000);
  }

  // ─── Stats ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const studiedToday = words.filter(
    (w) => w.last_seen && w.last_seen.slice(0, 10) === today
  ).length;

  // ─── Filtered words ─────────────────────────────────────────────────────
  const filtered = words.filter((w) => {
    const matchSearch =
      !search ||
      w.spanish.toLowerCase().includes(search.toLowerCase()) ||
      w.english.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || w.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // ─── Import CSV ─────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split("\n").filter((l) => l.trim());
      const hasHeader =
        lines[0].toLowerCase().startsWith("spanish") ||
        lines[0].toLowerCase().startsWith('"spanish"');
      const dataLines = hasHeader ? lines.slice(1) : lines;
      const parsed = dataLines
        .map((line) => {
          const [spanish, english, context, category] = parseCSVLine(line);
          return { spanish, english, context: context || "", category: category || "lunfardo" };
        })
        .filter((r) => r.spanish && r.english);
      setImportData(parsed);
      setImportPreview(`Found ${parsed.length} words. Upload?`);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function confirmImport() {
    if (!importData.length) return;
    const { error } = await supabase
      .from("Che_words")
      .upsert(importData, { onConflict: "spanish" });
    if (error) {
      showStatus(`Import failed: ${error.message}`, "error");
    } else {
      showStatus(`Imported ${importData.length} words successfully.`);
      loadWords();
    }
    setImportPreview(null);
    setImportData([]);
  }

  // ─── Add word ────────────────────────────────────────────────────────────
  async function handleAddWord(e) {
    e.preventDefault();
    const { spanish, english, context, category } = addValues;
    if (!spanish || !english) return;
    const { error } = await supabase.from("Che_words").insert([{ spanish, english, context, category }]);
    if (error) {
      showStatus(`Add failed: ${error.message}`, "error");
    } else {
      showStatus("Word added successfully.");
      setAddValues({ spanish: "", english: "", context: "", category: "lunfardo" });
      setShowAddForm(false);
      loadWords();
    }
  }

  // ─── Edit word ───────────────────────────────────────────────────────────
  function startEdit(word) {
    setEditingId(word.id);
    setEditValues({
      spanish: word.spanish,
      english: word.english,
      context: word.context || "",
      category: word.category,
    });
  }

  async function saveEdit(id) {
    const { error } = await supabase
      .from("Che_words")
      .update(editValues)
      .eq("id", id);
    if (error) {
      showStatus(`Save failed: ${error.message}`, "error");
    } else {
      showStatus("Word updated.");
      setEditingId(null);
      loadWords();
    }
  }

  // ─── Delete word ─────────────────────────────────────────────────────────
  async function deleteWord(id, spanish) {
    if (!window.confirm(`Delete "${spanish}"?`)) return;
    const { error } = await supabase.from("Che_words").delete().eq("id", id);
    if (error) {
      showStatus(`Delete failed: ${error.message}`, "error");
    } else {
      showStatus("Word deleted.");
      loadWords();
    }
  }

  // ─── Logout ──────────────────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <div className="admin-header-title">Admin Panel</div>
        <button className="admin-btn secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <span className="admin-stat-label">Total Words</span>
          <span className="admin-stat-value">{words.length}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Studied Today</span>
          <span className="admin-stat-value">{studiedToday}</span>
        </div>
      </div>

      {/* Status message */}
      {statusMsg.text && (
        <div className={statusMsg.type === "error" ? "admin-error" : "admin-success-msg"}>
          {statusMsg.text}
        </div>
      )}

      {/* Action buttons */}
      <div className="admin-actions">
        <button className="admin-btn secondary" onClick={exportCSV}>
          Export CSV
        </button>
        <button
          className="admin-btn secondary"
          onClick={() => fileInputRef.current.click()}
        >
          Import CSV
        </button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button
          className="admin-btn secondary"
          onClick={() => setShowAddForm((v) => !v)}
        >
          {showAddForm ? "Cancel" : "Add Word"}
        </button>
      </div>

      {/* Import preview */}
      {importPreview && (
        <div className="admin-import-preview">
          <p>{importPreview}</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="admin-btn success" onClick={confirmImport}>
              Upload
            </button>
            <button
              className="admin-btn danger"
              onClick={() => {
                setImportPreview(null);
                setImportData([]);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add word form */}
      {showAddForm && (
        <div className="admin-add-form">
          <div className="admin-add-form-title">Add New Word</div>
          <form onSubmit={handleAddWord}>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label>Spanish *</label>
                <input
                  type="text"
                  value={addValues.spanish}
                  onChange={(e) =>
                    setAddValues((v) => ({ ...v, spanish: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="admin-form-field">
                <label>English *</label>
                <input
                  type="text"
                  value={addValues.english}
                  onChange={(e) =>
                    setAddValues((v) => ({ ...v, english: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="admin-form-field">
                <label>Context</label>
                <input
                  type="text"
                  value={addValues.context}
                  onChange={(e) =>
                    setAddValues((v) => ({ ...v, context: e.target.value }))
                  }
                />
              </div>
              <div className="admin-form-field">
                <label>Category</label>
                <select
                  value={addValues.category}
                  onChange={(e) =>
                    setAddValues((v) => ({ ...v, category: e.target.value }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="admin-form-actions">
              <button className="admin-btn success" type="submit">
                Add Word
              </button>
              <button
                className="admin-btn danger"
                type="button"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search / filter */}
      <div className="admin-filters">
        <input
          className="admin-search"
          type="text"
          placeholder="Search spanish or english..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Words table */}
      {loading ? (
        <div style={{ color: "var(--blue-light)", padding: "20px" }}>
          Loading words...
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Spanish</th>
                <th>English</th>
                <th>Context</th>
                <th>Category</th>
                <th>Seen</th>
                <th>Correct%</th>
                <th>Next Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((word) => {
                const isEditing = editingId === word.id;
                const correctPct =
                  word.times_seen > 0
                    ? Math.round((word.times_correct / word.times_seen) * 100)
                    : "-";
                const nextReview = word.next_review
                  ? new Date(word.next_review).toLocaleDateString()
                  : "-";

                if (isEditing) {
                  return (
                    <tr key={word.id}>
                      <td>
                        <input
                          value={editValues.spanish}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              spanish: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={editValues.english}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              english: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={editValues.context}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              context: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={editValues.category}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              category: e.target.value,
                            }))
                          }
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{word.times_seen ?? 0}</td>
                      <td>{correctPct}{correctPct !== "-" ? "%" : ""}</td>
                      <td>{nextReview}</td>
                      <td className="actions-cell">
                        <button
                          className="admin-btn success"
                          onClick={() => saveEdit(word.id)}
                        >
                          Save
                        </button>
                        <button
                          className="admin-btn danger"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={word.id}>
                    <td className="spanish-cell">{word.spanish}</td>
                    <td className="english-cell">{word.english}</td>
                    <td className="context-cell">{word.context}</td>
                    <td className="category-cell">{word.category}</td>
                    <td>{word.times_seen ?? 0}</td>
                    <td>{correctPct}{correctPct !== "-" ? "%" : ""}</td>
                    <td>{nextReview}</td>
                    <td className="actions-cell">
                      <button
                        className="admin-btn secondary"
                        onClick={() => startEdit(word)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn danger"
                        onClick={() => deleteWord(word.id, word.spanish)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--cream-dark)" }}>
                    No words found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Admin root ───────────────────────────────────────────────────────────────
export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setCheckingAuth(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checkingAuth) {
    return <div className="admin-loading">Cargando...</div>;
  }

  if (!isConfigured || !supabase) {
    return (
      <div className="admin-wrapper">
        <div className="admin-header">
          <div className="admin-header-title">Admin Panel</div>
        </div>
        <div className="admin-no-supabase">
          <strong>Supabase not configured</strong>
          Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables to use the admin panel.
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginForm onLogin={() => setLoggedIn(true)} />;
  }

  return <Dashboard onLogout={() => setLoggedIn(false)} />;
}
