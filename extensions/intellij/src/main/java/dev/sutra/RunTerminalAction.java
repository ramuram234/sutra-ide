package dev.sutra;

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
    String cmd = Messages.showInputDialog(
        project,
        "Command (cmd.exe on Windows, zsh on macOS)",
        "Sutra",
        null);
    if (cmd == null || cmd.isBlank()) return;
    int pick = Messages.showYesNoCancelDialog(
        project,
        "Sutra wants to run:\n" + cmd,
        "Sutra",
        "Allow",
        "Deny",
        "Cancel",
        null);
    if (pick != Messages.YES) return;
    TerminalWidget widget = TerminalToolWindowManager.getInstance(project)
        .createShellWidget(project.getBasePath(), "Sutra", true, true);
    widget.sendCommandToExecute(cmd);
  }
}
