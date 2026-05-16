import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

type ChartFrameProps = {
  children: ReactElement;
  empty: boolean;
};

export function ChartFrame({ children, empty }: ChartFrameProps) {
  if (empty) {
    return <div className="empty-chart">No data yet</div>;
  }

  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
