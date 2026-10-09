import { catalog, getHazard, type HazardCode, type SafetyNote, type ServiceCode, type Urgency } from "@trabawho/shared";
import {
  ArrowRight,
  ArrowsClockwise,
  Barricade,
  CalendarBlank,
  CheckCircle,
  Clock,
  CloudArrowUp,
  Drop,
  Fire,
  FireSimple,
  Hammer,
  Handshake,
  Lightning,
  LightningSlash,
  MagnifyingGlass,
  Phone,
  PhoneCall,
  SealCheck,
  Siren,
  Snowflake,
  Warning,
  Waves,
  Wind,
  Wrench,
  XCircle,
  type Icon,
} from "phosphor-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

import type { UiStatus } from "@/data/bookings";

// Colors for icons (Phosphor needs raw values; classNames cover everything else). v3 artboard palette.
export const C = {
  ink: "#2A2B2C",
  navy: "#002366",
  lime: "#F59E0B", // amber accent (name kept for existing call sites)
  limeInk: "#002366",
  muted: "#4B5563",
  subtle: "#6B7280",
  danger: "#DC2626",
  dangerInk: "#B91C1C",
  amberInk: "#B45309",
  ok: "#047857",
  infoInk: "#002366",
  haze: "#C7D4EE",
  white: "#FFFFFF",
};

export const SERVICE_ICON: Record<ServiceCode, Icon> = {
  PLUMBING: Drop,
  ELECTRICAL: Lightning,
  CARPENTRY: Hammer,
  AIRCON: Snowflake,
  WELDING: Fire,
};

const HAZARD_ICON: Record<HazardCode, Icon> = {
  GAS_SMELL: Wind,
  SPARKING: Lightning,
  BURNING_SMELL: FireSimple,
  ACTIVE_FLOODING: Waves,
  NO_POWER: LightningSlash,
  STRUCTURAL_DAMAGE: Barricade,
};

export const serviceName = (s: ServiceCode) => catalog.services.find((x) => x.code === s)?.nameTl ?? s;
export const serviceNameEn = (s: ServiceCode) => catalog.services.find((x) => x.code === s)?.nameEn ?? s;
export const taskName = (t: string) => catalog.tasks.find((x) => x.code === t)?.nameTl ?? t;
export const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
export const call = (phone: string) => Linking.openURL(`tel:${phone}`);

// ---------- primitives ----------

type ButtonVariant = "primary" | "dark" | "ghost" | "danger" | "onDark";
// `orb` is the arrow circle on the 56 px pill (artboard v3 buttons).
const BTN: Record<ButtonVariant, { box: string; text: string; icon: string; orb?: { box: string; icon: string } }> = {
  primary: { box: "bg-lime", text: "text-navy", icon: C.navy, orb: { box: "bg-navy", icon: C.white } },
  dark: { box: "bg-navy", text: "text-white", icon: C.white, orb: { box: "bg-lime", icon: C.navy } },
  ghost: { box: "border-[1.5px] border-border-strong bg-surface", text: "text-navy", icon: C.navy },
  danger: { box: "bg-danger", text: "text-white", icon: C.white },
  // Secondary action on navy screens (welcome, AI checking).
  onDark: { box: "border-[1.5px] border-white/30 bg-white/5", text: "text-white", icon: C.white },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon: I,
  loading,
  disabled,
  disabledReason,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  icon?: Icon;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const v = BTN[variant];
  const off = disabled || loading;
  // Full-size primary/dark buttons: label left, icon in a circle on the right.
  const orb = size === "md" ? v.orb : undefined;
  return (
    <View className="gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!off }}
        disabled={off}
        onPress={onPress}
        className={`flex-row items-center gap-2 rounded-full active:opacity-80 ${v.box} ${orb ? "h-14 justify-between pl-6 pr-[6px]" : size === "md" ? "h-14 justify-center px-6" : "h-11 justify-center px-4"} ${off ? "opacity-50" : ""}`}
      >
        {orb ? null : loading ? <ActivityIndicator color={v.icon} /> : I ? <I size={size === "md" ? 20 : 16} color={v.icon} weight="bold" /> : null}
        <Text className={`font-body-bold ${v.text} ${size === "md" ? "text-base" : "text-sm"}`}>{label}</Text>
        {orb ? (
          <View className={`h-11 w-11 items-center justify-center rounded-full ${orb.box}`}>
            {loading ? <ActivityIndicator color={orb.icon} /> : I ? <I size={20} color={orb.icon} weight="bold" /> : <ArrowRight size={20} color={orb.icon} weight="bold" />}
          </View>
        ) : null}
      </Pressable>
      {disabled && disabledReason ? <Text className="text-center font-body text-xs text-subtle">{disabledReason}</Text> : null}
    </View>
  );
}

