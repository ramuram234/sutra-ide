package dev.sutra;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowFactory;
import com.intellij.ui.content.ContentFactory;
import javax.swing.JLabel;
import javax.swing.JPanel;
import java.awt.BorderLayout;

public class SutraToolWindow implements ToolWindowFactory {
  @Override
  public void createToolWindowContent(Project project, ToolWindow toolWindow) {
    JPanel panel = new JPanel(new BorderLayout());
    panel.add(new JLabel(" SUTRA — Tools → Write specs. Shell asks Allow / Deny."), BorderLayout.NORTH);
    toolWindow.getContentManager().addContent(
        ContentFactory.getInstance().createContent(panel, "", false));
  }
}
