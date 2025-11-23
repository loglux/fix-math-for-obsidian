# Fix Math for Obsidian

A simple Obsidian plugin with a button and command to fix LaTeX math delimiters in your notes. It converts `\[…\]` → `$$…$$` and `\(…\)` → `$…$`, while ignoring code blocks (` ```…``` ` and `~~~…~~~`).

## Why This Plugin?

When you copy content with mathematical formulas from **ChatGPT**, **OpenWebUI**, or other AI assistants into Obsidian, the math often comes in LaTeX format using `\(…\)` for inline math and `\[…\]` for display math. However, Obsidian uses `$…$` and `$$…$$` delimiters.

Instead of manually finding and replacing each formula, just click one button and all math delimiters in your note will be fixed automatically! 🪄

## Why another LaTeX converter?

While there are other plugins for converting LaTeX delimiters, this one focuses on:

- **Simplicity** – a single command that only touches what is obviously maths.
- **Transparency** – a small, readable TypeScript codebase.
- **Safety** – leaves code blocks, existing `$…$` and non-math text alone.

## Features

- **Ribbon button** on the sidebar for quick access.
- **Command palette** integration: “Fix math (current file)”.
- Works only on the **currently open file**.
- Does not touch existing `$…$` and `$$…$$` delimiters.
- Preserves all content inside fenced code blocks.
- Detects maths in plain parentheses, including typical cases like:
    - `(x\to 1)`
    - `(0/0)`
    - `(3x^{2} - 3 = 0)`
    - `(3x^{2} - 3)'`, `(3x^{2} - 2x - 1)'`

## Supported conversions

| Input format                                         | Detected as | Output format |     |
| ---------------------------------------------------- | ----------- | ------------- | --- |
| `\(...\)`                                            | inline      | `$...$`       |     |
| `\[...\]`                                            | block       | `$$...$$`     |     |
| `[ ... ]` *(if on separate lines and contains math)* | block       | `$$...$$`     |     |
| `( ... )` *(if contains math)*                       | inline      | `$...$`       |     |
| ` ```...``` ` or `~~~...~~~`                         | code block  | unchanged     |     |
|                                                      |             |               |     |
|                                                      |             |               |     |

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

- Copy `manifest.json` and the built `main.js` into your vault’s plugin folder:  
  `.obsidian/plugins/fix-math/`.

## How to Use

1. Open the Markdown file you want to fix in Obsidian
2. Either:
    - Click the **wand icon** (🪄) in the left ribbon, or
    - Open Command Palette (`Ctrl/Cmd+P`) and run **"Fix math for Obsidian (current file)"**
3. You'll see a notification:
    - "Done: formulas fixed" if changes were made
    - "No changes required" if nothing needed fixing
    - "Error: failed to process file (see console)" if something went wrong

## Keyboard shortcut

The plugin does not set a default hotkey, but you can add one yourself:

1. Open **Settings → Hotkeys**.
2. Search for **“Fix math (current file)”**.
3. Assign any shortcut you like, for example <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd>.

This makes it very convenient to fix maths in the current note with a single key press.

## Examples

**Before:**


This is inline math \(x^2 + y^2 = z^2\) in text.

Display math:  
\[  
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}  
\]

And a mixed example:  
(0/0) is an indeterminate form, and (3x2−3)′=6x(3x^{2}-3)' = 6x(3x2−3)′=6x.


**After:**

This is inline math $x^2 + y^2 = z^2$ in text.

Display math:

$$  
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}  
$$

And the mixed example:

$0/0$ is an indeterminate form, and $(3x^{2}-3)' = 6x$.


---  

## Customisation

By default, block maths is wrapped as:

```tex
$$
... 
$$
```

If you prefer display formulae without extra blank lines around $$, you can tweak the convertMath() implementation in main.ts (or the compiled main.js) to change how block maths is wrapped..

## Licence
MIT