export function Card({ children, tone = "default", className = "" }: { children: ReactNode; tone?: "default" | "dashed" | "danger" | "dark"; className?: string }) {
  const t = {
    default: "border border-border bg-surface",
    dashed: "border-[1.5px] border-dashed border-amber bg-surface",
    danger: "border border-danger bg-danger-bg",
    dark: "bg-navy",
  }[tone];
  return <View className={`gap-2 rounded-3xl p-4 ${t} ${className}`}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text className="font-body-bold text-[11px] uppercase tracking-widest text-muted">{children}</Text>;
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View className="gap-1">
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={C.subtle}
        className={`min-h-14 rounded-[18px] border-[1.5px] border-border-strong bg-surface px-4 py-3 font-body text-base text-ink focus:border-navy ${props.multiline ? "min-h-32" : ""}`}
        textAlignVertical={props.multiline ? "top" : "center"}
        {...props}
      />
    </View>
  );
}

export function ServiceTile({ service, size = 48 }: { service: ServiceCode; size?: number }) {
  const I = SERVICE_ICON[service];
  return (
    <View className="items-center justify-center rounded-2xl bg-navy" style={{ width: size, height: size }}>
      <I size={size * 0.5} color={C.white} weight="fill" />
    </View>
  );
}

// ---------- badges (DESIGN §1.2) ----------

type BadgeStyle = { label: string; box: string; text: string; color: string; icon: Icon };

// Status = fill + ink pairs from the v3 system. Pending is a soft pill so it never reads as a button.
const STATUS: Record<UiStatus, BadgeStyle> = {
  PENDING: { label: "Pending", box: "bg-amber-bg", text: "text-amber-ink", color: C.amberInk, icon: CloudArrowUp },
  FAILED: { label: "Not sent", box: "bg-danger-bg", text: "text-danger-ink", color: C.dangerInk, icon: ArrowsClockwise },
  REQUESTED: { label: "Finding worker", box: "bg-info-bg", text: "text-info-ink", color: C.infoInk, icon: MagnifyingGlass },
  ACCEPTED: { label: "Accepted", box: "bg-info-bg", text: "text-info-ink", color: C.infoInk, icon: Handshake },
  IN_PROGRESS: { label: "In progress", box: "bg-amber-bg", text: "text-amber-ink", color: C.amberInk, icon: Wrench },
  COMPLETED: { label: "Done", box: "bg-ok-bg", text: "text-ok", color: C.ok, icon: CheckCircle },
  CANCELLED: { label: "Cancelled", box: "bg-soft", text: "text-subtle", color: C.subtle, icon: XCircle },
};

const URGENCY: Record<Urgency, BadgeStyle> = {
  EMERGENCY: { label: "Emergency", box: "bg-danger", text: "text-white", color: C.white, icon: Siren },
  TODAY: { label: "Today", box: "bg-amber-bg", text: "text-amber-ink", color: C.amberInk, icon: Clock },
  SCHEDULED: { label: "Scheduled", box: "bg-info-bg", text: "text-info-ink", color: C.infoInk, icon: CalendarBlank },
};

