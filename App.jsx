import { useState, useRef, useCallback, useEffect } from "react";

// ── PWA manifest injection ────────────────────────────────────────────────────
// Injecté dynamiquement pour permettre "Ajouter à l'écran d'accueil"
function injectPWA() {
  if (document.getElementById("pwa-manifest")) return;

  // Service worker statique — gère aussi le share target Android
  navigator.serviceWorker?.register("/sw.js").catch(() => {});

  // Manifest
  const manifest = {
    name: "PV Maétis",
    short_name: "PV Maétis",
    description: "Transcription et procès-verbal de séance",
    start_url: "./",
    display: "standalone",
    background_color: "#F7F5F2",
    theme_color: "#2A6049",
    orientation: "portrait",
    icons: [
      { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='32' fill='%232A6049'/%3E%3Ctext x='96' y='130' font-size='100' text-anchor='middle' fill='white'%3E%F0%9F%93%9D%3C/text%3E%3C/svg%3E", sizes: "192x192", type: "image/svg+xml" },
    ],
  };
  const mBlob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
  const mUrl  = URL.createObjectURL(mBlob);
  const link  = document.createElement("link");
  link.id = "pwa-manifest"; link.rel = "manifest"; link.href = mUrl;
  document.head.appendChild(link);

  // iOS meta tags
  const metas = [
    ["apple-mobile-web-app-capable",          "yes"],
    ["apple-mobile-web-app-status-bar-style", "black-translucent"],
    ["apple-mobile-web-app-title",            "PV Maétis"],
    ["theme-color",                           "#2A6049"],
    ["viewport",                              "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"],
  ];
  metas.forEach(([name, content]) => {
    const m = document.createElement("meta");
    m.name = name; m.content = content;
    document.head.appendChild(m);
  });
}

// ── Palette ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#F7F5F2", surface: "#FFFFFF", border: "#E2DDD8",
  accent: "#2A6049", accentLight: "#EAF2EE", accentDark: "#1A4030",
  text: "#1C1C1C", muted: "#7A7570", error: "#C0392B", errorLight: "#FDECEA",
  success: "#1E7D4F",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    background: ${T.bg};
    font-family: 'DM Sans', -apple-system, sans-serif;
    color: ${T.text};
    /* Prevent overscroll bounce on iOS */
    overscroll-behavior: none;
  }

  .app {
    min-height: 100dvh;
    padding: 0 0 env(safe-area-inset-bottom, 24px);
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .top-bar {
    background: ${T.accent};
    color: #fff;
    padding: 16px 20px calc(16px + env(safe-area-inset-top, 0px));
    padding-top: calc(env(safe-area-inset-top, 16px) + 16px);
    display: flex;
    align-items: center;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .top-bar-icon { font-size: 22px; }
  .top-bar-title { font-family: 'Lora', serif; font-size: 18px; font-weight: 600; }
  .top-bar-sub { font-size: 11px; opacity: .7; margin-top: 1px; }

  /* ── Install banner ── */
  .install-banner {
    background: ${T.accentDark};
    color: #fff;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    gap: 10px;
  }
  .install-banner-btn {
    background: #fff;
    color: ${T.accentDark};
    border: none;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
  }

  /* ── Scroll content ── */
  .scroll-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px 32px;
    -webkit-overflow-scrolling: touch;
  }

  /* ── Cards ── */
  .card {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 14px;
  }
  .card-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: ${T.muted};
    margin-bottom: 14px;
  }

  /* ── File picker ── */
  .file-tap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 2px dashed ${T.border};
    border-radius: 14px;
    padding: 36px 20px;
    cursor: pointer;
    transition: all .2s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .file-tap:active { background: ${T.accentLight}; border-color: ${T.accent}; }
  .file-tap-icon { font-size: 40px; }
  .file-tap-label { font-size: 16px; font-weight: 600; color: ${T.text}; }
  .file-tap-sub { font-size: 13px; color: ${T.muted}; text-align: center; }

  .file-chosen {
    display: flex;
    align-items: center;
    gap: 14px;
    background: ${T.accentLight};
    border-radius: 12px;
    padding: 14px 16px;
    margin-top: 14px;
  }
  .file-chosen-icon { font-size: 28px; flex-shrink: 0; }
  .file-chosen-info { flex: 1; min-width: 0; }
  .file-chosen-name { font-size: 14px; font-weight: 600; color: ${T.accentDark}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-chosen-size { font-size: 12px; color: ${T.muted}; margin-top: 2px; }
  .file-chosen-rm { background: none; border: none; font-size: 18px; color: ${T.muted}; padding: 8px; cursor: pointer; -webkit-tap-highlight-color: transparent; }

  /* ── Fields ── */
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .field:last-child { margin-bottom: 0; }
  .field label { font-size: 11px; font-weight: 700; color: ${T.muted}; letter-spacing: .5px; text-transform: uppercase; }
  .field input {
    border: 1.5px solid ${T.border};
    border-radius: 10px;
    padding: 13px 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 16px; /* Prevents iOS zoom on focus */
    color: ${T.text};
    background: ${T.bg};
    -webkit-appearance: none;
    appearance: none;
    transition: border-color .15s;
  }
  .field input:focus { outline: none; border-color: ${T.accent}; background: #fff; }

  /* ── Big CTA ── */
  .cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 18px;
    border: none;
    border-radius: 16px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 17px;
    font-weight: 700;
    background: ${T.accent};
    color: #fff;
    transition: all .15s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    margin-top: 6px;
  }
  .cta:active:not(:disabled) { transform: scale(.97); background: ${T.accentDark}; }
  .cta:disabled { opacity: .4; cursor: not-allowed; }

  .btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 15px;
    border: 2px solid ${T.accent};
    border-radius: 14px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 600;
    background: transparent;
    color: ${T.accent};
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    margin-top: 10px;
  }
  .btn-secondary:active { background: ${T.accentLight}; }

  /* ── Progress ── */
  .progress-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
  .progress-status { font-size: 14px; color: ${T.text}; font-weight: 500; }
  .progress-pct { font-size: 20px; font-weight: 700; color: ${T.accent}; }
  .progress-track { height: 8px; background: ${T.accentLight}; border-radius: 99px; overflow: hidden; margin-bottom: 16px; }
  .progress-bar { height: 100%; background: ${T.accent}; border-radius: 99px; transition: width .5s ease; }

  .seg-list { display: flex; flex-direction: column; gap: 8px; }
  .seg { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; font-size: 14px; }
  .seg.done    { background: ${T.accentLight}; color: ${T.accentDark}; }
  .seg.active  { background: #fff; border: 1.5px solid ${T.accent}; color: ${T.text}; }
  .seg.pending { background: ${T.bg}; color: ${T.muted}; }
  .seg-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .seg-dot.done    { background: ${T.accent}; }
  .seg-dot.active  { background: ${T.accent}; animation: pulse 1s infinite; }
  .seg-dot.pending { background: ${T.border}; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
  .seg-time { flex: 1; font-variant-numeric: tabular-nums; }
  .seg-badge { font-size: 11px; font-weight: 600; }

  /* ── Spinner ── */
  .spin { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: rotate .8s linear infinite; flex-shrink: 0; }
  .spin.dark { border-color: ${T.border}; border-top-color: ${T.accent}; }
  @keyframes rotate { to { transform: rotate(360deg); } }

  /* ── Error ── */
  .error-box { background: ${T.errorLight}; border: 1px solid #f5b8b0; border-radius: 12px; padding: 14px 16px; color: ${T.error}; font-size: 14px; margin-bottom: 14px; line-height: 1.5; }

  /* ── Transcript ── */
  .tx-box { background: ${T.bg}; border: 1px solid ${T.border}; border-radius: 10px; padding: 14px; font-size: 14px; line-height: 1.8; max-height: 180px; overflow-y: auto; white-space: pre-wrap; -webkit-overflow-scrolling: touch; }

  /* ── PV ── */
  .pv-card { border-top: 4px solid ${T.accent}; }
  .pv-head { margin-bottom: 18px; }
  .pv-title { font-family: 'Lora', serif; font-size: 17px; font-weight: 600; }
  .pv-sub { font-size: 13px; color: ${T.muted}; margin-top: 3px; }
  .pv-section { margin-bottom: 18px; }
  .pv-section-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${T.accent}; border-bottom: 1px solid ${T.accentLight}; padding-bottom: 5px; margin-bottom: 10px; }
  .pv-section p { font-size: 14px; line-height: 1.7; }
  .pv-list { list-style: none; padding: 0; }
  .pv-list li { font-size: 14px; line-height: 1.6; padding: 6px 0 6px 20px; position: relative; border-bottom: 1px solid ${T.border}; }
  .pv-list li:last-child { border-bottom: none; }
  .pv-list li::before { content: "→"; position: absolute; left: 0; color: ${T.accent}; font-weight: 700; }
  .action-item { background: ${T.bg}; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
  .action-what { font-size: 14px; font-weight: 500; margin-bottom: 5px; }
  .action-meta { font-size: 12px; color: ${T.muted}; display: flex; gap: 14px; flex-wrap: wrap; }
  .action-meta span::before { margin-right: 4px; }

  .dl-btn {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; padding: 18px; border: none; border-radius: 16px; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 700;
    background: ${T.accent}; color: #fff; margin-top: 6px;
    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  }
  .dl-btn:active { transform: scale(.97); background: ${T.accentDark}; }

  /* ── Step dots ── */
  .steps { display: flex; align-items: center; margin-bottom: 22px; gap: 0; }
  .step { display: flex; align-items: center; flex: 1; }
  .s-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .s-dot.done    { background: ${T.accent}; color: #fff; }
  .s-dot.active  { background: ${T.accentLight}; color: ${T.accent}; border: 2px solid ${T.accent}; }
  .s-dot.pending { background: ${T.bg}; color: ${T.muted}; border: 2px solid ${T.border}; }
  .s-label { font-size: 10px; font-weight: 600; color: ${T.muted}; margin-left: 6px; }
  .s-line { flex: 1; height: 2px; background: ${T.border}; margin: 0 4px; }
  .s-line.done { background: ${T.accent}; }

  @media (max-width: 360px) { .s-label { display: none; } }
`;

// ── Chunking : découpage BINAIRE (pas d'AudioContext) ────────────────────────
// On découpe le fichier brut en tranches d'octets de ~CHUNK_MB Mo.
// L'API Claude accepte les fichiers audio sans décodage préalable.
// Avantage : zéro pic mémoire, fonctionne sur tous les appareils mobiles.

const CHUNK_MB = 2; // base64 augmente de ~33% donc 2 Mo binaire → ~2.7 Mo → sous la limite Vercel Edge

function sliceFile(file) {
  const chunkBytes = CHUNK_MB * 1024 * 1024;
  const total      = file.size;
  const chunks     = [];
  // Chevauchement : 5% de la taille d'un chunk (évite les coupures nettes)
  const overlap    = Math.round(chunkBytes * 0.05);
  let start = 0;
  while (start < total) {
    const end = Math.min(start + chunkBytes, total);
    chunks.push({ blob: file.slice(start, end), byteStart: start, byteEnd: end, index: chunks.length, status: "pending", text: "" });
    if (end >= total) break;
    start = end - overlap;
  }
  return chunks;
}

function fmtSize(b) {
  if (b < 1024)        return `${b} o`;
  if (b < 1048576)     return `${(b / 1024).toFixed(0)} Ko`;
  return `${(b / 1048576).toFixed(1)} Mo`;
}

function fmtChunkLabel(c, total) {
  const pct = (i) => Math.round((i / total) * 100);
  return `Segment ${c.index + 1} — ${pct(c.byteStart)}% → ${pct(c.byteEnd)}%`;
}

// ── API Claude ────────────────────────────────────────────────────────────────

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

async function callClaude(messages, system, maxTokens = 1000) {
  const resp = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system, messages }),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    throw new Error(e?.error?.message || `Erreur API (${resp.status})`);
  }
  const d = await resp.json();
  return d.content.filter(b => b.type === "text").map(b => b.text).join("");
}

async function transcribeChunk(chunk, mediaType, total) {
  const b64 = await blobToBase64(chunk.blob);
  const mt  = mediaType || "audio/mpeg";
  const prompt = `Transcris intégralement ce segment audio (partie ${chunk.index + 1}/${total}) en français. Reproduis fidèlement tout ce qui est dit. Ne commence pas par une phrase d'introduction. Si la parole est coupée en début ou fin de segment, transcris quand même ce qui est audible.`;
  return callClaude(
    [{ role: "user", content: [
      { type: "audio", source: { type: "base64", media_type: mt, data: b64 } },
      { type: "text", text: prompt },
    ]}],
    "Tu es un transcripteur professionnel. Reproduis fidèlement les paroles en français, sans résumé ni introduction.",
    4000
  );
}

async function generatePV(transcript, meta) {
  const system = `Tu es un assistant spécialisé dans la rédaction de procès-verbaux pour l'Association Maétis (éducation spécialisée, Suisse romande). Tu rédiges des PV clairs, professionnels et sobres en français institutionnel. Réponds UNIQUEMENT en JSON valide (sans markdown, sans backticks) avec cette structure exacte : {"resume":"...","decisions":["..."],"actions":[{"quoi":"...","qui":"...","quand":"..."}],"prochaine_seance":"... ou null"}`;
  const prompt  = `Métadonnées :\n- Titre : ${meta.titre || "Non précisé"}\n- Date : ${meta.date || "Non précisée"}\n- Lieu : ${meta.lieu || "Non précisé"}\n- Participants : ${meta.participants || "Non précisés"}\n\nTranscription complète :\n"""\n${transcript}\n"""\n\nGénère le PV en JSON.`;
  const raw = await callClaude([{ role: "user", content: prompt }], system, 2000);
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// ── DOCX ─────────────────────────────────────────────────────────────────────

async function downloadDocx(pv, meta) {
  if (!window.__docxLoaded) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/docx@8.5.0/build/index.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    window.__docxLoaded = true;
  }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat } = window.docx;
  const bord = {
    top:    { style: BorderStyle.SINGLE, size: 1, color: "D5E8D4" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "D5E8D4" },
    left:   { style: BorderStyle.NONE,   size: 0, color: "FFFFFF" },
    right:  { style: BorderStyle.NONE,   size: 0, color: "FFFFFF" },
  };
  const ch = [];
  ch.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "PROCÈS-VERBAL DE SÉANCE", font: "Arial", size: 28, bold: true, color: "2A6049" })] }));
  if (meta.titre) ch.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: meta.titre, font: "Arial", size: 24, bold: true })] }));
  [[`Date : ${meta.date}`, meta.date],[`Lieu : ${meta.lieu}`, meta.lieu],[`Participants : ${meta.participants}`, meta.participants]]
    .filter(([,v]) => v)
    .forEach(([l]) => ch.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: l, font: "Arial", size: 20, color: "555555" })] })));
  ch.push(new Paragraph({ spacing: { before: 200, after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2A6049", space: 1 } }, children: [] }));
  const head = t => new Paragraph({ spacing: { before: 280, after: 100 }, children: [new TextRun({ text: t.toUpperCase(), font: "Arial", size: 20, bold: true, color: "2A6049" })] });
  ch.push(head("Résumé de la séance"));
  ch.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: pv.resume, font: "Arial", size: 20 })] }));
  if (pv.decisions?.length) {
    ch.push(head("Décisions prises"));
    pv.decisions.forEach(d => ch.push(new Paragraph({ spacing: { after: 40 }, numbering: { reference: "dec", level: 0 }, children: [new TextRun({ text: d, font: "Arial", size: 20 })] })));
  }
  if (pv.actions?.length) {
    ch.push(head("Points d'action"));
    const tw=9026,c1=4513,c2=2256,c3=2257;
    const mkCell = (text,w,isH,shade) => new TableCell({ width:{size:w,type:WidthType.DXA}, borders:bord, shading:{fill:shade,type:ShadingType.CLEAR}, margins:{top:80,bottom:80,left:120,right:120}, children:[new Paragraph({children:[new TextRun({text:text||"—",font:"Arial",size:18,bold:isH,color:isH?"FFFFFF":"1C1C1C"})]})] });
    ch.push(new Table({ width:{size:tw,type:WidthType.DXA}, columnWidths:[c1,c2,c3], rows:[
      new TableRow({children:[mkCell("Action",c1,true,"2A6049"),mkCell("Responsable",c2,true,"2A6049"),mkCell("Échéance",c3,true,"2A6049")]}),
      ...pv.actions.map((a,i)=>new TableRow({children:[mkCell(a.quoi,c1,false,i%2?"FFFFFF":"F0F7F0"),mkCell(a.qui,c2,false,i%2?"FFFFFF":"F0F7F0"),mkCell(a.quand,c3,false,i%2?"FFFFFF":"F0F7F0")]}))
    ]}));
  }
  if (pv.prochaine_seance) { ch.push(head("Prochaine séance")); ch.push(new Paragraph({spacing:{after:60},children:[new TextRun({text:pv.prochaine_seance,font:"Arial",size:20})]})); }
  ch.push(new Paragraph({spacing:{before:400},border:{top:{style:BorderStyle.SINGLE,size:4,color:"CCCCCC",space:1}},children:[new TextRun({text:`Document généré le ${new Date().toLocaleDateString("fr-CH")} — Association Maétis`,font:"Arial",size:16,color:"999999",italics:true})]}));
  const doc = new Document({
    numbering:{config:[{reference:"dec",levels:[{level:0,format:LevelFormat.DECIMAL,text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]}]},
    sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:ch}],
  });
  const buf  = await Packer.toBuffer(doc);
  const blob = new Blob([buf], {type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const slug = (meta.titre||"seance").toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
  const dp   = (meta.date||new Date().toLocaleDateString("fr-CH")).replace(/\//g,"-");
  a.href = url; a.download = `${dp}-PV-${slug}.docx`; a.click();
  URL.revokeObjectURL(url);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  return new Date().toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Steps({ current }) {
  const labels = ["Fichier", "Transcription", "PV"];
  return (
    <div className="steps">
      {labels.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <div key={s} className="step">
            <div className={`s-dot ${state}`}>{state === "done" ? "✓" : i + 1}</div>
            <span className="s-label">{s}</span>
            {i < labels.length - 1 && <div className={`s-line ${i < current ? "done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [file, setFile]     = useState(null);
  const [meta, setMeta]     = useState({ titre: "", date: today(), lieu: "", participants: "" });
  const [chunks, setChunks] = useState([]);
  const [transcript, setTx] = useState("");
  const [pv, setPv]         = useState(null);
  const [phase, setPhase]   = useState("idle"); // idle|transcribing|generating|done|error
  const [progress, setPct]  = useState(0);
  const [statusMsg, setStat]= useState("");
  const [error, setError]   = useState("");
  const [installEvt, setInstallEvt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    injectPWA();

    // ── Share Target : récupérer le fichier audio via fetch /shared-audio
    const readSharedAudio = async () => {
      try {
        // Le SW expose /shared-audio comme endpoint
        const response = await fetch("/shared-audio");
        if (response.ok) {
          const blob = await response.blob();
          const name = decodeURIComponent(response.headers.get("X-File-Name") || "enregistrement.m4a");
          const type = response.headers.get("Content-Type") || "audio/mpeg";
          const file = new File([blob], name, { type });
          handleFile(file);
          window.history.replaceState({}, "", "/");
        }
      } catch (e) {
        console.warn("Share target error:", e);
      }
    };

    // Déclenchement via paramètre URL (?shared=1) après redirection du SW
    if (window.location.search.includes("shared=1")) {
      // Délai pour laisser le SW s'activer
      setTimeout(readSharedAudio, 500);
    }

    // Pas de postMessage nécessaire avec cette approche
    const onMessage = (e) => {};
    navigator.serviceWorker?.addEventListener("message", onMessage);

    // Capture beforeinstallprompt (Android Chrome)
    const handler = (e) => { e.preventDefault(); setInstallEvt(e); setShowInstall(true); };
    window.addEventListener("beforeinstallprompt", handler);
    // iOS : afficher banner si pas en standalone
    if (window.navigator.standalone === false) setShowInstall(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  const handleInstall = async () => {
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice; }
    setShowInstall(false);
  };

  const handleFile = useCallback((f) => {
    if (!f) return;
    const ok = f.type.startsWith("audio/") || f.type.startsWith("video/") || /\.(mp3|mp4|m4a|wav|ogg|webm|aac|caf)$/i.test(f.name);
    if (!ok) { setError("Format non reconnu. Essayez mp3, m4a ou wav."); return; }
    setError(""); setFile(f); setChunks([]); setTx(""); setPv(null); setPhase("idle"); setPct(0);
  }, []);

  const upd  = k => e => setMeta(m => ({ ...m, [k]: e.target.value }));
  const reset = () => { setFile(null); setChunks([]); setTx(""); setPv(null); setPhase("idle"); setError(""); setPct(0); };

  const handleGenerate = async () => {
    if (!file) return;
    setError(""); setChunks([]); setTx(""); setPv(null); setPct(0);
    try {
      // 1. Slice (synchrone, instantané)
      setStat("Préparation des segments…"); setPhase("transcribing");
      const rawChunks = sliceFile(file);
      setChunks(rawChunks);
      setPct(3);

      // 2. Transcribe segments
      const texts = [];
      for (let i = 0; i < rawChunks.length; i++) {
        setChunks(prev => prev.map((c, j) => ({ ...c, status: j === i ? "active" : j < i ? "done" : "pending" })));
        setStat(`Transcription du segment ${i + 1} sur ${rawChunks.length}…`);
        const text = await transcribeChunk(rawChunks[i], file.type, rawChunks.length);
        texts.push(text);
        setChunks(prev => prev.map((c, j) => j === i ? { ...c, status: "done", text } : c));
        setPct(3 + Math.round(((i + 1) / rawChunks.length) * 77));
      }

      const full = texts.join("\n\n");
      setTx(full);
      setPct(82);

      // 3. Generate PV
      setPhase("generating"); setStat("Génération du procès-verbal…");
      const pvData = await generatePV(full, meta);
      setPv(pvData); setPhase("done"); setPct(100);
    } catch (e) {
      setError(e.message || "Une erreur est survenue."); setPhase("error");
    }
  };

  const handleDownload = async () => {
    setError("");
    try { await downloadDocx(pv, meta); }
    catch (e) { setError("Erreur génération .docx : " + e.message); }
  };

  const isProcessing = ["transcribing", "generating"].includes(phase);
  const stepsIdx = pv ? 2 : isProcessing ? 1 : 0;

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* Top bar */}
        <div className="top-bar">
          <img src="/logo-maetis-blanc.png" alt="Maétis" style={{height:32,maxWidth:160,objectFit:"contain"}} />
          <div>
            <div className="top-bar-sub" style={{opacity:.75,fontSize:11,marginTop:2}}>Procès-verbal automatique</div>
          </div>
        </div>

        {/* Install banner */}
        {showInstall && (
          <div className="install-banner">
            <span style={{display:"flex",alignItems:"center",gap:8}}><img src="/logo-maetis.png" alt="" style={{width:22,height:22,objectFit:"contain",filter:"brightness(0) invert(1)",opacity:.85}} /> Installer l'app sur cet appareil</span>
            {installEvt
              ? <button className="install-banner-btn" onClick={handleInstall}>Installer</button>
              : <button className="install-banner-btn" onClick={() => setShowInstall(false)}>
                  {/iPad|iPhone/.test(navigator.userAgent) ? "Partager → Écran d'accueil" : "OK"}
                </button>
            }
          </div>
        )}

        <div className="scroll-body">
          <Steps current={stepsIdx} />

          {error && <div className="error-box">⚠️ {error}</div>}

          {/* ── Fichier ── */}
          {!pv && (
            <div className="card">
              <div className="card-label">1 — Enregistrement</div>
              <div className="file-tap" onClick={() => !isProcessing && fileRef.current.click()}>
                <div className="file-tap-icon">🎙️</div>
                <div className="file-tap-label">Choisir un enregistrement</div>
                <div className="file-tap-sub">Fichiers audio de l'app native · mp3, m4a, wav, ogg</div>
              </div>
              <input ref={fileRef} type="file" accept="audio/*,video/*,.caf,.m4a,.mp3,.wav,.ogg,.webm,.aac"
                style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              {file && (
                <div className="file-chosen">
                  <span className="file-chosen-icon">🎵</span>
                  <div className="file-chosen-info">
                    <div className="file-chosen-name">{file.name}</div>
                    <div className="file-chosen-size">{fmtSize(file.size)} · {Math.ceil(file.size / (CHUNK_MB * 1024 * 1024))} segment{Math.ceil(file.size / (CHUNK_MB * 1024 * 1024)) > 1 ? "s" : ""}</div>
                  </div>
                  <button className="file-chosen-rm" onClick={e => { e.stopPropagation(); reset(); }}>✕</button>
                </div>
              )}
            </div>
          )}

          {/* ── Méta ── */}
          {!pv && (
            <div className="card">
              <div className="card-label">2 — Informations</div>
              <div className="field">
                <label>Objet de la séance</label>
                <input placeholder="ex. Réunion équipe CAP – juin 2026" value={meta.titre} onChange={upd("titre")} disabled={isProcessing} />
              </div>
              <div className="field">
                <label>Date</label>
                <input placeholder="ex. 30.05.2026" value={meta.date} onChange={upd("date")} disabled={isProcessing} />
              </div>
              <div className="field">
                <label>Lieu</label>
                <input placeholder="ex. Saint-Pierre-de-Clages" value={meta.lieu} onChange={upd("lieu")} disabled={isProcessing} />
              </div>
              <div className="field">
                <label>Participants</label>
                <input placeholder="ex. Xavier P., Sandrine C." value={meta.participants} onChange={upd("participants")} disabled={isProcessing} />
              </div>
            </div>
          )}

          {/* ── Progress ── */}
          {isProcessing && (
            <div className="card">
              <div className="card-label">Traitement</div>
              <div className="progress-header">
                <span className="progress-status">{statusMsg}</span>
                <span className="progress-pct">{progress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
              {chunks.length > 1 && (
                <div className="seg-list">
                  {chunks.map((c, i) => (
                    <div key={i} className={`seg ${c.status}`}>
                      <div className={`seg-dot ${c.status}`} />
                      <span className="seg-time">{fmtChunkLabel(c, file.size)}</span>
                      {c.status === "done"   && <span className="seg-badge" style={{ color: T.accent }}>✓</span>}
                      {c.status === "active" && <div className="spin dark" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CTA ── */}
          {!pv && (
            <button className="cta" disabled={!file || isProcessing} onClick={handleGenerate}>
              {isProcessing
                ? <><div className="spin" />{phase === "generating" ? "Génération du PV…" : "Transcription…"}</>
                : "Générer le procès-verbal →"}
            </button>
          )}

          {/* ── Transcription preview ── */}
          {transcript && !pv && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-label">Transcription ({chunks.length} segment{chunks.length > 1 ? "s" : ""})</div>
              <div className="tx-box">{transcript}</div>
            </div>
          )}

          {/* ── PV ── */}
          {pv && (
            <div className="card pv-card">
              <div className="pv-head">
                <div className="card-label" style={{ marginBottom: 6 }}>Procès-verbal</div>
                <div className="pv-title">{meta.titre || "Séance"}</div>
                {(meta.date || meta.lieu) && (
                  <div className="pv-sub">{[meta.date, meta.lieu].filter(Boolean).join(" · ")}</div>
                )}
              </div>

              {pv.resume && (
                <div className="pv-section">
                  <div className="pv-section-label">Résumé</div>
                  <p>{pv.resume}</p>
                </div>
              )}

              {pv.decisions?.length > 0 && (
                <div className="pv-section">
                  <div className="pv-section-label">Décisions</div>
                  <ul className="pv-list">{pv.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </div>
              )}

              {pv.actions?.length > 0 && (
                <div className="pv-section">
                  <div className="pv-section-label">Points d'action</div>
                  {pv.actions.map((a, i) => (
                    <div key={i} className="action-item">
                      <div className="action-what">{a.quoi}</div>
                      <div className="action-meta">
                        {a.qui   && <span>👤 {a.qui}</span>}
                        {a.quand && <span>📅 {a.quand}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pv.prochaine_seance && (
                <div className="pv-section">
                  <div className="pv-section-label">Prochaine séance</div>
                  <p>{pv.prochaine_seance}</p>
                </div>
              )}

              <button className="dl-btn" onClick={handleDownload}>⬇️ Télécharger le PV (.docx)</button>
              <button className="btn-secondary" onClick={reset}>Nouvelle séance</button>
            </div>
          )}

        </div>{/* scroll-body */}
      </div>
    </>
  );
}
