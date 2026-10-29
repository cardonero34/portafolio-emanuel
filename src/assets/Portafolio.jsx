import "./Portafolio.css"
import { useLayoutEffect, useRef } from "react"
import { motion, useReducedMotion } from "motion/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const asset = (path) => `${import.meta.env.BASE_URL}${path}`

const DecoracionAnimada = ({ className, src, demora = 0, duracion = 4.8, giro = 1.6, escala = 1.08, reducido }) => (
    <motion.div
        className={className}
        aria-hidden="true"
        animate={reducido
            ? { scale: 1, opacity: 1, rotate: 0 }
            : { scale: [1, escala, 1], opacity: [0.82, 1, 0.88], rotate: [0, giro, 0] }}
        transition={{ duration: duracion, delay: demora, repeat: reducido ? 0 : Infinity, ease: "easeInOut" }}
    >
        <img src={src} alt="" />
    </motion.div>
)

const Portafolio = () => {
    const reducirMovimiento = useReducedMotion()
    const portafolioRef = useRef(null)
    const cintaRef = useRef(null)
    const recorridoRef = useRef(null)
    const imagenCintaRef = useRef(null)

    useLayoutEffect(() => {
        const cinta = cintaRef.current
        const recorrido = recorridoRef.current
        let contexto
        let urlImagenCinta
        let cancelado = false

        const prepararRevelado = async () => {
            try {
                const respuesta = await fetch(asset("cinta.svg"))
                if (!respuesta.ok) throw new Error("No se pudo cargar cinta.svg")

                const svg = new DOMParser().parseFromString(await respuesta.text(), "image/svg+xml")
                const grupoRecorrido = svg.querySelector("#recorrido")
                const rutaIlustrator = grupoRecorrido?.querySelector("path")?.getAttribute("d")
                if (!rutaIlustrator || cancelado) return

                const viewBox = svg.documentElement.getAttribute("viewBox")
                    ?.trim()
                    .split(/[\s,]+/)
                    .map(Number)
                if (!viewBox || viewBox.length !== 4 || viewBox.some((medida) => !Number.isFinite(medida))) {
                    throw new Error("El viewBox de cinta.svg no es válido")
                }
                const [x, y, anchoDiseño, altoDiseño] = viewBox

                cinta.setAttribute("viewBox", viewBox.join(" "))
                const mascara = cinta.querySelector("mask")
                const fondoMascara = mascara?.querySelector("rect")
                mascara?.setAttribute("x", x)
                mascara?.setAttribute("y", y)
                mascara?.setAttribute("width", anchoDiseño)
                mascara?.setAttribute("height", altoDiseño)
                fondoMascara?.setAttribute("x", x)
                fondoMascara?.setAttribute("y", y)
                fondoMascara?.setAttribute("width", anchoDiseño)
                fondoMascara?.setAttribute("height", altoDiseño)
                imagenCintaRef.current.setAttribute("x", x)
                imagenCintaRef.current.setAttribute("y", y)
                imagenCintaRef.current.setAttribute("width", anchoDiseño)
                imagenCintaRef.current.setAttribute("height", altoDiseño)

                grupoRecorrido.remove()
                const arteSinGuia = new XMLSerializer().serializeToString(svg)
                urlImagenCinta = URL.createObjectURL(new Blob([arteSinGuia], { type: "image/svg+xml" }))
                imagenCintaRef.current.setAttribute("href", urlImagenCinta)
                recorrido.setAttribute("d", rutaIlustrator)
                const largoRecorrido = recorrido.getTotalLength()
                const pasoMuestra = 4
                const muestras = []

                for (let distancia = 0; distancia < largoRecorrido; distancia += pasoMuestra) {
                    muestras.push({
                        distancia,
                        y: recorrido.getPointAtLength(distancia).y,
                    })
                }
                muestras.push({
                    distancia: largoRecorrido,
                    y: recorrido.getPointAtLength(largoRecorrido).y,
                })

                let ultimoIndice = 0
                let yAnterior = -Infinity
                let ultimaDistancia = 0
                const distanciaEnCentro = (yObjetivo) => {
                    if (yObjetivo <= muestras[0].y) {
                        ultimoIndice = 0
                        yAnterior = yObjetivo
                        ultimaDistancia = 0
                        return 0
                    }
                    if (yObjetivo >= altoDiseño) {
                        ultimoIndice = muestras.length - 1
                        yAnterior = yObjetivo
                        ultimaDistancia = largoRecorrido
                        return largoRecorrido
                    }

                    if (Math.abs(yObjetivo - yAnterior) < 0.5) return ultimaDistancia

                    const desplazamientoHaciaArriba = yObjetivo < yAnterior
                    const inicio = desplazamientoHaciaArriba ? ultimoIndice : Math.max(1, ultimoIndice + 1)
                    const fin = desplazamientoHaciaArriba ? 0 : muestras.length
                    const incremento = desplazamientoHaciaArriba ? -1 : 1

                    for (let i = inicio; i !== fin; i += incremento) {
                        const anterior = muestras[i - 1]
                        const actual = muestras[i]

                        const cruceHaciaAbajo = anterior.y <= yObjetivo && actual.y >= yObjetivo
                        const cruceHaciaArriba = anterior.y >= yObjetivo && actual.y <= yObjetivo

                        if (cruceHaciaAbajo || (desplazamientoHaciaArriba && cruceHaciaArriba)) {
                            ultimoIndice = i
                            yAnterior = yObjetivo
                            const progreso = (yObjetivo - anterior.y) / (actual.y - anterior.y || 1)
                            ultimaDistancia = gsap.utils.interpolate(anterior.distancia, actual.distancia, progreso)
                            return ultimaDistancia
                        }
                    }

                    yAnterior = yObjetivo
                    return ultimaDistancia
                }

                recorrido.style.strokeDasharray = `${largoRecorrido}px`
                recorrido.style.strokeDashoffset = `${largoRecorrido}px`

                contexto = gsap.context(() => {
                    const moverRevelado = gsap.quickTo(recorrido, "strokeDashoffset", {
                        duration: 0.28,
                        ease: "power1.out",
                    })

                    const actualizarRevelado = () => {
                        const rect = cinta.getBoundingClientRect()
                        const escalaY = rect.height / altoDiseño
                        const yCentro = (window.innerHeight * 0.5 - rect.top) / escalaY
                        const longitudVisible = distanciaEnCentro(yCentro)
                        moverRevelado(largoRecorrido - longitudVisible)
                    }

                    ScrollTrigger.create({
                        trigger: portafolioRef.current,
                        start: "top top",
                        end: "bottom bottom",
                        onUpdate: actualizarRevelado,
                        onRefresh: actualizarRevelado,
                        invalidateOnRefresh: true,
                    })
                }, portafolioRef)

                ScrollTrigger.refresh()
            } catch (error) {
                console.error("Error preparando la revelación de la cinta:", error)
            }
        }

        prepararRevelado()

        return () => {
            cancelado = true
            contexto?.revert()
            if (urlImagenCinta) URL.revokeObjectURL(urlImagenCinta)
        }
    }, [])

    return (
        <main className="portafolio" ref={portafolioRef}>
            <header>
                <DecoracionAnimada className="decoracion d1" src={asset("Seccion/1/decor/Decor_destello.svg")} demora={0.2} reducido={reducirMovimiento} />
                <DecoracionAnimada className="decoracion d2" src={asset("Seccion/1/decor/Decor_starB.svg")} demora={1.1} duracion={5.4} giro={-1.1} reducido={reducirMovimiento} />
                <h1>Portafolio</h1>
                <h2>Emanuel Cardona Medina</h2>
                <p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat </p>
            </header>
            <svg className="cinta-global" ref={cintaRef} viewBox="0 0 837.5 4296.8" aria-hidden="true">
                <defs>
                    <mask id="mascara-revelado-cinta" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="837.5" height="4296.8">
                        <rect width="837.5" height="4296.8" fill="black" />
                        <path
                            ref={recorridoRef}
                            d=""
                            fill="none"
                            stroke="white"
                            strokeWidth="180"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </mask>
                </defs>
                <image ref={imagenCintaRef} x="0" y="0" width="837.5" height="4296.8" preserveAspectRatio="none" mask="url(#mascara-revelado-cinta)" />
            </svg>
            <section className='zona_I'>
                <DecoracionAnimada className="decoracion d3" src={asset("Seccion/1/decor/Decor_destello.svg")} demora={0.6} reducido={reducirMovimiento} />
                <DecoracionAnimada className="decoracion d4" src={asset("Seccion/1/decor/Decor_Star.svg")} demora={1.8} duracion={5.6} giro={0.8} reducido={reducirMovimiento} />
                <DecoracionAnimada className="decoracion d5" src={asset("Seccion/1/decor/Decor_Star2.svg")} demora={0.9} duracion={5.2} giro={-0.8} reducido={reducirMovimiento} />
                <DecoracionAnimada className="decoracion d6" src={asset("Seccion/1/decor/Decor_destello.svg")} demora={1.4} duracion={5.8} reducido={reducirMovimiento} />
                <DecoracionAnimada className="decoracion d7" src={asset("Seccion/1/decor/Decor_destello.svg")} demora={0.3} duracion={4.4} giro={-1} reducido={reducirMovimiento} />
                <DecoracionAnimada className="decoracion d8" src={asset("Seccion/1/decor/Decor_destello.svg")} demora={2.1} duracion={5.1} giro={1} reducido={reducirMovimiento} />

                <div className="cont-Z1">
                    <div className="grupo-frases">
                        <div className="frase1">
                            <h3>Frase 1</h3>
                            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. At, eaque.</p>
                        </div>
                        <div className="frase2">
                            <h3>Frase 2</h3>
                            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. At, eaque.</p>
                        </div>
                    </div>
                    <div className="grupo-flor">
                        <img className='flor' src={asset("Seccion/1/Orquidea.png")} alt="" />
                        <img className='vara' src={asset("Seccion/1/Vara.png")} alt="" />
                    </div>
                </div>

                <img className="fondoI fI1" src={asset("Seccion/1/FondoS1 (1).webp")} alt="" />
                <img className="fondoI fI2" src={asset("Seccion/1/FondoS1 (2).webp")} alt="" />
                <img className="fondoI fI3" src={asset("Seccion/1/FondoS1 (3).webp")} alt="" />
            </section>
            <section className="zona_II">
                <img className="fondoII fII1" src={asset("Seccion/2/FondoS2 (1).webp")} alt="" />
                <img className="fondoII fII2" src={asset("Seccion/2/FondoS2 (2).webp")} alt="" />
                <img className="fondoII fII3" src={asset("Seccion/2/FondoS2 (3).webp")} alt="" />
                <div className="Nombre_seccion">
                    <h2>El comienzo</h2>
                    <p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat </p>
                </div>
                <div className="contenedor-card-II">{/* component card */}
                    <div className="composicion-card-II">
                        <img className="card-II" src={asset("Seccion/2/card.webp")} alt="" />
                        <div className="foto-II foto-II-izquierda"> {/* grande */}
                            <div className="foto-II-imagen foto-II-imagen-azul" />
                        </div>
                        <div className="foto-II foto-II-mini foto-II-mini-izquierda">
                            <div className="foto-II-imagen foto-II-imagen-azul-oscuro" />
                        </div>
                        <div className="foto-II foto-II-derecha"> {/* grande */}
                            <div className="foto-II-imagen foto-II-imagen-oliva" />
                        </div>
                        <div className="foto-II foto-II-mini foto-II-mini-derecha">
                            <div className="foto-II-imagen foto-II-imagen-vino" />
                        </div>
                        <div className="texto-card-II">
                            <h2>Proyecto_1</h2>
                            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat</p>
                        </div>
                        <div className="grupo-boton-II">
                            <img className="forma-boton-II" src={asset("Seccion/2/btn1.webp")} alt="" />
                            <div className="boton-II">
                                <h3>CONTINUAR NAVEGANDO</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <section className="zona_III">
                <DecoracionAnimada className="decoracion d6" src={asset("Seccion/3/decor/Decor_Star.svg")} demora={0.7} duracion={5.3} giro={0.8} reducido={reducirMovimiento} />
                <DecoracionAnimada className="decoracion d7" src={asset("Seccion/1/decor/Decor_destello.svg")} demora={1.6} reducido={reducirMovimiento} />
                <DecoracionAnimada className="decoracion d8" src={asset("Seccion/1/decor/Decor_destello2.svg")} demora={0.4} duracion={5.7} giro={-0.9} reducido={reducirMovimiento} />
                {/*<img className="decoracion d3" src="/Seccion/1/decor/Decor_Star.svg" alt="" />
                <img className="decoracion d4" src="/Seccion/1/decor/Decor_destello2.svg" alt="" />
                <img className="decoracion d5" src="/Seccion/1/decor/Decor_destello2.svg" alt="" /> */}

                <div className="grupo-botones-s3" aria-hidden="true">
                    <div className="boton-s3 boton-s3-verde">
                        <DecoracionAnimada className="visual-boton-s3" src={asset("Seccion/3/botones/btnVerde.webp")} demora={0.1} duracion={5.3} giro={0.6} escala={1.04} reducido={reducirMovimiento} />
                        <span>CONTINUAR NAVEGANDO</span>
                    </div>
                    <div className="boton-s3 boton-s3-morado">
                        <DecoracionAnimada className="visual-boton-s3" src={asset("Seccion/3/botones/btnMorado.webp")} demora={1.7} duracion={5.8} giro={-0.55} escala={1.04} reducido={reducirMovimiento} />
                        <span>CONTINUAR NAVEGANDO</span>
                    </div>
                    <div className="boton-s3 boton-s3-azul">
                        <DecoracionAnimada className="visual-boton-s3" src={asset("Seccion/3/botones/btnAzul.webp")} demora={0.9} duracion={5.5} giro={0.55} escala={1.04} reducido={reducirMovimiento} />
                        <span>CONTINUAR NAVEGANDO</span>
                    </div>
                </div>
            </section>
            <section className="Zona_IV">
                <div>

                </div>
            </section>
        </main >
    )
}

export default Portafolio
