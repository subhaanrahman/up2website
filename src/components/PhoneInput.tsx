import { PhoneInput as ReactPhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  disabled?: boolean;
  className?: string;
}

const PhoneInput = ({ value, onChange, disabled, className }: PhoneInputProps) => {
  return (
    <ReactPhoneInput
      defaultCountry="au"
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
