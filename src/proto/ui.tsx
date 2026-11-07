import { type ReactNode } from "react";
import { Button, Dialog, DialogTrigger, Heading, Modal, ModalOverlay, ToggleButton, ToggleButtonGroup, type Key } from "react-aria-components";
import { BookOpen, ChevronLeft, Compass, Home, Map, Route as RouteIcon, Search, Type, X, Network } from "lucide-react";
import { href, type Route } from "./router";
import { setSettings, useSettings, type Mode, type Theme } from "./settings";
import { LABEL_ORDER } from "./data";

export const TABS: { tab: Route["tab"]; name: string; icon: ReactNode; to: Route }[] = [
  { tab: "home", name: "Home", icon: <Home aria-hidden />, to: { tab: "home" } },
  { tab: "read", name: "Read", icon: <BookOpen aria-hidden />, to: { tab: "read" } },
  { tab: "story", name: "Story", icon: <RouteIcon aria-hidden />, to: { tab: "story" } },
  { tab: "connections", name: "Connections", icon: <Network aria-hidden />, to: { tab: "connections" } },
  { tab: "places", name: "Places", icon: <Map aria-hidden />, to: { tab: "places" } },
];

/** Bottom bar on phones, side rail on desktop. Labels and order never change. */
export function NavBar({ current }: { current: Route["tab"] }) {
  return (
    <nav className="nav" aria-label="Main">
      <a className="brand" href="#/home" aria-label="Scripture Universe, home"><Compass aria-hidden /> <span>Scripture Universe</span></a>
      {TABS.map((t) => (
        <a key={t.tab} href={href(t.to)} className="navtab" aria-current={current === t.tab ? "page" : undefined}>
          {t.icon}
          <span>{t.name}</span>
        </a>
      ))}
    </nav>
  );
}

/** Top bar: a labelled Back, the screen title, Search and text settings. */
export function TopBar({ title, back }: { title: string; back?: { label: string; to: Route } }) {
  return (
    <header className="top">
      {back ? (
        <a className="back" href={href(back.to)}><ChevronLeft aria-hidden /> <span>{back.label}</span></a>
      ) : <span className="top-spacer" />}
      <h1 className="top-title">{title}</h1>
      <a className="iconbtn" href="#/search/" aria-label="Search"><Search aria-hidden /><span className="iconlbl">Search</span></a>
      <SettingsButton />
    </header>
  );
}

export function SettingsButton() {
  return (
    <DialogTrigger>
      <Button className="iconbtn" aria-label="Text size and display"><Type aria-hidden /><span className="iconlbl">Text</span></Button>
      <Sheet title="Text and display"><SettingsPanel /></Sheet>
    </DialogTrigger>
  );
}

export function SettingsPanel() {
  const s = useSettings();
  return (
    <div className="settings">
      <h3 className="sub">Text size</h3>
      <div className="sizer">
        <Button className="btn secondary big-a" aria-label="Make text smaller" onPress={() => setSettings({ zoom: s.zoom - 0.1 })} isDisabled={s.zoom <= 0.9}>A−</Button>
        <span className="sizer-val" aria-live="polite">{Math.round(s.zoom * 100)}%</span>
        <Button className="btn secondary big-a" aria-label="Make text bigger" onPress={() => setSettings({ zoom: s.zoom + 0.1 })} isDisabled={s.zoom >= 1.8}>A+</Button>
      </div>
      <p className="sample">In the beginning God created the heaven and the earth.</p>
      <h3 className="sub">How the app looks</h3>
      <Segmented label="Reading mode" value={s.mode} onChange={(k) => setSettings({ mode: k as Mode })}
        options={[["standard", "Standard"], ["easy", "Easy"], ["kids", "Kids"]]} />
      <p className="hint">{s.mode === "easy" ? "Bigger text and buttons, one thing at a time, Listen on every verse." : s.mode === "kids" ? "Big pictures and simple words. The Story comes first." : "Everything on screen, for regular readers."}</p>
      <Segmented label="Colours" value={s.theme} onChange={(k) => setSettings({ theme: k as Theme })}
        options={[["paper", "Paper"], ["night", "Night"], ["contrast", "High contrast"]]} />
      <Segmented label="Bible version" value={s.version} onChange={(k) => setSettings({ version: k as "kjv" | "bsb" })}
        options={[["kjv", "KJV"], ["bsb", "BSB (modern)"]]} />
    </div>
  );
}

export function Segmented({ label, value, options, onChange }: { label: string; value: string; options: [string, ReactNode][]; onChange: (k: Key) => void }) {
  return (
    <div className="seg-wrap">
      <span className="seg-label" id={`seg-${label}`}>{label}</span>
      <ToggleButtonGroup aria-labelledby={`seg-${label}`} className="seg" selectionMode="single" disallowEmptySelection
        selectedKeys={[value]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k != null) onChange(k); }}>
        {options.map(([k, name]) => <ToggleButton key={k} id={k} className="seg-opt">{name}</ToggleButton>)}
      </ToggleButtonGroup>
    </div>
  );
}

/** Bottom sheet on phones, side panel on desktop. Close button, Esc and focus return are built in. */
export function Sheet({ title, children, isOpen, onOpenChange }: { title: string; children: ReactNode; isOpen?: boolean; onOpenChange?: (o: boolean) => void }) {
  return (
    <ModalOverlay className="overlay" isDismissable isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal className="sheet">
        <Dialog className="sheet-dialog">
          {({ close }) => (
            <>
              <div className="sheet-head">
                <Heading slot="title" className="sheet-title">{title}</Heading>
                <Button className="btn quiet close" onPress={close}><X aria-hidden /> Close</Button>
              </div>
              <div className="sheet-body">{children}</div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export function BigCard({ to, icon, title, text, tone }: { to: Route; icon: ReactNode; title: string; text: string; tone: string }) {
  return (
    <a className="card big" href={href(to)} style={{ ["--tone" as any]: tone }}>
      <span className="card-icon" aria-hidden>{icon}</span>
      <span className="card-text"><span className="card-title">{title}</span><span className="card-sub">{text}</span></span>
    </a>
  );
}

export function LabelBadges({ l, votes }: { l: number; votes?: number }) {
  return (
    <span className="badges">
      {LABEL_ORDER.filter((x) => l & x.bit).map((x) => (
        <span key={x.key} className={`badge lbl-${x.key}`}>{x.name}{x.key === "openbible" && votes ? ` · ${votes} votes` : ""}</span>
      ))}
    </span>
  );
}

export function Loading({ what }: { what: string }) {
  return <p className="loading" role="status">Loading {what}…</p>;
}
