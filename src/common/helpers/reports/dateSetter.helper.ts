// import dayjs from "dayjs";
import * as dayjs from "dayjs";
import { DateType } from "src/common/dto/common.dto";

// export enum DateRange {
//   "This Week" = "This week",
//   "This Month" = "This month",
//   "Quarter" = "Quarter",
//   "6 Months" = "6 months",
//   "This Year" = "This year",
//   "Last Year" = "Last year",
//   "Last 2 Years" = "Last 2 years",
//   "Last 5 Years" = "Last 5 years",
//   "Custom Range" = "Custom Range",
// }

export const getStartEndDates = (range: DateType) => {
  const today = dayjs();
  let startDate = today;
  let endDate = today;

  switch (range) {
    case DateType["This week"]:
      // Last 7 days from today
      startDate = today.subtract(6, "day");
      endDate = today;
      break;

    case DateType["This month"]:
      // Last 30 days from today
      startDate = today.subtract(1, "month");
      break;

    case DateType["Quarter"]:
      // Last 3 months from today
      startDate = today.subtract(3, "month");
      endDate = today;
      break;

    case DateType["6 months"]:
      // Last 6 months from today
      startDate = today.subtract(6, "month");
      endDate = today;
      break;

    case DateType["This year"]:
      startDate = today.startOf("year");
      endDate = today;
      break;

    case DateType["Last year"]:
      // Whole last year
      startDate = dayjs().subtract(1, "year").startOf("year");
      endDate = dayjs().subtract(1, "year").endOf("year");
      break;

    case DateType["Last 2 years"]:
      // Whole last 2 years
      startDate = dayjs().subtract(2, "year").startOf("year");
      endDate = dayjs().subtract(1, "year").endOf("year");
      break;

    case DateType["Last 5 years"]:
      // Whole last 5 years
      startDate = dayjs().subtract(5, "year").startOf("year");
      endDate = dayjs().subtract(1, "year").endOf("year");
      break;

    case DateType["Custom Range"]:
      return null;
  }

  return {
    startDate: startDate.startOf("day").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
    endDate: endDate.endOf("day").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
  };
};
