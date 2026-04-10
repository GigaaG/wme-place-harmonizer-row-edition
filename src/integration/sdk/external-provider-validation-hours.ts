import { getRuntimeLocaleCode, t } from "../../i18n/runtime.ts";
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

function getWeekdayLabel(day: number): string {
  const formatter = new Intl.DateTimeFormat(getRuntimeLocaleCode(), {
    weekday: "long",
    timeZone: "UTC"
  });

  return formatter.format(new Date(Date.UTC(2024, 0, 7 + day)));
}

function formatNormalizedHoursByWeekday(
  normalizedHours: string[]
): string | undefined {
  const groupedRanges = new Map<number, string[]>();

  for (const slot of normalizedHours) {
    const match = /^([0-6]):(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(slot);

    if (!match) {
      return normalizedHours.join(", ");
    }

    const day = Number(match[1]);
    const timeRange = `${match[2]}-${match[3]}`;
    const ranges = groupedRanges.get(day);

    if (ranges) {
      ranges.push(timeRange);
    } else {
      groupedRanges.set(day, [timeRange]);
    }
  }

  const orderedDays = [1, 2, 3, 4, 5, 6, 0].filter((day) => groupedRanges.has(day));
  const displayRangesByDay = mergeCrossMidnightRanges(groupedRanges, orderedDays);

  return orderedDays
    .filter((day) => (displayRangesByDay.get(day) ?? []).length > 0)
    .map((day) => `${getWeekdayLabel(day)}: ${displayRangesByDay.get(day)?.join(", ")}`)
    .join(" | ");
}

function mergeCrossMidnightRanges(
  groupedRanges: Map<number, string[]>,
  orderedDays: number[]
): Map<number, string[]> {
  const mergedRangesByDay = new Map<number, string[]>();

  for (const day of orderedDays) {
    mergedRangesByDay.set(day, [...(groupedRanges.get(day) ?? [])]);
  }

  for (let index = 0; index < orderedDays.length; index += 1) {
    const day = orderedDays[index];
    const nextDay = orderedDays[(index + 1) % orderedDays.length];
    const dayRanges = mergedRangesByDay.get(day);
    const nextDayRanges = mergedRangesByDay.get(nextDay);

    if (!dayRanges || !nextDayRanges || dayRanges.length === 0 || nextDayRanges.length === 0) {
      continue;
    }

    const lastDayRange = dayRanges[dayRanges.length - 1];
    const firstNextDayRange = nextDayRanges[0];
    const dayMatch = /^(\d{2}:\d{2})-24:00$/.exec(lastDayRange);
    const nextDayMatch = /^00:00-(\d{2}:\d{2})$/.exec(firstNextDayRange);

    if (!dayMatch || !nextDayMatch) {
      continue;
    }

    if (dayMatch[1] === "00:00" && nextDayMatch[1] === "24:00") {
      continue;
    }

    dayRanges[dayRanges.length - 1] = `${dayMatch[1]}-${nextDayMatch[1]}`;
    nextDayRanges.shift();
  }

  return mergedRangesByDay;
}

function localizeWeekdayText(weekdayText: string[]): string | undefined {
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];
  const localizedEntries: string[] = [];

  for (let index = 0; index < weekdayText.length; index += 1) {
    const entry = trimString(weekdayText[index]);

    if (!entry) {
      return undefined;
    }

    const separatorIndex = entry.indexOf(":");

    if (separatorIndex < 0 || index >= orderedDays.length) {
      return undefined;
    }

    localizedEntries.push(
      `${getWeekdayLabel(orderedDays[index])}:${entry.slice(separatorIndex + 1)}`
    );
  }

  return localizedEntries.join(" | ");
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

  if (Array.isArray(normalizedHours) && normalizedHours.length > 0) {
    return formatNormalizedHoursByWeekday(normalizedHours);
  }

  if (Array.isArray(weekdayText) && weekdayText.length > 0) {
    return localizeWeekdayText(weekdayText) ?? weekdayText.join(" | ");
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
    return formatNormalizedHoursByWeekday(normalizedHours);
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

  const groupedRanges = new Map<number, string[]>();
  for (const slot of normalizedHours) {
    const match = /^([0-6]):(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(slot);

    if (!match) {
      return undefined;
    }

    const day = Number(match[1]);
    const timeRange = `${match[2]}-${match[3]}`;
    const ranges = groupedRanges.get(day);

    if (ranges) {
      ranges.push(timeRange);
    } else {
      groupedRanges.set(day, [timeRange]);
    }
  }

  const orderedDays = [0, 1, 2, 3, 4, 5, 6].filter((day) => groupedRanges.has(day));
  const mergedRangesByDay = mergeCrossMidnightRanges(groupedRanges, orderedDays);
  const groupedDays = new Map<string, number[]>();

  for (const day of orderedDays) {
    for (const range of mergedRangesByDay.get(day) ?? []) {
      const match = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(range);

      if (!match) {
        return undefined;
      }

      const fromHour = match[1];
      const toHour = match[2] === "24:00" ? "00:00" : match[2];

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
