"use client";
import React, { useEffect } from "react";

import { api } from "@/lib/api";

export default function EditFlow() {
  const getAllWorkFlows = async () => {
    try {
      const response = await api.get("workflows");

      console.log(response);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getAllWorkFlows();
  }, []);

  return <div>EditFlow</div>;
}
