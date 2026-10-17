import { ReactNode } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export function SiteShell({ children, watermark = true }: { children: ReactNode; watermark?: boolean }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch {
      navigate("/");
    }
  };

  return (
    <div className={`site-root${watermark ? "" : " site-root-no-watermark"}`}>
      <header className="site-header">
        <div className="page-wrap header-inner">
          <Link href="/" className="brand header-brand" aria-label="Bluebird Airways home"><span className="header-wordmark">BLUEBIRD <em>AIRWAYS</em></span><img className="brand-mark-image" src="/brand/bluebird-mark.png" alt="" /></Link>
          <nav className="main-nav" aria-label="Primary navigation">
            <Link href="/book">Book a flight</Link>
            <Link href="/search-flights">Search flights</Link>
            <Link href="/bookings">My bookings</Link>
            <Link href="/destinations">Destinations</Link>
            <Link href="/about">About us</Link>
          </nav>
          <div className="header-actions">
            {isAuthenticated ? <><span className="signed-in-name">{user?.name || "Traveler"}</span><button className="icon-button" onClick={handleLogout} aria-label="Log out"><LogOut size={17} /></button></> : <><Link href="/login" className="login-link"><LogIn size={16} /> Log in</Link><Link href="/signup" className="header-cta">Sign up</Link></>}
          </div>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="page-wrap footer-grid">
          <div className="footer-brand-block"><Link href="/" className="brand footer-brand"><img className="brand-logo" src="/brand/bluebird-logo.png" alt="Bluebird Airways" /></Link><p>A calmer way to keep your journey moving.</p><span className="footer-rule" /></div>
          <div><h4>Explore</h4><Link href="/book">Book a flight</Link><Link href="/search-flights">Search flights</Link><Link href="/destinations">Destinations</Link><Link href="/bookings">My bookings</Link></div>
          <div><h4>Company</h4><Link href="/about">About Bluebird</Link><Link href="/help">Help centre</Link><Link href="/admin">Owner console</Link></div>
          <div><h4>Stay close</h4><p className="footer-small">Keep your booking reference nearby. It is the key to your itinerary details.</p><Link href="/bookings" className="footer-callout">Find my booking <span>→</span></Link></div>
        </div>
        <div className="page-wrap footer-bottom"><span>© 2026 Bluebird Airways</span><span>Clear details. Calmer travel.</span></div>
      </footer>
    </div>
  );
}
