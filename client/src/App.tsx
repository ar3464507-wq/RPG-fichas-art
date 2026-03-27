import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RpgThemeProvider } from "./contexts/RpgThemeContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import CharacterSheet from "./pages/CharacterSheet";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import JoinCampaign from "./pages/JoinCampaign";

function Router() {
  return (
    <Switch>
      {/* Character sheet - full page (no sidebar) */}
      <Route path="/character/:uid" component={CharacterSheet} />
      {/* Join campaign via invite */}
      <Route path="/join/:token" component={JoinCampaign} />
      {/* Main app with sidebar */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/campaigns" component={Campaigns} />
            <Route path="/campaign/:uid" component={CampaignDetail} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <RpgThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </RpgThemeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
