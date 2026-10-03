import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Shield, Lock, ArrowRight, Radio, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('habib@sentra.sec');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      login(email);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-3 sm:px-4 py-6 sm:py-0 relative overflow-hidden grid-pattern">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-sentra-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-60 sm:w-80 h-60 sm:h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-background-surface/90 border border-border rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-md relative z-10 space-y-5 sm:space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-sentra-cyan to-blue-600 flex items-center justify-center shadow-glow-cyan">
            <Shield className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <h1 className="text-2xl font-black font-display tracking-wider text-white">
                SENTRA
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sentra-cyan/15 text-sentra-cyan border border-sentra-cyan/30">
                SOC
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Unidirectional Threat Detection
            </p>
          </div>
        </div>

        {/* SIH Tag */}
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-border/80 text-center text-xs text-slate-400">
          <span className="font-mono text-sentra-sky flex items-center justify-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            Smart India Hackathon 2026 • PS 26145
          </span>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Analyst Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sentra-cyan/20 transition-colors font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Security Token / Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background-card border border-border focus:border-sentra-cyan rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sentra-cyan/20 transition-colors font-mono text-xs pr-10"
                required
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            icon={<ArrowRight className="w-4 h-4" />}
            className="w-full mt-2"
          >
            Authenticate to SOC Console
          </Button>

          <div className="text-center pt-2">
            <Badge variant="demo">
              Demo Access (Mock L3 SOC Clearance)
            </Badge>
          </div>
        </form>

        {/* Footer Subtitle */}
        <div className="pt-4 border-t border-border text-center text-xs text-slate-400 leading-relaxed">
          Passive network monitoring and AI threat detection for unidirectional IP traffic
        </div>
      </div>

      {/* Subtext info */}
      <div className="mt-6 text-center text-xs text-slate-400 font-mono">
        Team Sentra 1 (ID: 191970) • Blockchain & Cybersecurity
      </div>
    </div>
  );
};
