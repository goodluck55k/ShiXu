import { Suspense } from "react";
import { WishHouseScreen } from "@/components/wishes/WishHouseScreen";

export default function Page() {
  return <Suspense><WishHouseScreen /></Suspense>;
}