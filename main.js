"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FixMathPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var FixMathPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.statusEl = null;
  }
  onload() {
    this.addCommand({
      id: "current-file",
      name: "Current file",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
        if (view) {
          if (!checking) {
            void this.fixCurrentFile();
          }
          return true;
        }
        return false;
      }
    });
    this.addRibbonIcon(
      "wand",
      "Current file",
      () => this.fixCurrentFile()
    );
    this.statusEl = this.addStatusBarItem();
    this.statusEl.setText("Ready");
  }
  onunload() {
  }
  async fixCurrentFile() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view || !view.file) {
      new import_obsidian.Notice("No active Markdown file");
      return;
    }
    try {
      const editor = view.editor;
      const stats = { inlineCount: 0, blockCount: 0 };
      if (editor.somethingSelected()) {
        const selected = editor.getSelection();
        const converted = convertMath(selected, stats);
        const total2 = stats.inlineCount + stats.blockCount;
        if (converted === selected || total2 === 0) {
          new import_obsidian.Notice("No changes required");
          this.updateStatusBar("No changes", 3e3);
          return;
        }
        editor.replaceSelection(converted);
      } else {
        let originalContent = "";
        let newContent = "";
        await this.app.vault.process(view.file, (content) => {
          originalContent = content;
          const result = transformText(content);
          stats.inlineCount = result.stats.inlineCount;
          stats.blockCount = result.stats.blockCount;
          newContent = result.text;
          return result.text;
        });
        const hasChanges = originalContent !== newContent;
        const total2 = stats.inlineCount + stats.blockCount;
        if (!hasChanges || total2 === 0) {
          new import_obsidian.Notice("No changes required");
          this.updateStatusBar("No changes", 3e3);
          return;
        }
      }
      const total = stats.inlineCount + stats.blockCount;
      let statsMsg = `Converted ${total} formula${total !== 1 ? "s" : ""}`;
      if (stats.inlineCount > 0 && stats.blockCount > 0) {
        statsMsg += ` (${stats.inlineCount} inline, ${stats.blockCount} block)`;
      } else if (stats.inlineCount > 0) {
        statsMsg += ` (inline)`;
      } else if (stats.blockCount > 0) {
        statsMsg += ` (block)`;
      }
      new import_obsidian.Notice(statsMsg);
      this.updateStatusBar(statsMsg, 5e3);
    } catch (err) {
      console.error(err);
      new import_obsidian.Notice("Error: failed to process file");
      this.updateStatusBar("Error", 3e3);
    }
  }
  updateStatusBar(text, resetAfter) {
    if (this.statusEl) {
      this.statusEl.setText(text);
      window.setTimeout(() => {
        if (this.statusEl)
          this.statusEl.setText("Ready");
      }, resetAfter);
    }
  }
};
function transformText(md) {
  const segments = splitByCodeFences(md);
  const stats = { inlineCount: 0, blockCount: 0 };
  const result = segments.map((seg) => {
    if (seg.type === "code") {
      return seg.text;
    } else {
      const converted = convertMath(seg.text, stats);
      return converted;
    }
  }).join("");
  return { text: result, stats };
}
function splitByCodeFences(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let buf = [];
  let inCode = false;
  let fenceChar = null;
  let fenceLen = 0;
  const flush = (type) => {
    if (buf.length) {
      out.push({ type, text: buf.join("\n") + "\n" });
      buf = [];
    }
  };
  for (const line of lines) {
    const m = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (m) {
      const fence = m[2];
      const ch = fence[0];
      const len = fence.length;
      if (!inCode) {
        flush("text");
        inCode = true;
        fenceChar = ch;
        fenceLen = len;
        buf.push(line);
      } else {
        if (ch === fenceChar && len >= fenceLen) {
          buf.push(line);
          flush("code");
          inCode = false;
          fenceChar = null;
          fenceLen = 0;
        } else {
          buf.push(line);
        }
      }
    } else {
      buf.push(line);
    }
  }
  flush(inCode ? "code" : "text");
  return out;
}
function convertMath(text, stats) {
  text = text.replace(
    /^>[ \t]*\\\[[ \t]*\r?\n([\s\S]*?)\r?\n>[ \t]*\\\][ \t]*$/gm,
    (_match, inner) => {
      const cleaned = inner.split(/\r?\n/).map((line) => line.replace(/^>[ \t]*/, "")).join(" ");
      stats.blockCount++;
      return `> $$ ${cleaned.trim()} $$`;
    }
  );
  text = text.replace(
    /^>[ \t]*\[[ \t]*\r?\n([\s\S]*?)\r?\n>[ \t]*\][ \t]*$/gm,
    (_match, inner) => {
      const cleaned = inner.split(/\r?\n/).map((line) => line.replace(/^>[ \t]*/, "")).join(" ");
      return `> [ ${cleaned.trim()} ]`;
    }
  );
  text = text.replace(/^#[ \t]*(\[[ \t]*)$/gm, (_m, bracket) => bracket);
  text = text.replace(/^#[ \t]*(\\begin\{)/gm, "$1");
  const displayBackslashRe = /(^|[^\\])\\\[((?:[\s\S]*?))\\\]/g;
  const bracketBlockRe = /^[ \t]*([#>\-*+0-9.]+\s*)?\[[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\][ \t]*$/gm;
  const hasLaTeXCommand = (s) => /\\[a-zA-Z]+/.test(s);
  const inlineBackslashRe = /(^|[^\\])\\\((.+?)\\\)/g;
  const isMathy = (s) => {
    if (/[\\_^→∞±≥≤]|\\text\{/.test(s)) {
      return true;
    }
    if (/\d+\{[,.\s]\}\d+/.test(s)) {
      return true;
    }
    const hasDigit = /\d/.test(s);
    const hasOp = /[+\-*/=<>,]/.test(s);
    if (hasDigit && hasOp) {
      return true;
    }
    if (/^\s*-?\d+(?:\.\d+)?\s*$/.test(s)) {
      return true;
    }
    if (/^[a-zA-Z](?:'+)?$/.test(s.trim())) {
      return true;
    }
    if (/^[A-Z]{2,}(?:'+)?$/.test(s.trim())) {
      return true;
    }
    if (/^[a-zA-Z]\s*[=<>+\-*/]\s*[a-zA-Z]/.test(s)) {
      return true;
    }
    const hasLetters = /[a-zA-Z]/.test(s);
    const hasWords = /\b[a-zA-Z]{2,}\b/.test(s);
    if (hasLetters && hasOp && !hasWords) {
      return true;
    }
    return false;
  };
  let out = text.replace(displayBackslashRe, (_, pre, inner) => {
    stats.blockCount++;
    return `${pre}$$
${inner.trim()}
$$`;
  });
  out = out.replace(
    bracketBlockRe,
    (m, prefix, inner) => {
      const p = prefix ?? "";
      if (isMathy(inner)) {
        stats.blockCount++;
        return `${p}$$
${inner.trim()}
$$`;
      }
      return m;
    }
  );
  {
    const bracketParts = out.split(/(\$\$[\s\S]*?\$\$)/);
    out = bracketParts.map((part, idx) => {
      if (idx % 2 === 1)
        return part;
      let p = part.replace(
        /\[\s*\\left\[[^\n]*?\\right\][^\n]*?\]/g,
        (match, offset, fullText) => {
          const afterBracket = fullText[offset + match.length];
          if (afterBracket === "(" || afterBracket === ":")
            return match;
          if (match.startsWith("[["))
            return match;
          const inner = match.slice(1, -1);
          if (inner.startsWith("^"))
            return match;
          stats.blockCount++;
          return `$$
${inner.trim()}
$$`;
        }
      );
      p = p.replace(
        /\[([^\]]+)\]/g,
        (match, inner, offset, fullText) => {
          const before = fullText.slice(0, offset);
          const afterBracket = fullText[offset + match.length];
          if (afterBracket === "(" || afterBracket === ":")
            return match;
          if (/\\left\s*$/.test(before) || /\\right/.test(inner) || /\\left/.test(inner))
            return match;
          if (match.startsWith("[["))
            return match;
          if (inner.startsWith("^"))
            return match;
          if (hasLaTeXCommand(inner) || isMathy(inner)) {
            stats.blockCount++;
            return `$$
${inner.trim()}
$$`;
          }
          return match;
        }
      );
      return p;
    }).join("");
  }
  out = out.replace(
    /\$\$([\s\S]*?)\$\$/g,
    (block) => block.replace(/(?<!\\)\\[ \t]*$/gm, "\\\\").replace(/(?<!\\)\\(?=[0-9-])/g, "\\\\").replace(/^={3,}$/gm, "=").replace(/^-{3,}$/gm, "-").replace(/^#{1,6}[ \t]+(.*)/gm, "$1\n-").replace(/^([+-]),/gm, "$1")
  );
  const parts = out.split(/(\$\$[\s\S]*?\$\$)/);
  out = parts.map((part, idx) => {
    if (idx % 2 === 1 && part.startsWith("$$")) {
      return part;
    }
    let chunk = convertPlainParens(part, isMathy, stats);
    chunk = chunk.replace(
      inlineBackslashRe,
      (_, pre, inner) => {
        stats.inlineCount++;
        return `${pre}$${inner.trim()}$`;
      }
    );
    return chunk;
  }).join("");
  return out;
}
function convertPlainParens(text, isMathy, stats) {
  let result = "";
  let i = 0;
  const isWhitespace = (ch) => /\s/.test(ch);
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\" && i + 1 < text.length && text[i + 1] === "(") {
      const end = text.indexOf("\\)", i + 2);
      if (end !== -1) {
        result += text.slice(i, end + 2);
        i = end + 2;
      } else {
        result += ch;
        i += 1;
      }
      continue;
    }
    if (ch === "(") {
      const prev = i === 0 ? "" : text[i - 1];
      if (i > 0 && !isWhitespace(prev) && prev !== "(") {
        result += ch;
        i += 1;
        continue;
      }
      let depth = 1;
      let j = i + 1;
      while (j < text.length && depth > 0) {
        const c = text[j];
        if (c === "(")
          depth += 1;
        else if (c === ")")
          depth -= 1;
        j += 1;
      }
      if (depth !== 0) {
        result += ch;
        i += 1;
        continue;
      }
      const closeIndex = j - 1;
      const inner = text.slice(i + 1, closeIndex);
      if (/\\\(/.test(inner) || /\\\)/.test(inner)) {
        result += ch;
        i += 1;
        continue;
      }
      let k = closeIndex + 1;
      let primes = "";
      while (k < text.length && text[k] === "'") {
        primes += "'";
        k += 1;
      }
      const after = k < text.length ? text[k] : "";
      const afterIsDelim = after === "" || isWhitespace(after) || ").,;:?!*_".includes(after);
      if (!afterIsDelim) {
        result += ch;
        i += 1;
        continue;
      }
      const innerWithoutCommands = inner.replace(/\\[A-Za-z]+/g, "");
      const hasLaTeXCommand = /\\[a-zA-Z]+/.test(inner);
      if (!hasLaTeXCommand && /\p{Ll}{3,}/u.test(innerWithoutCommands)) {
        result += ch;
        i += 1;
        continue;
      }
      if (!isMathy(inner)) {
        result += ch;
        i += 1;
        continue;
      }
      stats.inlineCount++;
      const core = inner.trim() + primes;
      result += `$${core}$`;
      i = k;
    } else {
      result += ch;
      i += 1;
    }
  }
  return result;
}
