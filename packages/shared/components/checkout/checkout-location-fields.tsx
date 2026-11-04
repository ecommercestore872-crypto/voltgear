"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  PAKISTAN_REGIONS,
  type PakistanCity,
  type PakistanRegionCode,
  isPakistanRegionCode,
} from "@/lib/pakistan-locations";

type Props = {
  province: PakistanRegionCode | "";
  city: string;
  cityOptions: PakistanCity[];
  fieldErrors: Partial<Record<"province" | "city", string>>;
  onProvinceChange: (next: PakistanRegionCode | "") => void;
  onCityChange: (city: string) => void;
  onProvinceBlur: (value: string) => void;
  onCityBlur: (value: string) => void;
  clearProvinceError: () => void;
  clearCityError: () => void;
};

export function CheckoutLocationFields({
  province,
  city,
  cityOptions,
  fieldErrors,
  onProvinceChange,
  onCityChange,
  onProvinceBlur,
  onCityBlur,
  clearProvinceError,
  clearCityError,
}: Props) {
  return (
    <>
      <div className="min-w-0 space-y-1.5 sm:col-span-1">
        <Label htmlFor="province" className="text-xs font-bold sm:text-sm">
          Province / region *
        </Label>
        <select
          id="province"
          name="province"
          required
          autoComplete="address-level1"
          className={cn(
            "flex h-11 w-full rounded-md border border-input bg-background px-3 text-base",
            fieldErrors.province && "border-destructive",
          )}
          value={province}
          aria-invalid={fieldErrors.province ? true : undefined}
          aria-describedby={
            fieldErrors.province ? "checkout-province-error" : undefined
          }
          onChange={(e) => {
            const next = e.target.value;
            onProvinceChange(isPakistanRegionCode(next) ? next : "");
            clearProvinceError();
            clearCityError();
          }}
          onBlur={(e) => onProvinceBlur(e.target.value)}
        >
          <option value="">Select province</option>
          {PAKISTAN_REGIONS.map((region) => (
            <option key={region.code} value={region.code}>
              {region.label}
            </option>
          ))}
        </select>
        {fieldErrors.province ? (
          <p
            id="checkout-province-error"
            className="text-xs text-destructive"
            role="alert"
          >
            {fieldErrors.province}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 space-y-1.5 sm:col-span-1">
        <Label htmlFor="city" className="text-xs font-bold sm:text-sm">
          City *
        </Label>
        <input
          id="city"
          name="city"
          required
          autoComplete="address-level2"
          list="checkout-city-suggestions"
          maxLength={80}
          placeholder="Enter your city or town"
          className={cn(
            "flex h-11 w-full rounded-md border border-input bg-background px-3 text-base",
            fieldErrors.city && "border-destructive",
          )}
          value={city}
          aria-invalid={fieldErrors.city ? true : undefined}
          aria-describedby={
            fieldErrors.city ? "checkout-city-error" : undefined
          }
          onChange={(e) => {
            onCityChange(e.target.value);
            clearCityError();
          }}
          onBlur={(e) => onCityBlur(e.target.value)}
        />
        <datalist id="checkout-city-suggestions">
          {cityOptions.map((option) => (
            <option key={option.id} value={option.label} />
          ))}
        </datalist>
        {fieldErrors.city ? (
          <p
            id="checkout-city-error"
            className="text-xs text-destructive"
            role="alert"
          >
            {fieldErrors.city}
          </p>
        ) : null}
      </div>
    </>
  );
}
