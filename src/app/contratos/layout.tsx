import InicioLayout from "../inicio/layout";

export default function ContratosLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <InicioLayout>{children}</InicioLayout>
}
