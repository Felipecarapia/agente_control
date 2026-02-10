"use client";

import ActionsBankDashboard from "@/components/analytics/ActionsBankDashboard";

export default function ActionsBankPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Banco de Ações e Performance
                </h2>
            </div>
            <ActionsBankDashboard />
        </div>
    );
}
