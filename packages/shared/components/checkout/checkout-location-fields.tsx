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
  cityId: string;
  cityOptions: PakistanCity[];
  fieldErrors: Partial<Record<"province" | "city", string>>;
  onProvinceChange: (next: PakistanRegionCode | "") => void;
  onCityChange: (cityId: string) => void;
  onProvinceBlur: (value: string) => void;
  onCityBlur: (value: string) => void;
  clearProvinceError: () => void;
  clearCityError: () => void;
};

export function CheckoutLocationFields({
  province,
  cityId,
  cityOptions,
  fieldErrors,
  onProvinceChange,
  onCityChange,
  onProvinceBlur,
  onCityBlur,
  clearProvinceError,
  clearCityError,
}: Props) {
  const cityLabel =
    cityOptions.find((c) => c.id === cityId)?.label ?? "";

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
        <select
          id="city"
          name="cityId"
          required
          autoComplete="address-level2"
          disabled={!province}
          className={cn(
            "flex h-11 w-full rounded-md border border-input bg-background px-3 text-base disabled:opacity-60",
            fieldErrors.city && "border-destructive",
          )}
          value={cityId}
          aria-invalid={fieldErrors.city ? true : undefined}
          aria-describedby={
            fieldErrors.city ? "checkout-city-error" : undefined
          }
          onChange={(e) => {
            onCityChange(e.target.value);
            clearCityError();
          }}
          onBlur={(e) => onCityBlur(e.target.value)}
        >
          <option value="">
            {province ? "Select city" : "Select province first"}
          </option>
          {cityOptions.map((city) => (
            <option key={city.id} value={city.id}>
              {city.label}
            </option>
          ))}
        </select>
        <input type="hidden" name="city" value={cityLabel} />
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
