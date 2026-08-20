import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ReactNode } from "react";

interface PerformanceCardProps {
  title: string;
  value: number;
  max?: number;
  description?: string;
  footer?: ReactNode;
}

export function PerformanceCard({ title, value, max = 10, description, footer }: PerformanceCardProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">{value.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">/ {max.toFixed(1)}</span>
        </div>
        <Progress value={pct} className="mt-3 h-2" />
        {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
        {footer && <div className="mt-3">{footer}</div>}
      </CardContent>
    </Card>
  );
}
