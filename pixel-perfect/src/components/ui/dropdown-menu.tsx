"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

export type MenuItemTone = "default" | "warning" | "destructive";

interface HighlightRect {
  top: number;
  height: number;
  tone: MenuItemTone;
  visible: boolean;
  animateMove: boolean;
}

interface HighlightContextValue {
  activate: (el: HTMLElement, tone: MenuItemTone) => void;
}

const DropdownMenuHighlightContext = React.createContext<HighlightContextValue | null>(null);

function relativeOffsetTop(el: HTMLElement, root: HTMLElement): number {
  let top = 0;
  let curr: HTMLElement | null = el;
  while (curr && curr !== root) {
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
    if (curr && !root.contains(curr)) break;
  }
  return top;
}

const GLIDER_TONE_CLASS: Record<MenuItemTone, string> = {
  default: "bg-hover-surface border-hover-border",
  warning: "bg-warning-hover-surface border-warning-hover-border",
  destructive: "bg-danger-hover-surface border-danger-hover-border",
};

/**
 * Provides a shared, GPU-accelerated gliding highlight surface behind contiguous
 * dropdown menu items for smooth hover and keyboard-navigation transitions.
 */
function DropdownMenuHighlightGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const wasVisibleRef = React.useRef(false);
  const [rect, setRect] = React.useState<HighlightRect>({
    top: 0,
    height: 36,
    tone: "default",
    visible: false,
    animateMove: false,
  });

  const activate = React.useCallback((el: HTMLElement, tone: MenuItemTone) => {
    const root = containerRef.current;
    if (!root) return;
    const top = relativeOffsetTop(el, root);
    const height = el.offsetHeight || 36;
    const animateMove = wasVisibleRef.current;
    wasVisibleRef.current = true;

    setRect((prev) => {
      if (
        prev.visible &&
        prev.top === top &&
        prev.height === height &&
        prev.tone === tone &&
        prev.animateMove === animateMove
      ) {
        return prev;
      }
      return { top, height, tone, visible: true, animateMove };
    });
  }, []);

  const clear = React.useCallback(() => {
    wasVisibleRef.current = false;
    setRect((prev) => (prev.visible ? { ...prev, visible: false, animateMove: false } : prev));
  }, []);

  const contextValue = React.useMemo<HighlightContextValue>(() => ({ activate }), [activate]);

  return (
    <div
      ref={containerRef}
      onPointerLeave={clear}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          clear();
        }
      }}
      className={cn("relative flex flex-col gap-0.5", className)}
      {...props}
    >
      <span
        aria-hidden
        data-gaw-glider
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-0 rounded-xl border will-change-transform motion-reduce:transition-none",
          GLIDER_TONE_CLASS[rect.tone],
        )}
        style={{
          transform: `translate3d(0, ${rect.top}px, 0)`,
          height: `${rect.height}px`,
          opacity: rect.visible ? 1 : 0,
          transitionProperty: rect.animateMove
            ? "transform, height, opacity, background-color, border-color"
            : "opacity, background-color, border-color",
          transitionDuration: rect.animateMove
            ? "190ms, 190ms, 160ms, 180ms, 180ms"
            : "160ms, 160ms, 160ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <DropdownMenuHighlightContext.Provider value={contextValue}>
        {children}
      </DropdownMenuHighlightContext.Provider>
    </div>
  );
}
DropdownMenuHighlightGroup.displayName = "DropdownMenuHighlightGroup";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-pointer select-none items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium outline-none transition-[background-color,color] duration-150 ease-out focus:bg-hover-surface focus:text-foreground data-[state=open]:bg-hover-surface [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-150 focus:[&_svg]:text-primary",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-lift data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-2xl border border-border/90 bg-popover p-1.5 text-popover-foreground shadow-lift dark:border-[#34483A]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const ITEM_TONE_CLASSES: Record<MenuItemTone, { base: string; standaloneBg: string }> = {
  default: {
    base: "text-popover-foreground/90 [&>svg]:text-muted-foreground hover:text-foreground data-[highlighted]:text-foreground dark:hover:text-white dark:data-[highlighted]:text-white hover:[&>svg]:text-primary data-[highlighted]:[&>svg]:text-primary",
    standaloneBg:
      "hover:bg-hover-surface focus:bg-hover-surface data-[highlighted]:bg-hover-surface",
  },
  warning: {
    base: "text-popover-foreground/90 [&>svg]:text-warning/85 hover:text-warning data-[highlighted]:text-warning dark:hover:text-[#FBE2AE] dark:data-[highlighted]:text-[#FBE2AE] hover:[&>svg]:text-warning data-[highlighted]:[&>svg]:text-warning",
    standaloneBg:
      "hover:bg-warning-hover-surface focus:bg-warning-hover-surface data-[highlighted]:bg-warning-hover-surface",
  },
  destructive: {
    base: "text-popover-foreground/90 [&>svg]:text-destructive/85 hover:text-destructive data-[highlighted]:text-destructive dark:hover:text-[#FFB3AD] dark:data-[highlighted]:text-[#FFB3AD] hover:[&>svg]:text-destructive data-[highlighted]:[&>svg]:text-destructive",
    standaloneBg:
      "hover:bg-danger-hover-surface focus:bg-danger-hover-surface data-[highlighted]:bg-danger-hover-surface",
  },
};

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    tone?: MenuItemTone;
  }
>(({ className, inset, tone = "default", onPointerEnter, onFocus, ...props }, ref) => {
  const highlight = React.useContext(DropdownMenuHighlightContext);
  const hasGlider = highlight !== null;
  const toneStyle = ITEM_TONE_CLASSES[tone];

  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      onPointerEnter={(e) => {
        if (!props.disabled && highlight) {
          highlight.activate(e.currentTarget, tone);
        }
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        if (!props.disabled && highlight) {
          highlight.activate(e.currentTarget, tone);
        }
        onFocus?.(e);
      }}
      className={cn(
        "group/item relative z-10 flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium outline-none transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring/85 focus-visible:ring-inset data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[disabled]:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
        "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-[color,transform] [&>svg]:duration-160 [&>svg]:ease-[cubic-bezier(0.22,1,0.36,1)] hover:[&>svg]:translate-x-[2.5px] data-[highlighted]:[&>svg]:translate-x-[2.5px] data-[disabled]:[&>svg]:translate-x-0 motion-reduce:[&>svg]:transition-none motion-reduce:hover:[&>svg]:translate-x-0 motion-reduce:data-[highlighted]:[&>svg]:translate-x-0",
        toneStyle.base,
        hasGlider ? "focus:bg-transparent" : toneStyle.standaloneBg,
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
});
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-xl py-2 pl-8 pr-2.5 text-sm outline-none transition-[background-color,color] duration-150 ease-out focus:bg-hover-surface focus:text-foreground data-[highlighted]:bg-hover-surface data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center text-primary">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-xl py-2 pl-8 pr-2.5 text-sm outline-none transition-[background-color,color] duration-150 ease-out focus:bg-hover-surface focus:text-foreground data-[highlighted]:bg-hover-surface data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center text-primary">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2.5 py-2 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1.5 my-1.5 h-px bg-border/75 dark:bg-border", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuHighlightGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
