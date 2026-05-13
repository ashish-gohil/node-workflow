"use client";

import { motion } from "motion/react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const USERS = [
  { name: "John Doe", initials: "JD", bg: "bg-info", rotate: 8 },
  { name: "Robert Johnson", initials: "RJ", bg: "bg-warning", rotate: 3 },
  { name: "Jane Smith", initials: "JS", bg: "bg-forest-400", rotate: -3 },
  { name: "Emily Davis", initials: "ED", bg: "bg-error", rotate: -1 },
  { name: "Tyler Durden", initials: "TD", bg: "bg-accent-primary", rotate: 0 },
  { name: "Dora", initials: "D", bg: "bg-forest-600", rotate: 8 },
];

export default function Collaborators() {
  return (
    /* pr-2.5 compensates the last avatar's -mr-2.5 so the row has clean right edge */
    <div className="flex items-center pr-2.5">
      {USERS.map((user, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20, rotate: user.rotate }}
          animate={{ opacity: 1, y: 0, rotate: user.rotate }}
          transition={{
            delay: index * 0.05,
            type: "spring",
            stiffness: 200,
            damping: 10,
          }}
          whileHover={{ scale: 1.12, rotate: 0, translateY: -3 }}
          className="relative -mr-2.5 cursor-default"
          style={{ zIndex: USERS.length - index }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`border-bg-canvas text-neutral-0 flex size-7 items-center justify-center rounded-[4px] border-2 font-mono text-[10px] font-bold select-none ${user.bg}`}
              >
                {user.initials}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">{user.name}</TooltipContent>
          </Tooltip>
        </motion.div>
      ))}
    </div>
  );
}
