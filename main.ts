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
            const fixed = transformText(content);

            if (fixed === content) {
                new Notice("No changes required");
                return;
            }

            await this.app.vault.modify(file, fixed);
            new Notice("Math converted");
        } catch (err) {
            console.error(err);
            new Notice("Error: failed to process file");
        }
    }
}

/* -------------------------------------------------------------------------- */
/*                               Pure functions                               */
/* -------------------------------------------------------------------------- */

type Segment = { type: "code" | "text"; text: string };

function transformText(md: string): string {
    const segments = splitByCodeFences(md);
    return segments
        .map(seg => (seg.type === "code" ? seg.text : convertMath(seg.text)))
        .join("");
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
function convertMath(text: string): string {
    // 1) \[ ... \]  → $$ ... $$
    const displayBackslashRe = /(^|[^\\])\\\[((?:[\s\S]*?))\\\]/g;

    // 2) Multiline [ ... ] blocks → $$ ... $$ (only when it looks like maths)
    const bracketBlockRe =
        /^[ \t]*\[[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\][ \t]*$/gm;

    // 3) \( ... \)  → $ ... $ (backslashed inline math)
    const inlineBackslashRe = /(^|[^\\])\\\((.+?)\\\)/g;

    // Heuristic: treat content as maths if it contains:
    //  - LaTeX markers (\ , _ , ^ , \text{...})
    //  - or, if purely ASCII, a digit AND a maths operator (+-*/=)
    const isMathy = (s: string) => {
        if (/[\\_^]|\\text\{/.test(s)) {
            return true;
        }

        const hasDigit = /\d/.test(s);
        const hasOp = /[+\-*/=]/.test(s);
        return hasDigit && hasOp;
    };

    // Convert \[ ... \] → $$ ... $$
    let out = text.replace(displayBackslashRe, (_, pre: string, inner: string) => {
        return `${pre}$$
${inner.trim()}
$$`;
    });

    // Convert multiline [ ... ] → $$ ... $$ (only if it looks like maths)
    out = out.replace(bracketBlockRe, (m: string, inner: string) => {
        return isMathy(inner) ? `$$
${inner.trim()}
$$` : m;
    });

    // At this point, all block maths are in $$ ... $$.
    // We must NOT touch anything inside $$ ... $$ with inline rules.
    const parts = out.split(/(\$\$[\s\S]*?\$\$)/);
    out = parts
        .map((part, idx) => {
            // Odd indices (with capturing group) are the $$...$$ blocks themselves.
            if (idx % 2 === 1 && part.startsWith("$$")) {
                return part; // leave block maths as-is
            }

            // 1) Convert plain ( ... ) → $ ... $ when it looks like maths
            let chunk = convertPlainParens(part, isMathy);

            // 2) Convert \( ... \) → $ ... $
            chunk = chunk.replace(
                inlineBackslashRe,
                (_, pre: string, inner: string) => {
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
function convertPlainParens(text: string, isMathy: (s: string) => boolean): string {
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

            // Try to find matching closing parenthesis with a simple depth counter
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

            // If inner clearly contains natural-language words (any alphabet, length ≥ 2),
            // we treat the outer parentheses as text, not maths.
            if (/[A-Za-zА-Яа-яЁё]{2,}/.test(inner)) {
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
