import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])
  return isMobile
}

/**
 * NativeSelect — Renders bottom sheet on mobile, standard select on desktop.
 * Drop-in replacement for <Select>+<SelectTrigger>+<SelectContent>+<SelectItem>.
 * Usage: <NativeSelect value={val} onValueChange={setVal}><SelectItem value="a">Option A</SelectItem></NativeSelect>
 */
const NativeSelect = React.forwardRef(
  ({ className, children, value, onValueChange, placeholder = "Select...", ...props }, ref) => {
    const isMobile = useIsMobile()
    const [open, setOpen] = React.useState(false)

    if (isMobile) {
      // Mobile: Bottom Sheet via Dialog
      // Extract SelectItem children and find label for selected value
      const items = React.Children.toArray(children).filter(
        child => child?.type?.displayName === "SelectItem" || child?.props?.value
      )
      const selectedItem = items.find(item => item?.props?.value === value)
      const selectedLabel = selectedItem?.props?.children || placeholder

      return (
        <>
          <button
            ref={ref}
            onClick={() => setOpen(true)}
            className={cn(
              "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
          >
            <span className="text-foreground">{selectedLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-full max-w-full sm:max-w-md rounded-t-2xl sm:rounded-lg border-0 sm:border fixed bottom-0 sm:inset-auto p-0 sm:p-6" showClose={false}>
              <div className="flex flex-col max-h-[60vh]">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Select option</p>
                </div>
                <div className="overflow-y-auto flex-1">
                  {items.map((item, idx) => {
                    const itemValue = item?.props?.value
                    const itemLabel = item?.props?.children
                    const isSelected = itemValue === value
                    return (
                      <button
                        key={itemValue || idx}
                        onClick={() => {
                          onValueChange(itemValue)
                          setOpen(false)
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm border-b border-border/50 transition-colors flex items-center gap-3",
                          isSelected
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50"
                        )}
                      >
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                        <span className="flex-1">{itemLabel}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )
    }

    // Desktop: Standard Radix Select
    return (
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} {...props}>
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
            <SelectPrimitive.Viewport className="p-1">
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    )
  }
)
NativeSelect.displayName = "NativeSelect"

export { NativeSelect }