import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const isDev = (import.meta as any).env?.MODE !== 'production';
  const [email, setEmail] = useState(isDev ? 'agent@ttb.gov' : '');
  const [password, setPassword] = useState(isDev ? 'password123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch {
      setError('Invalid credentials. Use the demo account shown below.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-16 h-16 text-blue-700" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">TTB Label Verifier</h1>
          <p className="text-gray-500 mt-2">AI-Powered Compliance Assistant</p>
        </div>

        {/* Demo hint */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm">
          <p className="text-blue-800 font-medium">Demo Credentials</p>
          <p className="text-blue-600">Email: agent@ttb.gov</p>
          <p className="text-blue-600">Password: password123</p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="agent@ttb.gov"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-700 text-white py-3 rounded-lg text-base font-semibold hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          TTB Label Verification System • Prototype v1.0
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
