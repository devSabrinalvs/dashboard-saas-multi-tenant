"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TasksByMemberItem } from "@/features/dashboard/hooks/use-analytics";

interface Props {
  data: TasksByMemberItem[];
}

export function TasksByMemberChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        barSize={10}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
        />
        <YAxis
          type="category"
          dataKey="membro"
          width={72}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
          tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 10) + "…" : v)}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
          }}
          cursor={{ fill: "hsl(var(--muted))" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value) => (value === "tarefas" ? "Total" : "Concluídas")}
        />
        <Bar dataKey="tarefas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} opacity={0.85} />
        <Bar dataKey="concluidas" fill="#22c55e" radius={[0, 4, 4, 0]} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}
