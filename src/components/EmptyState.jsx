import React from "react";

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {Icon && <Icon className="w-9 h-9 text-muted-foreground/40 mb-3" aria-hidden="true" />}
      <p className="font-medium text-sm">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{hint}</p>}
    </div>
  );
}