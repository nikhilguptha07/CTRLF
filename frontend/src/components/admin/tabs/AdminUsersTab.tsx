import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'SUPER ADMIN' | 'SECURITY MANAGER' | 'OPERATOR' | 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'DISABLED';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export const AdminUsersTab: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create user form
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'OPERATOR',
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminUsers({
        search,
        role: roleFilter,
        status: statusFilter,
        page,
        limit: 10,
      });
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.createAdminUser(createForm);
      setShowCreateModal(false);
      setCreateForm({ username: '', email: '', password: '', fullName: '', role: 'OPERATOR' });
      await fetchUsers();
    } catch (err: any) {
      alert(`User creation failed: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (newRole: 'SUPER ADMIN' | 'SECURITY MANAGER' | 'OPERATOR' | 'ADMIN' | 'USER') => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await apiClient.updateAdminUser(editingUser.id, { role: newRole });
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      alert(`Role update failed: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserRecord) => {
    const nextStatus = user.isActive ? 'DISABLED' : 'ACTIVE';
    try {
      await apiClient.updateAdminUser(user.id, { status: nextStatus });
      await fetchUsers();
    } catch (err: any) {
      alert(`Status update failed: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans text-slate-100">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by username, email, name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="USER">USER</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>

          <button
            type="button"
            onClick={fetchUsers}
            title="Refresh Users"
            className="p-2 rounded-xl bg-[#161e2e] hover:bg-[#1e2a3f] border border-[#1a2536] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00c4df]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#00c4df] hover:bg-[#00b2cb] text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#00c4df]" />
            <p className="text-xs uppercase font-mono font-semibold">Loading user accounts...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold font-mono">{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <Users className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">No user accounts found.</p>
            <p className="text-[11px] text-slate-500">Try adjusting search query or role filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a2536] bg-[#161e2e]/80 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141c2b]">
                {users.map((u) => (
                  <tr 
                    key={u.id}
                    className="hover:bg-[#161e2e]/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-white">
                      {u.username}
                      <span className="block text-[10px] font-normal text-slate-400">{u.fullName}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.role === 'ADMIN' || u.role === 'SUPER ADMIN'
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : u.role === 'OPERATOR' || u.role === 'SECURITY MANAGER'
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.isActive
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="px-2.5 py-1 rounded-lg bg-[#161e2e] hover:bg-[#1e2a3f] border border-[#1a2536] text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Edit Role
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                          u.isActive
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        <div className="p-3.5 px-4 bg-[#161e2e]/50 border-t border-[#1a2536] flex items-center justify-between text-xs text-slate-400">
          <span>Total: <strong className="text-white">{total}</strong> users</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg bg-[#0f1520] border border-[#1a2536] text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg bg-[#0f1520] border border-[#1a2536] text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0f1520] border border-[#1a2536] rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1a2536] pb-3">
              <h3 className="text-base font-bold text-white">Create System User</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="Officer Jane Doe"
                  className="w-full px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="officer@ctrlf.local"
                  className="w-full px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Username (Optional)</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="jane_doe"
                  className="w-full px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
                >
                  <option value="SUPER ADMIN">SUPER ADMIN (Full Console & Retention Administration)</option>
                  <option value="SECURITY MANAGER">SECURITY MANAGER (Investigations, Cameras, Alerts)</option>
                  <option value="OPERATOR">OPERATOR (Surveillance & Find Object Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#161e2e] text-slate-300 hover:text-white border border-[#1a2536] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#00c4df] hover:bg-[#00b2cb] text-slate-950 font-bold transition-all shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#0f1520] border border-[#1a2536] rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1a2536] pb-3">
              <h3 className="text-base font-bold text-white">Edit User Role</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="text-slate-300">
                Update access role for <strong className="text-white">{editingUser.email}</strong>:
              </p>
              <p className="text-[11px] text-slate-400 font-mono">Current Role: {editingUser.role}</p>
            </div>

            <div className="space-y-2 pt-1">
              {(['SUPER ADMIN', 'SECURITY MANAGER', 'OPERATOR'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleUpdateRole(r)}
                  disabled={isSubmitting || r === editingUser.role}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-bold border transition-all cursor-pointer ${
                    r === editingUser.role
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/50 shadow-xs'
                      : 'bg-[#161e2e] hover:bg-[#1e2a3f] border-[#1a2536] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{r}</span>
                    {r === editingUser.role && <CheckCircle2 className="w-4 h-4 text-[#00c4df]" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl bg-[#161e2e] text-slate-300 hover:text-white border border-[#1a2536] text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
