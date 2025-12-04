
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function VacacionesPage() {

  // This is a placeholder. The full implementation will be done in subsequent steps.
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-bold tracking-tight">Panel de Vacaciones</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Una vista general de las ausencias del personal.
            </p>
        </div>
        <Link href="/vacaciones/programar">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Programar Ausencia
            </Button>
        </Link>
      </div>

       <div className="border border-dashed rounded-lg p-12 text-center">
        <p className="text-muted-foreground">El calendario y los KPIs se implementarán aquí.</p>
       </div>

    </div>
  );
}