function Badge({ s }: { s: BadgeStyle }) {
  const I = s.icon;
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-[10px] py-1 ${s.box}`}>
      <I size={14} color={s.color} weight="bold" />
      <Text className={`font-body-bold text-[11px] uppercase tracking-wide ${s.text}`}>{s.label}</Text>
    </View>
  );
}

/** Keyed by status so the swap animates when a Pending row syncs (DESIGN A3). */
export function StatusBadge({ status }: { status: UiStatus }) {
  return (
    <Animated.View key={status} entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)}>
      <Badge s={STATUS[status]} />
    </Animated.View>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return <Badge s={URGENCY[urgency]} />;
}

export function VerifiedBadge() {
  return (
    <View className="flex-row items-center gap-1 self-start rounded-full bg-info-bg px-2 py-[2px]">
      <SealCheck size={14} color={C.navy} weight="fill" />
      <Text className="font-body-bold text-[11px] uppercase tracking-wide text-navy">Verified</Text>
    </View>
  );
}

// ---------- domain ----------

/** Pre-written safety text from the catalog (never AI-written). GAS_SMELL shows 911. */
export function HazardAlert({ notes, showHotline, hotline = catalog.emergencyHotline, compact }: { notes: SafetyNote[]; showHotline?: boolean; hotline?: string; compact?: boolean }) {
  if (!notes.length) return null;
  if (compact) {
    return (
      <View className="flex-row flex-wrap items-center gap-1 rounded-xl bg-danger-bg px-3 py-2">
        <Warning size={16} color={C.dangerInk} weight="bold" />
        <Text className="font-body-semibold text-[13px] text-danger-ink">{notes.map((n) => getHazard(n.hazard).nameTl).join(" · ")}</Text>
      </View>
    );
  }
  return (
    <Card tone="danger">
      <View className="flex-row items-center gap-2">
        <Warning size={24} color={C.danger} weight="fill" />
        <Text className="font-headline text-xl text-danger-ink">Be careful · Mag-ingat</Text>
      </View>
      {notes.map((n) => {
        const I = HAZARD_ICON[n.hazard];
        return (
          <View key={n.hazard} className="gap-1">
            <View className="flex-row items-center gap-1">
              <I size={16} color={C.dangerInk} weight="bold" />
              <Text className="font-body-bold text-sm text-danger-ink">{getHazard(n.hazard).nameTl}</Text>
            </View>
            <Text className="font-body text-[15px] leading-[21px] text-danger-ink">{n.text}</Text>
          </View>
        );
      })}
      {showHotline ? <Button label={`Call ${hotline}`} icon={PhoneCall} variant="danger" onPress={() => call(hotline)} /> : null}
    </Card>
  );
}

export function PersonCard({ name, role, phone, verified }: { name: string; role: "worker" | "client"; phone: string; verified?: boolean }) {
  return (
    <Card>
      <Label>{role === "worker" ? "Your worker" : "Client"}</Label>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="font-body-bold text-[17px] text-ink">{name}</Text>
          {verified ? <VerifiedBadge /> : null}
          <Text className="font-body text-[13px] text-muted">{phone}</Text>
        </View>
        <Button label="Call" icon={Phone} size="sm" variant="dark" onPress={() => call(phone)} />
      </View>
    </Card>
  );
}

/** Big result moment (artboard v3 "Request sent" / "Booking saved"): navy when sent, dashed amber when pending, red when failed. */
export function StatusHero({ kind, icon: I, title, message }: { kind: "sent" | "pending" | "failed"; icon: Icon; title: string; message: string }) {
  const t = {
    sent: { box: "bg-navy", orb: "bg-lime", icon: C.navy, title: "text-white", msg: "text-haze" },
    pending: { box: "border-[1.5px] border-dashed border-amber bg-amber-bg", orb: "bg-surface", icon: C.amberInk, title: "text-navy", msg: "text-amber-ink" },
    failed: { box: "border border-danger bg-danger-bg", orb: "bg-surface", icon: C.danger, title: "text-danger-ink", msg: "text-danger-ink" },
  }[kind];
  return (
    <View className={`items-center gap-3 rounded-3xl px-6 py-8 ${t.box}`}>
      <Animated.View key={kind} entering={ZoomIn.springify()} className={`h-24 w-24 items-center justify-center rounded-full ${t.orb}`}>
        <I size={48} color={t.icon} weight={kind === "sent" ? "fill" : "bold"} />
      </Animated.View>
      <Text className={`text-center font-headline text-[28px] leading-[32px] ${t.title}`}>{title}</Text>
      <Text className={`text-center font-body text-[15px] leading-[22px] ${t.msg}`}>{message}</Text>
    </View>
  );
}

export function EmptyState({ icon: I, title, hint, action }: { icon: Icon; title: string; hint?: string; action?: { label: string; icon?: Icon; onPress: () => void } }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} className="items-center gap-3 rounded-3xl border border-border bg-surface px-6 py-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-info-bg">
        <I size={30} color={C.navy} weight="bold" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-center font-body-bold text-[17px] text-ink">{title}</Text>
        {hint ? <Text className="text-center font-body text-[14px] leading-[20px] text-muted">{hint}</Text> : null}
      </View>
      {action ? <Button label={action.label} icon={action.icon} size="sm" variant="dark" onPress={action.onPress} /> : null}
    </Animated.View>
  );
}

/** Placeholder card while the first list load is in flight (no layout jump when data lands). */
export function SkeletonCard() {
  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 rounded-2xl bg-soft" />
        <View className="flex-1 gap-2">
          <View className="h-4 w-3/4 rounded-full bg-soft" />
          <View className="h-3 w-1/2 rounded-full bg-soft" />
        </View>
      </View>
      <View className="h-11 rounded-full bg-soft" />
    </View>
  );
}

export function TotalsCard({ laborCost, materialsCost, total }: { laborCost: number; materialsCost: number; total: number }) {
  return (
    <Card tone="dark">
      <View className="flex-row justify-between">
        <Text className="font-body text-sm text-haze">Labor (from catalog)</Text>
        <Text className="font-body-bold text-sm text-white">{peso(laborCost)}</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="font-body text-sm text-haze">Materials</Text>
        <Text className="font-body-bold text-sm text-white">{peso(materialsCost)}</Text>
      </View>
      <View className="h-px bg-white/20" />
      <View className="flex-row items-end justify-between">
        <Text className="font-body-bold text-[11px] uppercase tracking-widest text-haze">Total</Text>
        <Text className="font-headline text-[32px] leading-[36px] text-lime">{peso(total)}</Text>
      </View>
      <Text className="font-body text-xs text-haze">Pay cash after the job</Text>
    </Card>
  );
}
