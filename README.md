# Fix Math for Obsidian

A simple Obsidian plugin with a button and command to fix LaTeX math delimiters in your notes. It converts `\[…\]` → `$$…$$` and `\(…\)` → `$…$`, while intelligently detecting and converting plain parentheses and brackets that contain mathematical expressions. Code blocks are always preserved.

## Why This Plugin?

When you copy content with mathematical formulas from **ChatGPT**, **OpenWebUI**, or other AI assistants into Obsidian, the math often comes in LaTeX format using `\(…\)` for inline math and `\[…\]` for display math. However, Obsidian uses `$…$` and `$$…$$` delimiters.

Instead of manually finding and replacing each formula, just click one button and all math delimiters in your note will be fixed automatically! 🪄

## Why another LaTeX converter?

While there are other plugins for converting LaTeX delimiters, this one focuses on:

- **Simplicity** – a single command that only touches what is obviously maths.
- **Intelligence** – detects mathematical expressions in plain parentheses like `(x=y)` and `(0/0)`.
- **Transparency** – a small, readable TypeScript codebase.
- **Safety** – leaves code blocks, existing `$…$` and non-math text alone.
- **Statistics** – shows you exactly how many formulas were converted.

## Features

- **Ribbon button** on the sidebar for quick access.
- **Command palette** integration: "Fix math (current file)".
- **Real-time statistics**: Shows count of converted inline and block formulas.
- **Status bar updates**: Displays conversion results and automatically resets.
- Works only on the **currently open file**.
- Does not touch existing `$…$` and `$$…$$` delimiters.
- Preserves all content inside fenced code blocks (` ```…``` ` and `~~~…~~~`).
- Detects maths in plain parentheses, including typical cases like:
    - `(x=y)` – simple variable equations
    - `(x\to 1)` – LaTeX expressions
    - `(0/0)` – fractions
    - `(3x^{2} - 3 = 0)` – polynomials
    - `(3x^{2} - 3)'` – derivatives with trailing primes
    - `(p)` – single-letter variables
    - `(345{,}678{,}123)` – LaTeX formatted large numbers
- **NEW:** Detects single-line bracket math from AI assistants like Windows Copilot:
    - `[ \frac{a}{b}(c + d) = \frac{ac}{b} + \frac{ad}{b} ]` → converts to display math
- Supports **quoted block math** in blockquotes:
    - `> \[...\]` (quoted backslash blocks)
    - `> [...]` (quoted bracket blocks) – handles multi-line quoted brackets from AI assistants

## Supported conversions

| Input format                                         | Detected as | Output format |
| ---------------------------------------------------- | ----------- | ------------- |
| `\(...\)`                                            | inline      | `$...$`       |
| `\[...\]`                                            | block       | `$$...$$`     |
| `> \[...\]` *(quoted backslash block)*               | block       | `> $$...$$`   |
| `> [...]` *(quoted bracket block, multi-line)*       | block       | `> $$...$$`   |
| `[ ... ]` *(if on separate lines and contains math)* | block       | `$$...$$`     |
| `[ ... ]` *(single line with LaTeX, e.g. from AI)*  | block       | `$$...$$`     |
| `( ... )` *(if contains math)*                       | inline      | `$...$`       |
| ` ```...``` ` or `~~~...~~~`                         | code block  | unchanged     |

## Installation

### From release (recommended)

1. Go to the **Releases** section of this repository.
2. Download the latest versions of:
    - `manifest.json`
    - `main.js`
3. In your Obsidian vault, navigate to:  
   `.obsidian/plugins/fix-math/`
4. Place both files in that folder.
5. Restart Obsidian.
6. Go to **Settings → Community plugins** and enable **Fix Math for Obsidian**.

### From source (for developers)

1. Clone this repository.
2. Run:

```bash
npm install
npm run build
```

- This will produce `main.js` next to `main.ts`.
- Copy `manifest.json` and the built `main.js` into your vault's plugin folder:  
  `.obsidian/plugins/fix-math/`.

## How to Use

1. Open the Markdown file you want to fix in Obsidian
2. Either:
    - Click the **wand icon** (🪄) in the left ribbon, or
    - Open Command Palette (`Ctrl/Cmd+P`) and run **"Fix math for Obsidian (current file)"**
3. You'll see a notification with conversion statistics:
    - "Converted 5 formulas (3 inline, 2 block)" if changes were made
    - "No changes required" if nothing needed fixing
    - "Error: failed to process file" if something went wrong
4. The **status bar** at the bottom will briefly display the result, then reset to "Fix Math ready"

## Keyboard shortcut

The plugin does not set a default hotkey, but you can add one yourself:

1. Open **Settings → Hotkeys**.
2. Search for **"Fix math (current file)"**.
3. Assign any shortcut you like, for example <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd>.

This makes it very convenient to fix maths in the current note with a single key press.

## Tips for copying from AI assistants

### Recommended Obsidian setting

For best results with AI-generated math content, go to **Settings → Editor** and **disable** the option **"Convert HTML content to Markdown on paste"**.

With this setting off, pasted content keeps its original structure — bracket math blocks `[...]`, matrix row separators `\\`, and equation signs `=` are all preserved as exported. The plugin then handles all known ChatGPT export artefacts automatically.

> If you prefer to keep the setting enabled, the plugin also handles the different artefacts produced by that mode.

### Copying with math delimiters preserved

When copying content from **ChatGPT**, **Claude**, **OpenWebUI**, or similar AI assistants:

