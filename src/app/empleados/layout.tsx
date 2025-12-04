import InicioLayout from "../inicio/layout";

export default function EmpleadosLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <InicioLayout>{children}</InicioLayout>
}
