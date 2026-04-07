"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Shield,
  Lock,
  Globe,
  Server,
  UserPlus,
  Settings2,
  Users,
  Star,
  FolderKanban,
  Zap,
  Building2,
  TrendingUp,
  Clock,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INTERVAL = 6000;

// ---------------------------------------------------------------------------
// Color tokens
// ---------------------------------------------------------------------------

const cardBg =
  "bg-white/8 dark:bg-black/5 dark:border dark:border-zinc-200/80";
const iconBg = "bg-white/12 dark:bg-zinc-200";
const textPrimary = "text-white dark:text-zinc-900";
const textSecondary = "text-white/65 dark:text-zinc-500";
const textTertiary = "text-white/50 dark:text-zinc-400";

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

// ---------------------------------------------------------------------------
// Shared decorative components
// ---------------------------------------------------------------------------

function BackgroundShapes() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/[0.03] dark:bg-black/[0.03]" />
      <div className="absolute -bottom-16 -left-16 size-72 rounded-full bg-white/[0.03] dark:bg-black/[0.03]" />
      <div className="absolute top-1/3 right-1/4 size-40 rounded-full bg-white/[0.02] dark:bg-black/[0.02]" />
    </div>
  );
}

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="size-4 fill-amber-400 text-amber-400 drop-shadow-sm"
        />
      ))}
    </div>
  );
}

function MiniBarChart() {
  const bars = [35, 58, 45, 72, 55, 88, 68];
  return (
    <div
      className="flex items-end gap-[3px] h-9"
      role="img"
      aria-label="Gráfico de atividade"
    >
      {bars.map((h, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-sm transition-all",
            i === bars.length - 1
              ? "bg-white/50 dark:bg-zinc-500"
              : "bg-white/20 dark:bg-zinc-300"
          )}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 1 (LOGIN) — Testimonial
// ---------------------------------------------------------------------------

interface TestimonialData {
  type: "testimonial";
  quote: string;
  author: string;
  role: string;
  company: string;
  initials: string;
  avatarShade: string;
  metric: string;
  metricLabel: string;
  metricIcon: React.ElementType;
}

function TestimonialSlide({ data }: { data: TestimonialData }) {
  return (
    <motion.div
      className="flex h-full flex-col justify-between"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Top section */}
      <div className="space-y-5">
        <motion.div variants={itemVariants}>
          <Stars />
        </motion.div>

        {/* Quote */}
        <motion.div variants={itemVariants} className="space-y-1">
          <div
            className={cn(
              "text-[80px] leading-none font-serif select-none -mb-4",
              "text-white/18 dark:text-zinc-300"
            )}
          >
            &ldquo;
          </div>
          <blockquote
            className={cn(
              "text-xl font-medium leading-relaxed tracking-tight",
              textPrimary
            )}
          >
            {data.quote}
          </blockquote>
        </motion.div>

        {/* Author */}
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-full",
              "border-2 border-white/20 dark:border-zinc-200",
              "text-sm font-bold",
              "text-white dark:text-zinc-900",
              data.avatarShade
            )}
          >
            {data.initials}
          </div>
          <div>
            <p className={cn("text-sm font-semibold leading-tight", textPrimary)}>
              {data.author}
            </p>
            <p className={cn("text-xs mt-0.5", textSecondary)}>
              {data.role} &middot; {data.company}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom — highlighted metric */}
      <motion.div
        variants={itemVariants}
        className={cn("rounded-2xl p-5 flex items-center gap-5", cardBg)}
      >
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-xl shrink-0",
            iconBg
          )}
        >
          <data.metricIcon
            className={cn("size-7", "text-white/70 dark:text-zinc-600")}
          />
        </div>
        <div>
          <p className={cn("text-4xl font-bold tabular-nums leading-none", textPrimary)}>
            {data.metric}
          </p>
          <p className={cn("text-xs mt-1.5", textSecondary)}>
            {data.metricLabel}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 2 (LOGIN) — Security / compliance
// ---------------------------------------------------------------------------

interface SecurityBadge {
  icon: React.ElementType;
  label: string;
  sublabel: string;
}

