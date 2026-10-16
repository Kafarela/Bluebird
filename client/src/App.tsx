import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import { AuthPage, BookingsPage, BookPage, DestinationsPage, SimpleInfoPage } from "./pages/PublicPages";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/login"><AuthPage mode="login" /></Route>
    <Route path="/signup"><AuthPage mode="signup" /></Route>
    <Route path="/bookings" component={BookingsPage} />
    <Route path="/book" component={BookPage} />
    <Route path="/destinations" component={DestinationsPage} />
    <Route path="/about"><SimpleInfoPage kind="about" /></Route>
    <Route path="/help"><SimpleInfoPage kind="help" /></Route>
    <Route path="/admin" component={Admin} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
