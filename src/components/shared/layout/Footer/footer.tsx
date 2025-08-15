export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ParkManager. Todos los derechos reservados.
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Términos
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contacto
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}