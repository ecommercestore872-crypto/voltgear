"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StringArrayInput({
  label,
  values,
  onChange,
  placeholder = "Add an item...",
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    if (!newValue.trim()) return;
    onChange([...values, newValue.trim()]);
    setNewValue("");
  };

  const handleRemove = (index: number) => {
    const next = [...values];
    next.splice(index, 1);
    onChange(next);
  };

  const handleUpdate = (index: number, val: string) => {
    const next = [...values];
    next[index] = val;
    onChange(next);
  };

  const shiftUp = (index: number) => {
    if (index === 0) return;
    const next = [...values];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const shiftDown = (index: number) => {
    if (index === values.length - 1) return;
    const next = [...values];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="space-y-2">
        {values.map((val, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row items-center gap-2 rounded-lg border bg-muted/40 p-2"
          >
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hidden sm:inline-flex"
                onClick={() => shiftUp(i)}
                disabled={i === 0}
              >
                &uarr;
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hidden sm:inline-flex"
                onClick={() => shiftDown(i)}
                disabled={i === values.length - 1}
              >
                &darr;
              </Button>
            </div>
            <Input
              value={val}
              onChange={(e) => handleUpdate(i, e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => handleRemove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>
    </div>
  );
}