interface SecurityData {
  type: "security";
  headline: string;
  subtitle: string;
  badges: SecurityBadge[];
  stats: { value: string; label: string }[];
}

function SecuritySlide({ data }: { data: SecurityData }) {
  return (
    <motion.div
      className="flex h-full flex-col justify-between"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="space-y-5">
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className={cn("text-3xl font-bold leading-tight", textPrimary)}>
            {data.headline}
          </h2>
          <p className={cn("text-sm leading-relaxed max-w-xs", textSecondary)}>
            {data.subtitle}
          </p>
        </motion.div>

        {/* 2×2 badge grid */}
        <div className="grid grid-cols-2 gap-2">
          {data.badges.map((badge) => (
            <motion.div
              key={badge.label}
              variants={itemVariants}
              className={cn("rounded-xl p-4 flex items-center gap-3", cardBg)}
            >
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg shrink-0",
                  iconBg
                )}
              >
                <badge.icon
                  className={cn("size-4", "text-white/70 dark:text-zinc-600")}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-xs font-semibold truncate leading-tight",
                    textPrimary
                  )}
                >
                  {badge.label}
                </p>
                <p className={cn("text-[10px] truncate mt-0.5", textTertiary)}>
                  {badge.sublabel}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats strip */}
        <motion.div
          variants={itemVariants}
          className={cn("rounded-xl p-4 flex items-center", cardBg)}
        >
          {data.stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "flex-1 text-center",
                i > 0 && "border-l border-white/10 dark:border-zinc-200"
              )}
            >
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums leading-none",
                  textPrimary
                )}
              >
                {s.value}
              </p>
              <p className={cn("text-[10px] mt-1", textTertiary)}>{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Footer note */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2.5"
      >
        <div
          className={cn(
            "flex size-6 items-center justify-center rounded-full shrink-0",
            iconBg
          )}
        >
          <Lock
            className={cn("size-3", "text-white/70 dark:text-zinc-600")}
          />
        </div>
        <p className={cn("text-xs", textTertiary)}>
          Dados criptografados em repouso e em trânsito — AES-256 + TLS 1.3
        </p>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 3 (LOGIN) — Features list
// ---------------------------------------------------------------------------

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface FeaturesData {
  type: "features";
  headline: string;
  subtitle: string;
  features: FeatureItem[];
  quote?: string;
}

function FeaturesSlide({ data }: { data: FeaturesData }) {
  return (
    <motion.div
      className="flex h-full flex-col justify-between"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="space-y-5">
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className={cn("text-3xl font-bold leading-tight", textPrimary)}>
            {data.headline}
          </h2>
          <p className={cn("text-sm leading-relaxed max-w-xs", textSecondary)}>
            {data.subtitle}
          </p>
        </motion.div>

        <div className="space-y-2">
          {data.features.map((f) => (
            <motion.div
              key={f.title}
              variants={itemVariants}
              className={cn(
                "rounded-xl px-4 py-3.5 flex items-center gap-3",
                cardBg
              )}
            >
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg shrink-0",
                  iconBg
                )}
              >
                <f.icon
                  className={cn("size-4", "text-white/70 dark:text-zinc-600")}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold truncate leading-tight",
                    textPrimary
                  )}
                >
                  {f.title}
                </p>
                <p className={cn("text-xs mt-0.5 truncate", textTertiary)}>
                  {f.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {data.quote && (
        <motion.div
          variants={itemVariants}
          className="border-l-2 border-white/20 dark:border-zinc-300 pl-4"
        >
          <p
            className={cn(
              "text-sm italic leading-relaxed",
              "text-white/60 dark:text-zinc-500"
            )}
          >
            {data.quote}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 1 (SIGNUP) — Steps "Como funciona"
// ---------------------------------------------------------------------------

interface StepItem {
  icon: React.ElementType;
  number: string;
  title: string;
  description: string;
}

interface StepsData {
  type: "steps";
  headline: string;
  subtitle: string;
  steps: StepItem[];
  footer: string;
}

function StepsSlide({ data }: { data: StepsData }) {
  return (
    <motion.div
      className="flex h-full flex-col justify-between"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="space-y-5">
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className={cn("text-3xl font-bold leading-tight", textPrimary)}>
            {data.headline}
          </h2>
          <p className={cn("text-sm leading-relaxed max-w-xs", textSecondary)}>
            {data.subtitle}
          </p>
        </motion.div>

        <div className="space-y-2">
          {data.steps.map((step, i) => (
            <motion.div key={step.number} variants={itemVariants}>
              <div
                className={cn("rounded-xl px-4 py-4 flex items-start gap-4", cardBg)}
              >
                {/* Icon + connecting line */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      iconBg
                    )}
                  >
                    <step.icon
                      className={cn(
                        "size-4",
                        "text-white/70 dark:text-zinc-600"
                      )}
                    />
                  </div>
                  {i < data.steps.length - 1 && (
                    <div className="w-px h-3 bg-white/12 dark:bg-zinc-300" />
                  )}
                </div>

                <div className="min-w-0">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      textTertiary
                    )}
                  >
                    Passo {step.number}
                  </span>
                  <p
                    className={cn(
                      "text-sm font-semibold leading-tight mt-0.5",
                      textPrimary
                    )}
                  >
                    {step.title}
                  </p>
                  <p className={cn("text-xs mt-0.5", textTertiary)}>
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <motion.div
        variants={itemVariants}
        className={cn("rounded-xl p-4 flex items-center gap-3", cardBg)}
      >
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-md shrink-0",
            iconBg
          )}
        >
          <Clock
            className={cn("size-4", "text-white/70 dark:text-zinc-600")}
          />
        </div>
        <p className={cn("text-sm font-medium", textPrimary)}>{data.footer}</p>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 2 (SIGNUP) — Metrics / social proof
// ---------------------------------------------------------------------------

interface MetricItem {
  icon: React.ElementType;
  value: string;
  label: string;
  trend?: string;
}

interface MetricsData {
  type: "metrics";
  headline: string;
  subtitle: string;
  mainValue: string;
  mainLabel: string;
  mainIcon: React.ElementType;
  items: MetricItem[];
}

function MetricsSlide({ data }: { data: MetricsData }) {
  return (
    <motion.div
      className="flex h-full flex-col justify-between"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="space-y-5">
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className={cn("text-3xl font-bold leading-tight", textPrimary)}>
            {data.headline}
          </h2>
          <p className={cn("text-sm leading-relaxed max-w-xs", textSecondary)}>
            {data.subtitle}
          </p>
        </motion.div>

        {/* Hero metric */}
        <motion.div
          variants={itemVariants}
          className={cn("rounded-2xl p-5 flex items-center gap-5", cardBg)}
        >
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-xl shrink-0",
              iconBg
            )}
          >
            <data.mainIcon
              className={cn("size-7", "text-white/70 dark:text-zinc-600")}
            />
          </div>
          <div>
            <p
              className={cn(
                "text-4xl font-bold tabular-nums leading-none",
                textPrimary
              )}
            >
              {data.mainValue}
            </p>
            <p className={cn("text-xs mt-1.5", textSecondary)}>
              {data.mainLabel}
            </p>
          </div>
        </motion.div>

        {/* Grid metrics */}
        <div className="grid grid-cols-2 gap-2">
          {data.items.map((m) => (
            <motion.div
              key={m.label}
              variants={itemVariants}
              className={cn("rounded-xl p-3.5 space-y-1", cardBg)}
            >
              <div className="flex items-center gap-1.5">
                <m.icon
                  className={cn("size-3.5", "text-white/50 dark:text-zinc-400")}
                />
                <p className={cn("text-[10px] truncate", textTertiary)}>
                  {m.label}
                </p>
              </div>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums leading-tight",
                  textPrimary
                )}
              >
                {m.value}
              </p>
              {m.trend && (
                <p className="text-[10px] text-emerald-400 dark:text-emerald-600 font-semibold">
                  {m.trend}
                </p>
              )}
            </motion.div>
          ))}

          {/* Activity chart */}
          <motion.div
            variants={itemVariants}
            className={cn("col-span-2 rounded-xl p-3.5 space-y-2", cardBg)}
          >
            <p className={cn("text-xs", textTertiary)}>
              Atividade — últimos 7 dias
            </p>
            <MiniBarChart />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Slide data
// ---------------------------------------------------------------------------

type AnySlide =
  | TestimonialData
  | SecurityData
  | FeaturesData
  | StepsData
  | MetricsData;

const LOGIN_SLIDES: AnySlide[] = [
  {
    type: "testimonial",
    quote:
      "Reduzimos reuniões de status em 60% no primeiro mês. O audit log nos salvou em duas auditorias internas.",
    author: "Ana Costa",
    role: "CTO",
    company: "Fintech XYZ",
    initials: "AC",
    avatarShade: "bg-zinc-600 dark:bg-zinc-400",
    metric: "−60%",
    metricLabel: "Tempo gasto em reuniões de alinhamento de equipe",
    metricIcon: TrendingUp,
  },
  {
    type: "security",
    headline: "Segurança enterprise",
    subtitle:
      "Construída para equipes que levam dados a sério — conformidade, criptografia e monitoramento 24/7.",
    badges: [
      { icon: Shield, label: "SOC 2 Type II", sublabel: "Auditoria anual" },
      { icon: Globe, label: "LGPD / GDPR", sublabel: "Dados no Brasil e UE" },
      {
        icon: Server,
        label: "ISO 27001",
        sublabel: "Gestão de segurança",
      },
      {
        icon: Lock,
        label: "E2E Encryption",
        sublabel: "AES-256 + TLS 1.3",
      },
    ],
    stats: [
      { value: "99.9%", label: "Uptime SLA" },
      { value: "0", label: "Brechas em 2024" },
      { value: "<50ms", label: "P99 latência" },
    ],
  },
  {
    type: "features",
    headline: "Tudo que você precisa",
    subtitle: "Uma plataforma completa para equipes modernas.",
    features: [
      {
        icon: Shield,
        title: "RBAC granular",
        description: "4 níveis: Owner, Admin, Member, Guest",
      },
      {
        icon: BarChart3,
        title: "Audit log imutável",
        description: "Rastreie cada ação da sua organização",
      },
      {
        icon: Users,
        title: "Multi-tenant",
        description: "Isolamento total entre organizações",
      },
      {
        icon: Zap,
        title: "Rate limiting",
        description: "Proteção automática contra abusos",
      },
    ],
    quote: "Segurança e produtividade no mesmo lugar.",
  },
];

const SIGNUP_SLIDES: AnySlide[] = [
  {
    type: "steps",
    headline: "Configure em minutos",
    subtitle:
      "Três passos simples para sua equipe estar colaborando em projetos.",
    steps: [
      {
        icon: UserPlus,
        number: "1",
        title: "Crie sua conta",
        description: "Email + senha. Sem cartão de crédito necessário.",
      },
      {
        icon: Settings2,
        number: "2",
        title: "Configure seu workspace",
        description: "Defina o slug, permissões e perfil da organização.",
      },
      {
        icon: Users,
        number: "3",
        title: "Convide sua equipe",
        description: "Envie convites por email com funções pré-definidas.",
      },
    ],
    footer: "Setup completo em menos de 5 minutos",
  },
  {
    type: "metrics",
    headline: "Crescendo todo dia",
    subtitle: "Equipes de todo o Brasil confiam na plataforma.",
    mainValue: "4.200+",
    mainLabel: "Organizações ativas na plataforma",
    mainIcon: Building2,
    items: [
      {
        icon: Users,
        value: "23k+",
        label: "Membros ativos",
        trend: "↑ 18% este mês",
      },
      {
        icon: FolderKanban,
        value: "89k+",
        label: "Projetos criados",
        trend: "↑ 12% este mês",
      },
      { icon: CheckSquare, value: "340k", label: "Tarefas entregues" },
      { icon: Zap, value: "99.9%", label: "Uptime histórico" },
    ],
  },
  {
    type: "features",
    headline: "O que você vai ter",
    subtitle: "Tudo incluso no cadastro, sem cartão de crédito.",
    features: [
      {
        icon: Building2,
        title: "Org com slug personalizado",
        description: "Seu workspace com URL exclusiva",
      },
      {
        icon: Shield,
        title: "RBAC completo",
        description: "Controle quem pode ver e fazer o quê",
      },
      {
        icon: FolderKanban,
        title: "Projetos ilimitados",
        description: "Sem limites no plano gratuito",
      },
      {
        icon: BarChart3,
        title: "Audit log completo",
        description: "Histórico de todas as ações",
      },
    ],
    quote: "Grátis para começar. Cresça conforme precisar.",
  },
];

// ---------------------------------------------------------------------------
// Slide router
// ---------------------------------------------------------------------------

function SlideContent({ slide }: { slide: AnySlide }) {
  if (slide.type === "testimonial")
    return <TestimonialSlide data={slide} />;
  if (slide.type === "security") return <SecuritySlide data={slide} />;
  if (slide.type === "features") return <FeaturesSlide data={slide} />;
  if (slide.type === "steps") return <StepsSlide data={slide} />;
  if (slide.type === "metrics") return <MetricsSlide data={slide} />;
  return null;
}

// ---------------------------------------------------------------------------
// Slide transitions
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? "-40%" : "40%",
    opacity: 0,
  }),
};

