"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

type Mode = "login" | "signup";
type AnimPhase = "idle" | "exit" | "enter";
type AnimDir = "fwd" | "bwd";

const FONT = "var(--font-space-grotesk), sans-serif";
const HEADLINE_FONT = "var(--font-bebas-neue), sans-serif";
const HEADLINE_SIZE = 128;

// ─── Logo mark ────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="0" y="0" width="10" height="10" fill="#f0f0f0" rx="1.5" />
      <rect x="12" y="0" width="10" height="10" fill="rgba(255,255,255,0.2)" rx="1.5" />
      <rect x="0" y="12" width="10" height="10" fill="rgba(255,255,255,0.2)" rx="1.5" />
      <rect x="12" y="12" width="10" height="10" fill="rgba(255,255,255,0.06)" rx="1.5" />
    </svg>
  );
}

// ─── Hover wrapper (increases opacity on hover) ───────────────────────────────

function HoverMockup({
  children,
  baseOpacity,
}: {
  children: React.ReactNode;
  baseOpacity: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: hovered ? Math.min(baseOpacity + 0.28, 1) : baseOpacity,
        transition: "opacity 0.3s ease",
        cursor: "default",
      }}
    >
      {children}
    </div>
  );
}

// ─── Carousel mockups ─────────────────────────────────────────────────────────

function KanbanMockup() {
  const cols = [
    {
      name: "A fazer",
      count: 3,
      cards: [
        { label: "Integração com API", active: false, done: false },
        { label: "Pesquisa de usuários", active: false, done: false },
        { label: "Auditoria de componentes", active: false, done: false },
      ],
    },
    {
      name: "Em andamento",
      count: 2,
      cards: [
        { label: "Dashboard v2", active: true, done: false },
        { label: "Redesign do auth", active: true, done: false },
      ],
    },
    {
      name: "Concluído",
      count: 2,
      cards: [
        { label: "Sistema de design", active: false, done: true },
        { label: "Fluxo de onboarding", active: false, done: true },
      ],
    },
  ];

  return (
    <HoverMockup baseOpacity={0.72}>
      <div style={{ display: "flex", gap: "10px" }}>
        {cols.map((col, ci) => (
          <div
            key={ci}
            style={{
              width: "164px",
              background: "rgba(255,255,255,0.022)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "8px",
              padding: "13px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "11px",
              }}
            >
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.11em",
                  color: "#3a3a3a",
                  textTransform: "uppercase",
                  fontFamily: FONT,
                }}
              >
                {col.name}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  background: "rgba(255,255,255,0.05)",
                  color: "#383838",
                  borderRadius: "3px",
                  padding: "1px 5px",
                  fontFamily: FONT,
                }}
              >
                {col.count}
              </span>
            </div>
            {col.cards.map((card, i) => (
              <div
                key={i}
                style={{
                  background: card.active
                    ? "rgba(255,255,255,0.038)"
                    : "rgba(255,255,255,0.014)",
                  border: `1px solid ${card.active ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)"}`,
                  borderRadius: "5px",
                  padding: "9px 10px",
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "7px",
                }}
              >
                <div
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    marginTop: "3px",
                    background: card.done
                      ? "#2c2c2c"
                      : card.active
                        ? "#5c5c5c"
                        : "#323232",
                  }}
                />
                <span
                  style={{
                    fontSize: "10.5px",
                    lineHeight: 1.35,
                    fontFamily: FONT,
                    fontWeight: 400,
                    color: card.done
                      ? "#2e2e2e"
                      : card.active
                        ? "#686868"
                        : "#505050",
                    textDecoration: card.done ? "line-through" : "none",
                  }}
                >
                  {card.label}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </HoverMockup>
  );
}

