import dayjs from "dayjs";

export const DateUtils = {
  startOfDay: (date: string | Date): Date => {
    return dayjs(date).startOf("day").toDate();
  },

  endOfDay: (date: string | Date): Date => {
    return dayjs(date).endOf("day").toDate();
  },

  getNumberOfDays: (
    startDate: string | Date,
    endDate: string | Date,
  ): number => {
    const start = dayjs(startDate).startOf("day");
    const end = dayjs(endDate).startOf("day");
    return end.diff(start, "day") + 1; // Adding 1 to include both start and end dates
  },

  addDays: (date: string | Date, days: number): Date => {
    return dayjs(date).add(days, "day").toDate();
  },

  subtractDays: (date: string | Date, days: number): Date => {
    return dayjs(date).subtract(days, "day").toDate();
  },
};
