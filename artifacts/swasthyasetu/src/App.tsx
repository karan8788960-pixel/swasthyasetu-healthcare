import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowRight, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, ExternalLink,
  Hospital as HospitalIcon, LayoutDashboard, Loader2, LogOut, MapPin, Menu, MessageCircle,
  Phone, Search, Settings as SettingsIcon, ShieldCheck, Stethoscope, UserRound, Video,
  X, Zap,
} from 'lucide-react';
import {
  getListAppointmentsQueryKey, useAskJarvis, useCreateAppointment, useCreateConsultationRoom,
  useHealthCheck, useListAppointments, useListDoctors, useListHospitals,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  getAuthSession,
  sendOtp,
  signOut,
  supabaseAuthConfigured,
  verifyOtp,
} from '@/lib/supabase-auth';

const queryClient = new QueryClient();

const navItems = [
  { href: '/', label: 'My care', icon: LayoutDashboard },
  { href: '/hospitals', label: 'Facilities', icon: HospitalIcon },
  { href: '/doctors', label: 'Find a doctor', icon: Stethoscope },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/assistant', label: 'JARVIS guide', icon: MessageCircle },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" data-testid="brand-swasthyasetu">
      <span className="grid size-9 place-items-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-sm">
        <Activity size={20} strokeWidth={2.8} />
      </span>
      {!compact && <span className="text-[15px] font-bold tracking-[-.02em]">Swasthya<span className="text-[hsl(var(--sidebar-primary))]">Setu</span></span>}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  return (
    <div className="noise app-shell flex min-h-[100dvh]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 flex items-center justify-between px-2">
          <Logo />
          <button className="focus-ring rounded-lg p-1.5 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X size={18} /></button>
        </div>
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-[hsl(var(--sidebar-foreground)/.52)]">Your care path</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`nav-link focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold ${active ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.75)] hover:bg-[hsl(var(--sidebar-accent)/.7)] hover:text-[hsl(var(--sidebar-foreground))]'}`} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={18} strokeWidth={active ? 2.5 : 2} /><span>{item.label}</span>{active && <span className="ml-auto size-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
            </Link>;
          })}
        </nav>
        <div className="mt-auto space-y-1">
          <div className="mb-5 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-4">
            <div className="mb-2 flex items-center gap-2 text-[hsl(var(--sidebar-primary))]"><ShieldCheck size={16} /><span className="text-[11px] font-bold">Private by default</span></div>
            <p className="text-[11px] leading-relaxed text-[hsl(var(--sidebar-foreground)/.62)]">Your care notes stay with your care team.</p>
          </div>
          <Link href="/settings" onClick={() => setMobileOpen(false)} className="nav-link focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold text-[hsl(var(--sidebar-foreground)/.75)] hover:bg-[hsl(var(--sidebar-accent)/.7)]" data-testid="link-nav-settings"><SettingsIcon size={18} /><span>Settings</span></Link>
          <Link href="/login" className="nav-link focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold text-[hsl(var(--sidebar-foreground)/.75)] hover:bg-[hsl(var(--sidebar-accent)/.7)]" data-testid="link-nav-sign-out"><LogOut size={18} /><span>Sign out</span></Link>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-[hsl(180 28% 9%/.45)] md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-dismiss-menu" />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[hsl(var(--border)/.75)] bg-[hsl(var(--background)/.88)] px-4 backdrop-blur-md md:px-8">
          <button className="focus-ring rounded-xl p-2 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={21} /></button>
          <div className="hidden md:block"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">{today}</p><p className="mt-0.5 text-sm font-semibold">A calmer way to reach care</p></div>
          <div className="flex items-center gap-3">
            <button className="focus-ring grid size-9 place-items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]" aria-label="Help" data-testid="button-help"><CircleHelp size={17} /></button>
            <Link href="/settings" className="focus-ring flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-[hsl(var(--muted))]" data-testid="link-header-profile"><span className="grid size-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--secondary-foreground))]">AS</span><span className="hidden text-xs font-bold sm:block">Anita S.</span><ChevronDown className="hidden sm:block" size={14} /></Link>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mono mb-2 text-[10px] font-medium uppercase tracking-[.18em] text-[hsl(var(--primary))]">{eyebrow}</p><h1 className="display text-3xl font-semibold text-[hsl(var(--foreground))] sm:text-[38px]">{title}</h1>{description && <p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</div>;
}

