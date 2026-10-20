const SPEAKER_LINE = /^\s*(?:\[)?(?:speaker|spk)[\s_]*0*(\d+)(?:\])?\s*[:\-–—]\s*(.*)$/i;

export function speakerLabelFrom(raw) {
  const match = String(raw ?? "").match(/(?:speaker|spk)?[\s_]*0*(\d+)/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 1 || n > 99) return null;
  return `Speaker ${n}`;
}

export function parseTranscriptText(text) {
  const blocks = [];
  let sawSpeaker = false;
  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(SPEAKER_LINE);
    if (match) {
      sawSpeaker = true;
      blocks.push({ speaker: `Speaker ${Number(match[1])}`, text: match[2].trim() });
    } else if (blocks.length && line.trim()) {
      blocks[blocks.length - 1].text += `\n${line.trim()}`;
    }
  }
  return sawSpeaker ? blocks : [];
}

function segmentsOf(json) {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== "object") return [];
  if (Array.isArray(json.segments)) return json.segments;
  if (Array.isArray(json.utterances)) return json.utterances;
  if (Array.isArray(json.transcript)) return json.transcript;
  if (Array.isArray(json.results?.utterances)) return json.results.utterances;
  if (Array.isArray(json.results?.segments)) return json.results.segments;
  return [];
}

export function parseFullJson(json) {
  const blocks = [];
  for (const item of segmentsOf(json)) {
    if (!item || typeof item !== "object") continue;
    const speaker = speakerLabelFrom(item.speaker || item.speaker_label || item.speakerLabel || item.spk);
    const text = String(item.text || item.transcript || item.utterance || "").trim();
    if (!speaker || !text) continue;
    blocks.push({ speaker, text });
  }
  return blocks;
}

export function parseSrt(text) {
  const blocks = [];
  const chunks = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n\r?\n/);
  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const timeIndex = lines.findIndex((line) => line.includes("-->"));
    const cueLines = timeIndex === -1 ? lines : lines.slice(timeIndex + 1);
    const cue = cueLines.join(" ").trim();
    if (!cue) continue;
    const match = cue.match(SPEAKER_LINE);
    if (match) {
      blocks.push({ speaker: `Speaker ${Number(match[1])}`, text: match[2].trim() });
    }
  }
  return blocks;
}

export function chooseBlocks({ txt = "", fullText = "", srt = "" } = {}) {
  const fromText = parseTranscriptText(txt);
  if (fromText.length) return fromText;
  if (fullText && fullText.trim()) {
    try {
      const fromJson = parseFullJson(JSON.parse(fullText));
      if (fromJson.length) return fromJson;
    } catch {
      /* full.json is stored even when it is not a transcript */
    }
  }
  const fromSrt = parseSrt(srt);
  if (fromSrt.length) return fromSrt;
  if (txt && txt.trim()) return [{ speaker: null, text: txt.trim() }];
  return [];
}

export function speakerNumbers(blocks) {
  const seen = [];
  for (const block of blocks) {
    if (!block.speaker) continue;
    if (!seen.includes(block.speaker)) seen.push(block.speaker);
  }
  return seen;
}

export function displayName(speaker, speakerNames) {
  if (!speaker) return "";
  const custom = speakerNames && speakerNames[speaker];
  const cleaned = typeof custom === "string" ? custom.trim() : "";
  return cleaned;
}
