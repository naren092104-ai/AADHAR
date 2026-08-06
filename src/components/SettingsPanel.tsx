import type { AppSettings } from "@/types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";

interface Props {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const OPTIONS: Array<{ key: keyof AppSettings; label: string; hint: string }> = [
  { key: "autoEnhance", label: "Auto enhancement", hint: "Deskew, denoise, sharpen, 300 DPI" },
  { key: "autoOcr", label: "Auto OCR", hint: "Detect Aadhaar numbers automatically" },
  { key: "autoMask", label: "Auto mask", hint: "Black out the first 8 digits" },
  { key: "compression", label: "Compression", hint: "Target output under 1 MB" },
];

export function SettingsPanel({ settings, onChange, theme, onToggleTheme }: Props) {
  return (
    <section aria-labelledby="settings-heading" className="surface-card p-5">
      <h2 id="settings-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Settings
      </h2>
      <div className="mt-4 space-y-4">
        {OPTIONS.map((option) => (
          <div key={option.key} className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor={`setting-${option.key}`} className="text-sm font-medium">
                {option.label}
              </Label>
              <p className="text-xs text-muted-foreground">{option.hint}</p>
            </div>
            <Switch
              id={`setting-${option.key}`}
              checked={settings[option.key]}
              onCheckedChange={(checked) => onChange({ ...settings, [option.key]: checked })}
            />
          </div>
        ))}
        <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
          <div>
            <Label htmlFor="setting-theme" className="text-sm font-medium">
              Dark mode
            </Label>
            <p className="text-xs text-muted-foreground">High-contrast interface for low light</p>
          </div>
          <div className="flex items-center gap-2">
            {theme === "dark" ? (
              <Moon className="size-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Sun className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            <Switch id="setting-theme" checked={theme === "dark"} onCheckedChange={onToggleTheme} />
          </div>
        </div>
      </div>
    </section>
  );
}
