import logoUrl from '@/assets/karga-logo.svg';

// Logo oficial da marca — vetor exato fornecido (ver logo_exact.svg na raiz
// do projeto), com o gradiente de identidade aplicado. Ao contrário de
// ModuleIcon, não é tintável (já traz a cor própria) e não deve ficar
// dentro de nenhuma caixa/círculo colorido — é a própria marca.
export function KargaLogo({ size = 24, className }: { size?: number; className?: string }): React.JSX.Element {
  return <img src={logoUrl} width={size} height={size} className={className} alt="Karga" />;
}
