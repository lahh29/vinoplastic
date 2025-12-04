import InicioLayout from "../inicio/layout";

export default function FormacionLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <InicioLayout>{children}</InicioLayout>
}
