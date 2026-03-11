"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  FolderKanban,
  CheckSquare,
  BarChart3,
  Check,
  Building2,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INTERVAL = 6000;

// ---------------------------------------------------------------------------
// Slide data types
// ---------------------------------------------------------------------------

interface MetricItem {
  icon: React.ElementType;
  label: string;
  value: string;
}

interface SlideData {
  id: string;
  type: "hero" | "dashboard" | "features";
  headline: string;
  subtitle: string;
  metrics?: MetricItem[];
  features?: string[];
  ctaText?: string;
  quote?: string;
}

// ---------------------------------------------------------------------------
// Slide content data
// ---------------------------------------------------------------------------

const LOGIN_SLIDES: SlideData[] = [
  {
    id: "login-hero",
    type: "hero",
    headline: "Bem-vindo de volta",
    subtitle:
      "Acesse seu dashboard e acompanhe tudo que acontece na sua organização em tempo real.",
    metrics: [
      { icon: Users, label: "Usuários ativos", value: "1.248" },
      { icon: FolderKanban, label: "Projetos", value: "34" },
      { icon: CheckSquare, label: "Tarefas concluídas", value: "892" },
    ],
    ctaText: "Mais de 1.200 equipes confiam na plataforma",
  },
  {
    id: "login-dashboard",
    type: "dashboard",
    headline: "Visibilidade total",
    subtitle:
      "Métricas em tempo real, audit log completo e controle granular de permissões.",
    metrics: [
      { icon: BarChart3, label: "Atividade hoje", value: "+128" },
      { icon: Shield, label: "Eventos de segurança", value: "0" },
      { icon: Zap, label: "Uptime", value: "99.9%" },
    ],
  },
  {
    id: "login-features",
    type: "features",
    headline: "Tudo que você precisa",
    subtitle: "Uma plataforma completa para gerenciar equipes e projetos.",
    features: [
      "RBAC com 4 níveis de permissão",
      "Rate limiting e proteção anti-bot",
      "Audit log imutável de todas as ações",
      "Multi-tenant com isolamento total",
      "2FA com TOTP (em breve)",
    ],
    quote: "Segurança e produtividade no mesmo lugar.",
  },
];

const SIGNUP_SLIDES: SlideData[] = [
  {
    id: "signup-hero",
    type: "hero",
    headline: "Crie seu workspace",
    subtitle:
      "Configure sua organização em minutos e convide sua equipe para colaborar em projetos.",
    metrics: [
      { icon: Building2, label: "Orgs criadas hoje", value: "47" },
      { icon: Users, label: "Membros onboard", value: "203" },
      { icon: FolderKanban, label: "Projetos iniciados", value: "89" },
    ],
    ctaText: "Setup completo em menos de 5 minutos",
  },
  {
    id: "signup-dashboard",
    type: "dashboard",
    headline: "Dashboard pronto",
    subtitle:
      "Assim que criar sua conta, seu dashboard estará pronto para uso imediato.",
    metrics: [
      { icon: Zap, label: "Tempo de setup", value: "< 5min" },
      { icon: Users, label: "Membros no plano", value: "Ilimitado" },
      { icon: FolderKanban, label: "Projetos no plano", value: "Ilimitado" },
    ],
  },
  {
    id: "signup-features",
    type: "features",
    headline: "O que você vai ter",
    subtitle: "Tudo incluso no cadastro, sem cartão de crédito necessário.",
    features: [
      "Organização com slug personalizado",
      "Equipe com controle de permissões (RBAC)",
      "Projetos e tarefas colaborativas",
      "Audit log de todas as ações",
      "Autenticação 2FA (em breve)",
    ],
    quote: "Grátis para começar. Cresça conforme precisar.",
  },
];

const SLIDES: Record<"login" | "signup", SlideData[]> = {
  login: LOGIN_SLIDES,
  signup: SIGNUP_SLIDES,
};

// ---------------------------------------------------------------------------
// Shared class tokens — light mode (dark bg) / dark mode (light bg)
// ---------------------------------------------------------------------------

// Card: glass on dark bg / solid white card on light bg
const cardBg =
  "bg-white/8 dark:bg-black/5 dark:border dark:border-zinc-200/80";

// Icon container
const iconBg = "bg-white/12 dark:bg-zinc-200";

// Text hierarchy
const textPrimary = "text-white dark:text-zinc-900";
const textSecondary = "text-white/65 dark:text-zinc-500";
const textTertiary = "text-white/50 dark:text-zinc-400";

// ---------------------------------------------------------------------------
// Background decorative shapes — very subtle
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

// ---------------------------------------------------------------------------
// Fake bar chart
// ---------------------------------------------------------------------------

