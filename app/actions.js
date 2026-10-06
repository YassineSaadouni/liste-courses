"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";

export async function addItem(formData) {
  const name = String(formData.get("name") || "").trim();
  const quantity = Math.max(1, parseInt(formData.get("quantity"), 10) || 1);
  if (!name) return;
  await query("INSERT INTO items (name, quantity) VALUES ($1, $2)", [name, quantity]);
  revalidatePath("/");
}

export async function toggleItem(formData) {
  await query("UPDATE items SET done = NOT done WHERE id = $1", [formData.get("id")]);
  revalidatePath("/");
}

export async function clearDone() {
  await query("DELETE FROM items WHERE done = TRUE");
  revalidatePath("/");
}
