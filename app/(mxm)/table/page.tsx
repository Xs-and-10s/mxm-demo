import { DataTable } from "@/components/DataTable";

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Machines</h1>
      <DataTable />
    </main>
  );
}