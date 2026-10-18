'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/types';
import { SIT_DEPARTMENTS } from '@/lib/constants/departments';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'reviewer',
    department: '',
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setFormData({ full_name: '', email: '', mobile: '', password: '', role: 'admin', department: '' });
        setMessage(`Account '${data.user.email}' created successfully.`);
        fetchUsers();
      } else {
        alert(data.error?.message || 'Failed to create user');
      }
    } catch {
      alert('Error creating staff user');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-xs text-gray-600">
        Loading staff accounts...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Portal Access Control
          </div>
          <h1 className="text-xl font-bold text-[#AC3D47]">
            Manage Reviewers & Administrators
          </h1>
          <div className="text-xs text-gray-600">
            Create staff accounts for HoDs, Proctors, Accounts Officers, and Committee Members.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="gov-btn gov-btn-primary text-xs"
        >
          + Add New Staff User
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-gray-300 mb-6 flex gap-4 text-xs font-bold text-gray-700">
        <Link href="/admin" className="pb-2 hover:text-[#AC3D47]">Overview</Link>
        <Link href="/admin/applications" className="pb-2 hover:text-[#AC3D47]">All Applications</Link>
        <Link href="/admin/merit" className="pb-2 hover:text-[#AC3D47]">Merit Evaluation Roster</Link>
        <Link href="/admin/scholarships" className="pb-2 hover:text-[#AC3D47]">Scholarships & Deadlines</Link>
        <Link href="/admin/users" className="pb-2 border-b-2 border-[#AC3D47] text-[#AC3D47]">Staff Users</Link>
        <Link href="/admin/audit" className="pb-2 hover:text-[#AC3D47]">Audit Log</Link>
      </div>

      {message && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 p-3 text-xs text-emerald-800 font-bold">
          {message}
        </div>
      )}

      {/* Users Table */}
      <div className="border border-gray-300 bg-white">
        <div className="gov-header-bar flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide">
            Registered Portal Users ({users.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                <th className="p-3 font-bold border-r border-gray-200">Full Name</th>
                <th className="p-3 font-bold border-r border-gray-200">Email ID</th>
                <th className="p-3 font-bold border-r border-gray-200">Mobile</th>
                <th className="p-3 font-bold border-r border-gray-200">System Role</th>
                <th className="p-3 font-bold">Registered On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-3 font-bold text-gray-900 border-r border-gray-200">
                    {u.full_name}
                  </td>
                  <td className="p-3 font-mono border-r border-gray-200 text-[#AC3D47]">
                    {u.email}
                  </td>
                  <td className="p-3 font-mono border-r border-gray-200 text-gray-700">
                    {u.mobile || 'N/A'}
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : u.role === 'reviewer'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-gray-100 text-gray-800 border-gray-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">
                    {new Date(u.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="gov-card max-w-md w-full p-6 bg-white border-2 border-[#AC3D47]">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <h3 className="font-bold text-[#AC3D47] text-sm uppercase">Create Staff Account</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-black font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name & Designation</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Dr. K. S. Shashishekar (HoD CSE)"
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">College Email ID</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. staff@example.com"
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="9845012345"
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Account Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="gov-input"
                >
                  <option value="reviewer">Reviewer (Department Faculty / HoD)</option>
                  <option value="admin">College Administrator</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {formData.role === 'reviewer' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Assigned Department <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="gov-input"
                  >
                    <option value="">-- Select Controlled Department --</option>
                    {SIT_DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Reviewers can strictly access applications matching this specific department.
                  </p>
                </div>
              )}

              {formData.role === 'student' ? (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Temporary password"
                    className="gov-input"
                  />
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 p-2.5 text-[11px] text-blue-900 leading-relaxed">
                  <strong>Invite-by-Email:</strong> An invitation link will be sent to the staff member via Supabase Auth so they can choose their own secure password directly.
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="gov-btn gov-btn-secondary text-xs flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gov-btn gov-btn-primary text-xs flex-1 font-bold"
                >
                  {formData.role === 'student' ? 'Create Account' : 'Send Staff Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
