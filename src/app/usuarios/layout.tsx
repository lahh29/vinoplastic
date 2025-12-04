import InicioLayout from "../inicio/layout";

export default function UsuariosLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <InicioLayout>{children}</InicioLayout>
}
