import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankCardProps {
  rank: number;
  name: string;
  department: string;
  cgpa: number;
}

const podium = [
  { icon: Trophy, gradient: "from-yellow-400 to-amber-500" },
  { icon: Medal, gradient: "from-slate-300 to-slate-500" },
  { icon: Award, gradient: "from-amber-600 to-amber-800" },
];

export function RankCard({ rank, name, department, cgpa }: RankCardProps) {
  const meta = podium[rank - 1];
  return (
    <Card className="relative overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {meta ? (
            <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md", meta.gradient)}>
              <meta.icon className="h-7 w-7" />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-lg font-semibold">
              #{rank}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rank #{rank}</p>
            <p className="truncate text-lg font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{department}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-primary">{cgpa.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">CGPA</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
