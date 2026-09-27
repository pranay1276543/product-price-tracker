import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PriceHistory({ history }) {
  if (history.length === 0) {
    return <p className="text-sm text-gray-500">No successful scrapes yet.</p>;
  }

  const chartData = history.map((entry) => ({
    time: new Date(entry.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    price: Number(entry.price),
  }));

  return (
    <div className="space-y-4">
      <div className="h-56 border border-gray-200 rounded bg-white p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-gray-200 rounded bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Timestamp</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...history].reverse().map((entry) => (
              <tr key={entry.id}>
                <td className="px-3 py-2">{new Date(entry.timestamp).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">₹{Number(entry.price).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">{entry.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
