'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUser, isAuthenticated, setUser } from '../../lib/auth';
import { getMyReviews, updateProfile, Review } from '../services/api';

export default function ProfilePage() {
  const [user, setCurrentUser] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', username: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/auth/login';
      return;
    }

    const fetchData = async () => {
      try {
        const userData = getUser();
        setCurrentUser(userData);
        setFormData({
          full_name: (userData.full_name as string) || '',
          username: (userData.username as string) || '',
          email: (userData.email as string) || '',
        });

        const userReviews = await getMyReviews();
        setReviews(userReviews);
      } catch (err) {
        console.error('Error fetching profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedUser = await updateProfile(formData);
      setUser(updatedUser);
      setCurrentUser(updatedUser);
      setEditing(false);
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setMsg('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3b82f6]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f172a] text-white font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-[#94a3b8] hover:text-white flex items-center gap-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back Home
          </Link>
          <h1 className="text-2xl font-bold">User Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-[#1e293b] rounded-2xl border border-[#334155] overflow-hidden shadow-2xl relative">
          <div className="h-2 w-full bg-gradient-to-r from-[#3b82f6] to-[#9333ea]" />
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#9333ea] flex items-center justify-center text-3xl font-bold shadow-lg shrink-0">
                {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                {!editing ? (
                  <>
                    <h2 className="text-3xl font-extrabold text-white">{user?.full_name}</h2>
                    <p className="text-[#94a3b8] mt-1">@{user?.username}</p>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                      <div className="flex items-center gap-2 text-[#64748b]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {user?.email}
                      </div>
                      <div className="flex items-center gap-2 text-[#64748b]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {user?.is_verified ? 'Verified Account' : 'Unverified'}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      className="mt-6 px-6 py-2 bg-[#334155] hover:bg-[#475569] border border-[#475569] text-white rounded-xl transition-all font-medium"
                    >
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleSave} className="space-y-4 max-w-md mx-auto md:mx-0">
                    <div className="grid grid-cols-1 gap-4 text-left">
                      <div>
                        <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                        <input
                          type="text"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-2.5 outline-none focus:border-[#3b82f6] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5 ml-1">Username</label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-2.5 outline-none focus:border-[#3b82f6] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5 ml-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-2.5 outline-none focus:border-[#3b82f6] transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-gradient-to-r from-[#3b82f6] to-[#9333ea] hover:from-[#2563eb] hover:to-[#7c3aed] text-white rounded-xl font-bold transition-all disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="px-6 py-2.5 bg-[#334155] hover:bg-[#475569] text-white rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {msg && <p className={`mt-4 text-sm font-medium ${msg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg className="w-5 h-5 text-[#ff6b35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Your Activity & Reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <div className="bg-[#1e293b] rounded-2xl border-2 border-dashed border-[#334155] p-12 text-center">
              <p className="text-[#64748b]">You haven't posted any reviews yet.</p>
              <Link href="/" className="inline-block mt-4 text-[#3b82f6] hover:underline">Explore AI models to review</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reviews.map((r) => (
                <div key={r.id} className="bg-[#1e293b] rounded-2xl border border-[#334155] p-6 hover:border-[#475569] transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-lg">{'⭐'.repeat(Math.round(r.rating))}</div>
                    <span className="text-xs text-[#64748b] bg-[#0f172a] px-3 py-1 rounded-lg border border-[#334155]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[#cbd5e1] leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
