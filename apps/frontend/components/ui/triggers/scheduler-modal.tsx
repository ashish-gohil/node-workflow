import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../dialog";

export default function SchedulerModal() {
  return (
    <div className="z-50">
      <Dialog open={true}>
        <DialogTrigger />

        <DialogContent>
          <DialogHeader>
            <DialogTitle>This is modal title</DialogTitle>
          </DialogHeader>

          <DialogFooter>
            <p className="text-sm text-text-muted">Card Footer</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
