ASSETS NECESARIOS — REEMPLAZA ESTOS ARCHIVOS
=============================================

Coloca tus imágenes reales en esta carpeta /assets/ y actualiza
las rutas en el objeto siteContent del archivo index.html.

ARCHIVOS A REEMPLAZAR:
─────────────────────────────────────────────────────────────
1. hero.jpg
   → Foto de PORTADA del hero (pantalla de inicio)
   → Oriientación: vertical/portrait
   → Tamaño recomendado: 1080×1920 px mínimo
   → Peso máximo: 400 KB
   → Tipo de foto: pareja caminando, paisaje romántico,
     detalle de vestido, jardín, atardecer editorial
   → En siteContent: heroImage: "assets/hero.jpg"

2. story.jpg
   → Foto de HISTORIA (sección del mensaje)
   → Orientación: vertical 3:4
   → Tamaño recomendado: 800×1067 px
   → Tipo de foto: pareja en sesión editorial, íntima,
     mirándose, tomados de la mano
   → En siteContent: storyImage: "assets/story.jpg"

3. gallery-1.jpg a gallery-5.jpg (o las que quieras)
   → Fotos de GALERÍA horizontal
   → Orientación: vertical 3:4
   → Tamaño recomendado: 480×640 px por foto
   → Tipo: detalles de boda (flores, anillos, mesa, vestido,
     pareja, decoración), todos con estética editorial coherente
   → En siteContent: galleryImages: [ { src: "assets/gallery-1.jpg", alt: "..." }, ... ]

4. og-cover.jpg
   → Imagen para redes sociales (Open Graph)
   → Tamaño: 1200×630 px (horizontal)
   → Usa la mejor foto de la pareja o portada del evento
   → Actualiza en el <head>: <meta property="og:image" content="assets/og-cover.jpg">

FUENTES DE IMÁGENES RECOMENDADAS (gratuitas):
─────────────────────────────────────────────
• Unsplash.com — busca: "wedding editorial", "couple portrait", "wedding details"
• Pexels.com   — busca: "boda elegante", "pareja romántica"
• Pixabay.com  — busca: "wedding", "romantic couple"

NOTA: Las imágenes actuales en el sitio son placeholders de Unsplash.
Reemplázalas por las fotos reales de la pareja para personalizar.
