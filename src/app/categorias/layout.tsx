import InicioLayout from "../inicio/layout";

export default function CategoriasLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <InicioLayout>{children}</InicioLayout>
}
