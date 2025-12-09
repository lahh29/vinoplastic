
import MainUILayoutWrapper from "@/components/ui/main-ui-layout";

export default function ProgramaLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <MainUILayoutWrapper>{children}</MainUILayoutWrapper>
}
