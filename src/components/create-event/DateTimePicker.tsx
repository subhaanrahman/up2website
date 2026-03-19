import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Clock } from "lucide-react";
import { format, parse } from "date-fns";

interface DateTimePickerProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  helperText?: string;
  helperTextActive?: string;
  disablePast?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  label,
  helperText,
  helperTextActive,
  disablePast = false,
}: DateTimePickerProps) {
  const parsed = value ? new Date(value) : null;
  const dateStr = parsed ? format(parsed, "yyyy-MM-dd") : "";
  const timeStr = parsed ? format(parsed, "HH:mm") : "";

  const setDate = (d: string) => {
    const t = timeStr || "12:00";
    onChange(`${d}T${t}`);
  };

  const setTime = (t: string) => {
    const d = dateStr || format(new Date(), "yyyy-MM-dd");
    onChange(`${d}T${t}`);
  };

  return (
    <div className="bg-card rounded-tile border border-border/50 overflow-hidden">
      <DatePicker
        date={dateStr}
        setDate={setDate}
        label={`${label} Date`}
        disablePast={disablePast}
      />
      <div className="h-px bg-border/50 mx-4" />
      <TimePicker time={timeStr} setTime={setTime} label={`${label} Time`} />
      {(helperText || helperTextActive) && (
        <p className="text-xs text-muted-foreground px-4 pb-3 -mt-1">
          {value ? (helperTextActive || helperText) : helperText}
        </p>
      )}
    </div>
  );
}

export function DatePicker({
  date,
  setDate,
  label,
  disablePast,
}: {
  date: string;
  setDate: (v: string) => void;
  label: string;
  disablePast: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="w-full px-4 pt-4 pb-3 text-left flex items-center gap-3">
          <div className="h-10 w-10 rounded-tile-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">{label}</p>
            <p className={`text-[15px] font-medium mt-0.5 ${date ? "text-foreground" : "text-muted-foreground/40"}`}>
              {date ? format(parse(date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy") : "Select a date"}
            </p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
        <Calendar
          mode="single"
          selected={date ? parse(date, "yyyy-MM-dd", new Date()) : undefined}
          onSelect={(d) => { if (d) setDate(format(d, "yyyy-MM-dd")); }}
          disabled={disablePast ? (d) => d < new Date(new Date().setHours(0, 0, 0, 0)) : undefined}
          initialFocus
          className="rounded-tile"
        />
      </PopoverContent>
    </Popover>
  );
}

export function TimePicker({
  time,
  setTime,
  label = "Time",
}: {
  time: string;
  setTime: (v: string) => void;
  label?: string;
}) {
  const parsed = time ? parse(time, "HH:mm", new Date()) : null;
  const hour24 = parsed ? parsed.getHours() : null;
  const minute = parsed ? parsed.getMinutes() : null;
  const displayHour = hour24 !== null ? (hour24 % 12 === 0 ? 12 : hour24 % 12) : null;
  const period = hour24 !== null ? (hour24 >= 12 ? "PM" : "AM") : null;

  const [open, setOpen] = useState(false);
  const [selHour, setSelHour] = useState(displayHour ?? 7);
  const [selMinute, setSelMinute] = useState(minute ?? 0);
  const [selPeriod, setSelPeriod] = useState<"AM" | "PM">(period ?? "PM");

  const commit = (h: number, m: number, p: "AM" | "PM") => {
    let h24 = h % 12;
    if (p === "PM") h24 += 12;
    setTime(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full px-4 pt-3 pb-4 text-left flex items-center gap-3">
          <div className="h-10 w-10 rounded-tile-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">{label}</p>
            <p className={`text-[15px] font-medium mt-0.5 ${time ? "text-foreground" : "text-muted-foreground/40"}`}>
              {time ? format(parse(time, "HH:mm", new Date()), "h:mm a") : "Select a time"}
            </p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start" sideOffset={8}>
        <div className="p-4">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3 text-center">Pick a time</p>
          <div className="flex gap-2 justify-center">
            <div className="flex flex-col h-[180px] overflow-y-auto scrollbar-hide rounded-tile-sm bg-secondary/50 snap-y snap-mandatory">
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => { setSelHour(h); commit(h, selMinute, selPeriod); }}
                  className={`snap-center px-4 py-2 text-sm font-medium transition-colors rounded-lg mx-1 my-0.5 ${
                    selHour === h ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
            <div className="flex items-center text-muted-foreground font-bold">:</div>
            <div className="flex flex-col h-[180px] overflow-y-auto scrollbar-hide rounded-tile-sm bg-secondary/50 snap-y snap-mandatory">
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setSelMinute(m); commit(selHour, m, selPeriod); }}
                  className={`snap-center px-4 py-2 text-sm font-medium transition-colors rounded-lg mx-1 my-0.5 ${
                    selMinute === m ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {String(m).padStart(2, "0")}
                </button>
              ))}
            </div>
            <div className="flex flex-col justify-center gap-1 rounded-tile-sm bg-secondary/50 px-1 py-1">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setSelPeriod(p); commit(selHour, selMinute, p); }}
                  className={`px-3 py-2 text-sm font-bold transition-colors rounded-lg ${
                    selPeriod === p ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
