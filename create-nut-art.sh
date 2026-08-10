#!/bin/bash
# Cria arte para Benção de Nut usando ImageMagick
# Paleta: dourado dominante, azul-lápis nas sombras, areia e âmbar

convert -size 1000x1000 xc:none \
  \( -size 1000x1000 gradient:goldenrod3-goldenrod1 \) \
  -compose Overlay -composite \
  \( -size 1000x1000 radial-gradient:white-transparent \
     -fill 'rgba(255,255,200,0.3)' -draw 'circle 500,300 500,450' \
  \) -compose Screen -composite \
  \( -size 1000x1000 xc:'rgba(20,50,100,0.4)' \) \
  -compose Darken -composite \
  -fill 'goldenrod' -stroke 'darkblue' -strokewidth 3 \
  -draw 'path "M 300,400 Q 350,300 500,250 Q 650,300 700,400" M 250,500 L 750,500' \
  -pointsize 80 -fill 'rgba(255,255,200,0.15)' -gravity South \
  -annotate +0+100 '✦' \
  -pointsize 40 -fill 'rgba(255,200,0,0.2)' -gravity Center \
  -annotate +0-150 '🌙' \
  public/cartas/nut.webp
