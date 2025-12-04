import InicioLayout from "../inicio/layout";

export default function DiagnosticoLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <InicioLayout>{children}</InicioLayout>
}
