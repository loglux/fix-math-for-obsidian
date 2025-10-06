// Minimal, no-build Obsidian plugin
const { Plugin, Notice } = require('obsidian');

module.exports = class FixMathPlugin extends Plugin {
    onload() {
        // Command in the palette
        this.addCommand({
            id: 'fix-math-current-file',
            name: 'Fix math for Obsidian (current file)',
            callback: () => this.fixCurrentFile()
        });

        // Button in the left panel
        this.addRibbonIcon('wand', 'Fix math (current file)', () => this.fixCurrentFile());

        // Status bar hint (optional)
        this.status = this.addStatusBarItem();
        this.status.setText('Fix Math ready');
    }

    async fixCurrentFile() {
        const view = this.app.workspace.getActiveViewOfType(this.app.plugins.plugins['fix-math-for-obsidian']?.app?.plugins?.api?.MarkdownView || window.MarkdownView || require('obsidian').MarkdownView);
        // more universal:
        const mdView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
        if (!mdView) {
            new Notice('No active Markdown file');
            return;
        }

        const file = mdView.file;
        if (!file) {
            new Notice('File not found');
            return;
        }

        try {
            const content = await this.app.vault.read(file);
            const fixed = transformText(content);

            if (fixed === content) {
                new Notice('No changes required');
                return;
            }

            await this.app.vault.modify(file, fixed);
            new Notice('Done: formulas fixed');
        } catch (e) {
            console.error(e);
            new Notice('Error: failed to process file (see console)');
        }
    }
};

/**
 * Transforms:
 *   \[ ... \]  -> $$ ... $$
 *   \( ... \)  -> $ ... $
 * Ignores content inside code blocks ```…``` and ~~~…~~~.
 * Does not touch existing $…$ and $$…$$.
 */
function transformText(md) {
    const segments = splitByCodeFences(md); // [{type: 'code'|'text', text}]
    return segments.map(seg => {
        if (seg.type === 'code') return seg.text;
        return convertMath(seg.text);
    }).join('');
}

/** Splits text into segments by code blocks ```…``` or ~~~…~~~ (accounting for different fence lengths). */
function splitByCodeFences(md) {
    const lines = md.split(/\r?\n/);
    const out = [];
    let buf = [];
    let inCode = false;
    let fenceChar = null; // '`' or '~'
    let fenceLen = 0;

    const flush = (type) => {
        if (buf.length) {
            out.push({ type, text: buf.join('\n') + '\n' });
            buf = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const m = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
        if (m) {
            const fence = m[2];
            const ch = fence[0];
            const len = fence.length;

            if (!inCode) {
                // Opening code block
                flush('text');
                inCode = true;
                fenceChar = ch;
                fenceLen = len;
                buf.push(line);
            } else {
                // Closing code block if fence character matches and length is not less
                if (ch === fenceChar && len >= fenceLen) {
                    buf.push(line);
                    flush('code');
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
    // final buffer
    flush(inCode ? 'code' : 'text');

    return out;
}

/** Converting LaTeX delimiters in a segment outside of code. */
function convertMath(text) {
    // 1) Do not touch existing $$…$$ and $…$ — for simplicity, leave as is.
    // 2) Convert \[ … \] → $$ … $$ (multiline)
    // 3) Convert \( … \) → $ … $

    // Regex with "s" (dotAll) flag for multiline display formulas.
    // Use negative lookbehind (?<!\\) to avoid touching escaped \\[ and \\(.
    // Modern Obsidian engine (Electron/Chromium) supports lookbehind.
    const displayRe = /(?<!\\)\\\[(.+?)(?<!\\)\\\]/gs;
    const inlineRe  = /(?<!\\)\\\((.+?)(?<!\\)\\\)/g;

    // Process display formulas first, then inline
    let out = text.replace(displayRe, (_, inner) => {
        const body = String(inner).trim();
        // Wrap with newlines so Obsidian reliably recognizes the block
        return `$$\n${body}\n$$`;
    });

    out = out.replace(inlineRe, (_, inner) => {
        const body = String(inner).trim();
        return `$${body}$`;
    });

    return out;
}