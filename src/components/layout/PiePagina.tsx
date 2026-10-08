interface PiePaginaProps {
  nombreMarca: string
  mensajes: string[]
}

export function PiePagina({ nombreMarca, mensajes }: PiePaginaProps) {
  return (
    <footer>
      <strong>{nombreMarca}</strong>
      {mensajes.map((mensaje) => (
        <p key={mensaje}>{mensaje}</p>
      ))}
    </footer>
  )
}
