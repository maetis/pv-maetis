import { useState, useRef, useCallback, useEffect } from "react";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

const T = {
  bg: "#F7F5F2", surface: "#FFFFFF", border: "#E2DDD8",
  accent: "#2A6049", accentLight: "#EAF2EE", accentDark: "#1A4030",
  text: "#1C1C1C", muted: "#7A7570", error: "#C0392B", errorLight: "#FDECEA",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600&family=DM+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { background: #F7F5F2; font-family: 'DM Sans', -apple-system, sans-serif; color: #1C1C1C; overscroll-behavior: none; }
  .app { min-height: 100dvh; max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; }
  .top-bar { background: #2A6049; padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 14px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 10; }
  .top-bar img { height: 30px; object-fit: contain; }
  .top-bar-sub { font-size: 11px; color: rgba(255,255,255,.7); margin-top: 1px; }
  .body { flex: 1; padding: 18px 16px 32px; }
  .steps { display: flex; margin-bottom: 22px; }
  .step { display: flex; align-items: center; flex: 1; }
  .s-dot { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .s-dot.done { background: #2A6049; color: #fff; }
  .s-dot.active { background: #EAF2EE; color: #2A6049; border: 2px solid #2A6049; }
  .s-dot.pending { background: #F7F5F2; color: #7A7570; border: 2px solid #E2DDD8; }
  .s-label { font-size: 10px; font-weight: 600; color: #7A7570; margin-left: 6px; }
  .s-line { flex: 1; height: 2px; background: #E2DDD8; margin: 0 4px; }
  .s-line.done { background: #2A6049; }
  .card { background: #FFFFFF; border: 1px solid #E2DDD8; border-radius: 14px; padding: 20px; margin-bottom: 14px; }
  .card-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #7A7570; margin-bottom: 14px; }
  .file-zone { border: 2px dashed #E2DDD8; border-radius: 12px; padding: 32px 20px; text-align: center; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .file-zone:active { background: #EAF2EE; border-color: #2A6049; }
  .file-zone-icon { font-size: 36px; margin-bottom: 10px; }
  .file-zone-label { font-size: 15px; font-weight: 600; }
  .file-zone-sub { font-size: 12px; color: #7A7570; margin-top: 4px; }
  .file-chosen { display: flex; align-items: center; gap: 12px; background: #EAF2EE; border-radius: 10px; padding: 12px 14px; margin-top: 12px; }
  .file-chosen-info { flex: 1; min-width: 0; }
  .file-chosen-name { font-size: 14px; font-weight: 600; color: #1A4030; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-chosen-size { font-size: 12px; color: #7A7570; margin-top: 2px; }
  .file-chosen-rm { background: none; border: none; font-size: 18px; color: #7A7570; padding: 6px; cursor: pointer; }
  .field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
  .field:last-child { margin-bottom: 0; }
  .field label { font-size: 10px; font-weight: 700; color: #7A7570; letter-spacing: .5px; text-transform: uppercase; }
  .field input { border: 1.5px solid #E2DDD8; border-radius: 10px; padding: 12px 13px; font-family: 'DM Sans', sans-serif; font-size: 16px; color: #1C1C1C; background: #F7F5F2; -webkit-appearance: none; }
  .field input:focus { outline: none; border-color: #2A6049; background: #fff; }
  .cta { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 17px; border: none; border-radius: 14px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700; background: #2A6049; color: #fff; margin-top: 6px; -webkit-tap-highlight-color: transparent; }
  .cta:active:not(:disabled) { transform: scale(.97); background: #1A4030; }
  .cta:disabled { opacity: .4; cursor: not-allowed; }
  .btn-sec { display: flex; align-items: center; justify-content: center; width: 100%; padding: 14px; border: 2px solid #2A6049; border-radius: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; background: transparent; color: #2A6049; margin-top: 10px; }
  .btn-sec:active { background: #EAF2EE; }
  .error-box { background: #FDECEA; border: 1px solid #f0b0a8; border-radius: 10px; padding: 12px 14px; color: #C0392B; font-size: 13px; margin-bottom: 12px; line-height: 1.5; }
  .prog-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .prog-status { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
  .prog-pct { font-size: 18px; font-weight: 700; color: #2A6049; }
  .prog-track { height: 7px; background: #EAF2EE; border-radius: 99px; overflow: hidden; margin-bottom: 14px; }
  .prog-bar { height: 100%; background: #2A6049; border-radius: 99px; transition: width .4s ease; }
  .seg-list { display: flex; flex-direction: column; gap: 7px; }
  .seg { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 9px; font-size: 13px; }
  .seg.done { background: #EAF2EE; color: #1A4030; }
  .seg.active { background: #fff; border: 1.5px solid #2A6049; }
  .seg.pending { background: #F7F5F2; color: #7A7570; }
  .seg-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .seg-dot.done { background: #2A6049; }
  .seg-dot.active { background: #2A6049; animation: pulse 1s infinite; }
  .seg-dot.pending { background: #E2DDD8; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }
  .spin { width: 16px; height: 16px; border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: rot .8s linear infinite; flex-shrink: 0; }
  .spin.dark { border-color: #E2DDD8; border-top-color: #2A6049; }
  @keyframes rot { to { transform: rotate(360deg); } }
  .pv-card { border-top: 4px solid #2A6049; }
  .pv-title { font-family: 'Lora', serif; font-size: 17px; font-weight: 600; margin-bottom: 3px; }
  .pv-sub { font-size: 12px; color: #7A7570; margin-bottom: 16px; }
  .pv-sec { margin-bottom: 16px; }
  .pv-sec-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #2A6049; border-bottom: 1px solid #EAF2EE; padding-bottom: 4px; margin-bottom: 8px; }
  .pv-sec p { font-size: 14px; line-height: 1.7; }
  .pv-list { list-style: none; padding: 0; }
  .pv-list li { font-size: 14px; line-height: 1.6; padding: 6px 0 6px 18px; position: relative; border-bottom: 1px solid #E2DDD8; }
  .pv-list li:last-child { border-bottom: none; }
  .pv-list li::before { content: "→"; position: absolute; left: 0; color: #2A6049; font-weight: 700; }
  .action-item { background: #F7F5F2; border-radius: 9px; padding: 11px 13px; margin-bottom: 7px; }
  .action-what { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
  .action-meta { font-size: 12px; color: #7A7570; display: flex; gap: 12px; flex-wrap: wrap; }
`;

const CHUNK_MB = 2;
function sliceFile(file) {
  const size = CHUNK_MB * 1024 * 1024;
  const overlap = Math.round(size * 0.05);
  const chunks = [];
  let start = 0;
  while (start < file.size) {
    const end = Math.min(start + size, file.size);
    chunks.push({ blob: file.slice(start, end), index: chunks.length, byteStart: start, byteEnd: end, status: "pending", text: "" });
    if (end >= file.size) break;
    start = end - overlap;
  }
  return chunks;
}

function fmtSize(b) { return b < 1048576 ? `${(b/1024).toFixed(0)} Ko` : `${(b/1048576).toFixed(1)} Mo`; }
function today() { return new Date().toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" }); }

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
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
  const mt = (mediaType && mediaType !== "application/octet-stream") ? mediaType : "audio/mp4";
  const prompt = `Transcris intégralement ce segment audio (partie ${chunk.index + 1}/${total}) en français. Reproduis fidèlement tout ce qui est dit sans résumer.`;
  return callClaude(
    [{ role: "user", content: [
      { type: "audio", source: { type: "base64", media_type: mt, data: b64 } },
      { type: "text", text: prompt },
    ]}],
    "Tu es un transcripteur professionnel. Reproduis fidèlement les paroles en français.",
    4000
  );
}

async function generatePV(transcript, meta) {
  const system = `Tu es un assistant spécialisé dans la rédaction de procès-verbaux pour l'Association Maétis. Réponds UNIQUEMENT en JSON valide sans markdown : {"resume":"...","decisions":["..."],"actions":[{"quoi":"...","qui":"...","quand":"..."}],"prochaine_seance":"... ou null"}`;
  const prompt = `Titre: ${meta.titre||"Non précisé"}\nDate: ${meta.date}\nLieu: ${meta.lieu||"Non précisé"}\nParticipants: ${meta.participants||"Non précisés"}\n\nTranscription:\n"""\n${transcript}\n"""\n\nGénère le PV en JSON.`;
  const raw = await callClaude([{ role: "user", content: prompt }], system, 2000);
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

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
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat } = window.docx;
  const bord = { top:{style:BorderStyle.SINGLE,size:1,color:"D5E8D4"}, bottom:{style:BorderStyle.SINGLE,size:1,color:"D5E8D4"}, left:{style:BorderStyle.NONE,size:0,color:"FFFFFF"}, right:{style:BorderStyle.NONE,size:0,color:"FFFFFF"} };
  const ch = [];
  ch.push(new Paragraph({spacing:{after:80},children:[new TextRun({text:"PROCÈS-VERBAL DE SÉANCE",font:"Arial",size:28,bold:true,color:"2A6049"})]}));
  if (meta.titre) ch.push(new Paragraph({spacing:{after:40},children:[new TextRun({text:meta.titre,font:"Arial",size:24,bold:true})]}));
  [[`Date : ${meta.date}`,meta.date],[`Lieu : ${meta.lieu}`,meta.lieu],[`Participants : ${meta.participants}`,meta.participants]].filter(([,v])=>v).forEach(([l])=>ch.push(new Paragraph({spacing:{after:20},children:[new TextRun({text:l,font:"Arial",size:20,color:"555555"})]})));
  ch.push(new Paragraph({spacing:{before:200,after:200},border:{bottom:{style:BorderStyle.SINGLE,size:6,color:"2A6049",space:1}},children:[]}));
  const head = t => new Paragraph({spacing:{before:280,after:100},children:[new TextRun({text:t.toUpperCase(),font:"Arial",size:20,bold:true,color:"2A6049"})]});
  ch.push(head("Résumé de la séance"));
  ch.push(new Paragraph({spacing:{after:60},children:[new TextRun({text:pv.resume,font:"Arial",size:20})]}));
  if (pv.decisions?.length) { ch.push(head("Décisions prises")); pv.decisions.forEach(d=>ch.push(new Paragraph({spacing:{after:40},numbering:{reference:"dec",level:0},children:[new TextRun({text:d,font:"Arial",size:20})]}))); }
  if (pv.actions?.length) {
    ch.push(head("Points d'action"));
    const tw=9026,c1=4513,c2=2256,c3=2257;
    const mkCell=(text,w,isH,shade)=>new TableCell({width:{size:w,type:WidthType.DXA},borders:bord,shading:{fill:shade,type:ShadingType.CLEAR},margins:{top:80,bottom:80,left:120,right:120},children:[new Paragraph({children:[new TextRun({text:text||"—",font:"Arial",size:18,bold:isH,color:isH?"FFFFFF":"1C1C1C"})]})]});
    ch.push(new Table({width:{size:tw,type:WidthType.DXA},columnWidths:[c1,c2,c3],rows:[new TableRow({children:[mkCell("Action",c1,true,"2A6049"),mkCell("Responsable",c2,true,"2A6049"),mkCell("Échéance",c3,true,"2A6049")]}), ...pv.actions.map((a,i)=>new TableRow({children:[mkCell(a.quoi,c1,false,i%2?"FFFFFF":"F0F7F0"),mkCell(a.qui,c2,false,i%2?"FFFFFF":"F0F7F0"),mkCell(a.quand,c3,false,i%2?"FFFFFF":"F0F7F0")]}))]}));
  }
  if (pv.prochaine_seance) { ch.push(head("Prochaine séance")); ch.push(new Paragraph({spacing:{after:60},children:[new TextRun({text:pv.prochaine_seance,font:"Arial",size:20})]})); }
  ch.push(new Paragraph({spacing:{before:400},border:{top:{style:BorderStyle.SINGLE,size:4,color:"CCCCCC",space:1}},children:[new TextRun({text:`Document généré le ${new Date().toLocaleDateString("fr-CH")} — Association Maétis`,font:"Arial",size:16,color:"999999",italics:true})]}));
  const doc = new Document({numbering:{config:[{reference:"dec",levels:[{level:0,format:LevelFormat.DECIMAL,text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:720,hanging:360}}}}]}]},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:ch}]});
  const buf = await Packer.toBuffer(doc);
  const blob = new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (meta.titre||"seance").toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
  const dp = (meta.date||today()).replace(/\//g,"-");
  a.href=url; a.download=`${dp}-PV-${slug}.docx`; a.click(); URL.revokeObjectURL(url);
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

export default function App() {
  const [file, setFile]     = useState(null);
  const [meta, setMeta]     = useState({ titre: "", date: today(), lieu: "", participants: "" });
  const [chunks, setChunks] = useState([]);
  const [pv, setPv]         = useState(null);
  const [phase, setPhase]   = useState("idle");
  const [progress, setPct]  = useState(0);
  const [statusMsg, setStat]= useState("");
  const [error, setError]   = useState("");
  const fileRef = useRef();

  const handleFile = useCallback((f) => {
    if (!f) return;
    const ok = f.type.startsWith("audio/") || f.type.startsWith("video/") || /\.(mp3|mp4|m4a|wav|ogg|webm|aac|caf)$/i.test(f.name);
    if (!ok) { setError("Format non reconnu. Essayez mp3, m4a ou wav."); return; }
    setError(""); setFile(f); setChunks([]); setPv(null); setPhase("idle"); setPct(0);
  }, []);

  useEffect(() => {
    if (!window.location.search.includes("s=1")) return;
    window.history.replaceState({}, "", "/");
    setTimeout(async () => {
      try {
        const resp = await fetch("/pending-audio");
        if (resp.ok) {
          const blob = await resp.blob();
          const name = decodeURIComponent(resp.headers.get("X-Name") || "enregistrement.m4a");
          const type = resp.headers.get("Content-Type") || "audio/mp4";
          handleFile(new File([blob], name, { type }));
        }
      } catch(e) { console.warn("share read error", e); }
    }, 1000);
  }, [handleFile]);

  const upd = k => e => setMeta(m => ({ ...m, [k]: e.target.value }));
  const reset = () => { setFile(null); setChunks([]); setPv(null); setPhase("idle"); setError(""); setPct(0); };

  const handleGenerate = async () => {
    setError(""); setChunks([]); setPv(null); setPct(0);
    try {
      setStat("Découpage…"); setPhase("transcribing");
      const raw = sliceFile(file);
      setChunks(raw); setPct(3);
      const texts = [];
      for (let i = 0; i < raw.length; i++) {
        setChunks(prev => prev.map((c, j) => ({ ...c, status: j === i ? "active" : j < i ? "done" : "pending" })));
        setStat(`Transcription ${i + 1} / ${raw.length}…`);
        const text = await transcribeChunk(raw[i], file.type, raw.length);
        texts.push(text);
        setChunks(prev => prev.map((c, j) => j === i ? { ...c, status: "done", text } : c));
        setPct(3 + Math.round(((i + 1) / raw.length) * 77));
      }
      setPct(82); setPhase("generating"); setStat("Génération du PV…");
      const pvData = await generatePV(texts.join("\n\n"), meta);
      setPv(pvData); setPhase("done"); setPct(100);
    } catch (e) {
      setError(e.message || "Une erreur est survenue."); setPhase("error");
    }
  };

  const isProcessing = ["transcribing", "generating"].includes(phase);
  const stepsIdx = pv ? 2 : isProcessing ? 1 : 0;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="top-bar">
          <img src="/logo-maetis-blanc.png" alt="Maétis" />
          <div className="top-bar-sub">Procès-verbal automatique</div>
        </div>
        <div className="body">
          <Steps current={stepsIdx} />
          {error && <div className="error-box">⚠️ {error}</div>}

          {!pv && <>
            <div className="card">
              <div className="card-label">1 — Enregistrement</div>
              <div className="file-zone" onClick={() => !isProcessing && fileRef.current.click()}>
                <div className="file-zone-icon">🎙️</div>
                <div className="file-zone-label">Choisir un enregistrement</div>
                <div className="file-zone-sub">mp3, m4a, wav · toute durée</div>
              </div>
              <input ref={fileRef} type="file" accept="audio/*,video/*,.m4a,.mp3,.wav,.ogg,.aac,.caf"
                style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              {file && (
                <div className="file-chosen">
                  <span style={{ fontSize: 24 }}>🎵</span>
                  <div className="file-chosen-info">
                    <div className="file-chosen-name">{file.name}</div>
                    <div className="file-chosen-size">{fmtSize(file.size)} · {Math.ceil(file.size / (CHUNK_MB * 1048576))} segment{Math.ceil(file.size / (CHUNK_MB * 1048576)) > 1 ? "s" : ""}</div>
                  </div>
                  <button className="file-chosen-rm" onClick={e => { e.stopPropagation(); reset(); }}>✕</button>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-label">2 — Informations</div>
              <div className="field"><label>Objet de la séance</label><input placeholder="ex. Réunion équipe CAP" value={meta.titre} onChange={upd("titre")} disabled={isProcessing} /></div>
              <div className="field"><label>Date</label><input value={meta.date} onChange={upd("date")} disabled={isProcessing} /></div>
              <div className="field"><label>Lieu</label><input placeholder="ex. Saint-Pierre-de-Clages" value={meta.lieu} onChange={upd("lieu")} disabled={isProcessing} /></div>
              <div className="field"><label>Participants</label><input placeholder="ex. Xavier P., Sandrine C." value={meta.participants} onChange={upd("participants")} disabled={isProcessing} /></div>
            </div>
          </>}

          {isProcessing && (
            <div className="card">
              <div className="card-label">Traitement</div>
              <div className="prog-header">
                <span className="prog-status"><div className="spin dark" />{statusMsg}</span>
                <span className="prog-pct">{progress}%</span>
              </div>
              <div className="prog-track"><div className="prog-bar" style={{ width: `${progress}%` }} /></div>
              {chunks.length > 1 && (
                <div className="seg-list">
                  {chunks.map((c, i) => (
                    <div key={i} className={`seg ${c.status}`}>
                      <div className={`seg-dot ${c.status}`} />
                      <span>Segment {i + 1}</span>
                      {c.status === "done" && <span style={{ marginLeft: "auto", fontSize: 11, color: "#2A6049" }}>✓</span>}
                      {c.status === "active" && <div className="spin dark" style={{ marginLeft: "auto" }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!pv && (
            <button className="cta" disabled={!file || isProcessing} onClick={handleGenerate}>
              {isProcessing ? <><div className="spin" />{phase === "generating" ? "Génération…" : "Transcription…"}</> : "Générer le procès-verbal →"}
            </button>
          )}

          {pv && (
            <div className="card pv-card">
              <div className="card-label" style={{ marginBottom: 6 }}>Procès-verbal</div>
              <div className="pv-title">{meta.titre || "Séance"}</div>
              {(meta.date || meta.lieu) && <div className="pv-sub">{[meta.date, meta.lieu].filter(Boolean).join(" · ")}</div>}

              {pv.resume && <div className="pv-sec"><div className="pv-sec-label">Résumé</div><p>{pv.resume}</p></div>}

              {pv.decisions?.length > 0 && (
                <div className="pv-sec">
                  <div className="pv-sec-label">Décisions</div>
                  <ul className="pv-list">{pv.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </div>
              )}

              {pv.actions?.length > 0 && (
                <div className="pv-sec">
                  <div className="pv-sec-label">Points d'action</div>
                  {pv.actions.map((a, i) => (
                    <div key={i} className="action-item">
                      <div className="action-what">{a.quoi}</div>
                      <div className="action-meta">
                        {a.qui && <span>👤 {a.qui}</span>}
                        {a.quand && <span>📅 {a.quand}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pv.prochaine_seance && <div className="pv-sec"><div className="pv-sec-label">Prochaine séance</div><p>{pv.prochaine_seance}</p></div>}

              <button className="cta" onClick={() => downloadDocx(pv, meta)}>⬇️ Télécharger le PV (.docx)</button>
              <button className="btn-sec" onClick={reset}>Nouvelle séance</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
