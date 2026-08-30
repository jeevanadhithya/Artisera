import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Bell, Menu, Home, Compass, Plus, BarChart3, User, X, Check, Globe, LogOut, PackageCheck, FileEdit, Calculator, ShieldCheck, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from "../lib/language-context";

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 shadow-sm">
      <button 
        aria-label="Open Hamburger Menu" 
        onClick={onMenu} 
        className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/80 text-primary hover:bg-secondary transition-colors"
      >
        <Menu className="h-6 w-6" />
      </button>
      <Link to="/" className="font-display text-xl font-black tracking-tight text-primary flex items-center gap-2">
        <img src="/logo.png" alt="Artisera" className="h-7 w-7 object-contain" />
        Artisera
      </Link>
      <button aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/80 text-primary hover:bg-secondary transition-colors">
        <Bell className="h-5 w-5" />
      </button>
    </header>
  );
}

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/add", label: "Add", icon: Plus },
  { to: "/leads", label: "Leads", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-card px-2 pb-2 pt-1.5 shadow-lg">
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex justify-center">
              <Link
                to={to}
                className={
                  "flex min-w-0 flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function HamburgerDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, profile, role, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const artisanName = profile?.name || user?.email?.split('@')[0] || 'Artisan';
  const isVerified = profile?.profile_status === 'verified';

  const handleNav = (path: string) => {
    onClose();
    navigate({ to: path as any });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-[340px] flex-col justify-between bg-card p-5 text-foreground shadow-2xl overflow-y-auto border-l border-border">
        {/* Top User Card Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-lg text-primary">
                {artisanName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base leading-tight">{artisanName}</h3>
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email || 'Artisan Account'}</p>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success mt-0.5">
                    <ShieldCheck className="h-3 w-3" /> Verified Artisan
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Close Menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items Group */}
          <div className="space-y-1 py-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-2 mb-2">Artisan Studio</p>

            <button
              onClick={() => handleNav('/profile')}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <User className="h-4 w-4 text-primary" /> {t('my_profile', 'My Profile')}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => handleNav('/profile')}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <PackageCheck className="h-4 w-4 text-success" /> {t('published_products', 'Published Products')}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => handleNav('/profile')}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <FileEdit className="h-4 w-4 text-warning" /> {t('draft_products', 'Draft Products')}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => handleNav('/add')}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Plus className="h-4 w-4 text-ai" /> {t('add', 'Add New Craft')}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => handleNav('/leads')}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 text-primary" /> {t('leads', 'B2B Buyer Leads')}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => handleNav('/pricing')}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Calculator className="h-4 w-4 text-ai" /> {t('pricing_calculator', 'Pricing Calculator')}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => handleNav('/explore')}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Compass className="h-4 w-4 text-muted-foreground" /> {t('explore', 'Explore Marketplace')}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* BOTTOM SECTION: Language Switcher & Sign Out */}
        <div className="space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-foreground px-1">
              <Globe className="h-4 w-4 text-primary" /> {t('change_language', 'App Language / भाषा बदलें')}
            </div>

            {/* Language Selection Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={
                      "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all " +
                      (isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground")
                    }
                  >
                    <span>{lang.flag} {lang.nativeLabel}</span>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              signOut();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="h-4 w-4" /> {t('sign_out', 'Sign Out')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PhoneFrame({
  children,
  chrome = true,
}: {
  children: ReactNode;
  chrome?: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen justify-center">
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col bg-background shadow-[0_0_60px_-20px_rgba(30,20,80,0.5)]">
        {chrome ? <TopBar onMenu={() => setIsMenuOpen(true)} /> : null}
        <main className="flex-1 overflow-x-hidden">{children}</main>
        {chrome ? <BottomNav /> : null}
        {chrome ? <HamburgerDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} /> : null}
      </div>
    </div>
  );
}
