"use client";

import { SchedulerTriggerDataTypes, Weekday } from "@/app/types/tirggers";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { TriggerConfigProps } from "./trigger-config-dialog";






const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function SchedulerTriggerConfig({
  configData,
  setConfigData,
}: TriggerConfigProps<SchedulerTriggerDataTypes>) {
  const { config } = configData;

  const updateConfig = (newConfig: SchedulerTriggerDataTypes["config"]) => {
    setConfigData({
      ...configData,
      config: newConfig,
    });
  };

  return (
    <div className="flex flex-col gap-3 space-y-4">
      {/* ---------------- Mode Selector ---------------- */}
      <div className="flex flex-col gap-1">
        <div className="text-text-secondary text-sm font-medium">
          Select Mode
        </div>
        <Select
          value={config.mode}
          onValueChange={(mode) => {
            switch (mode) {
              case "interval":
                updateConfig({
                  mode: "interval",
                  every: 1,
                  unit: "minutes",
                });
                break;
              case "daily":
                updateConfig({
                  mode: "daily",
                  time: "09:00",
                });
                break;
              case "weekly":
                updateConfig({
                  mode: "weekly",
                  days: ["monday"],
                  time: "09:00",
                });
                break;
              case "cron":
                updateConfig({
                  mode: "cron",
                  cronExpression: "* * * * *",
                });
                break;
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent className="w-[180px]">
            <SelectItem value="interval">Interval</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="cron">Cron</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ---------------- Interval ---------------- */}
      {config.mode === "interval" && (
        <div className="space-y-3">
          <Input
            label="Select input"
            type="number"
            min={1}
            value={config.every}
            onChange={(e) =>
              updateConfig({
                ...config,
                every: Number(e.target.value),
              })
            }
            placeholder="Every"
          />

          <Select
            value={config.unit}
            onValueChange={(unit) =>
              updateConfig({
                ...config,
                unit: unit as typeof config.unit,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seconds">Seconds</SelectItem>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ---------------- Daily ---------------- */}
      {config.mode === "daily" && (
        <Input
          type="time"
          value={config.time}
          onChange={(e) =>
            updateConfig({
              ...config,
              time: e.target.value,
            })
          }
        />
      )}

      {/* ---------------- Weekly ---------------- */}
      {config.mode === "weekly" && (
        <div className="space-y-3">
          <Select
            value={config.days[0]}
            onValueChange={(day) =>
              updateConfig({
                ...config,
                days: [day as Weekday],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="time"
            value={config.time}
            onChange={(e) =>
              updateConfig({
                ...config,
                time: e.target.value,
              })
            }
          />
        </div>
      )}

      {/* ---------------- Cron ---------------- */}
      {config.mode === "cron" && (
        <Input
          value={config.cronExpression}
          onChange={(e) =>
            updateConfig({
              ...config,
              cronExpression: e.target.value,
            })
          }
          placeholder="* * * * *"
        />
      )}
    </div>
  );
}
