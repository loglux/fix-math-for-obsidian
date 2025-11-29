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
- Supports **quoted block math** in blockquotes (e.g., `> \[...\]`)

## Supported conversions

| Input format                                         | Detected as | Output format |
| ---------------------------------------------------- | ----------- | ------------- |
| `\(...\)`                                            | inline      | `$...$`       |
| `\[...\]`                                            | block       | `$$...$$`     |
| `> \[...\]` *(in blockquotes)*                       | block       | `> $$...$$`   |
| `[ ... ]` *(if on separate lines and contains math)* | block       | `$$...$$`     |
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

### Example 3: Quoted block math

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

## What gets converted?

The plugin intelligently detects mathematical expressions based on:

- **LaTeX commands**: `\to`, `\sin`, `\cos`, `\text{...}`, etc.
- **Math operators**: `+`, `-`, `*`, `/`, `=`, `<`, `>`
- **Mathematical symbols**: `_`, `^` (subscript/superscript), `→`, `∞`, `±`, `≥`, `≤`
- **Numbers with operators**: `3 + 5`, `x^2`
- **Pure numbers**: `0`, `-1`, `3.14`
- **Variable equations**: `x=y`, `a<b`, `f>g`

## What stays unchanged?

- **Natural language**: `(about this topic)` – contains full words
- **Code blocks**: ` ```math content``` ` – never touched
- **Existing delimiters**: `$formula$` and `$$formula$$` – already correct
- **Non-math text**: `(hello world)` – no mathematical indicators

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