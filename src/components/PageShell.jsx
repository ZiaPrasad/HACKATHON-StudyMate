import React from "react";

export default function PageShell({ title, description, action, children }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">{title}</h1>
          {description && <p className="text-muted-foreground text-sm mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}