function QueryState({ loading, error, empty, children }: { loading?: boolean; error?: boolean; empty?: boolean; children: ReactNode }) {
  if (loading) return <div className="space-y-3" data-testid="state-loading"><div className="skeleton h-24 w-full" /><div className="skeleton h-24 w-full" /><div className="skeleton h-24 w-full" /></div>;
  if (error) return <div className="soft-card flex flex-col items-center justify-center px-6 py-14 text-center" data-testid="state-error"><div className="mb-3 grid size-12 place-items-center rounded-full bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]"><Zap size={21} /></div><h3 className="font-bold">We could not reach the care network</h3><p className="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">Check your connection and try again. Your place here is saved.</p></div>;
  if (empty) return <div className="soft-card flex flex-col items-center justify-center px-6 py-14 text-center" data-testid="state-empty"><div className="mb-3 grid size-12 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Search size={21} /></div><h3 className="font-bold">Nothing here yet</h3><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Try a different search or check back soon.</p></div>;
  return <>{children}</>;
}

function Home() {
  const { data: appointments, isLoading } = useListAppointments();
  const { data: hospitals } = useListHospitals();
  const next = appointments?.find((a) => a.status !== 'completed');
  return <div className="page-wrap rise-in">
    <div className="mb-8 flex items-start justify-between gap-5"><div><p className="mono mb-2 text-[10px] font-medium uppercase tracking-[.18em] text-[hsl(var(--primary))]">Good morning, Anita</p><h1 className="display text-[38px] font-semibold leading-[1.08] sm:text-5xl">Care should feel<br /><span className="text-[hsl(var(--primary))]">closer.</span></h1><p className="mt-4 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">From a health question to the right person, in a few clear steps.</p></div><div className="hidden size-20 rotate-3 place-items-center rounded-[28px] border border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.16)] text-[hsl(var(--primary))] sm:grid"><Activity size={34} strokeWidth={1.6} /></div></div>
    <div className="mb-7 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
      <div className="relative overflow-hidden rounded-[1.25rem] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-md)] sm:p-8"><div className="absolute -right-12 -top-16 size-52 rounded-full border-[18px] border-[hsl(var(--accent)/.2)]" /><div className="absolute -bottom-24 right-24 size-44 rounded-full border-[10px] border-[hsl(var(--primary-foreground)/.08)]" /><div className="relative"><div className="mb-8 flex items-center gap-2 text-[hsl(var(--accent))]"><MessageCircle size={18} /><span className="text-xs font-bold uppercase tracking-[.14em]">Your care navigator</span></div><h2 className="display max-w-sm text-3xl font-semibold leading-tight">Not sure where to start?</h2><p className="mt-3 max-w-sm text-sm leading-6 text-[hsl(var(--primary-foreground)/.72)]">Tell JARVIS what you’re feeling. It will help you find the right next step.</p><Link href="/assistant" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-3 text-sm font-bold text-[hsl(var(--accent-foreground))] transition-transform hover:-translate-y-0.5" data-testid="link-home-ask-jarvis">Ask JARVIS <ArrowRight size={16} /></Link></div></div>
      <div className="soft-card flex flex-col justify-between p-6"><div><div className="mb-5 flex items-center justify-between"><span className="text-sm font-bold">Next on your care path</span><CalendarDays size={18} className="text-[hsl(var(--primary))]" /></div>{isLoading ? <div className="space-y-2"><div className="skeleton h-5 w-2/3" /><div className="skeleton h-4 w-1/2" /></div> : next ? <><p className="display text-2xl font-semibold">{next.doctorName}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{next.specialty}</p><div className="mt-5 flex items-center gap-2 text-sm font-semibold"><span className="rounded-lg bg-[hsl(var(--secondary))] px-2.5 py-1.5 text-[hsl(var(--secondary-foreground))]">{next.date}</span><span className="text-[hsl(var(--muted-foreground))]">{next.time}</span></div></> : <div><p className="font-semibold">No visits planned</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">When you’re ready, we’ll help you book one.</p></div>}</div><Link href="/appointments" className="focus-ring mt-6 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4 text-sm font-bold text-[hsl(var(--primary))]" data-testid="link-home-appointments">View appointments <ArrowRight size={16} /></Link></div>
    </div>
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {([['Find a facility', HospitalIcon, '/hospitals'], ['Talk to a doctor', Stethoscope, '/doctors'], ['Book a visit', CalendarDays, '/appointments'], ['Ask a question', MessageCircle, '/assistant']] as const).map(([label, Icon, href]) => <Link href={href} key={label} className="soft-card focus-ring group flex min-h-[116px] flex-col justify-between p-4 transition-transform hover:-translate-y-1" data-testid={`link-quick-${label.toLowerCase().replaceAll(' ', '-')}`}><span className="grid size-9 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Icon size={18} /></span><span className="flex items-center justify-between text-xs font-bold">{label}<ArrowRight size={14} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-1" /></span></Link>)}
    </div>
    <div className="grid gap-4 md:grid-cols-2"><div className="soft-card p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Nearby care</h2><Link href="/hospitals" className="text-xs font-bold text-[hsl(var(--primary))]" data-testid="link-home-nearby">See all</Link></div>{hospitals?.slice(0, 2).map((hospital) => <div className="flex items-center gap-3 border-t border-[hsl(var(--border))] py-3" key={hospital.id} data-testid={`row-nearby-${hospital.id}`}><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><HospitalIcon size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{hospital.name}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{hospital.distanceKm} km · {hospital.district}</p></div><span className={`size-2 rounded-full ${hospital.openNow ? 'bg-emerald-500' : 'bg-[hsl(var(--muted-foreground))]'}`} /></div>) || <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading nearby facilities…</p>}</div><div className="paper-grid rounded-[1.05rem] border border-[hsl(var(--border))] p-5"><p className="mono text-[10px] font-medium uppercase tracking-[.18em] text-[hsl(var(--primary))]">A small reminder</p><p className="display mt-5 max-w-xs text-2xl font-semibold leading-tight">You do not have to figure out healthcare alone.</p><p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">SwasthyaSetu connects your question, your language, and your local care team.</p></div></div>
  </div>;
}

function Hospitals() {
  const [query, setQuery] = useState('');
  const [emergency, setEmergency] = useState(false);
  const params = useMemo(() => ({ query: query || undefined, emergency: emergency || undefined }), [query, emergency]);
  const result = useListHospitals(params);
  return <div className="page-wrap rise-in"><SectionHeading eyebrow="Facilities near you" title="Find nearby care" description="Health centres, clinics, and hospitals around your district." action={<span className="mono text-[11px] text-[hsl(var(--muted-foreground))]">Updated just now</span>} /><div className="mb-6 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3.5 top-3.5 text-[hsl(var(--muted-foreground))]" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by facility or district" className="focus-ring h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] pl-11 pr-4 text-sm outline-none" data-testid="input-search-hospitals" /></label><button onClick={() => setEmergency((v) => !v)} className={`focus-ring flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors ${emergency ? 'border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'border-[hsl(var(--input))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]'}`} data-testid="button-filter-emergency"><Zap size={16} /> Emergency open</button></div><QueryState loading={result.isLoading} error={result.isError} empty={!result.isLoading && !result.isError && !result.data?.length}><div className="grid gap-3">{result.data?.map((hospital) => <div className="soft-card flex flex-col gap-4 p-5 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center" key={hospital.id} data-testid={`card-hospital-${hospital.id}`}><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><HospitalIcon size={23} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{hospital.name}</h2><span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{hospital.type}</span></div><p className="mt-1 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]"><MapPin size={13} /> {hospital.address} · {hospital.district}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="font-bold text-[hsl(var(--primary))]">{hospital.distanceKm} km away</span><span className="text-[hsl(var(--muted-foreground))]">{hospital.openNow ? 'Open now' : 'Currently closed'}</span>{hospital.emergency && <span className="font-bold text-[hsl(var(--destructive))]">Emergency care</span>}</div></div><div className="flex shrink-0 gap-2"><a href={`tel:${hospital.phone}`} className="focus-ring grid size-10 place-items-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--primary))]" aria-label={`Call ${hospital.name}`} data-testid={`link-call-hospital-${hospital.id}`}><Phone size={17} /></a><a href={`https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`} target="_blank" rel="noreferrer" className="focus-ring flex h-10 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid={`link-map-hospital-${hospital.id}`}><ExternalLink size={15} /> Map</a></div></div>)}</div></QueryState></div>;
}

