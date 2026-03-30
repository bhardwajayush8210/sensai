"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import { format } from "date-fns";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div
        style={{
          backgroundColor: "#111111",
          border: "1px solid #2a2a2a",
          borderRadius: "10px",
          padding: "10px 14px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
          minWidth: "120px",
        }}
      >
        <p
          style={{
            color: "#aaaaaa",
            fontSize: 11,
            margin: "0 0 4px 0",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {payload[0].payload.date}
        </p>
        <p
          style={{
            color: "#ffffff",
            fontSize: 20,
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {payload[0].value}%
        </p>
        <p
          style={{
            color: "#555",
            fontSize: 11,
            margin: "4px 0 0",
          }}
        >
          Quiz Score
        </p>
      </div>
    );
  }
  return null;
};

const CustomCursor = ({ points, height }) => {
  if (!points?.length) return null;
  const { x, y } = points[0];
  return (
    <line
      x1={x}
      y1={y}
      x2={x}
      y2={height}
      stroke="#444"
      strokeWidth={1}
      strokeDasharray="4 3"
    />
  );
};

export default function PerformanceChart({ assessments }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (assessments) {
      const formattedData = assessments.map((assessment) => ({
        date: format(new Date(assessment.createdAt), "MMM dd"),
        score: Math.round(assessment.quizScore),
      }));
      setChartData(formattedData);
    }
  }, [assessments]);

  return (
    <Card className="bg-black border-zinc-800">
      <CardHeader>
        <CardTitle className="gradient-title text-3xl md:text-4xl">
          Performance Trend
        </CardTitle>
        <CardDescription>Your quiz scores over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] bg-black rounded-md p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#666", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#666", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={<CustomCursor />}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#ffffff"
                strokeWidth={1.5}
                fill="url(#scoreGradient)"
                dot={{ r: 3, fill: "#ffffff", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#ffffff", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
