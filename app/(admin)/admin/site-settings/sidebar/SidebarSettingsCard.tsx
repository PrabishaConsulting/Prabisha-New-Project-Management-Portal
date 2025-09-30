"use client";

import { useEffect, useMemo, useState } from "react";
import { useSidebarSettings } from "@/hooks/useSidebarSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SidebarSettingsCard() {
  const { settings, mutate, isLoading } = useSidebarSettings();
  const [saving, setSaving] = useState(false);

  const [spacingPreset, setSpacingPreset] = useState<"NONE"|"SM"|"MD"|"LG">("MD");
  const [spacingPx, setSpacingPx] = useState<number | undefined>(undefined);
  const [accordionMode, setAccordionMode] = useState<"NONE"|"SINGLE"|"MULTI">("SINGLE");
  const [compact, setCompact] = useState(false);
  const [showGroupTitles, setShowGroupTitles] = useState(true);
  const [iconSize, setIconSize] = useState<"SM"|"MD"|"LG">("MD");

  useEffect(() => {
    if (settings) {
      setSpacingPreset(settings.spacingPreset ?? "MD");
      setSpacingPx(settings.spacingPx ?? undefined);
      setAccordionMode(settings.accordionMode ?? "SINGLE");
      setCompact(!!settings.compact);
      setShowGroupTitles(settings.showGroupTitles ?? true);
      setIconSize(settings.iconSize ?? "MD");
    }
  }, [settings]);

  const canSave = useMemo(() => !!settings, [settings]);

  const onSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/site-settings/sidebar/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spacingPreset, spacingPx: spacingPx ?? null, accordionMode, compact, showGroupTitles, iconSize }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const json = await res.json();
      await mutate(json.data, false);
      toast.success("Sidebar settings saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="md:col-span-3">
      <CardHeader>
        <CardTitle>Sidebar Settings</CardTitle>
        <CardDescription>Control spacing, accordion behavior, and compact style.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Accordion mode</Label>
          <Select value={accordionMode} onValueChange={(v) => setAccordionMode(v as any)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None (always expanded)</SelectItem>
              <SelectItem value="SINGLE">Single-open (one at a time)</SelectItem>
              <SelectItem value="MULTI">Multi-open</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Group spacing preset</Label>
          <Select value={spacingPreset} onValueChange={(v) => setSpacingPreset(v as any)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="SM">Small</SelectItem>
              <SelectItem value="MD">Medium</SelectItem>
              <SelectItem value="LG">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Custom spacing (px)</Label>
          <Input type="number" value={spacingPx ?? ""} onChange={(e) => setSpacingPx(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="Override preset" />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={compact} onCheckedChange={setCompact} />
          <Label>Compact mode</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={showGroupTitles} onCheckedChange={setShowGroupTitles} />
          <Label>Show group titles</Label>
        </div>

        <div className="space-y-2">
          <Label>Icon size</Label>
          <Select value={iconSize} onValueChange={(v) => setIconSize(v as any)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SM">Small</SelectItem>
              <SelectItem value="MD">Medium</SelectItem>
              <SelectItem value="LG">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3">
          <Button className="dark:bg-white" onClick={onSave} disabled={!canSave || saving}>{saving ? "Saving..." : "Save Settings"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}