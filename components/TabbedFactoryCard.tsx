"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MachinesDashboard from "@/components/MachinesDashboard";
import WorkOrdersDashboard from "@/components/WorkOrdersDashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function TabbedFactoryCard() {
  return (
    <Card>
      {/* No CardHeader per request */}
      <CardContent>
        <Tabs defaultValue="machines" className="w-full">
          <TabsList className="mb-0 grid w-full grid-cols-4">
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="workorders">Work Orders</TabsTrigger>
            <TabsTrigger value="monday">Monday</TabsTrigger>
            <TabsTrigger value="mor">MOR</TabsTrigger>
          </TabsList>

          <TabsContent value="machines" className="mt-0">
            <MachinesDashboard />
          </TabsContent>

          <TabsContent value="workorders" className="mt-0">
            <WorkOrdersDashboard />
          </TabsContent>

          <TabsContent value="monday" className="mt-0">
            <Skeleton className="h-[480px] w-full" />
          </TabsContent>

          <TabsContent value="mor" className="mt-0">
            <Skeleton className="h-[480px] w-full" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
