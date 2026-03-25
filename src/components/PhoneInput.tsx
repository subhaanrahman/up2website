import { useState, useEffect, useRef, useMemo } from "react";
import { PhoneInput as ReactPhoneInput } from "react-international-phone";
import type { PhoneInputRefType } from "react-international-phone";
import "react-international-phone/style.css";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  disabled?: boolean;
  className?: string;
}

/** ISO 3166-1 alpha-2 when IP lookup is blocked, fails, or returns no code. */
function defaultCountryFromLocale(): string {
  if (typeof navigator === "undefined") return "us";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const parts = lang?.toLowerCase().split(/[-_]/) ?? [];
    const region = parts[1];
    if (region && /^[a-z]{2}$/i.test(region)) {
      return region.toLowerCase();
    }
  }
  return "us";
}

const IPGEO_SKIP_KEY = "up2_skip_ipapi";

/** One shared request per tab: avoids duplicate ipapi calls (and console noise) when several PhoneInputs mount. */
let ipGeoPromise: Promise<string | null> | null = null;

function fetchCountryFromIpOnce(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  try {
    if (sessionStorage.getItem(IPGEO_SKIP_KEY) === "1") return Promise.resolve(null);
  } catch {
    /* private mode */
  }
  if (!ipGeoPromise) {
    ipGeoPromise = (async () => {
      try {
        const ac = new AbortController();
        const tid = window.setTimeout(() => ac.abort(), 3000);
        const r = await fetch("https://ipapi.co/json/", { signal: ac.signal });
        clearTimeout(tid);
        if (!r.ok) return null;
        const data = (await r.json()) as { country_code?: string };
        return data?.country_code ? data.country_code.toLowerCase() : null;
      } catch {
        try {
          sessionStorage.setItem(IPGEO_SKIP_KEY, "1");
        } catch {
          /* private mode */
        }
        return null;
      }
    })();
  }
  return ipGeoPromise;
}

const useDetectedCountry = (localeFallback: string) => {
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCountryFromIpOnce().then((code) => {
      if (cancelled) return;
      setCountry(code ?? localeFallback);
    });
    return () => {
      cancelled = true;
    };
  }, [localeFallback]);

  return country;
};

const PhoneInput = ({ value, onChange, disabled, className }: PhoneInputProps) => {
  const localeFallback = useMemo(() => defaultCountryFromLocale(), []);
  const detectedCountry = useDetectedCountry(localeFallback);
  const phoneInputRef = useRef<PhoneInputRefType>(null);

  useEffect(() => {
    if (detectedCountry && phoneInputRef.current?.setCountry) {
      phoneInputRef.current.setCountry(detectedCountry);
    }
  }, [detectedCountry]);

  return (
    <ReactPhoneInput
      ref={phoneInputRef}
      defaultCountry={detectedCountry ?? localeFallback}
      forceDialCode
      value={value}
      onChange={onChange}
      disabled={disabled}
      inputClassName={cn(
        "!h-14 !text-lg !bg-card !border-border !text-foreground !rounded-md",
        className
      )}
      countrySelectorStyleProps={{
        buttonClassName:
          "!h-14 !bg-card !border-border !rounded-l-md !px-3",
        dropdownStyleProps: {
          className: "!bg-popover !border-border !text-popover-foreground !rounded-md !shadow-lg",
          listItemClassName: "!hover:bg-accent",
        },
      }}
      inputStyle={{ width: "100%" }}
    />
  );
};

export default PhoneInput;
