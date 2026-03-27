import { t } from "../../i18n/runtime.ts";
import type { OpeningHourDefinition } from "../../types/place.ts";
import { trimString } from "./external-provider-validation-utils.ts";

function normalizeTime(value: unknown, allow2400 = true): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  let digits = value.trim().replace(/:/g, "");
  if (digits.length === 3) {
    digits = digits.padStart(4, "0");
  }

  if (!/^\d{4}$/.test(digits)) {
    return undefined;
  }

  if (digits === "2400") {
    return allow2400 ? "24:00" : undefined;
  }

  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));

  if (hours > 23 || minutes > 59) {
    return undefined;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function isValidDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

function buildDaySlot(day: number, fromHour: string, toHour: string): string {
  return `${day}:${fromHour}-${toHour}`;
}

function expandDailyHoursRange(
  openDay: number,
  openTime: string,
  closeDay: number,
  closeTime: string
): string[] {
  if (openDay === closeDay && openTime < closeTime) {
    return [buildDaySlot(openDay, openTime, closeTime)];
  }

  const slots: string[] = [];
  let currentDay = openDay;
  let safety = 0;

  while (safety < 8) {
    const fromHour = currentDay === openDay ? openTime : "00:00";
    const toHour = currentDay === closeDay ? closeTime : "24:00";

    if (fromHour !== toHour) {
      slots.push(buildDaySlot(currentDay, fromHour, toHour));
    }

    if (currentDay === closeDay) {
      break;
    }

    currentDay = (currentDay + 1) % 7;
    safety += 1;
  }

  return slots;
}

export function normalizeCurrentOpeningHours(
  openingHours: OpeningHourDefinition[] = []
): string[] | null {
  const slots: string[] = [];

  for (const entry of openingHours) {
    const fromHour = normalizeTime(entry?.fromHour, false);
    const toHour = normalizeTime(entry?.toHour);

    if (!fromHour || !toHour || !Array.isArray(entry?.days)) {
      return null;
    }

    for (const day of entry.days) {
      if (!isValidDay(day)) {
        return null;
      }

      if (fromHour === "00:00" && toHour === "00:00") {
        slots.push(buildDaySlot(day, "00:00", "24:00"));
      } else if (fromHour < toHour) {
        slots.push(buildDaySlot(day, fromHour, toHour));
      } else if (fromHour > toHour) {
        slots.push(
          ...expandDailyHoursRange(day, fromHour, (day + 1) % 7, toHour)
        );
      }
    }
  }

  return Array.from(new Set(slots)).sort();
}

export function normalizeGoogleOpeningHours(openingHours: any): string[] | null {
  const periods = Array.isArray(openingHours?.periods)
    ? openingHours.periods
    : [];

  if (periods.length === 0) {
    return [];
  }

  if (
    periods.length === 1 &&
    isValidDay(periods[0]?.open?.day) &&
    periods[0]?.open?.day === 0 &&
    normalizeTime(periods[0]?.open?.time, false) === "00:00" &&
    !periods[0]?.close
  ) {
    return Array.from({ length: 7 }, (_, day) =>
      buildDaySlot(day, "00:00", "24:00")
    );
  }

  const slots: string[] = [];

  for (const period of periods) {
    const openDay = period?.open?.day;
    const closeDay = period?.close?.day;
    const openTime = normalizeTime(period?.open?.time, false);
    const closeTime = normalizeTime(period?.close?.time);

    if (
      !isValidDay(openDay) ||
      !isValidDay(closeDay) ||
      !openTime ||
      !closeTime
    ) {
      return null;
    }

    slots.push(...expandDailyHoursRange(openDay, openTime, closeDay, closeTime));
  }

  return Array.from(new Set(slots)).sort();
}

export function isTwentyFourSevenNormalizedHours(
  normalizedHours?: string[] | null
): boolean {
  if (!Array.isArray(normalizedHours) || normalizedHours.length !== 7) {
    return false;
  }

  return normalizedHours.every((slot, day) => slot === `${day}:00:00-24:00`);
}

export function formatOpeningHoursDisplay(
  weekdayText?: string[],
  normalizedHours?: string[] | null
): string | undefined {
  if (isTwentyFourSevenNormalizedHours(normalizedHours)) {
    return t("common.twentyFourSeven");
  }

  if (Array.isArray(weekdayText) && weekdayText.length > 0) {
    return weekdayText.join(" | ");
  }

  if (Array.isArray(normalizedHours) && normalizedHours.length > 0) {
    return normalizedHours.join(", ");
  }

  return undefined;
}

export function formatWmeOpeningHoursDisplay(
  openingHours: OpeningHourDefinition[] = []
): string | undefined {
  const normalizedHours = normalizeCurrentOpeningHours(openingHours);

  if (isTwentyFourSevenNormalizedHours(normalizedHours)) {
    return t("common.twentyFourSeven");
  }

  if (normalizedHours && normalizedHours.length > 0) {
    return normalizedHours.join(", ");
  }

  if (openingHours.length === 0) {
    return undefined;
  }

  return openingHours
    .map((entry) => {
      const days = Array.isArray(entry.days) ? entry.days.join("/") : "?";
      const fromHour = trimString(entry.fromHour) ?? "?";
      const toHour = trimString(entry.toHour) ?? "?";
      return `${days}:${fromHour}-${toHour}`;
    })
    .join(", ");
}

export function buildOpeningHoursValueFromNormalizedSlots(
  normalizedHours: string[] | null | undefined
): OpeningHourDefinition[] | undefined {
  if (!Array.isArray(normalizedHours) || normalizedHours.length === 0) {
    return [];
  }

  const groupedDays = new Map<string, number[]>();

  for (const slot of normalizedHours) {
    const match = /^([0-6]):(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(slot);

    if (!match) {
      return undefined;
    }

    const day = Number(match[1]);
    const fromHour = match[2];
    const toHour = match[3] === "24:00" ? "00:00" : match[3];

    if (fromHour === "24:00") {
      return undefined;
    }

    const key = `${fromHour}-${toHour}`;
    const days = groupedDays.get(key);

    if (days) {
      days.push(day);
    } else {
      groupedDays.set(key, [day]);
    }
  }

  return Array.from(groupedDays.entries()).map(([timeRange, days]) => {
    const [fromHour, toHour] = timeRange.split("-");

    return {
      days: Array.from(new Set(days)).sort((left, right) => left - right),
      fromHour,
      toHour
    };
  });
}
