"use client";
import { api } from "@/lib/api";
import React, { useEffect } from "react";

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
