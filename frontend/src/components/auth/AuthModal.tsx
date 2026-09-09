import React, { useState } from 'react';
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck, AlertCircle, Key, CheckCircle, ArrowRight, X } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'OPERATOR' | 'USER' | 'ADMIN'>('OPERATOR');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  if (!isOpen) return null;

  const handleQuickFill = (roleType: 'admin' | 'operator' | 'user') => {
    setMode('login');
    setErrorMessage(null);
    if (roleType === 'admin') {
      setIdentifier('admin@ctrlf.local');
      setPassword('Password123!');
    } else if (roleType === 'operator') {
      setIdentifier('operator1');
      setPassword('Password123!');
    } else {
      setIdentifier('user@ctrlf.local');
      setPassword('Password123!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const response = await apiClient.login({
          identifier: identifier.trim(),
          email: identifier.includes('@') ? identifier.trim() : undefined,
          username: !identifier.includes('@') ? identifier.trim() : undefined,
          password,
          rememberMe,
        });

        setSuccessMessage('Authorization verified. Access granted.');
        setTimeout(() => {
          onSuccess(response.user);
          onClose();
        }, 600);
      } else {
        const response = await apiClient.register({
          username: username.trim(),
          email: email.trim(),
          fullName: fullName.trim(),
          password,
          role,
        });

        setSuccessMessage('Operator credentials created. Logging into console...');
        setTimeout(() => {
          onSuccess(response.user);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0f18] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        
        {/* Top Accent Radar Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-2 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-wider text-white uppercase font-mono">
            Control F — Security Console
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Oracle 21c XE Relational Intelligence & CCTV Verification
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 px-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 font-mono ${
              mode === 'login'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMessage(null); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 font-mono ${
              mode === 'register'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Register Operator
          </button>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-2 text-emerald-400 text-xs">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'login' ? (
            <>
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wide mb-1.5">
                  Username or Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@ctrlf.local or operator1"
                    className="w-full bg-[#111927] border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-slate-300 uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-mono text-cyan-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#111927] border border-slate-700 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-mono">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-[#111927] border-slate-700 text-cyan-500 focus:ring-cyan-400"
                  />
                  Remember session (30 days)
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wide mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="operator_j"
                      className="w-full bg-[#111927] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wide mb-1.5">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full bg-[#111927] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value="USER">USER</option>
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wide mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Officer Jane Doe"
                  className="w-full bg-[#111927] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wide mb-1.5">
                  Official Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jdoe@ctrlf.local"
                    className="w-full bg-[#111927] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wide mb-1.5">
                  Password (min 8 chars, 1 Upper, 1 Lower, 1 Number)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="SecurePass123!"
                    className="w-full bg-[#111927] border border-slate-700 rounded-lg pl-9 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all font-mono disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Validating with Oracle 21c...
              </span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Authenticate & Enter' : 'Create & Provision Access'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Testing Credentials Toolbar */}
        <div className="px-6 py-3 bg-[#070b12] border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500 uppercase tracking-wider">Quick Fill:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="px-2 py-1 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('operator')}
              className="px-2 py-1 rounded bg-slate-800 text-emerald-400 hover:bg-slate-700 transition-colors"
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('user')}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              User
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#0f172a] border border-cyan-500/40 rounded-xl p-6 max-w-sm w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between text-cyan-400 font-bold uppercase">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" /> Operator Security Reset
              </span>
              <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">
              In accordance with surveillance compliance policies, password recovery requires an authorized System Administrator key.
            </p>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded text-slate-400">
              Default system administrator account: <br />
              <span className="text-emerald-400 font-bold">admin@ctrlf.local</span> / Password: <span className="text-cyan-400 font-bold">Password123!</span>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded font-bold uppercase tracking-wider hover:bg-cyan-500/30"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
