import React from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0e27] flex flex-col items-center justify-center p-4 font-sans">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="group inline-block">
          <h1 className="text-4xl font-bold text-white tracking-tight group-hover:text-[#ff6b35] transition-colors">
            ARCHON
          </h1>
        </Link>
        <p className="text-[#9ca3af] text-sm mt-1 font-medium">AI Recommendation System</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-[#1e1f2e] border border-[#2a2b3d] rounded-2xl shadow-2xl p-8">
        {children}
      </div>

      <p className="mt-6 text-xs text-[#6b7280]">
        &copy; {new Date().getFullYear()} ARCHON Beta &bull; All rights reserved
      </p>
    </div>
  );
}
