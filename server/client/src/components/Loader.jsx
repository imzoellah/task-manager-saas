import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function Loader() {
  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <Skeleton height={80} borderRadius={20} />
      <Skeleton height={80} borderRadius={20} />
      <Skeleton height={80} borderRadius={20} />
    </div>
  );
}