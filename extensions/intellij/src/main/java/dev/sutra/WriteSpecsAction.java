package dev.sutra;

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
      Files.writeString(file, "# requirements.md\n\n" + prompt, StandardCharsets.UTF_8);
      VfsUtil.markDirtyAndRefresh(true, true, true, dir.toFile());
    } catch (Exception ex) {
      Messages.showErrorDialog(project, ex.getMessage(), "Sutra");
    }
  }
}