- **Always use the "Copy" button** located at the bottom-left of the generated response (usually appears on hover)
- This ensures math expressions are copied with their LaTeX delimiters `\( ... \)` and `\[ ... \]`
- Once pasted into Obsidian, simply run this plugin to convert them to `$ ... $` and `$$ ... $$`

### If you already pasted text without delimiters

If you've already pasted text and the math expressions don't have any delimiters (just plain LaTeX commands like `\frac{a}{b}` or `\sum_{i=1}^n`):

1. **Select the math expression** with your mouse or keyboard
2. Press **Shift + $$** to wrap it in block math delimiters (`$$ ... $$`)
   - For inline math, use **Shift + $** to wrap in inline delimiters (`$ ... $`)

This is Obsidian's built-in feature for wrapping selected text in math delimiters.

**Example:**
- Select: `\frac{a}{b} = \frac{c}{d}`
- Press: **Shift + $$**
- Result: `$$\frac{a}{b} = \frac{c}{d}$$`

## Examples

### Example 1: Basic LaTeX conversion

**Before:**

```markdown
This is inline math \(x^2 + y^2 = z^2\) in text.

Display math:  
\[  
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}  
\]
```

**After:**

```markdown
This is inline math $x^2 + y^2 = z^2$ in text.

Display math:

$$  
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}  
$$
```

### Example 2: Smart parentheses detection

**Before:**

```markdown
And a mixed example:  
(0/0) is an indeterminate form, and (3x^{2}-3)' = 6x.

Simple equations like (x=y) are also converted.
```

**After:**

```markdown
And a mixed example:  
$0/0$ is an indeterminate form, and $(3x^{2}-3)' = 6x$.

Simple equations like $x=y$ are also converted.
```

### Example 3: Quoted block math (backslash format)

**Before:**

```markdown
> Here's an important formula:
> \[
> E = mc^2
> \]
```

**After:**

```markdown
> Here's an important formula:
> $$ E = mc^2 $$
```

### Example 4: Quoted bracket blocks (from AI assistants in blockquotes)

**Before:**

```markdown
> You can use the expression
> [
> \cos(\angle DEF) = \frac{-92.99}{163.48}
> ]
> to find the angle.
```

**After:**

```markdown
> You can use the expression
> $$
\cos(\angle DEF) = \frac{-92.99}{163.48}
$$
> to find the angle.
```

### Example 5: Single-line brackets from AI assistants (Windows Copilot, ChatGPT)

**Before:**

```markdown
The student correctly applied the distributive property:
[ \frac{a}{b}(c + d) = \frac{a(c + d)}{b} = \frac{ac + ad}{b} = \frac{ac}{b} + \frac{ad}{b} ]

This shows understanding of algebraic fractions.
```

**After:**

```markdown
The student correctly applied the distributive property:

$$
\frac{a}{b}(c + d) = \frac{a(c + d)}{b} = \frac{ac + ad}{b} = \frac{ac}{b} + \frac{ad}{b}
$$

This shows understanding of algebraic fractions.
```

### Example 6: LaTeX formatted numbers

**Before:**

```markdown
The population is approximately (7{,}900{,}000{,}000) people.

Scientific notation uses (6{.}022 \times 10^{23}) for Avogadro's number.
```

**After:**

```markdown
The population is approximately $7{,}900{,}000{,}000$ people.

Scientific notation uses $6{.}022 \times 10^{23}$ for Avogadro's number.
```

## What gets converted?

The plugin intelligently detects mathematical expressions based on:

- **LaTeX commands**: `\to`, `\sin`, `\cos`, `\text{...}`, etc.
- **LaTeX number formatting**: `123{,}456` (thousands), `1{.}234` (decimals)
- **Math operators**: `+`, `-`, `*`, `/`, `=`, `<`, `>`
- **Mathematical symbols**: `_`, `^` (subscript/superscript), `→`, `∞`, `±`, `≥`, `≤`
- **Numbers with operators**: `3 + 5`, `x^2`
- **Pure numbers**: `0`, `-1`, `3.14`
- **Single-letter variables**: `p`, `v`, `x'`
- **Variable equations**: `x=y`, `a<b`, `f>g`

## What stays unchanged?

- **Natural language**: `(about this topic)` – contains full words
- **Code blocks**: ` ```math content``` ` – never touched
- **Existing delimiters**: `$formula$` and `$$formula$$` – already correct
- **Non-math text**: `(hello world)` – no mathematical indicators
- **Markdown links**: `[text](url)` and `[text]: url` – recognised as links, not math
- **Wikilinks**: `[[page name]]` – Obsidian internal links
- **Footnotes**: `[^ref]` – footnote references

## Customisation

By default, block maths is wrapped as:

```tex
$$
... 
$$
```

If you prefer display formulae without extra blank lines around `$$`, you can tweak the `convertMath()` implementation in `main.ts` (or the compiled `main.js`) to change how block maths is wrapped.

## Technical Details

### How it works

1. **Parse document**: Split into code blocks and text segments
2. **Protect code**: Never modify content inside ` ``` ` or `~~~` fences
3. **Convert LaTeX**: Transform `\[...\]` and `\(...\)` delimiters
4. **Detect math**: Use heuristics to identify mathematical expressions in plain parentheses
5. **Track statistics**: Count inline and block conversions
6. **Update UI**: Show results in notification and status bar

### Safety guarantees

- ✅ Code blocks are always preserved
- ✅ Existing `$...$` delimiters are never modified
- ✅ Natural language in parentheses is ignored
- ✅ No changes are made unless confident it's mathematics

## Licence

MIT
