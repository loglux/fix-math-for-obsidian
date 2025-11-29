import {
    MarkdownView,
    Notice,
    Plugin,
} from "obsidian";

export default class FixMathPlugin extends Plugin {

    statusEl: HTMLElement | null = null;

    onload() {
        this.addCommand({
            id: "fix-math-current-file",
            name: "Fix math (current file)",
            callback: () => this.fixCurrentFile(),
        });

        this.addRibbonIcon(
            "wand",
            "Fix math (current file)",
            () => this.fixCurrentFile()
        );

        this.statusEl = this.addStatusBarItem();
        this.statusEl.setText("Fix Math ready");
    }

    onunload() {}

    async fixCurrentFile() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) {
            new Notice("No active Markdown file");
            return;
        }

        const file = view.file;
        if (!file) {
            new Notice("No file to process");
            return;
        }

        try {
            const content = await this.app.vault.read(file);
            const result = transformText(content);

            if (result.text === content) {
                new Notice("No changes required");
                if (this.statusEl) {
                    this.statusEl.setText("Fix Math: No changes");
                    setTimeout(() => {
                        if (this.statusEl) this.statusEl.setText("Fix Math ready");
                    }, 3000);
                }
                return;
            }

            await this.app.vault.modify(file, result.text);

            // Build statistics message
            const total = result.stats.inlineCount + result.stats.blockCount;
            let statsMsg = `Converted ${total} formula${total !== 1 ? 's' : ''}`;

            if (result.stats.inlineCount > 0 && result.stats.blockCount > 0) {
                statsMsg += ` (${result.stats.inlineCount} inline, ${result.stats.blockCount} block)`;
            } else if (result.stats.inlineCount > 0) {
                statsMsg += ` (inline)`;
            } else if (result.stats.blockCount > 0) {
                statsMsg += ` (block)`;
            }

            new Notice(statsMsg);

            // Update status bar
            if (this.statusEl) {
                this.statusEl.setText(`Fix Math: ${statsMsg}`);
                setTimeout(() => {
                    if (this.statusEl) this.statusEl.setText("Fix Math ready");
                }, 5000);
            }
        } catch (err) {
            console.error(err);
            new Notice("Error: failed to process file");
            if (this.statusEl) {
                this.statusEl.setText("Fix Math: Error");
                setTimeout(() => {
                    if (this.statusEl) this.statusEl.setText("Fix Math ready");
                }, 3000);
            }
        }
    }
}

/* -------------------------------------------------------------------------- */
/*                               Pure functions                               */
/* -------------------------------------------------------------------------- */

type Segment = { type: "code" | "text"; text: string };

interface ConversionStats {
    inlineCount: number;
    blockCount: number;
}

function transformText(md: string): { text: string; stats: ConversionStats } {
    const segments = splitByCodeFences(md);
    const stats: ConversionStats = { inlineCount: 0, blockCount: 0 };

    const result = segments
        .map(seg => {
            if (seg.type === "code") {
                return seg.text;
            } else {
                const converted = convertMath(seg.text, stats);
                return converted;
            }
        })
        .join("");

    return { text: result, stats };
}

/**
 * Split the document into code and non-code segments,
 * so we never touch fenced code blocks.
 */
