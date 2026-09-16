import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Generic record form driven by a field config. Fields:
// { name, label, type: "text"|"date"|"time"|"number"|"select"|"textarea",
//   options?: string[], required?, full?, placeholder? }

export default function RecordForm({ fields, initial = {}, onSubmit, onCancel, submitLabel = "Save" }) {
  const [values, setValues] = useState(() => {
    const v = {};
    for (const f of fields) v[f.name] = initial[f.name] != null ? String(initial[f.name]) : "";
    return v;
  });
  const [busy, setBusy] = useState(false);

  const set = (name, val) => setValues((v) => ({ ...v, [name]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {};
    for (const f of fields) {
      const val = values[f.name];
      if (val === "" || val == null) {
        if (f.required) return;
        continue;
      }
      payload[f.name] = f.type === "number" ? Number(val) : val;
    }
    setBusy(true);
    try {
      await onSubmit(payload);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((f) => (
        <div key={f.name} className={f.full ? "sm:col-span-2" : ""}>
          <Label htmlFor={"field-" + f.name}>
            {f.label}
            {f.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {f.type === "select" ? (
            <Select value={values[f.name] || undefined} onValueChange={(v) => set(f.name, v)}>
              <SelectTrigger id={"field-" + f.name}>
                <SelectValue placeholder={f.placeholder || "Select"} />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : f.type === "textarea" ? (
            <Textarea
              id={"field-" + f.name}
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
              placeholder={f.placeholder}
              rows={3}
            />
          ) : (
            <Input
              id={"field-" + f.name}
              type={f.type || "text"}
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
              placeholder={f.placeholder}
            />
          )}
        </div>
      ))}
      <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}