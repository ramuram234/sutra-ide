export const VSCODE_PACKAGE = `{
  "name": "sutra-ide",
  "displayName": "Sutra",
  "description": "Spec-driven AI coding: requirements, design, tasks, then generate.",
  "version": "0.1.0",
  "engines": { "vscode": "^1.90.0" },
  "activationEvents": ["onCommand:sutra.writeSpecs", "onView:sutra.specs"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      { "command": "sutra.writeSpecs", "title": "Sutra: Write specs" },
      { "command": "sutra.runTasks", "title": "Sutra: Run tasks" },
      { "command": "sutra.runInTerminal", "title": "Sutra: Run command in terminal" }
    ],
    "keybindings": [
      { "command": "sutra.writeSpecs", "key": "ctrl+shift+s", "mac": "cmd+shift+s" }
    ],
    "viewsContainers": {
      "activitybar": [{ "id": "sutra", "title": "Sutra", "icon": "media/sutra.svg" }]
    },
    "views": {
      "sutra": [{ "id": "sutra.specs", "name": "Specs" }]
    }
  }
}`;

export const VSCODE_EXT = `import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("sutra.writeSpecs", async () => {
      const prompt = await vscode.window.showInputBox({
        title: "Sutra",
        prompt: "What should we build?",
      });
      if (!prompt) return;
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        vscode.window.showErrorMessage("Open a folder first.");
        return;
      }
      const uri = vscode.Uri.joinPath(folder.uri, "specs", "requirements.md");
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder.uri, "specs"));
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from("# requirements.md\\n\\n" + prompt, "utf8"),
      );
      await vscode.window.showTextDocument(uri);
    }),
    vscode.commands.registerCommand("sutra.runInTerminal", async () => {
      const cmd = await vscode.window.showInputBox({
        title: "Sutra terminal",
        prompt: "Command the agent wants to run",
        placeHolder: process.platform === "win32" ? "dir" : "ls",
      });
      if (!cmd) return;
      const pick = await vscode.window.showInformationMessage(
        \`Sutra wants to run a shell command:\\n\${cmd}\`,
        { modal: true },
        "Allow",
        "Always allow this workspace",
        "Deny",
      );
      if (pick === "Deny" || !pick) return;
      const term =
        vscode.window.terminals.find((t) => t.name === "Sutra") ??
        vscode.window.createTerminal({
          name: "Sutra",
          shellPath: process.platform === "win32" ? "cmd.exe" : "/bin/zsh",
        });
      term.show();
      term.sendText(cmd);
    }),
  );
}

export function deactivate() {}
`;

export const INTELLIJ_PLUGIN = `<idea-plugin>
  <id>dev.sutra.ide</id>
  <name>Sutra</name>
  <vendor>Sutra</vendor>
  <description>Spec-driven AI coding for IntelliJ IDEA and WebStorm on Windows and macOS.</description>
  <depends>com.intellij.modules.platform</depends>
  <actions>
    <action id="Sutra.WriteSpecs" class="dev.sutra.WriteSpecsAction"
            text="Sutra: Write specs" description="Generate requirements.md">
      <add-to-group group-id="ToolsMenu" anchor="last"/>
      <keyboard-shortcut keymap="$default" first-keystroke="control shift S"/>
      <keyboard-shortcut keymap="Mac OS X" first-keystroke="meta shift S"/>
    </action>
    <action id="Sutra.RunTerminal" class="dev.sutra.RunTerminalAction"
            text="Sutra: Run command in terminal" description="Execute in cmd.exe or Terminal">
      <add-to-group group-id="ToolsMenu" anchor="last"/>
    </action>
  </actions>
  <extensions defaultExtensionNs="com.intellij">
    <toolWindow id="Sutra" anchor="right" factoryClass="dev.sutra.SutraToolWindow"/>
  </extensions>
</idea-plugin>`;

export const INTELLIJ_ACTION = `package dev.sutra;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.ui.Messages;
import com.intellij.openapi.vfs.VfsUtil;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class WriteSpecsAction extends AnAction {
  @Override
  public void actionPerformed(AnActionEvent e) {
    var project = e.getProject();
    if (project == null || project.getBasePath() == null) return;
    String prompt = Messages.showInputDialog(project, "What should we build?", "Sutra", null);
    if (prompt == null || prompt.isBlank()) return;
    try {
      Path dir = Path.of(project.getBasePath(), "specs");
      Files.createDirectories(dir);
      Path file = dir.resolve("requirements.md");
      Files.writeString(file, "# requirements.md\\n\\n" + prompt, StandardCharsets.UTF_8);
      VfsUtil.markDirtyAndRefresh(true, true, true, dir.toFile());
    } catch (Exception ex) {
      Messages.showErrorDialog(project, ex.getMessage(), "Sutra");
    }
  }
}
`;

export const INTELLIJ_TERMINAL = `package dev.sutra;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.ui.Messages;
import com.intellij.terminal.ui.TerminalWidget;
import org.jetbrains.plugins.terminal.TerminalToolWindowManager;

public class RunTerminalAction extends AnAction {
  @Override
  public void actionPerformed(AnActionEvent e) {
    var project = e.getProject();
    if (project == null) return;
    String cmd = Messages.showInputDialog(project, "Command (cmd.exe on Windows, zsh on macOS)", "Sutra", null);
    if (cmd == null || cmd.isBlank()) return;
    TerminalWidget widget = TerminalToolWindowManager.getInstance(project).createShellWidget(project.getBasePath(), "Sutra", true, true);
    widget.sendCommandToExecute(cmd);
  }
}
`;
