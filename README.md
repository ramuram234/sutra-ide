# Sutra

Spec-driven AI IDE for Windows and macOS. Explorer, editor, chat, terminal with Allow / Deny, VS Code and IntelliJ extensions.

## Install desktop (Windows / Mac)

Installers are built by GitHub Actions.

1. Open **Actions → Release → Run workflow** (or push a tag `v0.1.0`).
2. Download artifacts:
   - Windows: `Sutra-Setup-*.exe` (NSIS) or portable exe
   - macOS: `Sutra-*-mac.dmg`
3. Run the installer. First launch starts the local Sutra server and opens the IDE window.

Local build (on that OS):

```bash
npm ci
npm run dist:win    # Windows
npm run dist:mac    # macOS
```

Outputs land in `release/`.

## VS Code extension

```bash
cd extensions/vscode
npm i
npx tsc -p .
npx @vscode/vsce package --allow-missing-repository --skip-license
```

In VS Code: Extensions → … → **Install from VSIX**.

Or take the `.vsix` from the **vscode-vsix** Action artifact.

## IntelliJ / WebStorm

```bash
cd extensions/intellij
gradle buildPlugin
```

**Settings → Plugins → Install Plugin from Disk** → zip in `build/distributions/`.

## Web studio (this preview)

```bash
npm ci
npm run dev
```

Chat: describe a module (any language: Python, Java, Go, C#, PHP, Rust, Ruby, Kotlin, React). Specs first, or **Vibe**. Terminal commands need Allow.

**Alt+K** keyboard shortcuts editor. **Alt+P** command palette.

## Repo

https://github.com/ramuram234/sutra-ide
