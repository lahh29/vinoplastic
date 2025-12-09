
import MainUILayoutWrapper from "@/components/ui/main-ui-layout";

export default function PortalLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    // Por ahora usamos el layout principal, pero podemos personalizarlo fácilmente más adelante
    // si queremos una experiencia visual diferente para el portal del empleado.
    return <MainUILayoutWrapper>{children}</MainUILayoutWrapper>
}