function TeamMockup() {
  const members = [
    { i: "AJ", s: "#2c2c2c" },
    { i: "MK", s: "#242424" },
    { i: "PR", s: "#222" },
    { i: "SL", s: "#272727" },
    { i: "TW", s: "#1e1e1e" },
  ];
  const feed = [
    { name: "Alex J.", action: "concluiu", item: "Dashboard v2", time: "2m atrás" },
    { name: "Maya K.", action: "atribuiu", item: "Integração API para Priya", time: "14m atrás" },
    { name: "Priya R.", action: "comentou em", item: "Redesign do auth", time: "1h atrás" },
    { name: "Sam L.", action: "moveu", item: "Onboarding → Concluído", time: "2h atrás" },
  ];

  return (
    <HoverMockup baseOpacity={0.72}>
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex" }}>
            {members.map((m, i) => (
              <div
                key={i}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: m.s,
                  border: "2px solid #0d0d0d",
                  marginLeft: i === 0 ? 0 : "-9px",
                  zIndex: members.length - i,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9.5px",
                  fontWeight: 600,
                  color: "#555",
                  fontFamily: FONT,
                }}
              >
                {m.i}
              </div>
            ))}
          </div>
          <span
            style={{ marginLeft: "14px", fontSize: "11px", color: "#383838", fontFamily: FONT }}
          >
            12 membros ativos agora
          </span>
          <div
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px" }}
          >
            <div
              style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#3c3c3c" }}
            />
            <span style={{ fontSize: "10px", color: "#2a2a2a", fontFamily: FONT }}>Ao vivo</span>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.065)",
            borderRadius: "8px",
            overflow: "hidden",
            width: "440px",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#2c2c2c",
                fontFamily: FONT,
              }}
            >
              Atividade
            </span>
            <div
              style={{
                marginLeft: "auto",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
              }}
            />
          </div>
          {feed.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 14px",
                borderBottom:
                  i < feed.length - 1 ? "1px solid rgba(255,255,255,0.035)" : "none",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "8px",
                  color: "#555",
                  fontFamily: FONT,
                  fontWeight: 600,
                }}
              >
                {item.name[0]}
                {item.name.split(" ")[1]?.[0]}
              </div>
              <span
                style={{
                  flex: 1,
                  fontSize: "11px",
                  color: "#505050",
                  fontFamily: FONT,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span style={{ color: "#787878", fontWeight: 500 }}>{item.name}</span>{" "}
                {item.action}{" "}
                <span style={{ color: "#484848" }}>{item.item}</span>
              </span>
              <span
                style={{ fontSize: "10px", color: "#282828", fontFamily: FONT, flexShrink: 0 }}
              >
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </HoverMockup>
  );
}

