'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Chatbot } from '@/components/Chatbot';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50/50">
                <Sidebar />
                <main className="lg:ml-64 min-h-screen transition-all duration-300">
                    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
                <Chatbot />
            </div>
        </ProtectedRoute>
    );
}
