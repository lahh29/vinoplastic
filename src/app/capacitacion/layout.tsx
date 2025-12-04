import InicioLayout from "../inicio/layout";

export default function CapacitacionLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <InicioLayout>{children}</InicioLayout>
}
