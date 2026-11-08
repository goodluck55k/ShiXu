import { AppProvider } from "@/application/AppProvider";
import { HomeScreen } from "@/components/HomeScreen";

export default function Page() {
  return (
    <AppProvider>
      <HomeScreen />
    </AppProvider>
  );
}