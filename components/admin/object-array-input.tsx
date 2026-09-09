"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type KeyValue = { label: string; value: string };

export function ObjectArrayInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: KeyValue[];
  onChange: (values: KeyValue[]) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    onChange([...values, { label: newLabel.trim(), value: newValue.trim() }]);
    setNewLabel("");
    setNewValue("");
  };

  const handleRemove = (index: number) => {
    const next = [...values];
    next.splice(index, 1);
    onChange(next);
  };

  const handleUpdateLabel = (index: number, val: string) => {
    const next = [...values];
    next[index] = { ...next[index], label: val };
    onChange(next);
  };

  const handleUpdateValue = (index: number, val: string) => {
    const next = [...values];
    next[index] = { ...next[index], value: val };
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
        {values.map((item, i) => (
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
              value={item.label}
              onChange={(e) => handleUpdateLabel(i, e.target.value)}
              placeholder="Label (e.g. Display)"
              className="flex-1"
            />
            <Input
              value={item.value}
              onChange={(e) => handleUpdateValue(i, e.target.value)}
              placeholder="Value"
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
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New label..."
          className="flex-1"
        />
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="New value..."
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>
    </div>
  );
}
