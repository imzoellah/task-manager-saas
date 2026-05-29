import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function SkeletonCard() {
  return (
    <div className="task-card">
      <Skeleton height={20} borderRadius={8} />
      <Skeleton height={14} width={120} borderRadius={8} />
    </div>
  );
}