function Doctors() {
  const [specialty, setSpecialty] = useState('');
  const [mode, setMode] = useState('');
  const params = useMemo(() => ({ specialty: specialty || undefined, mode: (mode || undefined) as 'video' | 'in-person' | undefined }), [specialty, mode]);
  const result = useListDoctors(params);
  return <div className="page-wrap rise-in"><SectionHeading eyebrow="Care team" title="Find your doctor" description="Choose someone who speaks your language and fits your way of reaching care." /><div className="mb-6 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Stethoscope className="absolute left-3.5 top-3.5 text-[hsl(var(--muted-foreground))]" size={17} /><input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Search specialty, for example child health" className="focus-ring h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] pl-11 pr-4 text-sm outline-none" data-testid="input-search-doctors" /></label><select value={mode} onChange={(e) => setMode(e.target.value)} className="focus-ring h-12 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-sm font-semibold outline-none" data-testid="select-doctor-mode"><option value="">Any visit type</option><option value="video">Video consultation</option><option value="in-person">In person</option></select></div><QueryState loading={result.isLoading} error={result.isError} empty={!result.isLoading && !result.isError && !result.data?.length}><div className="grid gap-3 lg:grid-cols-2">{result.data?.map((doctor) => <div className="soft-card p-5 transition-transform hover:-translate-y-0.5" key={doctor.id} data-testid={`card-doctor-${doctor.id}`}><div className="flex gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))]">{doctor.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold">{doctor.name}</h2><p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">{doctor.specialty}</p></div><span className="flex items-center gap-1 rounded-full bg-[hsl(var(--secondary))] px-2 py-1 text-xs font-bold text-[hsl(var(--secondary-foreground))]"><span className="text-[hsl(var(--accent-foreground))]">★</span>{doctor.rating.toFixed(1)}</span></div><p className="mt-3 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]"><MapPin size={13} />{doctor.facility}</p><div className="mt-3 flex flex-wrap gap-1.5">{doctor.languages.map((language) => <span key={language} className="rounded-md border border-[hsl(var(--border))] px-2 py-1 text-[10px] font-semibold">{language}</span>)}</div></div></div><div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4"><span className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))]"><Clock3 size={14} /> Next: {doctor.nextSlot}</span><Link href={`/appointments?doctor=${doctor.id}`} className="focus-ring flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid={`link-book-doctor-${doctor.id}`}>Book <ArrowRight size={14} /></Link></div></div>)}</div></QueryState></div>;
}

function Appointments() {
  const [, setLocation] = useLocation();
  const doctors = useListDoctors();
  const appointments = useListAppointments();
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('2024-06-20');
  const [time, setTime] = useState('10:30');
  const [mode, setMode] = useState<'video' | 'in-person'>('video');
  const create = useCreateAppointment();
  const createRoom = useCreateConsultationRoom();
  const qc = useQueryClient();
  const submit = () => {
    if (!doctorId) return;
    create.mutate({ data: { doctorId, date, time, mode } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }); setDoctorId(''); } });
  };
  const openRoom = (id: string) => {
    createRoom.mutate({ data: { doctorId: id } }, { onSuccess: (room) => setLocation(`/consult/${encodeURIComponent(room.roomName)}`) });
  };
  return <div className="page-wrap rise-in">
    <SectionHeading eyebrow="Your care path" title="Appointments" description="Book a visit with less waiting and more certainty." />
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="soft-card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><CalendarDays size={16} /></span><h2 className="font-bold">Book a visit</h2></div>
        <div className="space-y-4">
          <label className="block text-xs font-bold">Doctor<select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="focus-ring mt-2 h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal outline-none" data-testid="select-appointment-doctor"><option value="">Choose a doctor</option>{doctors.data?.map((doctor) => <option value={doctor.id} key={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="focus-ring mt-2 h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal outline-none" data-testid="input-appointment-date" /></label><label className="block text-xs font-bold">Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="focus-ring mt-2 h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal outline-none" data-testid="input-appointment-time" /></label></div>
          <div><p className="mb-2 text-xs font-bold">How would you like to meet?</p><div className="grid grid-cols-2 gap-2">{([['video', 'Video call', Video], ['in-person', 'In person', UserRound]] as const).map(([value, label, Icon]) => <button key={value} onClick={() => setMode(value)} className={`focus-ring flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold ${mode === value ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`} data-testid={`button-mode-${value}`}><Icon size={15} />{label}</button>)}</div></div>
          <button onClick={submit} disabled={!doctorId || create.isPending} className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-submit-appointment">{create.isPending ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />} {create.isPending ? 'Saving visit…' : 'Confirm appointment'}</button>
          {create.isError && <p className="text-xs font-semibold text-[hsl(var(--destructive))]" data-testid="status-appointment-error">We could not save that visit. Please try once more.</p>}
        </div>
      </div>
      <div><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Upcoming visits</h2><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{appointments.data?.length || 0} TOTAL</span></div>
        <QueryState loading={appointments.isLoading} error={appointments.isError} empty={!appointments.isLoading && !appointments.isError && !appointments.data?.length}><div className="space-y-3">{appointments.data?.map((appointment) => <div className="soft-card p-5" key={appointment.id} data-testid={`card-appointment-${appointment.id}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{appointment.doctorName}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{appointment.specialty}</p></div><span className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 text-[10px] font-bold capitalize text-[hsl(var(--secondary-foreground))]">{appointment.status}</span></div><div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold"><span className="rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1.5">{appointment.date}</span><span>{appointment.time}</span><span className="text-[hsl(var(--muted-foreground))]">·</span><span className="capitalize text-[hsl(var(--primary))]">{appointment.mode === 'video' ? 'Video consultation' : 'In person'}</span></div>{appointment.mode === 'video' && (appointment.roomName ? <Link href={`/consult/${encodeURIComponent(appointment.roomName)}`} className="focus-ring mt-4 flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary)/.3)] py-2.5 text-xs font-bold text-[hsl(var(--primary))]" data-testid={`link-join-appointment-${appointment.id}`}><Video size={15} /> Join consultation</Link> : <button onClick={() => openRoom(appointment.doctorId)} disabled={createRoom.isPending} className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary)/.3)] py-2.5 text-xs font-bold text-[hsl(var(--primary))] disabled:opacity-50" data-testid={`button-start-appointment-${appointment.id}`}>{createRoom.isPending ? <Loader2 className="animate-spin" size={15} /> : <Video size={15} />} Start video room</button>)}</div>)}</div></QueryState>
      </div>
    </div>
  </div>;
}

function Assistant() {
  const [query, setQuery] = useState('');
  const [last, setLast] = useState<{ reply: string; source: string } | null>(null);
  const ask = useAskJarvis();
  const submit = () => { if (!query.trim()) return; ask.mutate({ data: { query, role: 'patient' } }, { onSuccess: (response) => { setLast(response); setQuery(''); } }); };
  const prompts = ['I have had a fever since yesterday', 'Where can I get a blood test nearby?', 'I need help with my child’s cough'];
  return <div className="page-wrap rise-in"><div className="mx-auto max-w-3xl"><SectionHeading eyebrow="JARVIS · care navigation" title="What can we help you find?" description="A simple first step. JARVIS helps you understand where to go next — it does not replace a doctor." /><div className="relative overflow-hidden rounded-[1.3rem] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] sm:p-8"><div className="absolute -right-10 -top-16 size-48 rounded-full border-[16px] border-[hsl(var(--accent)/.2)]" /><div className="relative"><div className="mb-6 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><MessageCircle size={20} /></span><div><p className="font-bold">JARVIS is listening</p><p className="text-xs text-[hsl(var(--primary-foreground)/.65)]">Available in English, Hindi, and Marathi</p></div></div><textarea value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Tell me what you need help with…" rows={4} className="focus-ring w-full resize-none rounded-xl border border-[hsl(var(--primary-foreground)/.18)] bg-[hsl(var(--primary-foreground)/.1)] p-4 text-sm text-[hsl(var(--primary-foreground))] outline-none placeholder:text-[hsl(var(--primary-foreground)/.5)]" data-testid="textarea-jarvis-query" /><div className="mt-4 flex items-center justify-between gap-3"><span className="text-[11px] text-[hsl(var(--primary-foreground)/.55)]">Press Enter to ask · {query.length}/2000</span><button onClick={submit} disabled={!query.trim() || ask.isPending} className="focus-ring flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--accent-foreground))] disabled:opacity-50" data-testid="button-ask-jarvis">{ask.isPending ? <Loader2 className="animate-spin" size={15} /> : <ArrowRight size={15} />} Ask JARVIS</button></div></div></div><div className="mt-5 flex flex-wrap gap-2">{prompts.map((prompt) => <button onClick={() => setQuery(prompt)} key={prompt} className="focus-ring rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))]" data-testid={`button-prompt-${prompts.indexOf(prompt)}`}>{prompt}</button>)}</div>{ask.isError && <p className="mt-5 rounded-xl bg-[hsl(var(--destructive)/.1)] p-4 text-sm font-semibold text-[hsl(var(--destructive))]" data-testid="status-jarvis-error">JARVIS is temporarily unavailable. Please try a facility search instead.</p>}{last && <div className="soft-card mt-7 p-5" data-testid="card-jarvis-response"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold"><span className="grid size-7 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Check size={15} /></span>Here’s a useful next step</div><span className="mono text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{last.source}</span></div><p className="text-sm leading-7 text-[hsl(var(--foreground)/.82)]">{last.reply}</p></div>}<div className="mt-7 flex gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.5)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" /><p>For severe symptoms, call your local emergency service or visit the nearest facility. JARVIS cannot diagnose emergencies.</p></div></div></div>;
}

function Consult() {
  const { roomName } = useParams<{ roomName: string }>();
  const room = decodeURIComponent(roomName || '');
  return <div className="page-wrap rise-in"><SectionHeading eyebrow="Video consultation" title="Your care room" description="You are in a private room. Allow camera and microphone access when asked." action={<Link href="/appointments" className="focus-ring text-sm font-bold text-[hsl(var(--primary))]" data-testid="link-back-appointments">Back to appointments</Link>} /><div className="overflow-hidden rounded-[1.25rem] border border-[hsl(var(--border))] bg-[hsl(180 28% 12%)] shadow-[var(--shadow-md)]"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white"><div className="flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-emerald-400" />Room {room}</div><span className="mono text-[10px] text-white/50">JITSI SECURE</span></div><iframe title="Jitsi video consultation" src={`https://meet.jit.si/${encodeURIComponent(room)}`} className="h-[min(68vh,620px)] w-full border-0" allow="camera; microphone; fullscreen; display-capture" data-testid="iframe-consultation" /><div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-white/60"><span>Having trouble? Check your connection and try again.</span><a href={`https://meet.jit.si/${encodeURIComponent(room)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-bold text-[hsl(var(--accent))]" data-testid="link-open-consultation">Open in new tab <ExternalLink size={13} /></a></div></div></div>;
}

function Settings() {
  const health = useHealthCheck();
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState('English');
  const session = getAuthSession();
  const handleSignOut = async () => {
    await signOut();
    setLocation('/login');
  };
  return <div className="page-wrap rise-in"><SectionHeading eyebrow="Your account" title="Settings" description="Keep your care preferences ready for the next visit." /><div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><div className="space-y-4"><div className="soft-card p-6"><div className="mb-5 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><UserRound size={22} /></span><div><h2 className="font-bold">Anita Sharma</h2><p className="text-xs text-[hsl(var(--muted-foreground))]">Patient profile</p></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[hsl(var(--muted)/.65)] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Phone</p><p className="mt-1 text-sm font-semibold">{session?.user.phone ?? '+91 98••• ••142'}</p></div><div className="rounded-xl bg-[hsl(var(--muted)/.65)] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">District</p><p className="mt-1 text-sm font-semibold">Nashik, Maharashtra</p></div></div></div><div className="soft-card p-6"><div className="mb-4 flex items-center gap-2"><SettingsIcon size={18} className="text-[hsl(var(--primary))]" /><h2 className="font-bold">Preferences</h2></div><label className="block text-xs font-bold">Preferred language<select value={language} onChange={(e) => setLanguage(e.target.value)} className="focus-ring mt-2 h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm font-normal outline-none" data-testid="select-language"><option>English</option><option>हिन्दी</option><option>मराठी</option></select></label><p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">We’ll use this for JARVIS and care instructions.</p></div></div><div className="space-y-4"><div className="soft-card p-6"><div className="mb-4 flex items-center gap-2"><Activity size={18} className="text-[hsl(var(--primary))]" /><h2 className="font-bold">Connection status</h2></div><div className="flex items-center gap-3 rounded-xl bg-[hsl(var(--muted)/.65)] p-3"><span className={`size-2.5 rounded-full ${health.isError ? 'bg-[hsl(var(--destructive))]' : 'bg-emerald-500'}`} /><div><p className="text-sm font-bold">{health.isLoading ? 'Checking care network…' : health.isError ? 'Offline mode' : 'Care network connected'}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{health.isError ? 'Some searches may be delayed.' : 'Your local services are reachable.'}</p></div></div><div className="mt-3 flex items-center gap-3 rounded-xl bg-[hsl(var(--muted)/.65)] p-3"><span className={`size-2.5 rounded-full ${supabaseAuthConfigured ? 'bg-emerald-500' : 'bg-[hsl(var(--accent))]'}`} /><div><p className="text-sm font-bold">{supabaseAuthConfigured ? 'Supabase OTP enabled' : 'Demo OTP mode'}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{supabaseAuthConfigured ? 'Phone verification is connected.' : 'Add Supabase env values to enable live SMS.'}</p></div></div></div><button onClick={handleSignOut} className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--card))] text-sm font-bold text-[hsl(var(--destructive))]" data-testid="button-settings-sign-out"><LogOut size={17} /> Sign out</button></div></div></div>;
}

function Login() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (!sent) {
        await sendOtp(`+91${phone.replace(/\D/g, '')}`);
        setSent(true);
      } else {
        await verifyOtp(`+91${phone.replace(/\D/g, '')}`, code.trim());
        setLocation('/');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="noise paper-grid flex min-h-[100dvh] items-center justify-center p-5"><div className="grid w-full max-w-[900px] overflow-hidden rounded-[1.4rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-md)] md:grid-cols-[.9fr_1.1fr]"><div className="relative hidden overflow-hidden bg-[hsl(var(--primary))] p-10 text-[hsl(var(--primary-foreground))] md:block"><div className="absolute -bottom-24 -left-20 size-64 rounded-full border-[22px] border-[hsl(var(--accent)/.17)]" /><Logo /><div className="relative mt-28"><p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--accent))]">A bridge to local care</p><h1 className="display mt-4 text-4xl font-semibold leading-tight">The right care,<br />a little closer.</h1><p className="mt-5 max-w-xs text-sm leading-6 text-[hsl(var(--primary-foreground)/.7)]">SwasthyaSetu helps you move from a question to a doctor, facility, or next step without feeling lost.</p></div><div className="absolute bottom-9 left-10 flex items-center gap-2 text-xs text-[hsl(var(--primary-foreground)/.6)]"><ShieldCheck size={15} /> Built for your care journey</div></div><div className="p-7 sm:p-12"><div className="mb-12 md:hidden"><Logo /></div><p className="mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">Patient sign in</p><h2 className="display mt-3 text-3xl font-semibold">Welcome back.</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Use your phone number to continue to your care space.</p><div className="mt-9">{!sent ? <label className="block text-xs font-bold">Phone number<div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))]"><span className="flex items-center border-r border-[hsl(var(--border))] px-3 text-sm font-bold text-[hsl(var(--muted-foreground))]">+91</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98 0000 0000" className="focus-ring min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" data-testid="input-login-phone" /></div></label> : <label className="block text-xs font-bold">One-time password<input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter 6-digit code" className="focus-ring mt-2 h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 text-sm outline-none" data-testid="input-login-otp" /></label>}{error && <p className="mt-3 text-xs font-semibold text-[hsl(var(--destructive))]" data-testid="status-login-error">{error}</p>}<button onClick={submit} disabled={busy || (!sent && phone.length < 6) || (sent && code.trim().length < 6)} className="focus-ring mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-45" data-testid="button-login-submit">{busy ? <Loader2 className="animate-spin" size={16} /> : sent ? 'Continue to SwasthyaSetu' : 'Send OTP'} {!busy && <ArrowRight size={16} />}</button>{sent && <p className="mt-3 text-center text-xs text-[hsl(var(--muted-foreground))]" data-testid="text-demo-safe-login">{supabaseAuthConfigured ? 'OTP sent. Check your phone and enter the code.' : 'Demo mode: use any 6-digit code to continue.'}</p>}</div><div className="mt-10 border-t border-[hsl(var(--border))] pt-5 text-center text-xs text-[hsl(var(--muted-foreground))]">By continuing, you agree to keep your care details private.</div></div></div></div>;
}

function Router() {
  const [location] = useLocation();
  const standalone = location === '/login';
  return <RoutedErrorBoundary><>{standalone ? <Switch><Route path="/login" component={Login} /></Switch> : <Shell><Switch><Route path="/" component={Home} /><Route path="/hospitals" component={Hospitals} /><Route path="/doctors" component={Doctors} /><Route path="/appointments" component={Appointments} /><Route path="/consult/:roomName" component={Consult} /><Route path="/assistant" component={Assistant} /><Route path="/settings" component={Settings} /><Route path="/login" component={Login} /><Route component={NotFound} /></Switch></Shell>}</></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;