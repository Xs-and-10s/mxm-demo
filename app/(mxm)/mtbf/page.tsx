// app/demo/mtbf/page.tsx (Next.js App Router)
import MtbfChart from "@/components/MtbfChart";

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Reliability</h1>
      <MtbfChart />
    </main>
  );
}
