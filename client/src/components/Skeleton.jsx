export default function Skeleton({ width = '100%', height = '16px', rounded = false }) {
  return (
    <div
      className={`bg-gray-100 animate-pulse ${rounded ? 'rounded-full' : 'rounded'}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border rounded p-4">
          <Skeleton width="60%" height="12px" />
          <div className="mt-3">
            <Skeleton width="40%" height="28px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonClientRow() {
  return (
    <tr className="border-t border-gray-200">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton width="36px" height="36px" rounded />
          <div className="flex-1">
            <Skeleton width="60%" height="12px" />
            <div className="mt-1.5">
              <Skeleton width="40%" height="10px" />
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><Skeleton width="120px" height="10px" /></td>
      <td className="px-4 py-3"><Skeleton width="80px" height="10px" /></td>
      <td className="px-4 py-3"><Skeleton width="60px" height="10px" /></td>
      <td className="px-4 py-3"><Skeleton width="50px" height="18px" /></td>
    </tr>
  );
}

export function SkeletonChart() {
  return <Skeleton width="100%" height="160px" />;
}
