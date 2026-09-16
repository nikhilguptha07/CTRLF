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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-md bg-[#0f1520] border border-[#1a2536] rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-scale-in"
      >
        {/* Accent Top Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-[#00c4df] to-blue-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#161e2e] transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-3 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#00c4df]/10 border border-[#00c4df]/20 text-[#00c4df] mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Control F — Security Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Oracle 21c XE Relational Intelligence & Operator Authorization
          </p>
        </div>

        {/* Mode Selector Segmented Tabs */}
        <div className="px-6 pb-2">
          <div className="flex p-1 rounded-xl bg-[#161e2e] border border-[#1a2536]">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMessage(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#0f1520] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMessage(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#0f1520] text-[#00c4df] shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register Operator
            </button>
          </div>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1.5 text-rose-400 text-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
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
                  className="text-[11px] font-bold text-[#00c4df] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Need an account? Click here to Sign Up</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-emerald-400 text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-3.5">
          {mode === 'login' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                    className="w-full bg-[#161e2e] border border-[#1a2536] rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00c4df] focus:ring-1 focus:ring-[#00c4df] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-semibold text-[#00c4df] hover:underline cursor-pointer"
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
                    className="w-full bg-[#161e2e] border border-[#1a2536] rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00c4df] focus:ring-1 focus:ring-[#00c4df] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#1a2536] bg-[#161e2e] text-[#00c4df] accent-[#00c4df] cursor-pointer"
                  />
                  <span>Remember session for 30 days</span>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                      className="w-full bg-[#161e2e] border border-[#1a2536] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00c4df] focus:ring-1 focus:ring-[#00c4df]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full bg-[#161e2e] border border-[#1a2536] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00c4df]"
                  >
                    <option value="USER" className="bg-[#0f1520] text-white">USER</option>
                    <option value="OPERATOR" className="bg-[#0f1520] text-white">OPERATOR</option>
                    <option value="ADMIN" className="bg-[#0f1520] text-white">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Officer Jane Doe"
                  className="w-full bg-[#161e2e] border border-[#1a2536] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00c4df] focus:ring-1 focus:ring-[#00c4df]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                    className="w-full bg-[#161e2e] border border-[#1a2536] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00c4df] focus:ring-1 focus:ring-[#00c4df]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                    className="w-full bg-[#161e2e] border border-[#1a2536] rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00c4df] focus:ring-1 focus:ring-[#00c4df]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 pl-1">
                  Must include at least 1 uppercase, 1 lowercase letter, and 1 number.
                </p>
              </div>
            </>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-[#00c4df] hover:bg-[#00d8f6] text-slate-950 font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
        <div className="px-6 py-3 bg-[#161e2e]/50 border-t border-[#1a2536] flex items-center justify-between text-xs flex-wrap gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#00c4df]" />
            Quick Test Fill:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleQuickFill('nikhil')}
              className="px-2 py-1 rounded-lg bg-[#161e2e] border border-[#1a2536] text-[#00c4df] hover:bg-[#1a2536] font-mono text-[11px] transition-colors cursor-pointer"
              title="Nikhil (Admin)"
            >
              Nikhil (Admin)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="px-2 py-1 rounded-lg bg-[#161e2e] border border-[#1a2536] text-slate-200 hover:bg-[#1a2536] font-mono text-[11px] transition-colors cursor-pointer"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('operator')}
              className="px-2 py-1 rounded-lg bg-[#161e2e] border border-[#1a2536] text-emerald-400 hover:bg-[#1a2536] font-mono text-[11px] transition-colors cursor-pointer"
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('user')}
              className="px-2 py-1 rounded-lg bg-[#161e2e] border border-[#1a2536] text-slate-300 hover:bg-[#1a2536] font-mono text-[11px] transition-colors cursor-pointer"
            >
              User
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Sub-Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0f1520] border border-[#1a2536] rounded-2xl p-6 max-w-sm w-full space-y-4 text-xs shadow-2xl text-slate-100 animate-scale-in">
            <div className="flex items-center justify-between font-bold text-white">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#00c4df]" /> Operator Security Reset
              </span>
              <button 
                onClick={() => setShowForgotModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#161e2e] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-400 leading-relaxed">
              In accordance with surveillance compliance policies, password recovery requires an authorized System Administrator key.
            </p>
            <div className="p-3 bg-[#161e2e] border border-[#1a2536] rounded-xl text-slate-300 space-y-1">
              <span className="text-[11px] uppercase font-mono text-slate-500 block">Default Administrator:</span>
              <div className="font-mono text-xs">
                <span className="text-[#00c4df] font-bold">admin@ctrlf.local</span>
                <br />
                Password: <span className="text-white font-bold">Password123!</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-[#00c4df] text-slate-950 font-bold rounded-xl text-xs hover:bg-[#00d8f6] transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
