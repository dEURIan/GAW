import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/lib/gaw/theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lift",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:cursor-pointer group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:transition-all group-[.toast]:hover:brightness-105",
          cancelButton:
            "group-[.toast]:cursor-pointer group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:transition-colors group-[.toast]:hover:bg-hover-surface group-[.toast]:hover:text-foreground",
          closeButton:
            "group-[.toast]:cursor-pointer group-[.toast]:transition-colors group-[.toast]:hover:bg-hover-surface group-[.toast]:hover:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
