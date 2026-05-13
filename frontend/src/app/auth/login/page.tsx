'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setToken, setUser } from '../../../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Invalid email or password.');
      }

      const data = await res.json();
      setToken(data.access_token);
      setUser(data.user);
      router.push('/chat');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
      <p className="text-[#9ca3af] text-sm mb-7">Sign in to continue exploring the best AI models.</p>

      {error && (
        <div className="mb-5 p-3.5 bg-red-900/40 border border-red-500/50 text-red-300 text-sm rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-[#0a0e27] border border-[#3b3d54] text-white placeholder-[#4b4d6a] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-all"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">
              Password
            </label>
            <Link href="#" className="text-xs text-[#9d4edd] hover:text-[#b16cf0] transition-colors">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Your password"
            value={formData.password}
            onChange={handleChange}
            className="w-full bg-[#0a0e27] border border-[#3b3d54] text-white placeholder-[#4b4d6a] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-2 bg-gradient-to-r from-[#ff6b35] to-[#e55a2b] hover:from-[#ff8555] hover:to-[#ff6b35] text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-[#2a2b3d] text-center">
        <p className="text-sm text-[#9ca3af]">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-[#9d4edd] hover:text-[#b16cf0] font-semibold transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </>
  );
}
