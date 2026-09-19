import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OpenFolderDialog({
  title,
  home,
  onCancel,
  onPick,
}: {
  title: string;
  home: string;
  onCancel: () => void;
  onPick: (folder: string, create: boolean) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form
        className="w-full max-w-md rounded-md bg-raised p-4 shadow-[var(--shadow-border)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          onPick(value.trim(), true);
        }}
      >
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted">
          Desktop app: native folder picker. In the browser, type a folder under{" "}
          <code className="text-fg">{home}</code>.
        </p>
        <Input
          autoFocus
          className="mt-3"
          placeholder="my-app"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Open</Button>
        </div>
      </form>
    </div>
  );
}
