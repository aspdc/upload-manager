"use client";

import { useId, useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { EyeOffIcon, EyeIcon } from "lucide-react";

// Extend standard input HTML attributes so all standard props (id, value, onChange, disabled, etc.) are allowed
export interface PasswordProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Password = forwardRef<HTMLInputElement, PasswordProps>(
  ({ className, label, id: customId, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const generatedId = useId();
    const id = customId || generatedId;

    const toggleVisibility = () => setIsVisible((prevState) => !prevState);

    return (
      <div className="w-full space-y-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <InputGroup className="relative mb-3 h-9">
          <InputGroupInput
            {...props}
            id={id}
            ref={ref}
            type={isVisible ? "text" : "password"}
            className={className}
          />
          <InputGroupAddon align="inline-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleVisibility}
              className="hover:bg-transparent hover:text-muted-foreground"
              disabled={props.disabled}
            >
              {isVisible ? <EyeOffIcon /> : <EyeIcon />}
              <span className="sr-only">
                {isVisible ? "Hide password" : "Show password"}
              </span>
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>
    );
  },
);

Password.displayName = "Password";

export default Password;
