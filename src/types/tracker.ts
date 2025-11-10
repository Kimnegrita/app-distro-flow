export type Appeal = {
  timestamp: Date;
  reviewTime: number; // in minutes
};

export type Person = {
  name: string;
  target: number;
  current: number;
  appeals: Appeal[];
  appStartTimes: Date[]; // timestamps when each APP started
};

export type DayState = {
  totalAPPs: number;
  people: Person[];
  date: string; // YYYY-MM-DD format
  startTime: Date;
};

export type WeeklyData = {
  [date: string]: DayState;
};