function DashboardMockup() {
  const r = 36,
    circ = 2 * Math.PI * r,
    val = 73,
    dash = (val / 100) * circ;

  return (
    <HoverMockup baseOpacity={0.7}>
      <div style={{ display: "inline-flex" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.075)",
            borderRadius: "10px 0 0 10px",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle
              cx="45"
              cy="45"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.055)"
              strokeWidth="8"
            />
            <circle
              cx="45"
              cy="45"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="8"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={circ * 0.25}
              strokeLinecap="round"
            />
            <text
              x="45"
              y="41"
              textAnchor="middle"
              fill="#888"
              fontSize="15"
              fontFamily="Space Grotesk"
              fontWeight="600"
            >
              {val}%
            </text>
            <text
              x="45"
              y="55"
              textAnchor="middle"
              fill="#353535"
              fontSize="9"
              fontFamily="Space Grotesk"
            >
              concluído
            </text>
          </svg>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#2c2c2c",
              fontFamily: FONT,
            }}
          >
            Sprint 14
          </span>
        </div>
        <div style={{ width: "1px", background: "rgba(255,255,255,0.06)" }} />
        <div
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.075)",
            borderLeft: "none",
            borderRadius: "0 10px 10px 0",
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ marginBottom: "22px" }}>
            <div
              style={{
                fontSize: "40px",
                fontWeight: 700,
                color: "#787878",
                fontFamily: FONT,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              24
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#2c2c2c",
                fontFamily: FONT,
                marginTop: "5px",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              Tarefas concluídas
            </div>
          </div>
          <div
            style={{ height: "1px", background: "rgba(255,255,255,0.04)", marginBottom: "22px" }}
          />
          <div>
            <div
              style={{
                fontSize: "40px",
                fontWeight: 700,
                color: "#525252",
                fontFamily: FONT,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              9
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#2c2c2c",
                fontFamily: FONT,
                marginTop: "5px",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              Em andamento
            </div>
          </div>
        </div>
      </div>
    </HoverMockup>
  );
}

// ─── Slide data ───────────────────────────────────────────────────────────────

type SlideConfig = {
  tag: string;
  lines: string[];
  headlineScale: number;
  sub: string;
  Mockup: React.FC;
};

const SLIDES: SlideConfig[] = [
  {
    tag: "01",
    lines: ["CADA TAREFA.", "SEMPRE CLARA."],
    headlineScale: 1.0,
    sub: "Kanban, dependências e atribuições —\ntudo em um só lugar.",
    Mockup: KanbanMockup,
  },
  {
    tag: "02",
    lines: ["SEU TIME TODO,", "UM SÓ LUGAR."],
    headlineScale: 1.0,
    sub: "Convide membros, defina papéis e\nacompanhe o progresso em cada projeto.",
    Mockup: TeamMockup,
  },
  {
    tag: "03",
    lines: ["SAIBA O QUE", "ESTÁ ACONTECENDO.", "SEMPRE."],
    headlineScale: 0.88,
    sub: "Campos customizados, tarefas recorrentes,\ncontrole de tempo e resumos semanais.",
    Mockup: DashboardMockup,
  },
];

// ─── Right panel (carousel) ───────────────────────────────────────────────────

function RightPanel() {
  const [cur, setCur] = useState(0);
  const [carouselPhase, setCarouselPhase] = useState<"idle" | "exit" | "enter">("idle");
  const [animDir, setAnimDir] = useState<"fwd" | "bwd">("fwd");
  const [displayCur, setDisplayCur] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(
    (nextIdx: number, dir: "fwd" | "bwd") => {
      setAnimDir(dir);
      setCarouselPhase("exit");
      setTimeout(() => {
        setDisplayCur(nextIdx);
        setCur(nextIdx);
        setCarouselPhase("enter");
        setTimeout(() => setCarouselPhase("idle"), 450);
      }, 260);
    },
    []
  );

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCur((c) => {
        const next = (c + 1) % SLIDES.length;
        advance(next, "fwd");
        return c;
      });
    }, 5200);
  }, [advance]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  const goTo = (i: number) => {
    if (i === cur) return;
    advance(i, i > cur ? "fwd" : "bwd");
    resetTimer();
  };

  const slide = SLIDES[displayCur];
  const carouselClass =
    carouselPhase === "exit"
      ? `auth-carousel-exit-${animDir}`
      : carouselPhase === "enter"
        ? `auth-carousel-enter-${animDir}`
        : "";
  const fontSize = HEADLINE_SIZE * slide.headlineScale;

  return (
    <div
      className="auth-shell-right"
      style={{
        background: "#060606",
        padding: "52px 64px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Fine grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.014) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />
      {/* Corner accent — top-left */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "260px",
          height: "1px",
          background: "linear-gradient(90deg,rgba(255,255,255,0.11),transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "1px",
          height: "260px",
          background: "linear-gradient(180deg,rgba(255,255,255,0.11),transparent)",
          pointerEvents: "none",
        }}
      />
      {/* Corner accent — bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "180px",
          height: "1px",
          background: "linear-gradient(270deg,rgba(255,255,255,0.06),transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "1px",
          height: "180px",
          background: "linear-gradient(0deg,rgba(255,255,255,0.06),transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Animated carousel content */}
      <div
        className={carouselClass}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 2,
          willChange: "transform, opacity",
          minHeight: 0,
          height: "100%",
        }}
      >
        {/* Mockup area */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            maxHeight: "42vh",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <slide.Mockup />
        </div>

        {/* Text block */}
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.16em",
              color: "#333",
              textTransform: "uppercase",
              marginBottom: "16px",
              fontFamily: FONT,
            }}
          >
            {slide.tag} — 03
          </div>
          <div
            style={{
              fontFamily: HEADLINE_FONT,
              fontSize: `${fontSize}px`,
              lineHeight: 0.88,
              letterSpacing: "-0.01em",
              color: "#f0f0f0",
              marginBottom: "20px",
              overflow: "hidden",
            }}
          >
            {slide.lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
          <div
            style={{
              width: "36px",
              height: "1px",
              background: "rgba(255,255,255,0.18)",
              marginBottom: "14px",
            }}
          />
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.7,
              color: "#484848",
              fontFamily: FONT,
              whiteSpace: "pre-line",
              marginBottom: "28px",
              fontWeight: 400,
              maxWidth: "420px",
            }}
          >
            {slide.sub}
          </p>
          {/* Dot navigation */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                style={{
                  width: i === cur ? "32px" : "6px",
                  height: "2px",
                  background: i === cur ? "#ccc" : "#252525",
                  border: "none",
                  borderRadius: "2px",
                  cursor: "pointer",
                  transition: "all 0.45s cubic-bezier(0.4,0,0.2,1)",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Shell ───────────────────────────────────────────────────────────────

interface AuthShellProps {
  initialMode: Mode;
}

export function AuthShell({ initialMode }: AuthShellProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [phase, setPhase] = useState<AnimPhase>("idle");
  const [dir, setDir] = useState<AnimDir>("fwd");

  const switchMode = useCallback(
    (next: Mode) => {
      if (next === mode || phase !== "idle") return;
      const d: AnimDir = next === "signup" ? "fwd" : "bwd";
      setDir(d);
      setPhase("exit");
      setTimeout(() => {
        setMode(next);
        setPhase("enter");
        setTimeout(() => setPhase("idle"), 340);
      }, 270);
    },
    [mode, phase]
  );

  const animClass =
    phase === "exit"
      ? dir === "fwd"
        ? "auth-exit-fwd"
        : "auth-exit-bwd"
      : phase === "enter"
        ? dir === "fwd"
          ? "auth-enter-fwd"
          : "auth-enter-bwd"
        : "";

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        background: "#080808",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <div
        className="auth-shell-left dark"
        style={{
          background: "#0d0d0d",
          borderRight: "1px solid rgba(255,255,255,0.045)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,255,255,0.015) 0%, transparent 70%)",
          }}
        />

        {/* Top bar: logo + toggle pill */}
        <div
          style={{
            padding: "36px 48px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <LogoMark />
            <span
              style={{
                fontFamily: HEADLINE_FONT,
                fontSize: "19px",
                letterSpacing: "0.08em",
                color: "#e8e8e8",
              }}
            >
              PROJORG
            </span>
          </div>

          {/* Toggle pill */}
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "9px",
              padding: "3px",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {(
              [
                ["login", "Entrar"],
                ["signup", "Cadastrar"],
              ] as const
            ).map(([m, lbl]) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  padding: "7px 15px",
                  background: mode === m ? "rgba(255,255,255,0.1)" : "transparent",
                  border: "none",
                  borderRadius: "7px",
                  color: mode === m ? "#e8e8e8" : "#444",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: FONT,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  letterSpacing: "0.025em",
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Form area — vertically centered */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 48px",
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div className={animClass} style={{ willChange: "transform, opacity" }}>
            {mode === "login" ? (
              <Suspense fallback={<div style={{ height: "360px" }} />}>
                <LoginForm onSwitchToSignup={() => switchMode("signup")} />
              </Suspense>
            ) : (
              <SignupForm onSwitchToLogin={() => switchMode("login")} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0 48px 36px",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p style={{ fontSize: "12px", color: "#333", fontFamily: FONT }}>
            {mode === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                switchMode(mode === "login" ? "signup" : "login");
              }}
              style={{ color: "#666", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
            >
              {mode === "login" ? "Criar conta" : "Entrar"}
            </a>
          </p>
        </div>
      </div>

      {/* ── Right panel (carousel) ─────────────────────────────────────── */}
      <RightPanel />
    </div>
  );
}