function splitByCodeFences(md: string): Segment[] {
    const lines = md.split(/\r?\n/);
    const out: Segment[] = [];
    let buf: string[] = [];

    let inCode = false;
    let fenceChar: "`" | "~" | null = null;
    let fenceLen = 0;

    const flush = (type: "code" | "text") => {
        if (buf.length) {
            out.push({ type, text: buf.join("\n") + "\n" });
            buf = [];
        }
    };

    for (const line of lines) {
        const m = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
        if (m) {
            const fence = m[2];
            const ch = fence[0] as "`" | "~";
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

/**
 * Convert LaTeX-style delimiters and math-like parentheses in a non-code segment.
 *
 *  - \[ ... \]           → $$ ... $$
 *  - \( ... \)           → $ ... $
 *  - multi-line [ ... ]  → $$ ... $$ (only if it looks like maths)
 *  - ( ... )             → $ ... $  (only if it looks like maths)
 */
function convertMath(text: string, stats: ConversionStats): string {
    // 1) Convert quoted block formulas:
    //
    // > \[
    // >  ...
    // > \]
    //
    // into:
    // > $$ ... $$
    text = text.replace(
        /^>[ \t]*\\\[[ \t]*\r?\n([\s\S]*?)\r?\n>[ \t]*\\\][ \t]*$/gm,
        (m, inner) => {
            const cleaned = inner
                .split(/\r?\n/)
                .map(line => line.replace(/^>[ \t]*/, "")) // strip ">" from each inner line
                .join(" ");
            stats.blockCount++;
            return `> $$ ${cleaned.trim()} $$`;
        }
    );

    // 2) \[ ... \]  → $$ ... $$
    const displayBackslashRe = /(^|[^\\])\\\[((?:[\s\S]*?))\\\]/g;

    // 3) Multiline [ ... ] blocks → $$ ... $$ (only when it looks like maths)
    //    Optionally allow a simple Markdown prefix before "[" (e.g. "# ", "> ", "- ").
    const bracketBlockRe =
        /^[ \t]*([#>\-\*\+0-9.]+\s*)?\[[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\][ \t]*$/gm;

    // 4) \( ... \)  → $ ... $ (backslashed inline math)
    const inlineBackslashRe = /(^|[^\\])\\\((.+?)\\\)/g;

    // Heuristic: treat content as maths if it contains:
    //  - LaTeX markers (\ , _ , ^ , \text{...})
    //  - or obvious math Unicode symbols (→, ∞, ±, ≥, ≤)
    //  - or, if ASCII-ish, a digit AND a maths operator (+-*/=)
    //  - or simple variable equations like x=y, a<b
    const isMathy = (s: string) => {
        // Explicit mathematical markers: LaTeX commands, subscripts/superscripts, arrows, ∞, ±, ≥, ≤
        if (/[\\_^→∞±≥≤]|\\text\{/.test(s)) {
            return true;
        }

        const hasDigit = /\d/.test(s);
        const hasOp = /[+\-*/=<>]/.test(s);

        // Classic case: there are digits AND operators present
        if (hasDigit && hasOp) {
            return true;
        }

        // NEW: a pure number (possibly with a minus sign and/or a decimal part) also counts as maths
        // Examples: "0", "-1", "3.14"
        if (/^\s*-?\d+(?:\.\d+)?\s*$/.test(s)) {
            return true;
        }

        // NEW: simple variable equations without digits
        // Examples: "x=y", "a<b", "f>g", "x = y + z"
        // Match single letters with operators between them
        if (/^[a-zA-Z]\s*[=<>+\-*/]\s*[a-zA-Z]/.test(s)) {
            return true;
        }

        return false;
    };


    // Convert \[ ... \] → $$ ... $$
    let out = text.replace(displayBackslashRe, (_, pre: string, inner: string) => {
        stats.blockCount++;
        return `${pre}$$
${inner.trim()}
$$`;
    });

    // Convert multiline [ ... ] → $$ ... $$ (only if it looks like maths)
    out = out.replace(
        bracketBlockRe,
        (m: string, prefix: string | undefined, inner: string) => {
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

    // At this point, all block maths are in $$ ... $$.
    // We must NOT touch anything inside $$ ... $$ with inline rules.
    const parts = out.split(/(\$\$[\s\S]*?\$\$)/);
    out = parts
        .map((part, idx) => {
            // Odd indices (captured group) are the $$...$$ blocks themselves.
            if (idx % 2 === 1 && part.startsWith("$$")) {
                return part; // leave block maths as-is
            }

            // 1) Convert plain ( ... ) → $ ... $ when it looks like maths
            let chunk = convertPlainParens(part, isMathy, stats);

            // 2) Convert \( ... \) → $ ... $
            chunk = chunk.replace(
                inlineBackslashRe,
                (_, pre: string, inner: string) => {
                    stats.inlineCount++;
                    return `${pre}$${inner.trim()}$`;
                }
            );

            return chunk;
        })
        .join("");

    return out;
}

/**
 * Convert plain parentheses used as inline maths delimiters:
 * ( ... ) → $ ... $ (only if content "looks like maths").
 *
 * Behaviour:
 *  - "(x\\to 1)"          → "$x\\to 1$"
 *  - "(0/0)"              → "$0/0$"
 *  - "(3x^{2}-3 = 0)"     → "$3x^{2}-3 = 0$"
 *  - "((3x^{2}-3)' = 6x)" → "$((3x^{2}-3)' = 6x)$"
 *  - "(про (3x^{2}-3) в числителе)" → "(про $3x^{2}-3$ в числителе)"
 */
function convertPlainParens(text: string, isMathy: (s: string) => boolean, stats: ConversionStats): string {
    let result = "";
    let i = 0;

    const isWhitespace = (ch: string) => /\s/.test(ch);

    while (i < text.length) {
        const ch = text[i];

        if (ch === "(") {
            const prev = i === 0 ? "" : text[i - 1];

            // Require start-of-line, whitespace, or another "(" before "("
            if (i > 0 && !isWhitespace(prev) && prev !== "(") {
                result += ch;
                i += 1;
                continue;
            }

            // Find matching closing parenthesis with a simple depth counter
            let depth = 1;
            let j = i + 1;

            while (j < text.length && depth > 0) {
                const c = text[j];
                if (c === "(") depth += 1;
                else if (c === ")") depth -= 1;
                j += 1;
            }

            if (depth !== 0) {
                // No matching closing parenthesis, treat "(" as normal text
                result += ch;
                i += 1;
                continue;
            }

            const closeIndex = j - 1;
            const inner = text.slice(i + 1, closeIndex);

            // If inner already contains explicit LaTeX inline delimiters,
            // treat the outer parentheses as plain text and let those
            // inner expressions be handled separately.
            if (/\\\(/.test(inner) || /\\\)/.test(inner)) {
                result += ch;
                i += 1;
                continue;
            }

            // Collect trailing primes: ( ... )', ( ... )'', etc.
            let k = closeIndex + 1;
            let primes = "";
            while (k < text.length && text[k] === "'") {
                primes += "'";
                k += 1;
            }

            const after = k < text.length ? text[k] : "";
            const afterIsDelim =
                after === "" ||
                isWhitespace(after) ||
                ").,;:?!".includes(after);

            // If it does not look like a delimiter, treat "(" as normal and move on.
            if (!afterIsDelim) {
                result += ch;
                i += 1;
                continue;
            }

            // Ignore LaTeX commands like \to, \sin, \cos when checking for "words"
            const innerWithoutCommands = inner.replace(/\\[A-Za-z]+/g, "");

            // If the remaining text clearly contains natural-language words
            // (any letters, length ≥ 2), treat the outer parentheses as text.
            if (/\p{L}{2,}/u.test(innerWithoutCommands)) {
                result += ch;
                i += 1;
                continue;
            }

            // If content does not look like maths at all, do NOT jump over it:
            // just output "(" and continue scanning inside for inner (...) blocks.
            if (!isMathy(inner)) {
                result += ch;
                i += 1;
                continue;
            }

            // This is maths: remove outer parentheses and wrap content in $...$
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