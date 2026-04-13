"use client";

import Image from "next/image";
import { motion } from "motion/react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const collaborators = [
  {
    name: "John Doe",
    image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36",
    rotate: 8,
  },
  {
    name: "Robert Johnson",
    image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
    rotate: 3,
  },
  {
    name: "Jane Smith",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956",
    rotate: -3,
  },
  {
    name: "Emily Davis",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
    rotate: -1,
  },
  {
    name: "Tyler Durden",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
    rotate: 0,
  },
  {
    name: "Dora",
    image: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e",
    rotate: 8,
  },
];

export default function Collaborators() {
  return (
    <div className="flex flex-col items-center sm:flex-row">
      <div className="flex items-center">
        {collaborators.map((user, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20, rotate: user.rotate }}
            animate={{ opacity: 1, y: 0, rotate: user.rotate }}
            transition={{
              delay: index * 0.1,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            whileHover={{ scale: 1.1, rotate: 0, translateY: -2 }}
            className="group relative -mr-3"
          >
            <div className="overflow-hidden rounded-2xl border-2 border-neutral-200">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Image
                    src={user.image}
                    alt={user.name}
                    width={28}
                    height={28}
                    className="h-7 w-7 object-cover object-top"
                  />
                </TooltipTrigger>
                <TooltipContent>{user.name}</TooltipContent>
              </Tooltip>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
