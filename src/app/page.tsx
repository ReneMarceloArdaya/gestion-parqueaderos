'use client'
import { Header } from "@/components/shared";
import { ParkingMap } from "./Components/map/praking-map";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <ParkingMap />
      </main>
    </div>
  );
}
