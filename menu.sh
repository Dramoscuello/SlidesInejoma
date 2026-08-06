#!/bin/bash

# ==============================================================================
# CONFIGURACIÓN DE TUS PROYECTOS DOCKER
# ==============================================================================

NOMBRES=(
  "Draw.io (Plataforma para hacer esquemas)"
  "TurboWarp / Scratch (Programación por bloques)"
  "Excalidraw (Tablero y lienzo colaborativo)"
  "Baserow (Base de datos y formularios)"
  "Jellyfin (Servidor de cursos y documentales)"
)

RUTAS=(
  "$HOME/proyectos/drawio"
  "$HOME/proyectos/turbowarp"
  "$HOME/proyectos/excalidraw"
  "$HOME/proyectos/baserow"
  "$HOME/proyectos/jellyfin"
)

# ==============================================================================
# INTERFAZ Y MENÚ
# ==============================================================================

clear
echo "=================================================================="
echo "                   ESTADO ACTUAL DE DOCKER                        "
echo "=================================================================="

# Muestra únicamente los contenedores en ejecución
ACTIVOS=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

if [ $(echo "$ACTIVOS" | wc -l) -gt 1 ]; then
  echo "$ACTIVOS"
else
  echo " No hay contenedores activos en este momento."
fi

echo ""
echo "=================================================================="
echo "                   CATÁLOGO DE PROYECTOS LOCALES                  "
echo "=================================================================="

TOTAL=${#NOMBRES[@]}
for (( i=0; i<$TOTAL; i++ )); do
  NUM=$((i+1))
  echo "$NUM. ${NOMBRES[$i]}"
done

echo ""
echo "0. Salir"
echo "=================================================================="
read -p "Selecciona el número del proyecto que deseas gestionar: " OPCION

if [ "$OPCION" -eq 0 ] 2>/dev/null; then
  echo "Operación cancelada."
  exit 0
fi

if [ "$OPCION" -ge 1 ] && [ "$OPCION" -le "$TOTAL" ] 2>/dev/null; then
  INDEX=$((OPCION-1))
  NOMBRE_SELECCIONADO="${NOMBRES[$INDEX]}"
  RUTA_SELECCIONADA="${RUTAS[$INDEX]}"

  echo ""
  echo "Has seleccionado: $NOMBRE_SELECCIONADO"
  echo "Acción a realizar:"
  echo "  1) Levantar servicio (docker compose up -d)"
  echo "  2) Detener servicio  (docker compose down)"
  echo "  3) Reiniciar servicio (docker compose restart)"
  echo ""
  read -p "Ingresa el número de la acción [1-3]: " ACCION

  if [ -d "$RUTA_SELECCIONADA" ]; then
    cd "$RUTA_SELECCIONADA"
    echo ""
    case $ACCION in
      1)
        echo "Levantando contenedor..."
        docker compose up -d
        ;;
      2)
        echo "Deteniendo contenedor..."
        docker compose down
        ;;
      3)
        echo "Reiniciando contenedor..."
        docker compose restart
        ;;
      *)
        echo "Acción no válida."
        exit 1
        ;;
    esac
    echo ""
    echo "¡Operación completada con éxito!"
  else
    echo "Error: La carpeta '$RUTA_SELECCIONADA' no existe."
  fi
else
  echo "Opción de proyecto no válida."
fi