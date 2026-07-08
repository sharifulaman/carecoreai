import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Home, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

/**
 * HomesPicker — searchable, popover-based homes selector for the Audit Trail header.
 *
 * Props:
 *   value    string | null  — controlled value; the selected home's UUID, or null for "All Homes"
 *   onChange (id) => void  — called with the home UUID on selection, or null to clear
 */
export default function HomesPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const { data: homes = [], isLoading } = useQuery({
    queryKey: ["homes-picker-list"],
    queryFn: () => base44.entities.Home.list("name", 500),
    staleTime: 5 * 60 * 1000, // homes rarely change — cache for 5 minutes
  });

  // Normalize "all" sentinel (legacy default) to null so value checks are simpler.
  const activeId = value === "all" ? null : value;
  const selectedHome = activeId ? homes.find((h) => h.id === activeId) ?? null : null;
  const triggerLabel = selectedHome?.name ?? "All Homes";
  const hasSelection = Boolean(selectedHome);

  function handleSelect(homeId) {
    // Selecting the already-active home acts as a toggle (clears the filter).
    onChange(homeId === activeId ? null : homeId);
    setOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg bg-background text-xs font-medium transition-colors hover:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary ${
            hasSelection
              ? "border-primary text-foreground"
              : "border-border text-muted-foreground"
          }`}
        >
          <Home className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap max-w-[140px] truncate">{triggerLabel}</span>
          {isLoading ? (
            <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
          ) : hasSelection ? (
            <X
              className="w-3 h-3 shrink-0 hover:text-destructive transition-colors"
              onClick={handleClear}
            />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-0 shadow-lg"
        align="end"
        sideOffset={6}
      >
        <Command>
          <CommandInput placeholder="Search homes…" className="h-9 text-sm" />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading homes…
              </div>
            ) : (
              <>
                <CommandEmpty className="py-6 text-xs text-muted-foreground text-center">
                  No homes found.
                </CommandEmpty>

                <CommandGroup>
                  {/* "All Homes" option — always at the top */}
                  <CommandItem
                    value="all-homes"
                    onSelect={() => { onChange(null); setOpen(false); }}
                    className="text-xs"
                  >
                    <Check
                      className={`w-3.5 h-3.5 mr-2 ${!hasSelection ? "opacity-100" : "opacity-0"}`}
                    />
                    All Homes
                  </CommandItem>

                  {homes.length > 0 && <CommandSeparator className="my-1" />}

                  {homes.map((home) => (
                    <CommandItem
                      key={home.id}
                      // 'value' drives cmdk's search — use name so typing filters correctly
                      value={home.name}
                      onSelect={() => handleSelect(home.id)}
                      className="text-xs"
                    >
                      <Check
                        className={`w-3.5 h-3.5 mr-2 shrink-0 ${
                          home.id === activeId ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span className="truncate">{home.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
