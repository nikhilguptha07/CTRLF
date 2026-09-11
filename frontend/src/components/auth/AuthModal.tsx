import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  Key, 
  CheckCircle2, 
  ArrowRight, 
  X,
  Sparkles
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode = 'login', onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
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

  React.useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setMode(initialMode);
      }
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleQuickFill = (roleType: 'admin' | 'operator' | 'user' | 'nikhil') => {
    setMode('login');
    setErrorMessage(null);
    if (roleType === 'nikhil') {
      setIdentifier('nikhilguptha07@gmail.com');
      setPassword('Password123!');
    } else if (roleType === 'admin') {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white/90 rounded-3xl shadow-2xl overflow-hidden text-slate-800 animate-scale-in"
        style={{
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        }}
      >
        {/* Accent Top Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-[#4361ee] to-blue-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-3 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4361ee] mb-3 shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Control F — Security Console
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Oracle 21c XE Relational Intelligence & Operator Authorization
          </p>
        </div>

        {/* Mode Selector Segmented Tabs */}
        <div className="px-6 pb-2">
          <div className="flex p-1 rounded-2xl bg-slate-100/90 border border-slate-200/60">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#4361ee] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register Operator
            </button>
          </div>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-rose-700 text-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            {mode === 'login' && (
              <div className="pl-6 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                    if (identifier.includes('@')) {
                      setEmail(identifier.trim());
                    } else if (identifier) {
                      setUsername(identifier.trim());
                    }
                  }}
                  className="text-[11px] font-bold text-[#4361ee] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Need an account? Click here to Sign Up</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-700 text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-3.5">
          {mode === 'login' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username or Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@ctrlf.local or operator1"
                    className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#4361ee] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-semibold text-[#4361ee] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#4361ee] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#4361ee] focus:ring-indigo-500/30 accent-[#4361ee] cursor-pointer"
                  />
                  <span>Remember session for 30 days</span>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4361ee] focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4361ee]"
                  >
                    <option value="USER">USER</option>
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Officer Jane Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4361ee] focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4361ee] focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (min 8 chars)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password123!"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4361ee] focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 pl-1">
                  Must include at least 1 uppercase, 1 lowercase letter, and 1 number.
                </p>
              </div>
            </>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-[#4361ee] hover:bg-[#364fc7] text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-300/40 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Validating with Oracle 21c...
              </span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Authenticate & Enter' : 'Create Account & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Testing Credentials Toolbar */}
        <div className="px-6 py-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Quick Test Fill:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleQuickFill('nikhil')}
              className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold text-[11px] transition-colors shadow-2xs cursor-pointer"
              title="Nikhil (Admin)"
            >
              Nikhil (Admin)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 font-semibold text-[11px] transition-colors shadow-2xs cursor-pointer"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('operator')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 font-semibold text-[11px] transition-colors shadow-2xs cursor-pointer"
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('user')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-[11px] transition-colors shadow-2xs cursor-pointer"
            >
              User
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Sub-Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 text-xs shadow-2xl text-slate-800 animate-scale-in">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#4361ee]" /> Operator Security Reset
              </span>
              <button 
                onClick={() => setShowForgotModal(false)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600 leading-relaxed">
              In accordance with surveillance compliance policies, password recovery requires an authorized System Administrator key.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-600 space-y-1">
              <span className="text-[11px] uppercase font-semibold text-slate-400 block">Default Administrator:</span>
              <div className="font-mono text-xs">
                <span className="text-indigo-600 font-bold">admin@ctrlf.local</span>
                <br />
                Password: <span className="text-slate-800 font-bold">Password123!</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-[#4361ee] text-white rounded-xl font-semibold text-xs hover:bg-[#364fc7] transition-colors shadow-sm"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
