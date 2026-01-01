import {
  Cell,
  Pie,
  PieChart,
  PieLabelRenderProps,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// #endregion
const RADIAN = Math.PI / 180;
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A28FD0",
  "#FF6F91",
  "#FFD6E0",
  "#6B5B95",
  "#B8A9C9",
  "#F67280",
  "#C06C84",
  "#355C7D",
  "#2E8B57",
  "#F8B195",
  "#F67280",
  "#C06C84",
  "#355C7D",
  "#6C5B7B",
  "#99B898",
  "#FF847C",
  "#E84A5F",
  "#2A363B",
  "#FFB347",
  "#B5EAD7",
  "#FFDAC1",
  "#E2F0CB",
  "#B5EAD7",
  "#C7CEEA",
  "#FFB7B2",
  "#FF9AA2",
  "#B5EAD7",
  "#B28DFF",
  "#B5EAD7",
  "#B5EAD7",
  "#B5EAD7",
  "#B5EAD7",
];

const renderCustomizedLabel = ({
  name,
  percent,
}: {
  name?: string;
  percent?: number;
}) => {
  return `${name}: ${(percent ?? 0) * 100}%`;
};

export default function PieChartWithCustomizedLabel({
  isAnimationActive = true,
  stats,
}: {
  isAnimationActive?: boolean;
  stats: Record<string, number>;
}) {
  if (!stats || Object.keys(stats).length === 0) return null;
  const data = Object.entries(stats).map(([name, value]) => ({ name, value }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          labelLine={false}
          fill="#8884d8"
          isAnimationActive={isAnimationActive}
          innerRadius="70%"
          outerRadius="100%"
          // Corner radius is the rounded edge of each pie slice
          cornerRadius="4%"
          // padding angle is the gap between each pie slice
          paddingAngle={4}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value ?? 0} chats`, String(name)]}
        />
        {/* <Legend formatter={(value) => value as string} /> */}
      </PieChart>
    </ResponsiveContainer>
  );
}
