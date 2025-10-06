# Fix Math for Obsidian

A simple Obsidian plugin with a button and command to fix LaTeX math delimiters in your notes. It converts `\[…\]` → `$$…$$` and `\(…\)` → `$…$`, while ignoring code blocks (` ```…``` ` and `~~~…~~~`).

## Why This Plugin?

When you copy content with mathematical formulas from **ChatGPT**, **OpenWebUI**, or other AI assistants into Obsidian, the math often comes in LaTeX format using `\(…\)` for inline math and `\[…\]` for display math. However, Obsidian uses `$…$` and `$$…$$` delimiters.

Instead of manually finding and replacing each formula, just click one button and all math delimiters in your note will be fixed automatically! 🪄


## Features

- **Ribbon button** on the sidebar for quick access
- **Command palette** integration: "Fix math for Obsidian (current file)"
- Works only with the **currently open file**
- Does not touch existing `$…$` and `$$…$$` delimiters
- Preserves all content inside code blocks

## Installation (no build required)

1. Navigate to your Obsidian vault's plugin folder: `.obsidian/plugins/`
2. Create a new folder: `fix-math-for-obsidian/`
3. Inside this folder, create two files:
    - `manifest.json` (copy from this repository)
    - `main.js` (copy from this repository)
4. Restart Obsidian
5. Go to **Settings** → **Community plugins** → Enable **Fix Math for Obsidian**

## How to Use

1. Open the Markdown file you want to fix in Obsidian
2. Either:
    - Click the **wand icon** (🪄) in the left ribbon, or
    - Open Command Palette (`Ctrl/Cmd+P`) and run **"Fix math for Obsidian (current file)"**
3. You'll see a notification:
    - "Done: formulas fixed" if changes were made
    - "No changes required" if nothing needed fixing
    - "Error: failed to process file (see console)" if something went wrong

## Examples

**Before:**


This is inline math \(x^2 + y^2 = z^2\) in text.

Display math:
\[
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
\]



**After:**

This is inline math $x^2 + y^2 = z^2$ in text.

Display math:

$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$


## Customization

If you prefer display formulas **without extra blank lines** around `$$`, modify the `convertMath()` function in `main.js`:

Replace:
```javascript
return `$$\n${body}\n$$`;
```

With:
```javascript
return `$$${body}$$`;
```

(or add newlines before/after as you prefer)

## License

MIT  