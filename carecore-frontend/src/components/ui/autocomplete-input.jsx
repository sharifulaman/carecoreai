import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

export function AutocompleteInput({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={`flex w-full items-center justify-between border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white ${!value ? "text-slate-500" : "text-slate-900"}`}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or type new..." onValueChange={setInputValue} />
          <CommandList>
            <CommandEmpty>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm"
                onClick={() => { onChange(inputValue); setOpen(false); }}
              >
                Use "{inputValue}"
              </button>
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={(currentValue) => {
                    const original = options.find(o => o.toLowerCase() === currentValue) || currentValue;
                    onChange(original);
                    setOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${value === opt ? "opacity-100" : "opacity-0"}`} />
                  {opt}
                </CommandItem>
              ))}
              {inputValue && !options.some(o => o.toLowerCase() === inputValue.toLowerCase()) && (
                <CommandItem
                  value={inputValue}
                  onSelect={() => { onChange(inputValue); setOpen(false); }}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Use "{inputValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
