'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setToken, setUser } from '../../../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    console.log("Submitting registration for:", formData.email);
    try {
      // Step 1: Register the user
      const registerRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
        }),
      });

      if (!registerRes.ok) {
        const errData = await registerRes.json();
        throw new Error(errData.detail || 'Registration failed.');
      }

      // Step 2: Auto-login after successful registration
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      if (!loginRes.ok) {
        setSuccess('Account created! Please sign in.');
        setTimeout(() => router.push('/auth/login'), 1500);
        return;
      }

      const tokenData = await loginRes.json();
      setToken(tokenData.access_token);
      setUser(tokenData.user);

      setSuccess('Account created! Redirecting...');
      setTimeout(() => router.push('/chat'), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-1">Create account</h2>
      <p className="text-[#9ca3af] text-sm mb-7">Join ARCHON and discover the best AI models for your workflow.</p>

      {error && (
        <div className="mb-5 p-3.5 bg-red-900/40 border border-red-500/50 text-red-300 text-sm rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-5 p-3.5 bg-green-900/40 border border-green-500/50 text-green-300 text-sm rounded-lg">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="full_name" className="block text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            placeholder="Ada Lovelace"
            value={formData.full_name}
            onChange={handleChange}
            className="w-full bg-[#0a0e27] border border-[#3b3d54] text-white placeholder-[#4b4d6a] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd] transition-all"
          />
        </div>

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
            placeholder="ada@example.com"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-[#0a0e27] border border-[#3b3d54] text-white placeholder-[#4b4d6a] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd] transition-all"
          />
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            placeholder="ada_lovelace"
            value={formData.username}
            onChange={handleChange}
            className="w-full bg-[#0a0e27] border border-[#3b3d54] text-white placeholder-[#4b4d6a] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd] transition-all"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Min. 8 characters"
            value={formData.password}
            onChange={handleChange}
            className="w-full bg-[#0a0e27] border border-[#3b3d54] text-white placeholder-[#4b4d6a] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd] transition-all"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirm_password" className="block text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            placeholder="Re-enter your password"
            value={formData.confirm_password}
            onChange={handleChange}
            className="w-full bg-[#0a0e27] border border-[#3b3d54] text-white placeholder-[#4b4d6a] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#9d4edd] focus:ring-1 focus:ring-[#9d4edd] transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-2 bg-gradient-to-r from-[#9d4edd] to-[#7b2cbf] hover:from-[#b16cf0] hover:to-[#9d4edd] text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-[#9ca3af] mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-[#ff6b35] hover:text-[#ff8555] font-semibold transition-colors">
          Sign in
        </Link>
      </p>
    </>
  );
}