function MiniBarChart() {
  const bars = [40, 65, 50, 80, 60, 90, 72];
  return (
    <div
      className="flex items-end gap-1 h-10"
      role="img"
      aria-label="Gráfico de atividade"
    >
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-white/25 dark:bg-zinc-400"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avatar group — neutral palette
// ---------------------------------------------------------------------------

const AVATAR_SHADES = [
  "bg-zinc-600 dark:bg-zinc-400",
  "bg-zinc-500 dark:bg-zinc-500",
  "bg-zinc-400 dark:bg-zinc-600",
  "bg-zinc-300 dark:bg-zinc-700",
];
const AVATAR_INITIALS = ["M", "A", "J", "K"];

function AvatarGroup() {
  return (
    <div className="flex items-center">
      {AVATAR_INITIALS.map((initial, i) => (
        <div
          key={i}
          className={cn(
            "flex size-7 items-center justify-center rounded-full border-2",
            "border-zinc-800 dark:border-zinc-100",
            "text-xs font-bold text-white dark:text-zinc-900",
            AVATAR_SHADES[i],
            i > 0 && "-ml-2"
          )}
          aria-hidden
        >
          {initial}
        </div>
      ))}
      <span className={cn("ml-3 text-xs", textSecondary)}>+1.2k usuários</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slide components
// ---------------------------------------------------------------------------

function HeroSlide({ slide }: { slide: SlideData }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className={cn("text-3xl font-bold leading-tight", textPrimary)}>
            {slide.headline}
          </h2>
          <p className={cn("text-sm leading-relaxed max-w-xs", textSecondary)}>
            {slide.subtitle}
          </p>
        </div>

        {slide.metrics && (
          <div className="space-y-2">
            {slide.metrics.map((m) => (
              <motion.div
                key={m.label}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "rounded-xl px-4 py-3 flex items-center gap-3",
                  cardBg
                )}
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md shrink-0",
                    iconBg
                  )}
                >
                  <m.icon
                    className={cn(
                      "size-4",
                      "text-white/80 dark:text-zinc-600"
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-xs truncate", textTertiary)}>
                    {m.label}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold tabular-nums leading-tight",
                      textPrimary
                    )}
                  >
                    {m.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* CTA card */}
      {slide.ctaText && (
        <div
          className={cn(
            "rounded-xl border p-4 space-y-3",
            "bg-white/5 border-white/10",
            "dark:bg-zinc-100 dark:border-zinc-200"
          )}
        >
          <AvatarGroup />
          <p className={cn("text-sm font-medium", textPrimary)}>
            {slide.ctaText}
          </p>
        </div>
      )}
    </div>
  );
}

function DashboardSlide({ slide }: { slide: SlideData }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className={cn("text-3xl font-bold leading-tight", textPrimary)}>
            {slide.headline}
          </h2>
          <p className={cn("text-sm leading-relaxed max-w-xs", textSecondary)}>
            {slide.subtitle}
          </p>
        </div>

        {slide.metrics && (
          <div className="grid grid-cols-2 gap-2">
            {slide.metrics.map((m) => (
              <motion.div
                key={m.label}
                whileHover={{ scale: 1.03 }}
                className={cn("rounded-xl p-3 space-y-1", cardBg)}
              >
                <div className="flex items-center gap-1.5">
                  <m.icon
                    className={cn("size-3.5", "text-white/50 dark:text-zinc-400")}
                  />
                  <p className={cn("text-xs truncate", textTertiary)}>
                    {m.label}
                  </p>
                </div>
                <p className={cn("text-xl font-bold tabular-nums", textPrimary)}>
                  {m.value}
                </p>
              </motion.div>
            ))}

            {/* Chart card */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className={cn("col-span-2 rounded-xl p-3 space-y-2", cardBg)}
            >
              <p className={cn("text-xs", textTertiary)}>
                Atividade — últimos 7 dias
              </p>
              <MiniBarChart />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturesSlide({ slide }: { slide: SlideData }) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className={cn("text-3xl font-bold leading-tight", textPrimary)}>
            {slide.headline}
          </h2>
          <p className={cn("text-sm leading-relaxed max-w-xs", textSecondary)}>
            {slide.subtitle}
          </p>
        </div>

        {slide.features && (
          <div className={cn("rounded-xl p-4 space-y-3", cardBg)}>
            {slide.features.map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full shrink-0",
                    iconBg
                  )}
                >
                  <Check
                    className={cn(
                      "size-3",
                      "text-white/80 dark:text-zinc-600"
                    )}
                    strokeWidth={3}
                  />
                </div>
                <span className={cn("text-sm", textSecondary)}>{feature}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {slide.quote && (
        <blockquote className="border-l-2 border-white/20 dark:border-zinc-300 pl-4">
          <p
            className={cn(
              "text-sm italic",
              "text-white/60 dark:text-zinc-500"
            )}
          >
            {slide.quote}
          </p>
        </blockquote>
      )}
    </div>
  );
}

function SlideContent({ slide }: { slide: SlideData }) {
  if (slide.type === "hero") return <HeroSlide slide={slide} />;
  if (slide.type === "dashboard") return <DashboardSlide slide={slide} />;
  return <FeaturesSlide slide={slide} />;
}

// ---------------------------------------------------------------------------
// Slide transition variants
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
        // Light mode: near-black
        "bg-zinc-950",
        // Dark mode: near-white (inversion)
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
