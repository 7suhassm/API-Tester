import { useState, useRef, useEffect } from "react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const METHOD_COLORS = {
  GET: "#61affe",
  POST: "#49cc90",
  PUT: "#fca130",
  PATCH: "#50e3c2",
  DELETE: "#f93e3e",
  HEAD: "#9012fe",
  OPTIONS: "#0d5aa7",
};
const TAB_ICONS = {
  Params: "⊞",
  Headers: "≡",
  Body: "{ }",
  Auth: "🔑",
  Tests: "✓",
};
const AUTH_TYPES = ["None", "Bearer Token", "Basic Auth", "API Key"];

// ── Error analyser ──────────────────────────────────────────────────────────
function analyseError(err, url) {
  const msg = err?.message || String(err);
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("ERR_")
  ) {
    return {
      title: "Network Error — Could not reach the server",
      reason: isLocal
        ? "Your local server doesn't seem to be running, or it's on a different port."
        : "The server is unreachable. This is likely a CORS block, server outage, or typo in the URL.",
      fixes: isLocal
        ? [
            "Make sure your local server is running (check terminal/IDE)",
            "Double-check the port number in the URL",
            'Ensure @CrossOrigin("*") is on your Spring Boot controller',
          ]
        : [
            "Check the URL for typos",
            "This domain may block browser requests (CORS policy)",
            "Try a public API: https://jsonplaceholder.typicode.com/posts/1",
            "YouTube / Twitter / Instagram will always be blocked in browser clients",
          ],
    };
  }
  if (msg.toLowerCase().includes("cors") || msg.includes("cross-origin")) {
    return {
      title: "CORS Error — Request blocked by browser",
      reason: "The server doesn't allow requests from this origin.",
      fixes: [
        'Spring Boot: Add @CrossOrigin("*") to your controller',
        "Express: app.use(require('cors')())",
        "FastAPI: add CORSMiddleware with allow_origins=['*']",
      ],
    };
  }
  if (msg.includes("Invalid URL") || msg.includes("URL")) {
    return {
      title: "Invalid URL",
      reason: "The URL you entered is not valid.",
      fixes: [
        "Must start with http:// or https://",
        "Check for spaces or special characters",
        "Example: http://localhost:8080/api/demo/hello",
      ],
    };
  }
  return {
    title: "Request Failed",
    reason: msg,
    fixes: [
      "Check the URL and HTTP method",
      "Open browser DevTools (F12) for more details",
    ],
  };
}

// ── Themes ──────────────────────────────────────────────────────────────────
const DARK = {
  bg: "#0f172a",
  sidebar: "#0d1526",
  card: "#1e293b",
  border: "#1e293b",
  border2: "#334155",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textDim: "#475569",
  input: "#1e293b",
  codeBg: "#0a0f1e",
  accent: "#f97316",
  accentGrad: "linear-gradient(135deg,#f97316,#ea580c)",
  scroll: "#334155",
};
const LIGHT = {
  bg: "#f1f5f9",
  sidebar: "#ffffff",
  card: "#f0f4f8",
  border: "#e2e8f0",
  border2: "#cbd5e1",
  text: "#0f172a",
  textMuted: "#475569",
  textDim: "#94a3b8",
  input: "#ffffff",
  codeBg: "#f8fafc",
  accent: "#ea580c",
  accentGrad: "linear-gradient(135deg,#f97316,#ea580c)",
  scroll: "#cbd5e1",
};

