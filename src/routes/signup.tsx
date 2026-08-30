import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Sparkles, User, Mail, Lock, Check } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';

export const Route = createFileRoute('/signup')({
  component: Signup,
});

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'artisan' | 'buyer'>('artisan');
  const [loading, setLoading] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const navigate = useNavigate();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        toast.success('Registration successful! Welcome to Artisera.');
        navigate({ to: '/' });
      } else {
        // Email confirmation required
        setShowVerifyEmail(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            // Save selected role state or pass it to supabase auth metadata
            role: role
          }
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google registration failed.');
    }
  };

  return (
    <PhoneFrame chrome={false}>
      {showVerifyEmail ? (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
          <div className="text-center space-y-5 max-w-sm animate-in fade-in zoom-in duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 border-2 border-green-500/20">
              <Mail className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-primary">
              Verify Your Email
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              Please check your inbox (and spam folder) and click the link to activate your account.
            </p>
            <div className="rounded-xl bg-secondary/50 border border-border p-4 text-xs text-muted-foreground space-y-1">
              <p>✓ Check your <strong>inbox</strong> and <strong>spam/junk</strong> folder</p>
              <p>✓ Click the verification link in the email</p>
              <p>✓ Then come back and <strong>sign in</strong></p>
            </div>
            <Link
              to="/login"
              className="btn-cta w-full py-3 mt-4 flex justify-center items-center gap-2 font-bold inline-block text-center"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      ) : (
      <div className="flex min-h-screen flex-col justify-between px-6 py-12">
        <div className="space-y-6 pt-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 p-2 shadow-sm border border-primary/20">
              <img src="/logo.png" alt="Artisera Logo" className="h-12 w-12 object-contain" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ai">
              <Sparkles className="h-4 w-4" /> Artisera Platform
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-primary">
              Create Account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Join traditional artisans and bulk buyers in one sync
            </p>
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-4 pt-2">
            {/* Role Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Join Artisera As
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('artisan')}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                    role === 'artisan'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  Artisan {role === 'artisan' && <Check className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                    role === 'buyer'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  B2B Buyer {role === 'buyer' && <Check className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Full Name
              </label>
              <div className="flex items-center gap-2.5 rounded-xl bg-secondary px-3 py-3 border border-transparent focus-within:border-primary/20">
                <User className="h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Meena Devi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Email Address
              </label>
              <div className="flex items-center gap-2.5 rounded-xl bg-secondary px-3 py-3 border border-transparent focus-within:border-primary/20">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Password
              </label>
              <div className="flex items-center gap-2.5 rounded-xl bg-secondary px-3 py-3 border border-transparent focus-within:border-primary/20">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cta w-full py-3.5 mt-2 flex justify-center items-center gap-2 font-bold"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-muted-foreground uppercase">Or</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold shadow-sm transition-colors hover:bg-secondary/60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
      )}
    </PhoneFrame>
  );
}
