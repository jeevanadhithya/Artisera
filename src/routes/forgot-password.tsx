import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Sparkles, Mail, ArrowLeft } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset link sent! Check your inbox.');
      navigate({ to: '/login' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame chrome={false}>
      <div className="flex min-h-screen flex-col justify-between px-6 py-12">
        <div className="space-y-6 pt-10">
          <div className="flex items-start">
            <Link
              to="/login"
              aria-label="Back to login"
              className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>

          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ai">
              <Sparkles className="h-4 w-4" /> Reset Password
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-primary">
              Forgot Password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll send a password recovery link to your email address
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
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

            <button
              type="submit"
              disabled={loading}
              className="btn-cta w-full py-3.5 mt-2 flex justify-center items-center gap-2 font-bold"
            >
              {loading ? 'Sending link...' : 'Send Recovery Link'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </PhoneFrame>
  );
}
