import InicioLayout from "../inicio/layout";

export default function ReportesLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <InicioLayout>{children}</InicioLayout>
}
