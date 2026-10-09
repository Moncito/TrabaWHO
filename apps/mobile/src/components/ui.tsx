import { catalog, getHazard, type HazardCode, type SafetyNote, type ServiceCode, type Urgency } from "@trabawho/shared";
import {
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
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import type { UiStatus } from "@/data/bookings";

// Colors for icons (Phosphor needs raw values; classNames cover everything else). DESIGN §1.1.
export const C = {
  ink: "#1F2937",
  lime: "#A3E635",
  limeInk: "#3F6212",
  muted: "#4B5563",
  subtle: "#6B7280",
  danger: "#DC2626",
  dangerInk: "#991B1B",
  amberInk: "#92400E",
  ok: "#15803D",
  infoInk: "#3730A3",
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
export const taskName = (t: string) => catalog.tasks.find((x) => x.code === t)?.nameTl ?? t;
export const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
export const call = (phone: string) => Linking.openURL(`tel:${phone}`);

// ---------- primitives ----------

type ButtonVariant = "primary" | "dark" | "ghost" | "danger";
const BTN: Record<ButtonVariant, { box: string; text: string; icon: string }> = {
  primary: { box: "bg-lime", text: "text-ink", icon: C.ink },
  dark: { box: "bg-ink", text: "text-white", icon: C.white },
  ghost: { box: "border border-border-strong bg-surface", text: "text-ink", icon: C.ink },
  danger: { box: "bg-danger", text: "text-white", icon: C.white },
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
  return (
    <View className="gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!off }}
        disabled={off}
        onPress={onPress}
        className={`flex-row items-center justify-center gap-2 rounded-[14px] px-4 active:opacity-80 ${v.box} ${size === "md" ? "h-[52px]" : "h-10"} ${off ? "opacity-50" : ""}`}
      >
        {loading ? <ActivityIndicator color={v.icon} /> : I ? <I size={size === "md" ? 20 : 16} color={v.icon} weight="bold" /> : null}
        <Text className={`font-body-xbold uppercase tracking-wide ${v.text} ${size === "md" ? "text-base" : "text-[13px]"}`}>{label}</Text>
      </Pressable>
      {disabled && disabledReason ? <Text className="text-center font-body text-xs text-subtle">{disabledReason}</Text> : null}
    </View>
  );
}

export function Card({ children, tone = "default", className = "" }: { children: ReactNode; tone?: "default" | "dashed" | "danger" | "dark"; className?: string }) {
  const t = {
    default: "border border-border bg-surface",
    dashed: "border border-dashed border-subtle bg-surface",
    danger: "border-2 border-danger bg-danger-bg",
    dark: "bg-ink",
  }[tone];
  return <View className={`gap-2 rounded-2xl p-[14px] ${t} ${className}`}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text className="font-body-xbold text-xs uppercase tracking-wider text-subtle">{children}</Text>;
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View className="gap-1">
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={C.subtle}
        className={`min-h-12 rounded-[14px] border border-border-strong bg-surface px-4 py-3 font-body text-[15px] text-ink focus:border-ink ${props.multiline ? "min-h-32" : ""}`}
        textAlignVertical={props.multiline ? "top" : "center"}
        {...props}
      />
    </View>
  );
}

export function ServiceTile({ service, size = 44 }: { service: ServiceCode; size?: number }) {
  const I = SERVICE_ICON[service];
  return (
    <View className="items-center justify-center rounded-xl bg-lime" style={{ width: size, height: size }}>
      <I size={size * 0.5} color={C.ink} weight="bold" />
    </View>
  );
}

// ---------- badges (DESIGN §1.2) ----------

type BadgeStyle = { label: string; box: string; text: string; color: string; icon: Icon };

const STATUS: Record<UiStatus, BadgeStyle> = {
  PENDING: { label: "Pending", box: "border border-dashed border-subtle bg-surface", text: "text-ink", color: C.ink, icon: CloudArrowUp },
  FAILED: { label: "Hindi naipadala", box: "bg-danger-bg", text: "text-danger-ink", color: C.dangerInk, icon: ArrowsClockwise },
  REQUESTED: { label: "Hinahanapan", box: "bg-info-bg", text: "text-info-ink", color: C.infoInk, icon: MagnifyingGlass },
  ACCEPTED: { label: "Tinanggap", box: "bg-lime-soft", text: "text-lime-ink", color: C.limeInk, icon: Handshake },
  IN_PROGRESS: { label: "Ginagawa", box: "bg-lime", text: "text-ink", color: C.ink, icon: Wrench },
  COMPLETED: { label: "Tapos na", box: "bg-ok-bg", text: "text-ok", color: C.ok, icon: CheckCircle },
  CANCELLED: { label: "Cancelled", box: "bg-soft", text: "text-subtle", color: C.subtle, icon: XCircle },
};

const URGENCY: Record<Urgency, BadgeStyle> = {
  EMERGENCY: { label: "Emergency", box: "bg-danger", text: "text-white", color: C.white, icon: Siren },
  TODAY: { label: "Ngayong araw", box: "bg-amber-bg", text: "text-amber-ink", color: C.amberInk, icon: Clock },
  SCHEDULED: { label: "Naka-schedule", box: "bg-border", text: "text-ink", color: C.ink, icon: CalendarBlank },
};

function Badge({ s }: { s: BadgeStyle }) {
  const I = s.icon;
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-[10px] py-1 ${s.box}`}>
      <I size={14} color={s.color} weight="bold" />
      <Text className={`font-body-bold text-xs ${s.text}`}>{s.label}</Text>
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
    <View className="flex-row items-center gap-1 self-start rounded-full bg-lime-soft px-2 py-[2px]">
      <SealCheck size={14} color={C.limeInk} weight="fill" />
      <Text className="font-body-bold text-xs text-lime-ink">Verified</Text>
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
        <Warning size={22} color={C.danger} weight="bold" />
        <Text className="font-headline text-xl uppercase text-danger-ink">Mag-ingat</Text>
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
      {showHotline ? <Button label={`Tumawag sa ${hotline}`} icon={PhoneCall} variant="danger" onPress={() => call(hotline)} /> : null}
    </Card>
  );
}

export function PersonCard({ name, role, phone, verified }: { name: string; role: "worker" | "client"; phone: string; verified?: boolean }) {
  return (
    <Card>
      <Label>{role === "worker" ? "Ang iyong worker" : "Client"}</Label>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="font-body-bold text-[17px] text-ink">{name}</Text>
          {verified ? <VerifiedBadge /> : null}
          <Text className="font-body text-[13px] text-muted">{phone}</Text>
        </View>
        <Button label={`Tawagan`} icon={Phone} size="sm" variant="dark" onPress={() => call(phone)} />
      </View>
    </Card>
  );
}

export function EmptyState({ icon: I, title, hint }: { icon: Icon; title: string; hint?: string }) {
  return (
    <View className="items-center gap-2 py-10">
      <I size={40} color={C.subtle} />
      <Text className="text-center font-body-bold text-[17px] text-ink">{title}</Text>
      {hint ? <Text className="text-center font-body text-[13px] text-muted">{hint}</Text> : null}
    </View>
  );
}

export function TotalsCard({ laborCost, materialsCost, total }: { laborCost: number; materialsCost: number; total: number }) {
  return (
    <Card tone="dark">
      <View className="flex-row justify-between">
        <Text className="font-body text-sm text-soft">Labor (mula sa catalog)</Text>
        <Text className="font-body-bold text-sm text-white">{peso(laborCost)}</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="font-body text-sm text-soft">Materyales</Text>
        <Text className="font-body-bold text-sm text-white">{peso(materialsCost)}</Text>
      </View>
      <View className="h-px bg-muted" />
      <View className="flex-row items-end justify-between">
        <Text className="font-body-xbold text-xs uppercase tracking-wider text-soft">Kabuuan</Text>
        <Text className="font-headline text-[34px] leading-[36px] text-lime">{peso(total)}</Text>
      </View>
      <Text className="font-body text-xs text-soft">Cash pagkatapos ng trabaho</Text>
    </Card>
  );
}
