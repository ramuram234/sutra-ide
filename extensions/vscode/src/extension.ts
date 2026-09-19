import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("sutra.specs", new SpecsProvider()),
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
      const dir = vscode.Uri.joinPath(folder.uri, "specs");
      await vscode.workspace.fs.createDirectory(dir);
      const uri = vscode.Uri.joinPath(dir, "requirements.md");
      await vscode.workspace.fs.writeFile(uri, Buffer.from(`# requirements.md\n\n${prompt}\n`, "utf8"));
      await vscode.window.showTextDocument(uri);
    }),
    vscode.commands.registerCommand("sutra.runTasks", async () => {
      await vscode.commands.executeCommand("sutra.runInTerminal");
    }),
    vscode.commands.registerCommand("sutra.runInTerminal", async () => {
      const cmd = await vscode.window.showInputBox({
        title: "Sutra terminal",
        prompt: "Command the agent wants to run",
        placeHolder: process.platform === "win32" ? "dir" : "ls",
      });
      if (!cmd) return;
      const pick = await vscode.window.showInformationMessage(
        `Sutra wants to run a shell command:\n${cmd}`,
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

class SpecsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(el: vscode.TreeItem) {
    return el;
  }
  getChildren() {
    return [
      new vscode.TreeItem("requirements.md"),
      new vscode.TreeItem("design.md"),
      new vscode.TreeItem("tasks.md"),
    ];
  }
}

export function deactivate() {}
