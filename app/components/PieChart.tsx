import {
  Cell,
  Pie,
  PieChart,
  PieLabelRenderProps,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: PieLabelRenderProps) => {
  const radius = (outerRadius as number) + 25; // Position outside the chart
  const x = (cx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
  const y = (cy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#333"
      textAnchor={x > (cx as number) ? "start" : "end"}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="600"
    >
      {`${((percent as number) * 100).toFixed(1)}%`}
    </text>
  );
};

export default function PieChartWithCustomizedLabel({
  isAnimationActive = true,
  stats,
  categoryColors,
}: {
  isAnimationActive?: boolean;
  stats: Record<string, number>;
  categoryColors?: Record<string, string>;
}) {
  if (!stats || Object.keys(stats).length === 0) return null;
  const data = Object.entries(stats).map(([name, value]) => ({ name, value }));

  // Function to get color for a category
  const getColor = (categoryName: string, index: number) => {
    if (categoryColors && categoryColors[categoryName]) {
      return categoryColors[categoryName];
    }
    return COLORS[index % COLORS.length];
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          labelLine={true}
          label={renderCustomizedLabel}
          fill="#8884d8"
          isAnimationActive={isAnimationActive}
          innerRadius="55%"
          outerRadius="75%"
          cornerRadius="2%"
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value ?? 0} chats`, String(name)]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