const slideTransition = {
  duration: 0.45,
  ease: [0.32, 0.72, 0, 1] as const,
};

// ---------------------------------------------------------------------------
// AuthCarousel
// ---------------------------------------------------------------------------

const SLIDES: Record<"login" | "signup", AnySlide[]> = {
  login: LOGIN_SLIDES,
  signup: SIGNUP_SLIDES,
};

interface AuthCarouselProps {
  mode: "login" | "signup";
}

export function AuthCarousel({ mode }: AuthCarouselProps) {
  const reduced = useReducedMotion();
  const slides = SLIDES[mode];

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setCurrent(0);
    setDirection(1);
  }, [mode]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current]
  );

  useEffect(() => {
    if (paused || reduced) return;
    const id = setInterval(goNext, INTERVAL);
    return () => clearInterval(id);
  }, [paused, reduced, goNext]);

  return (
    <div
      className={cn(
        "relative h-full overflow-hidden",
        "bg-zinc-950",
        "dark:bg-zinc-50"
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <BackgroundShapes />

      {/* Brand */}
      <div className="absolute top-8 left-8 flex items-center gap-2 z-20">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-md",
            "bg-white/10 dark:bg-zinc-200"
          )}
        >
          <BarChart3
            className={cn("size-4", "text-white/80 dark:text-zinc-700")}
          />
        </div>
        <span
          className={cn(
            "text-sm font-semibold",
            "text-white/80 dark:text-zinc-700"
          )}
        >
          Projorg
        </span>
      </div>

      {/* Slides */}
      <div className="absolute inset-0 z-10 pt-20 pb-20 px-8 lg:px-12">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={`${mode}-${current}`}
            custom={direction}
            variants={reduced ? {} : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduced ? { duration: 0 } : slideTransition}
            className="h-full"
          >
            <SlideContent slide={slides[current]} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-8 right-8 flex items-center justify-between z-20">
        {/* Dots */}
        <div
          className="flex items-center gap-2"
          role="tablist"
          aria-label="Slides do carrossel"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === current}
              aria-label={`Ir para slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "w-5 h-2 bg-white dark:bg-zinc-800"
                  : "size-2 bg-white/30 hover:bg-white/50 dark:bg-zinc-300 dark:hover:bg-zinc-500"
              )}
            />
          ))}
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={goPrev}
            aria-label="Slide anterior"
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors",
              "bg-white/8 hover:bg-white/15 text-white/70",
              "dark:bg-zinc-900/8 dark:hover:bg-zinc-900/15 dark:text-zinc-500"
            )}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={goNext}
            aria-label="Próximo slide"
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors",
              "bg-white/8 hover:bg-white/15 text-white/70",
              "dark:bg-zinc-900/8 dark:hover:bg-zinc-900/15 dark:text-zinc-500"
            )}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