// ── Token-based JSON syntax highlighter — uses React spans (Vite compatible) ─
function Highlight({ code, isDark }) {
  const tokens = [];
  let i = 0;
  while (i < code.length) {
    // String token
    if (code[i] === '"') {
      let j = i + 1,
        str = '"';
      while (j < code.length) {
        if (code[j] === "\\") {
          str += code[j] + (code[j + 1] || "");
          j += 2;
          continue;
        }
        str += code[j];
        if (code[j] === '"') {
          j++;
          break;
        }
        j++;
      }
      // Look ahead past whitespace — if next char is ':', this is a key
      let k = j;
      while (k < code.length && (code[k] === " " || code[k] === "\t")) k++;
      tokens.push({ type: code[k] === ":" ? "key" : "str", val: str });
      i = j;
      continue;
    }
    // Number token
    const numM = code.slice(i).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
    if (numM) {
      tokens.push({ type: "num", val: numM[0] });
      i += numM[0].length;
      continue;
    }
    // Keyword token (true / false / null)
    const kwM = code.slice(i).match(/^(true|false|null)/);
    if (kwM) {
      tokens.push({ type: "kw", val: kwM[0] });
      i += kwM[0].length;
      continue;
    }
    // Punctuation / whitespace
    tokens.push({ type: "punct", val: code[i] });
    i++;
  }

  const C = {
    key: isDark ? "#79d4a5" : "#0f7b55",
    str: isDark ? "#e6a87c" : "#c05621",
    num: isDark ? "#79b8ff" : "#1a56db",
    kw: "#f97316",
    punct: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <pre
      style={{
        margin: 0,
        fontFamily: "'Fira Code',monospace",
        fontSize: 13,
        lineHeight: 1.8,
        color: isDark ? "#e2e8f0" : "#1e293b",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {tokens.map((tok, idx) => (
        <span key={idx} style={{ color: C[tok.type] }}>
          {tok.val}
        </span>
      ))}
    </pre>
  );
}

// ── Key-value editor ────────────────────────────────────────────────────────
function KV({ rows, onChange, t, ph = { key: "Key", value: "Value" } }) {
  const add = () => onChange([...rows, { key: "", value: "", enabled: true }]);
  const del = (i) => onChange(rows.filter((_, j) => j !== i));
  const upd = (i, f, v) => {
    const n = [...rows];
    n[i] = { ...n[i], [f]: v };
    onChange(n);
  };
  const si = {
    background: t.input,
    border: `1px solid ${t.border2}`,
    borderRadius: 5,
    color: t.text,
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: "'Fira Code',monospace",
    outline: "none",
    flex: 1,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={r.enabled !== false}
            onChange={(e) => upd(i, "enabled", e.target.checked)}
            style={{ accentColor: t.accent, cursor: "pointer" }}
          />
          <input
            value={r.key}
            onChange={(e) => upd(i, "key", e.target.value)}
            placeholder={ph.key}
            style={si}
          />
          <input
            value={r.value}
            onChange={(e) => upd(i, "value", e.target.value)}
            placeholder={ph.value}
            style={{ ...si, flex: 1.4 }}
          />
          <button
            onClick={() => del(i)}
            style={{
              background: t.card,
              border: `1px solid ${t.border2}`,
              borderRadius: 5,
              color: t.textMuted,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={add}
        style={{
          background: "none",
          border: `1px dashed ${t.border2}`,
          borderRadius: 5,
          color: t.textDim,
          padding: "6px",
          cursor: "pointer",
          fontSize: 12,
          marginTop: 2,
        }}
      >
        ＋ Add Row
      </button>
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
function Badge({ status }) {
  if (!status && status !== 0) return null;
  const c =
    status >= 200 && status < 300
      ? "#49cc90"
      : status >= 300 && status < 400
        ? "#fca130"
        : status >= 400
          ? "#f93e3e"
          : "#9ca3af";
  return (
    <span
      style={{
        background: c + "22",
        color: c,
        border: `1px solid ${c}55`,
        borderRadius: 4,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "monospace",
      }}
    >
      {status}
    </span>
  );
}

// ── Error panel ─────────────────────────────────────────────────────────────
function ErrorPanel({ e }) {
  return (
    <div
      style={{
        background: "#7f1d1d22",
        border: "1px solid #991b1b",
        borderRadius: 10,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 22 }}>⚠️</span>
        <span style={{ color: "#fca5a5", fontWeight: 700, fontSize: 14 }}>
          {e.title}
        </span>
      </div>
      <p
        style={{
          color: "#fca5a5",
          fontSize: 13,
          marginBottom: 14,
          opacity: 0.85,
        }}
      >
        {e.reason}
      </p>
      <div style={{ borderTop: "1px solid #991b1b55", paddingTop: 12 }}>
        <p
          style={{
            color: "#f87171",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 8,
          }}
        >
          💡 How to fix:
        </p>
        {e.fixes.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <span style={{ color: "#f97316", fontSize: 12, minWidth: 16 }}>
              {i + 1}.
            </span>
            <span style={{ color: "#fecaca", fontSize: 12 }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── History row ─────────────────────────────────────────────────────────────
function HistoryRow({ item, onLoad, t }) {
  const ago = (ts) => {
    const d = Date.now() - ts;
    return d < 60000
      ? `${Math.floor(d / 1000)}s`
      : d < 3600000
        ? `${Math.floor(d / 60000)}m`
        : `${Math.floor(d / 3600000)}h`;
  };
  return (
    <div
      onClick={() => onLoad(item)}
      style={{
        padding: "8px 10px",
        borderRadius: 6,
        cursor: "pointer",
        marginBottom: 3,
        borderLeft: `3px solid ${METHOD_COLORS[item.method] || "#64748b"}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.card)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 2,
        }}
      >
        <span
          style={{
            color: METHOD_COLORS[item.method],
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "monospace",
            minWidth: 40,
          }}
        >
          {item.method}
        </span>
        <Badge status={item.status} />
        <span style={{ color: t.textDim, fontSize: 10, marginLeft: "auto" }}>
          {ago(item.timestamp)} ago
        </span>
      </div>
      <div
        style={{
          color: t.textMuted,
          fontSize: 11,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "monospace",
        }}
      >
        {item.url}
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true);
  const t = dark ? DARK : LIGHT;

  // Request
  const [url, setUrl] = useState(
    "https://jsonplaceholder.typicode.com/posts/1",
  );
  const [method, setMethod] = useState("GET");
  const [params, setParams] = useState([{ key: "", value: "", enabled: true }]);
  const [hdrs, setHdrs] = useState([
    { key: "Content-Type", value: "application/json", enabled: true },
  ]);
  const [body, setBody] = useState(
    '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}',
  );
  const [bodyType, setBodyType] = useState("json");
  const [authType, setAuthType] = useState("None");
  const [authToken, setAuthToken] = useState("");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [apiKeyName, setApiKeyName] = useState("x-api-key");
  const [apiKeyValue, setApiKeyValue] = useState("");

  // Response
  const [resp, setResp] = useState(null);
  const [errInfo, setErrInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reqTab, setReqTab] = useState("Params");
  const [resTab, setResTab] = useState("Body");
  const [resView, setResView] = useState("pretty"); // pretty | raw
  const [fullscreen, setFullscreen] = useState(false);

  // Sidebar
  const [reqName, setReqName] = useState("");
  const [collection, setCollection] = useState([]);
  const [history, setHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sideTab, setSideTab] = useState("collection");
  const [env, setEnv] = useState({});
  const [envText, setEnvText] = useState("{}");
  const [testScript, setTestScript] = useState(
    `pm.test("Status is 200", () => {\n  pm.expect(pm.response.status).to.equal(200);\n});\npm.test("Response time < 1000ms", () => {\n  pm.expect(pm.response.time).to.be.below(1000);\n});`,
  );
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Layout
  const [split, setSplit] = useState(48);
  const dragging = useRef(false);
  const containerRef = useRef(null);
  const abortRef = useRef(null);

  // Ctrl+Enter to send
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        sendRequest();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // Drag to resize
  useEffect(() => {
    const move = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setSplit(
        Math.min(72, Math.max(25, ((e.clientX - r.left) / r.width) * 100)),
      );
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const rv = (s) =>
    String(s || "").replace(/\{\{(\w+)\}\}/g, (_, k) => env[k] || `{{${k}}}`);

  const buildUrl = () => {
    let base = rv(url);
    const ap = params.filter((p) => p.enabled !== false && p.key);
    if (ap.length)
      base +=
        (base.includes("?") ? "&" : "?") +
        ap
          .map(
            (p) =>
              `${encodeURIComponent(p.key)}=${encodeURIComponent(rv(p.value))}`,
          )
          .join("&");
    return base;
  };

  // ── Detect response type from Content-Type OR body shape ────────────────
  const detectJson = (text, contentType) => {
    if (contentType && contentType.includes("application/json")) return true;
    if (!text || text.length === 0) return false;
    const trimmed = text.trim();
    return trimmed.startsWith("{") || trimmed.startsWith("[");
  };

  const detectHtml = (text, contentType) => {
    if (
      contentType &&
      (contentType.includes("text/html") ||
        contentType.includes("application/xhtml"))
    )
      return true;
    if (!text) return false;
    const trimmed = text.trim().toLowerCase();
    return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
  };

  const sendRequest = async () => {
    if (!url) return;
    setLoading(true);
    setResp(null);
    setErrInfo(null);
    setTestResult(null);
    setResTab("Body");
    setResView("pretty"); // Always reset to Body/Pretty on new request

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Build headers — always include Content-Type for POST/PUT/PATCH if body is JSON
    const hObj = {};
    hdrs
      .filter((h) => h.enabled !== false && h.key)
      .forEach((h) => {
        hObj[rv(h.key)] = rv(h.value);
      });
    if (authType === "Bearer Token" && authToken)
      hObj["Authorization"] = `Bearer ${rv(authToken)}`;
    else if (authType === "Basic Auth" && authUser)
      hObj["Authorization"] = "Basic " + btoa(`${authUser}:${authPass}`);
    else if (authType === "API Key" && apiKeyName)
      hObj[rv(apiKeyName)] = rv(apiKeyValue);

    // Auto-set Content-Type for JSON body if not already set
    const hasBody =
      !["GET", "HEAD"].includes(method) && body && bodyType === "json";
    if (
      hasBody &&
      !Object.keys(hObj).find((k) => k.toLowerCase() === "content-type")
    ) {
      hObj["Content-Type"] = "application/json";
    }

    const reqUrl = buildUrl();
    const start = Date.now();

    try {
      const opts = { method, headers: hObj, signal: ctrl.signal };
      if (hasBody) opts.body = rv(body);

      const res = await fetch(reqUrl, opts);
      const elapsed = Date.now() - start;
      const rawText = await res.text();

      // Robust JSON detection
      const contentType = res.headers.get("content-type") || "";
      const isJson = detectJson(rawText, contentType);

      let prettyBody = rawText;
      let parsed = null;
      if (isJson && rawText.trim().length > 0) {
        try {
          parsed = JSON.parse(rawText);
          prettyBody = JSON.stringify(parsed, null, 2);
        } catch {
          prettyBody = rawText; // fallback to raw if parse fails
        }
      }

      const rh = {};
      res.headers.forEach((v, k) => {
        rh[k] = v;
      });

      const isHtml = !isJson && detectHtml(rawText, contentType);

      const ro = {
        status: res.status,
        statusText: res.statusText,
        time: elapsed,
        size: new Blob([rawText]).size,
        raw: rawText,
        body: prettyBody,
        headers: rh,
        contentType,
        isJson,
        isHtml,
        method,
      };

      // Auto-select best view mode
      if (isJson) setResView("pretty");
      else if (isHtml) setResView("html");
      else setResView("raw");

      setResp(ro);

      // Save to history
      setHistory((prev) =>
        [
          {
            method,
            url: reqUrl,
            status: res.status,
            time: elapsed,
            timestamp: Date.now(),
            headers: [...hdrs],
            params: [...params],
            body,
            authType,
            authToken,
          },
          ...prev,
        ].slice(0, 20),
      );

      // Run tests
      try {
        const pm = {
          response: {
            status: res.status,
            time: elapsed,
            body: rawText,
            json: parsed,
          },
          expect: (v) => ({
            to: {
              equal: (x) => {
                if (v !== x) throw new Error(`Expected ${x}, got ${v}`);
              },
              be: {
                below: (n) => {
                  if (v >= n) throw new Error(`Expected < ${n}, got ${v}`);
                },
              },
            },
          }),
          results: [],
          test(name, fn) {
            try {
              fn();
              this.results.push({ name, passed: true });
            } catch (e2) {
              this.results.push({ name, passed: false, error: e2.message });
            }
          },
        };
        // eslint-disable-next-line no-new-func
        new Function("pm", testScript)(pm);
        setTestResult(pm.results);
      } catch (te) {
        setTestResult([
          { name: "Script Error", passed: false, error: te.message },
        ]);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setResp({
          status: "CANCELLED",
          time: Date.now() - start,
          body: "Request was cancelled.",
          raw: "",
          headers: {},
          isJson: false,
          method,
        });
      } else {
        setErrInfo(analyseError(err, url));
        setHistory((prev) =>
          [
            {
              method,
              url: reqUrl,
              status: "ERR",
              time: Date.now() - start,
              timestamp: Date.now(),
              headers: [...hdrs],
              params: [...params],
              body,
              authType,
              authToken,
            },
            ...prev,
          ].slice(0, 20),
        );
      }
    }
    setLoading(false);
  };

  const loadReq = (item) => {
    setMethod(item.method);
    setUrl(item.url);
    setHdrs(item.headers || []);
    setParams(item.params || []);
    setBody(item.body || "");
    setAuthType(item.authType || "None");
    setAuthToken(item.authToken || "");
  };

  const copyResponse = () => {
    if (!resp?.body) return;
    navigator.clipboard.writeText(resView === "raw" ? resp.raw : resp.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Shared styles
  const inp = {
    background: t.input,
    border: `1px solid ${t.border2}`,
    borderRadius: 6,
    color: t.text,
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: "'Fira Code',monospace",
    outline: "none",
  };
  const codeArea = {
    width: "100%",
    background: t.codeBg,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    color: t.text,
    padding: 14,
    fontSize: 13,
    fontFamily: "'Fira Code',monospace",
    resize: "vertical",
    lineHeight: 1.7,
    outline: "none",
  };
  const lbl = {
    display: "block",
    fontSize: 11,
    color: t.textMuted,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: t.bg,
        color: t.text,
        fontFamily: "'Inter',sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: ${t.scroll}; border-radius: 10px; }
        input::placeholder, textarea::placeholder { color: ${t.textDim}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .tb { background:none; border:none; cursor:pointer; padding:8px 14px; font-size:13px; font-weight:500; color:${t.textMuted}; border-bottom:2px solid transparent; transition:all .15s; white-space:nowrap; }
        .tb:hover { color:${t.text}; }
        .tb.on { color:${t.accent}; border-bottom-color:${t.accent}; }
        .rtb { background:none; border:none; cursor:pointer; padding:5px 11px; font-size:12px; font-weight:500; color:${t.textMuted}; border-radius:5px; transition:all .15s; }
        .rtb.on { background:${t.card}; color:${t.accent}; }
        .vtb { background:none; border:1px solid ${t.border2}; cursor:pointer; padding:3px 10px; font-size:11px; font-weight:600; color:${t.textMuted}; border-radius:4px; transition:all .15s; }
        .vtb.on { background:${t.accent}22; border-color:${t.accent}; color:${t.accent}; }
        .ib { background:${t.card}; border:1px solid ${t.border2}; border-radius:5px; color:${t.textMuted}; padding:5px 10px; cursor:pointer; font-size:12px; transition:all .15s; font-family:'Inter',sans-serif; white-space:nowrap; }
        .ib:hover { color:${t.text}; border-color:${t.accent}; }
        .sb { background:${t.accentGrad}; border:none; border-radius:6px; color:#fff; padding:9px 22px; cursor:pointer; font-size:13px; font-weight:700; transition:all .15s; white-space:nowrap; }
        .sb:hover { filter:brightness(1.12); transform:translateY(-1px); }
        .cb { background:#ef4444; border:none; border-radius:6px; color:#fff; padding:9px 22px; cursor:pointer; font-size:13px; font-weight:700; }
        .stab { flex:1; padding:5px 2px; border-radius:5px; border:none; cursor:pointer; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; transition:all .15s; }
      `}</style>

      {/* ── SIDEBAR ── */}
      {sidebarOpen && (
        <div
          style={{
            width: 238,
            background: t.sidebar,
            borderRight: `1px solid ${t.border}`,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "13px 12px",
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: t.accentGrad,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                ⚡
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: t.text }}>
                DevProbe
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: t.textDim,
                  background: t.card,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                v3
              </span>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {[
                ["collection", "📁 Saved"],
                ["history", "🕒 History"],
                ["env", "🌐 Env"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  className="stab"
                  onClick={() => setSideTab(k)}
                  style={{
                    background: sideTab === k ? t.card : "transparent",
                    color: sideTab === k ? t.accent : t.textMuted,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
            {sideTab === "collection" &&
              (collection.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: t.textDim,
                    fontSize: 12,
                    marginTop: 32,
                    lineHeight: 2,
                  }}
                >
                  No saved requests.
                  <br />
                  Hit 💾 to save one.
                </p>
              ) : (
                collection.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => loadReq(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      marginBottom: 3,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = t.card)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      style={{
                        color: METHOD_COLORS[item.method] || "#9ca3af",
                        fontSize: 10,
                        fontWeight: 700,
                        minWidth: 40,
                        fontFamily: "monospace",
                      }}
                    >
                      {item.method}
                    </span>
                    <span
                      style={{
                        color: t.text,
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {item.name || item.url}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollection((p) => p.filter((_, j) => j !== i));
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: t.textDim,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              ))}

            {sideTab === "history" &&
              (history.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: t.textDim,
                    fontSize: 12,
                    marginTop: 32,
                    lineHeight: 2,
                  }}
                >
                  No history yet.
                  <br />
                  Send a request!
                </p>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "2px 4px",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, color: t.textMuted }}>
                      Last {history.length} requests
                    </span>
                    <button
                      onClick={() => setHistory([])}
                      style={{
                        background: "none",
                        border: "none",
                        color: t.textDim,
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  {history.map((item, i) => (
                    <HistoryRow key={i} item={item} onLoad={loadReq} t={t} />
                  ))}
                </>
              ))}

            {sideTab === "env" && (
              <div style={{ padding: 4 }}>
                <p
                  style={{
                    fontSize: 11,
                    color: t.textMuted,
                    marginBottom: 8,
                    lineHeight: 1.6,
                  }}
                >
                  JSON variables. Use{" "}
                  <code style={{ color: t.accent }}>{"{{name}}"}</code> in any
                  field.
                </p>
                <textarea
                  value={envText}
                  onChange={(e) => setEnvText(e.target.value)}
                  style={{ ...codeArea, height: 150, fontSize: 12 }}
                  spellCheck={false}
                />
                <button
                  onClick={() => {
                    try {
                      setEnv(JSON.parse(envText));
                    } catch {
                      alert("Invalid JSON");
                    }
                  }}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: 8,
                    borderRadius: 6,
                    border: "none",
                    background: t.accentGrad,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Apply
                </button>
                {Object.keys(env).length > 0 &&
                  Object.entries(env).map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        fontSize: 11,
                        color: t.textMuted,
                        padding: "4px 0",
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      <span style={{ color: t.accent }}>{k}</span> = {v}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* TOP BAR */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: t.sidebar,
            flexShrink: 0,
          }}
        >
          <button
            className="ib"
            onClick={() => setSidebarOpen((s) => !s)}
            style={{ fontSize: 15, padding: "5px 9px" }}
          >
            ☰
          </button>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{
              background: t.card,
              border: `1px solid ${t.border2}`,
              borderRadius: 6,
              color: METHOD_COLORS[method],
              fontWeight: 700,
              fontSize: 13,
              padding: "8px 10px",
              cursor: "pointer",
              minWidth: 100,
              fontFamily: "'Fira Code',monospace",
              outline: "none",
            }}
          >
            {METHODS.map((m) => (
              <option
                key={m}
                style={{ color: METHOD_COLORS[m], background: t.card }}
              >
                {m}
              </option>
            ))}
          </select>

          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendRequest()}
            placeholder="Enter URL  •  Ctrl+Enter to send"
            style={{ ...inp, flex: 1 }}
          />

          {loading ? (
            <button className="cb" onClick={() => abortRef.current?.abort()}>
              ✕ Cancel
            </button>
          ) : (
            <button className="sb" onClick={sendRequest}>
              ▶ Send
            </button>
          )}

          <input
            value={reqName}
            onChange={(e) => setReqName(e.target.value)}
            placeholder="Name (opt.)"
            style={{ ...inp, width: 105, fontSize: 12, padding: "8px 10px" }}
          />
          <button
            className="ib"
            onClick={() => {
              setCollection((p) => [
                ...p,
                {
                  method,
                  url,
                  headers: [...hdrs],
                  params: [...params],
                  body,
                  name: reqName || url,
                  authType,
                  authToken,
                },
              ]);
              setReqName("");
            }}
            title="Save request"
          >
            💾
          </button>
          <button
            className="ib"
            onClick={() => setDark((d) => !d)}
            title="Toggle theme"
            style={{ fontSize: 14 }}
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        {/* SPLIT AREA */}
        <div
          ref={containerRef}
          style={{ flex: 1, display: "flex", overflow: "hidden" }}
        >
          {/* ── REQUEST PANEL ── */}
          {!fullscreen && (
            <div
              style={{
                width: `${split}%`,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  borderBottom: `1px solid ${t.border}`,
                  background: t.sidebar,
                  paddingLeft: 6,
                  flexShrink: 0,
                  overflowX: "auto",
                }}
              >
                {Object.keys(TAB_ICONS).map((tab) => (
                  <button
                    key={tab}
                    className={`tb ${reqTab === tab ? "on" : ""}`}
                    onClick={() => setReqTab(tab)}
                  >
                    {TAB_ICONS[tab]} {tab}
                    {tab === "Tests" && testResult && (
                      <span
                        style={{
                          marginLeft: 5,
                          background: testResult.every((r) => r.passed)
                            ? "#14532d"
                            : "#7f1d1d",
                          color: testResult.every((r) => r.passed)
                            ? "#4ade80"
                            : "#fca5a5",
                          borderRadius: 10,
                          padding: "1px 6px",
                          fontSize: 10,
                        }}
                      >
                        {testResult.filter((r) => r.passed).length}/
                        {testResult.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
                {reqTab === "Params" && (
                  <>
                    <p
                      style={{
                        fontSize: 11,
                        color: t.textMuted,
                        marginBottom: 10,
                      }}
                    >
                      Appended to URL automatically.
                    </p>
                    <KV rows={params} onChange={setParams} t={t} />
                  </>
                )}

                {reqTab === "Headers" && (
                  <KV rows={hdrs} onChange={setHdrs} t={t} />
                )}

                {reqTab === "Body" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        marginBottom: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {["none", "json", "text", "form"].map((bt) => (
                        <label
                          key={bt}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            color: bodyType === bt ? t.accent : t.textMuted,
                          }}
                        >
                          <input
                            type="radio"
                            name="bt"
                            value={bt}
                            checked={bodyType === bt}
                            onChange={() => setBodyType(bt)}
                            style={{ accentColor: t.accent }}
                          />
                          {bt === "json"
                            ? "JSON"
                            : bt === "text"
                              ? "Text"
                              : bt === "form"
                                ? "Form"
                                : "None"}
                        </label>
                      ))}
                      {bodyType === "json" && (
                        <button
                          className="ib"
                          onClick={() => {
                            try {
                              setBody(
                                JSON.stringify(JSON.parse(body), null, 2),
                              );
                            } catch {
                              alert("Invalid JSON");
                            }
                          }}
                          style={{ marginLeft: "auto", fontSize: 11 }}
                        >
                          Format
                        </button>
                      )}
                    </div>
                    {bodyType !== "none" && bodyType !== "form" && (
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        spellCheck={false}
                        style={{ ...codeArea, height: 220 }}
                      />
                    )}
                    {bodyType === "form" && (
                      <KV
                        rows={params}
                        onChange={setParams}
                        t={t}
                        ph={{ key: "Field", value: "Value" }}
                      />
                    )}
                  </div>
                )}

                {reqTab === "Auth" && (
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={lbl}>Auth Type</label>
                      <select
                        value={authType}
                        onChange={(e) => setAuthType(e.target.value)}
                        style={{ ...inp, width: 200 }}
                      >
                        {AUTH_TYPES.map((a) => (
                          <option key={a} style={{ background: t.card }}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                    {authType === "Bearer Token" && (
                      <div>
                        <label style={lbl}>Token</label>
                        <input
                          value={authToken}
                          onChange={(e) => setAuthToken(e.target.value)}
                          placeholder="eyJhbGci…"
                          style={{ ...inp, width: "100%" }}
                        />
                      </div>
                    )}
                    {authType === "Basic Auth" && (
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={lbl}>Username</label>
                          <input
                            value={authUser}
                            onChange={(e) => setAuthUser(e.target.value)}
                            style={inp}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={lbl}>Password</label>
                          <input
                            type="password"
                            value={authPass}
                            onChange={(e) => setAuthPass(e.target.value)}
                            style={inp}
                          />
                        </div>
                      </div>
                    )}
                    {authType === "API Key" && (
                      <div style={{ display: "flex", gap: 10 }}>
                        <div>
                          <label style={lbl}>Header Name</label>
                          <input
                            value={apiKeyName}
                            onChange={(e) => setApiKeyName(e.target.value)}
                            style={inp}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={lbl}>Value</label>
                          <input
                            value={apiKeyValue}
                            onChange={(e) => setApiKeyValue(e.target.value)}
                            style={{ ...inp, width: "100%" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {reqTab === "Tests" && (
                  <div>
                    <p
                      style={{
                        fontSize: 11,
                        color: t.textMuted,
                        marginBottom: 8,
                      }}
                    >
                      Use{" "}
                      <code style={{ color: t.accent }}>pm.test(name, fn)</code>{" "}
                      and{" "}
                      <code style={{ color: t.accent }}>pm.expect(val)</code>
                    </p>
                    <textarea
                      value={testScript}
                      onChange={(e) => setTestScript(e.target.value)}
                      spellCheck={false}
                      style={{ ...codeArea, height: 180 }}
                    />
                    {testResult &&
                      testResult.map((r, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            borderRadius: 5,
                            marginTop: 6,
                            background: r.passed ? "#14532d22" : "#7f1d1d22",
                            border: `1px solid ${r.passed ? "#166534" : "#991b1b"}`,
                            animation: "fade .2s ease",
                          }}
                        >
                          <span>{r.passed ? "✅" : "❌"}</span>
                          <span
                            style={{
                              fontSize: 12,
                              color: r.passed ? "#4ade80" : "#fca5a5",
                              flex: 1,
                            }}
                          >
                            {r.name}
                          </span>
                          {r.error && (
                            <span style={{ fontSize: 11, color: "#f87171" }}>
                              {r.error}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DRAG HANDLE */}
          {!fullscreen && (
            <div
              onMouseDown={(e) => {
                dragging.current = true;
                e.preventDefault();
              }}
              style={{
                width: 4,
                cursor: "col-resize",
                background: t.border,
                flexShrink: 0,
                transition: "background .15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = t.accent)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = t.border)
              }
            />
          )}

          {/* ── RESPONSE PANEL ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            {/* Response tab bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderBottom: `1px solid ${t.border}`,
                background: t.sidebar,
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 3 }}>
                {["Body", "Headers", "Info"].map((tab) => (
                  <button
                    key={tab}
                    className={`rtb ${resTab === tab ? "on" : ""}`}
                    onClick={() => setResTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Body view toggle: JSON / HTML / Raw */}
              {resp && resTab === "Body" && (
                <div style={{ display: "flex", gap: 4, marginLeft: 6 }}>
                  {resp.isJson && (
                    <button
                      className={`vtb ${resView === "pretty" ? "on" : ""}`}
                      onClick={() => setResView("pretty")}
                    >
                      ✦ JSON
                    </button>
                  )}
                  {resp.isHtml && (
                    <button
                      className={`vtb ${resView === "html" ? "on" : ""}`}
                      onClick={() => setResView("html")}
                    >
                      ◈ HTML
                    </button>
                  )}
                  <button
                    className={`vtb ${resView === "raw" ? "on" : ""}`}
                    onClick={() => setResView("raw")}
                  >
                    Raw
                  </button>
                </div>
              )}

              <div style={{ flex: 1 }} />

              {/* Response meta */}
              {resp && !errInfo && (
                <>
                  <Badge status={resp.status} />
                  <span style={{ fontSize: 12, color: t.textMuted }}>
                    ⏱ {resp.time}ms
                  </span>
                  {resp.size != null && (
                    <span style={{ fontSize: 12, color: t.textMuted }}>
                      📦{" "}
                      {resp.size > 1024
                        ? (resp.size / 1024).toFixed(1) + " KB"
                        : resp.size + " B"}
                    </span>
                  )}
                  {resp.isJson && (
                    <span
                      style={{
                        fontSize: 11,
                        background: "#49cc9022",
                        color: "#49cc90",
                        border: "1px solid #49cc9044",
                        borderRadius: 4,
                        padding: "1px 7px",
                      }}
                    >
                      JSON
                    </span>
                  )}
                  {resp.isHtml && (
                    <span
                      style={{
                        fontSize: 11,
                        background: "#61affe22",
                        color: "#61affe",
                        border: "1px solid #61affe44",
                        borderRadius: 4,
                        padding: "1px 7px",
                      }}
                    >
                      HTML
                    </span>
                  )}
                  <button
                    className="ib"
                    onClick={copyResponse}
                    style={{ fontSize: 11 }}
                  >
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                </>
              )}
              <button
                className="ib"
                onClick={() => setFullscreen((f) => !f)}
                title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                style={{ fontSize: 12 }}
              >
                {fullscreen ? "⊠ Exit" : "⤢ Full"}
              </button>
            </div>

            {/* Response content */}
            <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: `3px solid ${t.border2}`,
                      borderTopColor: t.accent,
                      animation: "spin .7s linear infinite",
                    }}
                  />
                  <p style={{ color: t.textMuted, fontSize: 13 }}>
                    Sending {method} request…
                  </p>
                </div>
              ) : errInfo ? (
                <div style={{ animation: "fade .25s ease" }}>
                  <ErrorPanel e={errInfo} />
                </div>
              ) : !resp ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 48 }}>⚡</div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: t.textMuted,
                    }}
                  >
                    Hit Send to get a response
                  </p>
                  <p style={{ fontSize: 12, color: t.textDim }}>
                    Ctrl+Enter also works
                  </p>
                </div>
              ) : resTab === "Body" ? (
                <>
                  {resp.body === "" || resp.body == null ? (
                    <div
                      style={{
                        background: t.codeBg,
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        padding: 16,
                      }}
                    >
                      <p
                        style={{
                          color: t.textDim,
                          fontSize: 13,
                          fontStyle: "italic",
                        }}
                      >
                        Empty response body
                      </p>
                    </div>
                  ) : resView === "html" && resp.isHtml ? (
                    <div
                      style={{
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        overflow: "hidden",
                        animation: "fade .2s ease",
                      }}
                    >
                      {/* HTML preview toolbar */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 12px",
                          background: t.card,
                          borderBottom: `1px solid ${t.border}`,
                        }}
                      >
                        <span style={{ fontSize: 11, color: t.textMuted }}>
                          ◈ Rendered HTML Preview
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 10,
                            color: t.textDim,
                            background: t.codeBg,
                            border: `1px solid ${t.border2}`,
                            borderRadius: 4,
                            padding: "2px 7px",
                          }}
                        >
                          sandboxed
                        </span>
                      </div>
                      <iframe
                        srcDoc={resp.raw}
                        sandbox="allow-same-origin allow-scripts"
                        style={{
                          width: "100%",
                          height: "480px",
                          border: "none",
                          background: "#fff",
                          display: "block",
                        }}
                        title="HTML Response Preview"
                      />
                    </div>
                  ) : resView === "pretty" && resp.isJson ? (
                    <div
                      style={{
                        background: t.codeBg,
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        padding: 16,
                        animation: "fade .2s ease",
                      }}
                    >
                      <Highlight code={resp.body} isDark={dark} />
                    </div>
                  ) : (
                    <div
                      style={{
                        background: t.codeBg,
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        padding: 16,
                        animation: "fade .2s ease",
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          fontFamily: "'Fira Code',monospace",
                          fontSize: 13,
                          color: t.text,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          lineHeight: 1.7,
                        }}
                      >
                        {resp.raw}
                      </pre>
                    </div>
                  )}
                </>
              ) : resTab === "Headers" ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    animation: "fade .2s ease",
                  }}
                >
                  {Object.keys(resp.headers || {}).length === 0 ? (
                    <p style={{ color: t.textDim, fontSize: 12 }}>
                      No headers returned.
                    </p>
                  ) : (
                    Object.entries(resp.headers).map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "7px 12px",
                          borderRadius: 5,
                          background: t.card,
                          borderLeft: `2px solid ${t.accent}`,
                        }}
                      >
                        <span
                          style={{
                            color: t.accent,
                            fontSize: 12,
                            fontFamily: "monospace",
                            minWidth: 180,
                            flexShrink: 0,
                          }}
                        >
                          {k}
                        </span>
                        <span
                          style={{
                            color: t.textMuted,
                            fontSize: 12,
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                          }}
                        >
                          {v}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    animation: "fade .2s ease",
                  }}
                >
                  {[
                    ["Method", resp.method],
                    ["Status Code", resp.status],
                    ["Status Text", resp.statusText],
                    ["Response Time", `${resp.time} ms`],
                    [
                      "Response Size",
                      resp.size != null
                        ? resp.size > 1024
                          ? (resp.size / 1024).toFixed(2) + " KB"
                          : resp.size + " B"
                        : "—",
                    ],
                    [
                      "Content Type",
                      resp.contentType || resp.headers?.["content-type"] || "—",
                    ],
                    [
                      "Body Format",
                      resp.isJson
                        ? "JSON (auto-detected)"
                        : resp.isHtml
                          ? "HTML (auto-detected)"
                          : "Plain text / other",
                    ],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        gap: 16,
                        padding: "10px 14px",
                        borderRadius: 6,
                        background: t.card,
                      }}
                    >
                      <span
                        style={{
                          color: t.textMuted,
                          fontSize: 12,
                          minWidth: 140,
                        }}
                      >
                        {k}
                      </span>
                      <span
                        style={{
                          color:
                            k === "Body Format" && resp.isJson
                              ? "#49cc90"
                              : t.text,
                          fontSize: 12,
                          fontFamily: "monospace",
                        }}
                      >
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
